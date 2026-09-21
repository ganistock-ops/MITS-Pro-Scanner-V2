import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

EXPECTED_COUNTS = {
    1: 2,
    2: 9,
    3: 14,
    4: 4,
    5: 42,
    6: 37
}

DATA_FILES = {
    1: "tab1_bottom_reversal.json",
    2: "tab2_alpha_momentum.json",
    3: "tab3_htf.json",
    4: "tab4_weekly_swing.json",
    5: "tab5_stage2_pullback.json",
    6: "tab6_dbr.json"
}

def test_data_files():
    print("--- 1. Testing Data Files ---")
    for tab, filename in DATA_FILES.items():
        with open(BASE_DIR / "data" / filename, encoding="utf-8") as f:
            data = json.load(f)
        actual = len(data["signals"])
        expected = EXPECTED_COUNTS[tab]
        assert actual == expected, f"Expected {expected} signals in data/{filename}, got {actual}"
        print(f"[PASS] data/{filename} has exactly {actual} signals.")

    with open(BASE_DIR / "data" / "scanner_results.json", encoding="utf-8") as f:
        scan = json.load(f)
    for tab, expected in EXPECTED_COUNTS.items():
        key = f"setup_{tab}"
        actual = scan["setups"][key]["count"]
        assert actual == expected, f"scanner_results {key} count {actual} != {expected}"
        actual_sigs = len(scan["setups"][key]["signals"])
        assert actual_sigs == expected, f"scanner_results {key} signals {actual_sigs} != {expected}"
        print(f"[PASS] scanner_results.json {key} has exactly {actual} signals.")

def test_index_html():
    print("\n--- 2. Testing index.html ---")
    with open(BASE_DIR / "index.html", encoding="utf-8") as f:
        html = f.read()

    for tab, expected in EXPECTED_COUNTS.items():
        expected_tag = f'<span class="tab-count" id="count-setup_{tab}">{expected}</span>'
        assert expected_tag in html, f"Missing {expected_tag} in index.html"
        print(f"[PASS] index.html badge count-setup_{tab} == {expected}")

    assert '108</div>' in html, "Active alerts should be 108"
    
    # Count static thead th elements
    thead_match = re.search(r'<thead>\s*<tr>([\s\S]*?)</tr>\s*</thead>', html)
    assert thead_match, "index.html thead not found"
    th_count = len(re.findall(r'<th[\s>]', thead_match.group(1)))
    assert th_count == 6, f"Expected 6 columns in static thead, got {th_count}"
    print(f"[PASS] index.html has 6 static columns and 108 active alerts.")

def test_app_js():
    print("\n--- 3. Testing js/app.js ---")
    with open(BASE_DIR / "js" / "app.js", encoding="utf-8") as f:
        js = f.read()

    assert "const CACHE_VERSION = '_V4';" in js, "Expected CACHE_VERSION _V4 in js/app.js"
    assert "tab5_stage2_pullback.json?t=" in js, "Cache-busting missing for tab5"
    assert "tab6_dbr.json?t=" in js, "Cache-busting missing for tab6"
    assert "scanner_results.json?t=" in js, "Cache-busting missing for scanner_results"

    for tab, expected in EXPECTED_COUNTS.items():
        m = re.search(r'const DEFAULT_TAB' + str(tab) + r'_SIGNALS = (\[[\s\S]*?\]);\r?\n', js)
        assert m, f"DEFAULT_TAB{tab}_SIGNALS not found in js/app.js"
        # Parse symbols
        syms = re.findall(r'"?symbol"?\s*:\s*["\']([^"\']+)["\']', m.group(1))
        assert len(syms) == expected, f"DEFAULT_TAB{tab}_SIGNALS has {len(syms)} != {expected}"
        print(f"[PASS] js/app.js DEFAULT_TAB{tab}_SIGNALS has exactly {len(syms)} signals.")

    # Check setup_5 and setup_6 thead in renderTable
    assert "state.activeTab === 'setup_5'" in js
    assert "state.activeTab === 'setup_6'" in js
    print(f"[PASS] js/app.js verified with CACHE_VERSION _V4 and 6-col layout.")

def test_wordpress_embed():
    print("\n--- 4. Testing wordpress_live_embed.html ---")
    with open(BASE_DIR / "wordpress_live_embed.html", encoding="utf-8") as f:
        wp = f.read()

    assert "const WP_CACHE_VERSION = '_V4';" in wp, "Expected WP_CACHE_VERSION _V4 in wordpress_live_embed.html"
    assert "tab5_stage2_pullback.json?t=" in wp
    assert "tab6_dbr.json?t=" in wp
    assert "scanner_results.json?t=" in wp

    for tab, expected in EXPECTED_COUNTS.items():
        expected_badge = f'<span class="wp-tab-badge" id="wp-count-setup_{tab}">{expected}</span>'
        assert expected_badge in wp, f"Missing {expected_badge} in wordpress_live_embed.html"
        print(f"[PASS] wordpress_live_embed.html badge wp-count-setup_{tab} == {expected}")

    assert 'id="wp-kpi-alerts" style="color: #ffffff;">108</div>' in wp

    # Check CSS
    assert "min-width: 1100px !important;" in wp
    assert "overflow-x: auto !important;" in wp

    for tab, expected in EXPECTED_COUNTS.items():
        m = re.search(r'const DEFAULT_WP_TAB' + str(tab) + r'_SIGNALS = (\[[\s\S]*?\]);\r?\n', wp)
        assert m, f"DEFAULT_WP_TAB{tab}_SIGNALS not found in wordpress_live_embed.html"
        syms = re.findall(r'"?symbol"?\s*:\s*["\']([^"\']+)["\']', m.group(1))
        assert len(syms) == expected, f"DEFAULT_WP_TAB{tab}_SIGNALS has {len(syms)} != {expected}"
        print(f"[PASS] wordpress_live_embed.html DEFAULT_WP_TAB{tab}_SIGNALS has exactly {len(syms)} signals.")

    # Check thead in renderWpTable includes setup_5 and setup_6
    m_thead = re.search(r"else if \([^)]*WP_STATE\.activeTab === 'setup_6'[^)]*\)\s*\{[\s\S]*?thead\.innerHTML = `([\s\S]*?)`;", wp)
    assert m_thead, "renderWpTable thead block for setup_6 not found"
    th_count = len(re.findall(r'<th[\s>]', m_thead.group(1)))
    assert th_count == 6, f"Expected 6 columns in setup_6 thead, got {th_count}"
    print(f"[PASS] wordpress_live_embed.html verified with WP_CACHE_VERSION _V4 and 6-col layout.")

if __name__ == "__main__":
    test_data_files()
    test_index_html()
    test_app_js()
    test_wordpress_embed()
    print("\n========================================================")
    print("ALL TESTS PASSED SUCCESSFULLY! 100% UI & DATA ALIGNMENT.")
    print("========================================================")
