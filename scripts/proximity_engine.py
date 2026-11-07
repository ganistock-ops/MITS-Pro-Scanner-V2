#!/usr/bin/env python3
"""
MITS Pro Scanner V2 - Proximity Pivot Radar Engine (Root Bridge)
================================================================
Re-exports proximity engine functions for direct import from scripts directory.
"""

import sys
from pathlib import Path

# Ensure scripts and scripts/utils are in sys.path
SCRIPTS_DIR = Path(__file__).resolve().parent
UTILS_DIR = SCRIPTS_DIR / "utils"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))
if str(UTILS_DIR) not in sys.path:
    sys.path.insert(0, str(UTILS_DIR))

try:
    from utils.proximity_engine import (
        compute_proximity_block,
        extract_levels_for_stock,
        enrich_stock_with_proximity,
        enrich_all_scanner_outputs,
        benchmark_proximity_computation,
        load_master_universe_map,
        DEFAULT_BUFFER_PCT
    )
except ImportError:
    from proximity_engine import (  # type: ignore
        compute_proximity_block,
        extract_levels_for_stock,
        enrich_stock_with_proximity,
        enrich_all_scanner_outputs,
        benchmark_proximity_computation,
        load_master_universe_map,
        DEFAULT_BUFFER_PCT
    )

__all__ = [
    "compute_proximity_block",
    "extract_levels_for_stock",
    "enrich_stock_with_proximity",
    "enrich_all_scanner_outputs",
    "benchmark_proximity_computation",
    "load_master_universe_map",
    "DEFAULT_BUFFER_PCT"
]

if __name__ == "__main__":
    res = enrich_all_scanner_outputs()
    overhead = benchmark_proximity_computation()
    print(f"Enrichment result: {res}")
    print(f"Pure computation overhead: {overhead} ms")
