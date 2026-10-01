"""
MITS Pro Institutional Suite V2 - Master Universe EOD Exporter
Generates data/master_universe_eod.json (~100KB flat snapshot) for the 501 NSE liquid universe.
Calculates Breakout/Retest, RSI(14), 52W Proximity, Volatility/VCP, Candle Footprint,
EMA Pullback, Liquidity/Turnover, and Smart Money/RS metrics for instant client-side querying.
Zero-regression guarantee: Standalone exporter, does not modify any existing setup files.
"""

import os
import sys
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np
import pytz

BASE_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = BASE_DIR / "scripts"
DATA_DIR = BASE_DIR / "data"
CACHE_DIR = BASE_DIR / "cache"

if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from config import TIMEZONE, SYMBOLS_FILE
from smart_money_radar import fetch_nse_bhavcopy_series

logger = logging.getLogger("MasterUniverseExporter")

MASTER_UNIVERSE_EOD_FILE = DATA_DIR / "master_universe_eod.json"


def compute_rsi_wilder(series: pd.Series, period: int = 14) -> float:
    """Computes standard Wilder's RSI(14) for the latest bar."""
    if len(series) < period + 1:
        return 50.0
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi_series = 100.0 - (100.0 / (1.0 + rs))
    last_val = rsi_series.iloc[-1]
    return round(float(last_val), 2) if not pd.isna(last_val) else 50.0


def check_breakout_and_retest(
    high: pd.Series, low: pd.Series, close: pd.Series, lookback: int
) -> Tuple[bool, bool, bool, bool]:
    """
    Evaluates:
      1. Breakout: today's Close > max(High of previous N days).
      2. Breakdown: today's Close < min(Low of previous N days).
      3. Retest Support: Breakout occurred within last 3 days (t-1, t-2, t-3) and today's Low touches & holds the breakout level.
      4. Retest Resistance: Breakdown occurred within last 3 days (t-1, t-2, t-3) and today's High touches & rejects the breakdown level.
    """
    total_len = len(close)
    if total_len < lookback + 4:
        return False, False, False, False

    cur_c = close.iloc[-1]
    cur_h = high.iloc[-1]
    cur_l = low.iloc[-1]

    # 1. Today's Breakout / Breakdown against previous `lookback` bars
    prev_high = high.iloc[-lookback - 1 : -1].max()
    prev_low = low.iloc[-lookback - 1 : -1].min()

    is_breakout = bool(cur_c > prev_high)
    is_breakdown = bool(cur_c < prev_low)

    # 2. Retest Support / Resistance within last 3 days (t-1, t-2, t-3)
    is_retest_support = False
    is_retest_resistance = False

    for k in [1, 2, 3]:
        # Day index t-k
        day_k_idx = -1 - k
        day_k_close = close.iloc[day_k_idx]

        # Prior lookback window before day t-k
        prior_h_k = high.iloc[-lookback - 1 - k : day_k_idx].max()
        prior_l_k = low.iloc[-lookback - 1 - k : day_k_idx].min()

        # Did day t-k break out?
        if day_k_close > prior_h_k:
            # Retest support condition: today's low tests near prior_h_k and close holds above or at level
            if cur_l <= prior_h_k * 1.015 and cur_c >= prior_h_k * 0.995:
                is_retest_support = True

        # Did day t-k break down?
        if day_k_close < prior_l_k:
            # Retest resistance condition: today's high tests near prior_l_k and close rejects below level
            if cur_h >= prior_l_k * 0.985 and cur_c <= prior_l_k * 1.005:
                is_retest_resistance = True

    return is_breakout, is_breakdown, is_retest_support, is_retest_resistance


def compute_stock_metrics(
    item: Dict[str, Any],
    df: pd.DataFrame,
    bench_close: Optional[pd.Series],
    deliv_info: Optional[Dict[str, Any]],
    bhav_info: Optional[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """Calculates all quantitative attributes for a single stock."""
    if df is None or len(df) < 20:
        return None

    try:
        # Standardize columns
        close = df["Close"].astype(float)
        high = df["High"].astype(float)
        low = df["Low"].astype(float)
        open_p = df["Open"].astype(float)
        volume = df["Volume"].astype(float)

        cur_close = float(close.iloc[-1])
        cur_high = float(high.iloc[-1])
        cur_low = float(low.iloc[-1])
        cur_open = float(open_p.iloc[-1])
        cur_vol = float(volume.iloc[-1])

        # Ensure CMP is strictly equal to official Bhavcopy CLOSE_PRICE if available
        if bhav_info and bhav_info.get("close", 0) > 0:
            cur_close = float(bhav_info["close"])
            cur_open = float(bhav_info.get("open", cur_close))
            cur_high = float(bhav_info.get("high", cur_close))
            cur_low = float(bhav_info.get("low", cur_close))
            cur_vol = float(bhav_info.get("volume", cur_vol))

        # Use strictly the official single-day formula:
        # change_pct = round(((row['CLOSE_PRICE'] - row['PREV_CLOSE']) / row['PREV_CLOSE']) * 100, 2)
        if bhav_info and bhav_info.get("prev_close", 0) > 0:
            prev_close = float(bhav_info["prev_close"])
            change_pct = round(((cur_close - prev_close) / prev_close) * 100.0, 2)
        else:
            prev_close = float(close.iloc[-2]) if len(close) > 1 else cur_close
            change_pct = round(((cur_close - prev_close) / prev_close) * 100.0, 2) if prev_close > 0 else 0.0

        # ---------------------------------------------------------
        # 1. Breakout & Retest Engine (10D, 20D, 50D, 52W)
        # ---------------------------------------------------------
        lookback_52w = min(len(close) - 5, 250)
        bo_10, bd_10, rs_10, rr_10 = check_breakout_and_retest(high, low, close, 10)
        bo_20, bd_20, rs_20, rr_20 = check_breakout_and_retest(high, low, close, 20)
        bo_50, bd_50, rs_50, rr_50 = check_breakout_and_retest(high, low, close, min(len(close) - 5, 50))
        bo_52w, bd_52w, rs_52w, rr_52w = check_breakout_and_retest(high, low, close, lookback_52w)

        # Breakout status display label
        if bo_52w:
            breakout_status = "52W High Breakout"
        elif bo_50:
            breakout_status = "50D Breakout"
        elif bo_20:
            breakout_status = "20D Breakout"
        elif bo_10:
            breakout_status = "10D Breakout"
        elif rs_52w:
            breakout_status = "Retest 52W Support"
        elif rs_50:
            breakout_status = "Retest 50D Support"
        elif rs_20:
            breakout_status = "Retest 20D Support"
        elif bd_52w:
            breakout_status = "52W Low Breakdown"
        elif bd_50:
            breakout_status = "50D Breakdown"
        elif bd_20:
            breakout_status = "20D Breakdown"
        elif rr_20 or rr_50:
            breakout_status = "Retest Resistance"
        else:
            breakout_status = "Consolidating"

        # ---------------------------------------------------------
        # 2. Simplified RSI Engine (14)
        # ---------------------------------------------------------
        rsi_14 = compute_rsi_wilder(close, 14)

        # ---------------------------------------------------------
        # 3. 52-Week High / Low Proximity
        # ---------------------------------------------------------
        slice_52w = df.iloc[-lookback_52w:]
        high_52w = float(slice_52w["High"].max())
        low_52w = float(slice_52w["Low"].min())
        dist_52w_high_pct = round(((high_52w - cur_close) / high_52w) * 100.0, 2) if high_52w > 0 else 0.0
        is_new_52w_high = bool(cur_close >= high_52w or dist_52w_high_pct <= 0.0)
        dist_52w_low_pct = round(((cur_close - low_52w) / low_52w) * 100.0, 2) if low_52w > 0 else 0.0

        # ---------------------------------------------------------
        # 4. Volatility & VCP Engine
        # ---------------------------------------------------------
        # Bollinger Bands (20, 2)
        bb_mid = close.rolling(20).mean()
        bb_std = close.rolling(20).std()
        bandwidth_series = (4.0 * bb_std / bb_mid).dropna()

        bb_bw = float(bandwidth_series.iloc[-1]) if len(bandwidth_series) > 0 else 0.05
        # Percentile 10 of bandwidth over last 120 bars
        recent_bw = bandwidth_series.iloc[-120:] if len(bandwidth_series) >= 60 else bandwidth_series
        bw_p10 = float(recent_bw.quantile(0.10)) if len(recent_bw) > 0 else 0.0
        bb_squeeze = bool(bb_bw <= bw_p10)

        # NR7 / NR4
        candle_ranges = high - low
        range_today = float(candle_ranges.iloc[-1])
        min_range_7 = float(candle_ranges.iloc[-7:].min()) if len(candle_ranges) >= 7 else range_today
        min_range_4 = float(candle_ranges.iloc[-4:].min()) if len(candle_ranges) >= 4 else range_today
        is_nr7 = bool(range_today <= min_range_7 + 1e-5)
        is_nr4 = bool(range_today <= min_range_4 + 1e-5)

        # ATR Contraction: ATR(10) / ATR(30) < 0.75
        tr1 = high - low
        tr2 = (high - close.shift(1)).abs()
        tr3 = (low - close.shift(1)).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr_10 = float(tr.rolling(10).mean().iloc[-1]) if len(tr) >= 10 else range_today
        atr_30 = float(tr.rolling(30).mean().iloc[-1]) if len(tr) >= 30 else atr_10
        atr_ratio = round(atr_10 / atr_30, 2) if atr_30 > 0 else 1.0
        atr_contraction = bool(atr_ratio < 0.75)

        # ---------------------------------------------------------
        # 5. Candle Footprint & Intraday Dominance
        # ---------------------------------------------------------
        full_range = cur_high - cur_low
        # Open = Low (Bullish Marubozu)
        open_equals_low = bool(full_range > 0 and (cur_open - cur_low) <= (full_range * 0.03) and cur_close > cur_open)

        # Close Location Value (CLV): (Close - Low) / (High - Low)
        clv = round(float((cur_close - cur_low) / full_range), 2) if full_range > 0 else 0.50
        clv_high = bool(clv >= 0.90)

        # Liquidity Sweep / Hammer: Lower Wick >= 2 * Body with CLV > 0.65
        body = abs(cur_close - cur_open)
        lower_wick = min(cur_open, cur_close) - cur_low
        hammer_liquidity_sweep = bool(
            full_range > 0 and lower_wick >= (2.0 * max(body, 0.05 * full_range)) and clv >= 0.65
        )

        if open_equals_low:
            candle_pattern = "Bullish Marubozu"
        elif clv_high:
            candle_pattern = f"Inst. Close ({int(clv * 100)}%)"
        elif hammer_liquidity_sweep:
            candle_pattern = "Hammer Sweep"
        elif clv <= 0.10:
            candle_pattern = "Rejection Close"
        else:
            candle_pattern = "Neutral"

        # ---------------------------------------------------------
        # 6. Dynamic Moving Average Pullback
        # ---------------------------------------------------------
        ema_20 = float(close.ewm(span=20, adjust=False).mean().iloc[-1])
        ema_50 = float(close.ewm(span=50, adjust=False).mean().iloc[-1])
        ema_200 = float(close.ewm(span=200, adjust=False).mean().iloc[-1]) if len(close) >= 100 else ema_50

        dist_ema20_pct = round(((cur_close - ema_20) / ema_20) * 100.0, 2)
        dist_ema50_pct = round(((cur_close - ema_50) / ema_50) * 100.0, 2)
        dist_ema200_pct = round(((cur_close - ema_200) / ema_200) * 100.0, 2)

        near_ema20 = bool(abs(dist_ema20_pct) <= 1.5)
        near_ema20_2 = bool(abs(dist_ema20_pct) <= 2.0)
        ema20_bounce = bool(cur_low <= ema_20 and cur_close > ema_20 and cur_close >= cur_open)
        trend_stack = bool(cur_close > ema_20 and ema_20 > ema_50 and ema_50 > ema_200)

        # ---------------------------------------------------------
        # 7. Liquidity & Flow Dynamics
        # ---------------------------------------------------------
        turnover_cr = round(float((cur_vol * cur_close) / 1e7), 2)
        deliv_qty = 0.0
        deliv_pct = 0.0
        deliv_spike = 0.0

        if deliv_info:
            deliv_qty = float(deliv_info.get("delivery_qty", 0.0))
            deliv_pct = float(deliv_info.get("delivery_pct", 0.0))
            deliv_spike = float(deliv_info.get("delivery_spike_pct", 0.0))
        elif bhav_info:
            deliv_qty = float(bhav_info.get("deliv_qty", 0.0))
            deliv_pct = float(bhav_info.get("deliv_per", 0.0))

        if deliv_qty > 0:
            deliv_turnover_cr = round(float((deliv_qty * cur_close) / 1e7), 2)
        else:
            deliv_turnover_cr = round(turnover_cr * (deliv_pct / 100.0), 2)

        gap_pct = round(((cur_open - prev_close) / prev_close) * 100.0, 2) if prev_close > 0 else 0.0

        # ---------------------------------------------------------
        # 8. Relative Volume (RVOL)
        # ---------------------------------------------------------
        vol_sma20 = float(volume.rolling(20).mean().iloc[-2]) if len(volume) > 20 else float(volume.mean())
        rvol = round(float(cur_vol / max(vol_sma20, 1.0)), 2)

        # ---------------------------------------------------------
        # 9. Relative Strength vs NIFTY 50
        # ---------------------------------------------------------
        rs_1m, rs_3m, rs_1y, rs_raw = 0.0, 0.0, 0.0, 0.0
        if bench_close is not None and len(bench_close) >= 20:
            b_vals = bench_close.values
            b_cur = b_vals[-1]

            i_1m = min(len(close) - 1, len(b_vals) - 1, 21)
            i_3m = min(len(close) - 1, len(b_vals) - 1, 63)
            i_1y = min(len(close) - 1, len(b_vals) - 1, 240)

            ret_1m = ((cur_close - close.iloc[-i_1m]) / close.iloc[-i_1m]) * 100.0
            ret_3m = ((cur_close - close.iloc[-i_3m]) / close.iloc[-i_3m]) * 100.0
            ret_1y = ((cur_close - close.iloc[-i_1y]) / close.iloc[-i_1y]) * 100.0

            b_ret_1m = ((b_cur - b_vals[-i_1m]) / b_vals[-i_1m]) * 100.0
            b_ret_3m = ((b_cur - b_vals[-i_3m]) / b_vals[-i_3m]) * 100.0
            b_ret_1y = ((b_cur - b_vals[-i_1y]) / b_vals[-i_1y]) * 100.0

            rs_1m = round(ret_1m - b_ret_1m, 1)
            rs_3m = round(ret_3m - b_ret_3m, 1)
            rs_1y = round(ret_1y - b_ret_1y, 1)
            rs_raw = (0.4 * rs_1y) + (0.3 * rs_3m) + (0.3 * rs_1m)

        sym = item.get("symbol", "")
        return {
            "symbol": sym,
            "name": item.get("name", sym),
            "sector": item.get("sector", "Other"),
            "cmp": round(cur_close, 2),
            "change_pct": change_pct,
            "turnover_cr": turnover_cr,
            "deliv_turnover_cr": deliv_turnover_cr,
            "gap_pct": gap_pct,
            "delivery_pct": round(deliv_pct, 1),
            "delivery_spike_pct": round(deliv_spike, 1),
            "rvol": rvol,
            "rsi_14": rsi_14,
            "high_52w": round(high_52w, 2),
            "low_52w": round(low_52w, 2),
            "dist_52w_high_pct": dist_52w_high_pct,
            "is_new_52w_high": is_new_52w_high,
            "dist_52w_low_pct": dist_52w_low_pct,
            "bb_squeeze": bb_squeeze,
            "bb_bandwidth": round(bb_bw, 4),
            "is_nr7": is_nr7,
            "is_nr4": is_nr4,
            "atr_ratio": atr_ratio,
            "atr_contraction": atr_contraction,
            "open_equals_low": open_equals_low,
            "clv": clv,
            "clv_high": clv_high,
            "hammer_liquidity_sweep": hammer_liquidity_sweep,
            "candle_pattern": candle_pattern,
            "ema_20": round(ema_20, 2),
            "ema_50": round(ema_50, 2),
            "ema_200": round(ema_200, 2),
            "dist_ema20_pct": dist_ema20_pct,
            "dist_ema50_pct": dist_ema50_pct,
            "dist_ema200_pct": dist_ema200_pct,
            "near_ema20": near_ema20,
            "near_ema20_2": near_ema20_2,
            "ema20_bounce": ema20_bounce,
            "trend_stack": trend_stack,
            "breakout_10d": bo_10,
            "breakout_20d": bo_20,
            "breakout_50d": bo_50,
            "breakout_52w": bo_52w,
            "breakdown_10d": bd_10,
            "breakdown_20d": bd_20,
            "breakdown_50d": bd_50,
            "breakdown_52w": bd_52w,
            "retest_support_10d": rs_10,
            "retest_support_20d": rs_20,
            "retest_support_50d": rs_50,
            "retest_support_52w": rs_52w,
            "retest_resistance_10d": rr_10,
            "retest_resistance_20d": rr_20,
            "retest_resistance_50d": rr_50,
            "retest_resistance_52w": rr_52w,
            "breakout_status": breakout_status,
            "rs_1m": rs_1m,
            "rs_3m": rs_3m,
            "rs_1y": rs_1y,
            "rs_raw": rs_raw,
            "rs_score": 50,  # updated via rank percentile below
            "tv_url": f"https://www.tradingview.com/chart/?symbol=NSE%3A{sym}"
        }
    except Exception as e:
        logger.error(f"Error computing metrics for {item.get('symbol', 'UNKNOWN')}: {e}")
        return None


def generate_master_universe_eod(
    symbols: Optional[List[Dict[str, Any]]] = None,
    stock_dfs: Optional[Dict[str, pd.DataFrame]] = None,
    bhav_date: Optional[datetime.date] = None,
    bhav_map: Optional[Dict[str, Dict[str, Any]]] = None,
    delivery_analytics_map: Optional[Dict[str, Dict[str, Any]]] = None,
    n_df: Optional[pd.DataFrame] = None,
    output_path: Optional[Path] = None
) -> Dict[str, Any]:
    """
    Main exporter entry point. Can run inside pipeline or standalone.
    """
    tz = pytz.timezone(TIMEZONE)
    ist_now = datetime.now(tz)
    iso_timestamp = ist_now.isoformat()

    out_file = output_path or MASTER_UNIVERSE_EOD_FILE

    # 1. Load symbols if not provided
    if symbols is None:
        if SYMBOLS_FILE.exists():
            with open(SYMBOLS_FILE, "r", encoding="utf-8") as f:
                symbols = json.load(f).get("symbols", [])
        else:
            symbols = []

    # 2. Load stock dataframes if not provided
    if stock_dfs is None:
        stock_dfs = {}
        ohlcv_parquet = CACHE_DIR / "market_ohlcv.parquet"
        if ohlcv_parquet.exists():
            logger.info(f"Loading stock histories from {ohlcv_parquet}...")
            df_all = pd.read_parquet(ohlcv_parquet)
            for sym, grp in df_all.groupby("Symbol"):
                stock_dfs[sym] = grp.sort_values("Date").reset_index(drop=True)

    # 3. Load Bhavcopy & Delivery analytics if not provided
    if bhav_map is None or delivery_analytics_map is None:
        logger.info("Fetching Bhavcopy series & delivery analytics...")
        bhav_date, bhav_map, delivery_analytics_map = fetch_nse_bhavcopy_series(target_days=10, max_lookback_days=25)

    # 4. Load benchmark if not provided
    bench_close = None
    if n_df is not None and not n_df.empty:
        bench_close = n_df["Close"].dropna() if "Close" in n_df.columns else n_df.iloc[:, 0].dropna()
    else:
        bench_parquet = CACHE_DIR / "benchmark.parquet"
        if bench_parquet.exists():
            try:
                b_df = pd.read_parquet(bench_parquet)
                if "Close" in b_df.columns:
                    bench_close = b_df.sort_values("Date")["Close"].dropna()
            except Exception as e:
                logger.warning(f"Could not read benchmark parquet: {e}")

    # Synchronize latest candle if Bhavcopy is present
    synchronized_dfs: Dict[str, pd.DataFrame] = {}
    for item in symbols:
        sym = item["symbol"]
        df = stock_dfs.get(sym)
        if df is None or df.empty:
            continue
        df = df.copy()

        bhav_info = bhav_map.get(sym) if bhav_map else None
        if bhav_info and bhav_date is not None:
            # Check last date
            if "Date" in df.columns:
                last_dt = pd.to_datetime(df["Date"].iloc[-1]).date()
            else:
                last_dt = df.index[-1].date() if hasattr(df.index[-1], "date") else None

            if last_dt is not None:
                if last_dt < bhav_date:
                    from datetime import timedelta
                    prev_trade_date = bhav_date - timedelta(days=1)
                    while prev_trade_date.weekday() >= 5:
                        prev_trade_date -= timedelta(days=1)
                    if last_dt < prev_trade_date and bhav_info.get("prev_close", 0) > 0:
                        prev_row = {
                            "Open": bhav_info["prev_close"],
                            "High": bhav_info["prev_close"],
                            "Low": bhav_info["prev_close"],
                            "Close": bhav_info["prev_close"],
                            "Volume": 0.0,
                        }
                        if "Date" in df.columns:
                            prev_row["Date"] = pd.to_datetime(prev_trade_date)
                            prev_row["Symbol"] = sym
                            df = pd.concat([df, pd.DataFrame([prev_row])], ignore_index=True)
                        else:
                            df = pd.concat([df, pd.DataFrame([prev_row], index=[pd.to_datetime(prev_trade_date)])])

                    new_row = {
                        "Open": bhav_info["open"],
                        "High": bhav_info["high"],
                        "Low": bhav_info["low"],
                        "Close": bhav_info["close"],
                        "Volume": bhav_info["volume"],
                    }
                    if "Date" in df.columns:
                        new_row["Date"] = pd.to_datetime(bhav_date)
                        new_row["Symbol"] = sym
                        df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
                    else:
                        df = pd.concat([df, pd.DataFrame([new_row], index=[pd.to_datetime(bhav_date)])])
                elif last_dt == bhav_date:
                    idx = df.index[-1]
                    df.loc[idx, "Open"] = bhav_info["open"]
                    df.loc[idx, "High"] = bhav_info["high"]
                    df.loc[idx, "Low"] = bhav_info["low"]
                    df.loc[idx, "Close"] = bhav_info["close"]
                    df.loc[idx, "Volume"] = bhav_info["volume"]

        synchronized_dfs[sym] = df

    # 5. Evaluate all stocks
    results = []
    for item in symbols:
        sym = item["symbol"]
        df = synchronized_dfs.get(sym)
        if df is None or df.empty:
            continue

        deliv_info = delivery_analytics_map.get(sym) if delivery_analytics_map else None
        bhav_info = bhav_map.get(sym) if bhav_map else None

        record = compute_stock_metrics(item, df, bench_close, deliv_info, bhav_info)
        if record:
            results.append(record)

    # 6. Calculate Relative Strength Percentile Scores (1 to 99)
    if results:
        results.sort(key=lambda x: x["rs_raw"])
        total_rec = len(results)
        for rank, r in enumerate(results):
            # Percentile rank 1 to 99
            pct_score = int(round((rank / max(total_rec - 1, 1)) * 98.0)) + 1
            r["rs_score"] = pct_score
            del r["rs_raw"]  # remove raw temp calculation

        # Default sort by turnover descending
        results.sort(key=lambda x: x["turnover_cr"], reverse=True)

    trade_session_date = bhav_date.strftime("%Y-%m-%d") if bhav_date else ist_now.strftime("%Y-%m-%d")
    session_date_display = bhav_date.strftime("%d-%b-%Y") if bhav_date else ist_now.strftime("%d-%b-%Y")

    payload = {
        "updated_at": iso_timestamp,
        "trade_session_date": trade_session_date,
        "session_date_display": session_date_display,
        "universe_count": len(results),
        "stocks": results
    }

    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=None, separators=(",", ":"))

    # Also export as JS global to allow local file:// execution without browser CORS blocking
    js_file = out_file.with_suffix(".js")
    with open(js_file, "w", encoding="utf-8") as f:
        f.write("window.MITS_MASTER_UNIVERSE_DATA = " + json.dumps(payload, separators=(",", ":")) + ";\n")

    size_kb = out_file.stat().st_size / 1024
    logger.info(f"Successfully exported {len(results)} master universe stocks to {out_file} ({size_kb:.1f} KB) and {js_file.name}.")
    return payload


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    logger.info("Executing standalone master universe EOD generation...")
    res = generate_master_universe_eod()
    print(f"Generated master universe with {res.get('universe_count')} stocks.")
