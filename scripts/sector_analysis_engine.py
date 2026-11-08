"""
MITS Pro Institutional Suite V2 - Sector Analysis Engine
========================================================
Super-lightweight, zero-regression quantitative 3-Pillar Sector Engine.
Aggregates Institutional Relative Strength, Structural Market Breadth, and
Whale Delivery Flows for all 20 NSE sectors across the NIFTY 500 universe.

Strict Constraints:
- ZERO external HTTP calls. Reads from in-memory pipeline or local parquet/bhavcopy cache.
- Execution speed < 1.0 second.
- Exports to data/sector_analysis.json.

Pillars:
1. Institutional Relative Strength (5D/20D RS vs Nifty 50, Delivery-weighted return) [Max 35 pts]
2. Structural Breadth (% > 20 EMA, % > 50 EMA, Advance/Decline ratio) [Max 35 pts]
3. Whale Delivery & Flow Score (Turnover in ₹ Cr, Delivery Spike vs 10D mean, Flow Bias) [Max 30 pts]
"""

import os
import sys
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np
import pytz

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
CACHE_DIR = BASE_DIR / "cache"
BHAVCOPY_CACHE_DIR = DATA_DIR / "bhavcopy_cache"
SECTOR_ANALYSIS_FILE = DATA_DIR / "sector_analysis.json"
SYMBOLS_FILE = DATA_DIR / "symbols.json"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SectorAnalysisEngine")

# Standardized Sector Display Names for concise UI presentation
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
    "Financial Services": "Financial Services",
    "Healthcare": "Healthcare & Pharma",
    "Information Technology": "IT & Tech",
    "Media Entertainment & Publication": "Media & Ent",
    "Metals & Mining": "Metals & Mining",
    "Oil Gas & Consumable Fuels": "Oil & Gas",
    "Power": "Power & Energy",
    "Realty": "Realty",
    "Services": "Services",
    "Telecommunication": "Telecom",
    "Textiles": "Textiles"
}


def _calc_ema(series: pd.Series, span: int) -> pd.Series:
    """Computes Exponential Moving Average with adjust=False."""
    return series.ewm(span=span, adjust=False).mean()


def _parse_bhavcopy_date(p: Path) -> datetime:
    """Parses DDMMYYYY date string from sec_bhavdata_full_DDMMYYYY.csv."""
    try:
        raw_str = p.stem.replace("sec_bhavdata_full_", "")
        return datetime.strptime(raw_str, "%d%m%Y")
    except Exception:
        return datetime.min


def generate_sector_analysis(
    symbols: Optional[List[Dict[str, Any]]] = None,
    stock_dfs: Optional[Dict[str, pd.DataFrame]] = None,
    bhav_date: Optional[str] = None,
    bhav_map: Optional[Dict[str, Dict[str, Any]]] = None,
    delivery_analytics_map: Optional[Dict[str, Dict[str, Any]]] = None,
    n_df: Optional[pd.DataFrame] = None,
    output_path: Optional[Path] = None
) -> Dict[str, Any]:
    """
    Main entry point for Sector Analysis generation.
    Can execute in-memory inside run_pipeline.py or standalone via local parquet cache.
    """
    t_start = datetime.now()
    tz = pytz.timezone("Asia/Kolkata")
    ist_now = datetime.now(tz)
    iso_timestamp = ist_now.isoformat()

    out_file = output_path or SECTOR_ANALYSIS_FILE

    # 1. Load symbols mapping
    if symbols is None:
        if SYMBOLS_FILE.exists():
            with open(SYMBOLS_FILE, "r", encoding="utf-8") as f:
                sym_data = json.load(f)
                symbols = sym_data.get("symbols", [])
        else:
            symbols = []

    symbol_meta_map: Dict[str, Dict[str, Any]] = {}
    for s in symbols:
        sym = s.get("symbol")
        if sym:
            symbol_meta_map[sym] = {
                "name": s.get("name", sym),
                "sector": s.get("sector", "Diversified"),
                "exchange": s.get("exchange", "NSE")
            }

    # 2. Load benchmark (NIFTY 50)
    bench_df = n_df
    if bench_df is None or bench_df.empty:
        bench_parquet = CACHE_DIR / "benchmark.parquet"
        if bench_parquet.exists():
            bench_df = pd.read_parquet(bench_parquet)

    # 3. Load stock histories
    if stock_dfs is None:
        stock_dfs = {}
        ohlcv_parquet = CACHE_DIR / "market_ohlcv.parquet"
        if ohlcv_parquet.exists():
            full_ohlcv = pd.read_parquet(ohlcv_parquet)
            sym_col = "Symbol" if "Symbol" in full_ohlcv.columns else "symbol"
            for sym, group in full_ohlcv.groupby(sym_col):
                stock_dfs[str(sym)] = group.sort_values("Date").reset_index(drop=True)

    # Determine latest candle date for date synchronization
    latest_candle_dt = None
    if stock_dfs:
        first_df = next(iter(stock_dfs.values()))
        if "Date" in first_df.columns and len(first_df) > 0:
            last_date_val = first_df["Date"].iloc[-1]
            if hasattr(last_date_val, "strftime"):
                latest_candle_dt = last_date_val.strftime("%Y-%m-%d")
            else:
                latest_candle_dt = str(last_date_val)[:10]

    scan_date = str(bhav_date) if bhav_date else (latest_candle_dt or ist_now.strftime("%Y-%m-%d"))
    if latest_candle_dt and scan_date < latest_candle_dt:
        scan_date = latest_candle_dt

    # 4. Fallback Bhavcopy and Delivery Analytics loading if not supplied
    if bhav_map is None or delivery_analytics_map is None:
        bhav_map = {}
        delivery_analytics_map = {}
        if BHAVCOPY_CACHE_DIR.exists():
            csv_files = sorted(list(BHAVCOPY_CACHE_DIR.glob("sec_bhavdata_full_*.csv")), key=_parse_bhavcopy_date, reverse=True)
            if csv_files:
                valid_csvs = csv_files[:10]
                latest_csv = valid_csvs[0]
                try:
                    df_latest = pd.read_csv(latest_csv)
                    df_latest.columns = [c.strip() for c in df_latest.columns]
                    if "SERIES" in df_latest.columns:
                        df_latest = df_latest[df_latest["SERIES"].astype(str).str.strip() == "EQ"]
                    df_latest["SYMBOL"] = df_latest["SYMBOL"].astype(str).str.strip()

                    for _, r in df_latest.iterrows():
                        sym = str(r["SYMBOL"])
                        bhav_map[sym] = {
                            "close": float(pd.to_numeric(r.get("CLOSE_PRICE", 0.0), errors="coerce") or 0.0),
                            "prev_close": float(pd.to_numeric(r.get("PREV_CLOSE", 0.0), errors="coerce") or 0.0),
                            "deliv_qty": float(pd.to_numeric(r.get("DELIV_QTY", 0.0), errors="coerce") or 0.0),
                            "deliv_per": float(pd.to_numeric(r.get("DELIV_PER", 0.0), errors="coerce") or 0.0),
                            "volume": float(pd.to_numeric(r.get("TTL_TRD_QNTY", 0.0), errors="coerce") or 0.0)
                        }

                    # Historical delivery for 10D rolling mean
                    hist_qtys: Dict[str, List[float]] = {}
                    hist_pers: Dict[str, List[float]] = {}
                    for h_csv in valid_csvs:
                        try:
                            h_df = pd.read_csv(h_csv)
                            h_df.columns = [c.strip() for c in h_df.columns]
                            if "SERIES" in h_df.columns:
                                h_df = h_df[h_df["SERIES"].astype(str).str.strip() == "EQ"]
                            h_df["SYMBOL"] = h_df["SYMBOL"].astype(str).str.strip()
                            syms = h_df["SYMBOL"].values
                            qtys = pd.to_numeric(h_df.get("DELIV_QTY", 0.0), errors="coerce").fillna(0.0).values
                            pers = pd.to_numeric(h_df.get("DELIV_PER", 0.0), errors="coerce").fillna(0.0).values
                            for i, s in enumerate(syms):
                                if s not in hist_qtys:
                                    hist_qtys[s] = []
                                    hist_pers[s] = []
                                hist_qtys[s].append(float(qtys[i]))
                                hist_pers[s].append(float(pers[i]))
                        except Exception:
                            pass

                    for s, q_list in hist_qtys.items():
                        cur_per = hist_pers[s][0] if s in hist_pers and hist_pers[s] else 0.0
                        cur_qty = q_list[0] if q_list else 0.0
                        avg_deliv_10d = round(sum(hist_pers[s]) / len(hist_pers[s]), 1) if s in hist_pers and hist_pers[s] else cur_per
                        avg_deliv_vol_10d = round(sum(q_list) / len(q_list), 0) if q_list else cur_qty
                        spike_pct = round(((cur_per - avg_deliv_10d) / avg_deliv_10d) * 100.0, 1) if avg_deliv_10d > 0 else 0.0
                        delivery_analytics_map[s] = {
                            "delivery_pct": round(cur_per, 1),
                            "delivery_qty": round(cur_qty, 0),
                            "avg_deliv_10d": round(avg_deliv_10d, 1),
                            "avg_deliv_vol_10d": round(avg_deliv_vol_10d, 0),
                            "delivery_spike_pct": spike_pct
                        }
                except Exception as e:
                    logger.warning(f"Error parsing local bhavcopy cache: {e}")

    # 5. Benchmark Performance Calculation
    b_cmp = 0.0
    b_ret_1d = 0.0
    b_ret_5d = 0.0
    b_ret_20d = 0.0
    if bench_df is not None and not bench_df.empty:
        b_closes = bench_df["Close"].dropna().values
        if len(b_closes) > 0:
            b_cmp = round(float(b_closes[-1]), 2)
            b_prev = float(b_closes[-2]) if len(b_closes) >= 2 else b_cmp
            b_ret_1d = round(((b_cmp - b_prev) / b_prev) * 100.0, 2) if b_prev > 0 else 0.0

            b_c5 = float(b_closes[-6]) if len(b_closes) >= 6 else b_prev
            b_ret_5d = round(((b_cmp - b_c5) / b_c5) * 100.0, 2) if b_c5 > 0 else 0.0

            b_c20 = float(b_closes[-21]) if len(b_closes) >= 21 else b_c5
            b_ret_20d = round(((b_cmp - b_c20) / b_c20) * 100.0, 2) if b_c20 > 0 else 0.0

    # 6. Evaluate all constituent stocks
    stock_metrics: Dict[str, Dict[str, Any]] = {}

    for sym, meta in symbol_meta_map.items():
        sdf = stock_dfs.get(sym)
        if sdf is None or sdf.empty:
            continue

        c_series = sdf["Close"].dropna()
        if len(c_series) < 5:
            continue

        closes = c_series.values
        # Resolve today's Close and Prev Close (Guard against stale Bhavcopy)
        last_dt = sdf.index[-1]
        last_dt_str = last_dt.strftime("%Y-%m-%d") if hasattr(last_dt, "strftime") else str(last_dt)
        bm = bhav_map.get(sym, {}) if bhav_map else {}
        bm_dt = bm.get("date") if bm else None
        bm_dt_str = bm_dt.strftime("%Y-%m-%d") if hasattr(bm_dt, "strftime") else (str(bm_dt) if bm_dt else None)
        bhav_date_matches = bool(bm and (bm_dt_str == last_dt_str if bm_dt_str else True))

        close = float(bm.get("close", 0.0)) if bhav_date_matches else 0.0
        if close <= 0.0:
            close = float(closes[-1])

        prev_close = float(bm.get("prev_close", 0.0)) if bhav_date_matches else 0.0
        if prev_close <= 0.0:
            prev_close = float(closes[-2]) if len(closes) >= 2 else close

        ret_1d = round(((close - prev_close) / prev_close) * 100.0, 2) if prev_close > 0 else 0.0

        # 5-Day & 20-Day Returns
        c_5 = float(closes[-6]) if len(closes) >= 6 else (float(closes[0]) if len(closes) > 0 else close)
        ret_5d = round(((close - c_5) / c_5) * 100.0, 2) if c_5 > 0 else ret_1d

        c_20 = float(closes[-21]) if len(closes) >= 21 else (float(closes[0]) if len(closes) > 0 else close)
        ret_20d = round(((close - c_20) / c_20) * 100.0, 2) if c_20 > 0 else ret_5d

        # Technical Breadth: EMAs
        ema20 = float(_calc_ema(c_series, 20).iloc[-1]) if len(c_series) >= 10 else close
        ema50 = float(_calc_ema(c_series, 50).iloc[-1]) if len(c_series) >= 20 else close

        above_20_ema = bool(close > ema20)
        above_50_ema = bool(close > ema50)

        # Delivery & Turnover
        deliv_meta = delivery_analytics_map.get(sym, {})
        deliv_qty = float(bm.get("deliv_qty", 0.0) or deliv_meta.get("delivery_qty", 0.0))
        deliv_pct = float(bm.get("deliv_per", 0.0) or deliv_meta.get("delivery_pct", 0.0))
        trd_vol = float(bm.get("volume", 0.0) or (sdf["Volume"].iloc[-1] if "Volume" in sdf.columns else 0.0))

        turnover_cr = round((close * trd_vol) / 1e7, 2)
        deliv_turnover_cr = round((close * deliv_qty) / 1e7, 2)
        delivery_spike_pct = float(deliv_meta.get("delivery_spike_pct", 0.0))

        avg_deliv_vol_10d = float(deliv_meta.get("avg_deliv_vol_10d", deliv_qty))
        hist_deliv_turnover_cr = (close * avg_deliv_vol_10d) / 1e7

        # Individual Relative Strength vs NIFTY
        rs_20d = round(ret_20d - b_ret_20d, 2)

        stock_metrics[sym] = {
            "symbol": sym,
            "name": meta.get("name", sym),
            "sector": meta.get("sector", "Diversified"),
            "close": round(close, 2),
            "prev_close": round(prev_close, 2),
            "ret_1d": ret_1d,
            "ret_5d": ret_5d,
            "ret_20d": ret_20d,
            "rs_20d": rs_20d,
            "above_20_ema": above_20_ema,
            "above_50_ema": above_50_ema,
            "turnover_cr": turnover_cr,
            "deliv_turnover_cr": deliv_turnover_cr,
            "deliv_pct": round(deliv_pct, 1),
            "delivery_spike_pct": round(delivery_spike_pct, 1),
            "hist_deliv_turnover_cr": hist_deliv_turnover_cr
        }

    # 7. Aggregate by Sector (Targeting all 20 canonical sectors)
    sector_stocks_map: Dict[str, List[Dict[str, Any]]] = {sec: [] for sec in SECTOR_DISPLAY_MAP.keys()}

    for sym, m in stock_metrics.items():
        sec = m["sector"]
        if sec in sector_stocks_map:
            sector_stocks_map[sec].append(m)
        else:
            # Fallback bucket
            if "Diversified" not in sector_stocks_map:
                sector_stocks_map["Diversified"] = []
            sector_stocks_map["Diversified"].append(m)

    sector_results: List[Dict[str, Any]] = []

    for sec_name, constituent_stocks in sector_stocks_map.items():
        k = len(constituent_stocks)
        disp_name = SECTOR_DISPLAY_MAP.get(sec_name, sec_name)

        if k == 0:
            # Placeholder for rare empty sector
            sector_results.append({
                "rank": 20,
                "sector": sec_name,
                "display_name": disp_name,
                "total_score": 0.0,
                "grade": "Lagging",
                "status": "LAGGING",
                "quadrant": "Lagging",
                "pillar_scores": {"rs_score": 0.0, "breadth_score": 0.0, "flow_score": 0.0},
                "metrics": {
                    "stocks_count": 0, "advances": 0, "declines": 0, "ad_ratio": 0.0,
                    "pct_above_20_ema": 0.0, "pct_above_50_ema": 0.0,
                    "return_1d": 0.0, "return_5d": 0.0, "return_20d": 0.0,
                    "rs_5d": 0.0, "rs_20d": 0.0, "delivery_weighted_return_1d": 0.0,
                    "total_turnover_cr": 0.0, "delivery_turnover_cr": 0.0,
                    "avg_delivery_pct": 0.0, "delivery_spike_pct": 0.0,
                    "flow_bias": "NEUTRAL", "flow_bias_display": "Neutral Flow"
                },
                "leaders": [],
                "laggards": []
            })
            continue

        # Performance Returns
        ret_1d_list = [s["ret_1d"] for s in constituent_stocks]
        ret_5d_list = [s["ret_5d"] for s in constituent_stocks]
        ret_20d_list = [s["ret_20d"] for s in constituent_stocks]

        avg_ret_1d = round(float(np.mean(ret_1d_list)), 2)
        avg_ret_5d = round(float(np.mean(ret_5d_list)), 2)
        avg_ret_20d = round(float(np.mean(ret_20d_list)), 2)

        # Relative Strength vs Benchmark
        rs_1d = round(avg_ret_1d - b_ret_1d, 2)
        rs_5d = round(avg_ret_5d - b_ret_5d, 2)
        rs_20d = round(avg_ret_20d - b_ret_20d, 2)

        # Delivery-Weighted Return
        deliv_cr_list = [s["deliv_turnover_cr"] for s in constituent_stocks]
        total_deliv_cr = round(float(sum(deliv_cr_list)), 2)
        total_turnover_cr = round(float(sum([s["turnover_cr"] for s in constituent_stocks])), 2)

        if total_deliv_cr > 0:
            deliv_weighted_ret_1d = round(float(sum([s["ret_1d"] * (s["deliv_turnover_cr"] / total_deliv_cr) for s in constituent_stocks])), 2)
        else:
            deliv_weighted_ret_1d = avg_ret_1d

        # Breadth Metrics
        advances = sum(1 for s in constituent_stocks if s["ret_1d"] > 0)
        declines = sum(1 for s in constituent_stocks if s["ret_1d"] < 0)
        ad_ratio = round(advances / max(1, declines), 2)

        stocks_above_20_ema = sum(1 for s in constituent_stocks if s["above_20_ema"])
        pct_above_20_ema = round((stocks_above_20_ema / k) * 100.0, 1)

        stocks_above_50_ema = sum(1 for s in constituent_stocks if s["above_50_ema"])
        pct_above_50_ema = round((stocks_above_50_ema / k) * 100.0, 1)

        # Whale Delivery Spike & Flow Bias
        avg_deliv_pct = round(float(np.mean([s["deliv_pct"] for s in constituent_stocks])), 1)
        total_hist_deliv_cr = float(sum([s["hist_deliv_turnover_cr"] for s in constituent_stocks]))

        if total_hist_deliv_cr > 0:
            delivery_spike_pct = round(((total_deliv_cr - total_hist_deliv_cr) / total_hist_deliv_cr) * 100.0, 1)
        else:
            delivery_spike_pct = 0.0

        # Flow Bias Logic
        if avg_ret_1d >= 0.3 and delivery_spike_pct >= 15.0:
            flow_bias = "ACCUMULATION"
            flow_bias_display = "Whale Accumulation"
        elif avg_ret_1d >= 0.0 and delivery_spike_pct >= 0.0:
            flow_bias = "INFLOW"
            flow_bias_display = "Institutional Inflow"
        elif avg_ret_1d < -0.3 and delivery_spike_pct >= 15.0:
            flow_bias = "DISTRIBUTION"
            flow_bias_display = "Heavy Distribution"
        elif avg_ret_1d < 0.0 and delivery_spike_pct < 0.0:
            flow_bias = "OUTFLOW"
            flow_bias_display = "Capital Outflow"
        else:
            flow_bias = "NEUTRAL"
            flow_bias_display = "Neutral Flow"

        # -------------------------------------------------------------
        # 3-PILLAR QUANTITATIVE SCORING MODEL (100-Point System)
        # -------------------------------------------------------------

        # Pillar 1: Institutional Relative Strength (Max 35 pts)
        # 20D RS vs Nifty 50 (Max 15)
        if rs_20d >= 5.0:
            rs_20d_pts = 15.0
        elif rs_20d >= 2.5:
            rs_20d_pts = 12.0
        elif rs_20d >= 0.0:
            rs_20d_pts = 9.0
        elif rs_20d >= -2.5:
            rs_20d_pts = 6.0
        else:
            rs_20d_pts = 2.0

        # 5D RS vs Nifty 50 (Max 10)
        if rs_5d >= 2.0:
            rs_5d_pts = 10.0
        elif rs_5d >= 0.5:
            rs_5d_pts = 8.0
        elif rs_5d >= 0.0:
            rs_5d_pts = 6.0
        elif rs_5d >= -1.0:
            rs_5d_pts = 4.0
        else:
            rs_5d_pts = 1.0

        # Delivery-Weighted Return Momentum (Max 10)
        if deliv_weighted_ret_1d >= 1.5:
            dw_pts = 10.0
        elif deliv_weighted_ret_1d >= 0.5:
            dw_pts = 8.0
        elif deliv_weighted_ret_1d >= 0.0:
            dw_pts = 6.0
        elif deliv_weighted_ret_1d >= -0.5:
            dw_pts = 3.0
        else:
            dw_pts = 1.0

        pillar_1_rs = round(rs_20d_pts + rs_5d_pts + dw_pts, 1)

        # Pillar 2: Structural Breadth (Max 35 pts)
        # % > 20 EMA (Max 15)
        if pct_above_20_ema >= 80.0:
            b20_pts = 15.0
        elif pct_above_20_ema >= 65.0:
            b20_pts = 12.0
        elif pct_above_20_ema >= 50.0:
            b20_pts = 9.0
        elif pct_above_20_ema >= 35.0:
            b20_pts = 6.0
        else:
            b20_pts = 2.0

        # % > 50 EMA (Max 10)
        if pct_above_50_ema >= 75.0:
            b50_pts = 10.0
        elif pct_above_50_ema >= 60.0:
            b50_pts = 8.0
        elif pct_above_50_ema >= 45.0:
            b50_pts = 6.0
        elif pct_above_50_ema >= 30.0:
            b50_pts = 4.0
        else:
            b50_pts = 1.0

        # A/D Ratio (Max 10)
        if ad_ratio >= 3.0 or declines == 0:
            ad_pts = 10.0
        elif ad_ratio >= 1.5:
            ad_pts = 8.0
        elif ad_ratio >= 1.0:
            ad_pts = 6.0
        elif ad_ratio >= 0.5:
            ad_pts = 3.0
        else:
            ad_pts = 1.0

        pillar_2_breadth = round(b20_pts + b50_pts + ad_pts, 1)

        # Pillar 3: Whale Delivery & Flow Score (Max 30 pts)
        # Delivery Spike vs 10D mean (Max 12)
        if delivery_spike_pct >= 30.0:
            spike_pts = 12.0
        elif delivery_spike_pct >= 15.0:
            spike_pts = 10.0
        elif delivery_spike_pct >= 0.0:
            spike_pts = 7.0
        elif delivery_spike_pct >= -15.0:
            spike_pts = 4.0
        else:
            spike_pts = 1.0

        # Flow Bias & Conviction (Max 10)
        bias_weight_map = {
            "ACCUMULATION": 10.0,
            "INFLOW": 8.0,
            "NEUTRAL": 5.0,
            "OUTFLOW": 2.0,
            "DISTRIBUTION": 0.0
        }
        bias_pts = bias_weight_map.get(flow_bias, 5.0)

        # Delivery Concentration Scale (Max 8)
        if total_deliv_cr >= 1000.0:
            conc_pts = 8.0
        elif total_deliv_cr >= 500.0:
            conc_pts = 6.0
        elif total_deliv_cr >= 250.0:
            conc_pts = 4.0
        else:
            conc_pts = 2.0

        pillar_3_flow = round(spike_pts + bias_pts + conc_pts, 1)

        # Composite Score (0 - 100)
        total_score = round(pillar_1_rs + pillar_2_breadth + pillar_3_flow, 1)

        # Classification / Quadrant
        if total_score >= 75.0:
            quadrant = "Leading"
            grade = "Leader"
            status = "LEADER"
        elif total_score >= 60.0:
            quadrant = "Improving"
            grade = "Improving"
            status = "IMPROVING"
        elif total_score >= 45.0:
            quadrant = "Neutral"
            grade = "Consolidating"
            status = "NEUTRAL"
        elif total_score >= 30.0:
            quadrant = "Weakening"
            grade = "Weakening"
            status = "WEAKENING"
        else:
            quadrant = "Lagging"
            grade = "Lagging"
            status = "LAGGING"

        # Constituent Leaders and Laggards
        def stock_rank_val(stk: Dict[str, Any]) -> float:
            score = (stk["ret_20d"] * 0.4) + (stk["ret_1d"] * 0.3) + ((stk["delivery_spike_pct"] / 10.0) * 0.2)
            if stk["above_20_ema"]:
                score += 10.0
            if stk["above_50_ema"]:
                score += 10.0
            return score

        sorted_constituents = sorted(constituent_stocks, key=stock_rank_val, reverse=True)

        leaders = [
            {
                "symbol": s["symbol"],
                "name": s["name"],
                "close": s["close"],
                "change_pct": s["ret_1d"],
                "delivery_turnover_cr": s["deliv_turnover_cr"],
                "delivery_pct": s["deliv_pct"],
                "delivery_spike_pct": s["delivery_spike_pct"],
                "above_20_ema": s["above_20_ema"],
                "above_50_ema": s["above_50_ema"],
                "rs_20d": s["rs_20d"]
            }
            for s in sorted_constituents[:5]
        ]

        laggards = [
            {
                "symbol": s["symbol"],
                "name": s["name"],
                "close": s["close"],
                "change_pct": s["ret_1d"],
                "delivery_turnover_cr": s["deliv_turnover_cr"],
                "delivery_pct": s["deliv_pct"],
                "delivery_spike_pct": s["delivery_spike_pct"],
                "above_20_ema": s["above_20_ema"],
                "above_50_ema": s["above_50_ema"],
                "rs_20d": s["rs_20d"]
            }
            for s in sorted_constituents[-3:]
        ]

        sector_results.append({
            "sector": sec_name,
            "display_name": disp_name,
            "total_score": total_score,
            "grade": grade,
            "status": status,
            "quadrant": quadrant,
            "pillar_scores": {
                "rs_score": pillar_1_rs,
                "breadth_score": pillar_2_breadth,
                "flow_score": pillar_3_flow
            },
            "metrics": {
                "stocks_count": k,
                "advances": advances,
                "declines": declines,
                "ad_ratio": ad_ratio,
                "pct_above_20_ema": pct_above_20_ema,
                "pct_above_50_ema": pct_above_50_ema,
                "return_1d": avg_ret_1d,
                "return_5d": avg_ret_5d,
                "return_20d": avg_ret_20d,
                "rs_1d": rs_1d,
                "rs_5d": rs_5d,
                "rs_20d": rs_20d,
                "delivery_weighted_return_1d": deliv_weighted_ret_1d,
                "total_turnover_cr": total_turnover_cr,
                "delivery_turnover_cr": total_deliv_cr,
                "avg_delivery_pct": avg_deliv_pct,
                "delivery_spike_pct": delivery_spike_pct,
                "flow_bias": flow_bias,
                "flow_bias_display": flow_bias_display
            },
            "leaders": leaders,
            "laggards": laggards
        })

    # 8. Sort sectors by total score descending & assign rank
    sector_results.sort(key=lambda x: x["total_score"], reverse=True)
    for idx, s in enumerate(sector_results, start=1):
        s["rank"] = idx

    # 9. Compute Macro Summary
    leading_count = sum(1 for s in sector_results if s["quadrant"] == "Leading")
    improving_count = sum(1 for s in sector_results if s["quadrant"] == "Improving")
    neutral_count = sum(1 for s in sector_results if s["quadrant"] == "Neutral")
    weakening_count = sum(1 for s in sector_results if s["quadrant"] == "Weakening")
    lagging_count = sum(1 for s in sector_results if s["quadrant"] == "Lagging")

    strongest_sec = sector_results[0]["display_name"] if sector_results else "N/A"
    weakest_sec = sector_results[-1]["display_name"] if sector_results else "N/A"

    # Inflow and Outflow rankings
    top_inflows = [s["display_name"] for s in sorted(sector_results, key=lambda x: x["metrics"]["delivery_spike_pct"], reverse=True)[:3]]
    top_outflows = [s["display_name"] for s in sorted(sector_results, key=lambda x: x["metrics"]["delivery_spike_pct"])[:3]]

    # Aggregate Market Breadth
    all_evaluated_stocks = list(stock_metrics.values())
    total_market_stocks = len(all_evaluated_stocks)
    total_advances = sum(1 for s in all_evaluated_stocks if s["ret_1d"] > 0)
    total_declines = sum(1 for s in all_evaluated_stocks if s["ret_1d"] < 0)
    total_ad_ratio = round(total_advances / max(1, total_declines), 2)
    mkt_above_20_ema = sum(1 for s in all_evaluated_stocks if s["above_20_ema"])
    mkt_above_50_ema = sum(1 for s in all_evaluated_stocks if s["above_50_ema"])

    macro_summary = {
        "leading_sectors_count": leading_count,
        "improving_sectors_count": improving_count,
        "neutral_sectors_count": neutral_count,
        "weakening_sectors_count": weakening_count,
        "lagging_sectors_count": lagging_count,
        "strongest_sector": strongest_sec,
        "weakest_sector": weakest_sec,
        "market_breadth": {
            "total_stocks": total_market_stocks,
            "advances": total_advances,
            "declines": total_declines,
            "ad_ratio": total_ad_ratio,
            "stocks_above_20_ema": mkt_above_20_ema,
            "pct_above_20_ema": round((mkt_above_20_ema / max(1, total_market_stocks)) * 100.0, 1),
            "stocks_above_50_ema": mkt_above_50_ema,
            "pct_above_50_ema": round((mkt_above_50_ema / max(1, total_market_stocks)) * 100.0, 1)
        },
        "benchmark": {
            "symbol": "^NSEI",
            "name": "NIFTY 50",
            "cmp": b_cmp,
            "return_1d": b_ret_1d,
            "return_5d": b_ret_5d,
            "return_20d": b_ret_20d
        },
        "top_inflows": top_inflows,
        "top_outflows": top_outflows
    }

    payload = {
        "scan_date": scan_date,
        "generated_at": iso_timestamp,
        "total_sectors": len(sector_results),
        "macro_summary": macro_summary,
        "sectors": sector_results
    }

    # 10. Persist Output File
    try:
        out_file.parent.mkdir(parents=True, exist_ok=True)
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        elapsed = (datetime.now() - t_start).total_seconds()
        logger.info(f"Generated {out_file} in {elapsed:.2f}s! Evaluated: {total_market_stocks} stocks across {len(sector_results)} sectors. Top: #{sector_results[0]['rank']} {strongest_sec} ({sector_results[0]['total_score']} pts)")
    except Exception as e:
        logger.error(f"Failed to write {out_file}: {e}")

    return payload


if __name__ == "__main__":
    logger.info("Executing Sector Analysis Engine standalone...")
    result = generate_sector_analysis()
    if result and "sectors" in result:
        print("\n=== TOP 5 RANKED SECTORS ===")
        for s in result["sectors"][:5]:
            p = s["pillar_scores"]
            m = s["metrics"]
            print(f"#{s['rank']:02d} {s['display_name']:<20} | Score: {s['total_score']:<4} ({s['status']:<10}) | RS: {p['rs_score']}/35 | Breadth: {p['breadth_score']}/35 | Flow: {p['flow_score']}/30 | 20D RS: {m['rs_20d']:+5.2f}% | Spike: {m['delivery_spike_pct']:+5.1f}%")

