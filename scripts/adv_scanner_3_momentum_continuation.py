"""
MITS Pro Institutional Suite V2 - Advanced Stock Scanner 3: Momentum Continuation Scanner Engine
Strictly isolated standalone quantitative scanner.
Scores stocks (0-100) based on 5 technical momentum pillars:
  1. Trend Direction (Max 25 pts): 20 EMA, 50 EMA, 20 EMA slope, 200 EMA
  2. Momentum Strength (Max 25 pts): RSI(14), ROC(10), 5D/10D Return, MACD Histogram
  3. Pullback Quality (Max 20 pts): 20D Highest High pullback depth, 20 EMA proximity
  4. Volume Behaviour (Max 15 pts): Volume ratio vs 20-Day SMA
  5. Relative Strength vs NIFTY 500 (Max 15 pts): 5D, 10D, 20D return outperformance
Filters out 'C' grade stocks (Score < 60), outputting sorted A+/A/B candidates.
"""

import os
import sys
import json
import time
import logging
from pathlib import Path
from datetime import datetime, date
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = BASE_DIR / "scripts"
DATA_DIR = BASE_DIR / "data"
CACHE_DIR = BASE_DIR / "cache"

if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from config import TIMEZONE, SYMBOLS_FILE

logger = logging.getLogger("AdvScannerMomentumContinuation")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

ADV_SCANNER_MC_OUTPUT = DATA_DIR / "adv_scanner_3_momentum_continuation.json"
ADV_SCANNER_RS_OUTPUT = DATA_DIR / "adv_scanner_1_rs.json"


def compute_momentum_continuation_metrics(
    symbol_meta: Dict[str, Any],
    stock_df: pd.DataFrame,
    bench_df: Optional[pd.DataFrame] = None,
    bhav_info: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """
    Evaluates a single stock for Momentum Continuation criteria and computes
    the 100-point composite score across 5 weighted pillars.
    """
    if stock_df is None or len(stock_df) < 25:
        return None

    try:
        # Standardize stock DataFrame
        sdf = stock_df.copy()
        if "Date" in sdf.columns:
            sdf["Date"] = pd.to_datetime(sdf["Date"]).dt.date
            sdf = sdf.sort_values("Date").drop_duplicates(subset=["Date"])
            sdf = sdf.set_index("Date")
        else:
            if not isinstance(sdf.index, pd.DatetimeIndex):
                sdf.index = pd.to_datetime(sdf.index)
            sdf.index = sdf.index.date

        # Standardize benchmark DataFrame if present
        bdf = None
        if bench_df is not None and not bench_df.empty:
            bdf = bench_df.copy()
            if "Date" in bdf.columns:
                bdf["Date"] = pd.to_datetime(bdf["Date"]).dt.date
                bdf = bdf.sort_values("Date").drop_duplicates(subset=["Date"])
                bdf = bdf.set_index("Date")
            else:
                if not isinstance(bdf.index, pd.DatetimeIndex):
                    bdf.index = pd.to_datetime(bdf.index)
                bdf.index = bdf.index.date

        stock_close = sdf["Close"].astype(float)
        stock_high = sdf["High"].astype(float) if "High" in sdf.columns else stock_close
        stock_low = sdf["Low"].astype(float) if "Low" in sdf.columns else stock_close
        stock_vol = sdf["Volume"].astype(float) if "Volume" in sdf.columns else pd.Series(1.0, index=sdf.index)

        comb_dict = {
            "stock_close": stock_close,
            "stock_high": stock_high,
            "stock_low": stock_low,
            "stock_vol": stock_vol
        }
        if bdf is not None and not bdf.empty:
            comb_dict["bench_close"] = bdf["Close"].astype(float)

        combined = pd.DataFrame(comb_dict).dropna(subset=["stock_close", "stock_high", "stock_low"])
        if "bench_close" in combined.columns:
            combined["bench_close"] = combined["bench_close"].ffill().bfill()

        total_sessions = len(combined)
        if total_sessions < 25:
            return None

        # Synchronize latest candle if Bhavcopy info is provided
        cur_close = float(combined["stock_close"].iloc[-1])
        cur_vol = float(combined["stock_vol"].iloc[-1])
        if bhav_info and bhav_info.get("close", 0) > 0:
            cur_close = float(bhav_info["close"])
            cur_vol = float(bhav_info.get("volume", cur_vol))
            combined.loc[combined.index[-1], "stock_close"] = cur_close
            combined.loc[combined.index[-1], "stock_vol"] = cur_vol
            if "high" in bhav_info and float(bhav_info["high"]) > 0:
                combined.loc[combined.index[-1], "stock_high"] = float(bhav_info["high"])
            if "low" in bhav_info and float(bhav_info["low"]) > 0:
                combined.loc[combined.index[-1], "stock_low"] = float(bhav_info["low"])
            combined.loc[combined.index[-1], "stock_high"] = max(combined.loc[combined.index[-1], "stock_high"], cur_close)
            combined.loc[combined.index[-1], "stock_low"] = min(combined.loc[combined.index[-1], "stock_low"], cur_close)

        # 1-day change %
        if bhav_info and bhav_info.get("prev_close", 0) > 0:
            prev_close = float(bhav_info["prev_close"])
            day_chg_pct = round(((cur_close - prev_close) / prev_close) * 100.0, 2)
        elif bhav_info and "change_pct" in bhav_info:
            day_chg_pct = round(float(bhav_info["change_pct"]), 2)
        else:
            prev_close = float(combined["stock_close"].iloc[-2]) if total_sessions > 1 else cur_close
            day_chg_pct = round(((cur_close - prev_close) / prev_close) * 100.0, 2) if prev_close > 0 else 0.0

        close_s = combined["stock_close"]
        high_s = combined["stock_high"]
        low_s = combined["stock_low"]
        vol_s = combined["stock_vol"]

        # -------------------------------------------------------------
        # 1. TECHNICAL INDICATORS CALCULATION
        # -------------------------------------------------------------
        # EMA calculations
        ema_20_series = close_s.ewm(span=20, adjust=False).mean()
        ema_50_series = close_s.ewm(span=50, adjust=False).mean()
        ema_200_series = close_s.ewm(span=200, adjust=False).mean() if total_sessions >= 100 else None

        ema_20 = round(float(ema_20_series.iloc[-1]), 2)
        ema_50 = round(float(ema_50_series.iloc[-1]), 2)
        ema_200 = round(float(ema_200_series.iloc[-1]), 2) if ema_200_series is not None else None

        # 20 EMA slope: positive if latest is strictly higher than prior bar
        ema_20_slope_pos = bool(ema_20_series.iloc[-1] > ema_20_series.iloc[-2]) if total_sessions >= 2 else True

        # EMA Trend Status
        if cur_close > ema_20 and ema_20 > ema_50:
            ema_trend_status = "Bullish Stack"
        elif cur_close > ema_20:
            ema_trend_status = "Above 20 EMA"
        else:
            ema_trend_status = "Below 20 EMA"

        # RSI (14) - Wilder's smoothed
        delta = close_s.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(alpha=1.0 / 14, min_periods=14, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1.0 / 14, min_periods=14, adjust=False).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        rsi_series = 100.0 - (100.0 / (1.0 + rs))
        rsi_val = rsi_series.iloc[-1]
        rsi_14 = round(float(rsi_val), 2) if not pd.isna(rsi_val) else 50.0

        if rsi_14 > 72.0:
            rsi_status = "Overextended"
        elif rsi_14 >= 50.0:
            rsi_status = "Optimal"
        else:
            rsi_status = "Sub-optimal"

        # ROC (10)
        if total_sessions >= 11 and close_s.iloc[-11] > 0:
            roc_10 = round(float(((close_s.iloc[-1] - close_s.iloc[-11]) / close_s.iloc[-11]) * 100.0), 2)
        else:
            roc_10 = 0.0

        # MACD Histogram (12, 26, 9)
        fast_ema = close_s.ewm(span=12, adjust=False).mean()
        slow_ema = close_s.ewm(span=26, adjust=False).mean()
        macd_line = fast_ema - slow_ema
        signal_line = macd_line.ewm(span=9, adjust=False).mean()
        macd_hist = macd_line - signal_line
        cur_macd_hist = round(float(macd_hist.iloc[-1]), 2)
        prev_macd_hist = round(float(macd_hist.iloc[-2]), 2) if total_sessions >= 2 else cur_macd_hist
        macd_improving = bool(cur_macd_hist > 0 or cur_macd_hist > prev_macd_hist)

        # Returns: 5D, 10D, 20D
        return_5d = round(float(((close_s.iloc[-1] / close_s.iloc[-6]) - 1.0) * 100.0), 2) if total_sessions >= 6 else 0.0
        return_10d = round(float(((close_s.iloc[-1] / close_s.iloc[-11]) - 1.0) * 100.0), 2) if total_sessions >= 11 else 0.0
        return_20d = round(float(((close_s.iloc[-1] / close_s.iloc[-21]) - 1.0) * 100.0), 2) if total_sessions >= 21 else 0.0

        # Pullback Depth (20D Highest High)
        highest_high_20d = round(float(high_s.iloc[-min(20, total_sessions):].max()), 2)
        if highest_high_20d > 0:
            pullback_pct = round(((highest_high_20d - cur_close) / highest_high_20d) * 100.0, 2)
        else:
            pullback_pct = 0.0
        pullback_pct = max(0.0, pullback_pct)

        if 3.0 <= pullback_pct <= 6.0:
            pullback_class = "Healthy"
        elif pullback_pct < 3.0:
            pullback_class = "Shallow"
        elif pullback_pct <= 10.0:
            pullback_class = "Moderate"
        else:
            pullback_class = "Deep"

        # Volume Ratio (vs 20-Day SMA Volume)
        sma_vol_20d = float(vol_s.iloc[-min(20, total_sessions):].mean())
        volume_ratio = round(float(cur_vol / sma_vol_20d), 2) if sma_vol_20d > 0 else 1.0

        if volume_ratio > 1.5:
            vol_status = "Strong Volume"
        elif volume_ratio >= 1.0:
            vol_status = "Positive"
        elif volume_ratio >= 0.8:
            vol_status = "Normal"
        else:
            vol_status = "Weak"

        # Relative Strength vs NIFTY 500 (5D, 10D, 20D)
        outperf_count = 0
        if "bench_close" in combined.columns and total_sessions >= 21:
            bc = combined["bench_close"]
            b_ret_5d = ((bc.iloc[-1] / bc.iloc[-6]) - 1.0) * 100.0 if total_sessions >= 6 else 0.0
            b_ret_10d = ((bc.iloc[-1] / bc.iloc[-11]) - 1.0) * 100.0 if total_sessions >= 11 else 0.0
            b_ret_20d = ((bc.iloc[-1] / bc.iloc[-21]) - 1.0) * 100.0 if total_sessions >= 21 else 0.0

            if return_5d > b_ret_5d:
                outperf_count += 1
            if return_10d > b_ret_10d:
                outperf_count += 1
            if return_20d > b_ret_20d:
                outperf_count += 1
        else:
            # Fallback when benchmark is absent
            if return_5d > 0:
                outperf_count += 1
            if return_10d > 0:
                outperf_count += 1
            if return_20d > 0:
                outperf_count += 1

        if outperf_count >= 2:
            rs_vs_nifty_status = "Outperforming"
        elif outperf_count == 1:
            rs_vs_nifty_status = "Neutral"
        else:
            rs_vs_nifty_status = "Lagging"

        # -------------------------------------------------------------
        # 2. 100-POINT SCORING ENGINE
        # -------------------------------------------------------------
        # Pillar a: Trend Direction (Max 25 pts)
        pts_trend = 0.0
        if cur_close > ema_20:
            pts_trend += 8.0
        if ema_20 > ema_50:
            pts_trend += 7.0
        if ema_20_slope_pos:
            pts_trend += 5.0
        # Price > 200 EMA or HH-HL Structure
        price_above_200 = bool(cur_close > ema_200) if ema_200 is not None else False
        hh_hl = bool(cur_close > close_s.iloc[-min(20, total_sessions)] and low_s.iloc[-min(5, total_sessions):].min() >= low_s.iloc[-min(20, total_sessions):].min())
        if price_above_200 or hh_hl:
            pts_trend += 5.0
        trend_score = min(25.0, pts_trend)

        # Pillar b: Momentum Strength (Max 25 pts)
        pts_momentum = 0.0
        # RSI component
        if 52.0 <= rsi_14 <= 72.0:
            pts_momentum += 10.0
        elif rsi_14 > 72.0:
            pts_momentum += 6.0
        elif 50.0 <= rsi_14 < 52.0:
            pts_momentum += 5.0
        else:
            pts_momentum += 2.0

        # ROC(10) > 0
        if roc_10 > 0:
            pts_momentum += 5.0

        # 5-Day & 10-Day Return > 0
        if return_5d > 0 and return_10d > 0:
            pts_momentum += 5.0
        elif return_5d > 0 or return_10d > 0:
            pts_momentum += 2.5

        # MACD Histogram positive or expanding/improving
        if macd_improving:
            pts_momentum += 5.0
        momentum_score = min(25.0, pts_momentum)

        # Pillar c: Pullback Quality (Max 20 pts)
        pts_pullback = 0.0
        if 3.0 <= pullback_pct <= 6.0:
            pts_pullback += 20.0
        elif pullback_pct < 3.0:
            pts_pullback += 16.0
        elif pullback_pct <= 10.0:
            pts_pullback += 10.0
        else:
            pts_pullback += 4.0

        # Close proximity within 2% of 20 EMA adds confirmation
        dist_to_ema20 = round(abs((cur_close - ema_20) / ema_20) * 100.0, 2) if ema_20 > 0 else 0.0
        if dist_to_ema20 <= 2.0:
            pts_pullback += 2.0
        pullback_score = min(20.0, pts_pullback)

        # Pillar d: Volume Behaviour (Max 15 pts)
        pts_volume = 0.0
        if volume_ratio > 1.5:
            pts_volume += 15.0
        elif volume_ratio >= 1.0:
            pts_volume += 12.0
        elif volume_ratio >= 0.8:
            pts_volume += 8.0
        else:
            pts_volume += 4.0
        volume_score = min(15.0, pts_volume)

        # Pillar e: Relative Strength vs NIFTY 500 (Max 15 pts)
        pts_rs = 0.0
        if outperf_count == 3:
            pts_rs += 15.0
        elif outperf_count == 2:
            pts_rs += 10.0
        elif outperf_count == 1:
            pts_rs += 5.0
        else:
            pts_rs += 0.0
        rs_score = min(15.0, pts_rs)

        # Composite Score (0 - 100)
        total_score = int(round(trend_score + momentum_score + pullback_score + volume_score + rs_score))
        total_score = max(0, min(100, total_score))

        # Grade Classification
        if total_score >= 85:
            grade = "A+"
        elif total_score >= 75:
            grade = "A"
        elif total_score >= 60:
            grade = "B"
        else:
            grade = "C"

        sym_str = symbol_meta.get("symbol", "")
        company_name = symbol_meta.get("name", sym_str)
        sector_str = symbol_meta.get("sector", "NSE")

        # Key Levels (Support & Resistance) for Column 11 and Modal Dossier
        resistance_val = round(highest_high_20d, 2)
        swing_low_20d = float(low_s.iloc[-min(20, total_sessions):].min())
        if swing_low_20d < cur_close:
            support_val = round(swing_low_20d, 2)
            support_label = "20D Swing Low Support"
        elif cur_close > ema_50:
            support_val = round(ema_50, 2)
            support_label = "50 EMA Baseline Support"
        elif ema_200 is not None and cur_close > ema_200:
            support_val = round(ema_200, 2)
            support_label = "200 EMA Institutional Floor"
        else:
            support_val = round(cur_close * 0.95, 2)
            support_label = "Dynamic 5% Support"

        support_dist_pct = round(((cur_close - support_val) / cur_close) * 100.0, 2) if cur_close > 0 else 0.0
        resistance_dist_pct = round(((resistance_val - cur_close) / cur_close) * 100.0, 2) if cur_close > 0 else 0.0

        dossier = {
            "symbol": sym_str,
            "name": company_name,
            "sector": sector_str,
            "stage": "Stage-2 Markup" if (cur_close > ema_50 and (ema_200 is None or ema_50 >= ema_200)) else "Stage-1 Base",
            "stage_badge": "Stage-2 Markup" if (cur_close > ema_50 and (ema_200 is None or ema_50 >= ema_200)) else "Stage-1 Base",
            "stage_color": "bullish" if (cur_close > ema_50 and (ema_200 is None or ema_50 >= ema_200)) else "cyan",
            "stage_desc": "Institutional Momentum Continuation & Expansion",
            "trend_stack": bool(cur_close > ema_20 and ema_20 > ema_50),
            "trend_stack_status": ema_trend_status,
            "trend_stack_badge": "PERFECT STACK" if (cur_close > ema_20 and ema_20 > ema_50) else "CONSTRUCTIVE",
            "ema_20": ema_20,
            "ema_50": ema_50,
            "ema_200": ema_200,
            "key_levels": {
                "support": support_val,
                "support_label": support_label,
                "support_dist": f"-{support_dist_pct}% below",
                "resistance": resistance_val,
                "resistance_label": "20D Swing High Pivot",
                "resistance_dist": f"+{resistance_dist_pct}% to pivot",
                "high_52w": resistance_val,
                "dist_52w": f"-{pullback_pct}% from high"
            },
            "volume_footprint": {
                "volume_multiple": volume_ratio,
                "volume_desc": f"{volume_ratio}x Vol",
                "delivery_status": "Active Demand Absorption" if volume_ratio >= 1.2 else "Standard Market Flow",
                "delivery_pct": round(float(bhav_info.get("delivery_pct", 0.0)), 1) if bhav_info and bhav_info.get("delivery_pct") else None
            },
            "rs_profile": {
                "rs_20d": round(return_20d, 2),
                "stock_ret_20d": return_20d,
                "bench_ret_20d": round(return_20d - (return_20d if outperf_count >= 2 else 0.0), 2)
            },
            "support": support_val,
            "support_label": support_label,
            "support_dist": f"-{support_dist_pct}% below",
            "resistance": resistance_val,
            "resistance_label": "20D Swing High Pivot",
            "resistance_dist": f"+{resistance_dist_pct}% to pivot",
            "high_52w": resistance_val,
            "dist_52w": f"-{pullback_pct}% from high",
            "tradingview_url": f"https://in.tradingview.com/chart/?symbol=NSE:{sym_str}"
        }

        return {
            "symbol": sym_str,
            "company_name": company_name,
            "sector": sector_str,
            "ltp": round(cur_close, 2),
            "change_pct": day_chg_pct,
            "return_5d": return_5d,
            "return_10d": return_10d,
            "return_20d": return_20d,
            "rsi_14": rsi_14,
            "rsi_status": rsi_status,
            "roc_10": roc_10,
            "macd_hist": cur_macd_hist,
            "ema_20": ema_20,
            "ema_50": ema_50,
            "ema_200": ema_200,
            "ema_trend_status": ema_trend_status,
            "highest_high_20d": highest_high_20d,
            "pullback_pct": pullback_pct,
            "pullback_class": pullback_class,
            "dist_to_ema20": dist_to_ema20,
            "volume_ratio": volume_ratio,
            "vol_status": vol_status,
            "rs_vs_nifty_status": rs_vs_nifty_status,
            "s1": support_val,
            "r1": resistance_val,
            "support": support_val,
            "support_label": support_label,
            "resistance": resistance_val,
            "resistance_label": "20D Swing High Pivot",
            "total_score": total_score,
            "grade": grade,
            "score_breakdown": {
                "trend": round(trend_score, 1),
                "momentum": round(momentum_score, 1),
                "pullback": round(pullback_score, 1),
                "volume": round(volume_score, 1),
                "relative_strength": round(rs_score, 1)
            },
            "dossier": dossier,
            # Compatibility aliases for table rendering
            "cmp": round(cur_close, 2),
            "score": total_score,
            "name": company_name,
            "tradingview_url": f"https://in.tradingview.com/chart/?symbol=NSE:{sym_str}"
        }

    except Exception as e:
        logger.debug(f"Error computing Momentum Continuation for {symbol_meta.get('symbol')}: {e}")
        return None


def generate_adv_scanner_momentum_continuation(
    symbols: Optional[List[Dict[str, Any]]] = None,
    stock_dfs: Optional[Dict[str, pd.DataFrame]] = None,
    bhav_date: Optional[date] = None,
    bhav_map: Optional[Dict[str, Dict[str, Any]]] = None,
    delivery_analytics_map: Optional[Dict[str, Dict[str, Any]]] = None,
    n_df: Optional[pd.DataFrame] = None
) -> Dict[str, Any]:
    """
    Main generator for the Advanced Momentum Continuation Scanner (Slot 3).
    Evaluates the full universe and saves records with Score >= 60 (Grades A+, A, B).
    """
    t_start = time.time()
    logger.info("Initializing Advanced Stock Scanner 3: Momentum Continuation Scanner...")

    # 1. Load symbols
    if symbols is None:
        if SYMBOLS_FILE.exists():
            with open(SYMBOLS_FILE, "r", encoding="utf-8") as f:
                sym_data = json.load(f)
                symbols = sym_data.get("symbols", [])
        else:
            symbols = []

    # 2. Benchmark data
    bench_df = n_df
    if bench_df is None or bench_df.empty:
        bench_parquet = CACHE_DIR / "benchmark.parquet"
        if bench_parquet.exists():
            bench_df = pd.read_parquet(bench_parquet)
            logger.info(f"Loaded benchmark from {bench_parquet} ({len(bench_df)} sessions).")

    # 3. Stock DataFrames
    if stock_dfs is None:
        stock_dfs = {}
        ohlcv_parquet = CACHE_DIR / "market_ohlcv.parquet"
        if ohlcv_parquet.exists():
            logger.info(f"Loading market OHLCV data from {ohlcv_parquet}...")
            full_ohlcv = pd.read_parquet(ohlcv_parquet)
            sym_col = "Symbol" if "Symbol" in full_ohlcv.columns else "symbol"
            for sym, group in full_ohlcv.groupby(sym_col):
                stock_dfs[str(sym)] = group.sort_values("Date")
            logger.info(f"Loaded {len(stock_dfs)} stock DataFrames from cache.")

    # 3b. Standalone Bhavcopy loading if bhav_map is None
    if bhav_map is None:
        bhav_map = {}
        # First check RS feed for latest EOD prices
        if ADV_SCANNER_RS_OUTPUT.exists():
            try:
                with open(ADV_SCANNER_RS_OUTPUT, "r", encoding="utf-8") as f:
                    rs_feed = json.load(f)
                for s in rs_feed.get("stocks", []):
                    sym = s.get("symbol")
                    if sym:
                        bhav_map[sym] = {
                            "close": float(s.get("cmp", 0.0)),
                            "prev_close": float(s.get("cmp", 0.0) / (1.0 + (s.get("change_pct", 0.0) / 100.0))) if s.get("change_pct") is not None else float(s.get("cmp", 0.0)),
                            "change_pct": float(s.get("change_pct", 0.0)),
                            "delivery_pct": float(s.get("delivery_pct", 0.0)) if s.get("delivery_pct") is not None else 0.0,
                            "volume": float(s.get("vol_20d_avg", 0.0) * s.get("vol_ratio", 1.0)) if s.get("vol_20d_avg") else 0.0
                        }
                if not bhav_date and rs_feed.get("scan_date"):
                    try:
                        bhav_date = datetime.strptime(rs_feed.get("scan_date"), "%Y-%m-%d").date()
                    except Exception:
                        pass
                logger.info(f"Synchronized {len(bhav_map)} stocks from latest RS EOD feed ({ADV_SCANNER_RS_OUTPUT.name}).")
            except Exception as e:
                logger.warning(f"Error loading RS feed for bhav_map: {e}")

        # Check bhavcopy cache as secondary fallback
        if not bhav_map:
            bhav_cache_dir = DATA_DIR / "bhavcopy_cache"
            all_cached = sorted(list(bhav_cache_dir.glob("sec_bhavdata_full_*.csv")), reverse=True)
            if all_cached:
                try:
                    bhav_df = pd.read_csv(all_cached[0])
                    bhav_df.columns = [c.strip() for c in bhav_df.columns]
                    if "SERIES" in bhav_df.columns:
                        bhav_df = bhav_df[bhav_df["SERIES"].astype(str).str.strip() == "EQ"]
                    if "SYMBOL" in bhav_df.columns:
                        bhav_df["SYMBOL"] = bhav_df["SYMBOL"].astype(str).str.strip()
                        symbols_arr = bhav_df["SYMBOL"].values
                        closes = pd.to_numeric(bhav_df.get("CLOSE_PRICE", 0.0), errors="coerce").fillna(0.0).values
                        prevs = pd.to_numeric(bhav_df.get("PREV_CLOSE", 0.0), errors="coerce").fillna(0.0).values
                        vols = pd.to_numeric(bhav_df.get("TTL_TRD_QNTY", 0.0), errors="coerce").fillna(0.0).values
                        highs = pd.to_numeric(bhav_df.get("HIGH_PRICE", 0.0), errors="coerce").fillna(0.0).values
                        lows = pd.to_numeric(bhav_df.get("LOW_PRICE", 0.0), errors="coerce").fillna(0.0).values
                        for i, s in enumerate(symbols_arr):
                            bhav_map[s] = {
                                "close": float(closes[i]),
                                "prev_close": float(prevs[i]),
                                "volume": float(vols[i]),
                                "high": float(highs[i]),
                                "low": float(lows[i])
                            }
                    logger.info(f"Loaded fallback Bhavcopy delivery data from {all_cached[0].name} ({len(bhav_map)} symbols).")
                except Exception as e:
                    logger.warning(f"Error loading cached Bhavcopy: {e}")

    # 4. Evaluate all stocks
    records: List[Dict[str, Any]] = []
    for item in symbols:
        sym = item.get("symbol", "")
        df = stock_dfs.get(sym)
        if df is None or df.empty:
            continue

        bhav_info = bhav_map.get(sym) if bhav_map else None
        res = compute_momentum_continuation_metrics(item, df, bench_df, bhav_info)
        # Filter: Exclude 'C' grade stocks (Score < 60)
        if res and res.get("total_score", 0) >= 60:
            records.append(res)

    # 5. Sort descending by total_score (primary), and return_20d (secondary)
    records.sort(key=lambda x: (x["total_score"], x["return_20d"]), reverse=True)

    # Assign Rank 1 to N
    for idx, r in enumerate(records):
        r["rank"] = idx + 1

    # Count grades
    grade_counts = {
        "A+": sum(1 for r in records if r.get("grade") == "A+"),
        "A": sum(1 for r in records if r.get("grade") == "A"),
        "B": sum(1 for r in records if r.get("grade") == "B")
    }

    # 6. Generate payload
    latest_candle_dt = max((df.index[-1].date() for df in stock_dfs.values() if df is not None and not df.empty and hasattr(df.index[-1], "date")), default=None) if stock_dfs else None
    effective_date = latest_candle_dt if (latest_candle_dt and (not bhav_date or latest_candle_dt > bhav_date)) else (bhav_date or datetime.now().date())
    scan_dt = effective_date.strftime("%Y-%m-%d") if hasattr(effective_date, "strftime") else str(effective_date)[:10]
    payload = {
        "scan_date": scan_dt,
        "generated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S IST"),
        "total_stocks": len(records),
        "grade_counts": grade_counts,
        "stocks": records
    }

    # Save strictly to data/adv_scanner_3_momentum_continuation.json
    with open(ADV_SCANNER_MC_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    elapsed = time.time() - t_start
    logger.info(
        f"Generated {ADV_SCANNER_MC_OUTPUT} in {elapsed:.2f}s! "
        f"Total: {len(records)} candidates (A+: {grade_counts['A+']}, A: {grade_counts['A']}, B: {grade_counts['B']})."
    )
    return payload


if __name__ == "__main__":
    t0 = time.time()
    payload = generate_adv_scanner_momentum_continuation()
    elapsed = time.time() - t0
    print("\n" + "=" * 75)
    print("MITS ADVANCED STOCK SCANNER 3: MOMENTUM CONTINUATION COMPLETE")
    print(f"Time Taken: {elapsed:.2f}s")
    print(f"Total Qualified Candidates (Score >= 60): {payload.get('total_stocks', 0)} Stocks")
    print(f"Grade Breakdown: {payload.get('grade_counts', {})}")
    print(f"Payload Output: {ADV_SCANNER_MC_OUTPUT}")
    print("-" * 75)
    print("TOP 5 MOMENTUM CONTINUATION CANDIDATES:")
    for stock in payload.get("stocks", [])[:5]:
        print(
            f"  #{stock['rank']:<2} {stock['symbol']:<12} | "
            f"CMP: Rs.{stock['ltp']:<9.2f} | "
            f"Score: {stock['total_score']:<3} ({stock['grade']:<2}) | "
            f"RSI: {stock['rsi_14']:<5.1f} ({stock['rsi_status']:<11}) | "
            f"Pullback: {stock['pullback_pct']:<5.1f}% ({stock['pullback_class']:<7}) | "
            f"Vol Ratio: {stock['volume_ratio']:<4.2f}x | "
            f"RS Nifty: {stock['rs_vs_nifty_status']}"
        )
    print("=" * 75 + "\n")

