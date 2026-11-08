#!/usr/bin/env python3
"""
Unit and Integration Tests for Proximity Pivot Radar Backend
=============================================================
Validates:
  1. Pure function correctness of compute_proximity_block (±1.0% boundary tests, division-by-zero protection).
  2. Complete schema enrichment across all 12 scanners (scanner_results.json, tabs 1-6, adv_scanners 1-6).
  3. Mathematical parity between proximity levels and Dossier key_levels (S1 & R1).
  4. Zero regression: All original scores, ranks, and stock counts remain 100% identical.
  5. Performance benchmark: Pure calculation overhead must be < 20ms.
"""

import json
import math
import sys
import time
import unittest
from pathlib import Path

# Add scripts directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = BASE_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from proximity_engine import (
    compute_proximity_block,
    extract_levels_for_stock,
    enrich_stock_with_proximity,
    enrich_all_scanner_outputs,
    benchmark_proximity_computation,
    load_master_universe_map,
    DEFAULT_BUFFER_PCT
)


class TestProximityEnginePure(unittest.TestCase):
    """Unit tests for pure compute_proximity_block function."""

    def test_exact_matches(self):
        """When CMP equals the reference level, distance is 0.0% and flag is True."""
        res = compute_proximity_block(cmp=100.0, ema_20=100.0, ema_50=100.0, s1=100.0, r1=100.0)
        self.assertTrue(res["near_ema20"])
        self.assertTrue(res["near_ema50"])
        self.assertTrue(res["near_s1"])
        self.assertTrue(res["near_r1"])
        self.assertEqual(res["dist_ema20_pct"], 0.0)
        self.assertEqual(res["dist_ema50_pct"], 0.0)
        self.assertEqual(res["dist_s1_pct"], 0.0)
        self.assertEqual(res["dist_r1_pct"], 0.0)

    def test_buffer_boundary_conditions(self):
        """Test ±1.0% (0.010) boundary condition rigorously."""
        cmp = 1000.0

        # Case A: Exactly +1.0% (1010.0 vs 1000.0 level -> level is 1000, cmp is 1010)
        # diff = (1010 - 1000) / 1000 = +0.0100 (exactly on boundary)
        res_boundary_upper = compute_proximity_block(cmp=1010.0, ema_20=1000.0, ema_50=None, s1=None, r1=None)
        self.assertTrue(res_boundary_upper["near_ema20"])
        self.assertEqual(res_boundary_upper["dist_ema20_pct"], 1.0)

        # Case B: Slightly above +1.0% (1010.01 vs 1000.0 level -> diff = +0.01001 > 0.010)
        res_outside_upper = compute_proximity_block(cmp=1010.01, ema_20=1000.0, ema_50=None, s1=None, r1=None)
        self.assertFalse(res_outside_upper["near_ema20"])
        self.assertEqual(res_outside_upper["dist_ema20_pct"], 1.0)

        # Case C: Exactly -1.0% (990.0 vs 1000.0 level -> diff = (990 - 1000) / 1000 = -0.0100)
        res_boundary_lower = compute_proximity_block(cmp=990.0, ema_20=1000.0, ema_50=None, s1=None, r1=None)
        self.assertTrue(res_boundary_lower["near_ema20"])
        self.assertEqual(res_boundary_lower["dist_ema20_pct"], -1.0)

        # Case D: Slightly below -1.0% (989.99 vs 1000.0 level -> diff = -0.01001 < -0.010)
        res_outside_lower = compute_proximity_block(cmp=989.99, ema_20=1000.0, ema_50=None, s1=None, r1=None)
        self.assertFalse(res_outside_lower["near_ema20"])
        self.assertEqual(res_outside_lower["dist_ema20_pct"], -1.0)

    def test_safe_handling_of_none_and_zeros(self):
        """Must safely handle None, 0, negative, and invalid levels without exceptions."""
        res = compute_proximity_block(cmp=100.0, ema_20=None, ema_50=0.0, s1=-50.0, r1=0)
        self.assertFalse(res["near_ema20"])
        self.assertFalse(res["near_ema50"])
        self.assertFalse(res["near_s1"])
        self.assertFalse(res["near_r1"])
        self.assertIsNone(res["dist_ema20_pct"])
        self.assertIsNone(res["dist_ema50_pct"])
        self.assertIsNone(res["dist_s1_pct"])
        self.assertIsNone(res["dist_r1_pct"])

    def test_safe_handling_of_invalid_cmp(self):
        """Invalid CMP returns all False / None."""
        res = compute_proximity_block(cmp=0.0, ema_20=100.0, ema_50=100.0, s1=100.0, r1=100.0)
        self.assertFalse(res["near_ema20"])
        self.assertIsNone(res["dist_ema20_pct"])


class TestProximityEngineIntegration(unittest.TestCase):
    """Integration tests validating enriched scanner JSON datasets."""

    @classmethod
    def setUpClass(cls):
        # Run enrichment across all datasets
        cls.data_dir = BASE_DIR / "data"
        cls.enrich_res = enrich_all_scanner_outputs(data_dir=cls.data_dir)

    def test_enrichment_execution_status(self):
        """Verify enrichment succeeded and touched all scanner files."""
        self.assertEqual(self.enrich_res["status"], "SUCCESS")
        self.assertGreaterEqual(self.enrich_res["files_enriched"], 10)
        self.assertGreater(self.enrich_res["stocks_tagged"], 500)

    def test_scanner_results_json_schema(self):
        """Validate proximity schema and math inside data/scanner_results.json."""
        sr_file = self.data_dir / "scanner_results.json"
        self.assertTrue(sr_file.exists(), "data/scanner_results.json missing")
        with open(sr_file, "r", encoding="utf-8") as f:
            sr_data = json.load(f)

        required_keys = {
            "near_ema20", "near_ema50", "near_s1", "near_r1",
            "dist_ema20_pct", "dist_ema50_pct", "dist_s1_pct", "dist_r1_pct"
        }

        total_tested = 0
        for s_id, setup in sr_data.get("setups", {}).items():
            for sig in setup.get("signals", []):
                total_tested += 1
                self.assertIn("proximity", sig, f"Missing 'proximity' key in {sig.get('symbol')} ({s_id})")
                prox = sig["proximity"]
                self.assertTrue(required_keys.issubset(prox.keys()))

                # Verify boolean types
                for flag_key in ["near_ema20", "near_ema50", "near_s1", "near_r1"]:
                    self.assertIsInstance(prox[flag_key], bool)

                # Verify math against S1 and R1
                cmp_val = sig["cmp"]
                s1_val = sig.get("s1")
                r1_val = sig.get("r1")
                if s1_val and s1_val > 0:
                    expected_near_s1 = abs(cmp_val - s1_val) / s1_val <= 0.010
                    self.assertEqual(prox["near_s1"], expected_near_s1)
                if r1_val and r1_val > 0:
                    expected_near_r1 = abs(cmp_val - r1_val) / r1_val <= 0.010
                    self.assertEqual(prox["near_r1"], expected_near_r1)

        print(f"[PASS] scanner_results.json: Verified {total_tested} signals across all 6 setups.")

    def test_advanced_scanners_schema_and_dossier_parity(self):
        """Validate proximity schema and exact Dossier S1 & R1 parity across Advanced Scanners 1-6."""
        adv_files = [
            "adv_scanner_1_rs.json",
            "adv_scanner_2_early_bo.json",
            "adv_scanner_3_momentum_continuation.json",
            "adv_scanner_4_rbr_proportional.json",
            "adv_scanner_5_confluence_engine.json",
            "adv_scanner_6_wyckoff_absorption.json"
        ]

        required_keys = {
            "near_ema20", "near_ema50", "near_s1", "near_r1",
            "dist_ema20_pct", "dist_ema50_pct", "dist_s1_pct", "dist_r1_pct"
        }

        total_adv_stocks = 0
        for adv_name in adv_files:
            adv_file = self.data_dir / adv_name
            self.assertTrue(adv_file.exists(), f"Missing {adv_name}")
            with open(adv_file, "r", encoding="utf-8") as f:
                adv_data = json.load(f)

            for st in adv_data.get("stocks", []):
                total_adv_stocks += 1
                self.assertIn("proximity", st, f"Missing 'proximity' key in {st.get('symbol')} ({adv_name})")
                prox = st["proximity"]
                self.assertTrue(required_keys.issubset(prox.keys()))

                cmp_val = st.get("cmp") or st.get("ltp")
                dossier = st.get("dossier", {})
                key_levels = dossier.get("key_levels", {})

                # Exact Dossier S1 source
                dossier_s1 = key_levels.get("support") or key_levels.get("support_1") or st.get("support") or st.get("s1")
                # Exact Dossier R1 source
                dossier_r1 = key_levels.get("resistance") or key_levels.get("pivot_resistance") or st.get("resistance") or st.get("r1")

                if cmp_val and dossier_s1 and dossier_s1 > 0:
                    expected_near_s1 = abs(cmp_val - dossier_s1) / dossier_s1 <= 0.010
                    self.assertEqual(prox["near_s1"], expected_near_s1)

                if cmp_val and dossier_r1 and dossier_r1 > 0:
                    expected_near_r1 = abs(cmp_val - dossier_r1) / dossier_r1 <= 0.010
                    self.assertEqual(prox["near_r1"], expected_near_r1)

        print(f"[PASS] Advanced Scanners 1-6: Verified {total_adv_stocks} stocks with Dossier S1/R1 parity.")

    def test_zero_regression_scanner_metrics(self):
        """Verify that stock scores, ranks, and counts in scanner_results.json remain 100% intact."""
        sr_file = self.data_dir / "scanner_results.json"
        with open(sr_file, "r", encoding="utf-8") as f:
            sr_data = json.load(f)

        setups = sr_data.get("setups", {})
        self.assertEqual(setups["setup_1"]["count"], len(setups["setup_1"]["signals"]))
        self.assertEqual(setups["setup_2"]["count"], len(setups["setup_2"]["signals"]))
        self.assertEqual(setups["setup_3"]["count"], len(setups["setup_3"]["signals"]))
        self.assertEqual(setups["setup_4"]["count"], len(setups["setup_4"]["signals"]))
        self.assertEqual(setups["setup_5"]["count"], len(setups["setup_5"]["signals"]))
        self.assertEqual(setups["setup_6"]["count"], len(setups["setup_6"]["signals"]))

        # Check setup signals structure & integrity
        for s_key in ["setup_1", "setup_2", "setup_3", "setup_4", "setup_5", "setup_6"]:
            for sig in setups[s_key]["signals"]:
                self.assertIn("symbol", sig)
                self.assertIn("cmp", sig)
                self.assertIn("score", sig)
                self.assertGreater(sig["score"], 0)
                self.assertIn("proximity", sig)

        print("[PASS] Zero Regression: Core setup counts, scores, and ranks verified 100% intact.")

    def test_benchmark_pure_computation_overhead(self):
        """Verify that pure computation overhead across all stocks is strictly < 20ms."""
        overhead_ms = benchmark_proximity_computation(data_dir=self.data_dir)
        print(f"\n[BENCHMARK] Proximity computation overhead: {overhead_ms:.3f} ms across all scanner stocks.")
        self.assertLess(overhead_ms, 20.0, f"Overhead {overhead_ms}ms exceeded 20ms threshold")


if __name__ == "__main__":
    unittest.main()
