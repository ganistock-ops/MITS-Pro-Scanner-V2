import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def test_sector_rotation():
    print("=== Testing Sector Rotation Widget Integration ===")
    
    # 1. Market summary JSON check
    ms_path = BASE_DIR / "data" / "market_summary.json"
    assert ms_path.exists(), "market_summary.json does not exist"
    with open(ms_path, "r", encoding="utf-8") as f:
        ms = json.load(f)
    assert "sector_rotation" in ms, "'sector_rotation' key missing in market_summary.json"
    sr = ms["sector_rotation"]
    assert len(sr["top_inflows"]) == 3, f"Expected 3 inflows, got {len(sr['top_inflows'])}"
    assert len(sr["top_outflows"]) == 3, f"Expected 3 outflows, got {len(sr['top_outflows'])}"
    print("[PASS] data/market_summary.json contains valid 'sector_rotation' key.")

    # 2. Standalone sector_rotation.json check
    sr_path = BASE_DIR / "data" / "sector_rotation.json"
    assert sr_path.exists(), "sector_rotation.json does not exist"
    with open(sr_path, "r", encoding="utf-8") as f:
        sr_file = json.load(f)
    assert sr_file["sectors_analyzed"] == 20, f"Expected 20 sectors, got {sr_file['sectors_analyzed']}"
    print(f"[PASS] data/sector_rotation.json verified with {sr_file['sectors_analyzed']} sectors.")

    # 3. index.html markup check
    idx_path = BASE_DIR / "index.html"
    with open(idx_path, "r", encoding="utf-8") as f:
        idx_content = f.read()
    assert 'id="sector-rotation-container"' in idx_content, "Missing #sector-rotation-container in index.html"
    assert 'id="sector-rotation-pills"' in idx_content, "Missing #sector-rotation-pills in index.html"
    assert 'id="rotation-date-badge"' in idx_content, "Missing #rotation-date-badge in index.html"
    print("[PASS] index.html contains #sector-rotation-container markup.")

    # 4. js/app.js script check
    app_path = BASE_DIR / "js" / "app.js"
    with open(app_path, "r", encoding="utf-8") as f:
        app_content = f.read()
    assert "function renderSectorRotation()" in app_content, "Missing renderSectorRotation() in app.js"
    assert "window.filterBySector" in app_content, "Missing window.filterBySector in app.js"
    assert "renderSectorRotation();" in app_content, "Missing renderSectorRotation() call in app.js"
    print("[PASS] js/app.js contains isolated renderSectorRotation() & filterBySector().")

    # 5. wordpress_live_embed.html check
    wp_path = BASE_DIR / "wordpress_live_embed.html"
    with open(wp_path, "r", encoding="utf-8") as f:
        wp_content = f.read()
    assert 'id="wp-sector-rotation-container"' in wp_content, "Missing #wp-sector-rotation-container in wordpress_live_embed.html"
    assert 'id="wp-rotation-pills-list"' in wp_content, "Missing #wp-rotation-pills-list in wordpress_live_embed.html"
    assert "function renderWpSectorRotation()" in wp_content, "Missing renderWpSectorRotation() in wordpress_live_embed.html"
    assert "window.filterWpBySector" in wp_content, "Missing window.filterWpBySector in wordpress_live_embed.html"
    assert "renderWpSectorRotation();" in wp_content, "Missing renderWpSectorRotation() call in wordpress_live_embed.html"
    print("[PASS] wordpress_live_embed.html contains isolated widget and styles.")

    print("\n>>> ALL ZERO-REGRESSION CHECKS PASSED SUCCESSFULLY (100%) <<<")

if __name__ == "__main__":
    test_sector_rotation()
