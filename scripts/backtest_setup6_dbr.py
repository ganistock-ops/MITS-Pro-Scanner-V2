"""
MITS Pro Institutional Suite V2 - Setup 6: Drop-Base-Rally (DBR) Demand Zone Forward Backtest Engine
Strict Zero-Network & Zero-Server quantitative backtester.
DO NOT import yfinance or make any internet/network requests.

Evaluates Setup 6: DBR Demand Zone signals across local historical OHLCV data.
Measures 3-month forward performance (~63 trading candles / 90 calendar days) from entry:
- Entry Trigger: Demand zone midpoint / base upper boundary reclaim level
- Target 1 / +8% win rate
- Average 3-month peak return (%)
- Average days to reach peak return
- Total qualified Setup 6 occurrences tested
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
logger = logging.getLogger("Setup6Backtest")

BASE_DIR = Path(__file__).resolve().parent.parent
LOCAL_PARQUET_PATH = BASE_DIR / "cache" / "market_ohlcv.parquet"
ALT_PARQUET_PATH = Path("D:/MITS-Scanner/cache/market_ohlcv.parquet")

OUTPUT_JSON_PATH = BASE_DIR / "data" / "setup6_backtest.json"


def find_parquet_cache() -> Path:
    if LOCAL_PARQUET_PATH.exists():
        return LOCAL_PARQUET_PATH
    if ALT_PARQUET_PATH.exists():
        return ALT_PARQUET_PATH
    raise FileNotFoundError(f"OHLCV cache not found at {LOCAL_PARQUET_PATH} or {ALT_PARQUET_PATH}.")


def run_setup6_backtest(forward_candles: int = 63) -> Dict[str, Any]:
    """
    Executes the 3-month forward performance backtest strictly for Setup 6 (DBR Demand Zone).
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
        if n < 60:
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
        sma200 = close_s.rolling(window=min(200, n), min_periods=20).mean().values
        vol_sma20 = vol_s.rolling(window=20, min_periods=5).mean().values
        atr14 = (pd.Series(highs) - pd.Series(lows)).rolling(window=14, min_periods=5).mean().values

        last_trigger_bar = -99

        for t in range(30, n - 15):
            if (t - last_trigger_bar) < 3:
                continue

            c = closes[t]
            o = opens[t]
            h = highs[t]
            l = lows[t]
            v = volumes[t]
            e20 = ema20[t]
            e50 = ema50[t]
            s200 = sma200[t]
            v_sma = vol_sma20[t]

            if np.isnan(c) or np.isnan(e20) or np.isnan(e50):
                continue

            # 1. Structural Discount Requirement: Demand zone at value/support, not extended
            is_discount = (
                (c <= e20 * 1.02)
                or (abs(c - e50) / max(e50, 1.0) <= 0.03)
                or (abs(c - s200) / max(s200, 1.0) <= 0.035)
            )
            if not is_discount:
                continue

            # 2. Bullish Leg-Out Candle departing from base
            if c <= o:
                continue
            candle_rng = max(h - l, 0.001)
            body_val = c - o
            brr = body_val / candle_rng
            if brr < 0.52:
                continue

            # Volume expansion on legout
            if v < (1.15 * max(v_sma, 1.0)):
                continue

            # 3. Base Phase: 1 to 4 contiguous boring candles immediately preceding leg-out
            base_bars = 0
            for b in range(t - 1, max(-1, t - 6), -1):
                b_rng = max(highs[b] - lows[b], 0.001)
                b_body = abs(closes[b] - opens[b])
                if (b_body / b_rng) <= 0.50:
                    base_bars += 1
                else:
                    break

            if not (1 <= base_bars <= 4):
                continue

            base_start = t - base_bars
            p_prox = float(np.max(highs[base_start:t]))
            p_dist = float(np.min(lows[base_start:t]))

            # Leg-out must depart above proximal line
            if c <= p_prox:
                continue

            # Base depth limit: (P_prox - P_dist) / P_dist <= 4.5%
            base_depth_pct = ((p_prox - p_dist) / max(p_dist, 0.01)) * 100.0
            if base_depth_pct > 4.5:
                continue

            # 4. Drop Phase preceding base (Selling pressure into demand zone)
            drop_start = max(0, base_start - 8)
            if (base_start - drop_start) < 3:
                continue

            peak_h = float(np.max(highs[drop_start:base_start]))
            drop_pct = ((peak_h - p_dist) / max(peak_h, 0.01)) * 100.0
            if drop_pct < 4.5:
                continue

            # 5. Invalidation (SL) and Target 1 (1:1.5 RR minimum)
            atr_val = atr14[t] if not np.isnan(atr14[t]) else 1.0
            sl = round(p_dist - max(0.15 * atr_val, 0.004 * p_dist), 2)
            risk = max(c - sl, 1.0)
            t1 = round(c + (1.5 * risk), 2)

            # 6. Entry Trigger: Demand zone midpoint / base upper boundary reclaim level
            entry_mid = round((p_prox + p_dist) / 2.0, 2)
            entry_trigger = round(p_prox, 2)

            # 7. Check Forward Horizon (63 trading candles / 90 calendar days)
            fwd_end = min(t + 1 + forward_candles, n)
            fwd_lows = lows[t + 1 : fwd_end]
            fwd_highs = highs[t + 1 : fwd_end]

            if len(fwd_lows) < 5:
                continue

            # Entry condition: price retests/touches base upper boundary or dips to midpoint within 15 candles
            entry_offset = None
            fill_price = None
            for idx_fwd, fl in enumerate(fwd_lows[:15]):
                if fl <= entry_trigger:
                    entry_offset = idx_fwd
                    fill_price = min(entry_trigger, max(fl, entry_mid))
                    break

            if entry_offset is None or fill_price is None:
                continue

            last_trigger_bar = t

            post_highs = fwd_highs[entry_offset:]
            if len(post_highs) == 0:
                continue

            max_high = float(np.max(post_highs))
            peak_idx = int(np.argmax(post_highs))
            days_to_peak = peak_idx + 1
            peak_gain_pct = ((max_high - fill_price) / fill_price) * 100.0

            # Win condition: achieve >= Target 1 or >= +8.0% return within 90 days
            hit = (max_high >= t1) or (peak_gain_pct >= 8.0)

            results.append({
                "symbol": sym,
                "trigger_date": str(pd.to_datetime(dates[t]).date()),
                "entry_mid": entry_mid,
                "entry_trigger": entry_trigger,
                "fill_price": round(fill_price, 2),
                "target_1": t1,
                "max_high": round(max_high, 2),
                "peak_gain_pct": round(peak_gain_pct, 2),
                "days_to_peak": days_to_peak,
                "hit_target": bool(hit),
            })

    total_samples = len(results)
    if total_samples == 0:
        raise ValueError("No qualified Setup 6 historical occurrences found.")

    res_df = pd.DataFrame(results)
    winning_samples = int(res_df["hit_target"].sum())
    win_rate = round((winning_samples / total_samples) * 100.0, 1)
    avg_peak_return = round(float(res_df["peak_gain_pct"].mean()), 1)
    avg_days_to_peak = round(float(res_df["days_to_peak"].mean()), 1)

    summary_metrics = {
        "setup_id": "setup_6",
        "setup_title": "Setup 6: DBR Demand Zone",
        "evaluation_window": "90 Calendar Days (~63 Trading Candles)",
        "win_rate": win_rate,
        "avg_peak_return": avg_peak_return,
        "avg_days_to_peak": avg_days_to_peak,
        "total_samples": total_samples,
        "winning_samples": winning_samples,
        "entry_condition": "Demand zone midpoint / base upper boundary reclaim level",
        "target_condition": "Hit Target 1 or >= +8.0% return within 90 calendar days",
        "backtest_timestamp": datetime.now().isoformat(),
        "status": "VERIFIED_LOCAL_CACHE",
    }

    OUTPUT_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(summary_metrics, f, indent=2)

    logger.info(f"Backtest metrics saved to {OUTPUT_JSON_PATH}")
    print("\n" + "=" * 60)
    print("📊 3-MONTH FORWARD PERFORMANCE (SETUP 6 VERIFIED)")
    print("=" * 60)
    print(f"• Win Rate:          {win_rate}%")
    print(f"• Avg 3M Peak Gain:  +{avg_peak_return}%")
    print(f"• Avg Days to Peak:  {avg_days_to_peak} Days")
    print(f"• Signals Tested:    {total_samples:,} DBR Setups")
    print("=" * 60 + "\n")

    return summary_metrics


if __name__ == "__main__":
    run_setup6_backtest()
