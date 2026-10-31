"""
MITS Pro Institutional Suite V2 - Advanced Stock Scanner 1: Relative Strength (RS) Engine
Strictly isolated standalone quantitative scanner.
Calculates multi-timeframe excess returns (20D, 60D, 120D, 252D) against NIFTY 50,
cross-sectional percentile ranks, weighted RS Score (0-100), EMA trend confirmations,
and 60-day RS line trajectory.
"""

import os
import sys
import json
import time
import logging
from pathlib import Path
from datetime import datetime, date
from typing import Dict, Any, List, Optional, Tuple, Union
import pandas as pd
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = BASE_DIR / "scripts"
DATA_DIR = BASE_DIR / "data"
CACHE_DIR = BASE_DIR / "cache"

if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from config import TIMEZONE, SYMBOLS_FILE

logger = logging.getLogger("AdvScannerRS")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

ADV_SCANNER_RS_OUTPUT = DATA_DIR / "adv_scanner_1_rs.json"


def compute_rs_metrics(
    symbol_meta: Dict[str, Any],
    stock_df: pd.DataFrame,
    bench_df: pd.DataFrame,
    bhav_info: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """
    Computes multi-timeframe RS vs Nifty 50 for a single stock.
    Aligns trading sessions strictly by date.
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

        # Standardize benchmark DataFrame
        bdf = bench_df.copy()
        if "Date" in bdf.columns:
            bdf["Date"] = pd.to_datetime(bdf["Date"]).dt.date
            bdf = bdf.sort_values("Date").drop_duplicates(subset=["Date"])
            bdf = bdf.set_index("Date")
        else:
            if not isinstance(bdf.index, pd.DatetimeIndex):
                bdf.index = pd.to_datetime(bdf.index)
            bdf.index = bdf.index.date

        # Inner join on matching trading session dates
        stock_close = sdf["Close"].astype(float)
        stock_vol = sdf["Volume"].astype(float) if "Volume" in sdf.columns else pd.Series(1.0, index=sdf.index)
        bench_close = bdf["Close"].astype(float)

        combined = pd.DataFrame({
            "stock_close": stock_close,
            "stock_vol": stock_vol,
            "bench_close": bench_close
        }).dropna()

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

        # 1-day change %
        if bhav_info and bhav_info.get("prev_close", 0) > 0:
            prev_close = float(bhav_info["prev_close"])
            day_chg_pct = round(((cur_close - prev_close) / prev_close) * 100.0, 2)
        else:
            prev_close = float(combined["stock_close"].iloc[-2]) if total_sessions > 1 else cur_close
            day_chg_pct = round(((cur_close - prev_close) / prev_close) * 100.0, 2) if prev_close > 0 else 0.0

        # Returns Calculation (20D, 60D, 120D, 252D)
        # Formula: Stock Return = ((Close / Close_t_minus_n) - 1) * 100
        # Formula: Nifty Return = ((Nifty_Close / Nifty_Close_t_minus_n) - 1) * 100
        # Formula: Excess Return (RS) = Stock Return - Nifty Return
        periods = [20, 60, 120, 252]
        ret_data: Dict[str, Any] = {}

        for p in periods:
            if total_sessions > p:
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

        # Trend Confirmation Filters: 50 EMA & 200 EMA
        ema_50 = float(combined["stock_close"].ewm(span=50, adjust=False).mean().iloc[-1])
        ema_200 = float(combined["stock_close"].ewm(span=200, adjust=False).mean().iloc[-1]) if total_sessions >= 100 else None

        dist_ema50_pct = round(((cur_close - ema_50) / ema_50) * 100.0, 2) if ema_50 > 0 else 0.0
        above_ema50 = bool(cur_close >= ema_50)

        if ema_200 is not None and ema_200 > 0:
            dist_ema200_pct = round(((cur_close - ema_200) / ema_200) * 100.0, 2)
            above_ema200 = bool(cur_close >= ema_200)
        else:
            dist_ema200_pct = None
            above_ema200 = None

        # 20-Day Average Volume and Volume Ratio
        vol_20d_series = combined["stock_vol"].iloc[-20:]
        vol_20d_avg = float(vol_20d_series.mean()) if len(vol_20d_series) > 0 else cur_vol
        vol_ratio = round(cur_vol / vol_20d_avg, 2) if vol_20d_avg > 0 else 1.0
        vol_confirmed = bool(vol_ratio >= 1.25)

        # RS Line Calculation: (Stock Close / Nifty Close) * 100
        rs_line = (combined["stock_close"] / combined["bench_close"]) * 100.0
        cur_rs_line = float(rs_line.iloc[-1])

        # RS Line 10-Day Slope / Trend
        if len(rs_line) >= 10:
            slope_10d = (rs_line.iloc[-1] - rs_line.iloc[-10]) / 10.0
            rs_line_trend = "Rising" if slope_10d > 0 else "Falling"
        else:
            rs_line_trend = "Rising" if len(rs_line) > 1 and rs_line.iloc[-1] >= rs_line.iloc[0] else "Consolidating"

        # 52W RS Line High / Low Check
        lookback_rs = min(len(rs_line), 250)
        max_rs_52w = float(rs_line.iloc[-lookback_rs:].max())
        min_rs_52w = float(rs_line.iloc[-lookback_rs:].min())

        is_rs_52w_high = bool(cur_rs_line >= max_rs_52w * 0.998)
        is_rs_52w_low = bool(cur_rs_line <= min_rs_52w * 1.002)

        if is_rs_52w_high:
            rs_line_status = "New 52W High 🚀"
        elif cur_rs_line >= max_rs_52w * 0.97:
            rs_line_status = "Near 52W High"
        elif is_rs_52w_low:
            rs_line_status = "New 52W Low"
        elif rs_line_trend == "Rising":
            rs_line_status = "Uptrend"
        else:
            rs_line_status = "Downtrend"

        # Last 60 sessions normalized RS line history for sparkline
        spark_len = min(60, len(rs_line))
        spark_series = rs_line.iloc[-spark_len:].values
        spark_min = float(np.min(spark_series))
        spark_max = float(np.max(spark_series))
        spark_range = spark_max - spark_min if spark_max > spark_min else 1.0
        # Normalize to 0-100 range for clean SVG rendering
        sparkline_normalized = [round(float((v - spark_min) / spark_range * 100.0), 1) for v in spark_series]

        # Metadata tags
        tags = []
        if above_ema50:
            tags.append("Above 50 EMA")
        if above_ema200 is True:
            tags.append("Above 200 EMA")
        if vol_confirmed:
            tags.append(f"Vol Surge ({vol_ratio}x)")
        if rs_line_trend == "Rising":
            tags.append("RS Line Rising")
        if is_rs_52w_high:
            tags.append("52W RS High")

        return {
            "symbol": symbol_meta.get("symbol", ""),
            "name": symbol_meta.get("name", symbol_meta.get("symbol", "")),
            "sector": symbol_meta.get("sector", "NSE"),
            "cmp": round(cur_close, 2),
            "change_pct": day_chg_pct,
            "total_sessions": total_sessions,
            # Return metrics
            "ret_20d_stock": ret_data["stock_ret_20d"],
            "ret_20d_nifty": ret_data["bench_ret_20d"],
            "rs_20d": ret_data["rs_20d"],
            "ret_60d_stock": ret_data["stock_ret_60d"],
            "ret_60d_nifty": ret_data["bench_ret_60d"],
            "rs_60d": ret_data["rs_60d"],
            "ret_120d_stock": ret_data["stock_ret_120d"],
            "ret_120d_nifty": ret_data["bench_ret_120d"],
            "rs_120d": ret_data["rs_120d"],
            "ret_252d_stock": ret_data["stock_ret_252d"],
            "ret_252d_nifty": ret_data["bench_ret_252d"],
            "rs_252d": ret_data["rs_252d"],
            # EMA & Technicals
            "ema_50": round(ema_50, 2),
            "dist_ema50_pct": dist_ema50_pct,
            "above_ema50": above_ema50,
            "ema_200": round(ema_200, 2) if ema_200 is not None else None,
            "dist_ema200_pct": dist_ema200_pct,
            "above_ema200": above_ema200,
            "vol_20d_avg": round(vol_20d_avg, 0),
            "vol_ratio": vol_ratio,
            "vol_confirmed": vol_confirmed,
            "rs_line_trend": rs_line_trend,
            "rs_line_status": rs_line_status,
            "rs_line_sparkline": sparkline_normalized,
            "confirmation_tags": tags
        }
    except Exception as e:
        logger.debug(f"Error computing RS for {symbol_meta.get('symbol')}: {e}")
        return None


def calculate_cross_sectional_scores(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Computes cross-sectional percentile rankings and composite RS score (0-100).
    Applies the weights:
      - Full weights: 20D = 25%, 60D = 35%, 120D = 25%, 252D = 15%.
      - Redistributed weights when 252D missing: 20D = 29.4%, 60D = 41.2%, 120D = 29.4%.
    """
    if not records:
        return []

    n = len(records)

    # 1. Percentile Rank for each period
    periods = [20, 60, 120, 252]
    for p in periods:
        valid_items = [r for r in records if r.get(f"rs_{p}d") is not None]
        if not valid_items:
            for r in records:
                r[f"pct_rank_{p}d"] = None
            continue

        # Sort ascending to determine rank
        valid_items.sort(key=lambda x: x[f"rs_{p}d"])
        total_valid = len(valid_items)
        for rank_idx, item in enumerate(valid_items):
            # Percentile: (count of stocks with RS <= current stock) / total * 100
            pct = round(((rank_idx + 1) / total_valid) * 100.0, 1)
            item[f"pct_rank_{p}d"] = pct

        for r in records:
            if r.get(f"rs_{p}d") is None:
                r[f"pct_rank_{p}d"] = None

    # 2. Weighted Composite RS Score (0 - 100)
    for r in records:
        has_252 = r.get("pct_rank_252d") is not None
        p20 = r.get("pct_rank_20d") or 50.0
        p60 = r.get("pct_rank_60d") or 50.0
        p120 = r.get("pct_rank_120d") or 50.0

        if has_252:
            p252 = r["pct_rank_252d"]
            composite = (0.25 * p20) + (0.35 * p60) + (0.25 * p120) + (0.15 * p252)
        else:
            # Proportional redistribution: 25/85 = 29.4%, 35/85 = 41.2%, 25/85 = 29.4%
            composite = (0.294117 * p20) + (0.411765 * p60) + (0.294117 * p120)

        rs_score = int(round(composite))
        rs_score = max(1, min(99, rs_score))
        r["rs_score"] = rs_score

        # Classification (0 - 100)
        # 90–100: Exceptional Strength
        # 80–89: Strong Outperformer
        # 70–79: Moderate Strength
        # 50–69: Average
        # 30–49: Weak
        # Below 30: Very Weak
        if rs_score >= 90:
            r["classification"] = "Exceptional Strength"
        elif rs_score >= 80:
            r["classification"] = "Strong Outperformer"
        elif rs_score >= 70:
            r["classification"] = "Moderate Strength"
        elif rs_score >= 50:
            r["classification"] = "Average"
        elif rs_score >= 30:
            r["classification"] = "Weak"
        else:
            r["classification"] = "Very Weak"

        # Technical Grading:
        # Grade A: RS Score >= 80, positive 20D and 60D RS, and Close > 50 EMA.
        # Grade B: RS Score >= 70 with improving short-term RS (20D RS > 0).
        # Weak: Negative RS or deteriorating trend below 50 EMA.
        rs20 = r.get("rs_20d") or 0.0
        rs60 = r.get("rs_60d") or 0.0
        is_above_50 = r.get("above_ema50", False)

        if rs_score >= 80 and rs20 > 0 and rs60 > 0 and is_above_50:
            r["grade"] = "Grade A"
            r["grade_badge"] = "A+"
        elif rs_score >= 70 and rs20 > 0:
            r["grade"] = "Grade B"
            r["grade_badge"] = "B+"
        elif rs_score < 40 or not is_above_50 or (rs20 < 0 and rs60 < 0):
            r["grade"] = "Weak"
            r["grade_badge"] = "D"
        else:
            r["grade"] = "Neutral"
            r["grade_badge"] = "C"

    # Sort descending by RS Score
    records.sort(key=lambda x: (x["rs_score"], x.get("rs_60d") or -999), reverse=True)

    # Assign Rank 1 to N
    for idx, r in enumerate(records):
        r["rank"] = idx + 1

    return records


def generate_adv_scanner_rs(
    symbols: Optional[List[Dict[str, Any]]] = None,
    stock_dfs: Optional[Dict[str, pd.DataFrame]] = None,
    bhav_date: Optional[date] = None,
    bhav_map: Optional[Dict[str, Dict[str, Any]]] = None,
    delivery_analytics_map: Optional[Dict[str, Dict[str, Any]]] = None,
    n_df: Optional[pd.DataFrame] = None
) -> Dict[str, Any]:
    """
    Main generator for the Advanced Relative Strength Scanner.
    Can be called directly from run_pipeline.py with pre-fetched in-memory DataFrames,
    or invoked standalone (loads from cache/market_ohlcv.parquet & cache/benchmark.parquet).
    """
    t_start = time.time()
    logger.info("Initializing Advanced Stock Scanner 1: Relative Strength (RS)...")

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

    if bench_df is None or bench_df.empty:
        logger.error("No benchmark data available for RS calculation.")
        return {}

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
        res = compute_rs_metrics(item, df, bench_df, bhav_info)
        if res:
            records.append(res)

    # 5. Cross-sectional ranking & composite score
    ranked_records = calculate_cross_sectional_scores(records)

    # 6. Generate payload
    scan_dt = bhav_date.strftime("%Y-%m-%d") if bhav_date else datetime.now().strftime("%Y-%m-%d")
    strong_rs_count = sum(1 for r in ranked_records if r.get("rs_score", 0) >= 80)
    grade_a_count = sum(1 for r in ranked_records if r.get("grade") == "Grade A")

    payload = {
        "scan_date": scan_dt,
        "generated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S IST"),
        "total_stocks": len(ranked_records),
        "strong_rs_count": strong_rs_count,
        "grade_a_count": grade_a_count,
        "benchmark": "NIFTY 50",
        "stocks": ranked_records
    }

    # Save to data/adv_scanner_1_rs.json
    with open(ADV_SCANNER_RS_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    elapsed = time.time() - t_start
    logger.info(
        f"Generated {ADV_SCANNER_RS_OUTPUT} in {elapsed:.2f}s! "
        f"Total: {len(ranked_records)} stocks | RS >= 80: {strong_rs_count} stocks | Grade A: {grade_a_count} stocks"
    )
    return payload


if __name__ == "__main__":
    t0 = time.time()
    payload = generate_adv_scanner_rs()
    elapsed = time.time() - t0
    strong_cnt = payload.get("strong_rs_count", 0)
    print("\n" + "=" * 70)
    print("MITS ADVANCED STOCK SCANNER 1: RELATIVE STRENGTH (RS) COMPLETE")
    print(f"Time Taken: {elapsed:.2f}s")
    print(f"Total Scanned: {payload.get('total_stocks', 0)} Stocks")
    print(f"Stocks with RS Score >= 80: {strong_cnt}")
    print(f"Grade A Outperformers: {payload.get('grade_a_count', 0)}")
    print(f"Payload Output: {ADV_SCANNER_RS_OUTPUT}")
    print("=" * 70 + "\n")
