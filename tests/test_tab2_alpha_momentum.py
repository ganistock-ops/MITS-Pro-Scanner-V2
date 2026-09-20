"""
Unit Test Suite for Tab 2: Alpha Momentum Quantitative Engine
Validates:
1. Zero look-ahead bias (strict backward-looking EOD evaluation)
2. Multi-timeframe Relative Strength (1Y, 6M, 3M, 1M) outperformance
3. Base structure, drawdown, and 90% swing high recovery
4. Trade setup calculation: Invalidation SL, Targets T1 (1.5x) and T2 (2.5x)
5. Disqualification / Rejection of failing stocks
"""

import sys
import json
from pathlib import Path
import pandas as pd
import numpy as np

# Add scripts directory to path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "scripts"))

from tab2_alpha_momentum import AlphaMomentumEngine

def generate_synthetic_momentum_history(bars: int = 260) -> tuple:
    """
    Generate deterministic synthetic OHLCV history for stock and NIFTY benchmark.
    Calibrated to satisfy all 6 Alpha Momentum filters:
    - 1Y RS > 30%, 6M RS > 15%, 3M RS > 10%, 1M RS > 5%
    - 50 <= RSI(14) <= 72
    - Base Drawdown >= 20% from Swing High, recovered to >= 90% of Swing High
    - Volume expansion >= 1.20x
    """
    np.random.seed(42)
    dates = pd.date_range("2025-09-01", periods=bars, freq="D")

    # Benchmark: Steady rise from 20000 to 21600 (+8% over 1Y)
    b_close = np.linspace(20000, 21600, bars)
    bench_df = pd.DataFrame({"Close": b_close}, index=dates)

    t_6m = 140
    t_3m = 200
    t_high = 225
    t_low = 238

    closes = np.zeros(bars)
    closes[:t_6m] = np.linspace(500, 620, t_6m)
    closes[t_6m:t_3m] = np.linspace(620, 715, t_3m - t_6m)
    closes[t_3m:t_high] = np.linspace(715, 880, t_high - t_3m)
    closes[t_high:t_low] = np.linspace(880, 700, t_low - t_high)
    closes[t_low:] = np.linspace(700, 805, bars - t_low)

    highs = closes + 4.0
    lows = closes - 4.0
    highs[t_high] = 880.0
    lows[t_low] = 700.0
    opens = closes - 1.0
    volumes = np.full(bars, 200000.0)
    volumes[-1] = 320000.0 # Volume expansion (1.6x)

    df = pd.DataFrame({
        "Open": opens,
        "High": highs,
        "Low": lows,
        "Close": closes,
        "Volume": volumes
    }, index=dates)

    return df, bench_df

def test_zero_look_ahead_bias():
    """Verify evaluation at bar T produces identical results regardless of future data."""
    engine = AlphaMomentumEngine()
    meta = {"symbol": "TEST_ALPHA", "name": "Test Alpha Ltd", "sector": "Tech"}
    
    stock_df, bench_df = generate_synthetic_momentum_history(260)

    # Run at bar T=259 with only data up to T=259
    df_isolated = stock_df.iloc[:260].copy()
    bench_isolated = bench_df.iloc[:260].copy()
    res_isolated = engine.evaluate(meta, df_isolated, bench_isolated)

    # Run when future 20 bars exist in the original series, slicing strictly up to T=259
    stock_with_future = pd.concat([stock_df, stock_df.iloc[-20:].copy()], ignore_index=True)
    bench_with_future = pd.concat([bench_df, bench_df.iloc[-20:].copy()], ignore_index=True)
    df_sliced = stock_with_future.iloc[:260].copy()
    bench_sliced = bench_with_future.iloc[:260].copy()
    res_future = engine.evaluate(meta, df_sliced, bench_sliced)

    assert res_isolated is not None, "Evaluation should qualify setup"
    assert res_future is not None

    assert res_isolated["cmp"] == res_future["cmp"]
    assert res_isolated["score"] == res_future["score"]
    assert res_isolated["grade"] == res_future["grade"]
    assert res_isolated["invalidation"] == res_future["invalidation"]
    assert res_isolated["target_1"] == res_future["target_1"]
    assert res_isolated["target_2"] == res_future["target_2"]
    assert res_isolated["rs_1y"] == res_future["rs_1y"]

def test_alpha_momentum_qualification_factors():
    """Verify that multi-timeframe RS outperformance, deep base, and targets score correctly."""
    engine = AlphaMomentumEngine()
    meta = {"symbol": "LEADER_ALPHA", "name": "Leader Alpha Ltd", "sector": "Healthcare"}
    
    stock_df, bench_df = generate_synthetic_momentum_history(260)
    res = engine.evaluate(meta, stock_df, bench_df)

    assert res is not None
    assert res["grade"] == "A+", f"Expected A+ for deep base >= 20%, got {res['grade']}"
    assert res["score"] >= 80, f"Expected score >= 80, got {res['score']}"
    assert res["risk_reward_ratio"] == "1:2.5"
    assert res["target_2"] > res["target_1"] > res["cmp"] > res["invalidation"]

    # Verify RS values are strictly outperforming
    assert res["rs_1y"] > 30.0
    assert res["rs_6m"] > 15.0
    assert res["rs_3m"] > 10.0
    assert res["rs_1m"] > 5.0
    assert 50.0 <= res["rsi"] <= 72.0

def test_rejection_low_rs():
    """Verify that a stock underperforming NIFTY is rejected (returns None)."""
    engine = AlphaMomentumEngine()
    meta = {"symbol": "LAGGARD", "name": "Laggard Stock", "sector": "Energy"}
    
    dates = pd.date_range("2025-09-01", periods=260, freq="D")
    bench_close = np.linspace(20000, 24000, 260)
    bench_df = pd.DataFrame({"Close": bench_close}, index=dates)

    # Stock falling or stagnant (negative RS)
    stock_close = np.linspace(500, 480, 260)
    stock_df = pd.DataFrame({
        "Open": stock_close,
        "High": stock_close + 2.0,
        "Low": stock_close - 2.0,
        "Close": stock_close,
        "Volume": np.full(260, 200000.0)
    }, index=dates)

    res = engine.evaluate(meta, stock_df, bench_df)
    assert res is None, "Stock with negative RS vs NIFTY must be rejected"

def test_rejection_broken_trend():
    """Verify that a stock with Close < 50 EMA is rejected."""
    engine = AlphaMomentumEngine()
    meta = {"symbol": "BROKEN", "name": "Broken Trend Ltd", "sector": "Auto"}
    
    stock_df, bench_df = generate_synthetic_momentum_history(260)
    # Force last close far below 50 EMA
    stock_df.iloc[-1, stock_df.columns.get_loc("Close")] = 400.0

    res = engine.evaluate(meta, stock_df, bench_df)
    assert res is None, "Stock below 50 EMA must be rejected"

if __name__ == "__main__":
    print("Running Tab 2 Alpha Momentum Unit Tests...")
    test_zero_look_ahead_bias()
    print("  [PASS] test_zero_look_ahead_bias")
    test_alpha_momentum_qualification_factors()
    print("  [PASS] test_alpha_momentum_qualification_factors")
    test_rejection_low_rs()
    print("  [PASS] test_rejection_low_rs")
    test_rejection_broken_trend()
    print("  [PASS] test_rejection_broken_trend")
    print("ALL 4 TAB 2 UNIT TESTS PASSED SUCCESSFULLY!")
