"""
MITS Pro Institutional Suite V2 - Tab 1: Bottom Reversal Pro Evaluator
Pure EOD quantitative engine with zero look-ahead bias.
Identifies downtrend exhaustion, accumulation base, liquidity sweeps,
volume absorption, and early bullish structure shifts (CHoCH / MSS).
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
BOTTOM_CFG = CONFIG.get("bottom_reversal_pro", {})

class BottomReversalProEngine:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.cfg = config or BOTTOM_CFG
        self.de_cfg = self.cfg.get("downtrend_exhaustion", {})
        self.ba_cfg = self.cfg.get("base_accumulation", {})
        self.ls_cfg = self.cfg.get("liquidity_sweep", {})
        self.ss_cfg = self.cfg.get("structure_shift", {})
        self.va_cfg = self.cfg.get("volume_absorption", {})
        self.rr_cfg = self.cfg.get("market_regime_and_rr", {})
        self.scoring_cfg = self.cfg.get("scoring", {})

    @staticmethod
    def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculate Average True Range strictly backward looking (zero look-ahead)."""
        high = df["High"]
        low = df["Low"]
        close = df["Close"]
        prev_close = close.shift(1)

        tr1 = high - low
        tr2 = (high - prev_close).abs()
        tr3 = (low - prev_close).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        return tr.rolling(window=period, min_periods=period).mean()

    def evaluate(
        self,
        symbol_meta: Dict[str, Any],
        df: pd.DataFrame,
        nifty_above_ema20: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Evaluate a single stock's finalized EOD OHLCV history against the 100-point
        Bottom Reversal Pro model.
        Returns a qualified signal dictionary if Score >= 70, otherwise None.
        """
        if df is None or len(df) < 65:
            return None

        # Clean column names & ensure numeric types
        df = df.copy()
        for col in ["Open", "High", "Low", "Close", "Volume"]:
            if col not in df.columns:
                return None
            df[col] = pd.to_numeric(df[col], errors="coerce")

        df.dropna(subset=["Open", "High", "Low", "Close", "Volume"], inplace=True)
        if len(df) < 65:
            return None

        # Zero Look-Ahead Rule: The latest finalized candle is at index -1
        current_idx = len(df) - 1
        history_df = df.iloc[: current_idx + 1] # Strictly up to and including current candle

        current_candle = history_df.iloc[-1]
        cmp = round(float(current_candle["Close"]), 2)
        current_high = round(float(current_candle["High"]), 2)
        current_low = round(float(current_candle["Low"]), 2)
        current_open = round(float(current_candle["Open"]), 2)
        current_vol = float(current_candle["Volume"])

        # Prior close for daily change %
        prev_close = float(history_df.iloc[-2]["Close"])
        change_pct = round(((cmp - prev_close) / prev_close) * 100, 2)

        # Technical Series (strictly backward-looking)
        close_series = history_df["Close"]
        vol_series = history_df["Volume"]

        ema20_series = close_series.ewm(span=20, adjust=False).mean()
        ema50_series = close_series.ewm(span=50, adjust=False).mean()
        atr_series = self.calculate_atr(history_df, period=self.rr_cfg.get("atr_period", 14))
        vol_sma20_series = vol_series.rolling(window=20).mean()

        current_ema20 = float(ema20_series.iloc[-1])
        current_ema50 = float(ema50_series.iloc[-1])
        current_atr = float(atr_series.iloc[-1]) if not math.isnan(atr_series.iloc[-1]) else (current_high - current_low)
        vol_sma20 = float(vol_sma20_series.iloc[-2]) if len(vol_sma20_series) > 20 else float(vol_series.mean())
        rvol = round(float(current_vol / max(vol_sma20, 1.0)), 2)

        setup_tags: List[str] = []
        score_breakdown: Dict[str, float] = {}

        # ----------------------------------------------------------------------
        # 1. Downtrend Exhaustion (15 Points)
        # ----------------------------------------------------------------------
        score_exhaustion = 0.0
        lookback_days = int(self.de_cfg.get("lookback_high_days", 60))
        high_window = history_df["High"].iloc[-lookback_days:]
        swing_high_60 = float(high_window.max())

        decline_pct = ((swing_high_60 - cmp) / swing_high_60) * 100
        min_decline = float(self.de_cfg.get("min_decline_pct", 15.0))
        opt_decline = float(self.de_cfg.get("optimal_decline_pct", 25.0))
        max_decline = float(self.de_cfg.get("max_decline_pct", 55.0))

        # Check runaway breakdown rejection
        candle_range = max(0.01, current_high - current_low)
        body_size = abs(cmp - current_open)
        is_red_candle = cmp < current_open
        lower_wick_space = min(cmp, current_open) - current_low

        if is_red_candle and (body_size / candle_range > 0.75) and (lower_wick_space / candle_range < 0.15):
            # Runaway breakdown candle closing at low: Instant reject
            return None

        if decline_pct >= opt_decline and decline_pct <= max_decline:
            score_exhaustion += 10.0
            setup_tags.append("Downtrend Exhaustion")
        elif decline_pct >= min_decline:
            score_exhaustion += 7.0
            setup_tags.append("Established Decline")
        else:
            # Not in an extended decline
            return None

        # EMA trend structure: 20 EMA < 50 EMA shows established downtrend baseline
        if current_ema20 < current_ema50:
            score_exhaustion += 3.0

        # Deceleration check: ATR contracting or recent candle bodies shrinking
        recent_bodies = (history_df["Close"].iloc[-5:] - history_df["Open"].iloc[-5:]).abs()
        prior_bodies = (history_df["Close"].iloc[-15:-5] - history_df["Open"].iloc[-15:-5]).abs()
        if recent_bodies.mean() <= prior_bodies.mean() * 0.95 or current_atr <= atr_series.iloc[-20:].mean():
            score_exhaustion += 2.0
            setup_tags.append("Deceleration")

        score_breakdown["exhaustion"] = score_exhaustion

        # ----------------------------------------------------------------------
        # 2. Base & Accumulation (20 Points)
        # ----------------------------------------------------------------------
        score_base = 0.0
        min_base_len = int(self.ba_cfg.get("min_base_sessions", 8))
        max_base_len = int(self.ba_cfg.get("max_base_sessions", 20))
        max_bandwidth = float(self.ba_cfg.get("max_bandwidth_pct", 8.0))
        relaxed_bandwidth = float(self.ba_cfg.get("relaxed_bandwidth_pct", 10.5))

        base_slice = history_df.iloc[-max_base_len:]
        base_high = float(base_slice["High"].max())
        base_low = float(base_slice["Low"].min())
        bandwidth = ((base_high - base_low) / max(0.01, base_low)) * 100

        if bandwidth <= max_bandwidth:
            score_base += 15.0
            setup_tags.append("Tight Base (<8%)")
        elif bandwidth <= relaxed_bandwidth:
            score_base += 10.0
            setup_tags.append("Accumulation Base")
        else:
            # Too volatile, no coherent accumulation base
            return None

        # Rejection / absorption touches from lower boundary
        lower_boundary_threshold = base_low + (0.025 * (base_high - base_low))
        lower_touches = (base_slice["Low"] <= lower_boundary_threshold).sum()
        if lower_touches >= 2:
            score_base += 5.0
            setup_tags.append("Demand Absorption")

        score_breakdown["base"] = score_base

        # ----------------------------------------------------------------------
        # 3. Liquidity Sweep & False Breakdown (20 Points)
        # ----------------------------------------------------------------------
        score_sweep = 0.0
        # Check liquidity sweep in the last 5 sessions
        recent_window = history_df.iloc[-5:]
        prior_base_low = float(history_df["Low"].iloc[-max_base_len:-5].min()) if len(history_df) > max_base_len else base_low

        has_sweep = False
        lower_wick_ratio = 0.0

        for idx, row in recent_window.iterrows():
            r_low = float(row["Low"])
            r_close = float(row["Close"])
            r_open = float(row["Open"])
            r_high = float(row["High"])
            r_range = max(0.01, r_high - r_low)
            r_lower_wick = max(0.0, min(r_open, r_close) - r_low)
            w_ratio = r_lower_wick / r_range

            if r_low < prior_base_low and r_close >= prior_base_low:
                has_sweep = True
                lower_wick_ratio = max(lower_wick_ratio, w_ratio)

        # Also evaluate current candle wick
        current_lower_wick = max(0.0, min(current_open, cmp) - current_low)
        current_wick_ratio = current_lower_wick / candle_range
        lower_wick_ratio = max(lower_wick_ratio, current_wick_ratio)

        min_wick_ratio = float(self.ls_cfg.get("min_lower_wick_ratio", 0.35))
        mod_wick_ratio = float(self.ls_cfg.get("moderate_lower_wick_ratio", 0.25))

        if has_sweep:
            score_sweep += 10.0
            setup_tags.append("Liquidity Sweep")

        if lower_wick_ratio >= min_wick_ratio:
            score_sweep += 10.0
            setup_tags.append("Prominent Lower Wick")
        elif lower_wick_ratio >= mod_wick_ratio:
            score_sweep += 6.0

        score_breakdown["sweep"] = score_sweep

        # ----------------------------------------------------------------------
        # 4. Bullish Structure Shift / MSS / CHoCH (20 Points)
        # ----------------------------------------------------------------------
        score_structure = 0.0
        minor_pivot_days = int(self.ss_cfg.get("minor_pivot_lookback", 10))
        # Find minor swing high (Lower High) inside base excluding the current candle
        minor_window = history_df.iloc[-minor_pivot_days:-1]
        minor_lh = float(minor_window["High"].max()) if not minor_window.empty else base_high

        if cmp >= minor_lh:
            score_structure += 20.0
            setup_tags.append("CHoCH Confirmed")
        elif cmp >= minor_lh * float(self.ss_cfg.get("coiling_buffer_pct", 0.985)):
            score_structure += 12.0
            setup_tags.append("MSS Coiling")

        score_breakdown["structure"] = score_structure

        # ----------------------------------------------------------------------
        # 5. Volume Absorption & Confirmation (15 Points)
        # ----------------------------------------------------------------------
        score_volume = 0.0
        min_breakout_rvol = float(self.va_cfg.get("min_breakout_rvol", 1.5))
        min_sweep_vol = float(self.va_cfg.get("min_sweep_volume_mult", 1.3))
        anaemic_cutoff = float(self.va_cfg.get("anaemic_cutoff_rvol", 1.0))

        # Check volume of reversal/breakout
        if rvol >= min_breakout_rvol:
            score_volume += 15.0
            setup_tags.append("Volume Absorption")
        elif rvol >= min_sweep_vol:
            score_volume += 11.0
            setup_tags.append("Elevated Accumulation Vol")
        elif rvol < anaemic_cutoff:
            # Exclude stocks breaking out on anaemic volume
            score_volume += 0.0

        score_breakdown["volume"] = score_volume

        # ----------------------------------------------------------------------
        # 6. Market Regime & Risk-Reward (10 Points)
        # ----------------------------------------------------------------------
        score_regime_rr = 0.0

        # Market regime factor (5 pts)
        if nifty_above_ema20:
            score_regime_rr += 5.0

        # Invalidation Level = lowest point of base minus 0.5 * ATR(14)
        atr_mult = float(self.rr_cfg.get("invalidation_atr_mult", 0.5))
        invalidation = round(base_low - (atr_mult * current_atr), 2)
        risk = max(0.01, cmp - invalidation)

        # Target 1: Previous intermediate swing high (minimum 1:2 R:R)
        intermediate_swing_high = float(history_df["High"].iloc[-35:-10].max()) if len(history_df) >= 35 else base_high * 1.08
        potential_reward = intermediate_swing_high - cmp

        if potential_reward / risk >= 2.0:
            target_1 = round(intermediate_swing_high, 2)
            calculated_rr = round(potential_reward / risk, 2)
        else:
            target_1 = round(cmp + (2.0 * risk), 2)
            calculated_rr = 2.0

        # Target 2: Major structural resistance (e.g. 60-day high or 0.618 retracement)
        target_2 = round(swing_high_60, 2)

        min_rr_threshold = float(self.rr_cfg.get("min_risk_reward", 2.0))
        if calculated_rr >= min_rr_threshold:
            score_regime_rr += 5.0
            setup_tags.append(f"R:R {calculated_rr}:1")

        score_breakdown["regime_and_rr"] = score_regime_rr

        # ----------------------------------------------------------------------
        # Total Score & Grade Classification
        # ----------------------------------------------------------------------
        total_score = round(sum(score_breakdown.values()))
        min_score = int(self.scoring_cfg.get("min_qualifying_score", 70))

        if total_score < min_score:
            # Reject / Exclude stocks with score < 70
            return None

        # Determine Grade
        if total_score >= int(self.scoring_cfg.get("grades", {}).get("A_PLUS", {}).get("min_score", 90)):
            grade = "A+"
        elif total_score >= int(self.scoring_cfg.get("grades", {}).get("A", {}).get("min_score", 80)):
            grade = "A"
        else:
            grade = "B"

        # Unique tags
        unique_tags = list(dict.fromkeys(setup_tags))

        # Entry Zone calculation
        entry_min = round(min(cmp, minor_lh), 2)
        entry_max = round(max(cmp, minor_lh * 1.01), 2)
        entry_zone_str = f"₹{entry_min} - ₹{entry_max}"

        return {
            "symbol": symbol_meta.get("symbol", ""),
            "name": symbol_meta.get("name", ""),
            "sector": symbol_meta.get("sector", "NSE"),
            "cmp": cmp,
            "change_pct": change_pct,
            "score": total_score,
            "grade": grade,
            "score_display": f"{total_score} ({grade})",
            "institutional_score": total_score,
            "invalidation": invalidation,
            "entry_zone": entry_zone_str,
            "target_1": target_1,
            "target_2": target_2,
            "target_zone": f"{target_1} - {target_2}",
            "risk_reward_ratio": f"1:{calculated_rr}",
            "rvol": rvol,
            "setup_tags": unique_tags,
            "status": "CHoCH CONFIRMED" if cmp >= minor_lh else "MSS COILING",
            "timestamp": current_candle.name.strftime("%Y-%m-%d") if hasattr(current_candle.name, "strftime") else "2026-09-18",
            "score_breakdown": score_breakdown
        }

