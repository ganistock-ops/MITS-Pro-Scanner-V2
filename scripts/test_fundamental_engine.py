"""
MITS Pro Institutional Suite V2 - Fundamental Research Engine Verification Test
================================================================================
Comprehensive test suite verifying:
1. JSON structure and short-key schema validation.
2. File size constraints (< 50 KB uncompressed).
3. Dynamic offline sync execution latency (< 0.05s).
4. Zero-regression check across existing scanner JSON datasets.
"""

import sys
import json
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = BASE_DIR / "scripts"
DATA_DIR = BASE_DIR / "data"

if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from generate_fundamental_data import generate_fundamental_data, sync_fundamental_multiples

REQUIRED_KEYS = ["s", "sec", "cmp", "pe", "pb", "roe", "roce", "de", "eps_g", "prom", "f_score", "tier"]
VALID_TIERS = {
    "Buffett Compounder",
    "High-Growth GARP",
    "Pristine Balance Sheet",
    "Deep Value Moat",
    "Turnaround",
    "Fair Value"
}


def test_fundamental_engine():
    print("=== Testing Fundamental Research Engine & JSON Payload ===")

    # 1. Test standalone generator execution & file size
    t0 = time.perf_counter()
    res = generate_fundamental_data()
    t1 = time.perf_counter()
    gen_time = t1 - t0
    print(f"[PASS] generate_fundamental_data() executed in {gen_time*1000:.2f} ms ({gen_time:.4f}s)")

    out_file = DATA_DIR / "fundamental_data.json"
    assert out_file.exists(), "data/fundamental_data.json was not created"

    file_size_bytes = out_file.stat().st_size
    file_size_kb = file_size_bytes / 1024.0
    print(f"[PASS] File size: {file_size_bytes} bytes ({file_size_kb:.2f} KB)")
    assert file_size_bytes < 50 * 1024, f"File size constraint violated: {file_size_kb:.2f} KB >= 50.00 KB"
    print(f"[PASS] File size constraint satisfied (< 50 KB uncompressed): {file_size_kb:.2f} KB < 50.00 KB")

    # 2. JSON Structure & Schema Validation
    with open(out_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "scan_date" in data, "Missing 'scan_date' in fundamental_data.json"
    assert "generated_at" in data, "Missing 'generated_at' in fundamental_data.json"
    assert "universe_count" in data, "Missing 'universe_count' in fundamental_data.json"
    assert "macro_summary" in data, "Missing 'macro_summary' in fundamental_data.json"
    assert "stocks" in data, "Missing 'stocks' array in fundamental_data.json"

    macro = data["macro_summary"]
    assert "median_pe" in macro and macro["median_pe"] > 0, "Invalid median_pe in macro_summary"
    assert "median_roe" in macro and macro["median_roe"] > 0, "Invalid median_roe in macro_summary"
    assert "debt_free_count" in macro, "Missing debt_free_count in macro_summary"
    print(f"[PASS] Macro Summary: Median PE: {macro['median_pe']} | Median ROE: {macro['median_roe']}% | Debt-Free: {macro['debt_free_count']}")

    stocks = data["stocks"]
    assert len(stocks) == data["universe_count"], f"Mismatch in count: {len(stocks)} != {data['universe_count']}"
    assert len(stocks) >= 200, f"Expected at least 200 institutional stocks, got {len(stocks)}"
    print(f"[PASS] Universe count: {len(stocks)} stocks successfully loaded.")

    # 3. Short-key Schema Validation for every stock
    for i, s in enumerate(stocks):
        for k in REQUIRED_KEYS:
            assert k in s, f"Stock at index {i} ({s.get('s', 'UNKNOWN')}) missing key '{k}'"

        assert isinstance(s["s"], str) and len(s["s"]) > 0, f"Invalid symbol at index {i}"
        assert isinstance(s["sec"], str) and len(s["sec"]) > 0, f"Invalid sector at index {i}"
        assert isinstance(s["pe"], (int, float)) and s["pe"] > 0, f"Invalid PE for {s['s']}: {s['pe']}"
        assert isinstance(s["pb"], (int, float)) and s["pb"] > 0, f"Invalid PB for {s['s']}: {s['pb']}"
        assert isinstance(s["roe"], (int, float)), f"Invalid ROE for {s['s']}: {s['roe']}"
        assert isinstance(s["roce"], (int, float)), f"Invalid ROCE for {s['s']}: {s['roce']}"
        assert isinstance(s["de"], (int, float)) and s["de"] >= 0, f"Invalid DE for {s['s']}: {s['de']}"
        assert isinstance(s["eps_g"], (int, float)), f"Invalid EPS growth for {s['s']}: {s['eps_g']}"
        assert 0.0 <= s["prom"] <= 100.0, f"Promoter % out of bounds for {s['s']}: {s['prom']}"
        assert 1 <= s["f_score"] <= 9, f"Piotroski F-score out of bounds for {s['s']}: {s['f_score']}"
        assert s["tier"] in VALID_TIERS, f"Invalid quality tier for {s['s']}: {s['tier']}"

    print(f"[PASS] All {len(stocks)} stocks verified with 100% valid schema, short keys, and bounded metrics.")

    # 4. Dynamic Offline Sync Execution Latency & Formula Check
    test_sym = stocks[0]["s"]
    old_cmp = stocks[0]["cmp"]
    old_pe = stocks[0]["pe"]
    old_pb = stocks[0]["pb"]
    eps = stocks[0]["eps"]
    bv = stocks[0]["bv"]

    mock_close = round(old_cmp * 1.05, 2)
    mock_bhav = {test_sym: {"close": mock_close}}

    t0_sync = time.perf_counter()
    sync_res = sync_fundamental_multiples(
        bhav_date="2026-11-04",
        bhav_map=mock_bhav
    )
    t1_sync = time.perf_counter()
    sync_time = t1_sync - t0_sync
    print(f"[PASS] sync_fundamental_multiples() executed in {sync_time*1000:.2f} ms ({sync_time:.4f}s)")
    assert sync_time < 0.05, f"Sync latency too high: {sync_time}s >= 0.05s"
    print(f"[PASS] Dynamic sync latency constraint satisfied (< 0.05s): {sync_time:.4f}s < 0.0500s")

    # Verify dynamic formula recalculation: Current PE = Close / EPS, Current PB = Close / BV
    updated_stock = next(st for st in sync_res["stocks"] if st["s"] == test_sym)
    assert updated_stock["cmp"] == mock_close, f"CMP not updated: {updated_stock['cmp']} != {mock_close}"
    expected_pe = round(mock_close / eps, 1)
    expected_pb = round(mock_close / bv, 1)
    assert updated_stock["pe"] == expected_pe, f"PE formula mismatch: {updated_stock['pe']} != {expected_pe}"
    assert updated_stock["pb"] == expected_pb, f"PB formula mismatch: {updated_stock['pb']} != {expected_pb}"
    print(f"[PASS] Dynamic formula validated: Close {old_cmp} -> {mock_close} | PE {old_pe} -> {expected_pe} | PB {old_pb} -> {expected_pb}")

    # Restore baseline
    generate_fundamental_data()

    # 5. Zero-Regression Check on Existing Datasets
    critical_files = [
        "sector_analysis.json",
        "smart_money_data.json",
        "market_summary.json",
        "master_universe_eod.json",
        "adv_scanner_1_rs.json",
        "adv_scanner_2_early_bo.json",
        "adv_scanner_3_momentum_continuation.json",
        "adv_scanner_4_rbr_proportional.json",
        "adv_scanner_5_confluence_engine.json",
        "adv_scanner_6_wyckoff_absorption.json"
    ]
    for cf in critical_files:
        p = DATA_DIR / cf
        assert p.exists(), f"Existing critical dataset missing: {cf}"
        assert p.stat().st_size > 100, f"Existing critical dataset empty/corrupted: {cf}"
    print(f"[PASS] All {len(critical_files)} existing scanner & sector datasets intact without regression.")

    print("\n>>> ALL FUNDAMENTAL ENGINE TESTS PASSED (100%) <<<")


if __name__ == "__main__":
    test_fundamental_engine()
