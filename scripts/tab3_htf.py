"""
MITS Pro Institutional Suite V2 - Tab 3: High Tight Flag (HTF) Engine
Migrated from legacy D:\\MITS-Scanner\\scanner_pipeline.py (HighTightFlagEngine).

Quantitative Strategy Rules:
1. The Pole:
   - Minimum +40% explosive rally within the last 40 trading days
     ((peak_high - swing_min_low) / swing_min_low >= 0.40).
2. The Flag / Tight Base:
   - Consolidation base duration after peak is between 5 to 20 trading days.
   - Pullback from peak high must not exceed 20%
     ((peak_high - lowest_low_after_peak) / peak_high <= 0.20).
3. Volume Dry-Up:
   - Average volume in the flag must be strictly lower than the pole volume
     (flag_avg_volume < pole_avg_volume).
4. Trend Structure:
   - Close > 20 EMA and Close > 50 EMA.
5. Systematic Trade Setup (1:2.5 Risk-to-Reward):
   - Invalidation (SL): Structural level at min(invalidation_level, flag_base_low).
   - Entry Range: Flag breakout pivot to CMP (or support EMA to Flag High).
   - Target 1: CMP + (Risk * 1.5)
   - Target 2: CMP + (Risk * 2.5)
"""

import math
from pathlib import Path
from typing import Dict, List, Optional, Union
import yaml
import numpy as np
import pandas as pd


class HighTightFlagEngine:
    """
    Pure EOD Quantitative Scanner Engine for High Tight Flag (HTF) Setups.
    Guarantees zero look-ahead bias and strict mathematical level derivations.
    """

    def __init__(self, config_path: Optional[Path] = None):
        if config_path is None:
            base_dir = Path(__file__).resolve().parent.parent
            config_path = base_dir / "config.yaml"

        self.cfg = {}
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                full_cfg = yaml.safe_load(f) or {}
                self.cfg = full_cfg.get("high_tight_flag", {})

        self.pole_cfg = self.cfg.get("pole", {})
        self.flag_cfg = self.cfg.get("flag", {})
        self.vol_cfg = self.cfg.get("volume_dryup", {})
        self.trend_cfg = self.cfg.get("trend_structure", {})
        self.ts_cfg = self.cfg.get("trade_setup", {})

    @staticmethod
    def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
        """Standard Wilder's RSI calculation."""
        delta = series.diff()
        gain = delta.clip(lower=0.0)
        loss = -delta.clip(upper=0.0)

        avg_gain = gain.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()

        rs = avg_gain / avg_loss.replace(0.0, np.nan)
        rsi = 100.0 - (100.0 / (1.0 + rs))
        return rsi.fillna(50.0)

    def evaluate(self, symbol_meta: dict, stock_df: pd.DataFrame) -> Optional[dict]:
        """
        Evaluate a single stock history against High Tight Flag criteria.
        Pure EOD candle evaluation.
        """
        if stock_df is None or len(stock_df) < 60:
            return None

        # Sort and clean index
        df = stock_df.sort_index() if isinstance(stock_df.index, pd.DatetimeIndex) else stock_df.copy()

        close = df["Close"].values.astype(float)
        high = df["High"].values.astype(float)
        low = df["Low"].values.astype(float)
        volume = df["Volume"].values.astype(float)

        cur_close = float(close[-1])
        prev_close = float(close[-2]) if len(close) > 1 else cur_close
        change_pct = round(((cur_close - prev_close) / prev_close) * 100.0, 2) if prev_close > 0 else 0.0

        s_close = pd.Series(close)

        # ----------------------------------------------------------------------
        # 1. Trend Structure: Close > 20 EMA and Close > 50 EMA
        # ----------------------------------------------------------------------
        ema20 = float(s_close.ewm(span=20, adjust=False).mean().iloc[-1])
        ema50 = float(s_close.ewm(span=50, adjust=False).mean().iloc[-1])
        ema100 = float(s_close.ewm(span=100, adjust=False).mean().iloc[-1])
        ema200 = float(s_close.ewm(span=200, adjust=False).mean().iloc[-1])

        if not (cur_close > ema20 and cur_close > ema50):
            return None

        N = len(df)
        min_flag_days = int(self.flag_cfg.get("min_flag_days", 5))
        max_flag_days = int(self.flag_cfg.get("max_flag_days", 20))
        max_pole_days = int(self.pole_cfg.get("max_pole_lookback_days", 40))
        min_pole_gain = float(self.pole_cfg.get("min_pole_gain_pct", 40.0)) / 100.0
        max_flag_correction = float(self.flag_cfg.get("max_flag_correction_pct", 20.0)) / 100.0

        best_setup = None

        # ----------------------------------------------------------------------
        # 2. Flag Duration Loop: Search between 5 and 20 trading days
        # ----------------------------------------------------------------------
        for d in range(min_flag_days, max_flag_days + 1):
            if N - 1 - d < 0:
                continue

            peak_idx = N - 1 - d
            peak_high = float(high[peak_idx])

            # Pole Window: Lookback up to 40 trading days before and including peak
            pole_start = max(0, peak_idx - max_pole_days)
            pole_lows = low[pole_start : peak_idx + 1]
            pole_highs = high[pole_start : peak_idx + 1]

            # Peak must be the highest high in this pole segment
            if peak_high < float(np.max(pole_highs)):
                continue

            min_low_idx_rel = int(np.argmin(pole_lows))
            swing_min_low = float(pole_lows[min_low_idx_rel])
            min_low_idx = pole_start + min_low_idx_rel

            if swing_min_low <= 0:
                continue

            # Minimum +40% explosive rally
            pole_gain = (peak_high - swing_min_low) / swing_min_low
            if pole_gain < min_pole_gain:
                continue

            # Flag Consolidation Lows & Depth
            flag_lows = low[peak_idx + 1 :]
            flag_highs = high[peak_idx + 1 :]
            # Evaluate flag volume dry-up during the pullback days (excluding breakout day if applicable)
            flag_pullback_vols = volume[peak_idx + 1 : -1] if (N - 1 > peak_idx + 1) else volume[peak_idx + 1 :]

            if len(flag_lows) == 0:
                continue

            lowest_low_after_peak = float(np.min(flag_lows))
            flag_correction = (peak_high - lowest_low_after_peak) / peak_high

            # Correction from peak must not exceed 20%
            if flag_correction > max_flag_correction:
                continue

            # Volume Dry-Up: Flag average volume < Pole average volume
            pole_vols = volume[min_low_idx : peak_idx + 1]
            pole_avg_vol = float(np.mean(pole_vols)) if len(pole_vols) > 0 else 1.0
            flag_avg_vol = float(np.mean(flag_pullback_vols)) if len(flag_pullback_vols) > 0 else float(np.mean(volume[peak_idx + 1 :]))

            if flag_avg_vol >= pole_avg_vol:
                continue

            # Select best candidate if multiple flag durations match (prefer highest pole gain)
            if best_setup is None or pole_gain > best_setup["pole_gain"]:
                # The upper pivot / resistance is the consolidation peak high established at the pole top
                flag_pivot = peak_high
                vol_contraction_pct = ((1.0 - (flag_avg_vol / pole_avg_vol)) * 100.0) if pole_avg_vol > 0 else 0.0

                best_setup = {
                    "d": d,
                    "peak_idx": peak_idx,
                    "peak_high": peak_high,
                    "swing_min_low": swing_min_low,
                    "min_low_idx": min_low_idx,
                    "pole_gain": pole_gain,
                    "lowest_low_after_peak": lowest_low_after_peak,
                    "flag_correction": flag_correction,
                    "pole_avg_vol": pole_avg_vol,
                    "flag_avg_vol": flag_avg_vol,
                    "vol_contraction_pct": vol_contraction_pct,
                    "flag_pivot": flag_pivot,
                }

        if best_setup is None:
            return None

        # ----------------------------------------------------------------------
        # 3. Structural Levels, Breakout Extension & Trade Setup Math
        # ----------------------------------------------------------------------
        d = best_setup["d"]
        pole_gain = best_setup["pole_gain"]
        flag_pivot = best_setup["flag_pivot"]
        flag_base_low = best_setup["lowest_low_after_peak"]
        flag_correction = best_setup["flag_correction"]
        vol_contraction_pct = best_setup["vol_contraction_pct"]

        ext_pct = ((cur_close - flag_pivot) / flag_pivot) * 100.0

        # RVOL (Current session relative volume vs 20-day SMA)
        vol_sma20 = float(pd.Series(volume).rolling(20).mean().iloc[-2]) if len(volume) > 20 else float(volume.mean())
        rvol = round(float(volume[-1] / max(vol_sma20, 1.0)), 2)

        rsi_series = self.compute_rsi(s_close, 14)
        rsi_val = float(rsi_series.iloc[-1]) if not pd.isna(rsi_series.iloc[-1]) else 50.0

        # Grade A+ if explosive pole gain >= 50% or volume contraction >= 25%
        is_a_plus = (pole_gain >= 0.50) or (vol_contraction_pct >= 25.0)
        grade = "A+" if is_a_plus else "A"

        # EMA Hierarchy Logic (matching legacy D:\MITS-Scanner)
        ema_dict = {
            "20 EMA": ema20,
            "50 EMA": ema50,
            "100 EMA": ema100,
            "200 EMA": ema200,
        }
        below_cmp_emas = [(name, val) for name, val in sorted(ema_dict.items(), key=lambda x: x[1], reverse=True) if val < cur_close]

        if len(below_cmp_emas) >= 2:
            retest_name, retest_level = below_cmp_emas[0]
            invalidation_name, invalidation_level = below_cmp_emas[1]
        elif len(below_cmp_emas) == 1:
            retest_name, retest_level = below_cmp_emas[0]
            invalidation_name, invalidation_level = "200 EMA", retest_level * 0.95
        else:
            retest_name, retest_level = "20 EMA", cur_close * 0.96
            invalidation_name, invalidation_level = "50 EMA", cur_close * 0.92

        if retest_level >= cur_close:
            retest_level = cur_close * 0.98

        # Structural Invalidation SL: Base Swing Low (lowest low of the flag base)
        sl_val = round(flag_base_low, 2)
        if sl_val >= cur_close:
            sl_val = round(min(retest_level, cur_close * 0.96), 2)

        risk = cur_close - sl_val
        if risk <= 0:
            risk = round(cur_close * 0.02, 2)
            sl_val = round(cur_close - risk, 2)

        t1_mult = float(self.ts_cfg.get("target_1_mult", 1.5))
        t2_mult = float(self.ts_cfg.get("target_2_mult", 2.5))
        t1 = round(cur_close + (risk * t1_mult), 2)
        t2 = round(cur_close + (risk * t2_mult), 2)

        # ----------------------------------------------------------------------
        # 4. Strict Stage Separation: In-Flag Compression vs Active Breakout
        # ----------------------------------------------------------------------
        is_breakout = (cur_close > flag_pivot) or (cur_close >= flag_pivot * 0.998 and rvol >= 1.2 and float(high[-1]) > flag_pivot)

        if is_breakout:
            stage = "BREAKOUT"
            stage_label = "Active Breakouts"
            trigger_status = "FLAG BREAKOUT CONFIRMED"
            status_class = "htf-breakout"
            entry_zone_str = f"₹{flag_pivot:,.2f} - ₹{cur_close:,.2f}"
        else:
            stage = "IN_FLAG"
            stage_label = "Consolidating (In-Flag)"
            status_class = "htf-inflag"
            if cur_close >= flag_pivot * 0.97:
                trigger_status = "READY TO BREAKOUT"
            else:
                trigger_status = "FLAG CONSOLIDATION"
            entry_zone_str = f"₹{cur_close:,.2f} - ₹{flag_pivot:,.2f}"

        # ----------------------------------------------------------------------
        # 5. Composite Scoring (0-100) & Tailored Evidence Tags
        # ----------------------------------------------------------------------
        setup_tags: List[str] = []
        score_breakdown: Dict[str, float] = {}

        # Pole Magnitude Score (Max 35 Pts)
        pole_score = 0.0
        if pole_gain >= 0.60:
            pole_score = 35.0
        elif pole_gain >= 0.50:
            pole_score = 30.0
        elif pole_gain >= 0.40:
            pole_score = 25.0
        score_breakdown["pole_magnitude"] = pole_score

        # Flag Tightness Score (Max 25 Pts)
        flag_score = 0.0
        if flag_correction <= 0.10:
            flag_score = 25.0
        elif flag_correction <= 0.15:
            flag_score = 20.0
        else:
            flag_score = 15.0
        score_breakdown["flag_tightness"] = flag_score

        # Volume Dry-Up Score (Max 25 Pts)
        vol_score = 0.0
        if vol_contraction_pct >= 30.0:
            vol_score = 25.0
        elif vol_contraction_pct >= 20.0:
            vol_score = 20.0
        elif vol_contraction_pct >= 10.0:
            vol_score = 15.0
        else:
            vol_score = 10.0
        score_breakdown["volume_dryup"] = vol_score

        # Trend & Moving Average Stack (Max 15 Pts)
        trend_score = 10.0
        if cur_close > ema20 and ema20 > ema50:
            trend_score = 15.0
        score_breakdown["trend_alignment"] = trend_score

        # Distinct Evidence Tags per Stage
        if stage == "BREAKOUT":
            setup_tags.append("Breakout Confirmed")
            if rvol >= 1.2:
                setup_tags.append("Volume Expansion")
            else:
                setup_tags.append(f"RVOL {rvol}x")
            setup_tags.append(f"Pole Gain +{pole_gain * 100:.0f}%")
            if rsi_val >= 60.0:
                setup_tags.append("RSI Momentum")
            else:
                setup_tags.append("Bullish Trend Stack")
            setup_tags.append(f"R:R 1:{t2_mult}")
        else:
            # IN_FLAG
            setup_tags.append("In-Flag Compression")
            tightness_threshold = 10 if flag_correction <= 0.10 else (15 if flag_correction <= 0.15 else 20)
            setup_tags.append(f"Tightness < {tightness_threshold}%")
            setup_tags.append("Volume Contraction")
            setup_tags.append(f"Pole Gain +{pole_gain * 100:.0f}%")
            setup_tags.append(f"R:R 1:{t2_mult}")

        total_score = min(100, round(sum(score_breakdown.values())))

        current_candle = df.iloc[-1]
        timestamp = current_candle.name.strftime("%Y-%m-%d") if hasattr(current_candle.name, "strftime") else "2026-09-19"

        return {
            "symbol": symbol_meta.get("symbol", ""),
            "name": symbol_meta.get("name", symbol_meta.get("symbol", "")),
            "sector": symbol_meta.get("sector", "NSE"),
            "cmp": cur_close,
            "change_pct": change_pct,
            "score": total_score,
            "grade": grade,
            "score_display": f"{total_score} ({grade})",
            "institutional_score": total_score,
            "stage": stage,
            "stage_label": stage_label,
            "status": trigger_status,
            "status_class": status_class,
            "invalidation": sl_val,
            "entry_zone": entry_zone_str,
            "target_1": t1,
            "target_2": t2,
            "target_zone": f"{t1:,.2f} - {t2:,.2f}",
            "risk_reward_ratio": f"1:{t2_mult}",
            "rvol": rvol,
            "setup_tags": setup_tags,
            "support_level": retest_name,
            "support_ema": round(retest_level, 2),
            "flag_high": round(flag_pivot, 2),
            "flag_pivot": round(flag_pivot, 2),
            "flag_base_low": round(flag_base_low, 2),
            "pole_gain_pct": round(pole_gain * 100.0, 1),
            "flag_days": d,
            "correction_pct": round(flag_correction * 100.0, 1),
            "vol_contraction_pct": round(vol_contraction_pct, 1),
            "rsi": round(rsi_val, 1),
            "timestamp": timestamp,
            "score_breakdown": score_breakdown,
        }
