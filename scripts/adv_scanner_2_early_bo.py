"""
MITS Pro Institutional Suite V2 - Advanced Stock Scanner 2: Early Breakout Scanner Engine
Strictly isolated standalone quantitative scanner.
Filters stocks coiling tightly within 0.2% - 3.0% below key technical resistance pivots
(20D Swing High or 52W High Breakout Level) with EMA trend stack (CMP > 20 EMA > 50 EMA),
volatility contraction, and volume dry-up/accumulation profiles.
"""

import os
import sys
import json
import time
import logging
from pathlib import Path
from datetime import datetime, date
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = BASE_DIR / "scripts"
DATA_DIR = BASE_DIR / "data"
CACHE_DIR = BASE_DIR / "cache"

if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from config import TIMEZONE, SYMBOLS_FILE

logger = logging.getLogger("AdvScannerEarlyBO")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

ADV_SCANNER_EARLY_BO_OUTPUT = DATA_DIR / "adv_scanner_2_early_bo.json"


def compute_early_bo_metrics(
    symbol_meta: Dict[str, Any],
    stock_df: pd.DataFrame,
    bench_df: Optional[pd.DataFrame] = None,
    bhav_info: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """
    Evaluates a single stock for Early Breakout coiling criteria.
    Requires:
      1. CMP > 20 EMA and 20 EMA > 50 EMA.
      2. Dynamic Resistance Pivot (20D Swing High or 52W High).
      3. Distance to resistance tightly compressed between 0.2% and 3.0%.
      4. Complete Institutional Stock Dossier with strict dynamic Support < CMP.
    """
    if stock_df is None or len(stock_df) < 25:
        return None

    try:
        # Standardize stock DataFrame
        sdf = stock_df.copy()
        if "Date" in sdf.columns:
            sdf["Date"] = pd.to_datetime(sdf["Date"]).dt.date
            sdf = sdf.sort_values("Date").drop_duplicates(subset=["Date"])
            sdf = sdf.set_index("Date")
        else:
            if not isinstance(sdf.index, pd.DatetimeIndex):
                sdf.index = pd.to_datetime(sdf.index)
            sdf.index = sdf.index.date

        # Standardize benchmark DataFrame if present
        bdf = None
        if bench_df is not None and not bench_df.empty:
            bdf = bench_df.copy()
            if "Date" in bdf.columns:
                bdf["Date"] = pd.to_datetime(bdf["Date"]).dt.date
                bdf = bdf.sort_values("Date").drop_duplicates(subset=["Date"])
                bdf = bdf.set_index("Date")
            else:
                if not isinstance(bdf.index, pd.DatetimeIndex):
                    bdf.index = pd.to_datetime(bdf.index)
                bdf.index = bdf.index.date

        stock_close = sdf["Close"].astype(float)
        stock_high = sdf["High"].astype(float) if "High" in sdf.columns else stock_close
        stock_low = sdf["Low"].astype(float) if "Low" in sdf.columns else stock_close
        stock_vol = sdf["Volume"].astype(float) if "Volume" in sdf.columns else pd.Series(1.0, index=sdf.index)

        comb_dict = {
            "stock_close": stock_close,
            "stock_high": stock_high,
            "stock_low": stock_low,
            "stock_vol": stock_vol
        }
        if bdf is not None:
            comb_dict["bench_close"] = bdf["Close"].astype(float)

        combined = pd.DataFrame(comb_dict).dropna(subset=["stock_close", "stock_high", "stock_low"])

        total_sessions = len(combined)
        if total_sessions < 25:
            return None

        # Synchronize latest candle if Bhavcopy info is provided
        cur_close = float(combined["stock_close"].iloc[-1])
        cur_vol = float(combined["stock_vol"].iloc[-1])
        if bhav_info and bhav_info.get("close", 0) > 0:
            cur_close = float(bhav_info["close"])
            cur_vol = float(bhav_info.get("volume", cur_vol))
            combined.loc[combined.index[-1], "stock_close"] = cur_close
            combined.loc[combined.index[-1], "stock_vol"] = cur_vol
            if "high" in bhav_info and float(bhav_info["high"]) > 0:
                combined.loc[combined.index[-1], "stock_high"] = float(bhav_info["high"])
            if "low" in bhav_info and float(bhav_info["low"]) > 0:
                combined.loc[combined.index[-1], "stock_low"] = float(bhav_info["low"])
            combined.loc[combined.index[-1], "stock_high"] = max(combined.loc[combined.index[-1], "stock_high"], cur_close)
            combined.loc[combined.index[-1], "stock_low"] = min(combined.loc[combined.index[-1], "stock_low"], cur_close)

        # 1-day change %
        if bhav_info and bhav_info.get("prev_close", 0) > 0:
            prev_close = float(bhav_info["prev_close"])
            day_chg_pct = round(((cur_close - prev_close) / prev_close) * 100.0, 2)
        else:
            prev_close = float(combined["stock_close"].iloc[-2]) if total_sessions > 1 else cur_close
            day_chg_pct = round(((cur_close - prev_close) / prev_close) * 100.0, 2) if prev_close > 0 else 0.0

        # Moving Averages: 20 EMA, 50 EMA, 200 EMA
        ema_20 = float(combined["stock_close"].ewm(span=20, adjust=False).mean().iloc[-1])
        ema_50 = float(combined["stock_close"].ewm(span=50, adjust=False).mean().iloc[-1])
        ema_200 = float(combined["stock_close"].ewm(span=200, adjust=False).mean().iloc[-1]) if total_sessions >= 100 else None

        # Filter 1: Strict Trend Stack (CMP > 20 EMA and 20 EMA > 50 EMA)
        if not (cur_close > ema_20 and ema_20 > ema_50):
            return None

        # =========================================================================
        # Breakout Target Identification & Dynamic Support/Resistance
        # =========================================================================
        cmp = cur_close
        lookback_20 = min(total_sessions, 20)
        lookback_252 = min(total_sessions, 252)

        swing_high_20d = float(combined["stock_high"].iloc[-lookback_20:].max())
        swing_low_20d = float(combined["stock_low"].iloc[-lookback_20:].min())
        high_52w = float(combined["stock_high"].iloc[-lookback_252:].max())
        low_52w = float(combined["stock_low"].iloc[-lookback_252:].min())

        # Breakout Target Pivot Identification
        if cmp < swing_high_20d:
            target_pivot = swing_high_20d
            pivot_type = "20D Swing High"
        else:
            target_pivot = high_52w
            pivot_type = "52-Week High"

        # Filter 2: Proximity Condition (0.2% to 3.0% below Pivot)
        dist_to_pivot = round(((target_pivot - cmp) / cmp) * 100.0, 2) if cmp > 0 else 0.0
        if not (0.2 <= dist_to_pivot <= 3.0):
            return None

        # Dynamic Support Logic (Strictly < CMP)
        if cmp > swing_low_20d:
            support_val = swing_low_20d
            support_label = "20D Swing Low Support"
        elif cmp > ema_50:
            support_val = ema_50
            support_label = "50 EMA Baseline Support"
        elif ema_200 is not None and cmp > ema_200:
            support_val = ema_200
            support_label = "200 EMA Institutional Floor"
        else:
            support_val = low_52w
            support_label = "52W Low Structural Base"

        # Guarantee support strictly sits BELOW CMP
        if support_val >= cmp:
            support_val = round(cmp * 0.95, 2)
            support_label = "Dynamic Structural Base (-5%)"

        # Resistance = target_pivot (strictly > CMP)
        resistance_val = target_pivot
        resistance_label = f"{pivot_type} Pivot"
        if resistance_val <= cmp:
            resistance_val = round(cmp * 1.05, 2)
            resistance_label = "Blue Sky Discovery (+5%)"

        # Distance calculations & formatted labels
        support_dist_pct = round(((cmp - support_val) / cmp) * 100.0, 2) if cmp > 0 else 0.0
        resistance_dist_pct = round(((resistance_val - cmp) / cmp) * 100.0, 2) if cmp > 0 else 0.0
        support_dist = f"-{support_dist_pct}% below"
        resistance_dist = f"+{resistance_dist_pct}% to pivot"
        dist_52w = f"{round(((high_52w - cmp) / high_52w) * -100.0, 2)}% from 52W High" if high_52w > 0 else "0.0% from 52W High"

        # Contraction & Volume Ratios
        vol_20d_series = combined["stock_vol"].iloc[-lookback_20:]
        vol_20d_avg = float(vol_20d_series.mean()) if len(vol_20d_series) > 0 else cur_vol
        vol_ratio = round(cur_vol / vol_20d_avg, 2) if vol_20d_avg > 0 else 1.0

        if vol_ratio >= 1.5:
            vol_status = "Volume Surge (Accumulation)"
            vol_badge = "SURGE"
        elif vol_ratio >= 1.0:
            vol_status = "Above Average Flow"
            vol_badge = "CONFIRMED"
        elif vol_ratio < 0.75:
            vol_status = "Dry-up Contraction"
            vol_badge = "DRY-UP"
        else:
            vol_status = "Normal Volume Flow"
            vol_badge = "NORMAL"

        # Volatility / ATR Contraction (last 5 sessions vs 20 sessions)
        high_s = combined["stock_high"]
        low_s = combined["stock_low"]
        close_prev = combined["stock_close"].shift(1)
        tr = np.maximum(high_s - low_s, np.maximum((high_s - close_prev).abs(), (low_s - close_prev).abs()))
        atr_5 = float(tr.iloc[-min(total_sessions, 5):].mean())
        atr_20 = float(tr.iloc[-lookback_20:].mean())
        atr_ratio = round(atr_5 / atr_20, 2) if atr_20 > 0 else 1.0

        if atr_ratio <= 0.85:
            tightness_desc = "Tight Coiling Base (VCP)"
            tightness_badge = "COILING"
        elif atr_ratio <= 1.10:
            tightness_desc = "Symmetrical Consolidation"
            tightness_badge = "CONSOLIDATION"
        else:
            tightness_desc = "Standard Base Range"
            tightness_badge = "NORMAL"

        # Breakout Readiness Composite Score (0 - 99)
        prox_score = 95 - int(((dist_to_pivot - 0.2) / 2.8) * 25)
        bonus = 0
        if vol_ratio < 0.75 or vol_ratio >= 1.5:
            bonus += 5
        if atr_ratio <= 0.85:
            bonus += 5
        bo_score = max(50, min(99, prox_score + bonus))

        # Returns & RS profile vs Benchmark if available
        periods = [20, 60, 120, 252]
        ret_data: Dict[str, Any] = {}
        for p in periods:
            if total_sessions > p and "bench_close" in combined.columns:
                s_ret = ((combined["stock_close"].iloc[-1] / combined["stock_close"].iloc[-1 - p]) - 1.0) * 100.0
                b_ret = ((combined["bench_close"].iloc[-1] / combined["bench_close"].iloc[-1 - p]) - 1.0) * 100.0
                rs_val = s_ret - b_ret
                ret_data[f"stock_ret_{p}d"] = round(float(s_ret), 2)
                ret_data[f"bench_ret_{p}d"] = round(float(b_ret), 2)
                ret_data[f"rs_{p}d"] = round(float(rs_val), 2)
            else:
                ret_data[f"stock_ret_{p}d"] = None
                ret_data[f"bench_ret_{p}d"] = None
                ret_data[f"rs_{p}d"] = None

        # Weinstein Stage
        above_ema50 = bool(cur_close >= ema_50)
        above_ema200 = bool(cur_close >= ema_200) if ema_200 is not None else None
        if above_ema50 and (above_ema200 is None or (above_ema200 and (ema_200 is None or ema_50 >= ema_200))):
            stage = "Stage-2 Markup"
            stage_badge = "Stage-2 Markup"
            stage_color = "bullish"
            stage_desc = "Institutional Accumulation & Sustained Expansion"
        elif not above_ema50 and (above_ema200 is False and (ema_200 is not None and ema_50 <= ema_200)):
            stage = "Stage-4 Decline"
            stage_badge = "Stage-4 Decline"
            stage_color = "bearish"
            stage_desc = "Structural Downtrend / Capitulation Pressure"
        elif not above_ema50 and above_ema200 is True:
            stage = "Stage-3 Distribution"
            stage_badge = "Stage-3 Distribution"
            stage_color = "warning"
            stage_desc = "Topping / Overhead Supply Pressure"
        else:
            stage = "Stage-1 Base"
            stage_badge = "Stage-1 Base"
            stage_color = "cyan"
            stage_desc = "Consolidation / Accumulation Base"

        # Moving Average Trend Stack
        is_trend_stack = bool(cur_close > ema_20 and ema_20 > ema_50 and (ema_200 is None or ema_50 > ema_200))
        trend_stack_status = "Bullish Stack (Price > 20 > 50 > 200 EMA)" if is_trend_stack else "Constructive Trend Alignment (Above 50 EMA)"
        trend_stack_badge = "PERFECT STACK" if is_trend_stack else "CONSTRUCTIVE"

        # Delivery & Smart Money Footprint
        deliv_pct = float(bhav_info.get("delivery_pct", 0.0)) if bhav_info else 0.0
        deliv_spike = float(bhav_info.get("delivery_spike_pct", 0.0)) if bhav_info else 0.0
        if deliv_pct >= 60.0 or vol_ratio >= 1.5:
            delivery_status = "High Institutional Accumulation"
            delivery_badge = "ACCUMULATION"
        elif deliv_pct >= 45.0 or vol_ratio >= 1.2:
            delivery_status = "Active Demand Absorption"
            delivery_badge = "ABSORPTION"
        elif vol_ratio < 0.75:
            delivery_status = "Low Volume Pullback / Dry-up"
            delivery_badge = "DRY-UP"
        else:
            delivery_status = "Standard Market Flow"
            delivery_badge = "STANDARD"

        sym_str = symbol_meta.get("symbol", "")
        key_levels = {
            "support": round(support_val, 2),
            "support_label": support_label,
            "support_dist": support_dist,
            "resistance": round(resistance_val, 2),
            "resistance_label": resistance_label,
            "resistance_dist": resistance_dist,
            "high_52w": round(high_52w, 2),
            "dist_52w": dist_52w,
            # Backwards compatibility aliases:
            "support_1": round(support_val, 2),
            "support_1_dist_pct": support_dist_pct,
            "pivot_resistance": round(resistance_val, 2),
            "pivot_dist_pct": resistance_dist_pct,
            "dist_52w_high_pct": round(((cmp - high_52w) / high_52w) * 100.0, 2) if high_52w > 0 else 0.0
        }

        dossier = {
            "symbol": sym_str,
            "name": symbol_meta.get("name", sym_str),
            "sector": symbol_meta.get("sector", "NSE"),
            "stage": stage,
            "stage_badge": stage_badge,
            "stage_color": stage_color,
            "stage_desc": stage_desc,
            "trend_stack": is_trend_stack,
            "trend_stack_status": trend_stack_status,
            "trend_stack_badge": trend_stack_badge,
            "ema_20": round(ema_20, 2),
            "ema_50": round(ema_50, 2),
            "ema_200": round(ema_200, 2) if ema_200 is not None else None,
            "key_levels": key_levels,
            "volume_footprint": {
                "volume_multiple": vol_ratio,
                "volume_desc": f"{vol_ratio}x Vol",
                "delivery_status": delivery_status,
                "delivery_badge": delivery_badge,
                "delivery_pct": round(deliv_pct, 1) if deliv_pct > 0 else None,
                "delivery_spike": round(deliv_spike, 1) if deliv_spike != 0 else None
            },
            "rs_profile": ret_data,
            "support": round(support_val, 2),
            "support_label": support_label,
            "support_dist": support_dist,
            "resistance": round(resistance_val, 2),
            "resistance_label": resistance_label,
            "resistance_dist": resistance_dist,
            "high_52w": round(high_52w, 2),
            "dist_52w": dist_52w,
            "tradingview_url": f"https://in.tradingview.com/chart/?symbol=NSE:{sym_str}"
        }

        return {
            "symbol": sym_str,
            "name": symbol_meta.get("name", sym_str),
            "sector": symbol_meta.get("sector", "NSE"),
            "cmp": round(cur_close, 2),
            "change_pct": day_chg_pct,
            "resistance": round(resistance_val, 2),
            "dist_to_pivot": dist_to_pivot,
            "pivot_type": pivot_type,
            "support": round(support_val, 2),
            "support_label": support_label,
            "support_dist": support_dist,
            "vol_ratio": vol_ratio,
            "vol_status": vol_status,
            "vol_badge": vol_badge,
            "atr_ratio": atr_ratio,
            "tightness_desc": tightness_desc,
            "tightness_badge": tightness_badge,
            "bo_score": bo_score,
            "rs_score": bo_score,
            "above_ema50": above_ema50,
            "above_ema200": above_ema200,
            "dossier": dossier
        }

    except Exception as e:
        logger.debug(f"Error computing Early Breakout for {symbol_meta.get('symbol')}: {e}")
        return None


def generate_adv_scanner_early_bo(
    symbols: Optional[List[Dict[str, Any]]] = None,
    stock_dfs: Optional[Dict[str, pd.DataFrame]] = None,
    bhav_date: Optional[date] = None,
    bhav_map: Optional[Dict[str, Dict[str, Any]]] = None,
    delivery_analytics_map: Optional[Dict[str, Dict[str, Any]]] = None,
    n_df: Optional[pd.DataFrame] = None
) -> Dict[str, Any]:
    """
    Main generator for the Advanced Early Breakout Scanner (Slot 2).
    """
    t_start = time.time()
    logger.info("Initializing Advanced Stock Scanner 2: Early Breakout Scanner...")

    # 1. Load symbols
    if symbols is None:
        if SYMBOLS_FILE.exists():
            with open(SYMBOLS_FILE, "r", encoding="utf-8") as f:
                sym_data = json.load(f)
                symbols = sym_data.get("symbols", [])
        else:
            symbols = []

    # 2. Benchmark data
    bench_df = n_df
    if bench_df is None or bench_df.empty:
        bench_parquet = CACHE_DIR / "benchmark.parquet"
        if bench_parquet.exists():
            bench_df = pd.read_parquet(bench_parquet)
            logger.info(f"Loaded benchmark from {bench_parquet} ({len(bench_df)} sessions).")

    # 3. Stock dataframes
    if stock_dfs is None:
        stock_dfs = {}
        ohlcv_parquet = CACHE_DIR / "market_ohlcv.parquet"
        if ohlcv_parquet.exists():
            logger.info(f"Loading market OHLCV data from {ohlcv_parquet}...")
            full_ohlcv = pd.read_parquet(ohlcv_parquet)
            sym_col = "Symbol" if "Symbol" in full_ohlcv.columns else "symbol"
            for sym, group in full_ohlcv.groupby(sym_col):
                stock_dfs[str(sym)] = group.sort_values("Date")
            logger.info(f"Loaded {len(stock_dfs)} stock DataFrames from cache.")

    # 4. Evaluate all stocks
    records: List[Dict[str, Any]] = []
    for item in symbols:
        sym = item.get("symbol", "")
        df = stock_dfs.get(sym)
        if df is None or df.empty:
            continue

        bhav_info = bhav_map.get(sym) if bhav_map else None
        res = compute_early_bo_metrics(item, df, bench_df, bhav_info)
        if res:
            records.append(res)

    # 5. Sort ascending by distance to pivot (tightest coil first)
    records.sort(key=lambda x: x["dist_to_pivot"])

    # Assign Rank 1 to N
    for idx, r in enumerate(records):
        r["rank"] = idx + 1
        r["dossier"]["rank"] = idx + 1

    # 6. Generate payload
    scan_dt = bhav_date.strftime("%Y-%m-%d") if bhav_date else datetime.now().strftime("%Y-%m-%d")
    coiling_tight_count = sum(1 for r in records if r.get("dist_to_pivot", 99) <= 1.5)
    volume_surge_count = sum(1 for r in records if r.get("vol_badge") == "SURGE")

    payload = {
        "scan_date": scan_dt,
        "generated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S IST"),
        "total_stocks": len(records),
        "coiling_tight_count": coiling_tight_count,
        "volume_surge_count": volume_surge_count,
        "stocks": records
    }

    # Save to data/adv_scanner_2_early_bo.json
    with open(ADV_SCANNER_EARLY_BO_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    elapsed = time.time() - t_start
    logger.info(
        f"Generated {ADV_SCANNER_EARLY_BO_OUTPUT} in {elapsed:.2f}s! "
        f"Total: {len(records)} stocks coiling within 0.2%-3.0% of resistance pivots."
    )
    return payload


if __name__ == "__main__":
    t0 = time.time()
    payload = generate_adv_scanner_early_bo()
    elapsed = time.time() - t0
    print("\n" + "=" * 70)
    print("MITS ADVANCED STOCK SCANNER 2: EARLY BREAKOUT COMPLETE")
    print(f"Time Taken: {elapsed:.2f}s")
    print(f"Total Early Breakout Candidates: {payload.get('total_stocks', 0)} Stocks")
    print(f"Payload Output: {ADV_SCANNER_EARLY_BO_OUTPUT}")
    print("=" * 70 + "\n")
