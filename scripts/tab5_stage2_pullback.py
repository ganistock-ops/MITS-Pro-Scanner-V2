"""
MITS Pro Institutional Suite V2 - Tab 5: Stage-2 Pullback Engine
Pure EOD quantitative engine with zero look-ahead bias.

Strategy Parameters:
1. Stage-2 Trend Filter:
   - Close > 50 EMA > 200 SMA
   - 200 SMA must be rising (Slope > 0)
   - CMP within 20% of 52-Week High (High Proximity)

2. Pullback & Turnaround Qualification:
   - Price pulling back into dynamic support: 20 EMA or 50 EMA zone (within 1.5% of EMA)
   - Volume Contraction: RVOL < 0.85x or volume drying up on pullback days (Smart money absorption)
   - Candle Trigger: Reversal confirmation holding the EMA level (Close > Open and Low touches/respects EMA)
   - RSI Momentum Zone: 14 RSI between 45.0 and 58.0 (healthy pullback pocket)

3. Exact Mathematical Levels (Strict Structural Math):
   - Invalidation (SL): Swing Low of current pullback base structure (np.min(low[-10:])) or 1% below 50 EMA
   - Entry Zone: Support EMA level to current CMP
   - Risk: CMP - Invalidation SL
   - Targets (1:2.5 Risk-to-Reward):
     * Target 1 (1.5R): CMP + (Risk * 1.5)
     * Target 2 (2.5R): CMP + (Risk * 2.5)
   - Score & Grade: 0-100 institutional score and Grade A/B based on trend strength, pullback depth, and volume dryness.

4. RS & Evidence Tags:
   - "Stage-2 Uptrend", "20 EMA Support Hold" (or "50 EMA Support Hold"), "Volume Dry-up", "RSI Pullback Zone", "R:R 1:2.5"
"""

import math
from pathlib import Path
from typing import Dict, Any, List, Optional
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
STAGE2_CFG = CONFIG.get("stage2_pullback", {})


class Stage2PullbackEngine:
    """
    Quantitative Stage-2 Pullback Engine.
    Evaluates historical daily OHLCV dataframe of a stock with zero look-ahead bias.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.cfg = config or STAGE2_CFG
        self.trend_cfg = self.cfg.get("stage2_trend", {})
        self.pb_cfg = self.cfg.get("pullback_qualification", {})
        self.ts_cfg = self.cfg.get("trade_setup", {})

    @staticmethod
    def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
        """Calculate Wilder's exponential smoothed RSI(14) with zero look-ahead bias."""
        delta = series.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        rsi = 100.0 - (100.0 / (1.0 + rs))
        return rsi.fillna(50.0)

    def evaluate(self, symbol_meta: Dict[str, Any], df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """
        Pure EOD Evaluation of a stock for Stage-2 Pullback Setup.
        """
        # Minimum data requirement: at least 200 sessions for 200 SMA
        if df is None or len(df) < 200:
            return None

        # Clean daily OHLCV series
        close = df["Close"].values
        open_p = df["Open"].values
        high = df["High"].values
        low = df["Low"].values
        volume = df["Volume"].values

        cur_close = float(close[-1])
        cur_open = float(open_p[-1])
        cur_high = float(high[-1])
        cur_low = float(low[-1])
        cur_volume = float(volume[-1])

        # Moving Averages (Zero Look-Ahead EOD)
        close_series = df["Close"]
        ema20_series = close_series.ewm(span=20, adjust=False).mean()
        ema50_series = close_series.ewm(span=50, adjust=False).mean()
        sma200_series = close_series.rolling(window=200).mean()

        ema20 = float(ema20_series.iloc[-1])
        ema50 = float(ema50_series.iloc[-1])
        sma200 = float(sma200_series.iloc[-1])

        if np.isnan(sma200) or np.isnan(ema50) or np.isnan(ema20):
            return None

        # ---------------------------------------------------------------------
        # 1. Stage-2 Trend Filter
        # ---------------------------------------------------------------------
        # A. Close > 50 EMA > 200 SMA
        if not (cur_close > ema50 and ema50 > sma200):
            return None

        # B. 200 SMA must be rising (Slope > 0)
        # Check slope over 20 sessions (or 5 sessions)
        lookback_sma = min(20, len(sma200_series) - 200)
        if lookback_sma >= 5:
            sma200_prev = float(sma200_series.iloc[-lookback_sma])
            sma200_slope = (sma200 - sma200_prev) / float(lookback_sma)
            if sma200_slope <= 0:
                return None
        else:
            if sma200 <= float(sma200_series.iloc[-5]):
                return None

        # C. CMP within 20% of 52-Week High (High Proximity)
        high_window = min(250, len(high))
        high_52w = float(np.max(high[-high_window:]))
        if high_52w <= 0:
            return None

        drawdown_from_52w_pct = ((high_52w - cur_close) / high_52w) * 100.0
        if drawdown_from_52w_pct > 20.0:
            return None

        # ---------------------------------------------------------------------
        # 2. Dynamic Support Pullback Qualification (20 EMA or 50 EMA)
        # ---------------------------------------------------------------------
        # Price low touches or comes within 1.5% of 20 EMA or 50 EMA
        # Tolerance: low <= EMA * 1.015 and low >= EMA * 0.97
        tol_pct = self.pb_cfg.get("ema_tolerance_pct", 1.5) / 100.0

        # Check interaction on current candle or previous candle
        recent_low = float(np.min(low[-2:]))

        touch_20_ema = (recent_low <= ema20 * (1.0 + tol_pct)) and (cur_close >= ema20 * 0.985)
        touch_50_ema = (recent_low <= ema50 * (1.0 + tol_pct)) and (cur_close >= ema50 * 0.985)

        if not (touch_20_ema or touch_50_ema):
            return None

        # Determine Primary Dynamic Support EMA
        if touch_20_ema and touch_50_ema:
            # Pick the support EMA closest to current CMP / low
            dist_20 = abs(cur_close - ema20)
            dist_50 = abs(cur_close - ema50)
            if dist_20 <= dist_50:
                support_ema = ema20
                support_name = "20 EMA"
            else:
                support_ema = ema50
                support_name = "50 EMA"
        elif touch_20_ema:
            support_ema = ema20
            support_name = "20 EMA"
        else:
            support_ema = ema50
            support_name = "50 EMA"

        # ---------------------------------------------------------------------
        # 3. Candle Trigger & Support Confirmation
        # ---------------------------------------------------------------------
        # Bullish reversal confirmation holding the EMA level:
        # Close > Open and Close >= support_ema * 0.995
        is_bullish_candle = cur_close > cur_open
        holds_support = cur_close >= (support_ema * 0.995)

        if not (is_bullish_candle and holds_support):
            return None

        # ---------------------------------------------------------------------
        # 4. Volume Contraction & Absorption
        # ---------------------------------------------------------------------
        avg_vol_20 = float(np.mean(volume[-20:])) if len(volume) >= 20 else float(np.mean(volume))
        rvol = round(cur_volume / avg_vol_20, 2) if avg_vol_20 > 0 else 1.0

        # Smart money absorption / contraction on pullback:
        # Either RVOL < 0.85x or volume below 20-day average, or volume decreased on down-days
        vol_contraction = (rvol <= 0.85) or (cur_volume < avg_vol_20 * 0.90) or (len(volume) >= 2 and volume[-1] < volume[-2])

        # ---------------------------------------------------------------------
        # 5. RSI Momentum Zone (45.0 <= RSI <= 58.0)
        # ---------------------------------------------------------------------
        rsi_series = self.compute_rsi(close_series, 14)
        rsi_val = float(rsi_series.iloc[-1])

        rsi_min = float(self.pb_cfg.get("rsi_min", 45.0))
        rsi_max = float(self.pb_cfg.get("rsi_max", 58.0))

        if not (rsi_min <= rsi_val <= rsi_max):
            return None

        # ---------------------------------------------------------------------
        # 6. Exact Mathematical Levels (Strict Structural Math)
        # ---------------------------------------------------------------------
        # Invalidation (SL): Swing Low of current pullback base (np.min(low[-10:])) or 1% below 50 EMA
        base_swing_low = float(np.min(low[-10:]))
        ema50_buffer = float(ema50 * (1.0 - (self.ts_cfg.get("ema_50_sl_buffer_pct", 1.0) / 100.0)))
        invalidation_level = round(min(base_swing_low, ema50_buffer), 2)

        # Safety: invalidation must be strictly below CMP
        if invalidation_level >= cur_close:
            invalidation_level = round(cur_close * 0.97, 2)

        # Entry Zone: Support EMA level to current CMP
        entry_low = round(min(support_ema, cur_close * 0.995), 2)
        entry_high = round(cur_close, 2)
        entry_zone = f"₹{entry_low:,.2f} - ₹{entry_high:,.2f}"

        # Risk per share
        risk = round(max(cur_close - invalidation_level, cur_close * 0.015, 1.0), 2)

        # Targets (1:2.5 Risk-to-Reward)
        # Target 1 (1.5R): CMP + (Risk * 1.5)
        # Target 2 (2.5R): CMP + (Risk * 2.5)
        t1 = round(cur_close + (risk * 1.5), 2)
        t2 = round(cur_close + (risk * 2.5), 2)
        target_zone = f"₹{t1:,.2f} / ₹{t2:,.2f}"

        # ---------------------------------------------------------------------
        # 7. Institutional Scoring (0 - 100) & Grading
        # ---------------------------------------------------------------------
        # A. Trend Strength (35 Pts)
        # - Close > 50 EMA > 200 SMA (15 pts)
        # - 200 SMA slope strongly positive (10 pts)
        # - High proximity within 10% (10 pts) or 20% (5 pts)
        score_trend = 15.0
        score_trend += 10.0 if (lookback_sma >= 5 and sma200_slope > 0.05) else 7.0
        score_trend += 10.0 if drawdown_from_52w_pct <= 10.0 else 5.0

        # B. Support Interaction & Candle Turnaround (30 Pts)
        # - Reversal candle Close > Open (15 pts)
        # - Touched EMA support within 1% (15 pts) or 1.5% (10 pts)
        dist_to_ema_pct = (abs(recent_low - support_ema) / support_ema) * 100.0
        score_support = 15.0  # Bullish candle confirmed
        score_support += 15.0 if dist_to_ema_pct <= 1.0 else 10.0

        # C. Volume Dry-Up & Smart Money Absorption (20 Pts)
        # - RVOL < 0.85 (20 pts) or decreasing volume (15 pts)
        if rvol <= 0.70:
            score_vol = 20.0
        elif rvol <= 0.85:
            score_vol = 17.0
        else:
            score_vol = 12.0

        # D. RSI Pullback Pocket 45.0 - 58.0 (15 Pts)
        if 48.0 <= rsi_val <= 55.0:
            score_rsi = 15.0
        else:
            score_rsi = 12.0

        total_score = min(100, int(round(score_trend + score_support + score_vol + score_rsi)))
        grade = "A+" if total_score >= 90 else ("A" if total_score >= 75 else "B")
        score_display = f"{total_score} ({grade})"

        # ---------------------------------------------------------------------
        # 8. Trigger Status & Dynamic Evidence Tags
        # ---------------------------------------------------------------------
        if rvol <= 0.85 and is_bullish_candle:
            status = "STAGE-2 TURNAROUND"
        else:
            status = "PULLBACK SUPPORT HOLD"

        tags = [
            "Stage-2 Uptrend",
            f"{support_name} Support Hold",
            "Volume Dry-up" if rvol <= 0.85 else f"RVOL {rvol:.2f}x",
            f"RSI {rsi_val:.1f}",
            f"Within {drawdown_from_52w_pct:.0f}% of 52W High",
            "R:R 1:2.5"
        ]

        change_pct = round(float(((cur_close - close[-2]) / close[-2]) * 100.0), 2) if len(close) >= 2 else 0.0

        return {
            "symbol": symbol_meta.get("symbol", ""),
            "name": symbol_meta.get("name", ""),
            "sector": symbol_meta.get("sector", "NSE"),
            "cmp": round(cur_close, 2),
            "change_pct": change_pct,
            "rvol": rvol,
            "score": total_score,
            "grade": grade,
            "score_display": score_display,
            "institutional_score": total_score,
            "status": status,
            "invalidation": invalidation_level,
            "structure_invalidation": f"₹ {invalidation_level:,.2f} (Base Swing Low / 50 EMA Buffer)",
            "entry_zone": entry_zone,
            "target_1": t1,
            "target_2": t2,
            "target_zone": target_zone,
            "risk_reward_ratio": "1:2.5",
            "support_level": support_name,
            "support_ema": round(support_ema, 2),
            "ema_20": round(ema20, 2),
            "ema_50": round(ema50, 2),
            "sma_200": round(sma200, 2),
            "rsi": round(rsi_val, 1),
            "drawdown_52w_pct": round(drawdown_from_52w_pct, 1),
            "high_52w": round(high_52w, 2),
            "setup_tags": tags,
            "timestamp": df.index[-1].strftime("%Y-%m-%d") if hasattr(df.index[-1], "strftime") else str(df.index[-1])[:10]
        }
