"""
MITS Pro Institutional Suite V2 - Angel One SmartAPI Client
Handles authentication, TOTP generation, and market quotes retrieval.
"""

import logging
from typing import Dict, Any, Optional, List
import pyotp

from config import (
    SMARTAPI_KEY,
    SMARTAPI_CLIENT_CODE,
    SMARTAPI_PIN,
    SMARTAPI_TOTP_TOKEN,
)

logger = logging.getLogger("AngelOneClient")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

class AngelOneClient:
    def __init__(self):
        self.api_key = SMARTAPI_KEY
        self.client_code = SMARTAPI_CLIENT_CODE
        self.pin = SMARTAPI_PIN
        self.totp_token = SMARTAPI_TOTP_TOKEN
        self.smart_api = None
        self.auth_token = None
        self.feed_token = None
        self.refresh_token = None

    def is_configured(self) -> bool:
        """Check if all necessary credentials are provided."""
        return all([self.api_key, self.client_code, self.pin, self.totp_token])

    def connect(self) -> bool:
        """Authenticate with Angel One SmartAPI using TOTP."""
        if not self.is_configured():
            logger.warning("Angel One credentials not fully configured. Running in mock/offline mode.")
            return False

        try:
            from SmartApi import SmartConnect
            self.smart_api = SmartConnect(self.api_key)
            totp = pyotp.TOTP(self.totp_token).now()
            login_data = self.smart_api.generateSession(self.client_code, self.pin, totp)

            if login_data.get("status"):
                self.auth_token = login_data["data"]["jwtToken"]
                self.feed_token = self.smart_api.getfeedToken()
                self.refresh_token = login_data["data"]["refreshToken"]
                logger.info("Successfully authenticated with Angel One SmartAPI.")
                return True
            else:
                logger.error(f"Authentication failed: {login_data.get('message')}")
                return False
        except ImportError:
            logger.error("smartapi-python library not installed. Run: pip install smartapi-python")
            return False
        except Exception as e:
            logger.error(f"Error during Angel One login: {str(e)}")
            return False

    def get_market_quote(self, exchange: str, token: str) -> Optional[Dict[str, Any]]:
        """Fetch quote for a specific token."""
        if not self.smart_api or not self.auth_token:
            return None

        try:
            quote = self.smart_api.ltpData(exchange, token, token)
            if quote.get("status"):
                return quote.get("data")
            return None
        except Exception as e:
            logger.error(f"Error fetching quote for {token}: {str(e)}")
            return None

    def get_historical_candles(
        self,
        exchange: str,
        token: str,
        interval: str = "ONE_DAY",
        from_date: str = "",
        to_date: str = ""
    ) -> Optional[List[Any]]:
        """Fetch historical candle data for quantitative technical analysis."""
        if not self.smart_api or not self.auth_token:
            return None

        try:
            params = {
                "exchange": exchange,
                "symboltoken": token,
                "interval": interval,
                "fromdate": from_date,
                "todate": to_date
            }
            candles = self.smart_api.getCandleData(params)
            if candles.get("status"):
                return candles.get("data", [])
            return None
        except Exception as e:
            logger.error(f"Error fetching candles for {token}: {str(e)}")
            return None
