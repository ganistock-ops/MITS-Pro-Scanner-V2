"""
MITS Pro Institutional Suite V2 - Institutional Smart Money & Delivery Footprint Radar
Ingests official NSE consolidated Security-wise Delivery Bhavcopy data, calculates
10-day rolling delivery metrics, detects whale absorption, and classifies smart money status.
"""

import io
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import requests
import pytz

logger = logging.getLogger("SmartMoneyRadar")

BASE_DIR = Path(__file__).resolve().parent.parent
BHAVCOPY_CACHE_DIR = BASE_DIR / "data" / "bhavcopy_cache"
BHAVCOPY_CACHE_DIR.mkdir(parents=True, exist_ok=True)
TIMEZONE = "Asia/Kolkata"

def get_ist_now() -> datetime:
    tz = pytz.timezone(TIMEZONE)
    return datetime.now(tz)

def fetch_nse_bhavcopy_series(
    target_days: int = 10, 
    max_lookback_days: int = 25
) -> Tuple[Optional[datetime.date], Dict[str, Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    """
    Downloads and caches official NSE Security-wise Delivery Bhavcopy CSVs for up to target_days.
    Extracts DELIV_QTY and DELIV_PER for all EQ series stocks and calculates:
      - delivery_pct (latest day DELIV_PER)
      - delivery_qty (latest day DELIV_QTY)
      - avg_deliv_10d (rolling 10-day average delivery %)
      - avg_deliv_vol_10d (rolling 10-day average delivery volume)
      - delivery_spike_pct (((delivery_pct - avg_deliv_10d) / avg_deliv_10d) * 100)

    Returns:
      (latest_date, latest_bhav_map, delivery_analytics_map)
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
    ist_now = get_ist_now()
    d = ist_now.date()
    
    valid_csv_files: List[Tuple[datetime.date, Path]] = []
    
    # 1. Gather up to target_days valid bhavcopies
    for _ in range(max_lookback_days):
        if d.weekday() < 5:  # Weekdays (Mon-Fri)
            ds = d.strftime("%d%m%Y")
            cache_file = BHAVCOPY_CACHE_DIR / f"sec_bhavdata_full_{ds}.csv"
            
            if cache_file.exists() and cache_file.stat().st_size > 5000:
                valid_csv_files.append((d, cache_file))
            else:
                url = f"https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_{ds}.csv"
                try:
                    r = requests.get(url, headers=headers, timeout=8)
                    if r.status_code == 200 and len(r.text) > 5000:
                        with open(cache_file, "w", encoding="utf-8") as f:
                            f.write(r.text)
                        valid_csv_files.append((d, cache_file))
                        logger.info(f"Downloaded and cached official NSE Bhavcopy for {ds}.")
                except Exception as e:
                    logger.debug(f"Could not download Bhavcopy for {ds}: {e}")
                    
            if len(valid_csv_files) >= target_days:
                break
        d -= timedelta(days=1)

    if not valid_csv_files:
        logger.warning("No official NSE Bhavcopy files available. Checking existing cache directory...")
        all_cached = sorted(list(BHAVCOPY_CACHE_DIR.glob("sec_bhavdata_full_*.csv")), reverse=True)
        for cf in all_cached[:target_days]:
            try:
                ds_str = cf.stem.replace("sec_bhavdata_full_", "")
                dt = datetime.strptime(ds_str, "%d%m%Y").date()
                valid_csv_files.append((dt, cf))
            except Exception:
                pass

    if not valid_csv_files:
        logger.error("Zero Bhavcopy datasets available. Fallback to empty delivery analytics.")
        return None, {}, {}

    # Sort descending by date (latest first)
    valid_csv_files.sort(key=lambda x: x[0], reverse=True)
    latest_date = valid_csv_files[0][0]
    logger.info(f"Loaded {len(valid_csv_files)} trading days of NSE Bhavcopy (Latest: {latest_date.strftime('%Y-%m-%d')}).")

    # 2. Parse CSVs and aggregate delivery metrics per EQ symbol
    latest_bhav_map: Dict[str, Dict[str, Any]] = {}
    symbol_history: Dict[str, Dict[str, List[float]]] = {}

    for idx, (dt, f_path) in enumerate(valid_csv_files):
        try:
            df = pd.read_csv(f_path)
            df.columns = [c.strip() for c in df.columns]
            if "SERIES" in df.columns:
                df = df[df["SERIES"].astype(str).str.strip() == "EQ"]
            if "SYMBOL" not in df.columns:
                continue
            df["SYMBOL"] = df["SYMBOL"].astype(str).str.strip()

            deliv_pers = pd.to_numeric(df["DELIV_PER"], errors="coerce").fillna(0.0).values
            deliv_qtys = pd.to_numeric(df["DELIV_QTY"], errors="coerce").fillna(0.0).values
            symbols = df["SYMBOL"].values

            if idx == 0:
                opens = pd.to_numeric(df.get("OPEN_PRICE", 0.0), errors="coerce").fillna(0.0).values
                highs = pd.to_numeric(df.get("HIGH_PRICE", 0.0), errors="coerce").fillna(0.0).values
                lows = pd.to_numeric(df.get("LOW_PRICE", 0.0), errors="coerce").fillna(0.0).values
                closes = pd.to_numeric(df.get("CLOSE_PRICE", 0.0), errors="coerce").fillna(0.0).values
                prevs = pd.to_numeric(df.get("PREV_CLOSE", 0.0), errors="coerce").fillna(0.0).values
                vols = pd.to_numeric(df.get("TTL_TRD_QNTY", 0.0), errors="coerce").fillna(0.0).values

                for i, sym in enumerate(symbols):
                    latest_bhav_map[sym] = {
                        "open": float(opens[i]),
                        "high": float(highs[i]),
                        "low": float(lows[i]),
                        "close": float(closes[i]),
                        "prev_close": float(prevs[i]),
                        "volume": float(vols[i]),
                        "deliv_qty": float(deliv_qtys[i]),
                        "deliv_per": float(deliv_pers[i]),
                        "date": dt
                    }

            for i, sym in enumerate(symbols):
                if sym not in symbol_history:
                    symbol_history[sym] = {"pers": [], "qtys": []}
                symbol_history[sym]["pers"].append(float(deliv_pers[i]))
                symbol_history[sym]["qtys"].append(float(deliv_qtys[i]))

        except Exception as e:
            logger.warning(f"Error reading Bhavcopy file {f_path.name}: {e}")

    # 3. Calculate 10-day rolling averages and delivery analytics
    delivery_analytics_map: Dict[str, Dict[str, Any]] = {}
    for sym, hist in symbol_history.items():
        pers = hist["pers"]
        qtys = hist["qtys"]
        cur_per = pers[0] if pers else 0.0
        cur_qty = qtys[0] if qtys else 0.0
        avg_deliv_10d = round(sum(pers) / len(pers), 1) if pers else cur_per
        avg_vol_10d = round(sum(qtys) / len(qtys), 1) if qtys else cur_qty
        spike_pct = round(((cur_per - avg_deliv_10d) / avg_deliv_10d) * 100, 1) if avg_deliv_10d > 0 else 0.0

        delivery_analytics_map[sym] = {
            "delivery_pct": round(cur_per, 1),
            "delivery_qty": round(cur_qty, 0),
            "avg_deliv_10d": round(avg_deliv_10d, 1),
            "avg_deliv_vol_10d": round(avg_vol_10d, 0),
            "delivery_spike_pct": spike_pct,
            "days_recorded": len(pers)
        }

    logger.info(f"Computed 10-day delivery analytics for {len(delivery_analytics_map)} NSE EQ equities.")
    return latest_date, latest_bhav_map, delivery_analytics_map

def check_price_consolidation_or_pullback(sig: Dict[str, Any]) -> bool:
    """
    Evaluates whether the qualifying signal meets the institutional price consolidation or pullback condition.
    In the MITS Pro scanner, all 6 setups target structural reversals, momentum bases, flag consolidations,
    weekly swing bases, EMA pullbacks, and demand zone retests.
    Checks whether price action exhibits non-exhaustion consolidation/pullback behavior.
    """
    chg = abs(float(sig.get("change_pct", 0.0)))
    status_str = f"{sig.get('status', '')} {sig.get('stage', '')} {sig.get('stage_label', '')}".upper()
    
    consolidation_keywords = [
        "BASE", "PULLBACK", "FLAG", "CONSOLIDATION", "RETEST", 
        "TURNAROUND", "ACCUMULATION", "SUPPORT", "STAGE-2", "CHOCH", "DEMAND"
    ]
    has_keyword = any(kw in status_str for kw in consolidation_keywords)
    orderly_change = chg <= 5.0
    
    has_structural_pullback = (
        float(sig.get("correction_pct", 0.0)) > 0 or 
        float(sig.get("drawdown_pct", 0.0)) > 0 or 
        sig.get("support_level") is not None or 
        sig.get("support_ema") is not None or 
        sig.get("proximal") is not None or
        sig.get("base") is not None or
        sig.get("base_low") is not None
    )
    
    return (has_keyword and (orderly_change or chg <= 6.5)) or orderly_change or has_structural_pullback

def enrich_signal_with_smart_money(
    sig: Dict[str, Any], 
    deliv_info: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Computes and attaches the Institutional Smart Money & Delivery Footprint Radar metrics.
    Ensures non-breaking backward compatibility by populating all required quantitative fields:
      - delivery_pct
      - delivery_qty
      - avg_deliv_10d
      - avg_deliv_vol_10d
      - delivery_spike_pct
      - whale_absorption_flag
      - smart_money_status
    """
    if deliv_info:
        cur_deliv = float(deliv_info.get("delivery_pct", 0.0))
        avg_deliv_10d = float(deliv_info.get("avg_deliv_10d", cur_deliv))
        cur_deliv_qty = float(deliv_info.get("delivery_qty", 0.0))
        avg_vol_10d = float(deliv_info.get("avg_deliv_vol_10d", cur_deliv_qty))
        spike_pct = float(deliv_info.get("delivery_spike_pct", 0.0))
    else:
        cur_deliv = float(sig.get("delivery_pct", 0.0)) if sig.get("delivery_pct") is not None else 0.0
        avg_deliv_10d = float(sig.get("avg_deliv_10d", cur_deliv)) if sig.get("avg_deliv_10d") is not None else cur_deliv
        cur_deliv_qty = float(sig.get("delivery_qty", 0.0)) if sig.get("delivery_qty") is not None else 0.0
        avg_vol_10d = float(sig.get("avg_deliv_vol_10d", cur_deliv_qty)) if sig.get("avg_deliv_vol_10d") is not None else cur_deliv_qty
        spike_pct = round(((cur_deliv - avg_deliv_10d) / avg_deliv_10d) * 100, 1) if avg_deliv_10d > 0 else 0.0

    sig["delivery_pct"] = round(cur_deliv, 1)
    sig["delivery_qty"] = round(cur_deliv_qty, 0)
    sig["avg_deliv_10d"] = round(avg_deliv_10d, 1)
    sig["avg_deliv_vol_10d"] = round(avg_vol_10d, 0)
    sig["delivery_spike_pct"] = round(spike_pct, 1)

    # Whale Absorption Flag:
    # True if (delivery_pct >= 50% OR delivery_pct > 1.4 * avg_deliv_10d) AND (price consolidation/pullback condition met)
    price_cond_met = check_price_consolidation_or_pullback(sig)
    whale_condition = (cur_deliv >= 50.0 or (avg_deliv_10d > 0 and cur_deliv > 1.4 * avg_deliv_10d))
    whale_flag = bool(whale_condition and price_cond_met)
    sig["whale_absorption_flag"] = whale_flag

    # Smart Money Status:
    # - "High Institutional Absorption" (if whale_absorption_flag is True and delivery_pct > 55%)
    # - "Active Accumulation" (if delivery_pct between 40% and 55%)
    # - "Standard Flow" (otherwise)
    if whale_flag and cur_deliv > 55.0:
        sig["smart_money_status"] = "High Institutional Absorption"
    elif 40.0 <= cur_deliv <= 55.0:
        sig["smart_money_status"] = "Active Accumulation"
    elif cur_deliv > 55.0 and not whale_flag:
        sig["smart_money_status"] = "Active Accumulation"
    else:
        sig["smart_money_status"] = "Standard Flow"

    return sig
