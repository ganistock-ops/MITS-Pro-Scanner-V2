"""
MITS Pro Institutional Suite V2 - Real Market EOD Scanner Runner
Wraps the unified pipeline execution with official NSE Bhavcopy ingestion.
"""
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = BASE_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from run_pipeline import run_pipeline

def run_real_scan():
    run_pipeline()

if __name__ == "__main__":
    run_real_scan()
