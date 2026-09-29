"""
MITS Pro Quantitative Suite V2 - Setup 7: Momentum Leader PRO Engine
====================================================================
Pure Daily EOD Quantitative Multi-Factor Screener with Zero Look-Ahead Bias.
Screening Universe: NIFTY 500 equities strictly from local cache (cache/market_ohlcv.parquet).
Zero network requests. No external API or yfinance imports.

Confluence Scoring Model (0 - 100 points):
  1. Price Momentum (Weight: 25 pts)
     - 5D (10%), 10D (15%), 20D (25%), 60D (30%), 120D (20%) normalized returns.
  2. Relative Strength vs NIFTY (Weight: 20 pts)
     - Stock Return - NIFTY Return across 20D, 60D, 120D windows.
  3. Trend Structure (Weight: 15 pts)
     - Daily 20 EMA, 50 EMA, 200 EMA. Bullish stack: Price > 20 EMA > 50 EMA > 200 EMA with positive slopes.
  4. Breakout / Price Expansion (Weight: 10 pts)
     - Reclaim of previous 20D, 50D, 120D highs (excluding current candle via shift(1)).
  5. Volume Confirmation (Weight: 10 pts)
     - RVOL = Current Daily Volume / 20-day Avg Volume.
  6. Momentum Indicators (Weight: 5 pts)
     - Daily RSI(14) > 50 (Bonus for > 60), ADX(14) trend strength, ATR(14).
  7. Momentum Acceleration (Weight: 5 pts)
     - 5D vs 20D momentum, 20D vs 60D momentum (Accelerating / Stable / Decelerating).
  8. 52-Week Position (Weight: 5 pts)
     - Proximity to 52-week high with sustained momentum.
  9. Market Regime Confluence (Weight: 5 pts)
     - NIFTY daily trend alignment.

Filter Threshold:
  - Retain strictly qualified stocks with Total Score >= 70.
  - Grades: 90-100 (A+), 80-89 (A), 70-79 (B). Discard below 70.
Ranking:
  - Sort descending by: Score -> Relative Strength -> 20D Momentum -> Volume.
Outputs:
  - data/setup7_momentum_leader.json
  - Included in main data/scanner_results.json under setup key setup7.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("Setup7MomentumLeader")

BASE_DIR = Path(__file__).resolve().parent.parent
CACHE_DIR = BASE_DIR / "cache"
DATA_DIR = BASE_DIR / "data"

MARKET_OHLCV_FILE = CACHE_DIR / "market_ohlcv.parquet"
BENCHMARK_FILE = CACHE_DIR / "benchmark.parquet"
DELIVERY_BHAV_FILE = CACHE_DIR / "delivery_bhav.parquet"
SYMBOLS_FILE = DATA_DIR / "symbols.json"
SETUP7_OUTPUT_FILE = DATA_DIR / "setup7_momentum_leader.json"
SCANNER_RESULTS_FILE = DATA_DIR / "scanner_results.json"


def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Calculate Wilder's Exponential Smoothed RSI(14) with zero look-ahead bias."""
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100.0 - (100.0 / (1.0 + rs))


def compute_atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    """Calculate Average True Range ATR(14)."""
    prev_close = close.shift(1)
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    return tr.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()


def compute_adx(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    """Calculate Average Directional Index ADX(14)."""
    up_move = high.diff()
    down_move = -low.diff()
    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

    prev_close = close.shift(1)
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)

    atr = tr.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    plus_di = 100.0 * pd.Series(plus_dm, index=high.index).ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean() / atr
    minus_di = 100.0 * pd.Series(minus_dm, index=high.index).ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean() / atr

    dx = (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan) * 100.0
    return dx.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()


def load_delivery_analytics() -> Dict[str, Dict[str, Any]]:
    """Load local delivery bhav analytics from cache if available."""
    if not DELIVERY_BHAV_FILE.exists():
        logger.warning(f"Delivery bhav parquet not found at {DELIVERY_BHAV_FILE}")
        return {}

    try:
        df_deliv = pd.read_parquet(DELIVERY_BHAV_FILE)
        deliv_map: Dict[str, Dict[str, Any]] = {}
        for sym, grp in df_deliv.groupby("SYMBOL"):
            grp = grp.sort_values("DATE").reset_index(drop=True)
            if len(grp) == 0:
                continue
            cur_row = grp.iloc[-1]
            cur_per = float(cur_row.get("DELIV_PER", 0.0)) if pd.notna(cur_row.get("DELIV_PER")) else 0.0
            cur_qty = float(cur_row.get("DELIV_QTY", 0.0)) if pd.notna(cur_row.get("DELIV_QTY")) else 0.0
            pers = grp["DELIV_PER"].dropna().tolist()
            qtys = grp["DELIV_QTY"].dropna().tolist()
            avg_per = round(sum(pers[-10:]) / len(pers[-10:]), 1) if pers else cur_per
            avg_qty = round(sum(qtys[-10:]) / len(qtys[-10:]), 0) if qtys else cur_qty
            spike = round(((cur_per - avg_per) / avg_per) * 100, 1) if avg_per > 0 else 0.0

            whale_flag = bool(cur_per >= 50.0 or (avg_per > 0 and cur_per > 1.4 * avg_per))
            if whale_flag and cur_per > 55.0:
                sm_status = "High Institutional Absorption"
            elif 40.0 <= cur_per <= 55.0:
                sm_status = "Active Accumulation"
            elif cur_per > 55.0:
                sm_status = "Active Accumulation"
            else:
                sm_status = "Standard Flow"

            deliv_map[sym] = {
                "delivery_pct": round(cur_per, 1),
                "delivery_qty": round(cur_qty, 0),
                "avg_deliv_10d": round(avg_per, 1),
                "avg_deliv_vol_10d": round(avg_qty, 0),
                "delivery_spike_pct": spike,
                "whale_absorption_flag": whale_flag,
                "smart_money_status": sm_status
            }
        logger.info(f"Loaded delivery analytics for {len(deliv_map)} symbols.")
        return deliv_map
    except Exception as e:
        logger.warning(f"Error loading delivery analytics: {e}")
        return {}


def run_setup7_scan() -> List[Dict[str, Any]]:
    """
    Execute Setup 7: Momentum Leader PRO evaluation strictly on local daily EOD cached data.
    """
    if not MARKET_OHLCV_FILE.exists():
        raise FileNotFoundError(f"Required market OHLCV cache not found at {MARKET_OHLCV_FILE}")
    if not BENCHMARK_FILE.exists():
        raise FileNotFoundError(f"Required benchmark cache not found at {BENCHMARK_FILE}")

    logger.info(f"Loading Daily EOD data from {MARKET_OHLCV_FILE}...")
    df_all = pd.read_parquet(MARKET_OHLCV_FILE)
    bench_df = pd.read_parquet(BENCHMARK_FILE).sort_values("Date").reset_index(drop=True)

    symbols_map: Dict[str, Dict[str, Any]] = {}
    if SYMBOLS_FILE.exists():
        try:
            with open(SYMBOLS_FILE, "r", encoding="utf-8") as f:
                sym_data = json.load(f)
                for item in sym_data.get("symbols", []):
                    symbols_map[item["symbol"]] = item
            logger.info(f"Loaded metadata for {len(symbols_map)} symbols from {SYMBOLS_FILE}.")
        except Exception as e:
            logger.warning(f"Failed to read symbols.json: {e}")

    delivery_map = load_delivery_analytics()

    # NIFTY 50 Benchmark Calculations
    n_close = bench_df["Close"]
    n_ema20 = n_close.ewm(span=20, adjust=False).mean()
    n_ema50 = n_close.ewm(span=50, adjust=False).mean()
    n_ema200 = n_close.ewm(span=200, adjust=False).mean()

    n_cur = float(n_close.iloc[-1])
    v_n_ema20 = float(n_ema20.iloc[-1])
    v_n_ema50 = float(n_ema50.iloc[-1])
    v_n_ema200 = float(n_ema200.iloc[-1])

    # Component 9: Market Regime Confluence (Weight: 5 pts)
    if n_cur > v_n_ema20 and v_n_ema20 > v_n_ema50:
        regime_score = 5.0
    elif n_cur > v_n_ema50:
        regime_score = 3.5
    elif n_cur > v_n_ema200:
        regime_score = 2.0
    else:
        regime_score = 1.0  # Defensive market regime baseline

    n_ret_20d = float((n_close.iloc[-1] / n_close.iloc[-21] - 1) * 100) if len(n_close) > 21 else 0.0
    n_ret_60d = float((n_close.iloc[-1] / n_close.iloc[-61] - 1) * 100) if len(n_close) > 61 else 0.0
    n_ret_120d = float((n_close.iloc[-1] / n_close.iloc[-121] - 1) * 100) if len(n_close) > 121 else 0.0

    logger.info(
        f"Benchmark NIFTY Close: {n_cur:.2f} | 20D Ret: {n_ret_20d:.2f}% | 60D Ret: {n_ret_60d:.2f}% | "
        f"Regime Score: {regime_score}/5.0"
    )

    # First Pass: Compute multi-timeframe normalized returns cross-sectionally
    stock_groups = {sym: df.sort_values("Date").reset_index(drop=True) for sym, df in df_all.groupby("Symbol")}
    logger.info(f"Grouped {len(stock_groups)} unique symbols from market OHLCV cache.")

    stats: List[Dict[str, Any]] = []
    for sym, df in stock_groups.items():
        if len(df) < 125:
            continue
        c = df["Close"]
        ret_5d = float((c.iloc[-1] / c.iloc[-6] - 1) * 100)
        ret_10d = float((c.iloc[-1] / c.iloc[-11] - 1) * 100)
        ret_20d = float((c.iloc[-1] / c.iloc[-21] - 1) * 100)
        ret_60d = float((c.iloc[-1] / c.iloc[-61] - 1) * 100)
        ret_120d = float((c.iloc[-1] / c.iloc[-121] - 1) * 100)
        stats.append({
            "symbol": sym,
            "ret_5d": ret_5d,
            "ret_10d": ret_10d,
            "ret_20d": ret_20d,
            "ret_60d": ret_60d,
            "ret_120d": ret_120d
        })

    stats_df = pd.DataFrame(stats)
    # Cross-sectional percentile rank [0.0, 1.0] across NIFTY 500 universe
    stats_df["pct_5d"] = stats_df["ret_5d"].rank(pct=True)
    stats_df["pct_10d"] = stats_df["ret_10d"].rank(pct=True)
    stats_df["pct_20d"] = stats_df["ret_20d"].rank(pct=True)
    stats_df["pct_60d"] = stats_df["ret_60d"].rank(pct=True)
    stats_df["pct_120d"] = stats_df["ret_120d"].rank(pct=True)

    pct_map = stats_df.set_index("symbol").to_dict(orient="index")

    qualified_signals: List[Dict[str, Any]] = []

    for sym, df in stock_groups.items():
        if len(df) < 125 or sym not in pct_map:
            continue

        p_info = pct_map[sym]
        c = df["Close"]
        h = df["High"]
        l = df["Low"]
        v = df["Volume"]

        cur_close = round(float(c.iloc[-1]), 2)
        prev_close = round(float(c.iloc[-2]), 2)
        change_pct = round(((cur_close - prev_close) / prev_close) * 100, 2)
        cur_vol = float(v.iloc[-1])

        # -------------------------------------------------------------------------
        # 1. Price Momentum (Weight: 25 pts)
        # 5D (10%), 10D (15%), 20D (25%), 60D (30%), 120D (20%) normalized returns
        # -------------------------------------------------------------------------
        p_mom = (
            p_info["pct_5d"] * 2.5 +
            p_info["pct_10d"] * 3.75 +
            p_info["pct_20d"] * 6.25 +
            p_info["pct_60d"] * 7.5 +
            p_info["pct_120d"] * 5.0
        )

        # -------------------------------------------------------------------------
        # 2. Relative Strength vs NIFTY (Weight: 20 pts)
        # Stock Return - NIFTY Return across 20D, 60D, 120D windows
        # -------------------------------------------------------------------------
        rs_20d = p_info["ret_20d"] - n_ret_20d
        rs_60d = p_info["ret_60d"] - n_ret_60d
        rs_120d = p_info["ret_120d"] - n_ret_120d

        rs_score_20 = min(max(rs_20d, 0) / 15.0, 1.0) * 6.0
        rs_score_60 = min(max(rs_60d, 0) / 25.0, 1.0) * 8.0
        rs_score_120 = min(max(rs_120d, 0) / 35.0, 1.0) * 6.0
        rs_score = rs_score_20 + rs_score_60 + rs_score_120

        # -------------------------------------------------------------------------
        # 3. Trend Structure (Weight: 15 pts)
        # Daily 20 EMA, 50 EMA, 200 EMA. Bullish stack: Price > 20 EMA > 50 EMA > 200 EMA with positive slopes
        # -------------------------------------------------------------------------
        ema20 = c.ewm(span=20, adjust=False).mean()
        ema50 = c.ewm(span=50, adjust=False).mean()
        ema200 = c.ewm(span=200, adjust=False).mean()

        v_ema20 = float(ema20.iloc[-1])
        v_ema50 = float(ema50.iloc[-1])
        v_ema200 = float(ema200.iloc[-1])

        trend_score = 0.0
        if cur_close > v_ema20: trend_score += 2.5
        if v_ema20 > v_ema50: trend_score += 3.0
        if v_ema50 > v_ema200: trend_score += 3.5
        if ema20.iloc[-1] > ema20.iloc[-5]: trend_score += 2.0
        if ema50.iloc[-1] > ema50.iloc[-10]: trend_score += 2.0
        if len(ema200) >= 20 and ema200.iloc[-1] > ema200.iloc[-20]: trend_score += 2.0

        # -------------------------------------------------------------------------
        # 4. Breakout / Price Expansion (Weight: 10 pts)
        # Reclaim of previous 20D, 50D, 120D highs (excluding current candle via shift(1))
        # -------------------------------------------------------------------------
        prev_20_high = float(h.iloc[:-1].tail(20).max())
        prev_50_high = float(h.iloc[:-1].tail(50).max())
        prev_120_high = float(h.iloc[:-1].tail(120).max())

        breakout_score = 0.0
        # 20D High Reclaim / Retest
        if cur_close >= prev_20_high: breakout_score += 3.5
        elif cur_close >= prev_20_high * 0.98: breakout_score += 2.5
        elif cur_close >= prev_20_high * 0.95: breakout_score += 1.5

        # 50D High Reclaim / Retest
        if cur_close >= prev_50_high: breakout_score += 3.5
        elif cur_close >= prev_50_high * 0.98: breakout_score += 2.5
        elif cur_close >= prev_50_high * 0.95: breakout_score += 1.5

        # 120D High Reclaim / Retest
        if cur_close >= prev_120_high: breakout_score += 3.0
        elif cur_close >= prev_120_high * 0.98: breakout_score += 2.0
        elif cur_close >= prev_120_high * 0.95: breakout_score += 1.0

        # -------------------------------------------------------------------------
        # 5. Volume Confirmation (Weight: 10 pts)
        # RVOL = Current Daily Volume / 20-day Avg Volume (excluding current candle)
        # -------------------------------------------------------------------------
        vol_20_avg = float(v.iloc[:-1].tail(20).mean()) if len(v) > 20 else cur_vol
        rvol = round(cur_vol / vol_20_avg, 2) if vol_20_avg > 0 else 1.0

        if rvol >= 2.0: vol_score = 10.0
        elif rvol >= 1.5: vol_score = 8.0 + ((rvol - 1.5) / 0.5) * 2.0
        elif rvol >= 1.0: vol_score = 5.0 + ((rvol - 1.0) / 0.5) * 3.0
        elif rvol >= 0.7: vol_score = ((rvol - 0.7) / 0.3) * 5.0
        else: vol_score = 0.0

        # -------------------------------------------------------------------------
        # 6. Momentum Indicators (Weight: 5 pts)
        # Daily RSI(14) > 50 (Bonus for > 60), ADX(14) trend strength, ATR(14)
        # -------------------------------------------------------------------------
        rsi_series = compute_rsi(c)
        cur_rsi = float(rsi_series.iloc[-1])
        rsi_score = 0.0
        if cur_rsi >= 65: rsi_score = 2.0
        elif cur_rsi >= 60: rsi_score = 1.8
        elif cur_rsi >= 55: rsi_score = 1.5
        elif cur_rsi >= 50: rsi_score = 1.0

        adx_series = compute_adx(h, l, c)
        cur_adx = float(adx_series.iloc[-1]) if not np.isnan(adx_series.iloc[-1]) else 15.0
        adx_score = 0.0
        if cur_adx >= 30: adx_score = 2.0
        elif cur_adx >= 25: adx_score = 1.5
        elif cur_adx >= 20: adx_score = 1.0

        atr_series = compute_atr(h, l, c)
        cur_atr = float(atr_series.iloc[-1]) if not np.isnan(atr_series.iloc[-1]) else 0.0
        atr_pct = (cur_atr / cur_close) * 100 if cur_close > 0 else 0.0
        atr_score = 1.0 if atr_pct >= 1.5 else 0.5

        indicator_score = rsi_score + adx_score + atr_score

        # -------------------------------------------------------------------------
        # 7. Momentum Acceleration (Weight: 5 pts)
        # 5D vs 20D momentum, 20D vs 60D momentum (Accelerating / Stable / Decelerating)
        # -------------------------------------------------------------------------
        rate_5d = p_info["ret_5d"] / 5.0
        rate_20d = p_info["ret_20d"] / 20.0
        rate_60d = p_info["ret_60d"] / 60.0

        if rate_5d > rate_20d and rate_20d > rate_60d and p_info["ret_5d"] > 0:
            accel_state = "Accelerating"
            accel_score = 5.0
        elif (rate_5d >= rate_20d or rate_20d >= rate_60d) and p_info["ret_20d"] > 0:
            accel_state = "Stable"
            accel_score = 3.5
        else:
            accel_state = "Decelerating"
            accel_score = 1.0

        # -------------------------------------------------------------------------
        # 8. 52-Week Position (Weight: 5 pts)
        # Proximity to 52-week high with sustained momentum
        # -------------------------------------------------------------------------
        high_52w = float(h.tail(252).max())
        drawdown_52w = ((high_52w - cur_close) / high_52w) * 100 if high_52w > 0 else 0.0

        if drawdown_52w <= 3.0: pos52w_score = 5.0
        elif drawdown_52w <= 7.0: pos52w_score = 4.0
        elif drawdown_52w <= 12.0: pos52w_score = 3.0
        elif drawdown_52w <= 20.0: pos52w_score = 2.0
        elif drawdown_52w <= 30.0: pos52w_score = 1.0
        else: pos52w_score = 0.0

        # -------------------------------------------------------------------------
        # 9. Market Regime Confluence (Weight: 5 pts)
        # -------------------------------------------------------------------------
        regime_confluence = regime_score

        # -------------------------------------------------------------------------
        # Total Confluence Score: 0 to 100
        # -------------------------------------------------------------------------
        raw_score = (
            p_mom + rs_score + trend_score + breakout_score + vol_score +
            indicator_score + accel_score + pos52w_score + regime_confluence
        )
        total_score_int = int(round(raw_score))
        total_score_int = max(0, min(100, total_score_int))

        # Filter Threshold: Retain strictly qualified stocks with Total Score >= 70
        if total_score_int >= 70:
            if total_score_int >= 90:
                grade = "A+"
            elif total_score_int >= 80:
                grade = "A"
            else:
                grade = "B"

            # Trade execution matrix
            prev_20_low = float(l.iloc[:-1].tail(20).min())
            invalidation = round(min(cur_close * 0.94, v_ema20 * 0.98, prev_20_low), 2)
            risk = max(cur_close - invalidation, cur_close * 0.03)
            target_1 = round(cur_close + (risk * 2.0), 2)
            target_2 = round(cur_close + (risk * 3.5), 2)
            entry_min = round(min(v_ema20, cur_close * 0.98), 2)
            entry_zone = f"₹{entry_min:,.2f} - ₹{cur_close:,.2f}"
            target_zone = f"{target_1:,.2f} - {target_2:,.2f}"

            sym_info = symbols_map.get(sym, {})
            name = sym_info.get("name", sym)
            sector = sym_info.get("sector", "NSE")

            # Setup evidence tags
            setup_tags: List[str] = []
            if cur_close > v_ema20 > v_ema50 > v_ema200:
                setup_tags.append("Bullish Trend Stack")
            if cur_close >= prev_20_high:
                setup_tags.append("20D Breakout Reclaim")
            elif cur_close >= prev_20_high * 0.98:
                setup_tags.append("Breakout Pivot Retest")
            if rvol >= 1.5:
                setup_tags.append(f"Volume Surge {rvol}x")
            elif rvol >= 1.0:
                setup_tags.append("Volume Expansion")
            if rs_60d > 0:
                setup_tags.append(f"60D RS +{rs_60d:.1f}%")
            if accel_state == "Accelerating":
                setup_tags.append("Momentum Accelerating")
            elif accel_state == "Stable":
                setup_tags.append("Momentum Stable")
            if drawdown_52w <= 10.0:
                setup_tags.append(f"Near 52W High (-{drawdown_52w:.1f}%)")
            setup_tags.append("R:R 1:2.5")

            status = f"{accel_state.upper()} BREAKOUT" if cur_close >= prev_20_high else f"{accel_state.upper()} MOMENTUM"
            combined_rs = rs_20d + rs_60d + rs_120d

            deliv_item = delivery_map.get(sym, {})
            deliv_pct = deliv_item.get("delivery_pct", 35.0)
            deliv_qty = deliv_item.get("delivery_qty", cur_vol * 0.35)
            avg_deliv_10d = deliv_item.get("avg_deliv_10d", 30.0)
            avg_deliv_vol_10d = deliv_item.get("avg_deliv_vol_10d", cur_vol * 0.30)
            deliv_spike = deliv_item.get("delivery_spike_pct", 15.0)
            whale_flag = deliv_item.get("whale_absorption_flag", bool(deliv_pct >= 50.0))
            sm_status = deliv_item.get("smart_money_status", "Active Accumulation" if deliv_pct >= 40.0 else "Standard Flow")

            candle_date = df["Date"].iloc[-1]
            date_str = str(candle_date.date()) if hasattr(candle_date, "date") else str(candle_date)[:10]

            record = {
                "symbol": sym,
                "name": name,
                "sector": sector,
                "cmp": cur_close,
                "change_pct": change_pct,
                "score": total_score_int,
                "grade": grade,
                "score_display": f"{total_score_int} ({grade})",
                "institutional_score": total_score_int,
                "invalidation": invalidation,
                "entry_zone": entry_zone,
                "target_1": target_1,
                "target_2": target_2,
                "target_zone": target_zone,
                "risk_reward_ratio": "1:2.5",
                "rvol": rvol,
                "setup_tags": setup_tags,
                "status": status,
                "support_level": "20 EMA",
                "support_ema": round(v_ema20, 2),
                "rs_20d": round(rs_20d, 1),
                "rs_60d": round(rs_60d, 1),
                "rs_120d": round(rs_120d, 1),
                "combined_rs": round(combined_rs, 1),
                "ret_5d": round(p_info["ret_5d"], 1),
                "ret_10d": round(p_info["ret_10d"], 1),
                "ret_20d": round(p_info["ret_20d"], 1),
                "ret_60d": round(p_info["ret_60d"], 1),
                "ret_120d": round(p_info["ret_120d"], 1),
                "rsi": round(cur_rsi, 1),
                "adx": round(cur_adx, 1),
                "atr": round(cur_atr, 2),
                "momentum_state": accel_state,
                "drawdown_52w": round(drawdown_52w, 1),
                "timestamp": date_str,
                "volume": cur_vol,
                "score_breakdown": {
                    "price_momentum": round(p_mom, 1),
                    "relative_strength": round(rs_score, 1),
                    "trend_structure": round(trend_score, 1),
                    "breakout_expansion": round(breakout_score, 1),
                    "volume_confirmation": round(vol_score, 1),
                    "momentum_indicators": round(indicator_score, 1),
                    "momentum_acceleration": round(accel_score, 1),
                    "position_52w": round(pos52w_score, 1),
                    "regime_confluence": round(regime_confluence, 1)
                },
                "delivery_pct": deliv_pct,
                "delivery_qty": deliv_qty,
                "avg_deliv_10d": avg_deliv_10d,
                "avg_deliv_vol_10d": avg_deliv_vol_10d,
                "delivery_spike_pct": deliv_spike,
                "whale_absorption_flag": whale_flag,
                "smart_money_status": sm_status
            }
            qualified_signals.append(record)

    # Ranking: Sort qualified candidates descending by: Score -> Relative Strength -> 20D Momentum -> Volume
    qualified_signals.sort(
        key=lambda x: (x["score"], x["combined_rs"], x["ret_20d"], x["volume"]),
        reverse=True
    )

    logger.info(f"Qualified {len(qualified_signals)} Setup 7 candidates with Total Score >= 70.")
    return qualified_signals


def save_and_integrate_results(signals: List[Dict[str, Any]]):
    """
    Save Setup 7 results to:
      1. data/setup7_momentum_leader.json
      2. data/scanner_results.json (under setup key 'setup7' and 'setup_7')
    """
    iso_timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # Determine session date from data or fallback to today
    session_date = signals[0]["timestamp"] if signals else datetime.utcnow().strftime("%Y-%m-%d")
    try:
        dt = datetime.strptime(session_date, "%Y-%m-%d")
        session_date_display = dt.strftime("%d-%b-%Y")
    except Exception:
        session_date_display = session_date

    # 1. Save data/setup7_momentum_leader.json
    setup7_payload = {
        "setup_id": "setup7_momentum_leader",
        "title": "🚀 Setup 7: Momentum Leader PRO",
        "subtitle": "Multi-factor Daily EOD Momentum Leader Engine: Price Acceleration, Relative Strength & Institutional Volume Confluence.",
        "last_updated": iso_timestamp,
        "last_session_date": session_date,
        "session_date_display": session_date_display,
        "qualifying_count": len(signals),
        "signals": signals
    }

    with open(SETUP7_OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(setup7_payload, f, indent=2, ensure_ascii=False)
    logger.info(f"Saved {len(signals)} signals to {SETUP7_OUTPUT_FILE}")

    # 2. Integrate into data/scanner_results.json under setup key setup7
    if SCANNER_RESULTS_FILE.exists():
        try:
            with open(SCANNER_RESULTS_FILE, "r", encoding="utf-8") as f:
                scanner_data = json.load(f)

            if "setups" not in scanner_data:
                scanner_data["setups"] = {}

            scanner_setup_entry = {
                "id": "setup7",
                "title": "🚀 Setup 7: Momentum Leader PRO",
                "subtitle": "Multi-factor Daily EOD Momentum Leader Engine: Price Acceleration, Relative Strength & Institutional Volume Confluence.",
                "count": len(signals),
                "signals": signals
            }

            scanner_data["setups"]["setup7"] = scanner_setup_entry
            scanner_data["setups"]["setup_7"] = scanner_setup_entry
            scanner_data["setup7"] = scanner_setup_entry

            with open(SCANNER_RESULTS_FILE, "w", encoding="utf-8") as f:
                json.dump(scanner_data, f, indent=2, ensure_ascii=False)
            logger.info(f"Integrated Setup 7 into {SCANNER_RESULTS_FILE} under keys 'setup7' and 'setup_7'.")
        except Exception as e:
            logger.error(f"Failed to integrate into {SCANNER_RESULTS_FILE}: {e}")
            raise


if __name__ == "__main__":
    logger.info("Starting MITS Pro Setup 7: Momentum Leader PRO scanner...")
    qualified = run_setup7_scan()
    save_and_integrate_results(qualified)
    logger.info("Setup 7 engine execution completed successfully.")
