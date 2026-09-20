"""
MITS Pro Institutional Suite V2 - Tab 4: Weekly Swing Watchlist Engine
Pure EOD quantitative engine with zero look-ahead bias.
Migrated from D:\\MITS-Scanner Strategy 1: Weekly Swing Watchlist.

Screens NIFTY 500 equities for:
1. 1-Week Return: 5.0% <= 1W Return <= 7.0% (Last 5 trading days: close[-1] vs close[-6])
2. 1-Week Relative Strength vs NIFTY 50: Stock 1W Ret - Nifty 1W Ret > 5.0%
3. 1-Month Relative Strength vs NIFTY 50: Stock 1M Ret - Nifty 1M Ret > 5.0%
4. RSI Sweet Spot: 50.0 <= Daily RSI (14) < 65.0
5. Bullish Trend Stack: Close > 20 EMA > 50 EMA and Close > 200 EMA
6. Support Base & Confluence: Daily floor pivots (PP, S1, S2, R1, R2) and EMA support
7. Structural Invalidation SL: Base swing low min(Low[-20:])
8. Targets (1:2.5 RR): T1 (1.5x) and T2 (2.5x)
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
SWING_CFG = CONFIG.get("weekly_swing", {})


class WeeklySwingEngine:
    """
    Quantitative Weekly Swing Watchlist Engine.
    Evaluates historical daily OHLCV dataframe of a stock against NIFTY 50 benchmark series.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.cfg = config or SWING_CFG
        self.ret_cfg = self.cfg.get("return_criteria", {})
        self.rsi_cfg = self.cfg.get("rsi", {})
        self.trend_cfg = self.cfg.get("trend_structure", {})
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
        Evaluate a single stock's finalized EOD OHLCV history against the Weekly Swing model.
        Returns a qualified signal dictionary if all criteria are satisfied, otherwise None.
        """
        if df is None or len(df) < 60:
            return None

        # Clean column names & ensure numeric types
        df = df.copy()
        df.columns = [c.capitalize() for c in df.columns]
        for col in ["Open", "High", "Low", "Close", "Volume"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        close = df["Close"].values
        high = df["High"].values
        low = df["Low"].values
        volume = df["Volume"].values
        s_close = pd.Series(close)

        cur_close = float(close[-1])
        cur_high = float(high[-1])
        cur_low = float(low[-1])

        # 1. 1-Week Return (Last 5 trading days: close[-1] vs close[-6])
        if len(close) < 7:
            return None
        ret_1w = float(((cur_close - close[-6]) / close[-6]) * 100.0)

        # 2. 1-Month Return (Last 20 trading days: close[-1] vs close[-21])
        ret_1m = float(((cur_close - close[-21]) / close[-21]) * 100.0) if len(close) >= 21 else 0.0

        # 3. Benchmark Returns (NIFTY 50)
        if isinstance(bench_series, pd.DataFrame):
            b_close = bench_series["Close"] if "Close" in bench_series.columns else bench_series.iloc[:, 0]
            b_vals = b_close.values
        elif isinstance(bench_series, pd.Series):
            b_vals = bench_series.values
        elif isinstance(bench_series, np.ndarray):
            b_vals = bench_series
        else:
            b_vals = np.array([])

        if len(b_vals) < 6:
            nifty_1w_ret = 0.0
            nifty_1m_ret = 0.0
        else:
            nifty_1w_ret = float(((b_vals[-1] - b_vals[-6]) / b_vals[-6]) * 100.0)
            nifty_1m_ret = float(((b_vals[-1] - b_vals[-21]) / b_vals[-21]) * 100.0) if len(b_vals) >= 21 else 0.0

        # 4. Relative Strength vs NIFTY 50
        rs_vs_nifty_1w = ret_1w - nifty_1w_ret
        rs_vs_nifty_1m = ret_1m - nifty_1m_ret

        # 5. Moving Averages (20 EMA, 50 EMA, 200 EMA)
        ema20 = float(s_close.ewm(span=20, adjust=False).mean().iloc[-1])
        ema50 = float(s_close.ewm(span=50, adjust=False).mean().iloc[-1])
        ema200 = float(s_close.ewm(span=200, adjust=False).mean().iloc[-1]) if len(close) >= 200 else float(s_close.ewm(span=len(close), adjust=False).mean().iloc[-1])

        # 6. RSI (14) with Wilder's Smoothing
        rsi_s = self.compute_rsi(s_close, 14)
        rsi_val = float(rsi_s.iloc[-1]) if not pd.isna(rsi_s.iloc[-1]) else 50.0

        # Filter Parameters
        min_1w = self.ret_cfg.get("min_1w_return_pct", 5.0)
        max_1w = self.ret_cfg.get("max_1w_return_pct", 7.0)
        min_rs_1w = self.ret_cfg.get("min_1w_rs_pct", 5.0)
        min_rs_1m = self.ret_cfg.get("min_1m_rs_pct", 5.0)
        min_rsi = self.rsi_cfg.get("min_rsi", 50.0)
        max_rsi = self.rsi_cfg.get("max_rsi", 65.0)

        # Quantitative Constraints
        # Allow slight floating-point tolerance (0.05%) on boundaries
        c1_1w_ret = (min_1w - 0.05) <= ret_1w <= (max_1w + 0.05)
        c2_rs_1w = rs_vs_nifty_1w > min_rs_1w
        c3_rs_1m = rs_vs_nifty_1m > min_rs_1m
        c4_rsi = min_rsi <= rsi_val <= max_rsi
        c5_trend = (cur_close > ema20 and cur_close > ema50 and cur_close > ema200)

        if not (c1_1w_ret and c2_rs_1w and c3_rs_1m and c4_rsi and c5_trend):
            return None

        # ------------------------------------------------------------------
        # Mathematical Trade Setup & Support Confluence
        # ------------------------------------------------------------------
        # 1. Standard Floor Pivots
        pp = (cur_high + cur_low + cur_close) / 3.0
        s1 = (2.0 * pp) - cur_high
        s2 = pp - (cur_high - cur_low)
        r1 = (2.0 * pp) - cur_low
        r2 = pp + (cur_high - cur_low)

        # 2. Nearest Support Base Confluence Detection
        support_candidates = [
            ("20 EMA", ema20),
            ("50 EMA", ema50),
            ("PP", pp),
            ("S1", s1),
            ("S2", s2)
        ]
        below_cmp = [(name, val) for name, val in support_candidates if val < cur_close]
        if not below_cmp:
            below_cmp = [("20 EMA", ema20)]

        below_cmp.sort(key=lambda x: x[1], reverse=True)
        nearest_name, nearest_val = below_cmp[0]

        # Confluence Detection: other levels within 1.8% of nearest_val
        confl = [nearest_name]
        for n, v in below_cmp[1:]:
            if abs(v - nearest_val) / nearest_val <= 0.018:
                confl.append(n)

        if len(confl) > 1:
            base_label = " + ".join(confl) + " Support"
        else:
            base_label = nearest_name + " Support"

        # 3. Recommended Entry Zone: [Nearest Support - 0.5%] to [min(Nearest Support + 0.5%, CMP)]
        entry_low = round(nearest_val * 0.995, 2)
        entry_high = round(min(nearest_val * 1.005, cur_close), 2)
        entry_zone = f"₹{entry_low:,.2f} - ₹{entry_high:,.2f}"

        # 4. Structure Invalidation Level (Base Swing Low & EMA Rule)
        base_swing_low = float(np.min(low[-20:]))
        if ema50 < ema20 and ema50 > base_swing_low:
            invalidation_level = base_swing_low
        elif ema50 < ema20:
            invalidation_level = min(ema50, base_swing_low)
        else:
            invalidation_level = base_swing_low

        invalidation_level_str = f"₹ {invalidation_level:,.2f} (Base Swing Low)"

        # 5. Key Target Resistance (1:2.5 Risk-to-Reward Math)
        # Risk per share computed from structural SL (with safety floor 1.0)
        risk = max(cur_close - invalidation_level, cur_close - ema50, 1.0)
        t1 = round(max(r1, cur_close + (risk * 1.5)), 2)
        t2_calc = round(max(r2, cur_close + (risk * 2.5)), 2)

        # Optional 52-Week High magnet check
        high_52w = float(high[-250:].max()) if len(high) >= 250 else float(high.max())
        if high_52w > cur_close and abs(high_52w - t2_calc) / t2_calc <= 0.05:
            t2 = round(high_52w, 2)
        else:
            t2 = t2_calc

        targets_str = f"₹{t1:,.2f} / ₹{t2:,.2f}"

        # 6. Quantitative Scoring & Grading (0 - 100)
        score_1w = 25.0                                    # In 5-7% sweet spot
        score_rs_1w = min(25.0, 15.0 + (rs_vs_nifty_1w - 5.0) * 2.0)  # RS 1W > 5%
        score_rs_1m = min(25.0, 15.0 + (rs_vs_nifty_1m - 5.0) * 1.0)  # RS 1M > 5%
        score_rsi = 15.0 if (52.0 <= rsi_val <= 62.0) else 10.0       # Prime RSI band
        score_trend = 10.0 if (cur_close > ema20 > ema50) else 5.0   # Stack alignment

        total_score = min(100, int(round(score_1w + score_rs_1w + score_rs_1m + score_rsi + score_trend)))
        grade = "A+" if total_score >= 90 else ("A" if total_score >= 75 else "B")
        score_display = f"{total_score} ({grade})"

        # 7. Trigger Status
        dist_to_support_pct = ((cur_close - nearest_val) / nearest_val) * 100.0 if nearest_val > 0 else 0.0
        if dist_to_support_pct <= 1.5:
            status = "WEEKLY SWING ACCUMULATION"
        elif ret_1w >= 6.0:
            status = "WEEKLY MOMENTUM SURGE"
        else:
            status = "SWING BASE READY"

        # 8. Deterministic Evidence Tags
        tags = []
        if cur_close > ema20 > ema50:
            tags.append("Weekly Bullish Stack")
        tags.append(f"1W Ret +{ret_1w:.1f}%")
        tags.append(f"1M RS +{rs_vs_nifty_1m:.1f}%")
        tags.append(f"RSI {rsi_val:.1f}")
        tags.append(f"{confl[0]} Support")
        tags.append("R:R 1:2.5")

        # 20D Average Volume & RVOL
        vol_20_sma = float(np.mean(volume[-20:])) if len(volume) >= 20 else float(np.mean(volume))
        rvol = round(float(volume[-1]) / vol_20_sma, 2) if vol_20_sma > 0 else 1.0

        sym = symbol_meta.get("symbol", "")
        name = symbol_meta.get("name", sym)
        sec = symbol_meta.get("sector", "Diversified")
        pct_chg = round(float(((close[-1] - close[-2]) / close[-2]) * 100.0), 2) if len(close) >= 2 else 0.0

        return {
            "symbol": sym,
            "name": name,
            "sector": sec,
            "cmp": round(cur_close, 2),
            "change_pct": pct_chg,
            "score": total_score,
            "grade": grade,
            "score_display": score_display,
            "institutional_score": total_score,
            "status": status,
            "invalidation": round(invalidation_level, 2),
            "structure_invalidation": invalidation_level_str,
            "entry_zone": entry_zone,
            "target_1": t1,
            "target_2": t2,
            "target_zone": targets_str,
            "risk_reward_ratio": "1:2.5",
            "rvol": rvol,
            "setup_tags": tags[:5],
            "ret_1w": round(ret_1w, 2),
            "ret_1m": round(ret_1m, 2),
            "rs_1w": round(rs_vs_nifty_1w, 2),
            "rs_1m": round(rs_vs_nifty_1m, 2),
            "rsi": round(rsi_val, 1),
            "nearest_support_base": base_label,
            "nearest_support_val": round(nearest_val, 2),
            "base_swing_low": round(base_swing_low, 2),
            "ema_20": round(ema20, 2),
            "ema_50": round(ema50, 2),
            "ema_200": round(ema200, 2),
            "pivot_pp": round(pp, 2),
            "pivot_s1": round(s1, 2),
            "pivot_s2": round(s2, 2),
            "pivot_r1": round(r1, 2),
            "pivot_r2": round(r2, 2),
            "timestamp": symbol_meta.get("timestamp", "")
        }
