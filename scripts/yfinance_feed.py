"""
MITS Pro Institutional Suite V2 - Yahoo Finance Secondary / EOD Feed
Provides technical indicator calculations and market metrics for Indian equities.
"""

import logging
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

logger = logging.getLogger("YFinanceFeed")

class YFinanceFeed:
    def __init__(self):
        try:
            import yfinance as yf
            self.yf = yf
        except ImportError:
            self.yf = None
            logger.warning("yfinance library not installed. Run: pip install yfinance")

    def fetch_history(self, ticker: str, period: str = "6mo", interval: str = "1d") -> Optional[pd.DataFrame]:
        """Fetch historical price and volume data for a given ticker."""
        if not self.yf:
            return None

        try:
            stock = self.yf.Ticker(ticker)
            df = stock.history(period=period, interval=interval)
            if df.empty or len(df) < 20:
                logger.warning(f"Insufficient history data for {ticker}")
                return None
            return df
        except Exception as e:
            logger.error(f"Error fetching yfinance history for {ticker}: {str(e)}")
            return None

    def calculate_technical_features(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Compute key quantitative metrics: RVOL, ATR, 20 EMA, 50 SMA, Bollinger Bands, Keltner Channels."""
        if df is None or len(df) < 20:
            return {}

        try:
            close = df["Close"]
            high = df["High"]
            low = df["Low"]
            volume = df["Volume"]

            # Moving Averages
            ema_20 = close.ewm(span=20, adjust=False).mean().iloc[-1]
            sma_50 = close.rolling(window=50).mean().iloc[-1] if len(df) >= 50 else ema_20
            sma_200 = close.rolling(window=200).mean().iloc[-1] if len(df) >= 200 else sma_50

            # RVOL (Current Volume vs 20-day Average Volume)
            avg_vol_20 = volume.rolling(window=20).mean().iloc[-2] if len(volume) > 20 else volume.mean()
            current_vol = volume.iloc[-1]
            rvol = round(float(current_vol / avg_vol_20), 2) if avg_vol_20 > 0 else 1.0

            # ATR (14 period)
            tr1 = high - low
            tr2 = (high - close.shift(1)).abs()
            tr3 = (low - close.shift(1)).abs()
            tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
            atr_14 = tr.rolling(window=14).mean().iloc[-1]

            # Bollinger Bands (20, 2)
            bb_mid = close.rolling(window=20).mean().iloc[-1]
            bb_std = close.rolling(window=20).std().iloc[-1]
            bb_upper = bb_mid + (2 * bb_std)
            bb_lower = bb_mid - (2 * bb_std)

            # Keltner Channels (20, 1.5 ATR)
            kc_upper = bb_mid + (1.5 * atr_14)
            kc_lower = bb_mid - (1.5 * atr_14)

            # Squeeze condition: BB is inside KC
            is_squeeze = (bb_lower > kc_lower) and (bb_upper < kc_upper)

            current_close = float(close.iloc[-1])
            prev_close = float(close.iloc[-2]) if len(close) > 1 else current_close
            change_pct = round(((current_close - prev_close) / prev_close) * 100, 2)

            return {
                "cmp": round(current_close, 2),
                "change_pct": change_pct,
                "rvol": rvol,
                "atr_14": round(float(atr_14), 2),
                "ema_20": round(float(ema_20), 2),
                "sma_50": round(float(sma_50), 2),
                "sma_200": round(float(sma_200), 2),
                "is_squeeze": bool(is_squeeze),
                "is_above_ema20": bool(current_close > ema_20),
                "is_above_sma50": bool(current_close > sma_50),
            }
        except Exception as e:
            logger.error(f"Error computing technical features: {str(e)}")
            return {}
