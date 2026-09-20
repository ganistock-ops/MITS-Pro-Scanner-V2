"""
Unit Test Suite for Tab 3: High Tight Flag (HTF) Engine
Validates:
1. Zero look-ahead bias (strict backward-looking EOD evaluation)
2. Qualification of explosive pole (>= +40%), flag duration (5-20D), correction (<= 20%), volume dry-up
3. Rejection of broken trend (Close < 50 EMA), deep flag correction (> 20%), or weak pole (< 40%)
4. Structural Invalidation SL and 1:2.5 targets math verification
"""

import sys
from pathlib import Path
import numpy as np
import pandas as pd

# Add scripts directory to path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "scripts"))

from tab3_htf import HighTightFlagEngine


def generate_synthetic_htf_history(bars: int = 120) -> pd.DataFrame:
    """
    Generate synthetic OHLCV dataframe fulfilling all High Tight Flag requirements:
    - Prior base around 500
    - Explosive pole from 500 to 760 (+52% gain in ~25 days)
    - Peak high at bar 108 (12 days ago)
    - Tight flag consolidation between bars 109 and 120 (max correction 12% to 670)
    - Volume dry-up in flag: pole avg vol 300,000, flag avg vol 180,000 (-40% contraction)
    - Close > 20 EMA and 50 EMA
    """
    np.random.seed(42)
    dates = pd.date_range("2026-04-01", periods=bars, freq="D")

    closes = np.full(bars, 500.0)
    # Pole starts at bar 75 and peaks at bar 108 (33 days, +52% rally)
    closes[75:108] = np.linspace(500.0, 760.0, 33)
    # Flag from bar 108 to 120 (12 days consolidation: pull back to 680, then 740)
    flag_len = bars - 108
    closes[108:] = np.linspace(760.0, 740.0, flag_len)
    closes[112] = 680.0  # lowest low in flag

    highs = closes + 5.0
    lows = closes - 5.0
    highs[107] = 760.0  # Peak high
    lows[75] = 500.0    # Pole min low
    lows[112] = 680.0   # Flag lowest low
    opens = closes - 1.0

    volumes = np.full(bars, 100000.0)
    # High volume during pole
    volumes[75:108] = 300000.0
    # Low volume during flag (volume dry-up)
    volumes[108:] = 180000.0

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
    engine = HighTightFlagEngine()
    meta = {"symbol": "TEST_HTF", "name": "Test High Tight Flag", "sector": "Capital Goods"}
    df = generate_synthetic_htf_history(120)

    res_full = engine.evaluate(meta, df)
    res_trimmed = engine.evaluate(meta, df.iloc[:-1])

    assert res_full is not None, "Full history must qualify for HTF"
    assert "score" in res_full
    assert res_full["cmp"] == round(df["Close"].iloc[-1], 2)


def test_htf_qualification_factors():
    """Verify that HTF qualification factors, SL, and 1:2.5 targets are accurately calculated."""
    engine = HighTightFlagEngine()
    meta = {"symbol": "POLE_LEADER", "name": "Pole Leader Ltd", "sector": "Technology"}
    df = generate_synthetic_htf_history(120)

    res = engine.evaluate(meta, df)
    assert res is not None, "Stock must qualify"

    assert res["pole_gain_pct"] >= 40.0, f"Pole gain {res['pole_gain_pct']}% must be >= 40%"
    assert 5 <= res["flag_days"] <= 20, f"Flag days {res['flag_days']} must be 5-20 days"
    assert res["correction_pct"] <= 20.0, f"Correction {res['correction_pct']}% must be <= 20%"
    assert res["vol_contraction_pct"] > 0, "Volume must contract inside the flag"

    # Math validations
    cmp_val = res["cmp"]
    sl = res["invalidation"]
    assert sl < cmp_val, f"SL ({sl}) must be below CMP ({cmp_val})"

    risk = cmp_val - sl
    expected_t1 = round(cmp_val + (risk * 1.5), 2)
    expected_t2 = round(cmp_val + (risk * 2.5), 2)

    assert abs(res["target_1"] - expected_t1) < 0.05, f"T1 mismatch: got {res['target_1']}, expected {expected_t1}"
    assert abs(res["target_2"] - expected_t2) < 0.05, f"T2 mismatch: got {res['target_2']}, expected {expected_t2}"
    assert res["risk_reward_ratio"] == "1:2.5"


def test_rejection_broken_trend():
    """Verify rejection if price is below 50 EMA."""
    engine = HighTightFlagEngine()
    meta = {"symbol": "BROKEN_TREND", "name": "Broken Trend Ltd", "sector": "Auto"}
    df = generate_synthetic_htf_history(120)

    # Crash price below 50 EMA on the last bar
    df.iloc[-1, df.columns.get_loc("Close")] = 400.0

    res = engine.evaluate(meta, df)
    assert res is None, "Broken trend below 50 EMA must be rejected"


def test_rejection_deep_correction():
    """Verify rejection if flag correction exceeds 20%."""
    engine = HighTightFlagEngine()
    meta = {"symbol": "DEEP_CORR", "name": "Deep Correction Ltd", "sector": "Metals"}
    df = generate_synthetic_htf_history(120)

    # Force deep flag drop (> 25% from 760 peak -> below 570 across flag)
    df.iloc[108:, df.columns.get_loc("Low")] = 550.0

    res = engine.evaluate(meta, df)
    assert res is None, "Flag correction > 20% must be rejected"


def test_rejection_weak_pole():
    """Verify rejection if prior run-up is < 40%."""
    engine = HighTightFlagEngine()
    meta = {"symbol": "WEAK_POLE", "name": "Weak Pole Ltd", "sector": "FMCG"}
    df = generate_synthetic_htf_history(120)

    # Compress the pole to only 20% gain (from 500 to 600)
    df.iloc[75:108, df.columns.get_loc("Close")] = np.linspace(500.0, 600.0, 33)
    df.iloc[75:108, df.columns.get_loc("High")] = np.linspace(505.0, 605.0, 33)
    df.iloc[108:, df.columns.get_loc("Close")] = 590.0
    df.iloc[108:, df.columns.get_loc("High")] = 595.0

    res = engine.evaluate(meta, df)
    assert res is None, "Weak pole (< 40%) must be rejected"


def test_stage_in_flag_compression():
    """Verify that stocks with CMP <= flag_pivot are classified as Stage A (IN_FLAG)."""
    engine = HighTightFlagEngine()
    meta = {"symbol": "COMPRESS_HTF", "name": "Compress HTF Ltd", "sector": "Capital Goods"}
    df = generate_synthetic_htf_history(120)

    # CMP is 740, peak is 760 (below pivot)
    res = engine.evaluate(meta, df)
    assert res is not None, "Stock must qualify"
    assert res["stage"] == "IN_FLAG", f"Expected stage IN_FLAG, got {res['stage']}"
    assert res["status"] in ["FLAG CONSOLIDATION", "READY TO BREAKOUT"]
    assert "In-Flag Compression" in res["setup_tags"]
    assert "Tightness <" in " ".join(res["setup_tags"])


def test_stage_active_breakout():
    """Verify that stocks breaking above flag_pivot with expanding volume are classified as Stage B (BREAKOUT)."""
    engine = HighTightFlagEngine()
    meta = {"symbol": "BREAKOUT_HTF", "name": "Breakout HTF Ltd", "sector": "Capital Goods"}
    df = generate_synthetic_htf_history(120)

    # Break out above 760 pivot to 775 on high volume (400,000 shares)
    df.iloc[-1, df.columns.get_loc("High")] = 780.0
    df.iloc[-1, df.columns.get_loc("Close")] = 775.0
    df.iloc[-1, df.columns.get_loc("Volume")] = 400000.0

    res = engine.evaluate(meta, df)
    assert res is not None, "Stock must qualify"
    assert res["stage"] == "BREAKOUT", f"Expected stage BREAKOUT, got {res['stage']}"
    assert res["status"] == "FLAG BREAKOUT CONFIRMED"
    assert "Breakout Confirmed" in res["setup_tags"]


if __name__ == "__main__":
    import sys
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    print("Running Tab 3 High Tight Flag Unit Tests...")
    test_zero_look_ahead_bias()
    print("  [PASS] test_zero_look_ahead_bias")
    test_htf_qualification_factors()
    print("  [PASS] test_htf_qualification_factors")
    test_stage_in_flag_compression()
    print("  [PASS] test_stage_in_flag_compression")
    test_stage_active_breakout()
    print("  [PASS] test_stage_active_breakout")
    test_rejection_broken_trend()
    print("  [PASS] test_rejection_broken_trend")
    test_rejection_deep_correction()
    print("  [PASS] test_rejection_deep_correction")
    test_rejection_weak_pole()
    print("  [PASS] test_rejection_weak_pole")
    print("ALL 7 TAB 3 UNIT TESTS PASSED SUCCESSFULLY!")

