"""
MITS Pro Institutional Suite V2 - Setup 3: High Tight Flag (HTF) Forward Backtest Engine
Strict Zero-Network & Zero-Server quantitative backtester.
DO NOT import yfinance or make any internet/network requests.

Evaluates Setup 3: High Tight Flag signals across local historical OHLCV data.
Measures 3-month forward performance (~63 trading candles / 90 calendar days) from entry:
- Entry Trigger: Flag breakout / consolidation high break level
- Target 1 / +8% win rate
- Average 3-month peak return (%)
- Average days to reach peak return
- Total qualified Setup 3 occurrences tested
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
logger = logging.getLogger("Setup3Backtest")

BASE_DIR = Path(__file__).resolve().parent.parent
LOCAL_PARQUET_PATH = BASE_DIR / "cache" / "market_ohlcv.parquet"
ALT_PARQUET_PATH = Path("D:/MITS-Scanner/cache/market_ohlcv.parquet")

OUTPUT_JSON_PATH = BASE_DIR / "data" / "setup3_backtest.json"


def find_parquet_cache() -> Path:
    if LOCAL_PARQUET_PATH.exists():
        return LOCAL_PARQUET_PATH
    if ALT_PARQUET_PATH.exists():
        return ALT_PARQUET_PATH
    raise FileNotFoundError(f"OHLCV cache not found at {LOCAL_PARQUET_PATH} or {ALT_PARQUET_PATH}.")


def run_setup3_backtest(forward_candles: int = 63) -> Dict[str, Any]:
    """
    Executes the 3-month forward performance backtest strictly for Setup 3 (High Tight Flag).
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

        # Moving Averages (Zero Look-Ahead EOD)
        ema20 = close_s.ewm(span=20, adjust=False).mean().values
        ema50 = close_s.ewm(span=50, adjust=False).mean().values

        last_trigger_bar = -99

        for t in range(50, n - 15):
            if (t - last_trigger_bar) < 5:
                continue

            c = closes[t]
            e20 = ema20[t]
            e50 = ema50[t]

            # 1. Trend Structure: Close > 20 EMA and Close > 50 EMA
            if not (c > e20 and c > e50):
                continue

            # 2. Flag duration search: 5 to 20 days
            best_htf = None
            for d in range(5, 21):
                peak_idx = t - d
                if peak_idx < 15:
                    continue

                peak_high = float(highs[peak_idx])
                pole_start = max(0, peak_idx - 40)

                # Peak must be highest high in pole segment
                if peak_high < float(np.max(highs[pole_start : peak_idx + 1])):
                    continue

                pole_lows = lows[pole_start : peak_idx + 1]
                min_low_idx_rel = int(np.argmin(pole_lows))
                swing_min_low = float(pole_lows[min_low_idx_rel])
                min_low_idx = pole_start + min_low_idx_rel
                if swing_min_low <= 0:
                    continue

                pole_gain = (peak_high - swing_min_low) / swing_min_low
                if pole_gain < 0.38:  # Minimum ~40% explosive rally
                    continue

                flag_lows = lows[peak_idx + 1 : t + 1]
                flag_highs = highs[peak_idx + 1 : t + 1]
                if len(flag_lows) == 0:
                    continue

                lowest_low_after_peak = float(np.min(flag_lows))
                flag_correction = (peak_high - lowest_low_after_peak) / peak_high
                if flag_correction > 0.22:  # Pullback from peak <= 20-22%
                    continue

                # Volume dry-up check
                pole_vols = volumes[min_low_idx : peak_idx + 1]
                flag_vols = volumes[peak_idx + 1 : t + 1]
                pole_avg_vol = float(np.mean(pole_vols)) if len(pole_vols) > 0 else 1.0
                flag_avg_vol = float(np.mean(flag_vols)) if len(flag_vols) > 0 else 1.0
                if flag_avg_vol > pole_avg_vol * 1.05:
                    continue

                if best_htf is None or pole_gain > best_htf["pole_gain"]:
                    best_htf = {
                        "peak_high": peak_high,
                        "flag_base_low": lowest_low_after_peak,
                        "pole_gain": pole_gain,
                    }

            if best_htf is None:
                continue

            flag_pivot = best_htf["peak_high"]
            flag_base_low = best_htf["flag_base_low"]

            # 3. Entry Trigger: Flag breakout / consolidation high break level
            is_breakout_now = c >= flag_pivot * 0.99

            fwd_end = min(t + 1 + forward_candles, n)
            fwd_highs = highs[t + 1 : fwd_end]

            if len(fwd_highs) < 5:
                continue

            if is_breakout_now:
                entry_offset = 0
                entry_price = c
            else:
                entry_offset = None
                entry_price = flag_pivot
                for idx_fwd, fh in enumerate(fwd_highs[:15]):
                    if fh >= flag_pivot:
                        entry_offset = idx_fwd
                        break

            if entry_offset is None:
                continue

            last_trigger_bar = t
            sl_val = flag_base_low
            risk = max(entry_price - sl_val, entry_price * 0.02)
            t1 = round(entry_price + (1.5 * risk), 2)

            post_highs = fwd_highs[entry_offset:]
            if len(post_highs) == 0:
                continue

            max_high = float(np.max(post_highs))
            peak_idx = int(np.argmax(post_highs))
            days_to_peak = peak_idx + 1
            peak_gain_pct = ((max_high - entry_price) / entry_price) * 100.0

            # Win condition: achieve >= Target 1 or >= +8.0% return within 90 days
            hit = (max_high >= t1) or (peak_gain_pct >= 8.0)

            results.append({
                "symbol": sym,
                "trigger_date": str(pd.to_datetime(dates[t]).date()),
                "entry_price": round(entry_price, 2),
                "target_1": t1,
                "max_high": round(max_high, 2),
                "peak_gain_pct": round(peak_gain_pct, 2),
                "days_to_peak": days_to_peak,
                "hit_target": bool(hit),
            })

    total_samples = len(results)
    if total_samples == 0:
        raise ValueError("No qualified Setup 3 historical occurrences found.")

    res_df = pd.DataFrame(results)
    winning_samples = int(res_df["hit_target"].sum())
    win_rate = round((winning_samples / total_samples) * 100.0, 1)
    avg_peak_return = round(float(res_df["peak_gain_pct"].mean()), 1)
    avg_days_to_peak = round(float(res_df["days_to_peak"].mean()), 1)

    summary_metrics = {
        "setup_id": "setup_3",
        "setup_title": "Setup 3: High Tight Flag",
        "evaluation_window": "90 Calendar Days (~63 Trading Candles)",
        "win_rate": win_rate,
        "avg_peak_return": avg_peak_return,
        "avg_days_to_peak": avg_days_to_peak,
        "total_samples": total_samples,
        "winning_samples": winning_samples,
        "entry_condition": "Flag breakout / consolidation high break level",
        "target_condition": "Hit Target 1 or >= +8.0% return within 90 calendar days",
        "backtest_timestamp": datetime.now().isoformat(),
        "status": "VERIFIED_LOCAL_CACHE",
    }

    OUTPUT_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(summary_metrics, f, indent=2)

    logger.info(f"Backtest metrics saved to {OUTPUT_JSON_PATH}")
    print("\n" + "=" * 60)
    print("📊 3-MONTH FORWARD PERFORMANCE (SETUP 3 VERIFIED)")
    print("=" * 60)
    print(f"• Win Rate:          {win_rate}%")
    print(f"• Avg 3M Peak Gain:  +{avg_peak_return}%")
    print(f"• Avg Days to Peak:  {avg_days_to_peak} Days")
    print(f"• Signals Tested:    {total_samples:,} HTF Setups")
    print("=" * 60 + "\n")

    return summary_metrics


if __name__ == "__main__":
    run_setup3_backtest()
