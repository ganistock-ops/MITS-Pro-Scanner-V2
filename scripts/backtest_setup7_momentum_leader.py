"""
MITS Pro Quantitative Suite V2 - Setup 7: Momentum Leader PRO Forward Backtest Engine
=====================================================================================
Multi-Horizon Forward Performance Quantitative Engine (1M / 2M / 3M).
Strictly Daily EOD, Zero Network/yfinance requests, strictly reads local cache.

Evaluates Setup 7: Momentum Leader PRO candidates (Confluence Score >= 70)
using the exact Entry Zone Midpoint logic across 3 distinct forward horizons:
  - 1 Month (21 trading candles)
  - 2 Months (42 trading candles)
  - 3 Months (63 trading candles)

Calculates for each period:
  - win_rate: % of signals hitting >= Target 1 (or >= +8% gain from Entry Midpoint)
  - avg_peak_return: Average maximum peak gain (%) reached from Entry Midpoint
  - avg_days_to_peak: Average trading days to hit peak gain
  - total_samples: Total Setup 7 setups tested

Saves structured multi-horizon metrics to data/setup7_backtest.json.
"""

import sys
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("Setup7Backtest")

BASE_DIR = Path(__file__).resolve().parent.parent
CACHE_DIR = BASE_DIR / "cache"
DATA_DIR = BASE_DIR / "data"

MARKET_OHLCV_FILE = CACHE_DIR / "market_ohlcv.parquet"
BENCHMARK_FILE = CACHE_DIR / "benchmark.parquet"
OUTPUT_JSON_FILE = DATA_DIR / "setup7_backtest.json"


def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Calculate Wilder's smoothed RSI(14) with zero look-ahead bias."""
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return rsi.fillna(50.0)


def compute_atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    """Calculate Average True Range ATR(14)."""
    prev_close = close.shift(1)
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    return tr.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()


def compute_adx(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    """Calculate Average Directional Index ADX(14)."""
    up_move = high.diff()
    down_move = -low.diff()
    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

    prev_close = close.shift(1)
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)

    atr = tr.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    plus_di = 100.0 * pd.Series(plus_dm, index=high.index).ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean() / atr
    minus_di = 100.0 * pd.Series(minus_dm, index=high.index).ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean() / atr

    dx = (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan) * 100.0
    return dx.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean().fillna(15.0)


def run_setup7_multi_horizon_backtest() -> Dict[str, Any]:
    """
    Executes historical multi-horizon forward backtest strictly across local cached data.
    """
    if not MARKET_OHLCV_FILE.exists():
        raise FileNotFoundError(f"OHLCV cache missing at {MARKET_OHLCV_FILE}")
    if not BENCHMARK_FILE.exists():
        raise FileNotFoundError(f"Benchmark cache missing at {BENCHMARK_FILE}")

    logger.info(f"Loading local OHLCV data from: {MARKET_OHLCV_FILE}")
    logger.info(f"Loading local Benchmark data from: {BENCHMARK_FILE}")

    df_all = pd.read_parquet(MARKET_OHLCV_FILE)
    bench_df = pd.read_parquet(BENCHMARK_FILE).sort_values("Date").reset_index(drop=True)

    b_close = bench_df["Close"].values.astype(float)
    b_close_s = bench_df["Close"]
    b_ema20 = b_close_s.ewm(span=20, adjust=False).mean().values
    b_ema50 = b_close_s.ewm(span=50, adjust=False).mean().values
    b_ema200 = b_close_s.ewm(span=200, adjust=False).mean().values

    # Pre-calculate indicator arrays per symbol
    stock_dict: Dict[str, Dict[str, Any]] = {}
    grouped = df_all.groupby("Symbol")

    logger.info(f"Precomputing indicators for {len(grouped)} symbols...")
    for sym, grp in grouped:
        df_sym = grp.sort_values("Date").reset_index(drop=True)
        if len(df_sym) < 125:
            continue

        c_s = df_sym["Close"]
        h_s = df_sym["High"]
        l_s = df_sym["Low"]
        v_s = df_sym["Volume"]

        stock_dict[sym] = {
            "closes": c_s.values.astype(float),
            "highs": h_s.values.astype(float),
            "lows": l_s.values.astype(float),
            "vols": v_s.values.astype(float),
            "dates": df_sym["Date"].values,
            "ema20": c_s.ewm(span=20, adjust=False).mean().values,
            "ema50": c_s.ewm(span=50, adjust=False).mean().values,
            "ema200": c_s.ewm(span=200, adjust=False).mean().values,
            "rsi": compute_rsi(c_s).values,
            "atr": compute_atr(h_s, l_s, c_s).values,
            "adx": compute_adx(h_s, l_s, c_s).values,
            "len": len(df_sym)
        }

    logger.info(f"Loaded {len(stock_dict)} qualified equities for backtesting.")

    # We evaluate triggers across trading days with forward availability
    horizons = {
        "1M": 21,
        "2M": 42,
        "3M": 63
    }
    max_horizon = max(horizons.values())  # 63

    results_by_horizon = {
        "1M": [],
        "2M": [],
        "3M": []
    }

    # Evaluate across all symbols
    for sym, sdata in stock_dict.items():
        n = sdata["len"]
        closes = sdata["closes"]
        highs = sdata["highs"]
        lows = sdata["lows"]
        vols = sdata["vols"]
        ema20 = sdata["ema20"]
        ema50 = sdata["ema50"]
        ema200 = sdata["ema200"]
        rsi_arr = sdata["rsi"]
        atr_arr = sdata["atr"]
        adx_arr = sdata["adx"]
        dates = sdata["dates"]

        last_trigger_bar = -99

        # We evaluate between bar 125 and (n - max_horizon)
        for t in range(125, n - max_horizon):
            if (t - last_trigger_bar) < 5:  # Avoid excessive clustering
                continue

            c = closes[t]
            h = highs[t]
            l = lows[t]
            v = vols[t]

            v_ema20 = ema20[t]
            v_ema50 = ema50[t]
            v_ema200 = ema200[t]
            cur_rsi = rsi_arr[t]
            cur_adx = adx_arr[t]
            cur_atr = atr_arr[t]

            if np.isnan(v_ema20) or np.isnan(v_ema50) or np.isnan(v_ema200) or np.isnan(cur_rsi):
                continue

            # -------------------------------------------------------------
            # 1. Price Momentum (25 pts)
            # -------------------------------------------------------------
            ret_5d = ((c - closes[t - 5]) / closes[t - 5]) * 100.0
            ret_10d = ((c - closes[t - 10]) / closes[t - 10]) * 100.0
            ret_20d = ((c - closes[t - 20]) / closes[t - 20]) * 100.0
            ret_60d = ((c - closes[t - 60]) / closes[t - 60]) * 100.0
            ret_120d = ((c - closes[t - 120]) / closes[t - 120]) * 100.0

            p_mom = (
                min(max(ret_5d, 0) / 5.0, 1.0) * 2.5 +
                min(max(ret_10d, 0) / 8.0, 1.0) * 3.75 +
                min(max(ret_20d, 0) / 15.0, 1.0) * 6.25 +
                min(max(ret_60d, 0) / 25.0, 1.0) * 7.5 +
                min(max(ret_120d, 0) / 35.0, 1.0) * 5.0
            )

            # -------------------------------------------------------------
            # 2. Relative Strength vs Benchmark (20 pts)
            # -------------------------------------------------------------
            bt = min(t, len(b_close) - 1)
            b_ret_20d = ((b_close[bt] - b_close[bt - 20]) / b_close[bt - 20]) * 100.0
            b_ret_60d = ((b_close[bt] - b_close[bt - 60]) / b_close[bt - 60]) * 100.0
            b_ret_120d = ((b_close[bt] - b_close[bt - 120]) / b_close[bt - 120]) * 100.0

            rs_20d = ret_20d - b_ret_20d
            rs_60d = ret_60d - b_ret_60d
            rs_120d = ret_120d - b_ret_120d

            rs_score = (
                min(max(rs_20d, 0) / 15.0, 1.0) * 6.0 +
                min(max(rs_60d, 0) / 25.0, 1.0) * 8.0 +
                min(max(rs_120d, 0) / 35.0, 1.0) * 6.0
            )

            # -------------------------------------------------------------
            # 3. Trend Structure (15 pts)
            # -------------------------------------------------------------
            trend_score = 0.0
            if c > v_ema20: trend_score += 2.5
            if v_ema20 > v_ema50: trend_score += 3.0
            if v_ema50 > v_ema200: trend_score += 3.5
            if ema20[t] > ema20[t - 5]: trend_score += 2.0
            if ema50[t] > ema50[t - 10]: trend_score += 2.0
            if ema200[t] > ema200[t - 20]: trend_score += 2.0

            # -------------------------------------------------------------
            # 4. Breakout / High Reclaim (10 pts) - shift(1) up to t-1
            # -------------------------------------------------------------
            prev_20_high = float(np.max(highs[t - 20 : t]))
            prev_50_high = float(np.max(highs[t - 50 : t]))
            prev_120_high = float(np.max(highs[t - 120 : t]))

            breakout_score = 0.0
            if c >= prev_20_high: breakout_score += 3.5
            elif c >= prev_20_high * 0.98: breakout_score += 2.5
            elif c >= prev_20_high * 0.95: breakout_score += 1.5

            if c >= prev_50_high: breakout_score += 3.5
            elif c >= prev_50_high * 0.98: breakout_score += 2.5
            elif c >= prev_50_high * 0.95: breakout_score += 1.5

            if c >= prev_120_high: breakout_score += 3.0
            elif c >= prev_120_high * 0.98: breakout_score += 2.0
            elif c >= prev_120_high * 0.95: breakout_score += 1.0

            # -------------------------------------------------------------
            # 5. Volume Confirmation (10 pts)
            # -------------------------------------------------------------
            vol_20_avg = float(np.mean(vols[t - 20 : t])) if t >= 20 else v
            rvol = round(v / vol_20_avg, 2) if vol_20_avg > 0 else 1.0

            if rvol >= 2.0: vol_score = 10.0
            elif rvol >= 1.5: vol_score = 8.0 + ((rvol - 1.5) / 0.5) * 2.0
            elif rvol >= 1.0: vol_score = 5.0 + ((rvol - 1.0) / 0.5) * 3.0
            elif rvol >= 0.7: vol_score = ((rvol - 0.7) / 0.3) * 5.0
            else: vol_score = 0.0

            # -------------------------------------------------------------
            # 6. Momentum Indicators (5 pts)
            # -------------------------------------------------------------
            rsi_score = 2.0 if cur_rsi >= 65 else (1.8 if cur_rsi >= 60 else (1.5 if cur_rsi >= 55 else (1.0 if cur_rsi >= 50 else 0.0)))
            adx_score = 2.0 if cur_adx >= 30 else (1.5 if cur_adx >= 25 else (1.0 if cur_adx >= 20 else 0.0))
            atr_pct = (cur_atr / c) * 100.0 if c > 0 else 0.0
            atr_score = 1.0 if atr_pct >= 1.5 else 0.5
            ind_score = rsi_score + adx_score + atr_score

            # -------------------------------------------------------------
            # 7. Momentum Acceleration (5 pts)
            # -------------------------------------------------------------
            rate_5d = ret_5d / 5.0
            rate_20d = ret_20d / 20.0
            rate_60d = ret_60d / 60.0
            if rate_5d > rate_20d and rate_20d > rate_60d and ret_5d > 0:
                accel_score = 5.0
            elif (rate_5d >= rate_20d or rate_20d >= rate_60d) and ret_20d > 0:
                accel_score = 3.5
            else:
                accel_score = 1.0

            # -------------------------------------------------------------
            # 8. 52-Week Position (5 pts)
            # -------------------------------------------------------------
            high_52w = float(np.max(highs[max(0, t - 250) : t + 1]))
            drawdown_52w = ((high_52w - c) / high_52w) * 100.0 if high_52w > 0 else 0.0
            if drawdown_52w <= 3.0: pos52w_score = 5.0
            elif drawdown_52w <= 7.0: pos52w_score = 4.0
            elif drawdown_52w <= 12.0: pos52w_score = 3.0
            elif drawdown_52w <= 20.0: pos52w_score = 2.0
            elif drawdown_52w <= 30.0: pos52w_score = 1.0
            else: pos52w_score = 0.0

            # -------------------------------------------------------------
            # 9. Market Regime (5 pts)
            # -------------------------------------------------------------
            nb_cur = b_close[bt]
            if nb_cur > b_ema20[bt] and b_ema20[bt] > b_ema50[bt]:
                regime_score = 5.0
            elif nb_cur > b_ema50[bt]:
                regime_score = 3.5
            elif nb_cur > b_ema200[bt]:
                regime_score = 2.0
            else:
                regime_score = 1.0

            total_score = int(round(
                p_mom + rs_score + trend_score + breakout_score + vol_score +
                ind_score + accel_score + pos52w_score + regime_score
            ))

            # Filter Threshold: Confluence Score >= 70
            if total_score < 70:
                continue

            # Exact Entry Zone Midpoint logic
            prev_20_low = float(np.min(lows[t - 20 : t]))
            invalidation = round(min(c * 0.94, v_ema20 * 0.98, prev_20_low), 2)
            risk = max(c - invalidation, c * 0.03)
            target_1 = round(c + (risk * 2.0), 2)
            entry_min = round(min(v_ema20, c * 0.98), 2)
            entry_mid = round((entry_min + c) / 2.0, 2)

            # Check forward execution: Entry touch within first 15 bars
            fwd_lows = lows[t + 1 : t + 1 + max_horizon]
            fwd_highs = highs[t + 1 : t + 1 + max_horizon]

            entry_offset = None
            for idx_fwd, fl in enumerate(fwd_lows[:15]):
                if fl <= entry_mid:
                    entry_offset = idx_fwd
                    break

            if entry_offset is None:
                continue

            last_trigger_bar = t

            # Multi-horizon forward tracking
            for h_key, h_bars in horizons.items():
                post_highs = fwd_highs[entry_offset : entry_offset + h_bars]
                if len(post_highs) == 0:
                    continue

                max_high = float(np.max(post_highs))
                peak_idx = int(np.argmax(post_highs))
                days_to_peak = peak_idx + 1
                peak_gain_pct = ((max_high - entry_mid) / entry_mid) * 100.0

                # Win condition: hitting >= Target 1 (or >= +8% gain from Entry Midpoint)
                is_win = bool((max_high >= target_1) or (peak_gain_pct >= 8.0))

                results_by_horizon[h_key].append({
                    "symbol": sym,
                    "trigger_date": str(pd.to_datetime(dates[t]).date()),
                    "entry_mid": entry_mid,
                    "target_1": target_1,
                    "max_high": round(max_high, 2),
                    "peak_gain_pct": round(peak_gain_pct, 2),
                    "days_to_peak": days_to_peak,
                    "is_win": is_win
                })

    # Compute summary metrics for each horizon
    summary_output: Dict[str, Any] = {
        "setup_id": "setup_7",
        "setup_title": "Setup 7: Momentum Leader PRO",
        "entry_condition": "Exact Entry Zone Midpoint: (min(20 EMA, Close * 0.98) + Close) / 2",
        "win_condition": "Hit Target 1 (1:2.0 R:R) or >= +8.0% peak gain from Entry Midpoint",
        "backtest_timestamp": datetime.utcnow().isoformat() + "Z"
    }

    print("\n" + "="*70)
    print("🚀 SETUP 7: MOMENTUM LEADER PRO - MULTI-HORIZON FORWARD BACKTEST")
    print("="*70)

    for h_key in ["1M", "2M", "3M"]:
        h_data = results_by_horizon[h_key]
        tot = len(h_data)
        if tot == 0:
            logger.warning(f"No samples for horizon {h_key}")
            summary_output[h_key] = {
                "win_rate": 0.0,
                "avg_peak_return": 0.0,
                "avg_days_to_peak": 0.0,
                "total_samples": 0
            }
            continue

        wins = sum(1 for r in h_data if r["is_win"])
        win_rate = round((wins / tot) * 100.0, 1)
        avg_peak = round(float(np.mean([r["peak_gain_pct"] for r in h_data])), 1)
        avg_days = round(float(np.mean([r["days_to_peak"] for r in h_data])), 1)

        summary_output[h_key] = {
            "win_rate": win_rate,
            "avg_peak_return": avg_peak,
            "avg_days_to_peak": avg_days,
            "total_samples": tot
        }

        print(f"[{h_key} Window ({horizons[h_key]} Candles)]")
        print(f"  • Win Rate:         {win_rate}%")
        print(f"  • Avg Peak Return:  +{avg_peak}%")
        print(f"  • Avg Days to Peak: {avg_days} Days")
        print(f"  • Signals Tested:   {tot:,} Qualified Setups")
        print("-" * 70)

    # Save to data/setup7_backtest.json
    OUTPUT_JSON_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(summary_output, f, indent=2, ensure_ascii=False)

    logger.info(f"Saved Setup 7 multi-horizon backtest to {OUTPUT_JSON_FILE}")
    return summary_output


if __name__ == "__main__":
    run_setup7_multi_horizon_backtest()
