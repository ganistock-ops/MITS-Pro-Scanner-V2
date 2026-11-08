"""
MITS Pro Institutional Suite V2 - Advanced Stock Scanner 4: Rally Base Rally (RBR) Proportional Scanner Engine
Strictly isolated standalone quantitative scanner.
Identifies institutional Rally-Base-Rally (RBR) structures across rolling 60-90 sessions:
  Phase 1 (First Rally): Prior bullish impulse (>= 2x ATR move, 3-15 days duration).
  Phase 2 (Base Formation): Consolidation after rally peak (3-20 days, Base High, Base Low, Base Range).
    Base Retracement Formula: BR = ((Rally_High - Base_Low) / (Rally_High - Rally_Low)) * 100
  Phase 3 (Continuation / Second Leg): Verification of Base breakout or consolidation.
100-Point Composite Scoring across 6 Pillars:
  1. First Rally Strength (Max 20 pts)
  2. Base Formation Quality (Max 25 pts)
  3. Retracement Proportion (Max 15 pts)
  4. Volume Behaviour & Contraction (Max 15 pts)
  5. ATR & Volatility Contraction (Max 10 pts)
  6. Second Rally / Breakout Expansion (Max 15 pts - 0 if still forming base)
Filters out 'C' grade stocks (Score < 60), outputting sorted A+/A/B candidates.
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

logger = logging.getLogger("AdvScannerRBRProportional")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

ADV_SCANNER_RBR_OUTPUT = DATA_DIR / "adv_scanner_4_rbr_proportional.json"
ADV_SCANNER_RS_OUTPUT = DATA_DIR / "adv_scanner_1_rs.json"


def compute_rbr_proportional_metrics(
    symbol_meta: Dict[str, Any],
    stock_df: pd.DataFrame,
    bench_df: Optional[pd.DataFrame] = None,
    bhav_info: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """
    Evaluates a single stock for Rally-Base-Rally (RBR) Proportional pattern criteria
    and computes the 100-point composite score across 6 technical pillars.
    """
    if stock_df is None or len(stock_df) < 45:
        return None

    try:
        # Standardize stock DataFrame
        sdf = stock_df.copy()
        if "Date" in sdf.columns:
            sdf["Date"] = pd.to_datetime(sdf["Date"]).dt.date
            sdf = sdf.sort_values("Date").drop_duplicates(subset=["Date"])
            sdf = sdf.set_index("Date")
        elif not isinstance(sdf.index, pd.DatetimeIndex):
            sdf.index = pd.to_datetime(sdf.index).date

        cols = {c.lower(): c for c in sdf.columns}
        c_close = cols.get("close", "Close")
        c_high = cols.get("high", "High")
        c_low = cols.get("low", "Low")
        c_open = cols.get("open", "Open")
        c_vol = cols.get("volume", "Volume")

        close_s = pd.to_numeric(sdf[c_close], errors="coerce").ffill()
        high_s = pd.to_numeric(sdf[c_high], errors="coerce").ffill()
        low_s = pd.to_numeric(sdf[c_low], errors="coerce").ffill()
        open_s = pd.to_numeric(sdf[c_open], errors="coerce").ffill()
        vol_s = pd.to_numeric(sdf[c_vol], errors="coerce").fillna(0.0)

        # Synchronize latest session ONLY if Bhavcopy date matches latest candle date
        last_dt = sdf.index[-1]
        last_dt_str = last_dt.strftime("%Y-%m-%d") if hasattr(last_dt, "strftime") else str(last_dt)
        bhav_dt = bhav_info.get("date") if bhav_info else None
        bhav_dt_str = bhav_dt.strftime("%Y-%m-%d") if hasattr(bhav_dt, "strftime") else (str(bhav_dt) if bhav_dt else None)
        bhav_date_matches = bool(bhav_info and (bhav_dt_str == last_dt_str if bhav_dt_str else True))

        if bhav_date_matches and bhav_info and bhav_info.get("close"):
            b_close = float(bhav_info["close"])
            if b_close > 0:
                close_s.iloc[-1] = b_close
                if bhav_info.get("high") and float(bhav_info["high"]) > 0:
                    high_s.iloc[-1] = max(float(high_s.iloc[-1]), float(bhav_info["high"]))
                else:
                    high_s.iloc[-1] = max(float(high_s.iloc[-1]), b_close)

                if bhav_info.get("low") and float(bhav_info["low"]) > 0:
                    low_s.iloc[-1] = min(float(low_s.iloc[-1]), float(bhav_info["low"]))
                else:
                    low_s.iloc[-1] = min(float(low_s.iloc[-1]), b_close)

                if bhav_info.get("volume") and float(bhav_info["volume"]) > 0:
                    vol_s.iloc[-1] = float(bhav_info["volume"])

        total_sessions = len(close_s)
        if total_sessions < 45:
            return None

        closes = close_s.values
        highs = high_s.values
        lows = low_s.values
        opens = open_s.values
        vols = vol_s.values
        N = total_sessions
        cur_close = float(closes[-1])

        if cur_close <= 0:
            return None

        # Daily Change %
        if bhav_date_matches and bhav_info and bhav_info.get("change_pct") is not None:
            day_chg_pct = round(float(bhav_info["change_pct"]), 2)
        elif bhav_date_matches and bhav_info and bhav_info.get("prev_close") and float(bhav_info["prev_close"]) > 0:
            prev_close = float(bhav_info["prev_close"])
            day_chg_pct = round(((cur_close - prev_close) / prev_close) * 100.0, 2)
        else:
            prev_close = float(closes[-2]) if total_sessions >= 2 else cur_close
            day_chg_pct = round(((cur_close - prev_close) / prev_close) * 100.0, 2) if prev_close > 0 else 0.0

        # Calculate 14-period True Range and Wilder's Smoothing ATR
        tr = np.maximum(
            highs[1:] - lows[1:],
            np.maximum(
                np.abs(highs[1:] - closes[:-1]),
                np.abs(lows[1:] - closes[:-1])
            )
        )
        atr14 = np.zeros(N)
        atr14[14] = np.mean(tr[:14]) if len(tr) >= 14 else (tr[0] if len(tr) > 0 else 1.0)
        for i in range(15, N):
            atr14[i] = (atr14[i - 1] * 13.0 + tr[i - 1]) / 14.0
        atr14[:14] = atr14[14]

        # Moving Averages for trend confirmation
        ema_20 = float(close_s.ewm(span=20, adjust=False).mean().iloc[-1])
        ema_50 = float(close_s.ewm(span=50, adjust=False).mean().iloc[-1])
        ema_200 = float(close_s.ewm(span=200, adjust=False).mean().iloc[-1]) if total_sessions >= 150 else None

        best_candidate = None
        best_score = -1

        # Search over recent base_end_idx:
        # If in base (FORMING / READY): base_end_idx = N - 1 (today)
        # If breakout occurred recently (CONFIRMED / CONTINUATION): base_end_idx is 1 to 8 bars ago
        min_b_end = max(N - 10, 20)
        for b_end in range(N - 1, min_b_end, -1):
            # Base duration: 3 to 20 days
            for b_len in range(3, 21):
                peak_idx = b_end - b_len
                if peak_idx < 10:
                    continue

                b_start = peak_idx + 1
                base_high = float(np.max(highs[b_start : b_end + 1]))
                base_low = float(np.min(lows[b_start : b_end + 1]))
                base_range = base_high - base_low

                if base_range <= 0:
                    continue

                # Rally duration: 3 to 15 days ending at peak_idx
                for r_len in range(3, 16):
                    r_start = peak_idx - r_len + 1
                    if r_start < 0:
                        continue

                    # The peak_idx must be the highest high of the rally window
                    rally_high = float(highs[peak_idx])
                    if peak_idx > r_start and rally_high < float(np.max(highs[r_start:peak_idx])):
                        continue

                    rally_low = float(np.min(lows[r_start : peak_idx + 1]))
                    rally_range = rally_high - rally_low

                    if rally_range <= 0 or rally_low <= 0:
                        continue

                    first_rally_pct = ((rally_high - rally_low) / rally_low) * 100.0
                    atr_at_start = atr14[r_start] if atr14[r_start] > 0 else 1.0

                    # 1. First Rally Filters:
                    # Bullish impulse >= 1.8x ATR (preferred >= 2x ATR) and net gain >= 4.0%
                    if rally_range < 1.8 * atr_at_start or first_rally_pct < 4.0:
                        continue

                    # 2. Base Formation Filters:
                    # Base high should not blow far past the rally peak (allowing minor retest overshoot <= 3.5%)
                    if base_high > rally_high * 1.035:
                        continue

                    # Base Retracement Formula from specification:
                    # BR = ((Rally_High - Base_Low) / (Rally_High - Rally_Low)) * 100
                    br = ((rally_high - base_low) / rally_range) * 100.0

                    # Healthy retracement is 15% - 50%, acceptable up to 65%
                    if br < 10.0 or br > 65.0:
                        continue

                    range_ratio = base_range / rally_range
                    if range_ratio > 0.85:
                        continue

                    # Volume Contraction Ratio
                    rally_avg_vol = float(np.mean(vols[r_start : peak_idx + 1]))
                    if rally_avg_vol <= 0:
                        rally_avg_vol = 1.0
                    base_avg_vol = float(np.mean(vols[b_start : b_end + 1]))
                    volume_ratio = base_avg_vol / rally_avg_vol

                    # ATR Contraction Ratio
                    rally_avg_atr = float(np.mean(atr14[r_start : peak_idx + 1]))
                    if rally_avg_atr <= 0:
                        rally_avg_atr = 1.0
                    base_avg_atr = float(np.mean(atr14[b_start : b_end + 1]))
                    atr_ratio = base_avg_atr / rally_avg_atr

                    # Demand Zone Identification
                    body_highs = np.maximum(opens[b_start : b_end + 1], closes[b_start : b_end + 1])
                    dz_upper = float(np.max(body_highs))
                    dz_lower = float(base_low)
                    dz_mid = round((dz_upper + dz_lower) / 2.0, 2)

                    # Disqualify if current close has broken below base_low
                    if cur_close < dz_lower:
                        continue

                    # Zone Status
                    if cur_close <= dz_upper:
                        dz_status = "Tested" if base_low <= dz_upper else "Active"
                    else:
                        dz_status = "Active"

                    # Stage Status & Distances
                    if cur_close > base_high:
                        second_rally_pct = ((cur_close - base_high) / base_high) * 100.0
                        distance_to_base_high_pct = 0.0
                        if second_rally_pct <= 2.5:
                            stage_status = "CONFIRMED"
                        elif second_rally_pct <= 25.0:
                            stage_status = "CONTINUATION"
                        else:
                            continue  # Overextended second rally
                    else:
                        second_rally_pct = 0.0
                        distance_to_base_high_pct = ((base_high - cur_close) / base_high) * 100.0
                        if distance_to_base_high_pct <= 1.5:
                            stage_status = "READY"
                        else:
                            stage_status = "FORMING"

                    # -------------------------------------------------------------
                    # 100-POINT SCORING BREAKDOWN
                    # -------------------------------------------------------------
                    # 1. First Rally Strength (Max 20 pts)
                    s_rally = 0
                    if first_rally_pct >= 15.0:
                        s_rally = 20
                    elif first_rally_pct >= 10.0:
                        s_rally = 17
                    elif first_rally_pct >= 7.0:
                        s_rally = 14
                    elif first_rally_pct >= 5.0:
                        s_rally = 11
                    else:
                        s_rally = 7

                    # 2. Base Formation Quality (Max 25 pts)
                    s_base = 0
                    # Duration (4 to 14 days ideal consolidation)
                    if 4 <= b_len <= 14:
                        s_base += 10
                    elif 3 <= b_len <= 18:
                        s_base += 7
                    else:
                        s_base += 4
                    # Range compression (< 0.60 preferred)
                    if range_ratio < 0.35:
                        s_base += 15
                    elif range_ratio < 0.50:
                        s_base += 12
                    elif range_ratio < 0.65:
                        s_base += 9
                    else:
                        s_base += 5

                    # 3. Retracement Proportion (Max 15 pts)
                    # Healthy: 15% - 50%
                    s_ret = 0
                    if 20.0 <= br <= 38.2:
                        s_ret = 15
                    elif (15.0 <= br < 20.0) or (38.2 < br <= 50.0):
                        s_ret = 12
                    elif 50.0 < br <= 60.0:
                        s_ret = 8
                    else:
                        s_ret = 4

                    # 4. Volume Behaviour & Contraction (Max 15 pts)
                    # Contraction: Base Avg Volume / Rally Avg Volume (< 0.80 preferred)
                    s_vol = 0
                    if volume_ratio < 0.60:
                        s_vol = 15
                    elif volume_ratio < 0.80:
                        s_vol = 12
                    elif volume_ratio < 1.00:
                        s_vol = 8
                    elif volume_ratio < 1.15:
                        s_vol = 5
                    else:
                        s_vol = 2

                    # 5. ATR & Volatility Contraction (Max 10 pts)
                    # Contraction: Base Avg ATR / Rally Avg ATR (< 1.0 preferred)
                    s_atr = 0
                    if atr_ratio < 0.70:
                        s_atr = 10
                    elif atr_ratio < 0.85:
                        s_atr = 8
                    elif atr_ratio < 1.00:
                        s_atr = 6
                    else:
                        s_atr = 3

                    # 6. Second Rally / Breakout Expansion (Max 15 pts)
                    # Prompt: "0 if still forming base"
                    s_exp = 0
                    if stage_status == "FORMING":
                        s_exp = 0
                    elif stage_status == "READY":
                        s_exp = 8
                    elif stage_status == "CONFIRMED":
                        s_exp = 15
                    elif stage_status == "CONTINUATION":
                        s_exp = 13

                    total_score = s_rally + s_base + s_ret + s_vol + s_atr + s_exp

                    if total_score > best_score:
                        best_score = total_score

                        if total_score >= 85:
                            grade = "A+"
                        elif total_score >= 75:
                            grade = "A"
                        elif total_score >= 60:
                            grade = "B"
                        else:
                            grade = "C"

                        sym_str = symbol_meta.get("symbol", "")
                        company_name = symbol_meta.get("name", sym_str)
                        sector_str = symbol_meta.get("sector", "NSE")

                        # Dossier & Key Levels
                        support_dist_pct = round(((cur_close - dz_lower) / cur_close) * 100.0, 2) if cur_close > 0 else 0.0
                        res_dist_pct = round(distance_to_base_high_pct, 2) if cur_close <= base_high else round(second_rally_pct, 2)
                        high_52w = float(np.max(highs[-min(250, total_sessions):]))
                        dist_52w_pct = round(((high_52w - cur_close) / high_52w) * 100.0, 1) if high_52w > 0 else 0.0

                        dossier = {
                            "symbol": sym_str,
                            "name": company_name,
                            "sector": sector_str,
                            "stage": "Stage-2 Markup" if cur_close > base_high else "Stage-1 Base",
                            "stage_badge": stage_status,
                            "stage_color": "bullish" if stage_status in ["CONFIRMED", "CONTINUATION"] else "gold",
                            "stage_desc": "Rally-Base-Rally Proportional Institutional Continuation",
                            "trend_stack": bool(cur_close > ema_20 and ema_20 > ema_50),
                            "trend_stack_status": f"{stage_status} ({total_score}/100)",
                            "trend_stack_badge": f"RBR {grade}",
                            "ema_20": round(ema_20, 2),
                            "ema_50": round(ema_50, 2),
                            "ema_200": round(ema_200, 2) if ema_200 is not None else None,
                            "key_levels": {
                                "support": round(dz_lower, 2),
                                "support_label": "Demand Zone Lower (Base Low)",
                                "support_dist": f"-{support_dist_pct}% below",
                                "resistance": round(base_high, 2),
                                "resistance_label": "Base High Breakout Pivot",
                                "resistance_dist": f"+{res_dist_pct}% to pivot" if cur_close <= base_high else f"+{res_dist_pct}% above base",
                                "high_52w": round(high_52w, 2),
                                "dist_52w": f"-{dist_52w_pct}% from 52W High"
                            },
                            "volume_footprint": {
                                "volume_multiple": round(volume_ratio, 2),
                                "volume_desc": f"{round(volume_ratio, 2)}x Base/Rally Vol",
                                "delivery_status": "Dry-up Accumulation" if volume_ratio < 0.8 else "Normal Flow",
                                "delivery_pct": round(float(bhav_info.get("delivery_pct", 0.0)), 1) if bhav_info and bhav_info.get("delivery_pct") else None
                            },
                            "rs_profile": {
                                "rs_20d": round(first_rally_pct, 2)
                            },
                            "support": round(dz_lower, 2),
                            "support_label": "Demand Zone Lower (Base Low)",
                            "support_dist": f"-{support_dist_pct}% below",
                            "resistance": round(base_high, 2),
                            "resistance_label": "Base High Breakout Pivot",
                            "resistance_dist": f"+{res_dist_pct}% to pivot" if cur_close <= base_high else f"+{res_dist_pct}% above base",
                            "high_52w": round(high_52w, 2),
                            "dist_52w": f"-{dist_52w_pct}% from 52W High",
                            "tradingview_url": f"https://in.tradingview.com/chart/?symbol=NSE:{sym_str}"
                        }

                        best_candidate = {
                            "symbol": sym_str,
                            "company_name": company_name,
                            "sector": sector_str,
                            "ltp": round(cur_close, 2),
                            "change_pct": day_chg_pct,
                            "first_rally_pct": round(first_rally_pct, 2),
                            "rally_days": int(r_len),
                            "base_days": int(b_len),
                            "retracement_pct": round(br, 2),
                            "range_ratio": round(range_ratio, 2),
                            "volume_ratio": round(volume_ratio, 2),
                            "atr_ratio": round(atr_ratio, 2),
                            "demand_zone": {
                                "upper": round(dz_upper, 2),
                                "lower": round(dz_lower, 2),
                                "mid": dz_mid,
                                "status": dz_status
                            },
                            "distance_to_base_high_pct": round(distance_to_base_high_pct, 2),
                            "second_rally_pct": round(second_rally_pct, 2),
                            "rbr_score": int(total_score),
                            "grade": grade,
                            "stage_status": stage_status,
                            "score_breakdown": {
                                "rally_strength": s_rally,
                                "base_quality": s_base,
                                "retracement": s_ret,
                                "volume_contraction": s_vol,
                                "atr_contraction": s_atr,
                                "expansion": s_exp
                            },
                            "name": company_name,
                            "cmp": round(cur_close, 2),
                            "score": int(total_score),
                            "s1": round(dz_lower, 2),
                            "r1": round(base_high, 2),
                            "support": round(dz_lower, 2),
                            "support_label": "Demand Zone Lower (Base Low)",
                            "resistance": round(base_high, 2),
                            "resistance_label": "Base High Breakout Pivot",
                            "tradingview_url": f"https://in.tradingview.com/chart/?symbol=NSE:{sym_str}",
                            "dossier": dossier
                        }

        return best_candidate

    except Exception as e:
        logger.debug(f"Error computing RBR Proportional metrics for {symbol_meta.get('symbol')}: {e}")
        return None


def generate_adv_scanner_rbr_proportional(
    symbols: Optional[List[Dict[str, Any]]] = None,
    stock_dfs: Optional[Dict[str, pd.DataFrame]] = None,
    bhav_date: Optional[date] = None,
    bhav_map: Optional[Dict[str, Dict[str, Any]]] = None,
    delivery_analytics_map: Optional[Dict[str, Dict[str, Any]]] = None,
    n_df: Optional[pd.DataFrame] = None
) -> Dict[str, Any]:
    """
    Main generator for the Advanced Rally Base Rally (RBR) Proportional Scanner (Slot 4).
    Evaluates the full universe and saves records with Score >= 60 (Grades A+, A, B).
    """
    t_start = time.time()
    logger.info("Initializing Advanced Stock Scanner 4: Rally Base Rally (RBR) Proportional Scanner...")

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

    # 3. Stock DataFrames
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

    # 3b. Standalone Bhavcopy loading if bhav_map is None
    if bhav_map is None:
        bhav_map = {}
        # Synchronize from latest RS EOD feed if available
        if ADV_SCANNER_RS_OUTPUT.exists():
            try:
                with open(ADV_SCANNER_RS_OUTPUT, "r", encoding="utf-8") as f:
                    rs_feed = json.load(f)
                for s in rs_feed.get("stocks", []):
                    sym = s.get("symbol")
                    if sym:
                        bhav_map[sym] = {
                            "close": float(s.get("cmp", 0.0)),
                            "prev_close": float(s.get("cmp", 0.0) / (1.0 + (s.get("change_pct", 0.0) / 100.0))) if s.get("change_pct") is not None else float(s.get("cmp", 0.0)),
                            "change_pct": float(s.get("change_pct", 0.0)),
                            "delivery_pct": float(s.get("delivery_pct", 0.0)) if s.get("delivery_pct") is not None else 0.0,
                            "volume": float(s.get("vol_20d_avg", 0.0) * s.get("vol_ratio", 1.0)) if s.get("vol_20d_avg") else 0.0
                        }
                if not bhav_date and rs_feed.get("scan_date"):
                    try:
                        bhav_date = datetime.strptime(rs_feed.get("scan_date"), "%Y-%m-%d").date()
                    except Exception:
                        pass
                logger.info(f"Synchronized {len(bhav_map)} stocks from latest RS EOD feed ({ADV_SCANNER_RS_OUTPUT.name}).")
            except Exception as e:
                logger.warning(f"Error loading RS feed for bhav_map: {e}")

        # Check bhavcopy cache as secondary fallback
        if not bhav_map:
            bhav_cache_dir = DATA_DIR / "bhavcopy_cache"
            all_cached = sorted(list(bhav_cache_dir.glob("sec_bhavdata_full_*.csv")), reverse=True)
            if all_cached:
                try:
                    bhav_df = pd.read_csv(all_cached[0])
                    bhav_df.columns = [c.strip() for c in bhav_df.columns]
                    if "SERIES" in bhav_df.columns:
                        bhav_df = bhav_df[bhav_df["SERIES"].astype(str).str.strip() == "EQ"]
                    if "SYMBOL" in bhav_df.columns:
                        bhav_df["SYMBOL"] = bhav_df["SYMBOL"].astype(str).str.strip()
                        symbols_arr = bhav_df["SYMBOL"].values
                        closes = pd.to_numeric(bhav_df.get("CLOSE_PRICE", 0.0), errors="coerce").fillna(0.0).values
                        prevs = pd.to_numeric(bhav_df.get("PREV_CLOSE", 0.0), errors="coerce").fillna(0.0).values
                        vols = pd.to_numeric(bhav_df.get("TTL_TRD_QNTY", 0.0), errors="coerce").fillna(0.0).values
                        highs = pd.to_numeric(bhav_df.get("HIGH_PRICE", 0.0), errors="coerce").fillna(0.0).values
                        lows = pd.to_numeric(bhav_df.get("LOW_PRICE", 0.0), errors="coerce").fillna(0.0).values
                        for i, s in enumerate(symbols_arr):
                            bhav_map[s] = {
                                "close": float(closes[i]),
                                "prev_close": float(prevs[i]),
                                "volume": float(vols[i]),
                                "high": float(highs[i]),
                                "low": float(lows[i])
                            }
                    logger.info(f"Loaded fallback Bhavcopy delivery data from {all_cached[0].name} ({len(bhav_map)} symbols).")
                except Exception as e:
                    logger.warning(f"Error loading cached Bhavcopy: {e}")

    # 4. Evaluate all stocks
    records: List[Dict[str, Any]] = []
    for item in symbols:
        sym = item.get("symbol", "")
        df = stock_dfs.get(sym)
        if df is None or df.empty:
            continue

        bhav_info = bhav_map.get(sym) if bhav_map else None
        if bhav_info and "date" not in bhav_info and bhav_date:
            bhav_info["date"] = bhav_date
        res = compute_rbr_proportional_metrics(item, df, bench_df, bhav_info)
        # Filter: Exclude 'C' grade stocks (Score < 60)
        if res and res.get("rbr_score", 0) >= 60:
            records.append(res)

    # 5. Sort descending by rbr_score (primary), and first_rally_pct (secondary)
    records.sort(key=lambda x: (x["rbr_score"], x["first_rally_pct"]), reverse=True)

    # Assign Rank 1 to N
    for idx, r in enumerate(records):
        r["rank"] = idx + 1

    # Count stages
    stage_counts = {
        "FORMING": sum(1 for r in records if r.get("stage_status") == "FORMING"),
        "READY": sum(1 for r in records if r.get("stage_status") == "READY"),
        "CONFIRMED": sum(1 for r in records if r.get("stage_status") == "CONFIRMED"),
        "CONTINUATION": sum(1 for r in records if r.get("stage_status") == "CONTINUATION")
    }

    # Count grades
    grade_counts = {
        "A+": sum(1 for r in records if r.get("grade") == "A+"),
        "A": sum(1 for r in records if r.get("grade") == "A"),
        "B": sum(1 for r in records if r.get("grade") == "B")
    }

    # 6. Generate payload
    latest_candle_dt = max((df.index[-1].date() for df in stock_dfs.values() if df is not None and not df.empty and hasattr(df.index[-1], "date")), default=None) if stock_dfs else None
    effective_date = latest_candle_dt if (latest_candle_dt and (not bhav_date or latest_candle_dt > bhav_date)) else (bhav_date or datetime.now().date())
    scan_dt = effective_date.strftime("%Y-%m-%d") if hasattr(effective_date, "strftime") else str(effective_date)[:10]
    payload = {
        "scan_date": scan_dt,
        "generated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S IST"),
        "total_stocks": len(records),
        "stage_counts": stage_counts,
        "grade_counts": grade_counts,
        "stocks": records
    }

    # Save strictly to data/adv_scanner_4_rbr_proportional.json
    with open(ADV_SCANNER_RBR_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    elapsed = time.time() - t_start
    logger.info(
        f"Generated {ADV_SCANNER_RBR_OUTPUT} in {elapsed:.2f}s! "
        f"Total: {len(records)} candidates (A+: {grade_counts['A+']}, A: {grade_counts['A']}, B: {grade_counts['B']}). "
        f"Stages: {stage_counts}."
    )
    return payload


if __name__ == "__main__":
    t0 = time.time()
    payload = generate_adv_scanner_rbr_proportional()
    elapsed = time.time() - t0
    print("\n" + "=" * 78)
    print("MITS ADVANCED STOCK SCANNER 4: RBR PROPORTIONAL SCANNER COMPLETE")
    print(f"Time Taken: {elapsed:.2f}s")
    print(f"Total Qualified Candidates (Score >= 60): {payload.get('total_stocks', 0)} Stocks")
    print(f"Stages Breakdown: {payload.get('stage_counts', {})}")
    print(f"Grade Breakdown: {payload.get('grade_counts', {})}")
    print(f"Payload Output: {ADV_SCANNER_RBR_OUTPUT}")
    print("-" * 78)
    print("TOP 10 RBR PROPORTIONAL CANDIDATES:")
    print(f"{'Rank':<5} {'Symbol':<12} {'LTP (Rs)':<10} {'Score':<8} {'Stage':<14} {'Rally %':<10} {'Base':<8} {'Ret %':<9} {'VolRatio':<9} {'Dist to Pivot':<14}")
    print("-" * 78)
    for stock in payload.get("stocks", [])[:10]:
        dist_str = f"+{stock['distance_to_base_high_pct']}%" if stock['stage_status'] in ['FORMING', 'READY'] else f"+{stock['second_rally_pct']}% exp"
        print(
            f"#{stock['rank']:<4} {stock['symbol']:<12} "
            f"Rs.{stock['ltp']:<7.2f} "
            f"{stock['rbr_score']:<3} ({stock['grade']:<2})  "
            f"{stock['stage_status']:<14} "
            f"{stock['first_rally_pct']:<5.1f}% ({stock['rally_days']}d)  "
            f"{stock['base_days']:<2}d     "
            f"{stock['retracement_pct']:<5.1f}%   "
            f"{stock['volume_ratio']:<4.2f}x    "
            f"{dist_str:<14}"
        )
    print("=" * 78 + "\n")
