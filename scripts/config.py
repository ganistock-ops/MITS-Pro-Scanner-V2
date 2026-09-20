"""
MITS Pro Institutional Suite V2 - Configuration Module
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load local environment if available
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# Angel One SmartAPI Credentials
SMARTAPI_KEY = os.getenv("SMARTAPI_KEY", "")
SMARTAPI_CLIENT_CODE = os.getenv("SMARTAPI_CLIENT_CODE", "")
SMARTAPI_PIN = os.getenv("SMARTAPI_PIN", "")
SMARTAPI_TOTP_TOKEN = os.getenv("SMARTAPI_TOTP_TOKEN", "")

# Data Directory Paths
DATA_DIR = BASE_DIR / os.getenv("DATA_DIR", "data")
DATA_DIR.mkdir(parents=True, exist_ok=True)

SYMBOLS_FILE = DATA_DIR / "symbols.json"
MARKET_SUMMARY_FILE = DATA_DIR / "market_summary.json"
SCANNER_RESULTS_FILE = DATA_DIR / "scanner_results.json"
TAB1_BOTTOM_REVERSAL_FILE = DATA_DIR / "tab1_bottom_reversal.json"
TAB2_ALPHA_MOMENTUM_FILE = DATA_DIR / "tab2_alpha_momentum.json"
TAB3_HTF_FILE = DATA_DIR / "tab3_htf.json"
TAB4_WEEKLY_SWING_FILE = DATA_DIR / "tab4_weekly_swing.json"
TAB5_STAGE2_PULLBACK_FILE = DATA_DIR / "tab5_stage2_pullback.json"
TAB6_DBR_FILE = DATA_DIR / "tab6_dbr.json"

# Operational Constants
TIMEZONE = "Asia/Kolkata"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
MIN_AVG_VOLUME_20D = int(os.getenv("MIN_AVG_VOLUME_20D", 100000))
MIN_CLOSE_PRICE = float(os.getenv("MIN_CLOSE_PRICE", 50.0))
MAX_CLOSE_PRICE = float(os.getenv("MAX_CLOSE_PRICE", 50000.0))

# Pro Setups Meta Definition
PRO_SETUPS = {
    "setup_1": {
        "id": "setup_1",
        "title": "⚡ Setup 1: Bottom Reversal Pro",
        "subtitle": "Early institutional reversal, liquidity sweeps, accumulation base, and bullish structure shift.",
    },
    "setup_2": {
        "id": "setup_2",
        "title": "⚡ Setup 2: Alpha Momentum",
        "subtitle": "Nifty 500 multi-timeframe relative strength outperformance, volume expansion, and 10-60D base recovery.",
    },
    "setup_3": {
        "id": "setup_3",
        "title": "🚩 Setup 3: High Tight Flag (HTF)",
        "subtitle": "Explosive institutional momentum rally (>= +40% in <= 40D), tight base contraction (<= 20%), and volume dry-up.",
    },
    "setup_4": {
        "id": "setup_4",
        "title": "📈 Setup 4: Weekly Swing",
        "subtitle": "Multi-timeframe institutional weekly swing structure, trend alignment, and low-risk accumulation.",
    },
    "setup_5": {
        "id": "setup_5",
        "title": "🎯 Setup 5: Stage-2 Pullback",
        "subtitle": "Institutional low-risk entries at key EMA supports during verified Stage-2 uptrends.",
    },
    "setup_6": {
        "id": "setup_6",
        "title": "📦 Setup 6: DBR Demand Zone",
        "subtitle": "Institutional order block accumulation, fresh demand zone retests, and explosive leg-out expansions.",
    }
}


