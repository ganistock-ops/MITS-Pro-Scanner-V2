"""
MITS Pro Institutional Suite V2 - Daily Ingestion & Scanner Pipeline
Executes daily at 17:30 IST to generate fresh JSON data feeds for GitHub Pages & WordPress.
"""

import os
import sys
from pathlib import Path
import json
import logging
from datetime import datetime
import pytz
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import yfinance as yf

# Guarantee scripts directory is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = BASE_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from config import (
    TIMEZONE, SYMBOLS_FILE, MARKET_SUMMARY_FILE, SCANNER_RESULTS_FILE,
    TAB1_BOTTOM_REVERSAL_FILE, TAB2_ALPHA_MOMENTUM_FILE, TAB3_HTF_FILE,
    TAB4_WEEKLY_SWING_FILE, TAB5_STAGE2_PULLBACK_FILE, TAB6_DBR_FILE, PRO_SETUPS
)
from angel_one_client import AngelOneClient
from yfinance_feed import YFinanceFeed
from scanner_engine import ScannerEngine
from tab1_bottom_reversal import BottomReversalProEngine
from tab2_alpha_momentum import AlphaMomentumEngine
from tab3_htf import HighTightFlagEngine
from tab4_weekly_swing import WeeklySwingEngine
from tab5_stage2_pullback import Stage2PullbackEngine
from tab6_dbr import DBRDemandZoneEngine


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("PipelineRunner")

def get_ist_now() -> datetime:
    tz = pytz.timezone(TIMEZONE)
    return datetime.now(tz)

def load_symbols():
    if not SYMBOLS_FILE.exists():
        logger.error(f"Symbols file not found: {SYMBOLS_FILE}")
        return []
    with open(SYMBOLS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        return data.get("symbols", [])

def run_pipeline():
    logger.info("Initializing MITS Pro Pipeline execution...")
    ist_now = get_ist_now()
    timestamp_str = ist_now.strftime("%Y-%m-%d %H:%M")
    iso_timestamp = ist_now.isoformat()

    symbols = load_symbols()
    logger.info(f"Loaded {len(symbols)} symbols from universe ({SYMBOLS_FILE}).")

    # Initialize Clients
    angel_client = AngelOneClient()
    use_angel = angel_client.connect()
    if use_angel:
        logger.info("Using Angel One SmartAPI for live/EOD quotes.")
    else:
        logger.info("Using Yahoo Finance Primary/Secondary EOD Feed.")

    # Market Regime Check (NIFTY 50 above 20 EMA & 1Y Benchmark Series)
    nifty_above_ema20 = False
    n_df = None
    try:
        n_ticker = yf.Ticker("^NSEI")
        n_df = n_ticker.history(period="1y", interval="1d")
        if not n_df.empty and len(n_df) >= 20:
            cmp_n = float(n_df["Close"].iloc[-1])
            ema20_n = float(n_df["Close"].ewm(span=20, adjust=False).mean().iloc[-1])
            nifty_above_ema20 = bool(cmp_n > ema20_n)
            logger.info(f"NIFTY 50 CMP: {cmp_n:.2f}, 20 EMA: {ema20_n:.2f} (Above EMA20: {nifty_above_ema20})")
    except Exception as e:
        logger.warning(f"Could not compute NIFTY 50 regime: {e}")

    yf_feed = YFinanceFeed()
    engine = ScannerEngine()
    bottom_engine = BottomReversalProEngine()
    alpha_engine = AlphaMomentumEngine()
    htf_engine = HighTightFlagEngine()
    weekly_swing_engine = WeeklySwingEngine()
    stage2_pullback_engine = Stage2PullbackEngine()
    dbr_engine = DBRDemandZoneEngine()

    # Setup buckets
    results_by_setup = {setup_id: [] for setup_id in PRO_SETUPS.keys()}
    sector_changes = {}
    advances = 0
    declines = 0
    momentum_count = 0
    success_count = 0

    def fetch_stock(item):
        ticker = item.get("yfinance")
        if not ticker:
            ticker = f"{item.get('symbol')}.NS"
        for attempt in range(2):
            try:
                t = yf.Ticker(ticker)
                df = t.history(period="1y", interval="1d")
                if df is not None and not df.empty and len(df) >= 40:
                    return item, df
                time.sleep(0.08)
            except Exception:
                time.sleep(0.08)
        return item, None

    logger.info(f"Scanning universe across {len(symbols)} symbols with 5 parallel workers...")
    t0 = time.time()

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(fetch_stock, item): item for item in symbols}
        for f in as_completed(futures):
            item, df = f.result()
            if df is None or df.empty:
                continue

            success_count += 1
            if success_count % 50 == 0 or success_count == len(symbols):
                logger.info(f"Progress: Processed {success_count}/{len(symbols)} equities...")

            features = yf_feed.calculate_technical_features(df)
            features["timestamp"] = timestamp_str

            chg = features.get("change_pct", 0.0)
            if chg > 0:
                advances += 1
            elif chg < 0:
                declines += 1

            sec = item.get("sector")
            if sec:
                sector_changes.setdefault(sec, []).append(chg)

            if abs(chg) >= 2.0 or features.get("rvol", 1.0) >= 2.0:
                momentum_count += 1

            # Tab 1: Bottom Reversal Pro evaluation (Zero Look-Ahead EOD)
            b_sig = bottom_engine.evaluate(item, df, nifty_above_ema20=nifty_above_ema20)
            if b_sig:
                results_by_setup["setup_1"].append(b_sig)

            # Tab 2: Alpha Momentum evaluation (Multi-Timeframe RS vs NIFTY 50)
            if n_df is not None and not n_df.empty:
                alpha_sig = alpha_engine.evaluate(item, df, n_df)
                if alpha_sig:
                    results_by_setup["setup_2"].append(alpha_sig)

            # Tab 3: High Tight Flag (HTF) evaluation
            htf_sig = htf_engine.evaluate(item, df)
            if htf_sig:
                results_by_setup["setup_3"].append(htf_sig)

            # Tab 4: Weekly Swing Watchlist evaluation
            if n_df is not None and not n_df.empty:
                swing_sig = weekly_swing_engine.evaluate(item, df, n_df)
                if swing_sig:
                    results_by_setup["setup_4"].append(swing_sig)

            # Tab 5: Stage-2 Pullback evaluation
            pb_sig = stage2_pullback_engine.evaluate(item, df)
            if pb_sig:
                results_by_setup["setup_5"].append(pb_sig)

            # Tab 6: Drop-Base-Rally (DBR) Demand Zone evaluation
            dbr_sig = dbr_engine.evaluate(item, df)
            if dbr_sig:
                results_by_setup["setup_6"].append(dbr_sig)

    duration = time.time() - t0
    logger.info(f"EOD scan completed in {duration:.2f}s! Successfully scanned {success_count}/{len(symbols)} stocks.")

    # Sort Tab 1, Tab 2, Tab 3, Tab 4 signals by score descending
    results_by_setup["setup_1"].sort(key=lambda x: x.get("score", 0), reverse=True)
    results_by_setup["setup_2"].sort(key=lambda x: x.get("score", 0), reverse=True)
    results_by_setup["setup_3"].sort(key=lambda x: x.get("score", 0), reverse=True)
    results_by_setup["setup_4"].sort(key=lambda x: x.get("score", 0), reverse=True)
    results_by_setup["setup_5"].sort(key=lambda x: x.get("score", 0), reverse=True)
    results_by_setup["setup_6"].sort(key=lambda x: x.get("score", 0), reverse=True)

    # Dedicated Tab 1 Output
    tab1_payload = {
        "setup_id": "tab1_bottom_reversal",
        "title": "⚡ Setup 1: Bottom Reversal Pro",
        "subtitle": "Early institutional reversal, liquidity sweeps, accumulation base, and bullish structure shift.",
        "last_updated": iso_timestamp,
        "qualifying_count": len(results_by_setup["setup_1"]),
        "signals": results_by_setup["setup_1"]
    }
    with open(TAB1_BOTTOM_REVERSAL_FILE, "w", encoding="utf-8") as f:
        json.dump(tab1_payload, f, indent=2)
    logger.info(f"Updated {TAB1_BOTTOM_REVERSAL_FILE} with {len(results_by_setup['setup_1'])} genuine signals.")

    # Dedicated Tab 2 Output
    tab2_payload = {
        "setup_id": "tab2_alpha_momentum",
        "title": "⚡ Setup 2: Alpha Momentum",
        "subtitle": "Nifty 500 multi-timeframe relative strength outperformance, volume expansion, and 10-60D base recovery.",
        "last_updated": iso_timestamp,
        "qualifying_count": len(results_by_setup["setup_2"]),
        "signals": results_by_setup["setup_2"]
    }
    with open(TAB2_ALPHA_MOMENTUM_FILE, "w", encoding="utf-8") as f:
        json.dump(tab2_payload, f, indent=2)
    logger.info(f"Updated {TAB2_ALPHA_MOMENTUM_FILE} with {len(results_by_setup['setup_2'])} genuine signals.")

    # Dedicated Tab 3 Output
    tab3_payload = {
        "setup_id": "tab3_htf",
        "title": "🚩 Setup 3: High Tight Flag (HTF)",
        "subtitle": "Explosive institutional momentum rally (>= +40% in <= 40D), tight base contraction (<= 20%), and volume dry-up.",
        "last_updated": iso_timestamp,
        "qualifying_count": len(results_by_setup["setup_3"]),
        "signals": results_by_setup["setup_3"]
    }
    with open(TAB3_HTF_FILE, "w", encoding="utf-8") as f:
        json.dump(tab3_payload, f, indent=2)
    logger.info(f"Updated {TAB3_HTF_FILE} with {len(results_by_setup['setup_3'])} genuine signals.")

    # Dedicated Tab 4 Output
    tab4_payload = {
        "setup_id": "tab4_weekly_swing",
        "title": "📈 Setup 4: Weekly Swing",
        "subtitle": "Multi-timeframe institutional weekly swing structure, trend alignment, and low-risk accumulation.",
        "last_updated": iso_timestamp,
        "qualifying_count": len(results_by_setup["setup_4"]),
        "signals": results_by_setup["setup_4"]
    }
    with open(TAB4_WEEKLY_SWING_FILE, "w", encoding="utf-8") as f:
        json.dump(tab4_payload, f, indent=2)
    logger.info(f"Updated {TAB4_WEEKLY_SWING_FILE} with {len(results_by_setup['setup_4'])} genuine signals.")

    # Dedicated Tab 5 Output
    tab5_payload = {
        "setup_id": "tab5_stage2_pullback",
        "title": "🎯 Setup 5: Stage-2 Pullback",
        "subtitle": "Institutional low-risk entries at key EMA supports during verified Stage-2 uptrends.",
        "last_updated": iso_timestamp,
        "qualifying_count": len(results_by_setup["setup_5"]),
        "signals": results_by_setup["setup_5"]
    }
    with open(TAB5_STAGE2_PULLBACK_FILE, "w", encoding="utf-8") as f:
        json.dump(tab5_payload, f, indent=2)
    logger.info(f"Updated {TAB5_STAGE2_PULLBACK_FILE} with {len(results_by_setup['setup_5'])} genuine signals.")

    # Dedicated Tab 6 Output
    tab6_payload = {
        "setup_id": "tab6_dbr",
        "title": "📦 Setup 6: DBR Demand Zone",
        "subtitle": "Institutional order block accumulation, fresh demand zone retests, and explosive leg-out expansions.",
        "last_updated": iso_timestamp,
        "qualifying_count": len(results_by_setup["setup_6"]),
        "signals": results_by_setup["setup_6"]
    }
    with open(TAB6_DBR_FILE, "w", encoding="utf-8") as f:
        json.dump(tab6_payload, f, indent=2)
    logger.info(f"Updated {TAB6_DBR_FILE} with {len(results_by_setup['setup_6'])} genuine signals.")

    # Update scanner_results.json
    output_payload = {
        "last_updated": iso_timestamp,
        "generated_by": "MITS Pro Quantitative Engine V2 - Real Market EOD",
        "universe_scanned": len(symbols),
        "successful_evaluations": success_count,
        "setups": {}
    }
    for setup_id, meta in PRO_SETUPS.items():
        output_payload["setups"][setup_id] = {
            "id": setup_id,
            "title": meta["title"],
            "subtitle": meta["subtitle"],
            "count": len(results_by_setup[setup_id]),
            "signals": results_by_setup[setup_id]
        }

    with open(SCANNER_RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(output_payload, f, indent=2)
    logger.info(f"Updated {SCANNER_RESULTS_FILE}.")

    # Dynamic Indices Calculation
    cmp_n = 23346.40
    chg_n = -124.50
    chg_pct_n = -0.53
    nifty_trend = "DEFENSIVE"
    if n_df is not None and not n_df.empty and len(n_df) >= 2:
        cmp_n = float(n_df["Close"].iloc[-1])
        prev_n = float(n_df["Close"].iloc[-2])
        chg_n = cmp_n - prev_n
        chg_pct_n = (chg_n / prev_n) * 100
        nifty_trend = "BULLISH ACCUMULATION" if nifty_above_ema20 else "DEFENSIVE"

    bn_cmp = 50125.80
    bn_chg = -210.20
    bn_pct = -0.42
    bn_trend = "DEFENSIVE"
    try:
        bn_ticker = yf.Ticker("^NSEBANK")
        bn_df = bn_ticker.history(period="5d", interval="1d")
        if not bn_df.empty and len(bn_df) >= 2:
            bn_cmp = float(bn_df["Close"].iloc[-1])
            bn_prev = float(bn_df["Close"].iloc[-2])
            bn_chg = bn_cmp - bn_prev
            bn_pct = (bn_chg / bn_prev) * 100
            bn_trend = "BULLISH" if bn_pct >= 0 else "DEFENSIVE"
    except Exception as e:
        logger.warning(f"Could not fetch BANKNIFTY index: {e}")

    vix_cmp = 14.15
    vix_chg = 0.35
    vix_pct = 2.54
    vix_trend = "MODERATE_VOLATILITY"
    try:
        vix_ticker = yf.Ticker("^INDIAVIX")
        vix_df = vix_ticker.history(period="5d", interval="1d")
        if not vix_df.empty and len(vix_df) >= 2:
            vix_cmp = float(vix_df["Close"].iloc[-1])
            vix_prev = float(vix_df["Close"].iloc[-2])
            vix_chg = vix_cmp - vix_prev
            vix_pct = (vix_chg / vix_prev) * 100
            vix_trend = "HIGH_VOLATILITY" if vix_cmp >= 18 else ("LOW_VOLATILITY" if vix_cmp < 13 else "MODERATE_VOLATILITY")
    except Exception as e:
        logger.warning(f"Could not fetch INDIA VIX: {e}")

    # Compute sector matrix performance dynamically
    key_sectors = [
        ("Healthcare", ["Healthcare", "Pharma"]),
        ("Banking & Fin", ["Financial Services", "Banking", "Banks"]),
        ("IT & Tech", ["Information Technology", "IT", "Technology"]),
        ("Metals & Mining", ["Metals & Mining", "Metals"]),
        ("Auto & Mobility", ["Automobile and Auto Components", "Auto"]),
    ]
    computed_sector_matrix = []
    for label, matching_sectors in key_sectors:
        vals = []
        for s_name, chg_list in sector_changes.items():
            if any(m.lower() in s_name.lower() for m in matching_sectors):
                vals.extend(chg_list)
        if vals:
            avg_pct = sum(vals) / len(vals)
            perf_str = f"{'+' if avg_pct >= 0 else ''}{avg_pct:.2f}%"
            if avg_pct >= 1.0:
                bias = "STRONG_ACCUMULATION"
            elif avg_pct > 0.0:
                bias = "SELECTIVE_ACCUMULATION"
            elif avg_pct >= -1.0:
                bias = "CONSOLIDATING"
            else:
                bias = "DEFENSIVE"
        else:
            perf_str = "+0.00%"
            bias = "NEUTRAL"
        computed_sector_matrix.append({"sector": label, "performance": perf_str, "bias": bias})

    # Update market summary
    total_signals = sum(len(signals) for signals in results_by_setup.values())
    summary_payload = {
        "scan_timestamp": iso_timestamp,
        "market_status": "CLOSED" if ist_now.hour >= 16 else "OPEN",
        "last_session_date": ist_now.strftime("%Y-%m-%d"),
        "indices": {
            "NIFTY_50": { "name": "NIFTY 50", "price": round(cmp_n, 2), "change": round(chg_n, 2), "change_pct": round(chg_pct_n, 2), "trend": nifty_trend },
            "BANKNIFTY": { "name": "BANK NIFTY", "price": round(bn_cmp, 2), "change": round(bn_chg, 2), "change_pct": round(bn_pct, 2), "trend": bn_trend },
            "INDIA_VIX": { "name": "INDIA VIX", "price": round(vix_cmp, 2), "change": round(vix_chg, 2), "change_pct": round(vix_pct, 2), "trend": vix_trend }
        },
        "market_breadth": {
            "advances": advances,
            "declines": declines,
            "ratio": f"{round(advances / max(declines, 1), 2)}:1",
            "institutional_bias": "STRONG ACCUMULATION" if advances > declines else "DEFENSIVE / SELECTIVE ACCUMULATION",
            "bias_color": "gold" if advances > declines else "amber",
            "total_scanned": success_count,
            "high_momentum_count": momentum_count,
            "pro_alerts_count": total_signals
        },
        "sector_matrix": computed_sector_matrix
    }

    with open(MARKET_SUMMARY_FILE, "w", encoding="utf-8") as f:
        json.dump(summary_payload, f, indent=2)
    logger.info(f"Updated {MARKET_SUMMARY_FILE}")

    print("\n" + "=" * 75)
    print("MITS PRO SCANNER - NIFTY 500 REAL MARKET PIPELINE COMPLETE")
    print(f"Time Taken: {duration:.2f}s | Scanned: {success_count}/{len(symbols)} Equities")
    print(f"Tab 1 (Bottom Reversal Pro) Signals (Score >= 70): {len(results_by_setup['setup_1'])}")
    for s in results_by_setup["setup_1"]:
        print(f"  * {s['symbol']:<12} | {s['sector']:<18} | Score: {s['score_display']:<8} | CMP: Rs.{s['cmp']:<8.2f} | SL: Rs.{s['invalidation']:<8.2f} | T1: Rs.{s['target_1']:<8.2f} | R:R: {s['risk_reward_ratio']:<6} | {s['status']}")
    print(f"\nTab 2 (Alpha Momentum) Signals: {len(results_by_setup['setup_2'])}")
    for s in results_by_setup["setup_2"]:
        print(f"  * {s['symbol']:<12} | {s['sector']:<18} | Score: {s['score_display']:<8} | CMP: Rs.{s['cmp']:<8.2f} | 1Y RS: +{s['rs_1y']}% | SL: Rs.{s['invalidation']:<8.2f} | T1: Rs.{s['target_1']:<8.2f} | R:R: {s['risk_reward_ratio']:<6} | {s['status']}")
    print(f"\nTab 3 (High Tight Flag) Signals: {len(results_by_setup['setup_3'])}")
    for s in results_by_setup["setup_3"]:
        print(f"  * {s['symbol']:<12} | {s['sector']:<18} | Score: {s['score_display']:<8} | CMP: Rs.{s['cmp']:<8.2f} | Pole: +{s['pole_gain_pct']}% | Flag: {s['flag_days']}D (-{s['correction_pct']}%) | SL: Rs.{s['invalidation']:<8.2f} | T1: Rs.{s['target_1']:<8.2f} | R:R: {s['risk_reward_ratio']:<6} | {s['status']}")
    print(f"\nTab 4 (Weekly Swing) Signals: {len(results_by_setup['setup_4'])}")
    for s in results_by_setup["setup_4"]:
        print(f"  * {s['symbol']:<12} | {s['sector']:<18} | Score: {s['score_display']:<8} | CMP: Rs.{s['cmp']:<8.2f} | 1W Ret: +{s['ret_1w']}% | Base: {s['nearest_support_base']} | SL: Rs.{s['invalidation']:<8.2f} | T1: Rs.{s['target_1']:<8.2f} | R:R: {s['risk_reward_ratio']:<6} | {s['status']}")
    print(f"\nTab 5 (Stage-2 Pullback) Signals: {len(results_by_setup['setup_5'])}")
    for s in results_by_setup["setup_5"]:
        print(f"  * {s['symbol']:<12} | {s['sector']:<18} | Score: {s['score_display']:<8} | CMP: Rs.{s['cmp']:<8.2f} | Support: {s['support_level']} | SL: Rs.{s['invalidation']:<8.2f} | T1: Rs.{s['target_1']:<8.2f} | R:R: {s['risk_reward_ratio']:<6} | {s['status']}")
    print(f"\nTab 6 (DBR Demand Zone) Signals: {len(results_by_setup['setup_6'])}")
    for s in results_by_setup["setup_6"]:
        print(f"  * {s['symbol']:<12} | {s['sector']:<18} | Score: {s['score_display']:<8} | CMP: Rs.{s['cmp']:<8.2f} | Stage: {s['stage']} | Base: {s['base_bars']}D | SL: Rs.{s['invalidation']:<8.2f} | T1: Rs.{s['target_1']:<8.2f} | R:R: {s['risk_reward_ratio']:<6} | {s['status']}")
    print("=" * 75)

if __name__ == "__main__":
    run_pipeline()
