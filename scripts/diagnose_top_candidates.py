import sys
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "scripts"))

import urllib.request, io, json
import pandas as pd
import yfinance as yf
from concurrent.futures import ThreadPoolExecutor
from tab1_bottom_reversal import BottomReversalProEngine

url = "https://archives.nseindia.com/content/indices/ind_nifty500list.csv"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=15) as resp:
    df = pd.read_csv(io.StringIO(resp.read().decode("utf-8")))

symbols = [
    {
        "symbol": str(r["Symbol"]).strip(),
        "name": str(r["Company Name"]).strip(),
        "sector": str(r["Industry"]).strip(),
        "exchange": "NSE",
        "yfinance": f"{str(r['Symbol']).strip()}.NS"
    }
    for _, r in df.iterrows()
]

# Save updated data/symbols.json with full universe
with open(BASE_DIR / "data" / "symbols.json", "w", encoding="utf-8") as f:
    json.dump({
        "universe": "NIFTY_500",
        "updated_at": "2026-09-18T17:35:00+05:30",
        "total_symbols": len(symbols),
        "symbols": symbols
    }, f, indent=2)

print(f"Updated data/symbols.json with {len(symbols)} NIFTY 500 equities.")

engine = BottomReversalProEngine()

def eval_sym(item):
    try:
        t = yf.Ticker(item["yfinance"])
        hist = t.history(period="6mo", interval="1d")
        if hist.empty or len(hist) < 50:
            return None
        res = engine.evaluate(item, hist, nifty_above_ema20=False)
        return res
    except Exception:
        return None

results = []
with ThreadPoolExecutor(max_workers=10) as ex:
    for r in ex.map(eval_sym, symbols):
        if r:
            results.append(r)

print(f"\nTotal strictly qualified (Score >= 70): {len(results)}")
for res in results:
    print(f"  {res['symbol']} ({res['sector']}): CMP Rs.{res['cmp']:.2f}, Score: {res['score_display']}, SL: Rs.{res['invalidation']:.2f}, Entry: {res['entry_zone']}, T1: Rs.{res['target_1']}, T2: Rs.{res['target_2']}, R:R: {res['risk_reward_ratio']}, Tags: {res['setup_tags']}")
