"""
MITS Pro Institutional Suite V2 - Tab 6: Drop-Base-Rally (DBR) Demand Zone Engine
Pure EOD quantitative engine with zero look-ahead bias.

Strategy Parameters:
1. Drop Phase (Leg-In):
   - Prior decline >= 4.5% over 3 to 8 bars
   - Contains at least one Bearish ERC (Body-to-Range Ratio BRR >= 0.50)
2. Base Phase (Order Bank Consolidation):
   - 1 to 4 consecutive boring NRC candles (BRR <= 0.50)
   - Base depth <= 4.0%: (P_prox - P_dist) / P_dist <= 4.0%
   - Base average volume < 1.1x 20-day Volume SMA
3. Rally Phase (Leg-Out Departure):
   - Bullish ERC (BRR >= 0.55)
   - Close > Proximal Line (P_prox)
   - Leg-out RVOL >= 1.25x
4. Freshness & Two-Stage Trigger:
   - Stage A: "FRESH DEMAND RETEST" (Zone created 2-15 bars ago, 100% untouched, current low dips into P_prox)
   - Stage B: "DEMAND LEG-OUT" (Current bar is explosive breakout bar departing from base)
5. Structural Math (Levels & 1:2.5 RR):
   - P_prox = max(High of base bars)
   - P_dist = min(Low of base bars)
   - Invalidation (SL) = P_dist - max(0.15 * ATR14, 0.004 * P_dist)
   - Targets: T1 = CMP + (1.5 * Risk), T2 = CMP + (2.5 * Risk)
   - Scoring: 0-100 institutional score and Grade A+/A/B
"""

import math
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import yaml
import pandas as pd
import numpy as np

# Load quantitative config
BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = BASE_DIR / "config.yaml"


def load_config() -> Dict[str, Any]:
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    return {}


CONFIG = load_config()
DBR_CFG = CONFIG.get("dbr_demand_zone", {})


class DBRDemandZoneEngine:
    """
    Quantitative Drop-Base-Rally (DBR) Demand Zone Engine.
    Evaluates historical daily OHLCV dataframe with zero look-ahead bias.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.cfg = config or DBR_CFG
        self.drop_cfg = self.cfg.get("drop_phase", {})
        self.base_cfg = self.cfg.get("base_phase", {})
        self.rally_cfg = self.cfg.get("rally_phase", {})
        self.freshness_cfg = self.cfg.get("freshness", {})
        self.ts_cfg = self.cfg.get("trade_setup", {})

    @staticmethod
    def compute_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculate Average True Range (ATR14) with zero look-ahead bias."""
        high = df["High"]
        low = df["Low"]
        close_prev = df["Close"].shift(1)
        tr1 = high - low
        tr2 = (high - close_prev).abs()
        tr3 = (low - close_prev).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        return tr.rolling(window=period, min_periods=period).mean().fillna(tr)

    @staticmethod
    def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
        """Calculate Wilder's smoothed RSI(14) with zero look-ahead bias."""
        delta = series.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        rsi = 100.0 - (100.0 / (1.0 + rs))
        return rsi.fillna(50.0)

    @staticmethod
    def get_candle_metrics(open_p: float, high: float, low: float, close: float) -> Tuple[float, float, float]:
        """Returns (range_val, body_val, brr_ratio)."""
        range_val = max(high - low, 0.001)
        body_val = abs(close - open_p)
        brr = body_val / range_val
        return range_val, body_val, brr

    def evaluate(self, symbol_meta: Dict[str, Any], df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """
        Pure EOD Evaluation of a stock for DBR Demand Zone Setup.
        """
        if df is None or len(df) < 50:
            return None

        close = df["Close"].values
        open_p = df["Open"].values
        high = df["High"].values
        low = df["Low"].values
        volume = df["Volume"].values

        n_bars = len(df)
        cur_close = float(close[-1])
        cur_open = float(open_p[-1])
        cur_high = float(high[-1])
        cur_low = float(low[-1])
        cur_volume = float(volume[-1])

        # Moving Averages & Volume SMA (Zero Look-Ahead EOD)
        close_series = df["Close"]
        vol_series = df["Volume"]
        vol_sma20 = vol_series.rolling(window=20, min_periods=5).mean().values

        atr14_series = self.compute_atr(df, 14)
        atr14 = float(atr14_series.iloc[-1])
        rsi14_series = self.compute_rsi(close_series, 14)
        cur_rsi = float(rsi14_series.iloc[-1])

        ema20_series = close_series.ewm(span=20, adjust=False).mean()
        ema50_series = close_series.ewm(span=50, adjust=False).mean()
        ema20_cur = float(ema20_series.iloc[-1])
        ema50_cur = float(ema50_series.iloc[-1])
        sma200 = float(close_series.rolling(window=200, min_periods=20).mean().iloc[-1]) if n_bars >= 20 else cur_close

        prev_close = float(close[-2]) if n_bars >= 2 else cur_close
        change_pct = round(((cur_close - prev_close) / prev_close) * 100.0, 2)
        cur_rvol = round(cur_volume / max(vol_sma20[-1], 1.0), 2)

        # ----------------------------------------------------------------------
        # 1. RBR Overlap Exclusion Filter (Momentum Flags at All-Time Highs)
        # Strong stage-2 uptrend continuation stocks riding at 52-week highs are
        # reserved strictly for Tab 7 RBR / Bull Flag breakout strategies.
        # If Close > 20 EMA and 20 EMA > 50 EMA and CMP is within 2% of 52W High -> DISQUALIFY
        # ----------------------------------------------------------------------
        exclusion_cfg = self.cfg.get("exclusion_rules", {})
        max_high_52w_proximity = float(exclusion_cfg.get("max_high_52w_proximity_pct", 2.0))
        high_52w = float(df["High"].tail(252).max()) if n_bars >= 252 else float(df["High"].max())
        drawdown_52w_close = ((high_52w - cur_close) / max(high_52w, 0.01)) * 100.0
        drawdown_52w_high = ((high_52w - cur_high) / max(high_52w, 0.01)) * 100.0
        min_drawdown_52w = min(drawdown_52w_close, drawdown_52w_high)

        if cur_close > ema20_cur > ema50_cur and min_drawdown_52w <= max_high_52w_proximity:
            return None  # Disqualify RBR momentum continuation

        # ----------------------------------------------------------------------
        # 2. Base Structural Discount Requirement
        # DBR must strictly function as a Reversal Demand Zone at deep value/support:
        # CMP must be below/testing 20 EMA, or testing 50/200 EMA / multi-week support.
        # ----------------------------------------------------------------------
        require_structural_discount = bool(self.base_cfg.get("require_structural_discount", True))
        if require_structural_discount:
            is_below_ema20 = cur_close <= ema20_cur * 1.015
            is_testing_ema50 = (abs(cur_close - ema50_cur) / max(ema50_cur, 0.01)) <= 0.025
            is_testing_sma200 = (abs(cur_close - sma200) / max(sma200, 0.01)) <= 0.03
            swing_low_50d = float(np.min(low[max(0, n_bars - 50):]))
            is_testing_support = ((cur_close - swing_low_50d) / max(swing_low_50d, 0.01)) <= 0.035

            if not (is_below_ema20 or is_testing_ema50 or is_testing_sma200 or is_testing_support):
                return None  # Disqualify extended stocks lacking structural discount

        # Config parameters
        min_drop_pct = float(self.drop_cfg.get("min_drop_pct", 6.0))
        min_drop_from_swing_high = float(self.drop_cfg.get("min_drop_from_swing_high", 7.0))
        min_lookback_drop = int(self.drop_cfg.get("min_lookback_bars", 4))
        max_lookback_drop = int(self.drop_cfg.get("max_lookback_bars", 10))
        min_bearish_candles = int(self.drop_cfg.get("min_bearish_candles", 2))
        min_bearish_erc_brr = float(self.drop_cfg.get("min_bearish_erc_brr", 0.50))

        min_base_bars = int(self.base_cfg.get("min_base_bars", 1))
        max_base_bars = int(self.base_cfg.get("max_base_bars", 4))
        max_boring_brr = float(self.base_cfg.get("max_boring_candle_brr", 0.50))
        max_base_depth_pct = float(self.base_cfg.get("max_base_depth_pct", 4.0))
        max_base_avg_vol = float(self.base_cfg.get("max_base_avg_vol_ratio", 1.10))

        min_bullish_erc_brr = float(self.rally_cfg.get("min_bullish_erc_brr", 0.55))
        min_legout_rvol = float(self.rally_cfg.get("min_rvol", 1.25))

        max_retest_bars = int(self.freshness_cfg.get("max_retest_lookback_bars", 15))
        retest_proximity_pct = float(self.freshness_cfg.get("retest_proximity_pct", 1.5))
        retest_hold_buffer = float(self.freshness_cfg.get("retest_hold_buffer_pct", 1.0))

        best_setup = None

        # ======================================================================
        # HELPER: Verify Drop (Leg-In Reversal Context)
        # ======================================================================
        def check_drop_phase(base_start_idx: int, p_dist: float) -> Tuple[bool, float, bool]:
            """
            Checks prior decline into the base:
            1. Drop from 20-to-50-day intermediate swing high must be >= 7.0% (genuine corrective leg).
            2. 4 to 10 bars leading into base must show sustained selling pressure:
               at least 2 bearish candles or net drop >= 6.0%.
            3. Must contain at least one Bearish ERC (BRR >= 0.50).
            """
            start_window = max(0, base_start_idx - max_lookback_drop)
            end_window = base_start_idx
            if end_window - start_window < min_lookback_drop:
                return False, 0.0, False

            # 1. Intermediate swing high lookback (20 to 50 bars prior to base)
            swing_high_lookback = min(base_start_idx, 50)
            if swing_high_lookback >= 20:
                swing_high_20_50 = float(np.max(high[base_start_idx - swing_high_lookback:base_start_idx]))
                swing_drop_pct = ((swing_high_20_50 - p_dist) / max(swing_high_20_50, 0.01)) * 100.0
                if swing_drop_pct < min_drop_from_swing_high:
                    return False, 0.0, False

            # 2. Drop phase leading into base
            drop_highs = high[start_window:end_window]
            peak_high = float(np.max(drop_highs))
            drop_pct = ((peak_high - p_dist) / max(peak_high, 0.01)) * 100.0

            # 3. Sustained selling pressure (at least 2 bearish candles or net drop >= min_drop_pct)
            bearish_candles = sum(1 for k in range(start_window, end_window) if close[k] < open_p[k])
            if drop_pct < min_drop_pct and bearish_candles < min_bearish_candles:
                return False, drop_pct, False

            # 4. Check for at least one Bearish ERC in drop window
            has_bearish_erc = False
            for k in range(start_window, end_window):
                _, _, brr_k = self.get_candle_metrics(open_p[k], high[k], low[k], close[k])
                if close[k] < open_p[k] and brr_k >= min_bearish_erc_brr:
                    has_bearish_erc = True
                    break

            if not has_bearish_erc:
                return False, drop_pct, False

            return True, drop_pct, has_bearish_erc

        # ======================================================================
        # SCANNER CHECK 1: STAGE A - FRESH DEMAND RETEST (Priority)
        # Zone formed 2 to 15 bars ago; zone is 100% fresh; current bar is retesting.
        # ======================================================================
        for k_ago in range(2, min(max_retest_bars + 1, n_bars - 10)):
            legout_idx = n_bars - 1 - k_ago

            # Leg-out candle checks
            lo_open = open_p[legout_idx]
            lo_close = close[legout_idx]
            lo_high = high[legout_idx]
            lo_low = low[legout_idx]
            lo_vol = volume[legout_idx]
            lo_sma_vol = vol_sma20[legout_idx]

            lo_range, lo_body, lo_brr = self.get_candle_metrics(lo_open, lo_high, lo_low, lo_close)
            if lo_close <= lo_open or lo_brr < min_bullish_erc_brr:
                continue

            lo_rvol = lo_vol / max(lo_sma_vol, 1.0)
            if lo_rvol < (min_legout_rvol * 0.85):  # Allow tolerance on historical bar
                continue

            # Determine contiguous sequence of boring candles immediately preceding legout
            contiguous_boring = 0
            for b_idx in range(legout_idx - 1, max(-1, legout_idx - 1 - (max_base_bars + 2)), -1):
                _, _, b_brr = self.get_candle_metrics(open_p[b_idx], high[b_idx], low[b_idx], close[b_idx])
                if b_brr <= max_boring_brr:
                    contiguous_boring += 1
                else:
                    break

            if contiguous_boring < min_base_bars or contiguous_boring > max_base_bars:
                continue

            base_len = contiguous_boring
            base_start = legout_idx - base_len
            if base_start < max_lookback_drop:
                continue
            base_end = legout_idx

            b_highs = high[base_start:base_end]
            b_lows = low[base_start:base_end]
            p_prox = float(np.max(b_highs))
            p_dist = float(np.min(b_lows))

            # Leg-out must close above Proximal line
            if lo_close <= p_prox:
                continue

            # Base depth check
            base_depth_pct = ((p_prox - p_dist) / max(p_dist, 0.01)) * 100.0
            if base_depth_pct > max_base_depth_pct:
                continue

            # Base average volume check
            base_vols = volume[base_start:base_end]
            avg_base_vol = float(np.mean(base_vols))
            if avg_base_vol > max_base_avg_vol * max(lo_sma_vol, 1.0):
                continue

            # Drop check
            drop_ok, drop_pct, has_bearish_erc = check_drop_phase(base_start, p_dist)
            if not drop_ok:
                continue

            base_cand = {
                "base_len": base_len,
                "p_prox": p_prox,
                "p_dist": p_dist,
                "base_depth_pct": base_depth_pct,
                "drop_pct": drop_pct,
                "has_bearish_erc": has_bearish_erc,
                "legout_rvol": lo_rvol,
                "legout_brr": lo_brr,
            }


            if base_cand is None:
                continue

            p_prox = base_cand["p_prox"]
            p_dist = base_cand["p_dist"]

            # Freshness verification: intervening bars from legout_idx + 1 to n_bars - 2
            is_100_fresh = True
            is_defunct = False
            for inter_i in range(legout_idx + 1, n_bars - 1):
                # If price closed below Distal line, zone is broken
                if close[inter_i] < p_dist:
                    is_defunct = True
                    break
                # If low entered below Proximal line, zone was already tested
                if low[inter_i] <= p_prox:
                    is_100_fresh = False

            if is_defunct:
                continue

            # Current bar retest criteria:
            # Current low dips into or touches within proximity of Proximal Line
            proximity_thresh = p_prox * (1.0 + retest_proximity_pct / 100.0)
            hold_thresh = p_prox * (1.0 - retest_hold_buffer / 100.0)

            cur_touches_zone = (cur_low <= proximity_thresh and cur_low >= p_dist * 0.98)
            cur_holds_zone = (cur_close >= hold_thresh)

            if cur_touches_zone and cur_holds_zone:
                best_setup = {
                    "stage": "FRESH DEMAND RETEST",
                    "status": "FRESH DEMAND RETEST",
                    "status_class": "dbr-retest",
                    "p_prox": p_prox,
                    "p_dist": p_dist,
                    "base_bars": base_cand["base_len"],
                    "base_depth_pct": base_cand["base_depth_pct"],
                    "drop_pct": base_cand["drop_pct"],
                    "has_bearish_erc": base_cand["has_bearish_erc"],
                    "legout_rvol": base_cand["legout_rvol"],
                    "legout_brr": base_cand["legout_brr"],
                    "is_100_fresh": is_100_fresh,
                    "age_bars": k_ago,
                }
                break  # Take the most recent pristine retest

        # ======================================================================
        # SCANNER CHECK 2: STAGE B - DEMAND LEG-OUT EXPANSION
        # Current bar (index -1) IS the explosive breakout bar departing from base!
        # ======================================================================
        if best_setup is None:
            lo_range, lo_body, lo_brr = self.get_candle_metrics(cur_open, cur_high, cur_low, cur_close)
            if cur_close > cur_open and lo_brr >= min_bullish_erc_brr and cur_rvol >= min_legout_rvol:
                contiguous_boring = 0
                for b_idx in range(n_bars - 2, max(-1, n_bars - 2 - (max_base_bars + 2)), -1):
                    _, _, b_brr = self.get_candle_metrics(open_p[b_idx], high[b_idx], low[b_idx], close[b_idx])
                    if b_brr <= max_boring_brr:
                        contiguous_boring += 1
                    else:
                        break

                if min_base_bars <= contiguous_boring <= max_base_bars:
                    base_len = contiguous_boring
                    base_start = n_bars - 1 - base_len
                    base_end = n_bars - 1

                    if base_start >= max_lookback_drop:
                        b_highs = high[base_start:base_end]
                        b_lows = low[base_start:base_end]
                        p_prox = float(np.max(b_highs))
                        p_dist = float(np.min(b_lows))

                        if cur_close > p_prox:
                            base_depth_pct = ((p_prox - p_dist) / max(p_dist, 0.01)) * 100.0
                            if base_depth_pct <= max_base_depth_pct:
                                drop_ok, drop_pct, has_bearish_erc = check_drop_phase(base_start, p_dist)
                                if drop_ok:
                                    best_setup = {
                                        "stage": "DEMAND LEG-OUT",
                                        "status": "DEMAND LEG-OUT",
                                        "status_class": "dbr-legout",
                                        "p_prox": p_prox,
                                        "p_dist": p_dist,
                                        "base_bars": base_len,
                                        "base_depth_pct": base_depth_pct,
                                        "drop_pct": drop_pct,
                                        "has_bearish_erc": has_bearish_erc,
                                        "legout_rvol": cur_rvol,
                                        "legout_brr": lo_brr,
                                        "is_100_fresh": True,
                                        "age_bars": 0,
                                    }


        if best_setup is None:
            return None

        # ======================================================================
        # STRUCTURAL MATH: Invalidation (SL), Entry Zone & 1:2.5 RR Targets
        # ======================================================================
        p_prox = best_setup["p_prox"]
        p_dist = best_setup["p_dist"]

        sl_atr_mult = float(self.ts_cfg.get("sl_atr_mult", 0.15))
        sl_pct_buffer = float(self.ts_cfg.get("sl_pct_buffer", 0.004))
        buffer_val = max(sl_atr_mult * atr14, sl_pct_buffer * p_dist)
        invalidation_sl = round(p_dist - buffer_val, 2)

        # Invalidation cannot exceed current close
        if invalidation_sl >= cur_close:
            invalidation_sl = round(cur_close * 0.97, 2)

        risk_val = max(cur_close - invalidation_sl, 1.0)
        target_1 = round(cur_close + (1.5 * risk_val), 2)
        target_2 = round(cur_close + (2.5 * risk_val), 2)

        # Entry Zone formatting
        if best_setup["stage"] == "FRESH DEMAND RETEST":
            entry_low = round(min(p_prox * 0.99, cur_close * 0.995), 2)
            entry_high = round(max(cur_close, p_prox * 1.005), 2)
            entry_zone_str = f"₹{entry_low:,.2f} - ₹{entry_high:,.2f}"
        else:
            entry_low = round(p_prox, 2)
            entry_high = round(cur_close, 2)
            entry_zone_str = f"₹{entry_low:,.2f} - ₹{entry_high:,.2f}"

        # ======================================================================
        # SCORING (0 - 100 Points) & GRADE
        # ======================================================================
        score = 0

        # 1. Drop Quality (15 Pts)
        drop_val = best_setup["drop_pct"]
        if drop_val >= 8.0:
            score += 10
        elif drop_val >= 4.5:
            score += 6
        if best_setup["has_bearish_erc"]:
            score += 5

        # 2. Base Pristineness (25 Pts)
        if best_setup["base_bars"] in (1, 2):
            score += 15
        else:
            score += 10

        if best_setup["base_depth_pct"] <= 2.5:
            score += 10
        elif best_setup["base_depth_pct"] <= 4.0:
            score += 6

        # 3. Leg-Out Power (30 Pts)
        if best_setup["legout_brr"] >= 0.65:
            score += 15
        elif best_setup["legout_brr"] >= 0.55:
            score += 10

        if best_setup["legout_rvol"] >= 2.0:
            score += 15
        elif best_setup["legout_rvol"] >= 1.5:
            score += 10
        elif best_setup["legout_rvol"] >= 1.25:
            score += 6

        # 4. Freshness & Zone Health (15 Pts)
        if best_setup["is_100_fresh"]:
            score += 15
        else:
            score += 5

        # 5. Trend & Momentum Confluence (15 Pts)
        if cur_close >= sma200 or cur_close >= ema50_cur:
            score += 8
        if 38.0 <= cur_rsi <= 62.0:
            score += 7

        # Assign Grade
        if score >= 90:
            grade = "A+"
        elif score >= 80:
            grade = "A"
        elif score >= 70:
            grade = "B"
        else:
            return None  # Disqualify setups below 70

        # ======================================================================
        # EVIDENCE TAGS
        # ======================================================================
        tags = []
        if best_setup["stage"] == "FRESH DEMAND RETEST":
            tags.append("100% Fresh Demand" if best_setup["is_100_fresh"] else "Zone Retest")
            tags.append("Zone Retest Hold")
        else:
            tags.append("Demand Leg-Out")

        tags.append(f"Clean {best_setup['base_bars']}-Bar Base")
        tags.append(f"Tight Base ({best_setup['base_depth_pct']:.1f}%)")
        tags.append(f"Drop -{best_setup['drop_pct']:.1f}%")
        tags.append(f"RVOL {best_setup['legout_rvol']:.1f}x")
        tags.append("Bullish ERC Departure")
        tags.append("R:R 1:2.5")

        timestamp_str = str(df.index[-1]).split(" ")[0] if len(df.index) > 0 else "EOD"

        return {
            "symbol": symbol_meta.get("symbol", ""),
            "name": symbol_meta.get("name", symbol_meta.get("symbol", "")),
            "sector": symbol_meta.get("sector", "NSE"),
            "cmp": cur_close,
            "change_pct": change_pct,
            "score": score,
            "grade": grade,
            "score_display": f"{score} ({grade})",
            "institutional_score": score,
            "invalidation": invalidation_sl,
            "entry_zone": entry_zone_str,
            "target_1": target_1,
            "target_2": target_2,
            "target_zone": f"{format(target_1, ',.2f')} - {format(target_2, ',.2f')}",
            "risk_reward_ratio": "1:2.5",
            "rvol": cur_rvol,
            "setup_tags": tags,
            "status": best_setup["status"],
            "status_class": best_setup["status_class"],
            "stage": best_setup["stage"],
            "p_prox": round(p_prox, 2),
            "p_dist": round(p_dist, 2),
            "base_bars": best_setup["base_bars"],
            "base_depth_pct": round(best_setup["base_depth_pct"], 2),
            "drop_pct": round(best_setup["drop_pct"], 2),
            "rsi": round(cur_rsi, 1),
            "timestamp": timestamp_str,
        }
