"""
MITS Pro Institutional Suite V2 - Daily Sector Rotation Analyzer
================================================================
Super-lightweight, zero-regression quantitative sector rotation engine.
Aggregates institutional smart money flow (Whale Accumulation vs Distribution)
using only official NSE Security Delivery Bhavcopies and local NIFTY 500 mappings.
Requires NO third-party paid subscriptions and NO external API calls.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SectorRotationAnalyzer")

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
SYMBOLS_FILE = DATA_DIR / "symbols.json"
BHAVCOPY_CACHE_DIR = DATA_DIR / "bhavcopy_cache"
MARKET_SUMMARY_FILE = DATA_DIR / "market_summary.json"
SECTOR_ROTATION_FILE = DATA_DIR / "sector_rotation.json"

# Clean short display names for long NSE sector labels
SECTOR_DISPLAY_MAP = {
    "Automobile and Auto Components": "Auto & Mobility",
    "Capital Goods": "Capital Goods",
    "Chemicals": "Chemicals",
    "Construction": "Construction",
    "Construction Materials": "Cement & Materials",
    "Consumer Durables": "Consumer Durables",
    "Consumer Services": "Consumer Services",
    "Diversified": "Diversified",
    "Fast Moving Consumer Goods": "FMCG",
    "Financial Services": "Banking & Fin",
    "Healthcare": "Healthcare & Pharma",
    "Information Technology": "IT & Tech",
    "Media Entertainment & Publication": "Media",
    "Metals & Mining": "Metals & Mining",
    "Oil Gas & Consumable Fuels": "Oil & Gas",
    "Power": "Power & Energy",
    "Realty": "Realty",
    "Services": "Services",
    "Telecommunication": "Telecom",
    "Textiles": "Textiles"
}

def analyze_sector_rotation() -> Optional[Dict[str, Any]]:
    """
    Computes sector rotation metrics across all NIFTY 500 sectors
    from local NSE Security Delivery Bhavcopy cache files.
    """
    if not SYMBOLS_FILE.exists():
        logger.error(f"Symbols mapping file not found at {SYMBOLS_FILE}")
        return None

    try:
        with open(SYMBOLS_FILE, "r", encoding="utf-8") as f:
            sym_data = json.load(f)
        symbol_list = sym_data.get("symbols", [])
        symbol_sector_map = {s["symbol"]: s.get("sector", "Diversified") for s in symbol_list}
    except Exception as e:
        logger.error(f"Error loading symbols: {e}")
        return None

    # Ensure latest bhavcopy files are cached
    try:
        from smart_money_radar import fetch_nse_bhavcopy_series
        fetch_nse_bhavcopy_series(target_days=10, max_lookback_days=15)
    except Exception as e:
        logger.debug(f"fetch_nse_bhavcopy_series check: {e}")

    # Find cached bhavcopy files
    csv_files = sorted(list(BHAVCOPY_CACHE_DIR.glob("sec_bhavdata_full_*.csv")), reverse=True)
    if not csv_files:
        logger.warning("No bhavcopy files found in bhavcopy_cache directory.")
        return None

    # Target up to 10 trading days for rolling average
    valid_csvs = csv_files[:10]
    latest_csv = valid_csvs[0]
    
    # Extract date string from filename
    date_str = latest_csv.stem.replace("sec_bhavdata_full_", "")
    try:
        session_dt = datetime.strptime(date_str, "%d%m%Y")
        session_date = session_dt.strftime("%Y-%m-%d")
        session_date_display = session_dt.strftime("%d-%b-%Y")
    except Exception:
        session_date = date_str
        session_date_display = date_str

    logger.info(f"Analyzing sector rotation from latest bhavcopy: {latest_csv.name} ({session_date_display})")

    # Read latest day data
    try:
        df_latest = pd.read_csv(latest_csv)
        df_latest.columns = [c.strip() for c in df_latest.columns]
        if "SERIES" in df_latest.columns:
            df_latest = df_latest[df_latest["SERIES"].astype(str).str.strip() == "EQ"]
        df_latest["SYMBOL"] = df_latest["SYMBOL"].astype(str).str.strip()
    except Exception as e:
        logger.error(f"Error reading latest bhavcopy: {e}")
        return None

    # Read historical bhavcopies to compute 10D rolling average delivery quantity/turnover
    hist_deliv_map: Dict[str, List[float]] = {}
    for h_csv in valid_csvs[1:]:
        try:
            h_df = pd.read_csv(h_csv)
            h_df.columns = [c.strip() for c in h_df.columns]
            if "SERIES" in h_df.columns:
                h_df = h_df[h_df["SERIES"].astype(str).str.strip() == "EQ"]
            h_df["SYMBOL"] = h_df["SYMBOL"].astype(str).str.strip()
            h_df["DELIV_QTY"] = pd.to_numeric(h_df.get("DELIV_QTY", 0.0), errors="coerce").fillna(0.0)
            
            for _, r in h_df.iterrows():
                s = r["SYMBOL"]
                if s not in hist_deliv_map:
                    hist_deliv_map[s] = []
                hist_deliv_map[s].append(float(r["DELIV_QTY"]))
        except Exception as e:
            logger.debug(f"Failed parsing historical bhavcopy {h_csv.name}: {e}")

    # Prepare latest data map
    df_latest["PREV_CLOSE"] = pd.to_numeric(df_latest.get("PREV_CLOSE", 0.0), errors="coerce").fillna(0.0)
    df_latest["CLOSE_PRICE"] = pd.to_numeric(df_latest.get("CLOSE_PRICE", 0.0), errors="coerce").fillna(0.0)
    df_latest["DELIV_QTY"] = pd.to_numeric(df_latest.get("DELIV_QTY", 0.0), errors="coerce").fillna(0.0)
    df_latest["DELIV_PER"] = pd.to_numeric(df_latest.get("DELIV_PER", 0.0), errors="coerce").fillna(0.0)
    df_latest["TTL_TRD_QNTY"] = pd.to_numeric(df_latest.get("TTL_TRD_QNTY", 0.0), errors="coerce").fillna(0.0)

    # Sector aggregated data structures
    sector_buckets: Dict[str, Dict[str, Any]] = {}

    for _, row in df_latest.iterrows():
        sym = row["SYMBOL"]
        if sym not in symbol_sector_map:
            continue
        
        sec = symbol_sector_map[sym]
        prev = float(row["PREV_CLOSE"])
        close = float(row["CLOSE_PRICE"])
        deliv_qty = float(row["DELIV_QTY"])
        deliv_pct = float(row["DELIV_PER"])
        trd_qty = float(row["TTL_TRD_QNTY"])

        if prev <= 0 or close <= 0:
            continue

        pct_change = ((close - prev) / prev) * 100.0
        deliv_turnover_cr = (close * deliv_qty) / 1e7  # in INR Crores

        # 10D historical average delivery quantity for this stock
        past_delivs = hist_deliv_map.get(sym, [])
        avg_hist_qty = sum(past_delivs) / len(past_delivs) if past_delivs else deliv_qty
        avg_hist_turnover_cr = (close * avg_hist_qty) / 1e7

        if sec not in sector_buckets:
            sector_buckets[sec] = {
                "stocks": [],
                "pct_changes": [],
                "deliv_turnovers_cr": [],
                "avg_hist_turnovers_cr": [],
                "advances": 0,
                "declines": 0,
                "deliv_pcts": []
            }

        b = sector_buckets[sec]
        b["stocks"].append({
            "symbol": sym,
            "pct_change": pct_change,
            "deliv_turnover_cr": deliv_turnover_cr,
            "deliv_pct": deliv_pct
        })
        b["pct_changes"].append(pct_change)
        b["deliv_turnovers_cr"].append(deliv_turnover_cr)
        b["avg_hist_turnovers_cr"].append(avg_hist_turnover_cr)
        b["deliv_pcts"].append(deliv_pct)

        if pct_change > 0:
            b["advances"] += 1
        elif pct_change < 0:
            b["declines"] += 1

    sector_results: List[Dict[str, Any]] = []

    for sec, b in sector_buckets.items():
        if not b["stocks"]:
            continue

        n_stocks = len(b["stocks"])
        avg_change = sum(b["pct_changes"]) / n_stocks
        total_deliv_cr = sum(b["deliv_turnovers_cr"])
        total_avg_hist_cr = sum(b["avg_hist_turnovers_cr"])
        avg_deliv_pct = sum(b["deliv_pcts"]) / n_stocks

        # Delivery Spike Ratio vs 10D Rolling Delivery Turnover
        if total_avg_hist_cr > 0:
            deliv_spike_pct = ((total_deliv_cr - total_avg_hist_cr) / total_avg_hist_cr) * 100.0
        else:
            deliv_spike_pct = 0.0

        # Smart Money Net Flow Score:
        # Weights price momentum with delivery conviction multiplier
        conviction_mult = max(0.5, 1.0 + (deliv_spike_pct / 100.0))
        flow_score = avg_change * conviction_mult

        # Classify Institutional Status
        if avg_change >= 0.5 and deliv_spike_pct >= 10.0:
            bias = "ACCUMULATION"
            bias_display = "Whale Accumulation"
        elif avg_change > 0.0:
            bias = "MILD_INFLOW"
            bias_display = "Selective Inflow"
        elif avg_change <= -0.5 and deliv_spike_pct >= 10.0:
            bias = "DISTRIBUTION"
            bias_display = "Whale Distribution"
        elif avg_change < 0.0:
            bias = "MILD_OUTFLOW"
            bias_display = "Selective Outflow"
        else:
            bias = "NEUTRAL"
            bias_display = "Consolidation"

        # Identify Top 2 Sector Momentum Leaders
        sorted_leaders = sorted(b["stocks"], key=lambda x: (x["pct_change"], x["deliv_turnover_cr"]), reverse=True)
        top_leaders = [s["symbol"] for s in sorted_leaders[:2]]

        display_name = SECTOR_DISPLAY_MAP.get(sec, sec)

        sector_results.append({
            "sector": sec,
            "display_name": display_name,
            "avg_change_pct": round(avg_change, 2),
            "flow_score": round(flow_score, 2),
            "delivery_turnover_cr": round(total_deliv_cr, 1),
            "delivery_spike_pct": round(deliv_spike_pct, 1),
            "avg_delivery_pct": round(avg_deliv_pct, 1),
            "bias": bias,
            "bias_display": bias_display,
            "stocks_count": n_stocks,
            "advances": b["advances"],
            "declines": b["declines"],
            "leaders": top_leaders
        })

    # Sort sectors by flow score descending
    sector_results.sort(key=lambda x: x["flow_score"], reverse=True)

    # Top 3 Inflow Sectors (best positive flow score)
    inflows = [s for s in sector_results if s["avg_change_pct"] > 0]
    top_inflows = inflows[:3] if len(inflows) >= 3 else sector_results[:3]

    # Top 3 Outflow Sectors (most negative flow score)
    outflows = [s for s in sector_results if s["avg_change_pct"] < 0]
    outflows_sorted = sorted(outflows, key=lambda x: x["flow_score"])
    top_outflows = outflows_sorted[:3] if len(outflows_sorted) >= 3 else sorted(sector_results, key=lambda x: x["flow_score"])[:3]

    payload = {
        "updated_at": datetime.now().isoformat(),
        "session_date": session_date,
        "session_date_display": session_date_display,
        "sectors_analyzed": len(sector_results),
        "top_inflows": top_inflows,
        "top_outflows": top_outflows,
        "all_sectors": sector_results
    }

    # Save to data/sector_rotation.json
    with open(SECTOR_ROTATION_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    logger.info(f"Saved standalone sector rotation data to {SECTOR_ROTATION_FILE}")

    # Safely inject into data/market_summary.json (isolated key, zero-regression)
    if MARKET_SUMMARY_FILE.exists():
        try:
            with open(MARKET_SUMMARY_FILE, "r", encoding="utf-8") as f:
                market_summary = json.load(f)
            
            market_summary["sector_rotation"] = payload
            
            with open(MARKET_SUMMARY_FILE, "w", encoding="utf-8") as f:
                json.dump(market_summary, f, indent=2)
            logger.info(f"Injected 'sector_rotation' key into {MARKET_SUMMARY_FILE}")
        except Exception as e:
            logger.warning(f"Could not inject into market_summary.json: {e}")

    return payload

if __name__ == "__main__":
    result = analyze_sector_rotation()
    if result:
        print("\n" + "=" * 60)
        print(f"MITS PRO - DAILY SECTOR ROTATION ({result['session_date_display']})")
        print("=" * 60)
        print("TOP 3 INSTITUTIONAL INFLOW SECTORS:")
        for s in result["top_inflows"]:
            print(f"  [+] {s['display_name']:<22} | Perf: {s['avg_change_pct']:>+5.2f}% | Deliv Spike: {s['delivery_spike_pct']:>+5.1f}% | Leaders: {', '.join(s['leaders'])}")
        print("\nTOP 3 INSTITUTIONAL OUTFLOW SECTORS:")
        for s in result["top_outflows"]:
            print(f"  [-] {s['display_name']:<22} | Perf: {s['avg_change_pct']:>+5.2f}% | Deliv Spike: {s['delivery_spike_pct']:>+5.1f}% | Leaders: {', '.join(s['leaders'])}")
        print("=" * 60)
