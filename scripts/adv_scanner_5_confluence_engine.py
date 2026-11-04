"""
MITS Pro Institutional Suite V2 - Advanced Stock Scanner Slot 5
Multi-Scanner Confluence Engine (SMC & Multi-Engine Cross-Validation)

Aggregates, cross-references, and evaluates institutional confluence across all 10 MITS Pro scanners:
  1. Bottom Reversal Pro (Core Setup 1)
  2. Alpha Momentum (Core Setup 2)
  3. High Tight Flag (Core Setup 3)
  4. Weekly Swing (Core Setup 4)
  5. Stage-2 Pullback (Core Setup 5)
  6. DBR Demand Zone (Core Setup 6)
  7. RS Outperformer (Advanced Slot 1)
  8. Early Breakout (Advanced Slot 2)
  9. Momentum Continuation (Advanced Slot 3)
  10. Rally-Base-Rally Proportional (Advanced Slot 4)

Filters for equities appearing in >= 2 independent quantitative setups,
computes a composite conviction score, and assigns hierarchical conviction tiers:
  - Tier 1: ULTRA HIGH CONVICTION (4+ Scanners)
  - Tier 2: HIGH CONVICTION (3 Scanners)
  - Tier 3: MODERATE CONFLUENCE (2 Scanners)

Output Target: data/adv_scanner_5_confluence_engine.json
"""

import os
import sys
import json
import time
import logging
from pathlib import Path
from datetime import datetime, date
from collections import defaultdict
from typing import Dict, Any, List, Optional, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_FILE = DATA_DIR / "adv_scanner_5_confluence_engine.json"

if str(BASE_DIR / "scripts") not in sys.path:
    sys.path.insert(0, str(BASE_DIR / "scripts"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ConfluenceEngine")


# 10 Institutional Scanner Definitions
SCANNER_CONFIGS = [
    {
        "id": "tab1_bottom_reversal",
        "name": "Bottom Reversal Pro",
        "file": "tab1_bottom_reversal.json",
        "root_key": "signals",
        "fallback_setup_id": "setup_1",
        "score_key": "score",
        "filter_fn": None
    },
    {
        "id": "tab2_alpha_momentum",
        "name": "Alpha Momentum",
        "file": "tab2_alpha_momentum.json",
        "root_key": "signals",
        "fallback_setup_id": "setup_2",
        "score_key": "score",
        "filter_fn": None
    },
    {
        "id": "tab3_htf",
        "name": "High Tight Flag",
        "file": "tab3_htf.json",
        "root_key": "signals",
        "fallback_setup_id": "setup_3",
        "score_key": "score",
        "filter_fn": None
    },
    {
        "id": "tab4_weekly_swing",
        "name": "Weekly Swing",
        "file": "tab4_weekly_swing.json",
        "root_key": "signals",
        "fallback_setup_id": "setup_4",
        "score_key": "score",
        "filter_fn": None
    },
    {
        "id": "tab5_stage2_pullback",
        "name": "Stage-2 Pullback",
        "file": "tab5_stage2_pullback.json",
        "root_key": "signals",
        "fallback_setup_id": "setup_5",
        "score_key": "score",
        "filter_fn": None
    },
    {
        "id": "tab6_dbr",
        "name": "DBR Demand Zone",
        "file": "tab6_dbr.json",
        "root_key": "signals",
        "fallback_setup_id": "setup_6",
        "score_key": "score",
        "filter_fn": None
    },
    {
        "id": "adv_slot_1_rs",
        "name": "RS Outperformer",
        "file": "adv_scanner_1_rs.json",
        "root_key": "stocks",
        "fallback_setup_id": None,
        "score_key": "rs_score",
        # Qualifying RS Outperformer: RS Score >= 80 (Strong RS) or Grade A / Grade B
        "filter_fn": lambda s: s.get("rs_score", 0) >= 80 or s.get("grade") in ["Grade A", "Grade B"]
    },
    {
        "id": "adv_slot_2_early_bo",
        "name": "Early Breakout",
        "file": "adv_scanner_2_early_bo.json",
        "root_key": "stocks",
        "fallback_setup_id": None,
        "score_key": "score",
        "filter_fn": None
    },
    {
        "id": "adv_slot_3_momentum_continuation",
        "name": "Momentum Continuation",
        "file": "adv_scanner_3_momentum_continuation.json",
        "root_key": "stocks",
        "fallback_setup_id": None,
        "score_key": "total_score",
        "filter_fn": None
    },
    {
        "id": "adv_slot_4_rbr_proportional",
        "name": "RBR Proportional",
        "file": "adv_scanner_4_rbr_proportional.json",
        "root_key": "stocks",
        "fallback_setup_id": None,
        "score_key": "rbr_score",
        "filter_fn": None
    }
]


def load_scanner_feed(cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Safely loads records from an individual scanner JSON feed, with fallback to scanner_results.json.
    Guarantees zero unhandled exceptions on missing or malformed files.
    """
    fname = cfg["file"]
    fpath = DATA_DIR / fname
    root_key = cfg["root_key"]
    fallback_id = cfg.get("fallback_setup_id")

    items: List[Dict[str, Any]] = []

    # 1. Primary load from individual feed
    if fpath.exists():
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
            raw_items = data.get(root_key, [])
            if isinstance(raw_items, list):
                items = raw_items
                logger.debug(f"Loaded {len(items)} records from {fname}")
        except Exception as e:
            logger.warning(f"Error parsing {fname}: {e}")

    # 2. Fallback to scanner_results.json for Core Tabs 1-6
    if not items and fallback_id:
        sr_path = DATA_DIR / "scanner_results.json"
        if sr_path.exists():
            try:
                with open(sr_path, "r", encoding="utf-8") as f:
                    sr_data = json.load(f)
                setups = sr_data.get("setups", {})
                fallback_items = setups.get(fallback_id, {}).get("signals", [])
                if isinstance(fallback_items, list) and fallback_items:
                    items = fallback_items
                    logger.debug(f"Loaded {len(items)} fallback records for {cfg['name']} from scanner_results.json")
            except Exception as e:
                logger.warning(f"Error loading fallback for {cfg['name']}: {e}")

    # 3. Apply optional qualification filter (e.g. for RS Outperformer)
    filter_fn = cfg.get("filter_fn")
    if filter_fn and items:
        filtered = [it for it in items if filter_fn(it)]
        logger.info(f"[{cfg['name']}] Filtered {len(filtered)}/{len(items)} qualifying candidates.")
        return filtered

    return items


# Technical Setup Categories for Confluence Diversity Check
TECHNICAL_CATEGORIES: Dict[str, List[str]] = {
    "Relative Strength": [
        "RS Outperformer",
        "Alpha Momentum",
        "Momentum Continuation"
    ],
    "Price Structure / Demand Zone": [
        "RBR Proportional",
        "DBR Demand Zone",
        "Stage-2 Pullback",
        "Weekly Swing"
    ],
    "Volume / Breakout": [
        "Early Breakout",
        "High Tight Flag",
        "Bottom Reversal Pro"
    ]
}

SETUP_TO_CATEGORY: Dict[str, str] = {
    setup: category
    for category, setups in TECHNICAL_CATEGORIES.items()
    for setup in setups
}


def extract_stock_score(item: Dict[str, Any], score_key: str) -> float:
    """Extracts numeric score cleanly across different field aliases."""
    raw = item.get(score_key)
    if raw is None:
        for alt_key in ["score", "total_score", "rbr_score", "rs_score", "institutional_score"]:
            if item.get(alt_key) is not None:
                raw = item.get(alt_key)
                break
    try:
        val = float(raw)
        return max(0.0, min(100.0, val))
    except (TypeError, ValueError):
        return 70.0


def determine_conviction_tier(confluence_count: int, composite_score: float) -> Optional[Tuple[str, int, str]]:
    """
    Assigns institutional tier classification based on tightened criteria:
      - Tier 1 ("ULTRA HIGH CONVICTION"): confluence_count >= 4 AND composite_score >= 80.0
      - Tier 2 ("HIGH CONVICTION"):       confluence_count == 3 AND composite_score >= 75.0
      - Discard all others (returns None)
    """
    if confluence_count >= 4 and composite_score >= 80.0:
        return "ULTRA HIGH CONVICTION", 1, "Tier 1 - ULTRA HIGH CONVICTION"
    elif confluence_count == 3 and composite_score >= 75.0:
        return "HIGH CONVICTION", 2, "Tier 2 - HIGH CONVICTION"
    return None


def generate_adv_scanner_confluence_engine(
    symbols: Optional[List[Dict[str, Any]]] = None,
    stock_dfs: Optional[Dict[str, Any]] = None,
    bhav_date: Optional[date] = None,
    bhav_map: Optional[Dict[str, Dict[str, Any]]] = None,
    delivery_analytics_map: Optional[Dict[str, Dict[str, Any]]] = None,
    n_df: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Main generator for the Multi-Scanner Confluence Engine (Slot 5).
    Aggregates signals from all 10 MITS Pro scanners, isolates equities with >= 2 distinct setups,
    and produces a sorted confluence matrix.
    """
    t_start = time.time()
    logger.info("Initializing Advanced Stock Scanner 5: Multi-Scanner Confluence Engine...")

    # Reference symbol metadata fallback
    meta_by_symbol: Dict[str, Dict[str, Any]] = {}
    symbols_file = DATA_DIR / "symbols.json"
    if symbols_file.exists():
        try:
            with open(symbols_file, "r", encoding="utf-8") as f:
                sym_raw = json.load(f)
            for s in sym_raw.get("symbols", []):
                sym = s.get("symbol")
                if sym:
                    meta_by_symbol[sym] = s
        except Exception as e:
            logger.warning(f"Error loading symbols.json metadata: {e}")

    # Track matches and details per symbol
    stock_matches: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
    stock_details: Dict[str, Dict[str, Any]] = {}
    stock_dossiers: Dict[str, Dict[str, Any]] = {}

    active_engines_count = 0
    scanned_feed_summary: Dict[str, int] = {}

    # Ingest across all 10 scanners
    for cfg in SCANNER_CONFIGS:
        setup_name = cfg["name"]
        score_key = cfg["score_key"]
        feed_items = load_scanner_feed(cfg)

        scanned_feed_summary[setup_name] = len(feed_items)
        if feed_items:
            active_engines_count += 1

        for it in feed_items:
            sym = it.get("symbol")
            if not sym:
                continue

            score = extract_stock_score(it, score_key)
            stock_matches[sym].append((setup_name, score))

            # Store the highest quality metadata for the stock
            if sym not in stock_details or stock_details[sym].get("ltp", 0.0) == 0.0:
                ltp = float(it.get("ltp") or it.get("cmp") or 0.0)
                chg = float(it.get("change_pct") or 0.0)
                company = (
                    it.get("company_name")
                    or it.get("name")
                    or meta_by_symbol.get(sym, {}).get("name")
                    or sym
                )
                sec = it.get("sector") or meta_by_symbol.get(sym, {}).get("sector") or "NSE"

                stock_details[sym] = {
                    "symbol": sym,
                    "company_name": company,
                    "sector": sec,
                    "ltp": ltp,
                    "change_pct": chg
                }

            # Cache dossier if available
            if it.get("dossier") and sym not in stock_dossiers:
                stock_dossiers[sym] = it.get("dossier")

    # Filter for Confluence >= 3, Composite Score >= 75, Category Diversity >= 2
    confluent_records: List[Dict[str, Any]] = []

    for sym, matches in stock_matches.items():
        confluence_count = len(matches)
        # 1. Eliminate all stocks with only 2 scanner matches. Strict condition: confluence_count >= 3
        if confluence_count < 3:
            continue

        meta = stock_details.get(sym, {})
        setups_matched = [m[0] for m in matches]
        setup_scores = {m[0]: m[1] for m in matches}
        scores = [m[1] for m in matches]
        composite_score = round(sum(scores) / len(scores), 1)

        # 2. Apply composite score cutoff: composite_score >= 75.0
        if composite_score < 75.0:
            continue

        # 3. Ensure Category Diversity: matched setups must come from at least 2 distinct technical categories
        matched_categories = set(SETUP_TO_CATEGORY.get(st, st) for st in setups_matched)
        if len(matched_categories) < 2:
            continue

        # 4. Updated Tier classification:
        #    - Tier 1 ("ULTRA HIGH CONVICTION"): confluence_count >= 4 AND composite_score >= 80.0
        #    - Tier 2 ("HIGH CONVICTION"):       confluence_count == 3 AND composite_score >= 75.0
        #    - Discard all others.
        tier_info = determine_conviction_tier(confluence_count, composite_score)
        if not tier_info:
            continue

        conviction_tier, tier_num, tier_label = tier_info

        # Build comprehensive stock record
        rec = {
            "symbol": sym,
            "company_name": meta.get("company_name", sym),
            "sector": meta.get("sector", "NSE"),
            "ltp": meta.get("ltp", 0.0),
            "change_pct": meta.get("change_pct", 0.0),
            "confluence_count": confluence_count,
            "setups_matched": setups_matched,
            "composite_score": composite_score,
            "conviction_tier": conviction_tier,
            "category_count": len(matched_categories),
            "categories_matched": sorted(list(matched_categories)),
            # UI & feature parity aliases
            "cmp": meta.get("ltp", 0.0),
            "name": meta.get("company_name", sym),
            "score": composite_score,
            "tier": tier_num,
            "tier_label": tier_label,
            "setup_scores": setup_scores,
            "tradingview_url": f"https://in.tradingview.com/chart/?symbol=NSE:{sym}"
        }

        # Attach technical dossier if present
        if sym in stock_dossiers:
            rec["dossier"] = stock_dossiers[sym]
        else:
            rec["dossier"] = {
                "symbol": sym,
                "name": meta.get("company_name", sym),
                "sector": meta.get("sector", "NSE"),
                "stage": conviction_tier,
                "stage_badge": f"{confluence_count}x CONFLUENCE",
                "stage_color": "bullish" if confluence_count >= 4 else "gold",
                "stage_desc": f"Multi-Engine Institutional Confluence across {', '.join(setups_matched)}",
                "trend_stack": True,
                "trend_stack_status": f"Qualified in {confluence_count} Quantitative Engines across {len(matched_categories)} Categories",
                "trend_stack_badge": f"TIER {tier_num}",
                "key_levels": {
                    "support": round(meta.get("ltp", 0.0) * 0.95, 2),
                    "support_label": "Composite Confluence Floor",
                    "resistance": round(meta.get("ltp", 0.0) * 1.05, 2),
                    "resistance_label": "Immediate Confluence Target"
                }
            }

        confluent_records.append(rec)

    # Sort descending by confluence_count, then by composite_score
    confluent_records.sort(
        key=lambda x: (x["confluence_count"], x["composite_score"]),
        reverse=True
    )

    # Assign sequential ranks
    for rank_idx, r in enumerate(confluent_records, 1):
        r["rank"] = rank_idx

    # Tier counts
    tier_counts = {
        "ULTRA HIGH CONVICTION": sum(1 for r in confluent_records if r["conviction_tier"] == "ULTRA HIGH CONVICTION"),
        "HIGH CONVICTION": sum(1 for r in confluent_records if r["conviction_tier"] == "HIGH CONVICTION"),
        "MODERATE CONFLUENCE": 0
    }

    tier_breakdown = {
        "Tier 1 (4+ Matches, >=80 Score)": tier_counts["ULTRA HIGH CONVICTION"],
        "Tier 2 (3 Matches, >=75 Score)": tier_counts["HIGH CONVICTION"],
        "Tier 3 (Discarded)": 0
    }

    # Session scan date resolution
    latest_candle_dt = max((df.index[-1].date() for df in stock_dfs.values() if df is not None and not df.empty and hasattr(df.index[-1], "date")), default=None) if stock_dfs else None
    effective_date = latest_candle_dt if (latest_candle_dt and (not bhav_date or latest_candle_dt > bhav_date)) else bhav_date
    resolved_scan_date = effective_date.strftime("%Y-%m-%d") if (effective_date and hasattr(effective_date, "strftime")) else (str(effective_date)[:10] if effective_date else "2026-10-30")
    for fname in ["adv_scanner_4_rbr_proportional.json", "adv_scanner_1_rs.json", "scanner_results.json"]:
        p = DATA_DIR / fname
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    meta_d = json.load(f)
                d_str = meta_d.get("scan_date") or meta_d.get("last_session_date")
                if d_str:
                    resolved_scan_date = str(d_str)[:10]
                    break
            except Exception:
                pass

    ist_now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S IST")

    payload: Dict[str, Any] = {
        "scan_date": resolved_scan_date,
        "generated_at": ist_now,
        "total_stocks": len(confluent_records),
        "active_engines": active_engines_count,
        "engines_scanned": scanned_feed_summary,
        "tier_counts": tier_counts,
        "tier_breakdown": tier_breakdown,
        "stocks": confluent_records
    }

    # Atomic write to data/adv_scanner_5_confluence_engine.json
    try:
        temp_output = OUTPUT_FILE.with_suffix(".tmp")
        with open(temp_output, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        temp_output.replace(OUTPUT_FILE)
        logger.info(f"Successfully saved {len(confluent_records)} confluent candidates to {OUTPUT_FILE}")
    except Exception as e:
        logger.error(f"Failed to write {OUTPUT_FILE}: {e}")
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)

    elapsed = time.time() - t_start
    logger.info(
        f"Confluence Engine complete in {elapsed:.2f}s | "
        f"Total: {len(confluent_records)} stocks | "
        f"Tier 1: {tier_counts['ULTRA HIGH CONVICTION']} | "
        f"Tier 2: {tier_counts['HIGH CONVICTION']}"
    )

    return payload


if __name__ == "__main__":
    result = generate_adv_scanner_confluence_engine()
    stocks = result.get("stocks", [])
    tier_counts = result.get("tier_counts", {})
    
    print("\n" + "=" * 80)
    print("MITS PRO INSTITUTIONAL SUITE - MULTI-SCANNER CONFLUENCE ENGINE (SLOT 5)")
    print("=" * 80)
    print(f"Total Filtered Confluent Candidates (>= 3 Setups, Score >= 75): {len(stocks)}")
    print(f"  • Tier 1 - ULTRA HIGH CONVICTION (4+ Matches, Score >= 80): {tier_counts.get('ULTRA HIGH CONVICTION', 0)}")
    print(f"  • Tier 2 - HIGH CONVICTION       (3 Matches, Score >= 75) : {tier_counts.get('HIGH CONVICTION', 0)}")
    print("-" * 80)
    print(f"{'RANK':<5} | {'SYMBOL':<12} | {'LTP (Rs.)':<10} | {'MATCH':<5} | {'SCORE':<5} | {'TIER':<22} | {'SETUPS MATCHED'}")
    print("-" * 80)
    for s in stocks[:25]:
        setups_str = ", ".join(s["setups_matched"])
        print(f"#{s['rank']:<4} | {s['symbol']:<12} | Rs.{s['ltp']:<7.2f} | {s['confluence_count']:<5} | {s['composite_score']:<5.1f} | {s['conviction_tier']:<22} | {setups_str}")
    if len(stocks) > 25:
        print(f"... and {len(stocks) - 25} more confluent equities.")
    print("=" * 80)

