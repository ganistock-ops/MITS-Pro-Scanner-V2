"""
MITS Pro Institutional Suite V2 - Advanced Stock Scanner 6: Wyckoff Accumulation & Absorption Engine
Strictly isolated standalone quantitative scanner (Slot 6).

Identifies institutional Wyckoff Accumulation, Spring Shakeouts, and Supply Absorption structures:
  1. Range Base Filter: 40 to 90 trading session consolidation band with height strictly between 10% - 35%.
  2. Effort vs Result (VPSR): Absorption near resistance (Range <= 0.8x ATR, Delivery Vol >= 1.4x 20D SMA).
  3. Spring / Shakeout Undercut: Support undercut by 0.2% - 2.5% with intra-day reclaim (Close in upper 35% of candle range) and high delivery.
  4. Sign of Strength (SOS): Decisive expansion thrust through resistance (Range >= 1.0x ATR, Close in upper 35%, Volume >= 1.4x 20D SMA).
  5. 100-Point Composite Scoring across 5 Pillars:
     - Pillar 1: Base Quality & Range Tightness (Max 25 pts)
     - Pillar 2: Effort vs Result & Price-Spread Mechanics (Max 25 pts)
     - Pillar 3: Institutional Delivery & Smart Money Footprint (Max 20 pts)
     - Pillar 4: Structural Phase & Range Positioning (Max 15 pts)
     - Pillar 5: Moving Average Stack & Regime Alignment (Max 15 pts)
  6. Phase Tags: 'Phase C Spring', 'Absorption at Resistance', 'Sign of Strength (SOS)'.
  7. Strict Grading: Grade A+ (>=85), Grade A (>=70), Grade B (>=60). Filters out Grade C (<60).

Output Target: data/adv_scanner_6_wyckoff_absorption.json
"""

import os
import sys
import json
import time
import logging
from pathlib import Path
from datetime import datetime, date
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = BASE_DIR / "scripts"
DATA_DIR = BASE_DIR / "data"
CACHE_DIR = BASE_DIR / "cache"

if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from config import TIMEZONE, SYMBOLS_FILE

logger = logging.getLogger("AdvScannerWyckoffAbsorption")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

ADV_SCANNER_WYCKOFF_OUTPUT = DATA_DIR / "adv_scanner_6_wyckoff_absorption.json"
ADV_SCANNER_RS_OUTPUT = DATA_DIR / "adv_scanner_1_rs.json"


def compute_wyckoff_absorption_metrics(
    symbol_meta: Dict[str, Any],
    stock_df: pd.DataFrame,
    bench_df: Optional[pd.DataFrame] = None,
    bhav_info: Optional[Dict[str, Any]] = None,
    delivery_analytics: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """
    Evaluates a single equity for institutional Wyckoff Accumulation & Absorption criteria:
    - Consolidation band over 40 to 90 trading sessions (Base Height 10% - 35%).
    - Effort vs Result (VPSR) Absorption, Phase C Spring Shakeout, or Sign of Strength (SOS).
    - 100-Point Composite Scoring across 5 pillars.
    """
    if stock_df is None or len(stock_df) < 45:
        return None

    try:
        sym = symbol_meta.get("symbol", "")
        name = symbol_meta.get("name", sym)
        sector = symbol_meta.get("sector", "Unknown")

        # Standardize stock DataFrame
        sdf = stock_df.copy()
        if "Date" in sdf.columns:
            sdf["Date"] = pd.to_datetime(sdf["Date"]).dt.date
            sdf = sdf.sort_values("Date").drop_duplicates(subset=["Date"])
            sdf = sdf.set_index("Date")
        elif not isinstance(sdf.index, pd.DatetimeIndex):
            sdf.index = pd.to_datetime(sdf.index).date

        cols = {c.lower(): c for c in sdf.columns}
        c_close = cols.get("close", "Close")
        c_high = cols.get("high", "High")
        c_low = cols.get("low", "Low")
        c_vol = cols.get("volume", "Volume")

        close_s = pd.to_numeric(sdf[c_close], errors="coerce").ffill()
        high_s = pd.to_numeric(sdf[c_high], errors="coerce").ffill()
        low_s = pd.to_numeric(sdf[c_low], errors="coerce").ffill()
        vol_s = pd.to_numeric(sdf[c_vol], errors="coerce").fillna(0.0)

        # Synchronize latest session with bhav_info if provided
        if bhav_info and bhav_info.get("close"):
            b_close = float(bhav_info["close"])
            if b_close > 0:
                close_s.iloc[-1] = b_close
                if bhav_info.get("high") and float(bhav_info["high"]) > 0:
                    high_s.iloc[-1] = max(float(high_s.iloc[-1]), float(bhav_info["high"]))
                else:
                    high_s.iloc[-1] = max(float(high_s.iloc[-1]), b_close)

                if bhav_info.get("low") and float(bhav_info["low"]) > 0:
                    low_s.iloc[-1] = min(float(low_s.iloc[-1]), float(bhav_info["low"]))
                else:
                    low_s.iloc[-1] = min(float(low_s.iloc[-1]), b_close)

                if bhav_info.get("volume") and float(bhav_info["volume"]) > 0:
                    vol_s.iloc[-1] = float(bhav_info["volume"])

        closes = close_s.values.astype(float)
        highs = high_s.values.astype(float)
        lows = low_s.values.astype(float)
        vols = vol_s.values.astype(float)
        total_sessions = len(closes)
        if total_sessions < 45:
            return None

        cur_close = float(closes[-1])
        cur_high = float(highs[-1])
        cur_low = float(lows[-1])
        cur_vol = float(vols[-1])
        cur_range = max(cur_high - cur_low, 0.001)

        # 1-day change %
        if bhav_info and bhav_info.get("prev_close") and float(bhav_info["prev_close"]) > 0:
            prev_close = float(bhav_info["prev_close"])
            day_chg_pct = round(((cur_close - prev_close) / prev_close) * 100.0, 2)
        elif bhav_info and bhav_info.get("change_pct") is not None:
            day_chg_pct = round(float(bhav_info["change_pct"]), 2)
        else:
            prev_close = float(closes[-2]) if total_sessions >= 2 else cur_close
            day_chg_pct = round(((cur_close - prev_close) / prev_close) * 100.0, 2) if prev_close > 0 else 0.0

        # Calculate 14-period True Range and Wilder's Smoothing ATR
        tr = np.maximum(
            highs[1:] - lows[1:],
            np.maximum(
                np.abs(highs[1:] - closes[:-1]),
                np.abs(lows[1:] - closes[:-1])
            )
        )
        atr14 = np.zeros(total_sessions)
        atr14[14] = np.mean(tr[:14]) if len(tr) >= 14 else (tr[0] if len(tr) > 0 else 1.0)
        for i in range(15, total_sessions):
            atr14[i] = (atr14[i - 1] * 13.0 + tr[i - 1]) / 14.0
        atr14[:14] = atr14[14]
        cur_atr = float(atr14[-1]) if atr14[-1] > 0 else 1.0

        range_atr_ratio = round(cur_range / cur_atr, 2)
        close_in_candle = (cur_close - cur_low) / cur_range

        # 20-Day SMA Volume & Volume Ratio
        vol_sma_20 = float(np.mean(vols[-20:])) if total_sessions >= 20 else float(np.mean(vols))
        vol_ratio = round(cur_vol / vol_sma_20, 2) if vol_sma_20 > 0 else 1.0
        if bhav_info and bhav_info.get("vol_ratio"):
            vol_ratio = max(vol_ratio, round(float(bhav_info["vol_ratio"]), 2))

        # Delivery metrics
        deliv_pct = 0.0
        if delivery_analytics and delivery_analytics.get("delivery_pct") is not None:
            deliv_pct = float(delivery_analytics["delivery_pct"])
        elif bhav_info:
            deliv_pct = float(bhav_info.get("deliv_per") or bhav_info.get("delivery_pct", 0.0))

        deliv_qty = 0.0
        if delivery_analytics and delivery_analytics.get("delivery_qty") is not None:
            deliv_qty = float(delivery_analytics["delivery_qty"])
        elif bhav_info and bhav_info.get("deliv_qty"):
            deliv_qty = float(bhav_info["deliv_qty"])
        else:
            deliv_qty = cur_vol * (deliv_pct / 100.0) if deliv_pct > 0 else 0.0

        avg_deliv_vol_10d = float(delivery_analytics.get("avg_deliv_vol_10d", 0.0)) if delivery_analytics else (vol_sma_20 * (deliv_pct / 100.0) if deliv_pct > 0 else 0.0)
        deliv_spike = float(delivery_analytics.get("delivery_spike_pct", 0.0)) if delivery_analytics else 0.0

        deliv_ratio = round(deliv_qty / avg_deliv_vol_10d, 2) if avg_deliv_vol_10d > 0 else None

        # Moving Averages
        ema_20 = float(close_s.ewm(span=20, adjust=False).mean().iloc[-1])
        ema_50 = float(close_s.ewm(span=50, adjust=False).mean().iloc[-1])
        ema_200 = float(close_s.ewm(span=200, adjust=False).mean().iloc[-1]) if total_sessions >= 150 else None

        # 52-Week High & Distance
        lookback_52w = min(252, total_sessions)
        high_52w = float(np.max(highs[-lookback_52w:]))
        dist_52w = round(((cur_close - high_52w) / high_52w) * 100.0, 1)

        # Relative Strength 20D if available from RS output
        rs_20d = float(bhav_info.get("rs_20d", 0.0)) if bhav_info and "rs_20d" in bhav_info else None

        best_candidate = None
        best_score = -1

        # Evaluate consolidation base windows from 40 to 90 trading sessions
        # (Scanning step by 5 sessions to find optimal institutional Wyckoff structure)
        max_lookback = min(95, total_sessions)
        for L in range(40, max_lookback, 5):
            base_highs = highs[-L:]
            base_lows = lows[-L:]
            base_res = float(np.max(base_highs))
            base_sup = float(np.min(base_lows))

            if base_sup <= 0 or base_res <= base_sup:
                continue

            base_height = ((base_res - base_sup) / base_sup) * 100.0

            # 1. Range Base Filter: Height strictly between 10% and 35%
            if not (10.0 <= base_height <= 35.0):
                continue

            dist_res_pct = ((base_res - cur_close) / base_res) * 100.0
            dist_sup_pct = ((cur_close - base_sup) / base_sup) * 100.0
            range_pos_pct = ((cur_close - base_sup) / (base_res - base_sup)) * 100.0

            # -------------------------------------------------------------
            # SETUP 1: Effort vs Result (VPSR) - Absorption near Resistance
            # -------------------------------------------------------------
            # Criteria:
            # - Range <= 0.8x ATR (tight compression / supply absorption)
            # - Delivery Vol >= 1.4x 20D SMA (institutional effort without price rejection)
            # - Near resistance: within 5.0% of Base High (range position >= 65%)
            is_abs_res = False
            if dist_res_pct <= 5.0 and range_pos_pct >= 65.0:
                has_tight_spread = (range_atr_ratio <= 0.80) or (
                    # 2-session average range <= 0.80x ATR
                    total_sessions >= 2 and (
                        ((highs[-1] - lows[-1]) + (highs[-2] - lows[-2])) / (2.0 * cur_atr) <= 0.80
                    )
                )
                has_high_effort = (
                    (deliv_ratio is not None and deliv_ratio >= 1.40) or
                    (vol_ratio >= 1.40 and deliv_pct >= 35.0) or
                    (vol_ratio >= 1.40) or
                    (vol_ratio >= 1.25 and deliv_pct >= 45.0)
                )
                if has_tight_spread and has_high_effort:
                    is_abs_res = True

            # -------------------------------------------------------------
            # SETUP 2: Spring / Shakeout Undercut
            # -------------------------------------------------------------
            # Criteria:
            # - Support undercut by 0.2% - 2.5%
            # - Intra-day reclaim: Close in upper 35% of candle range ((Close - Low) / Range >= 0.65)
            #   and Close >= Prior Support * 0.995
            # - High delivery / volume on the spring or reclaim bar
            is_spring = False
            spring_undercut = 0.0
            spring_day_pos = 0.0
            spring_day_offset = 0

            # Evaluate recent 1 to 4 sessions for spring shakeout undercut
            for look_back in range(0, 4):
                idx = -1 - look_back
                if abs(idx) >= L - 10:
                    continue

                d_low = float(lows[idx])
                d_high = float(highs[idx])
                d_close = float(closes[idx])
                d_vol = float(vols[idx])
                d_range = max(d_high - d_low, 0.001)

                # Prior support before this day (minimum low established in base up to idx-1)
                prior_lows = lows[-L : idx]
                if len(prior_lows) < 15:
                    continue
                p_sup = float(np.min(prior_lows))

                if d_low < p_sup:
                    undercut_pct = ((p_sup - d_low) / p_sup) * 100.0
                    # Undercut window: 0.2% to 2.5%
                    if 0.20 <= undercut_pct <= 2.50:
                        d_pos = (d_close - d_low) / d_range
                        # Intra-day reclaim: Close in upper 35% of candle range & close >= prior support
                        if d_close >= (p_sup * 0.995) and d_pos >= 0.65:
                            # Delivery / volume confirmation
                            d_vol_ratio = d_vol / vol_sma_20 if vol_sma_20 > 0 else 1.0
                            if d_vol_ratio >= 1.10 or deliv_pct >= 35.0 or (deliv_ratio and deliv_ratio >= 1.20):
                                # Current price must be holding the reclaim (not breaking down)
                                if cur_close >= d_low and cur_close >= (p_sup * 0.990):
                                    is_spring = True
                                    spring_undercut = undercut_pct
                                    spring_day_pos = d_pos
                                    spring_day_offset = look_back
                                    break

            # -------------------------------------------------------------
            # SETUP 3: Sign of Strength (SOS)
            # -------------------------------------------------------------
            # Criteria:
            # - Decisive price-spread expansion out of base through resistance
            # - Distance to resistance <= 1.5% or Breakout above resistance (CMP >= Base_Res * 0.985)
            # - Wide candle range: Range >= 1.0x ATR
            # - Close in upper 35% of candle range ((Close - Low) / Range >= 0.65)
            # - Volume surge: Volume >= 1.4x 20D SMA with solid delivery
            is_sos = False
            if (cur_close >= base_res * 0.985 or dist_res_pct <= 1.5):
                has_wide_spread = (range_atr_ratio >= 1.0) and (close_in_candle >= 0.65)
                has_volume_surge = (
                    vol_ratio >= 1.40 or
                    (vol_ratio >= 1.25 and deliv_pct >= 35.0) or
                    (deliv_ratio is not None and deliv_ratio >= 1.40)
                )
                if has_wide_spread and has_volume_surge:
                    is_sos = True

            # If none of the 3 Wyckoff setups matched this window, continue
            if not (is_abs_res or is_spring or is_sos):
                continue

            # Prioritize setup classification
            if is_abs_res:
                phase_tag = "Absorption at Resistance"
                phase_badge = "ABSORPTION"
            elif is_spring:
                phase_tag = "Phase C Spring"
                phase_badge = "SPRING"
            else:
                phase_tag = "Sign of Strength (SOS)"
                phase_badge = "SOS"

            # =============================================================
            # 100-POINT COMPOSITE WYCKOFF SCORING MODEL
            # =============================================================

            # Pillar 1: Base Quality & Range Tightness (Max 25 pts)
            # Duration (Max 12 pts): 60-90 sessions (12 pts), 50-59 sessions (10 pts), 40-49 sessions (8 pts)
            pts_dur = 12 if L >= 60 else (10 if L >= 50 else 8)
            # Tightness (Max 13 pts): 10-18% (13 pts), 18-25% (10 pts), 25-32% (7 pts), 32-35% (4 pts)
            if base_height <= 18.0:
                pts_hgt = 13
            elif base_height <= 25.0:
                pts_hgt = 10
            elif base_height <= 32.0:
                pts_hgt = 7
            else:
                pts_hgt = 4
            p1_base = pts_dur + pts_hgt

            # Pillar 2: Effort vs Result & Price-Spread Mechanics (Max 25 pts)
            if is_abs_res:
                # Spread compression (Max 13 pts)
                pts_rng = 13 if range_atr_ratio <= 0.60 else (11 if range_atr_ratio <= 0.75 else 9)
                # Volume effort (Max 12 pts)
                pts_eff = 12 if vol_ratio >= 2.0 else (10 if vol_ratio >= 1.6 else (8 if vol_ratio >= 1.4 else 6))
                p2_vpsr = pts_rng + pts_eff
            elif is_spring:
                # Undercut precision (Max 13 pts)
                pts_uc = 13 if (0.50 <= spring_undercut <= 1.80) else 10
                # Reclaim tail quality (Max 12 pts)
                pts_rec = 12 if spring_day_pos >= 0.80 else 10
                p2_vpsr = pts_uc + pts_rec
            else:  # SOS
                # Expansion spread (Max 13 pts)
                pts_exp = 13 if (range_atr_ratio >= 1.50 and close_in_candle >= 0.80) else (11 if range_atr_ratio >= 1.20 else 8)
                # Demand volume (Max 12 pts)
                pts_vol = 12 if vol_ratio >= 2.0 else (10 if vol_ratio >= 1.6 else (8 if vol_ratio >= 1.4 else 6))
                p2_vpsr = pts_exp + pts_vol

            # Pillar 3: Institutional Delivery & Smart Money Footprint (Max 20 pts)
            # Delivery Percentage (Max 10 pts)
            if deliv_pct >= 60.0:
                pts_deliv = 10
            elif deliv_pct >= 50.0:
                pts_deliv = 8
            elif deliv_pct >= 40.0:
                pts_deliv = 6
            elif deliv_pct >= 30.0:
                pts_deliv = 4
            else:
                pts_deliv = 2

            # Delivery Spike / Volume Ratio Surge (Max 10 pts)
            if deliv_spike >= 30.0 or vol_ratio >= 2.20:
                pts_surge = 10
            elif deliv_spike >= 15.0 or vol_ratio >= 1.60:
                pts_surge = 8
            elif deliv_spike > 0.0 or vol_ratio >= 1.30:
                pts_surge = 6
            elif vol_ratio >= 1.0:
                pts_surge = 4
            else:
                pts_surge = 2
            p3_delivery = pts_deliv + pts_surge

            # Pillar 4: Structural Phase & Range Positioning (Max 15 pts)
            if is_abs_res:
                p4_position = 15 if dist_res_pct <= 1.5 else (12 if dist_res_pct <= 3.0 else 9)
            elif is_spring:
                p4_position = 15 if cur_close >= base_sup else 11
            else:  # SOS
                p4_position = 15 if cur_close >= base_res else 12

            # Pillar 5: Moving Average Stack & Regime Alignment (Max 15 pts)
            p5_ma = 0
            # CMP vs 20 & 50 EMA (Max 7 pts)
            if cur_close > ema_20 and cur_close > ema_50:
                p5_ma += 7
            elif cur_close > ema_20:
                p5_ma += 4
            elif cur_close > ema_50:
                p5_ma += 3

            # EMA 20 vs 50 Alignment (Max 5 pts)
            if ema_20 > ema_50:
                p5_ma += 5
            else:
                p5_ma += 2

            # Macro Bull Regime vs 200 EMA (Max 3 pts)
            if ema_200 and cur_close > ema_200:
                p5_ma += 3
            else:
                p5_ma += 2

            total_score = p1_base + p2_vpsr + p3_delivery + p4_position + p5_ma
            total_score = min(100, max(0, total_score))

            # Grading Model: A+ (>=85), A (>=70), B (>=60), C (<60)
            if total_score >= 85:
                grade = "A+"
            elif total_score >= 70:
                grade = "A"
            elif total_score >= 60:
                grade = "B"
            else:
                grade = "C"

            # Track highest conviction base representation
            if total_score > best_score:
                best_score = total_score

                # Detailed description of Effort vs Result
                if is_abs_res:
                    evr_desc = f"Absorption at Resistance: Compressed Spread ({range_atr_ratio:.2f}x ATR) on Heavy Volume ({vol_ratio:.2f}x 20D SMA)"
                    vol_status = "High Institutional Supply Absorption"
                elif is_spring:
                    evr_desc = f"Phase C Spring: {spring_undercut:.1f}% Support Undercut with Intra-Day Reclaim ({spring_day_pos*100:.0f}% Upper Candle)"
                    vol_status = "Shakeout Liquidity Absorption"
                else:
                    evr_desc = f"Sign of Strength: Breakout Thrust ({range_atr_ratio:.2f}x ATR) with Demand Surge ({vol_ratio:.2f}x 20D SMA)"
                    vol_status = "Dominant Markup Demand Thrust"

                sym_str = str(sym).strip()
                tradingview_url = f"https://in.tradingview.com/chart/?symbol=NSE:{sym_str}"

                # Key levels dossier
                support_dist_str = f"-{dist_sup_pct:.1f}% below"
                resistance_dist_str = f"+{dist_res_pct:.1f}% to pivot" if dist_res_pct >= 0 else f"+{abs(dist_res_pct):.1f}% above pivot"

                dossier = {
                    "symbol": sym_str,
                    "name": name,
                    "sector": sector,
                    "stage": f"Wyckoff {phase_tag}",
                    "stage_badge": phase_badge,
                    "stage_color": "bullish",
                    "stage_desc": f"Wyckoff Accumulation & Absorption: {phase_tag} ({L}D Base, {base_height:.1f}% Range)",
                    "trend_stack": bool(cur_close > ema_20 and ema_20 > ema_50),
                    "trend_stack_status": f"{phase_badge} ({int(total_score)}/100)",
                    "trend_stack_badge": f"WYCKOFF {grade}",
                    "ema_20": round(ema_20, 2),
                    "ema_50": round(ema_50, 2),
                    "ema_200": round(ema_200, 2) if ema_200 else None,
                    "key_levels": {
                        "support": round(base_sup, 2),
                        "support_label": "Wyckoff Trading Range Support (Base Low)",
                        "support_dist": support_dist_str,
                        "resistance": round(base_res, 2),
                        "resistance_label": "Wyckoff Resistance (Supply Absorption Pivot)",
                        "resistance_dist": resistance_dist_str,
                        "high_52w": round(high_52w, 2),
                        "dist_52w": f"{dist_52w:.1f}% from 52W High"
                    },
                    "volume_footprint": {
                        "volume_multiple": round(vol_ratio, 2),
                        "volume_desc": f"{vol_ratio:.2f}x 20D SMA Volume",
                        "delivery_status": vol_status,
                        "delivery_pct": round(deliv_pct, 1) if deliv_pct > 0 else None
                    },
                    "rs_profile": {
                        "rs_20d": round(rs_20d, 2) if rs_20d is not None else None
                    },
                    "support": round(base_sup, 2),
                    "support_label": "Wyckoff Trading Range Support (Base Low)",
                    "support_dist": support_dist_str,
                    "resistance": round(base_res, 2),
                    "resistance_label": "Wyckoff Resistance (Supply Absorption Pivot)",
                    "resistance_dist": resistance_dist_str,
                    "high_52w": round(high_52w, 2),
                    "dist_52w": f"{dist_52w:.1f}% from 52W High",
                    "tradingview_url": tradingview_url
                }

                best_candidate = {
                    "symbol": sym_str,
                    "name": name,
                    "company_name": name,
                    "sector": sector,
                    "cmp": round(cur_close, 2),
                    "ltp": round(cur_close, 2),
                    "change_pct": round(day_chg_pct, 2),
                    "score": int(total_score),
                    "wyckoff_score": int(total_score),
                    "grade": grade,
                    "phase": phase_tag,
                    "phase_tag": phase_tag,
                    "phase_badge": phase_badge,
                    "base_days": int(L),
                    "base_height_pct": round(base_height, 1),
                    "resistance": round(base_res, 2),
                    "support": round(base_sup, 2),
                    "dist_to_resistance_pct": round(dist_res_pct, 1),
                    "dist_to_support_pct": round(dist_sup_pct, 1),
                    "range_position_pct": round(range_pos_pct, 1),
                    "range_atr_ratio": round(range_atr_ratio, 2),
                    "effort_vs_result": evr_desc,
                    "volume_ratio": round(vol_ratio, 2),
                    "delivery_pct": round(deliv_pct, 1) if deliv_pct > 0 else None,
                    "deliv_ratio": round(deliv_ratio, 2) if deliv_ratio else None,
                    "vol_status": vol_status,
                    "vol_badge": "ACCUMULATION" if is_abs_res else ("SHAKEOUT" if is_spring else "EXPANSION"),
                    "ema_20": round(ema_20, 2),
                    "ema_50": round(ema_50, 2),
                    "ema_200": round(ema_200, 2) if ema_200 else None,
                    "score_breakdown": {
                        "base_quality": int(p1_base),
                        "effort_vs_result": int(p2_vpsr),
                        "delivery_footprint": int(p3_delivery),
                        "phase_position": int(p4_position),
                        "trend_stack": int(p5_ma)
                    },
                    "s1": round(base_sup, 2),
                    "r1": round(base_res, 2),
                    "support_label": "Wyckoff Trading Range Support (Base Low)",
                    "resistance_label": "Wyckoff Resistance (Supply Absorption Pivot)",
                    "tradingview_url": tradingview_url,
                    "dossier": dossier
                }

        return best_candidate

    except Exception as e:
        logger.debug(f"Error computing Wyckoff Absorption metrics for {symbol_meta.get('symbol')}: {e}")
        return None


def generate_adv_scanner_wyckoff_absorption(
    symbols: Optional[List[Dict[str, Any]]] = None,
    stock_dfs: Optional[Dict[str, pd.DataFrame]] = None,
    bhav_date: Optional[date] = None,
    bhav_map: Optional[Dict[str, Dict[str, Any]]] = None,
    delivery_analytics_map: Optional[Dict[str, Dict[str, Any]]] = None,
    n_df: Optional[pd.DataFrame] = None
) -> Dict[str, Any]:
    """
    Main quantitative generator for Advanced Stock Scanner Slot 6: Wyckoff Absorption Engine.
    Evaluates full equity universe, applying Wyckoff accumulation rules and exporting qualifying
    candidates (Grade A+, A, B with Score >= 60) to data/adv_scanner_6_wyckoff_absorption.json.
    """
    t_start = time.time()
    logger.info("Initializing Advanced Stock Scanner 6: Wyckoff Accumulation & Absorption Scanner...")

    # 1. Load universe symbols
    if symbols is None:
        if SYMBOLS_FILE.exists():
            with open(SYMBOLS_FILE, "r", encoding="utf-8") as f:
                sym_data = json.load(f)
                symbols = sym_data.get("symbols", [])
        else:
            symbols = []

    # 2. Benchmark data (optional)
    bench_df = n_df
    if bench_df is None or bench_df.empty:
        bench_parquet = CACHE_DIR / "benchmark.parquet"
        if bench_parquet.exists():
            try:
                bench_df = pd.read_parquet(bench_parquet)
                logger.info(f"Loaded benchmark from {bench_parquet} ({len(bench_df)} sessions).")
            except Exception as e:
                logger.warning(f"Error loading benchmark parquet: {e}")

    # 3. Stock historical OHLCV data from cache/market_ohlcv.parquet
    if stock_dfs is None:
        stock_dfs = {}
        ohlcv_parquet = CACHE_DIR / "market_ohlcv.parquet"
        if ohlcv_parquet.exists():
            logger.info(f"Reading historical market data from {ohlcv_parquet}...")
            full_ohlcv = pd.read_parquet(ohlcv_parquet)
            sym_col = "Symbol" if "Symbol" in full_ohlcv.columns else "symbol"
            for sym, group in full_ohlcv.groupby(sym_col):
                stock_dfs[str(sym)] = group.sort_values("Date")
            logger.info(f"Loaded {len(stock_dfs)} stock DataFrames from {ohlcv_parquet.name}.")
        else:
            logger.error(f"Required parquet cache not found: {ohlcv_parquet}")

    # 4. Standalone Bhavcopy & delivery loading if not passed
    if bhav_map is None:
        bhav_map = {}
        # Synchronize from latest Relative Strength EOD feed
        if ADV_SCANNER_RS_OUTPUT.exists():
            try:
                with open(ADV_SCANNER_RS_OUTPUT, "r", encoding="utf-8") as f:
                    rs_feed = json.load(f)
                for s in rs_feed.get("stocks", []):
                    sym_key = s.get("symbol")
                    if sym_key:
                        bhav_map[sym_key] = {
                            "close": float(s.get("cmp", 0.0)),
                            "prev_close": float(s.get("cmp", 0.0) / (1.0 + (s.get("change_pct", 0.0) / 100.0))) if s.get("change_pct") is not None else float(s.get("cmp", 0.0)),
                            "change_pct": float(s.get("change_pct", 0.0)),
                            "delivery_pct": float(s.get("delivery_pct", 0.0)) if s.get("delivery_pct") is not None else 0.0,
                            "vol_ratio": float(s.get("vol_ratio", 1.0)) if s.get("vol_ratio") is not None else 1.0,
                            "vol_20d_avg": float(s.get("vol_20d_avg", 0.0)) if s.get("vol_20d_avg") is not None else 0.0,
                            "rs_20d": float(s.get("rs_20d", 0.0)) if s.get("rs_20d") is not None else 0.0
                        }
                if not bhav_date and rs_feed.get("scan_date"):
                    try:
                        bhav_date = datetime.strptime(rs_feed.get("scan_date"), "%Y-%m-%d").date()
                    except Exception:
                        pass
                logger.info(f"Synchronized {len(bhav_map)} stocks from latest RS feed ({ADV_SCANNER_RS_OUTPUT.name}).")
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
                        deliv_pers = pd.to_numeric(bhav_df.get("DELIV_PER", 0.0), errors="coerce").fillna(0.0).values
                        deliv_qtys = pd.to_numeric(bhav_df.get("DELIV_QTY", 0.0), errors="coerce").fillna(0.0).values
                        for i, s_name in enumerate(symbols_arr):
                            bhav_map[s_name] = {
                                "close": float(closes[i]),
                                "prev_close": float(prevs[i]),
                                "volume": float(vols[i]),
                                "delivery_pct": float(deliv_pers[i]),
                                "deliv_qty": float(deliv_qtys[i])
                            }
                    logger.info(f"Loaded fallback delivery Bhavcopy from {all_cached[0].name} ({len(bhav_map)} symbols).")
                except Exception as e:
                    logger.warning(f"Error reading Bhavcopy cache: {e}")

    # Fallback scan_date if still None
    if not bhav_date:
        # Check max date from parquet
        for df_sample in stock_dfs.values():
            if "Date" in df_sample.columns:
                max_d = pd.to_datetime(df_sample["Date"]).max()
                bhav_date = max_d.date()
                break

    # 5. Evaluate all stocks across universe
    records: List[Dict[str, Any]] = []
    evaluated_count = 0

    for item in symbols:
        sym = item.get("symbol", "")
        df = stock_dfs.get(sym)
        if df is None or df.empty:
            continue

        evaluated_count += 1
        b_info = bhav_map.get(sym) if bhav_map else None
        d_analytics = delivery_analytics_map.get(sym) if delivery_analytics_map else None

        res = compute_wyckoff_absorption_metrics(item, df, bench_df, b_info, d_analytics)
        # Filter: strictly exclude Grade C candidates (Score < 60)
        if res and res.get("score", 0) >= 60:
            records.append(res)

    # 6. Sort descending by score (primary) and lowest distance to resistance (secondary)
    records.sort(key=lambda x: (x["score"], -abs(x["dist_to_resistance_pct"])), reverse=True)

    # Assign Rank 1 to N
    for idx, r in enumerate(records):
        r["rank"] = idx + 1

    # Count breakdown by phase tag
    phase_counts = {
        "Absorption at Resistance": sum(1 for r in records if r.get("phase_tag") == "Absorption at Resistance"),
        "Phase C Spring": sum(1 for r in records if r.get("phase_tag") == "Phase C Spring"),
        "Sign of Strength (SOS)": sum(1 for r in records if r.get("phase_tag") == "Sign of Strength (SOS)")
    }

    # Count breakdown by grade
    grade_counts = {
        "A+": sum(1 for r in records if r.get("grade") == "A+"),
        "A": sum(1 for r in records if r.get("grade") == "A"),
        "B": sum(1 for r in records if r.get("grade") == "B")
    }

    # 7. Generate structured JSON payload
    scan_dt = bhav_date.strftime("%Y-%m-%d") if bhav_date else datetime.now().strftime("%Y-%m-%d")
    payload = {
        "scan_date": scan_dt,
        "generated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S IST"),
        "total_stocks": len(records),
        "total_evaluated": evaluated_count,
        "phase_counts": phase_counts,
        "grade_counts": grade_counts,
        "stocks": records
    }

    # Export results to data/adv_scanner_6_wyckoff_absorption.json
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(ADV_SCANNER_WYCKOFF_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    elapsed = time.time() - t_start
    logger.info(
        f"Generated {ADV_SCANNER_WYCKOFF_OUTPUT.name} in {elapsed:.2f}s! "
        f"Evaluated: {evaluated_count}, Qualified: {len(records)} "
        f"(A+: {grade_counts['A+']}, A: {grade_counts['A']}, B: {grade_counts['B']}). "
        f"Phases: {phase_counts}."
    )
    return payload


if __name__ == "__main__":
    t0 = time.time()
    payload = generate_adv_scanner_wyckoff_absorption()
    elapsed = time.time() - t0

    print("\n" + "=" * 90)
    print("MITS ADVANCED STOCK SCANNER 6: WYCKOFF ACCUMULATION & ABSORPTION ENGINE")
    print(f"Scan Date: {payload.get('scan_date', 'N/A')} | Execution Time: {elapsed:.2f}s")
    print(f"Total Evaluated: {payload.get('total_evaluated', 0)} Stocks")
    print(f"Total Qualified (Score >= 60): {payload.get('total_stocks', 0)} Stocks")
    print(f"Phase Breakdown: {payload.get('phase_counts', {})}")
    print(f"Grade Breakdown: {payload.get('grade_counts', {})}")
    print(f"Output Target: {ADV_SCANNER_WYCKOFF_OUTPUT}")
    print("-" * 90)
    print("TOP 10 WYCKOFF ACCUMULATION & ABSORPTION CANDIDATES:")
    print(f"{'Rank':<5} {'Symbol':<12} {'LTP (Rs)':<10} {'Score':<8} {'Phase Tag':<26} {'Base':<8} {'Range %':<9} {'VolRatio':<9} {'Deliv %':<9}")
    print("-" * 90)
    for stock in payload.get("stocks", [])[:10]:
        deliv_str = f"{stock['delivery_pct']}%" if stock.get('delivery_pct') is not None else "N/A"
        print(
            f"#{stock['rank']:<4} {stock['symbol']:<12} "
            f"Rs.{stock['ltp']:<7.2f} "
            f"{stock['score']:<3} ({stock['grade']:<2})  "
            f"{stock['phase_tag']:<26} "
            f"{stock['base_days']:<2}d     "
            f"{stock['base_height_pct']:<5.1f}%   "
            f"{stock['volume_ratio']:<4.2f}x    "
            f"{deliv_str:<9}"
        )
    print("=" * 90 + "\n")

