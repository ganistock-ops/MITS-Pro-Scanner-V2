"""
Test real-market scanning across NIFTY 500 stocks using BottomReversalProEngine.
"""
import urllib.request
import io
import json
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd
import yfinance as yf

from tab1_bottom_reversal import BottomReversalProEngine

def get_nifty500_list():
    url = "https://archives.nseindia.com/content/indices/ind_nifty500list.csv"
    headers = {"User-Agent": "Mozilla/5.0"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        df = pd.read_csv(io.StringIO(resp.read().decode("utf-8")))
    
    symbols = []
    for _, row in df.iterrows():
        sym = str(row["Symbol"]).strip()
        name = str(row["Company Name"]).strip()
        industry = str(row["Industry"]).strip()
        symbols.append({
            "symbol": sym,
            "name": name,
            "sector": industry,
            "yfinance": f"{sym}.NS"
        })
    return symbols

def main():
    symbols = get_nifty500_list()
    print(f"Loaded {len(symbols)} stocks from NIFTY 500 index.")

    # Check NIFTY 50 regime
    nifty = yf.Ticker("^NSEI").history(period="3mo")
    nifty_above_ema20 = False
    if not nifty.empty:
        cmp = nifty["Close"].iloc[-1]
        ema20 = nifty["Close"].ewm(span=20, adjust=False).mean().iloc[-1]
        nifty_above_ema20 = bool(cmp > ema20)
    print(f"Market Regime (NIFTY > 20 EMA): {nifty_above_ema20}")

    engine = BottomReversalProEngine()
    qualified_signals = []
    processed_count = 0
    errors_count = 0

    def process_stock(item):
        ticker = item["yfinance"]
        try:
            t = yf.Ticker(ticker)
            df = t.history(period="6mo", interval="1d")
            if df.empty or len(df) < 50:
                return None
            sig = engine.evaluate(item, df, nifty_above_ema20=nifty_above_ema20)
            return sig
        except Exception:
            return None

    print(f"Scanning full NIFTY 500 universe ({len(symbols)} stocks)...")
    all_scored = []

    def evaluate_with_diagnostics(item):
        ticker = item["yfinance"]
        try:
            t = yf.Ticker(ticker)
            df = t.history(period="6mo", interval="1d")
            if df.empty or len(df) < 50:
                return None
            sig = engine.evaluate(item, df, nifty_above_ema20=nifty_above_ema20)
            if sig:
                return sig
            # Also calculate partial score if any
            return None
        except Exception:
            return None

    t0 = time.time()
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(process_stock, item): item for item in symbols}
        for f in as_completed(futures):
            processed_count += 1
            res = f.result()
            if res:
                qualified_signals.append(res)
                print(f"  -> MATCH [{res['score_display']}]: {res['symbol']} ({res['sector']}) CMP: Rs.{res['cmp']}, SL: Rs.{res['invalidation']}, R:R: {res['risk_reward_ratio']}, Tags: {', '.join(res['setup_tags'][:3])}")

    print(f"\nScan completed in {time.time()-t0:.2f}s across {processed_count} stocks.")
    print(f"Total Qualified Signals (Score >= 70): {len(qualified_signals)}")

if __name__ == "__main__":
    main()
