"""
MITS Pro Institutional Suite V2 - Setup 1: Bottom Reversal Pro Forward Backtest Engine
Strict Zero-Network & Zero-Server quantitative backtester.
DO NOT import yfinance or make any internet/network requests.

Evaluates Setup 1: Bottom Reversal Pro signals across local historical OHLCV data.
Measures 3-month forward performance (~63 trading candles / 90 calendar days) from entry:
- Entry Trigger: Bottom reversal confirmation / safe entry zone midpoint
- Target 1 / +8% win rate
- Average 3-month peak return (%)
- Average days to reach peak return
- Total qualified Setup 1 occurrences tested
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
logger = logging.getLogger("Setup1Backtest")

BASE_DIR = Path(__file__).resolve().parent.parent
LOCAL_PARQUET_PATH = BASE_DIR / "cache" / "market_ohlcv.parquet"
ALT_PARQUET_PATH = Path("D:/MITS-Scanner/cache/market_ohlcv.parquet")

OUTPUT_JSON_PATH = BASE_DIR / "data" / "setup1_backtest.json"


def find_parquet_cache() -> Path:
    if LOCAL_PARQUET_PATH.exists():
        return LOCAL_PARQUET_PATH
    if ALT_PARQUET_PATH.exists():
        return ALT_PARQUET_PATH
    raise FileNotFoundError(f"OHLCV cache not found at {LOCAL_PARQUET_PATH} or {ALT_PARQUET_PATH}.")


def run_setup1_backtest(forward_candles: int = 63) -> Dict[str, Any]:
    """
    Executes the 3-month forward performance backtest strictly for Setup 1 (Bottom Reversal Pro).
    Forward window: 63 trading candles (~90 calendar days / 3 months).
    """
    parquet_path = find_parquet_cache()
    logger.info(f"Loading local OHLCV from: {parquet_path}")

    df_all = pd.read_parquet(parquet_path)
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
        volumes = df_sym["Volume"].values
        dates = df_sym["Date"].values

        close_s = df_sym["Close"]
        vol_s = df_sym["Volume"]

        # Moving Averages & Volume SMA (Zero Look-Ahead EOD)
        ema20 = close_s.ewm(span=20, adjust=False).mean().values
        ema50 = close_s.ewm(span=50, adjust=False).mean().values
        vol_sma20 = vol_s.rolling(window=20, min_periods=5).mean().values
        atr14 = (pd.Series(highs) - pd.Series(lows)).rolling(window=14, min_periods=5).mean().values

        last_trigger_bar = -99

        for t in range(50, n - 15):
            if (t - last_trigger_bar) < 3:
                continue

            c = closes[t]
            o = opens[t]
            h = highs[t]
            l = lows[t]
            v = volumes[t]
            v_sma = vol_sma20[t]

            if np.isnan(c) or np.isnan(v_sma):
                continue

            # 1. Downtrend Exhaustion (Decline >= 14% from 60-day swing high)
            swing_high_60 = float(np.max(highs[max(0, t - 60) : t + 1]))
            decline_pct = ((swing_high_60 - c) / swing_high_60) * 100.0
            if decline_pct < 14.0 or decline_pct > 60.0:
                continue

            # Rejection of runaway breakdown candle
            rng = max(0.01, h - l)
            body = abs(c - o)
            if c < o and (body / rng > 0.75) and ((c - l) / rng < 0.15):
                continue

            # 2. Base & Accumulation (last 15 sessions bandwidth <= 12%)
            base_slice_h = highs[max(0, t - 15) : t + 1]
            base_slice_l = lows[max(0, t - 15) : t + 1]
            base_high = float(np.max(base_slice_h))
            base_low = float(np.min(base_slice_l))
            bandwidth = ((base_high - base_low) / max(0.01, base_low)) * 100.0
            if bandwidth > 12.0:
                continue

            # 3. Early Bullish Structure Shift / MSS / CHoCH (Minor LH break or within 1.5% of minor LH)
            minor_lh = float(np.max(highs[max(0, t - 10) : t]))
            if c < minor_lh * 0.985:
                continue

            # 4. Volume absorption or prominent lower rejection wick
            rvol = v / max(v_sma, 1.0)
            lower_wick = max(0.0, min(o, c) - l)
            wick_ratio = lower_wick / rng
            if rvol < 1.05 and wick_ratio < 0.25:
                continue

            # 5. Invalidation (SL) and Target 1
            atr_val = atr14[t] if not np.isnan(atr14[t]) else rng
            inval = round(base_low - (0.5 * atr_val), 2)
            risk = max(c - inval, 1.0)
            t1 = round(c + (1.5 * risk), 2)

            # 6. Safe Entry Zone Midpoint calculation
            entry_min = round(min(c, minor_lh), 2)
            entry_max = round(max(c, minor_lh * 1.01), 2)
            entry_mid = round((entry_min + entry_max) / 2.0, 2)

            # 7. Check Forward Horizon (63 trading candles / 90 calendar days)
            fwd_end = min(t + 1 + forward_candles, n)
            fwd_lows = lows[t + 1 : fwd_end]
            fwd_highs = highs[t + 1 : fwd_end]

            if len(fwd_lows) < 5:
                continue

            # Entry condition: price touches / dips to safe entry zone midpoint within 15 candles
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
                "hit_target": bool(hit),
            })

    total_samples = len(results)
    if total_samples == 0:
        raise ValueError("No qualified Setup 1 historical occurrences found.")

    res_df = pd.DataFrame(results)
    winning_samples = int(res_df["hit_target"].sum())
    win_rate = round((winning_samples / total_samples) * 100.0, 1)
    avg_peak_return = round(float(res_df["peak_gain_pct"].mean()), 1)
    avg_days_to_peak = round(float(res_df["days_to_peak"].mean()), 1)

    summary_metrics = {
        "setup_id": "setup_1",
        "setup_title": "Setup 1: Bottom Reversal Pro",
        "evaluation_window": "90 Calendar Days (~63 Trading Candles)",
        "win_rate": win_rate,
        "avg_peak_return": avg_peak_return,
        "avg_days_to_peak": avg_days_to_peak,
        "total_samples": total_samples,
        "winning_samples": winning_samples,
        "entry_condition": "Bottom reversal confirmation / safe entry zone midpoint",
        "target_condition": "Hit Target 1 or >= +8.0% return within 90 calendar days",
        "backtest_timestamp": datetime.now().isoformat(),
        "status": "VERIFIED_LOCAL_CACHE",
    }

    OUTPUT_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(summary_metrics, f, indent=2)

    logger.info(f"Backtest metrics saved to {OUTPUT_JSON_PATH}")
    print("\n" + "=" * 60)
    print("📊 3-MONTH FORWARD PERFORMANCE (SETUP 1 VERIFIED)")
    print("=" * 60)
    print(f"• Win Rate:          {win_rate}%")
    print(f"• Avg 3M Peak Gain:  +{avg_peak_return}%")
    print(f"• Avg Days to Peak:  {avg_days_to_peak} Days")
    print(f"• Signals Tested:    {total_samples:,} Reversal Setups")
    print("=" * 60 + "\n")

    return summary_metrics


if __name__ == "__main__":
    run_setup1_backtest()
