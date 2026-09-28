"""
MITS Pro Institutional Suite V2 - Setup 5: Stage-2 Pullback Forward Backtest Engine
Strict Zero-Network & Zero-Server quantitative backtester.

Evaluates Setup 5: Stage-2 Pullback signals across local historical OHLCV data.
Measures 3-month forward performance (~63 trading candles / 90 calendar days) from entry:
- Entry Condition: When price touched the midpoint of the Safe Entry Zone ((Safe_Low + Safe_High) / 2)
- Target 1 / +8% win rate
- Average 3-month peak return (%)
- Average days to reach peak return
- Total qualified pullback occurrences analyzed
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
logger = logging.getLogger("Setup5Backtest")

BASE_DIR = Path(__file__).resolve().parent.parent
LOCAL_PARQUET_PATH = BASE_DIR / "cache" / "market_ohlcv.parquet"
ALT_PARQUET_PATH = Path("D:/MITS-Scanner/cache/market_ohlcv.parquet")
OUTPUT_JSON_PATH = BASE_DIR / "data" / "setup5_backtest.json"


def find_parquet_cache() -> Path:
    """Locate local OHLCV parquet file with zero network calls."""
    if LOCAL_PARQUET_PATH.exists():
        return LOCAL_PARQUET_PATH
    if ALT_PARQUET_PATH.exists():
        return ALT_PARQUET_PATH
    raise FileNotFoundError(
        f"Parquet cache not found at {LOCAL_PARQUET_PATH} or {ALT_PARQUET_PATH}."
    )


def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Calculate Wilder's exponential smoothed RSI(14) with zero look-ahead bias."""
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return rsi.fillna(50.0)


def run_setup5_backtest(forward_candles: int = 63) -> Dict[str, Any]:
    """
    Executes the 3-month forward performance backtest strictly for Setup 5 candidates.
    Forward window: 63 trading candles (~90 calendar days).
    """
    parquet_path = find_parquet_cache()
    logger.info(f"Loading local OHLCV data from: {parquet_path}")
    df_all = pd.read_parquet(parquet_path)
    logger.info(f"Loaded {len(df_all):,} historical candles across {df_all['Symbol'].nunique()} equities.")

    grouped = df_all.groupby("Symbol")
    results = []

    for sym, group in grouped:
        df_sym = group.sort_values("Date").reset_index(drop=True)
        n = len(df_sym)
        if n < 150:
            continue

        closes = df_sym["Close"].values
        opens = df_sym["Open"].values
        highs = df_sym["High"].values
        lows = df_sym["Low"].values
        vols = df_sym["Volume"].values
        dates = df_sym["Date"].values

        close_s = df_sym["Close"]
        vol_s = df_sym["Volume"]

        # Technical Indicators (computed historically without look-ahead)
        ema20 = close_s.ewm(span=20, adjust=False).mean().values
        ema50 = close_s.ewm(span=50, adjust=False).mean().values
        sma200 = close_s.rolling(window=min(200, n), min_periods=100).mean().values
        avg_vol20 = vol_s.rolling(window=20, min_periods=5).mean().values
        rsi_series = compute_rsi(close_s, 14).values
        high_52w_series = df_sym["High"].rolling(window=250, min_periods=50).max().values

        for t in range(120, n - 15):
            c = closes[t]
            o = opens[t]
            l = lows[t]
            v = vols[t]

            e20 = ema20[t]
            e50 = ema50[t]
            s200 = sma200[t]
            h52 = high_52w_series[t]
            r = rsi_series[t]
            av20 = avg_vol20[t]

            if np.isnan(s200) or np.isnan(e50) or np.isnan(e20) or np.isnan(h52):
                continue

            # 1. Stage-2 Trend Filter: Close > 50 EMA > 200 SMA
            if not (c > e50 and e50 > s200):
                continue

            # 200 SMA slope must be rising
            lookback_sma = min(20, t - 100)
            if lookback_sma >= 5 and (s200 - sma200[t - lookback_sma]) <= 0:
                continue

            # High Proximity: within 20% of 52W High
            if ((h52 - c) / h52) * 100.0 > 20.0:
                continue

            # 2. Dynamic Support Pullback (20 EMA or 50 EMA within 1.5% tolerance)
            recent_low = min(l, lows[t - 1]) if t >= 1 else l
            touch_20 = (recent_low <= e20 * 1.015) and (c >= e20 * 0.985)
            touch_50 = (recent_low <= e50 * 1.015) and (c >= e50 * 0.985)
            if not (touch_20 or touch_50):
                continue

            support_ema = e20 if touch_20 else e50

            # 3. Bullish Reversal Confirmation holding EMA
            if not (c > o and c >= support_ema * 0.995):
                continue

            # 4. Volume Contraction & Absorption
            rvol = v / av20 if av20 > 0 else 1.0
            vol_contract = (rvol <= 0.85) or (v < av20 * 0.90) or (t >= 1 and v < vols[t - 1])
            if not vol_contract:
                continue

            # 5. RSI Sweet Spot (45.0 <= RSI <= 58.0)
            if not (45.0 <= r <= 58.0):
                continue

            # 6. Structural Risk & Safe Entry Zone Midpoint Math
            base_low = float(np.min(lows[max(0, t - 9) : t + 1]))
            inval = min(base_low, e50 * 0.99)
            if inval >= c:
                inval = c * 0.97
            risk = max(c - inval, c * 0.015, 1.0)
            t1 = c + (risk * 1.5)

            safe_low = min(support_ema, c * 0.995)
            safe_high = c
            entry_mid = round((safe_low + safe_high) / 2.0, 2)

            # 7. Check Forward Entry Condition
            fwd_end = min(t + 1 + forward_candles, n)
            fwd_lows = lows[t + 1 : fwd_end]
            fwd_highs = highs[t + 1 : fwd_end]

            if len(fwd_lows) < 5:
                continue

            # Entry condition: price touched midpoint of safe entry zone
            entry_offset = None
            for idx_fwd, fl in enumerate(fwd_lows[:15]):
                if fl <= entry_mid:
                    entry_offset = idx_fwd
                    break

            if entry_offset is None:
                continue

            post_highs = fwd_highs[entry_offset:]
            if len(post_highs) == 0:
                continue

            max_high = float(np.max(post_highs))
            peak_idx = int(np.argmax(post_highs))
            days_to_peak = peak_idx + 1
            peak_gain_pct = ((max_high - entry_mid) / entry_mid) * 100.0

            # Win condition: hit Target 1 or >= +8% return within 90 days
            hit = (max_high >= t1) or (peak_gain_pct >= 8.0)

            results.append({
                "symbol": sym,
                "trigger_date": str(pd.to_datetime(dates[t]).date()),
                "entry_mid": entry_mid,
                "target_1": round(t1, 2),
                "max_high": round(max_high, 2),
                "peak_gain_pct": round(peak_gain_pct, 2),
                "days_to_peak": days_to_peak,
                "hit_target": bool(hit)
            })

    total_samples = len(results)
    if total_samples == 0:
        raise ValueError("No qualified Setup 5 pullback signals analyzed.")

    res_df = pd.DataFrame(results)
    winning_samples = int(res_df["hit_target"].sum())
    win_rate = round((winning_samples / total_samples) * 100.0, 1)
    avg_peak_return = round(float(res_df["peak_gain_pct"].mean()), 1)
    avg_days_to_peak = round(float(res_df["days_to_peak"].mean()), 1)

    summary_metrics = {
        "setup_id": "setup_5",
        "setup_title": "Setup 5: Stage-2 Pullback",
        "evaluation_window": "90 Calendar Days (~63 Trading Candles)",
        "win_rate": win_rate,
        "avg_peak_return": avg_peak_return,
        "avg_days_to_peak": avg_days_to_peak,
        "total_samples": total_samples,
        "winning_samples": winning_samples,
        "entry_condition": "Price touched midpoint of Safe Entry Zone ((Safe_Low + Safe_High) / 2)",
        "target_condition": "Hit Target 1 or >= +8.0% return within 90 calendar days",
        "backtest_timestamp": datetime.now().isoformat(),
        "status": "VERIFIED_LOCAL_CACHE"
    }

    OUTPUT_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(summary_metrics, f, indent=2)

    logger.info(f"Backtest metrics saved to {OUTPUT_JSON_PATH}")
    print("\n" + "="*60)
    print("📊 3-MONTH FORWARD PERFORMANCE (SETUP 5 VERIFIED)")
    print("="*60)
    print(f"• Win Rate:          {win_rate}%")
    print(f"• Avg 3M Peak Gain:  +{avg_peak_return}%")
    print(f"• Avg Days to Peak:  {avg_days_to_peak} Days")
    print(f"• Signals Tested:    {total_samples:,} Pullbacks")
    print("="*60 + "\n")

    return summary_metrics


if __name__ == "__main__":
    run_setup5_backtest()
