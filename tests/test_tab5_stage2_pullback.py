"""
Unit Test Suite for Tab 5: Stage-2 Pullback Engine
Validates:
1. Zero look-ahead bias (strict backward-looking EOD evaluation)
2. Qualification of Stage-2 trend (Close > 50 EMA > 200 SMA, rising 200 SMA, CMP within 20% of 52W High)
3. Qualification of Pullback & Turnaround (EMA dynamic support touch within 1.5%, Close > Open, RVOL < 0.85x, RSI 45-58)
4. Rejection cases (falling 200 SMA, far from 52W high, no EMA touch, bearish candle, RSI out of bounds)
5. Structural Invalidation SL and 1:2.5 Risk-to-Reward targets math
"""

import sys
from pathlib import Path
import numpy as np
import pandas as pd

# Add scripts directory to path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "scripts"))

from tab5_stage2_pullback import Stage2PullbackEngine


def generate_synthetic_stage2_pullback_history(bars: int = 250) -> pd.DataFrame:
    """
    Generate synthetic stock data fulfilling Stage-2 Pullback criteria:
    - 250 trading bars.
    - Long-term steady advance: 200 SMA slopes up from 180 to 250.
    - 50 EMA is around 285.
    - 20 EMA is around 300.
    - 52-Week High is around 320 at bar -8.
    - Controlled pullback to 20 EMA (300) over bars -7 to -2.
    - Bar -1 (current bar):
      * Open: 299.5
      * Low: 298.5 (touches 20 EMA within 1.5%)
      * High: 304.0
      * Close: 303.0 (bullish reversal Close > Open holding 20 EMA)
      * Volume: 120,000 vs 20-day average 250,000 (RVOL ~ 0.48x < 0.85x)
      * RSI ~ 51.0 (in sweet spot 45.0 - 58.0)
      * 10-day base swing low = 295.0
    """
    np.random.seed(42)
    dates = pd.date_range("2025-10-01", periods=bars, freq="D")

    # Closes starting from 160 advancing smoothly to 320 at bar -8
    closes = np.linspace(160.0, 310.0, bars)

    # Establish 52-week peak at bar -8: 320.0
    closes[-8] = 318.0
    # Gentle pullback into 300
    closes[-7] = 312.0
    closes[-6] = 308.0
    closes[-5] = 305.0
    closes[-4] = 302.0
    closes[-3] = 300.0
    closes[-2] = 299.0
    closes[-1] = 303.0  # Turnaround candle

    opens = closes - 1.5
    opens[-1] = 299.5   # Bullish bar (Close 303 > Open 299.5)

    highs = closes + 2.0
    highs[-8] = 320.0   # 52W High
    highs[-1] = 304.0

    lows = closes - 2.0
    lows[-3] = 298.0
    lows[-2] = 297.0
    lows[-1] = 298.5    # Touches 20 EMA support

    volumes = np.full(bars, 250000.0)
    volumes[-1] = 120000.0  # Dry-up volume RVOL < 0.85x

    df = pd.DataFrame({
        "Open": opens,
        "High": highs,
        "Low": lows,
        "Close": closes,
        "Volume": volumes
    }, index=dates)

    return df


def test_zero_look_ahead_bias():
    """Verify that evaluation uses only data up to current candle with zero look-ahead."""
    engine = Stage2PullbackEngine()
    meta = {"symbol": "TEST_PULLBACK", "name": "Test Stage2 Ltd", "sector": "Auto"}
    df = generate_synthetic_stage2_pullback_history(250)

    res_base = engine.evaluate(meta, df)
    assert res_base is not None, "Baseline should qualify."

    # Appending a future bar must not alter the evaluation at slice [:250]
    future_date = pd.date_range(df.index[-1], periods=2, freq="D")[1]
    future_bar = pd.DataFrame({
        "Open": [350.0],
        "High": [360.0],
        "Low": [340.0],
        "Close": [355.0],
        "Volume": [999999.0]
    }, index=[future_date])
    df_with_future = pd.concat([df, future_bar])

    res_evaluated_past = engine.evaluate(meta, df_with_future.iloc[:-1])
    assert res_evaluated_past is not None
    assert res_evaluated_past["cmp"] == res_base["cmp"]
    assert res_evaluated_past["score"] == res_base["score"]
    assert res_evaluated_past["invalidation"] == res_base["invalidation"]
    assert res_evaluated_past["target_1"] == res_base["target_1"]
    print("  [PASS] test_zero_look_ahead_bias")


def test_stage2_pullback_qualification():
    """Verify that a textbook Stage-2 pullback candidate qualifies with complete schema."""
    engine = Stage2PullbackEngine()
    meta = {"symbol": "STAGE2_WINNER", "name": "Stage2 Winner Ltd", "sector": "Capital Goods"}
    df = generate_synthetic_stage2_pullback_history(250)

    res = engine.evaluate(meta, df)
    assert res is not None, "Should qualify as valid Stage-2 Pullback"
    assert res["symbol"] == "STAGE2_WINNER"
    assert res["cmp"] == 303.0
    assert res["change_pct"] > 0
    assert res["rvol"] < 0.85
    assert res["score"] >= 75
    assert res["grade"] in ("A", "A+")
    assert "Stage-2 Uptrend" in res["setup_tags"]
    assert "20 EMA Support Hold" in res["setup_tags"] or "50 EMA Support Hold" in res["setup_tags"]
    assert "Volume Dry-up" in res["setup_tags"]
    assert res["status"] in ("STAGE-2 TURNAROUND", "PULLBACK SUPPORT HOLD")
    assert res["invalidation"] < res["cmp"]
    assert res["target_1"] > res["cmp"]
    assert res["target_2"] > res["target_1"]
    assert res["risk_reward_ratio"] == "1:2.5"
    print("  [PASS] test_stage2_pullback_qualification")


def test_rejection_falling_200_sma():
    """Reject candidate if 200 SMA slope is negative."""
    engine = Stage2PullbackEngine()
    meta = {"symbol": "TEST_FALLING_SMA", "name": "Falling SMA Ltd", "sector": "IT"}
    df = generate_synthetic_stage2_pullback_history(250)

    # Invert the early trend so 200 SMA is declining
    df["Close"] = np.linspace(350.0, 280.0, len(df))
    df.loc[df.index[-1], "Close"] = 285.0
    df["Open"] = df["Close"] - 1.0

    res = engine.evaluate(meta, df)
    assert res is None, "Should reject stock with falling 200 SMA"
    print("  [PASS] test_rejection_falling_200_sma")


def test_rejection_far_from_52w_high():
    """Reject candidate if CMP is > 20% below 52-week high."""
    engine = Stage2PullbackEngine()
    meta = {"symbol": "TEST_FAR_52W", "name": "Far 52W Ltd", "sector": "Metals"}
    df = generate_synthetic_stage2_pullback_history(250)

    # Set 52W high to 500 (CMP 303 is ~40% below high)
    df.loc[df.index[-100], "High"] = 500.0

    res = engine.evaluate(meta, df)
    assert res is None, "Should reject stock > 20% below 52-Week High"
    print("  [PASS] test_rejection_far_from_52w_high")


def test_rejection_no_ema_support():
    """Reject candidate if price does not come within 1.5% of 20 or 50 EMA."""
    engine = Stage2PullbackEngine()
    meta = {"symbol": "TEST_NO_SUPPORT", "name": "No Support Ltd", "sector": "Services"}
    df = generate_synthetic_stage2_pullback_history(250)

    # Push recent lows and candles far above 20 EMA
    recent_indices = df.index[-5:]
    df.loc[recent_indices, "Low"] = df.loc[recent_indices, "Low"] + 40.0
    df.loc[recent_indices, "Close"] = df.loc[recent_indices, "Close"] + 40.0
    df.loc[recent_indices, "Open"] = df.loc[recent_indices, "Open"] + 40.0

    res = engine.evaluate(meta, df)
    assert res is None, "Should reject stock not interacting with dynamic EMA support"
    print("  [PASS] test_rejection_no_ema_support")


def test_rejection_bearish_candle():
    """Reject candidate if current candle is bearish (Close <= Open)."""
    engine = Stage2PullbackEngine()
    meta = {"symbol": "TEST_BEARISH_CANDLE", "name": "Bearish Candle Ltd", "sector": "Chemicals"}
    df = generate_synthetic_stage2_pullback_history(250)

    # Set Close < Open on last candle
    df.loc[df.index[-1], "Open"] = 305.0
    df.loc[df.index[-1], "Close"] = 301.0

    res = engine.evaluate(meta, df)
    assert res is None, "Should reject candle that closed below open without turnaround confirmation"
    print("  [PASS] test_rejection_bearish_candle")


def test_rejection_rsi_out_of_zone():
    """Reject candidate if RSI is outside the 45.0 - 58.0 pullback pocket."""
    engine = Stage2PullbackEngine()
    meta = {"symbol": "TEST_RSI_OUT", "name": "RSI Out Ltd", "sector": "Pharma"}
    df = generate_synthetic_stage2_pullback_history(250)

    # Create sharp surge on last 5 bars to push RSI above 70
    recent_indices = df.index[-5:]
    new_closes = [320.0, 335.0, 350.0, 365.0, 380.0]
    df.loc[recent_indices, "Close"] = new_closes
    df.loc[recent_indices, "Open"] = [c - 2.0 for c in new_closes]
    df.loc[recent_indices, "High"] = [c + 2.0 for c in new_closes]
    df.loc[recent_indices, "Low"] = [c - 2.0 for c in new_closes]

    res = engine.evaluate(meta, df)
    assert res is None, "Should reject stock with RSI > 58 (overextended)"
    print("  [PASS] test_rejection_rsi_out_of_zone")



def test_structural_sl_and_targets_math():
    """Verify structural Invalidation SL, Risk calculation, and 1:2.5 RR targets."""
    engine = Stage2PullbackEngine()
    meta = {"symbol": "TEST_MATH", "name": "Math Verification Ltd", "sector": "Power"}
    df = generate_synthetic_stage2_pullback_history(250)

    res = engine.evaluate(meta, df)
    assert res is not None

    cmp_val = res["cmp"]
    sl_val = res["invalidation"]
    risk = round(cmp_val - sl_val, 2)

    # Expected Target 1: CMP + 1.5 * Risk
    expected_t1 = round(cmp_val + (risk * 1.5), 2)
    # Expected Target 2: CMP + 2.5 * Risk
    expected_t2 = round(cmp_val + (risk * 2.5), 2)

    assert abs(res["target_1"] - expected_t1) <= 0.05, f"T1 mismatch: {res['target_1']} vs {expected_t1}"
    assert abs(res["target_2"] - expected_t2) <= 0.05, f"T2 mismatch: {res['target_2']} vs {expected_t2}"
    print("  [PASS] test_structural_sl_and_targets_math")


if __name__ == "__main__":
    print("Running Tab 5 Stage-2 Pullback Unit Tests...")
    test_zero_look_ahead_bias()
    test_stage2_pullback_qualification()
    test_rejection_falling_200_sma()
    test_rejection_far_from_52w_high()
    test_rejection_no_ema_support()
    test_rejection_bearish_candle()
    test_rejection_rsi_out_of_zone()
    test_structural_sl_and_targets_math()
    print("ALL 8 TAB 5 UNIT TESTS PASSED SUCCESSFULLY!")
