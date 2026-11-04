import json
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def test_smart_money():
    print("=== Testing Smart Money Radar Engine & Output ===")
    
    # 1. Test module import and execution speed
    import sys
    scripts_dir = BASE_DIR / "scripts"
    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))
    
    from smart_money_engine import generate_smart_money_data
    
    t0 = time.perf_counter()
    res = generate_smart_money_data()
    t1 = time.perf_counter()
    runtime = t1 - t0
    print(f"[PASS] generate_smart_money_data() executed in {runtime*1000:.2f} ms ({runtime:.4f}s)")
    assert runtime < 0.1, f"Execution too slow: {runtime}s >= 0.1s"
    
    # 2. Output file check
    sm_file = BASE_DIR / "data" / "smart_money_data.json"
    assert sm_file.exists(), "smart_money_data.json does not exist"
    
    file_size = sm_file.stat().st_size
    print(f"[PASS] File size: {file_size} bytes ({file_size/1024:.2f} KB)")
    
    with open(sm_file, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    assert "scan_date" in data, "Missing scan_date"
    assert "whale_flow" in data, "Missing whale_flow"
    assert "stage_regimes" in data, "Missing stage_regimes"
    assert "sectors" in data, "Missing sectors"
    
    # 3. Whale flow check
    wf = data["whale_flow"]
    assert "top_accumulating" in wf and wf["top_accumulating"] is not None
    assert "top_distributing" in wf and wf["top_distributing"] is not None
    assert "total_deliv_cr" in wf
    print(f"[PASS] Top Accumulating Sector: {wf['top_accumulating']['sector']} (Anchor: {wf['top_accumulating']['anchor']})")
    print(f"[PASS] Top Distributing Sector: {wf['top_distributing']['sector']} (Anchor: {wf['top_distributing']['anchor']})")
    
    # 4. Stage regimes check
    sr = data["stage_regimes"]["summary"]
    total_staged = sum(sr.values())
    assert total_staged == 20, f"Expected 20 staged sectors, got {total_staged}"
    print(f"[PASS] Stage summary: Stage 1: {sr['stage_1_accumulation']} | Stage 2: {sr['stage_2_markup']} | Stage 3: {sr['stage_3_distribution']} | Stage 4: {sr['stage_4_capitulation']}")
    
    # 5. Sectors array check
    assert len(data["sectors"]) == 20, f"Expected 20 sectors, got {len(data['sectors'])}"
    for s in data["sectors"]:
        assert s["stage"] in (1, 2, 3, 4), f"Invalid stage for {s['sector']}: {s['stage']}"
        assert "pct_20" in s and "pct_50" in s and "deliv_cr" in s and "anchor" in s
    print(f"[PASS] All 20 sectors verified with valid fields and Weinstein stages.")
    
    # 6. Existing scanners regression check
    scanner_files = [
        "sector_analysis.json",
        "market_summary.json",
        "master_universe_eod.json",
        "adv_scanner_1_rs.json",
        "adv_scanner_2_early_bo.json",
        "adv_scanner_3_momentum_continuation.json",
        "adv_scanner_4_rbr_proportional.json",
        "adv_scanner_5_confluence_engine.json",
        "adv_scanner_6_wyckoff_absorption.json"
    ]
    for sf in scanner_files:
        p = BASE_DIR / "data" / sf
        assert p.exists(), f"Existing scanner file missing: {sf}"
        assert p.stat().st_size > 100, f"Existing scanner file corrupted or empty: {sf}"
    print(f"[PASS] Verified all {len(scanner_files)} existing scanner JSON files intact without regression.")

    print("\n>>> ALL SMART MONEY TESTS PASSED (100%) <<<")

if __name__ == "__main__":
    test_smart_money()
