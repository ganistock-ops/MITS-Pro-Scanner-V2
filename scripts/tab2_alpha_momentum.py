"""
MITS Pro Institutional Suite V2 - Tab 2: Alpha Momentum Evaluator
Pure EOD quantitative engine with zero look-ahead bias.
Migrated from D:\\MITS-Scanner Strategy 3: Alpha Momentum Watchlist.
Screens NIFTY 500 equities for multi-timeframe Relative Strength (RS) outperformance
against NIFTY 50, volume expansion, 10-60 day base recovery, and 1:2.5 risk-reward setups.
"""

import math
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
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
ALPHA_CFG = CONFIG.get("alpha_momentum", {})

class AlphaMomentumEngine:
    """
    Quantitative Alpha Momentum Engine.
    Evaluates historical daily OHLCV dataframe of a stock against NIFTY 50 benchmark series.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.cfg = config or ALPHA_CFG
        self.ta_cfg = self.cfg.get("trend_alignment", {})
        self.rs_cfg = self.cfg.get("relative_strength", {})
        self.ve_cfg = self.cfg.get("volume_expansion", {})
        self.bs_cfg = self.cfg.get("base_structure", {})
        self.rsi_cfg = self.cfg.get("rsi", {})
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
        return rsi

    def evaluate(
        self,
        symbol_meta: Dict[str, Any],
        df: pd.DataFrame,
        bench_series: Union[pd.Series, pd.DataFrame, np.ndarray]
    ) -> Optional[Dict[str, Any]]:
        """
        Evaluate a single stock's finalized EOD OHLCV history against the Alpha Momentum model.
        Returns a qualified signal dictionary if all criteria are satisfied, otherwise None.
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

        # Prepare benchmark close values
        if isinstance(bench_series, pd.DataFrame):
            b_vals = bench_series["Close"].dropna().values.astype(float) if "Close" in bench_series.columns else bench_series.iloc[:, 0].dropna().values.astype(float)
        elif isinstance(bench_series, pd.Series):
            b_vals = bench_series.dropna().values.astype(float)
        elif isinstance(bench_series, (list, np.ndarray)):
            b_vals = np.array(bench_series, dtype=float)
        else:
            b_vals = np.array([], dtype=float)

        if len(b_vals) < 21:
            return None

        # Zero Look-Ahead Rule: slice strictly up to finalized candle
        current_candle = df.iloc[-1]
        cur_close = round(float(current_candle["Close"]), 2)
        cur_high = round(float(current_candle["High"]), 2)
        cur_low = round(float(current_candle["Low"]), 2)
        cur_open = round(float(current_candle["Open"]), 2)
        cur_vol = float(current_candle["Volume"])

        prev_close = float(df.iloc[-2]["Close"]) if len(df) > 1 else cur_close
        prev_vol = float(df.iloc[-2]["Volume"]) if len(df) > 1 else cur_vol
        change_pct = round(((cur_close - prev_close) / prev_close) * 100.0, 2)

        close = df["Close"].values.astype(float)
        high = df["High"].values.astype(float)
        low = df["Low"].values.astype(float)
        volume = df["Volume"].values.astype(float)
        s_close = pd.Series(close)

        # Technical Series
        ema20 = float(s_close.ewm(span=20, adjust=False).mean().iloc[-1])
        ema50 = float(s_close.ewm(span=self.ta_cfg.get("ema_trend", 50), adjust=False).mean().iloc[-1])
        sma200_len = min(len(df), self.ta_cfg.get("sma_long_term", 200))
        sma200 = float(s_close.rolling(sma200_len).mean().iloc[-1]) if sma200_len >= 50 else ema50

        # ----------------------------------------------------------------------
        # 1. Trend Alignment: Close > 50 EMA and Close > 200 SMA
        # ----------------------------------------------------------------------
        if not (cur_close > ema50 and cur_close > sma200):
            return None

        # ----------------------------------------------------------------------
        # 2. Multi-Timeframe Relative Strength vs NIFTY 50
        # 1Y > 30%, 6M > 15%, 3M > 10%, 1M > 5%
        # ----------------------------------------------------------------------
        idx_1y = min(len(close) - 1, len(b_vals) - 1, 240)
        idx_6m = min(len(close) - 1, len(b_vals) - 1, 120)
        idx_3m = min(len(close) - 1, len(b_vals) - 1, 60)
        idx_1m = min(len(close) - 1, len(b_vals) - 1, 21)

        ret_1y = ((cur_close - close[-idx_1y]) / close[-idx_1y]) * 100.0
        ret_6m = ((cur_close - close[-idx_6m]) / close[-idx_6m]) * 100.0
        ret_3m = ((cur_close - close[-idx_3m]) / close[-idx_3m]) * 100.0
        ret_1m = ((cur_close - close[-idx_1m]) / close[-idx_1m]) * 100.0

        b_ret_1y = ((b_vals[-1] - b_vals[-idx_1y]) / b_vals[-idx_1y]) * 100.0
        b_ret_6m = ((b_vals[-1] - b_vals[-idx_6m]) / b_vals[-idx_6m]) * 100.0
        b_ret_3m = ((b_vals[-1] - b_vals[-idx_3m]) / b_vals[-idx_3m]) * 100.0
        b_ret_1m = ((b_vals[-1] - b_vals[-idx_1m]) / b_vals[-idx_1m]) * 100.0

        rs_1y = ret_1y - b_ret_1y
        rs_6m = ret_6m - b_ret_6m
        rs_3m = ret_3m - b_ret_3m
        rs_1m = ret_1m - b_ret_1m

        rs_1y_thresh = float(self.rs_cfg.get("rs_1y_min_pct", 30.0))
        rs_6m_thresh = float(self.rs_cfg.get("rs_6m_min_pct", 15.0))
        rs_3m_thresh = float(self.rs_cfg.get("rs_3m_min_pct", 10.0))
        rs_1m_thresh = float(self.rs_cfg.get("rs_1m_min_pct", 5.0))

        if not (rs_1y > rs_1y_thresh and rs_6m > rs_6m_thresh and rs_3m > rs_3m_thresh and rs_1m > rs_1m_thresh):
            return None

        # ----------------------------------------------------------------------
        # 3. RSI Sweet Spot: 50 <= RSI(14) <= 72
        # ----------------------------------------------------------------------
        rsi_series = self.compute_rsi(s_close, period=self.rsi_cfg.get("period", 14))
        rsi_val = float(rsi_series.iloc[-1]) if not pd.isna(rsi_series.iloc[-1]) else 50.0
        min_rsi = float(self.rsi_cfg.get("min_rsi", 50.0))
        max_rsi = float(self.rsi_cfg.get("max_rsi", 72.0))

        if not (min_rsi <= rsi_val <= max_rsi):
            return None

        # ----------------------------------------------------------------------
        # 4. Volume Expansion: Volume >= Prev_Volume * 1.20 (today or last 3 bars)
        # ----------------------------------------------------------------------
        min_vol_mult = float(self.ve_cfg.get("min_volume_ratio", 1.20))
        is_vol_spike = (prev_vol > 0 and cur_vol >= prev_vol * min_vol_mult)
        vol_exp_recent = any(volume[-i] >= volume[-i - 1] * min_vol_mult for i in range(1, min(4, len(volume))))

        if not (is_vol_spike or vol_exp_recent):
            return None

        vol_sma20 = float(pd.Series(volume).rolling(20).mean().iloc[-2]) if len(volume) > 20 else float(volume.mean())
        rvol = round(float(cur_vol / max(vol_sma20, 1.0)), 2)

        # ----------------------------------------------------------------------
        # 5. Base Structure:
        # Swing High formed 10 to 60 days ago
        # Price corrected from Swing High (deep base >= 20% or moderate base >= 10%)
        # Current Close recovered to within 10% of Swing High (Close >= 90% Swing High)
        # ----------------------------------------------------------------------
        min_base_d = int(self.bs_cfg.get("lookback_min_days", 10))
        max_base_d = int(self.bs_cfg.get("lookback_max_days", 60))
        w = high[-max_base_d:-min_base_d] if len(high) >= max_base_d else high[:-min_base_d]

        if len(w) == 0:
            return None

        sh = float(np.max(w))
        sh_idx = (len(high) - max_base_d if len(high) >= max_base_d else 0) + int(np.argmax(w))
        min_l = float(np.min(low[sh_idx:]))

        # Close recovered to >= 90% of Swing High
        min_rec = float(self.bs_cfg.get("min_recovery_pct", 90.0)) / 100.0
        if not (cur_close >= sh * min_rec):
            return None

        # Base correction depth
        deep_cut = float(self.bs_cfg.get("deep_base_drawdown_pct", 20.0)) / 100.0
        mod_cut = float(self.bs_cfg.get("moderate_base_drawdown_pct", 10.0)) / 100.0

        is_deep_base = (min_l <= sh * (1.0 - deep_cut))
        is_mod_base = (min_l <= sh * (1.0 - mod_cut))

        if not (is_deep_base or (is_mod_base and is_vol_spike)):
            return None

        grade = "A+" if is_deep_base else "A"
        drawdown_pct = abs((min_l - sh) / sh * 100.0)

        # ----------------------------------------------------------------------
        # 6. Trade Setup & Execution Parameters
        # ----------------------------------------------------------------------
        if cur_close >= ema20:
            support_ema = round(ema20, 2)
            support_name = "20 EMA"
        else:
            support_ema = round(ema50, 2)
            support_name = "50 EMA"

        entry_zone_str = f"₹{support_ema:,.2f} - ₹{cur_close:,.2f}"

        # Invalidation Level (Base Swing Low & EMA Rule)
        base_swing_low = float(np.min(low[-20:]))
        if ema50 < support_ema and ema50 > base_swing_low:
            sl_val = base_swing_low
        elif ema50 < support_ema:
            sl_val = min(ema50, base_swing_low)
        else:
            sl_val = base_swing_low

        sl_val = round(sl_val, 2)
        risk = cur_close - sl_val
        if risk <= 0:
            risk = round(cur_close * 0.02, 2)
            sl_val = round(cur_close - risk, 2)

        t1_mult = float(self.ts_cfg.get("target_1_mult", 1.5))
        t2_mult = float(self.ts_cfg.get("target_2_mult", 2.5))
        t1 = round(cur_close + (risk * t1_mult), 2)
        t2 = round(cur_close + (risk * t2_mult), 2)

        # ----------------------------------------------------------------------
        # 7. Composite Scoring (0-100) & Evidence Tags
        # ----------------------------------------------------------------------
        setup_tags: List[str] = []
        score_breakdown: Dict[str, float] = {}

        # RS Factor (Max 40 Pts)
        rs_score = 0.0
        if rs_1y >= 50.0: rs_score += 15.0
        elif rs_1y >= 30.0: rs_score += 12.0

        if rs_6m >= 25.0: rs_score += 10.0
        elif rs_6m >= 15.0: rs_score += 8.0

        if rs_3m >= 15.0: rs_score += 8.0
        elif rs_3m >= 10.0: rs_score += 6.0

        if rs_1m >= 10.0: rs_score += 7.0
        elif rs_1m >= 5.0: rs_score += 5.0
        score_breakdown["rs_outperformance"] = rs_score

        # Trend & Moving Average Stack (Max 20 Pts)
        trend_score = 10.0
        if cur_close > ema20 and ema20 > ema50:
            trend_score += 10.0
            setup_tags.append("Bullish Trend Stack")
        else:
            trend_score += 5.0
        score_breakdown["trend_alignment"] = trend_score

        # Base Structure & Proximity (Max 20 Pts)
        base_score = 0.0
        if is_deep_base:
            base_score += 15.0
            setup_tags.append(f"Deep Base (-{drawdown_pct:.0f}%)")
        else:
            base_score += 10.0
            setup_tags.append("Momentum Base")

        proximity_to_sh = (cur_close / sh) * 100.0
        if proximity_to_sh >= 98.0:
            base_score += 5.0
            setup_tags.append("Breakout Pivot Retest")
        elif proximity_to_sh >= 92.0:
            base_score += 3.0
        score_breakdown["base_structure"] = base_score

        # Volume & Momentum (Max 20 Pts)
        vol_mom_score = 0.0
        if rvol >= 1.5:
            vol_mom_score += 12.0
            setup_tags.append("Volume Expansion")
        elif is_vol_spike:
            vol_mom_score += 9.0
            setup_tags.append("Volume Surge")
        else:
            vol_mom_score += 6.0

        if 55.0 <= rsi_val <= 68.0:
            vol_mom_score += 8.0
            setup_tags.append("RSI Sweet Spot")
        else:
            vol_mom_score += 5.0
        score_breakdown["volume_momentum"] = vol_mom_score

        total_score = min(100, round(sum(score_breakdown.values())))
        setup_tags.append(f"1Y RS +{rs_1y:.0f}%")
        setup_tags.append(f"R:R 1:{t2_mult}")

        status_text = "DEEP BASE BREAKOUT" if is_deep_base else "MOMENTUM BASE"

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
            "invalidation": sl_val,
            "entry_zone": entry_zone_str,
            "target_1": t1,
            "target_2": t2,
            "target_zone": f"{t1:,.2f} - {t2:,.2f}",
            "risk_reward_ratio": "1:2.5",
            "rvol": rvol,
            "setup_tags": setup_tags,
            "status": status_text,
            "support_level": support_name,
            "support_ema": support_ema,
            "rs_1y": round(rs_1y, 1),
            "rs_6m": round(rs_6m, 1),
            "rs_3m": round(rs_3m, 1),
            "rs_1m": round(rs_1m, 1),
            "rsi": round(rsi_val, 1),
            "drawdown_pct": round(drawdown_pct, 1),
            "swing_high": round(sh, 2),
            "base_low": round(min_l, 2),
            "timestamp": current_candle.name.strftime("%Y-%m-%d") if hasattr(current_candle.name, "strftime") else "2026-09-19",
            "score_breakdown": score_breakdown
        }
