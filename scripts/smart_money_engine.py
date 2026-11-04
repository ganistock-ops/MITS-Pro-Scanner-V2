"""
MITS Pro Institutional Suite V2 - Smart Money Radar Engine
==========================================================
Super-lightweight, zero-regression quantitative pre-computation engine.
Extracts Whale Delivery Turnover Inflows/Outflows and Stan Weinstein 4-Stage Regimes
for all 20 NSE sectors across the NIFTY 500 universe.

Strict Constraints:
- ZERO external HTTP calls. Consumes in-memory sector payload or local static JSON.
- Execution speed < 0.05 seconds.
- Exports compact, static JSON to data/smart_money_data.json (< 3 KB).
"""

import os
import sys
import json
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

IST_TZ = timezone(timedelta(hours=5, minutes=30))

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
SMART_MONEY_FILE = DATA_DIR / "smart_money_data.json"
SECTOR_ANALYSIS_FILE = DATA_DIR / "sector_analysis.json"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SmartMoneyEngine")


def classify_weinstein_stage(pct_20: float, pct_50: float, rs_20: float, flow: str) -> Tuple[int, str, str]:
    """
    Stan Weinstein 4-Stage Quantitative Regime Classifier:
    - Stage 1 (Accumulation): Base building, intermediate recovery, 20 EMA high but 50 EMA catching up, accumulation bias.
    - Stage 2 (Markup): Confirmed strong uptrend, >60% > 20 EMA & >50% > 50 EMA, healthy RS.
    - Stage 3 (Distribution): Topping formation, momentum rollover (<50% > 20 EMA while 50 EMA still high) or outflow.
    - Stage 4 (Capitulation): Confirmed markdown, severe breakdown (<45% > 20 EMA & <40% > 50 EMA).
    """
    # Stage 3: Distribution (Distribution flow or 20 EMA broken below 50 EMA)
    if flow in ("OUTFLOW", "DISTRIBUTION") or (pct_50 >= 50.0 and pct_20 < 50.0):
        return 3, "Distribution", "BEARISH"
    # Stage 2: Markup (Strong structural alignment across timeframes)
    elif pct_20 >= 60.0 and pct_50 >= 50.0 and rs_20 >= -7.0:
        return 2, "Markup", "BULLISH"
    # Stage 4: Capitulation (Both moving average breadths collapsed)
    elif pct_20 < 45.0 and pct_50 < 40.0:
        return 4, "Capitulation", "BEARISH"
    # Stage 1: Accumulation (Basing, bottoming absorption, recovery)
    else:
        return 1, "Accumulation", "BULLISH"


def generate_smart_money_data(
    sector_payload: Optional[Dict[str, Any]] = None,
    bhav_date: Optional[str] = None,
    output_path: Optional[Path] = None
) -> Dict[str, Any]:
    """
    Main entry point for Smart Money Radar pre-computation.
    Consumes in-memory sector_payload if provided, or reads data/sector_analysis.json.
    Exports lightweight JSON to data/smart_money_data.json.
    """
    t_start = datetime.now()
    ist_now = datetime.now(IST_TZ)
    iso_timestamp = ist_now.isoformat()

    out_file = output_path or SMART_MONEY_FILE

    # 1. Load source sector analysis data
    if sector_payload and isinstance(sector_payload, dict) and "sectors" in sector_payload:
        data = sector_payload
    elif SECTOR_ANALYSIS_FILE.exists():
        try:
            with open(SECTOR_ANALYSIS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            logger.error(f"Error loading {SECTOR_ANALYSIS_FILE}: {e}")
            data = {}
    else:
        logger.warning(f"Sector analysis source not available at {SECTOR_ANALYSIS_FILE}.")
        data = {}

    scan_date = bhav_date or data.get("scan_date") or ist_now.strftime("%Y-%m-%d")
    sectors = data.get("sectors", [])

    stage_counts = {1: 0, 2: 0, 3: 0, 4: 0}
    stage_groups = {1: [], 2: [], 3: [], 4: []}
    sector_items: List[Dict[str, Any]] = []

    for s in sectors:
        m = s.get("metrics", {})
        pct_20 = round(float(m.get("pct_above_20_ema", 0)), 1)
        pct_50 = round(float(m.get("pct_above_50_ema", 0)), 1)
        rs_20 = round(float(m.get("rs_20d", 0)), 1)
        flow = str(m.get("flow_bias", "NEUTRAL")).upper()
        deliv_cr = round(float(m.get("delivery_turnover_cr", 0)), 1)

        # Lead anchor stock identification (highest delivery turnover in leaders)
        leaders = s.get("leaders", [])
        top_sym = "N/A"
        if leaders:
            anchor_item = max(leaders, key=lambda x: x.get("delivery_turnover_cr", 0))
            top_sym = anchor_item.get("symbol", "N/A")

        stage_num, stage_name, stage_bias = classify_weinstein_stage(pct_20, pct_50, rs_20, flow)
        stage_counts[stage_num] += 1
        stage_groups[stage_num].append(s.get("display_name", s.get("sector", "")))

        sector_items.append({
            "sector": s.get("display_name", s.get("sector", "")),
            "stage": stage_num,
            "stage_name": stage_name,
            "pct_20": pct_20,
            "pct_50": pct_50,
            "rs_20": rs_20,
            "deliv_cr": deliv_cr,
            "flow": flow,
            "anchor": top_sym
        })

    # Separate into Inflow (Accumulation) vs Outflow / Distribution
    inflows = [sec for sec in sector_items if sec["flow"] in ("ACCUMULATION", "INFLOW")]
    inflows.sort(key=lambda x: x["deliv_cr"], reverse=True)

    outflows = [sec for sec in sector_items if sec["flow"] in ("OUTFLOW", "DISTRIBUTION", "NEUTRAL")]
    outflows.sort(key=lambda x: (1 if x["flow"] == "OUTFLOW" else 0, x["deliv_cr"]), reverse=True)

    total_institutional_deliv_cr = round(sum(sec["deliv_cr"] for sec in sector_items), 1)

    top_accumulating = None
    if inflows:
        top_accumulating = {
            "sector": inflows[0]["sector"],
            "deliv_cr": inflows[0]["deliv_cr"],
            "anchor": inflows[0]["anchor"],
            "flow": inflows[0]["flow"]
        }

    top_distributing = None
    if outflows:
        top_distributing = {
            "sector": outflows[0]["sector"],
            "deliv_cr": outflows[0]["deliv_cr"],
            "anchor": outflows[0]["anchor"],
            "flow": outflows[0]["flow"]
        }

    payload = {
        "scan_date": scan_date,
        "generated_at": iso_timestamp,
        "whale_flow": {
            "top_accumulating": top_accumulating,
            "top_distributing": top_distributing,
            "total_deliv_cr": total_institutional_deliv_cr,
            "inflow_sectors_count": len(inflows),
            "outflow_sectors_count": len(outflows)
        },
        "stage_regimes": {
            "summary": {
                "stage_1_accumulation": stage_counts[1],
                "stage_2_markup": stage_counts[2],
                "stage_3_distribution": stage_counts[3],
                "stage_4_capitulation": stage_counts[4]
            }
        },
        "sectors": sector_items
    }

    # Atomic write to file
    out_file.parent.mkdir(parents=True, exist_ok=True)
    temp_file = out_file.with_suffix(".tmp")
    try:
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, separators=(",", ":"), ensure_ascii=False)
        temp_file.replace(out_file)
        file_size = out_file.stat().st_size
        elapsed = (datetime.now() - t_start).total_seconds()
        logger.info(f"Generated {out_file.name} ({file_size} bytes / {file_size/1024:.2f} KB) in {elapsed:.3f}s")
    except Exception as e:
        logger.error(f"Failed to write {out_file}: {e}")
        if temp_file.exists():
            temp_file.unlink()

    return payload


if __name__ == "__main__":
    logger.info("Executing Smart Money Radar Engine standalone...")
    result = generate_smart_money_data()
    print(f"Completed! Scan date: {result.get('scan_date')} | Total sectors: {len(result.get('sectors', []))}")
