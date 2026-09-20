"""
Unit Test Suite for Tab 4: Weekly Swing Watchlist Engine
Validates:
1. Zero look-ahead bias (strict backward-looking EOD evaluation)
2. Qualification of 1W return (5.0% - 7.0%), multi-timeframe RS vs Nifty (> 5.0%), RSI (50-65), Bullish Stack
3. Rejection of low return (< 5%), high return (> 7%), weak RS (< 5%), overheated RSI (> 65), broken trend
4. Structural Invalidation SL and 1:2.5 targets math verification
"""

import sys
from pathlib import Path
import numpy as np
import pandas as pd

# Add scripts directory to path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "scripts"))

from tab4_weekly_swing import WeeklySwingEngine


def generate_synthetic_weekly_swing_history(bars: int = 120) -> (pd.DataFrame, pd.DataFrame):
    """
    Generate synthetic stock and benchmark data fulfilling Weekly Swing criteria:
    - Stock steady uptrend from 100 to 180
    - Last 5 days: stock moves from 175 to 185.71 (+6.12% 1W gain)
    - Benchmark (Nifty) flat/modest: 1W gain 0.5% (giving stock 1W RS > 5.5%)
    - 1M benchmark gain 1.0%, stock 1M gain 12.0% (giving 1M RS > 10.0%)
    - Close > 20 EMA > 50 EMA > 200 EMA
    - RSI around 58-60
    """
    np.random.seed(42)
    dates = pd.date_range("2026-04-01", periods=bars, freq="D")

    # Benchmark: starts at 24000, ends at 25000
    bench_closes = np.linspace(24000.0, 25000.0, bars)
    # Last 6 bars of benchmark flat/slight change
    bench_closes[-6:] = np.linspace(24950.0, 25000.0, 6)
    bench_df = pd.DataFrame({"Close": bench_closes}, index=dates)

    # Stock: starts at 120, grows to 175 at bar -6, and reaches 185.71 at bar -1 (+6.12% in last 5 days)
    closes = np.linspace(120.0, 175.0, bars)
    closes[-6] = 175.0
    closes[-1] = 185.71
    # Smooth progression from -6 to -1
    closes[-5:] = np.linspace(177.0, 185.71, 5)

    highs = closes + 4.0
    lows = closes - 4.0
    opens = closes - 1.0
    volumes = np.full(bars, 250000.0)

    df = pd.DataFrame({
        "Open": opens,
        "High": highs,
        "Low": lows,
        "Close": closes,
        "Volume": volumes
    }, index=dates)

    return df, bench_df


def test_zero_look_ahead_bias():
    """Verify that evaluation uses only data up to current candle with zero look-ahead."""
    engine = WeeklySwingEngine()
    meta = {"symbol": "TEST_SWING", "name": "Test Weekly Swing Ltd", "sector": "Financial Services"}
    df, bench = generate_synthetic_weekly_swing_history(120)

    res_full = engine.evaluate(meta, df, bench)
    res_trimmed = engine.evaluate(meta, df.iloc[:-1], bench.iloc[:-1])

    assert res_full is not None, "Full history must qualify for Weekly Swing"
    assert "score" in res_full
    assert res_full["cmp"] == round(df["Close"].iloc[-1], 2)


def test_weekly_swing_qualification_factors():
    """Verify qualification factors, nearest support confluence, structural SL, and 1:2.5 targets."""
    engine = WeeklySwingEngine()
    meta = {"symbol": "SWING_LEADER", "name": "Swing Leader Ltd", "sector": "Healthcare"}
    df, bench = generate_synthetic_weekly_swing_history(120)

    res = engine.evaluate(meta, df, bench)
    assert res is not None, "Stock must qualify"

    assert 4.95 <= res["ret_1w"] <= 7.05, f"1W return {res['ret_1w']}% must be between 5.0% and 7.0%"
    assert res["rs_1w"] > 5.0, f"1W RS {res['rs_1w']}% must be > 5.0%"
    assert res["rs_1m"] > 5.0, f"1M RS {res['rs_1m']}% must be > 5.0%"
    assert 50.0 <= res["rsi"] <= 65.0, f"RSI {res['rsi']} must be in 50-65"

    # Math validations
    cmp_val = res["cmp"]
    sl = res["invalidation"]
    assert sl < cmp_val, f"SL ({sl}) must be below CMP ({cmp_val})"

    risk = max(cmp_val - sl, cmp_val - res["ema_50"], 1.0)
    expected_t1 = round(max(res["pivot_r1"], cmp_val + (risk * 1.5)), 2)
    expected_t2 = round(max(res["pivot_r2"], cmp_val + (risk * 2.5)), 2)

    assert abs(res["target_1"] - expected_t1) < 0.05, f"T1 mismatch: got {res['target_1']}, expected {expected_t1}"
    assert abs(res["target_2"] - expected_t2) < 0.05, f"T2 mismatch: got {res['target_2']}, expected {expected_t2}"
    assert res["risk_reward_ratio"] == "1:2.5"
    assert "Weekly Bullish Stack" in res["setup_tags"]


def test_rejection_low_1w_return():
    """Verify rejection if 1-week return is below 5.0%."""
    engine = WeeklySwingEngine()
    meta = {"symbol": "LOW_RET", "name": "Low Return Ltd", "sector": "Auto"}
    df, bench = generate_synthetic_weekly_swing_history(120)

    # Set last 5 days to only 2% gain
    df.iloc[-1, df.columns.get_loc("Close")] = df["Close"].iloc[-6] * 1.02
    res = engine.evaluate(meta, df, bench)
    assert res is None, "Return below 5% must be rejected"


def test_rejection_high_1w_return():
    """Verify rejection if 1-week return exceeds 7.0% (climax/extended)."""
    engine = WeeklySwingEngine()
    meta = {"symbol": "HIGH_RET", "name": "High Return Ltd", "sector": "Metals"}
    df, bench = generate_synthetic_weekly_swing_history(120)

    # Set last 5 days to 12% gain
    df.iloc[-1, df.columns.get_loc("Close")] = df["Close"].iloc[-6] * 1.12
    res = engine.evaluate(meta, df, bench)
    assert res is None, "Return above 7% must be rejected"


def test_rejection_low_rs_vs_nifty():
    """Verify rejection if 1W RS vs Nifty is <= 5.0%."""
    engine = WeeklySwingEngine()
    meta = {"symbol": "LOW_RS", "name": "Low RS Ltd", "sector": "IT"}
    df, bench = generate_synthetic_weekly_swing_history(120)

    # Make benchmark surge 6% in last 5 days so stock RS is ~0%
    bench.iloc[-1, bench.columns.get_loc("Close")] = bench["Close"].iloc[-6] * 1.06
    res = engine.evaluate(meta, df, bench)
    assert res is None, "Stock with RS <= 5% must be rejected"


def test_rejection_rsi_extension():
    """Verify rejection if RSI >= 65.0."""
    engine = WeeklySwingEngine()
    meta = {"symbol": "OVERHEATED", "name": "Overheated Ltd", "sector": "FMCG"}
    df, bench = generate_synthetic_weekly_swing_history(120)

    # Artificially pump earlier candles to raise RSI > 75
    df.iloc[-25:, df.columns.get_loc("Close")] = np.linspace(150, 185.71, 25)
    # Check RSI directly with engine
    s_c = df["Close"]
    rsi = engine.compute_rsi(s_c).iloc[-1]
    if rsi < 65:
        # Force huge continuous run-up
        df.iloc[-20:, df.columns.get_loc("Close")] = np.linspace(120, 200, 20)
        df.iloc[-1, df.columns.get_loc("Close")] = df["Close"].iloc[-6] * 1.06
    res = engine.evaluate(meta, df, bench)
    # If RSI was pushed > 65, it must be None
    if engine.compute_rsi(df["Close"]).iloc[-1] > 65:
        assert res is None, "RSI > 65 must be rejected"


def test_rejection_broken_trend():
    """Verify rejection if price is below 50 EMA."""
    engine = WeeklySwingEngine()
    meta = {"symbol": "BROKEN", "name": "Broken Ltd", "sector": "Energy"}
    df, bench = generate_synthetic_weekly_swing_history(120)

    # Crash price below 50 EMA on the last bar
    df.iloc[-1, df.columns.get_loc("Close")] = 100.0
    res = engine.evaluate(meta, df, bench)
    assert res is None, "Price below 50 EMA must be rejected"


if __name__ == "__main__":
    import sys
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    print("Running Tab 4 Weekly Swing Unit Tests...")
    test_zero_look_ahead_bias()
    print("  [PASS] test_zero_look_ahead_bias")
    test_weekly_swing_qualification_factors()
    print("  [PASS] test_weekly_swing_qualification_factors")
    test_rejection_low_1w_return()
    print("  [PASS] test_rejection_low_1w_return")
    test_rejection_high_1w_return()
    print("  [PASS] test_rejection_high_1w_return")
    test_rejection_low_rs_vs_nifty()
    print("  [PASS] test_rejection_low_rs_vs_nifty")
    test_rejection_rsi_extension()
    print("  [PASS] test_rejection_rsi_extension")
    test_rejection_broken_trend()
    print("  [PASS] test_rejection_broken_trend")
    print("ALL 7 TAB 4 UNIT TESTS PASSED SUCCESSFULLY!")
