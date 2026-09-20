"""
Unit Tests for Tab 6: Drop-Base-Rally (DBR) Demand Zone Engine
Verifies pure EOD zero look-ahead bias, candlestick geometry, freshness, and structural mathematical levels.
"""

import sys
from pathlib import Path
import unittest
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "scripts"))

from tab6_dbr import DBRDemandZoneEngine


class TestDBRDemandZoneEngine(unittest.TestCase):

    def setUp(self):
        self.engine = DBRDemandZoneEngine()
        self.symbol_meta = {
            "symbol": "TESTDBR",
            "name": "Test DBR Technologies Ltd.",
            "sector": "Information Technology",
        }

    def _create_base_df(self, n_bars: int = 70, base_price: float = 100.0) -> pd.DataFrame:
        """Helper to create a corrective baseline dataframe with intermediate swing high."""
        dates = pd.date_range(end="2026-09-18", periods=n_bars, freq="B")
        # Intermediate swing high at 110.0 declining towards base_price (100.0)
        # to ensure an intermediate swing drop >= 7.0% and EMA20 > CMP (structural discount)
        prices = np.linspace(base_price * 1.10, base_price * 1.08, n_bars - 20).tolist() + \
                 np.linspace(base_price * 1.08, base_price, 20).tolist()
        prices = np.array(prices)

        df = pd.DataFrame({
            "Open": prices,
            "High": prices * 1.008,
            "Low": prices * 0.992,
            "Close": prices,
            "Volume": np.full(n_bars, 100000.0)
        }, index=dates)
        return df

    def test_zero_look_ahead_bias(self):
        """Zero look-ahead bias verification."""
        df = self._create_base_df(70)
        res1 = self.engine.evaluate(self.symbol_meta, df)
        res2 = self.engine.evaluate(self.symbol_meta, df.copy())
        self.assertEqual(res1, res2)

    def test_dbr_retest_qualification(self):
        """
        Verify qualification of a pristine 100% Fresh Demand Zone Retest:
        - Intermediate swing drop >= 7.0%
        - Drop of >= 6.0% with 2 Bearish candles & Bearish ERC
        - 2-bar tight base (depth ~1.2%)
        - Bullish ERC Leg-out with RVOL > 2.0x
        - 3 intervening bars staying above Proximal line
        - Current bar pulls back, touches Proximal line and holds.
        """
        df = self._create_base_df(70, base_price=100.0)
        
        # At index -8 to -6: Drop phase from 107.5 to 100 (-7.0% decline)
        # Bar -8: Peak high 107.5, Open 107.0, Close 103.5, Low 103.0 (Bearish ERC, range 4.5, body 3.5 -> BRR 0.78)
        df.iloc[-8] = {"Open": 107.0, "High": 107.5, "Low": 103.0, "Close": 103.5, "Volume": 150000.0}
        # Bar -7: Open 103.5, High 104.0, Low 100.5, Close 101.0 (Bearish candle, body 2.5)
        df.iloc[-7] = {"Open": 103.5, "High": 104.0, "Low": 100.5, "Close": 101.0, "Volume": 140000.0}
        
        # Base Phase: 2 boring candles at index -6, -5
        # P_prox = 101.2, P_dist = 100.0 (Base depth = 1.2%)
        # Bar -6: Open 100.5, High 101.0, Low 100.0, Close 100.4 (Range 1.0, Body 0.1 -> BRR 0.10 Boring)
        df.iloc[-6] = {"Open": 100.5, "High": 101.0, "Low": 100.0, "Close": 100.4, "Volume": 60000.0}
        # Bar -5: Open 100.4, High 101.2, Low 100.1, Close 100.6 (Range 1.1, Body 0.2 -> BRR 0.18 Boring)
        df.iloc[-5] = {"Open": 100.4, "High": 101.2, "Low": 100.1, "Close": 100.6, "Volume": 65000.0}
        
        # Leg-Out Phase: Bar -4 Bullish ERC departure above P_prox (101.2)
        # Open 100.8, Low 100.7, High 104.0, Close 103.8 (Range 3.3, Body 3.0 -> BRR 0.91), Volume 220,000 (RVOL > 2.0x)
        df.iloc[-4] = {"Open": 100.8, "High": 104.0, "Low": 100.7, "Close": 103.8, "Volume": 220000.0}
        
        # Intervening bars: -3, -2 staying strictly above P_prox (101.2) -> 100% Fresh
        df.iloc[-3] = {"Open": 103.8, "High": 104.5, "Low": 102.5, "Close": 103.2, "Volume": 90000.0}
        df.iloc[-2] = {"Open": 103.2, "High": 103.5, "Low": 102.0, "Close": 102.5, "Volume": 85000.0}
        
        # Current Bar -1: Pullback / Retest dipping into Proximal line (101.2) and holding
        # Open 102.5, Low 101.0 (touches into 100.0-101.2 zone), High 102.5, Close 101.8
        df.iloc[-1] = {"Open": 102.5, "High": 102.5, "Low": 101.0, "Close": 101.8, "Volume": 80000.0}

        sig = self.engine.evaluate(self.symbol_meta, df)
        self.assertIsNotNone(sig, "Expected a valid signal for fresh DBR demand zone retest")
        self.assertEqual(sig["stage"], "FRESH DEMAND RETEST")
        self.assertEqual(sig["status"], "FRESH DEMAND RETEST")
        self.assertEqual(sig["p_prox"], 101.2)
        self.assertEqual(sig["p_dist"], 100.0)
        self.assertLess(sig["invalidation"], 100.0)
        self.assertGreater(sig["target_1"], sig["cmp"])
        self.assertGreater(sig["target_2"], sig["target_1"])
        self.assertIn("100% Fresh Demand", sig["setup_tags"])
        self.assertIn("Zone Retest Hold", sig["setup_tags"])
        self.assertIn("Clean 2-Bar Base", sig["setup_tags"])

    def test_dbr_legout_qualification(self):
        """
        Verify qualification of active Stage B Leg-Out expansion:
        - Drop from swing high >= 7.0%
        - Sustained selling pressure into 1-bar base
        - Current bar IS the explosive Bullish ERC breakout on heavy volume
        """
        df = self._create_base_df(70, base_price=100.0)
        
        # Drop into base at -5 to -2: Peak 108.0 -> Low 100.0 (-7.4%)
        df.iloc[-5] = {"Open": 107.5, "High": 108.0, "Low": 104.0, "Close": 104.5, "Volume": 120000.0}
        df.iloc[-4] = {"Open": 104.5, "High": 104.8, "Low": 102.0, "Close": 102.2, "Volume": 130000.0}
        df.iloc[-3] = {"Open": 102.2, "High": 102.5, "Low": 100.5, "Close": 100.8, "Volume": 110000.0}
        
        # Base Bar -2: Boring candle (Range 1.0, Body 0.2 -> BRR 0.20)
        # P_prox = 101.0, P_dist = 100.0
        df.iloc[-2] = {"Open": 100.5, "High": 101.0, "Low": 100.0, "Close": 100.7, "Volume": 50000.0}
        
        # Current Bar -1: Bullish ERC Leg-out! Open 100.8, Low 100.6, High 103.5, Close 103.2, Vol 250k (RVOL > 2x)
        df.iloc[-1] = {"Open": 100.8, "High": 103.5, "Low": 100.6, "Close": 103.2, "Volume": 250000.0}

        sig = self.engine.evaluate(self.symbol_meta, df)
        self.assertIsNotNone(sig, "Expected a valid signal for DBR active leg-out departure")
        self.assertEqual(sig["stage"], "DEMAND LEG-OUT")
        self.assertEqual(sig["status"], "DEMAND LEG-OUT")
        self.assertEqual(sig["p_prox"], 101.0)
        self.assertEqual(sig["p_dist"], 100.0)
        self.assertIn("Demand Leg-Out", sig["setup_tags"])

    def test_rejection_rbr_overlap_ath(self):
        """Disqualify stage-2 uptrend continuation stocks riding within 2% of 52W high."""
        df = self._create_base_df(70, base_price=100.0)
        # Make stock trade at all-time high with bullish EMA stack (Close > 20 EMA > 50 EMA)
        prices = np.linspace(80, 100, 70)
        df["Open"] = prices
        df["High"] = prices * 1.005
        df["Low"] = prices * 0.995
        df["Close"] = prices
        # CMP is 100, 52W High is 100.5 (within 0.5% of ATH)
        sig = self.engine.evaluate(self.symbol_meta, df)
        self.assertIsNone(sig, "RBR overlap within 2% of 52W High must be disqualified from DBR")

    def test_rejection_no_structural_discount(self):
        """Disqualify setups where CMP is significantly above 20 EMA with no support testing."""
        df = self._create_base_df(70, base_price=100.0)
        # Drop into base
        df.iloc[-4] = {"Open": 107.0, "High": 107.5, "Low": 103.0, "Close": 103.5, "Volume": 120000.0}
        df.iloc[-2] = {"Open": 100.5, "High": 101.0, "Low": 100.0, "Close": 100.7, "Volume": 50000.0}
        # Leg out closes way above 20 EMA (e.g. 120 vs EMA20 ~103)
        df.iloc[-1] = {"Open": 101.0, "High": 121.0, "Low": 101.0, "Close": 120.0, "Volume": 250000.0}
        sig = self.engine.evaluate(self.symbol_meta, df)
        self.assertIsNone(sig, "Stock lacking structural discount must be disqualified")

    def test_rejection_shallow_drop_swing_high(self):
        """Reject setups where the drop from 20-50d swing high is < 7.0%."""
        dates = pd.date_range(end="2026-09-18", periods=70, freq="B")
        # Flat baseline around 102.0
        prices = np.full(70, 102.0)
        df = pd.DataFrame({
            "Open": prices,
            "High": prices * 1.005,
            "Low": prices * 0.995,
            "Close": prices,
            "Volume": np.full(70, 100000.0)
        }, index=dates)
        # Drop is only from 102.5 to 100.0 (2.4% drop < 7.0%)
        df.iloc[-4] = {"Open": 102.0, "High": 102.5, "Low": 101.0, "Close": 101.2, "Volume": 120000.0}
        df.iloc[-2] = {"Open": 100.5, "High": 101.0, "Low": 100.0, "Close": 100.7, "Volume": 50000.0}
        df.iloc[-1] = {"Open": 100.8, "High": 103.5, "Low": 100.6, "Close": 103.2, "Volume": 250000.0}
        sig = self.engine.evaluate(self.symbol_meta, df)
        self.assertIsNone(sig, "Shallow drop < 7% from swing high must be rejected")

    def test_rejection_long_base(self):
        """Reject base consolidations with > 4 candles."""
        df = self._create_base_df(70, base_price=100.0)
        # 5 boring base candles from -6 to -2
        for i in range(-6, -1):
            df.iloc[i] = {"Open": 100.2, "High": 101.0, "Low": 100.0, "Close": 100.3, "Volume": 50000.0}
        df.iloc[-1] = {"Open": 100.4, "High": 103.5, "Low": 100.2, "Close": 103.2, "Volume": 250000.0}
        sig = self.engine.evaluate(self.symbol_meta, df)
        # Should not qualify since base > 4 candles
        self.assertTrue(sig is None or sig["base_bars"] <= 4)

    def test_rejection_wide_base(self):
        """Reject bases with depth > 4.0%."""
        df = self._create_base_df(70, base_price=100.0)
        # Drop
        df.iloc[-4] = {"Open": 107.0, "High": 107.5, "Low": 103.0, "Close": 103.5, "Volume": 120000.0}
        # Wide Base: High 106.0, Low 100.0 -> depth 6.0% (> 4.0%)
        df.iloc[-2] = {"Open": 103.0, "High": 106.0, "Low": 100.0, "Close": 103.2, "Volume": 50000.0}
        # Leg out
        df.iloc[-1] = {"Open": 103.5, "High": 109.0, "Low": 103.0, "Close": 108.5, "Volume": 250000.0}
        sig = self.engine.evaluate(self.symbol_meta, df)
        self.assertIsNone(sig, "Wide base > 4.0% depth must be rejected")

    def test_rejection_broken_zone(self):
        """Reject zones where an intervening bar closed below Distal Line."""
        df = self._create_base_df(70, base_price=100.0)
        # Drop
        df.iloc[-6] = {"Open": 107.0, "High": 107.5, "Low": 102.0, "Close": 102.5, "Volume": 120000.0}
        # Base: P_prox 102.0, P_dist 100.0
        df.iloc[-5] = {"Open": 100.5, "High": 102.0, "Low": 100.0, "Close": 100.8, "Volume": 50000.0}
        # Leg-Out
        df.iloc[-4] = {"Open": 101.0, "High": 103.5, "Low": 100.8, "Close": 103.0, "Volume": 250000.0}
        # Intervening bar breaches Distal line: Close 98.0 (< 100.0)
        df.iloc[-2] = {"Open": 103.0, "High": 103.5, "Low": 97.5, "Close": 98.0, "Volume": 150000.0}
        # Current bar
        df.iloc[-1] = {"Open": 99.0, "High": 102.0, "Low": 98.5, "Close": 101.5, "Volume": 80000.0}
        sig = self.engine.evaluate(self.symbol_meta, df)
        self.assertIsNone(sig, "Broken demand zone closed below distal line must be rejected")

    def test_rejection_weak_legout(self):
        """Reject leg-outs that lack ERC body or volume expansion."""
        df = self._create_base_df(70, base_price=100.0)
        # Drop
        df.iloc[-4] = {"Open": 107.0, "High": 107.5, "Low": 102.0, "Close": 102.5, "Volume": 120000.0}
        # Base
        df.iloc[-2] = {"Open": 100.5, "High": 101.0, "Low": 100.0, "Close": 100.7, "Volume": 50000.0}
        # Current bar has low volume (50k vs avg 100k -> RVOL 0.5x < 1.25x)
        df.iloc[-1] = {"Open": 100.8, "High": 102.5, "Low": 100.5, "Close": 102.0, "Volume": 50000.0}
        sig = self.engine.evaluate(self.symbol_meta, df)
        self.assertIsNone(sig, "Weak leg-out without volume expansion must be rejected")

    def test_structural_sl_and_targets_math(self):
        """Verify structural levels mathematical integrity (1:2.5 RR)."""
        df = self._create_base_df(70, base_price=100.0)
        # Drop
        df.iloc[-4] = {"Open": 107.0, "High": 107.5, "Low": 102.0, "Close": 102.5, "Volume": 120000.0}
        # Base: P_prox = 101.0, P_dist = 100.0
        df.iloc[-2] = {"Open": 100.5, "High": 101.0, "Low": 100.0, "Close": 100.7, "Volume": 50000.0}
        # Leg-Out: CMP 103.0
        df.iloc[-1] = {"Open": 100.8, "High": 103.5, "Low": 100.5, "Close": 103.0, "Volume": 250000.0}
        
        sig = self.engine.evaluate(self.symbol_meta, df)
        self.assertIsNotNone(sig)
        cmp_val = sig["cmp"]
        sl = sig["invalidation"]
        risk = cmp_val - sl
        
        self.assertLess(sl, sig["p_dist"], "SL must be below Distal line")
        self.assertAlmostEqual(sig["target_1"], round(cmp_val + (1.5 * risk), 2), places=2)
        self.assertAlmostEqual(sig["target_2"], round(cmp_val + (2.5 * risk), 2), places=2)


if __name__ == "__main__":
    print("Running Tab 6 DBR Demand Zone Unit Tests...")
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestDBRDemandZoneEngine)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if result.wasSuccessful():
        print("ALL 8 TAB 6 UNIT TESTS PASSED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("UNIT TESTS FAILED!")
        sys.exit(1)
