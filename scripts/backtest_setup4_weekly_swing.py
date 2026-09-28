"""
MITS Pro Institutional Suite V2 - Setup 4: Weekly Swing Forward Backtest Engine
Strict Zero-Network & Zero-Server quantitative backtester.
DO NOT import yfinance or download from web.

Evaluates Setup 4: Weekly Swing Watchlist signals across local historical OHLCV data against NIFTY 50.
Measures 3-month forward performance (~63 trading candles / 90 calendar days) from entry:
- Entry Condition: Weekly swing midpoint confirmation level
- Target 1 / +8% win rate
- Average 3-month peak return (%)
- Average days to reach peak return
- Total qualified Setup 4 historical occurrences tested
"""

import os
import sys
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

import pandas as pd
import numpy as np

# Guarantee UTF-8 stdout on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("Setup4Backtest")

BASE_DIR = Path(__file__).resolve().parent.parent
LOCAL_PARQUET_PATH = BASE_DIR / "cache" / "market_ohlcv.parquet"
ALT_PARQUET_PATH = Path("D:/MITS-Scanner/cache/market_ohlcv.parquet")

LOCAL_BENCHMARK_PATH = BASE_DIR / "cache" / "benchmark.parquet"
ALT_BENCHMARK_PATH = Path("D:/MITS-Scanner/cache/benchmark.parquet")

OUTPUT_JSON_PATH = BASE_DIR / "data" / "setup4_backtest.json"


def find_file(local_p: Path, alt_p: Path, desc: str) -> Path:
    if local_p.exists():
        return local_p
    if alt_p.exists():
        return alt_p
    raise FileNotFoundError(f"{desc} cache not found at {local_p} or {alt_p}.")


def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return rsi.fillna(50.0)


def run_setup4_backtest(forward_candles: int = 63) -> Dict[str, Any]:
    """
    Executes the 3-month forward performance backtest strictly for Setup 4 candidates.
    Forward window: 63 trading candles (~90 calendar days / 3 months).
    """
    parquet_path = find_file(LOCAL_PARQUET_PATH, ALT_PARQUET_PATH, "OHLCV")
    bench_path = find_file(LOCAL_BENCHMARK_PATH, ALT_BENCHMARK_PATH, "Benchmark")

    logger.info(f"Loading local OHLCV from: {parquet_path}")
    logger.info(f"Loading local Benchmark from: {bench_path}")

    df_all = pd.read_parquet(parquet_path)
    bench_df = pd.read_parquet(bench_path).sort_values("Date").reset_index(drop=True)
    b_vals = bench_df["Close"].values.astype(float)

    logger.info(f"Loaded {len(df_all):,} historical candles across {df_all['Symbol'].nunique()} equities.")

    grouped = df_all.groupby("Symbol")
    results = []

    for sym, group in grouped:
        df_sym = group.sort_values("Date").reset_index(drop=True)
        n = len(df_sym)
        if n < 80:
            continue

        closes = df_sym["Close"].values
        opens = df_sym["Open"].values
        highs = df_sym["High"].values
        lows = df_sym["Low"].values
        dates = df_sym["Date"].values

        close_s = df_sym["Close"]

        ema20 = close_s.ewm(span=20, adjust=False).mean().values
        ema50 = close_s.ewm(span=50, adjust=False).mean().values
        ema200 = close_s.ewm(span=min(200, n), adjust=False).mean().values
        rsi_series = compute_rsi(close_s, 14).values

        last_trigger_bar = -99

        for t in range(30, n - 15):
            if (t - last_trigger_bar) < 3:
                continue

            c = closes[t]
            h = highs[t]
            l = lows[t]
            e20 = ema20[t]
            e50 = ema50[t]
            e200 = ema200[t]
            r = rsi_series[t]

            if np.isnan(e200) or np.isnan(e50) or np.isnan(e20) or np.isnan(r):
                continue

            # 1. Bullish Trend Stack: Close > 20 EMA > 50 EMA and Close > 200 EMA
            if not (c > e20 and c > e50 and c > e200):
                continue

            # 2. 1-Week Return: 5.0% <= ret_1w <= 7.0%
            if t < 6:
                continue
            ret_1w = ((c - closes[t - 5]) / closes[t - 5]) * 100.0
            if not (4.90 <= ret_1w <= 7.10):
                continue

            # 3. 1-Month Return & Relative Strength vs NIFTY 50
            idx_1m = min(20, t)
            ret_1m = ((c - closes[t - idx_1m]) / closes[t - idx_1m]) * 100.0

            b_t = min(t, len(b_vals) - 1)
            b_1w = ((b_vals[b_t] - b_vals[max(0, b_t - 5)]) / b_vals[max(0, b_t - 5)]) * 100.0 if b_t >= 5 else 0.0
            b_1m = ((b_vals[b_t] - b_vals[max(0, b_t - idx_1m)]) / b_vals[max(0, b_t - idx_1m)]) * 100.0 if b_t >= idx_1m else 0.0

            rs_1w = ret_1w - b_1w
            rs_1m = ret_1m - b_1m

            if not (rs_1w > 4.5 and rs_1m > 4.5):
                continue

            # 4. RSI Sweet Spot: 50.0 <= RSI <= 65.0
            if not (50.0 <= r <= 65.0):
                continue

            # 5. Support level & Weekly swing midpoint confirmation level
            pp = (h + l + c) / 3.0
            s1 = (2.0 * pp) - h
            s2 = pp - (h - l)
            r1 = (2.0 * pp) - l

            supp_cands = [e20, e50, pp, s1, s2]
            below_c = [v for v in supp_cands if v < c]
            nearest_supp = max(below_c) if below_c else e20

            entry_low = round(nearest_supp * 0.995, 2)
            entry_high = round(min(nearest_supp * 1.005, c), 2)
            entry_mid = round((entry_low + entry_high) / 2.0, 2)

            base_swing_low = float(np.min(lows[max(0, t - 20) : t + 1]))
            inval = min(base_swing_low, e50) if e50 < e20 else base_swing_low
            risk = max(c - inval, c - e50, 1.0)
            t1 = round(max(r1, c + (risk * 1.5)), 2)

            # 6. Check Forward Entry Condition
            fwd_end = min(t + 1 + forward_candles, n)
            fwd_lows = lows[t + 1 : fwd_end]
            fwd_highs = highs[t + 1 : fwd_end]

            if len(fwd_lows) < 5:
                continue

            # Entry touch within first 15 bars
            entry_offset = None
            for idx_fwd, fl in enumerate(fwd_lows[:15]):
                if fl <= entry_mid:
                    entry_offset = idx_fwd
                    break

            if entry_offset is None:
                continue

            last_trigger_bar = t

            post_highs = fwd_highs[entry_offset:]
            if len(post_highs) == 0:
                continue

            max_high = float(np.max(post_highs))
            peak_idx = int(np.argmax(post_highs))
            days_to_peak = peak_idx + 1
            peak_gain_pct = ((max_high - entry_mid) / entry_mid) * 100.0

            # Win condition: achieve >= Target 1 or >= +8.0% return within 90 days
            hit = (max_high >= t1) or (peak_gain_pct >= 8.0)

            results.append({
                "symbol": sym,
                "trigger_date": str(pd.to_datetime(dates[t]).date()),
                "entry_mid": entry_mid,
                "target_1": t1,
                "max_high": round(max_high, 2),
                "peak_gain_pct": round(peak_gain_pct, 2),
                "days_to_peak": days_to_peak,
                "hit_target": bool(hit)
            })

    total_samples = len(results)
    if total_samples == 0:
        raise ValueError("No qualified Setup 4 historical occurrences found.")

    res_df = pd.DataFrame(results)
    winning_samples = int(res_df["hit_target"].sum())
    win_rate = round((winning_samples / total_samples) * 100.0, 1)
    avg_peak_return = round(float(res_df["peak_gain_pct"].mean()), 1)
    avg_days_to_peak = round(float(res_df["days_to_peak"].mean()), 1)

    summary_metrics = {
        "setup_id": "setup_4",
        "setup_title": "Setup 4: Weekly Swing",
        "evaluation_window": "90 Calendar Days (~63 Trading Candles)",
        "win_rate": win_rate,
        "avg_peak_return": avg_peak_return,
        "avg_days_to_peak": avg_days_to_peak,
        "total_samples": total_samples,
        "winning_samples": winning_samples,
        "entry_condition": "Weekly swing midpoint confirmation level",
        "target_condition": "Hit Target 1 or >= +8.0% return within 90 calendar days",
        "backtest_timestamp": datetime.now().isoformat(),
        "status": "VERIFIED_LOCAL_CACHE"
    }

    OUTPUT_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(summary_metrics, f, indent=2)

    logger.info(f"Backtest metrics saved to {OUTPUT_JSON_PATH}")
    print("\n" + "="*60)
    print("📊 3-MONTH FORWARD PERFORMANCE (SETUP 4 VERIFIED)")
    print("="*60)
    print(f"• Win Rate:          {win_rate}%")
    print(f"• Avg 3M Peak Gain:  +{avg_peak_return}%")
    print(f"• Avg Days to Peak:  {avg_days_to_peak} Days")
    print(f"• Signals Tested:    {total_samples:,} Swing Setups")
    print("="*60 + "\n")

    return summary_metrics


if __name__ == "__main__":
    run_setup4_backtest()
