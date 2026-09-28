"""
MITS Pro Institutional Suite V2 - Setup 2: Alpha Momentum Forward Backtest Engine
Strict Zero-Network & Zero-Server quantitative backtester.

Evaluates Setup 2: Alpha Momentum signals across local historical OHLCV data against NIFTY 50.
Measures 3-month forward performance (~63 trading candles / 90 calendar days) from entry:
- Entry Trigger: High-conviction momentum breakout entry (Midpoint of breakout candle or safe entry zone)
- Target 1 / +8% win rate
- Average 3-month peak return (%)
- Average days to reach peak return
- Total qualified Setup 2 occurrences tested
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
logger = logging.getLogger("Setup2Backtest")

BASE_DIR = Path(__file__).resolve().parent.parent
LOCAL_PARQUET_PATH = BASE_DIR / "cache" / "market_ohlcv.parquet"
ALT_PARQUET_PATH = Path("D:/MITS-Scanner/cache/market_ohlcv.parquet")

LOCAL_BENCHMARK_PATH = BASE_DIR / "cache" / "benchmark.parquet"
ALT_BENCHMARK_PATH = Path("D:/MITS-Scanner/cache/benchmark.parquet")

OUTPUT_JSON_PATH = BASE_DIR / "data" / "setup2_backtest.json"


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


def run_setup2_backtest(forward_candles: int = 63) -> Dict[str, Any]:
    """
    Executes the 3-month forward performance backtest strictly for Setup 2 candidates.
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
        if n < 100:
            continue

        closes = df_sym["Close"].values
        opens = df_sym["Open"].values
        highs = df_sym["High"].values
        lows = df_sym["Low"].values
        vols = df_sym["Volume"].values
        dates = df_sym["Date"].values

        close_s = df_sym["Close"]
        vol_s = df_sym["Volume"]

        ema20 = close_s.ewm(span=20, adjust=False).mean().values
        ema50 = close_s.ewm(span=50, adjust=False).mean().values
        sma200 = close_s.rolling(window=min(200, n), min_periods=50).mean().values
        rsi_series = compute_rsi(close_s, 14).values

        last_trigger_bar = -99

        for t in range(65, n - 15):
            if (t - last_trigger_bar) < 3:
                continue

            c = closes[t]
            o = opens[t]
            l = lows[t]
            v = vols[t]

            e20 = ema20[t]
            e50 = ema50[t]
            s200 = sma200[t]
            r = rsi_series[t]

            if np.isnan(s200) or np.isnan(e50) or np.isnan(e20) or np.isnan(r):
                continue

            # 1. Trend Alignment: Close > 50 EMA and Close > 200 SMA
            if not (c > e50 and c > s200):
                continue

            # 2. Multi-Timeframe Relative Strength vs Benchmark
            idx_1y = min(t, len(b_vals) - 1, 240)
            idx_6m = min(t, len(b_vals) - 1, 120)
            idx_3m = min(t, len(b_vals) - 1, 60)
            idx_1m = min(t, len(b_vals) - 1, 21)

            if idx_1m < 15 or idx_3m < 30:
                continue

            ret_1y = ((c - closes[t - idx_1y]) / closes[t - idx_1y]) * 100.0 if idx_1y >= 100 else 40.0
            ret_6m = ((c - closes[t - idx_6m]) / closes[t - idx_6m]) * 100.0 if idx_6m >= 50 else 25.0
            ret_3m = ((c - closes[t - idx_3m]) / closes[t - idx_3m]) * 100.0
            ret_1m = ((c - closes[t - idx_1m]) / closes[t - idx_1m]) * 100.0

            b_ret_1y = ((b_vals[t] - b_vals[t - idx_1y]) / b_vals[t - idx_1y]) * 100.0 if idx_1y >= 100 else 0.0
            b_ret_6m = ((b_vals[t] - b_vals[t - idx_6m]) / b_vals[t - idx_6m]) * 100.0 if idx_6m >= 50 else 0.0
            b_ret_3m = ((b_vals[t] - b_vals[t - idx_3m]) / b_vals[t - idx_3m]) * 100.0
            b_ret_1m = ((b_vals[t] - b_vals[t - idx_1m]) / b_vals[t - idx_1m]) * 100.0

            rs_1y = ret_1y - b_ret_1y
            rs_6m = ret_6m - b_ret_6m
            rs_3m = ret_3m - b_ret_3m
            rs_1m = ret_1m - b_ret_1m

            # RS thresholds: 1M > 5%, 3M > 10%, 6M > 10%
            if not (rs_3m > 10.0 and rs_1m > 5.0 and rs_6m > 10.0):
                continue

            # 3. RSI sweet spot: 50 <= RSI <= 72
            if not (50.0 <= r <= 72.0):
                continue

            # 4. Volume Expansion (today or recent 3 bars >= 1.20x prev)
            prev_v = vols[t - 1] if t >= 1 else v
            is_vol_spike = (prev_v > 0 and v >= prev_v * 1.20)
            vol_exp_recent = any(vols[t - i] >= vols[t - i - 1] * 1.20 for i in range(1, min(4, t)))
            if not (is_vol_spike or vol_exp_recent):
                continue

            # 5. Base structure: Swing High formed 10 to 60 days ago
            min_base_d = 10
            max_base_d = min(60, t)
            if max_base_d <= min_base_d:
                continue

            w = highs[t - max_base_d : t - min_base_d]
            if len(w) == 0:
                continue

            sh = float(np.max(w))
            sh_idx = (t - max_base_d) + int(np.argmax(w))
            min_l = float(np.min(lows[sh_idx : t + 1]))

            # Close recovered to >= 90% of Swing High
            if not (c >= sh * 0.90):
                continue

            # Base correction depth: deep >= 20% or moderate >= 10%
            is_deep = (min_l <= sh * 0.80)
            is_mod = (min_l <= sh * 0.90)
            if not (is_deep or (is_mod and is_vol_spike)):
                continue

            # 6. Trade setup & Entry Trigger
            # Midpoint of breakout candle or safe entry zone
            support_ema = e20 if c >= e20 else e50
            candle_mid = (o + c) / 2.0
            safe_entry_mid = (support_ema + c) / 2.0
            entry_mid = round((candle_mid + safe_entry_mid) / 2.0, 2)

            base_swing_low = float(np.min(lows[max(0, t - 20) : t + 1]))
            sl_val = min(support_ema, base_swing_low)
            risk = max(c - sl_val, c * 0.02, 1.0)
            t1 = round(c + (risk * 1.5), 2)

            # 7. Check Forward Entry Condition
            fwd_end = min(t + 1 + forward_candles, n)
            fwd_lows = lows[t + 1 : fwd_end]
            fwd_highs = highs[t + 1 : fwd_end]

            if len(fwd_lows) < 5:
                continue

            # Check entry touch within first 15 bars
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

            # Win condition: achieve Target 1 or >= +8.0% return
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
        raise ValueError("No qualified Setup 2 occurrences found.")

    res_df = pd.DataFrame(results)
    winning_samples = int(res_df["hit_target"].sum())
    win_rate = round((winning_samples / total_samples) * 100.0, 1)
    avg_peak_return = round(float(res_df["peak_gain_pct"].mean()), 1)
    avg_days_to_peak = round(float(res_df["days_to_peak"].mean()), 1)

    summary_metrics = {
        "setup_id": "setup_2",
        "setup_title": "Setup 2: Alpha Momentum",
        "evaluation_window": "90 Calendar Days (~63 Trading Candles)",
        "win_rate": win_rate,
        "avg_peak_return": avg_peak_return,
        "avg_days_to_peak": avg_days_to_peak,
        "total_samples": total_samples,
        "winning_samples": winning_samples,
        "entry_condition": "High-conviction momentum breakout entry (Midpoint of breakout candle or safe entry zone)",
        "target_condition": "Hit Target 1 or >= +8.0% return within 90 calendar days",
        "backtest_timestamp": datetime.now().isoformat(),
        "status": "VERIFIED_LOCAL_CACHE"
    }

    OUTPUT_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(summary_metrics, f, indent=2)

    logger.info(f"Backtest metrics saved to {OUTPUT_JSON_PATH}")
    print("\n" + "="*60)
    print("📊 3-MONTH FORWARD PERFORMANCE (SETUP 2 VERIFIED)")
    print("="*60)
    print(f"• Win Rate:          {win_rate}%")
    print(f"• Avg 3M Peak Gain:  +{avg_peak_return}%")
    print(f"• Avg Days to Peak:  {avg_days_to_peak} Days")
    print(f"• Signals Tested:    {total_samples:,} Momentum Setups")
    print("="*60 + "\n")

    return summary_metrics


if __name__ == "__main__":
    run_setup2_backtest()
