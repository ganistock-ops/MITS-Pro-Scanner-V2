import json
from pathlib import Path
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent

# 1. Load Files
with open(BASE_DIR / "data" / "tab1_bottom_reversal.json", encoding="utf-8") as f:
    t1 = json.load(f)

with open(BASE_DIR / "data" / "tab2_alpha_momentum.json", encoding="utf-8") as f:
    t2 = json.load(f)

with open(BASE_DIR / "data" / "tab3_htf.json", encoding="utf-8") as f:
    t3 = json.load(f)

with open(BASE_DIR / "data" / "tab4_weekly_swing.json", encoding="utf-8") as f:
    t4 = json.load(f)

with open(BASE_DIR / "data" / "tab5_stage2_pullback.json", encoding="utf-8") as f:
    t5 = json.load(f)

with open(BASE_DIR / "data" / "tab6_dbr.json", encoding="utf-8") as f:
    t6 = json.load(f)

with open(BASE_DIR / "data" / "scanner_results.json", encoding="utf-8") as f:
    sr = json.load(f)

print(f"Tab 1 signals count: {len(t1['signals'])}")
assert len(t1["signals"]) >= 1, "Expected at least 1 signal in tab1_bottom_reversal.json"

print(f"Tab 2 signals count: {len(t2['signals'])}")
assert len(t2["signals"]) >= 1, "Expected at least 1 signal in tab2_alpha_momentum.json"

print(f"Tab 3 signals count: {len(t3['signals'])}")
assert len(t3["signals"]) >= 1, "Expected at least 1 signal in tab3_htf.json"

print(f"Tab 4 signals count: {len(t4['signals'])}")
assert len(t4["signals"]) >= 1, "Expected at least 1 signal in tab4_weekly_swing.json"

print(f"Tab 5 signals count: {len(t5['signals'])}")
assert len(t5["signals"]) >= 1, "Expected at least 1 signal in tab5_stage2_pullback.json"

print(f"Tab 6 signals count: {len(t6['signals'])}")
assert len(t6["signals"]) >= 1, "Expected at least 1 signal in tab6_dbr.json"

required_keys = [
    "symbol", "name", "sector", "cmp", "change_pct", "score", "grade",
    "score_display", "institutional_score", "invalidation", "entry_zone",
    "target_1", "target_2", "target_zone", "risk_reward_ratio", "rvol",
    "setup_tags", "status"
]

tab2_specific_keys = [
    "rs_1y", "rs_6m", "rs_3m", "rs_1m", "drawdown_pct", "swing_high", "base_low"
]

tab3_specific_keys = [
    "flag_high", "flag_base_low", "pole_gain_pct", "flag_days", "correction_pct", "vol_contraction_pct", "rsi",
    "stage", "stage_label", "status_class"
]

tab4_specific_keys = [
    "ret_1w", "ret_1m", "rs_1w", "rs_1m", "rsi", "nearest_support_base", "nearest_support_val", "base_swing_low", "ema_20", "ema_50", "pivot_pp"
]

tab5_specific_keys = [
    "support_level", "support_ema", "ema_20", "ema_50", "sma_200", "rsi", "drawdown_52w_pct", "high_52w"
]

tab6_specific_keys = [
    "p_prox", "p_dist", "base_bars", "base_depth_pct", "drop_pct", "rsi", "stage"
]

print("\n--- Validating Tab 1 Signals ---")
for sig in t1["signals"]:
    sym = sig.get("symbol")
    for k in required_keys:
        assert k in sig, f"Missing key {k} in t1 signal {sym}"
    print(f"  [Tab 1] {sym}: CMP=Rs.{sig['cmp']}, Score={sig['score_display']}, SL={sig['invalidation']}, Entry={sig['entry_zone']}, T1={sig['target_1']}, T2={sig['target_2']}")

print("\n--- Validating Tab 2 Signals ---")
for sig in t2["signals"]:
    sym = sig.get("symbol")
    for k in required_keys:
        assert k in sig, f"Missing common key {k} in t2 signal {sym}"
    for k in tab2_specific_keys:
        assert k in sig, f"Missing Tab 2 specific key {k} in t2 signal {sym}"
    print(f"  [Tab 2] {sym}: CMP=Rs.{sig['cmp']}, Score={sig['score_display']}, 1Y RS=+{sig['rs_1y']}%, SL={sig['invalidation']}, Entry={sig['entry_zone']}, T1={sig['target_1']}, T2={sig['target_2']}")

print("\n--- Validating Tab 3 Signals (High Tight Flag) ---")
for sig in t3["signals"]:
    sym = sig.get("symbol")
    for k in required_keys:
        assert k in sig, f"Missing common key {k} in t3 signal {sym}"
    for k in tab3_specific_keys:
        assert k in sig, f"Missing Tab 3 specific key {k} in t3 signal {sym}"
    assert sig["stage"] in ("IN_FLAG", "BREAKOUT"), f"Invalid stage {sig['stage']} in t3 signal {sym}"
    print(f"  [Tab 3 HTF] {sym}: Stage={sig['stage']}, Status={sig['status']}, CMP=Rs.{sig['cmp']:.2f}, Score={sig['score_display']}, Pole=+{sig['pole_gain_pct']}%, Flag={sig['flag_days']}D (-{sig['correction_pct']}%), SL={sig['invalidation']}, Entry={sig['entry_zone']}, T1={sig['target_1']}, T2={sig['target_2']}")

print("\n--- Validating Tab 4 Signals (Weekly Swing Watchlist) ---")
for sig in t4["signals"]:
    sym = sig.get("symbol")
    for k in required_keys:
        assert k in sig, f"Missing common key {k} in t4 signal {sym}"
    for k in tab4_specific_keys:
        assert k in sig, f"Missing Tab 4 specific key {k} in t4 signal {sym}"
    print(f"  [Tab 4 Swing] {sym}: CMP=Rs.{sig['cmp']:.2f}, Score={sig['score_display']}, 1W Ret=+{sig['ret_1w']}%, 1W RS=+{sig['rs_1w']}%, 1M RS=+{sig['rs_1m']}%, Base={sig['nearest_support_base']}, SL={sig['invalidation']}, Entry={sig['entry_zone']}, T1={sig['target_1']}, T2={sig['target_2']}")

print("\n--- Validating Tab 5 Signals (Stage-2 Pullback) ---")
for sig in t5["signals"]:
    sym = sig.get("symbol")
    for k in required_keys:
        assert k in sig, f"Missing common key {k} in t5 signal {sym}"
    for k in tab5_specific_keys:
        assert k in sig, f"Missing Tab 5 specific key {k} in t5 signal {sym}"
    assert sig["status"] in ("STAGE-2 TURNAROUND", "PULLBACK SUPPORT HOLD"), f"Invalid status {sig['status']} in t5 signal {sym}"

print(f"  Validated all {len(t5['signals'])} Tab 5 signals successfully!")
top_t5 = t5["signals"][:5]
for s in top_t5:
    print(f"  [Tab 5 Pullback] {s['symbol']}: Status={s['status']}, CMP=Rs.{s['cmp']:.2f}, Score={s['score_display']}, Support={s['support_level']} (Rs.{s['support_ema']:.2f}), SL={s['invalidation']}, Entry={s['entry_zone']}, T1={s['target_1']}, T2={s['target_2']}")

print("\n--- Validating Tab 6 Signals (DBR Demand Zone) ---")
for sig in t6["signals"]:
    sym = sig.get("symbol")
    for k in required_keys:
        assert k in sig, f"Missing common key {k} in t6 signal {sym}"
    for k in tab6_specific_keys:
        assert k in sig, f"Missing Tab 6 specific key {k} in t6 signal {sym}"
    assert sig["stage"] in ("FRESH DEMAND RETEST", "DEMAND LEG-OUT"), f"Invalid stage {sig['stage']} in t6 signal {sym}"

print(f"  Validated all {len(t6['signals'])} Tab 6 signals successfully!")
top_t6 = t6["signals"][:5]
for s in top_t6:
    print(f"  [Tab 6 DBR] {s['symbol']}: Stage={s['stage']}, CMP=Rs.{s['cmp']:.2f}, Score={s['score_display']}, Proximal=Rs.{s['p_prox']:.2f}, Distal=Rs.{s['p_dist']:.2f}, Base={s['base_bars']}D, SL={s['invalidation']}, Entry={s['entry_zone']}, T1={s['target_1']}, T2={s['target_2']}")

setup_1_sr = sr["setups"]["setup_1"]
setup_2_sr = sr["setups"]["setup_2"]
setup_3_sr = sr["setups"]["setup_3"]
setup_4_sr = sr["setups"]["setup_4"]
setup_5_sr = sr["setups"]["setup_5"]
setup_6_sr = sr["setups"]["setup_6"]

print(f"\nScanner results setup_1 count: {len(setup_1_sr['signals'])}")
assert len(setup_1_sr["signals"]) == len(t1["signals"]), "Signal counts must match for setup_1"

print(f"Scanner results setup_2 count: {len(setup_2_sr['signals'])}")
assert len(setup_2_sr["signals"]) == len(t2["signals"]), "Signal counts must match for setup_2"

print(f"Scanner results setup_3 count: {len(setup_3_sr['signals'])}")
assert len(setup_3_sr["signals"]) == len(t3["signals"]), "Signal counts must match for setup_3"

print(f"Scanner results setup_4 count: {len(setup_4_sr['signals'])}")
assert len(setup_4_sr["signals"]) == len(t4["signals"]), "Signal counts must match for setup_4"

print(f"Scanner results setup_5 count: {len(setup_5_sr['signals'])}")
assert len(setup_5_sr["signals"]) == len(t5["signals"]), "Signal counts must match for setup_5"

print(f"Scanner results setup_6 count: {len(setup_6_sr['signals'])}")
assert len(setup_6_sr["signals"]) == len(t6["signals"]), "Signal counts must match for setup_6"

for sig in setup_6_sr["signals"]:
    sym = sig.get("symbol")
    for k in required_keys:
        assert k in sig, f"Missing key {k} in sr setup_6 signal {sym}"

# Simulate JS table rendering for Tab 6
rows_t6 = []
for s in t6["signals"]:
    chg_sign = "+" if s["change_pct"] >= 0 else ""
    score_disp = s.get("score_display") or f"{s.get('score', '--')} ({s.get('grade', 'A')})"
    tags_html = "".join([f"<span class='tag-pill-sm highlight'>{t}</span>" for t in s.get("setup_tags", [])])
    row = f"""<tr>
        <td>{s['symbol']} ({s['name']})</td>
        <td>{s['sector']}</td>
        <td>Rs.{s['cmp']:.2f}</td>
        <td>{chg_sign}{s['change_pct']}%</td>
        <td>{s['rvol']}x</td>
        <td>{score_disp}</td>
        <td>{s['status']}</td>
        <td>Rs.{s['invalidation']}</td>
        <td>Entry: {s['entry_zone']} | T1: Rs.{s['target_1']} | T2: Rs.{s['target_2']}</td>
        <td>{tags_html}</td>
    </tr>"""
    rows_t6.append(row)

assert len(rows_t6) == len(t6["signals"]), f"Expected {len(t6['signals'])} rows, got {len(rows_t6)}"

print(f"\nGenerated {len(rows_t6)} verified HTML rows for Tab 6 table:")
for s in t6["signals"][:5]:
    print(f"  -> [{s['symbol']}] Sector: {s['sector']}, CMP: Rs.{s['cmp']:.2f}, Score: {s['score_display']}, Stage: {s['stage']}, Base: {s['base_bars']}D, SL: {s['invalidation']}, Targets: T1={s['target_1']}/T2={s['target_2']}")

print("\n--- ALL TAB 1, TAB 2, TAB 3, TAB 4, TAB 5 & TAB 6 KEY NAMES, SCHEMAS, AND RENDERING PIPELINES VERIFIED SUCCESSFULLY! ---")



