#!/usr/bin/env python3
"""
MITS Pro Quantitative Engine V2 - Institutional Fundamentals Synchronizer
========================================================================
Fetches REAL fundamental financial metrics directly from yfinance:
- Market Cap (₹ Cr)
- P/E Ratio (trailing / forward)
- Return on Equity (ROE %)
- Return on Capital / Assets (ROCE / ROA %)
- Debt to Equity Ratio
- Book Value (₹)
- Last 3 Quarters Financials (Quarter date, Total Revenue ₹ Cr, Net Profit ₹ Cr)

Strictly Real Data: No dummy or mock numbers. Missing metrics are labeled 'N/A'.
Outputs to: data/fundamentals.json
"""

import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
import pandas as pd
import yfinance as yf

# Ensure Windows console supports UTF-8 characters like ₹
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYMBOLS_FILE = os.path.join(WORKSPACE_ROOT, "data", "symbols.json")
RESULTS_FILE = os.path.join(WORKSPACE_ROOT, "data", "scanner_results.json")
OUTPUT_FILE = os.path.join(WORKSPACE_ROOT, "data", "fundamentals.json")

def format_inr_cr(num):
    if num is None or pd.isna(num) or num == 0:
        return "N/A"
    try:
        val = float(num)
        cr = val / 1e7
        if cr >= 100000:
            return f"₹{cr/100000:.2f}L Cr"
        elif cr >= 1000:
            return f"₹{cr:,.0f} Cr"
        else:
            return f"₹{cr:.1f} Cr"
    except Exception:
        return "N/A"

def format_ratio(num, decimals=2, suffix=""):
    if num is None or pd.isna(num):
        return "N/A"
    try:
        val = float(num)
        return f"{val:.{decimals}f}{suffix}"
    except Exception:
        return "N/A"

def fetch_single_ticker(symbol, yf_symbol):
    try:
        ticker = yf.Ticker(yf_symbol)
        info = ticker.info or {}
        
        # Market Cap
        raw_mc = info.get("marketCap")
        mc_display = format_inr_cr(raw_mc)
        
        # P/E Ratio
        raw_pe = info.get("trailingPE") or info.get("forwardPE")
        pe_display = format_ratio(raw_pe, decimals=2)
        
        # ROE
        raw_roe = info.get("returnOnEquity")
        roe_display = f"{float(raw_roe)*100:.1f}%" if raw_roe is not None and not pd.isna(raw_roe) else "N/A"
        
        # ROCE / Return on Assets
        raw_roa = info.get("returnOnAssets")
        roce_display = f"{float(raw_roa)*100:.1f}%" if raw_roa is not None and not pd.isna(raw_roa) else "N/A"
        
        # Debt to Equity
        raw_de = info.get("debtToEquity")
        if raw_de is not None and not pd.isna(raw_de):
            # yfinance often returns debtToEquity as a percentage (e.g. 35.5 = 0.355 or 120 = 1.20)
            de_val = float(raw_de)
            de_ratio = de_val / 100.0 if de_val > 5.0 else de_val
            de_display = f"{de_ratio:.2f}"
        else:
            de_display = "0.00" if (info.get("totalDebt") == 0) else "N/A"
            
        # Book Value
        raw_bv = info.get("bookValue")
        bv_display = f"₹{float(raw_bv):.1f}" if raw_bv is not None and not pd.isna(raw_bv) else "N/A"

        # Last 3 Quarters Financials
        quarters = []
        q = None
        bs = None
        try:
            q = ticker.quarterly_income_stmt
            if q is not None and not q.empty:
                cols = list(q.columns[:3])
                rev_row = None
                for candidate in ["Total Revenue", "Operating Revenue", "Revenue"]:
                    if candidate in q.index:
                        rev_row = candidate
                        break
                        
                ni_row = None
                for candidate in ["Net Income", "Net Income Common Stockholders", "Net Income From Continuing Operation Net Minority Interest"]:
                    if candidate in q.index:
                        ni_row = candidate
                        break
                        
                for col in cols:
                    date_lbl = col.strftime("%b %Y") if hasattr(col, "strftime") else str(col)[:7]
                    
                    rev_val = q.loc[rev_row, col] if rev_row else None
                    ni_val = q.loc[ni_row, col] if ni_row else None
                    
                    rev_cr = round(float(rev_val) / 1e7, 1) if (rev_val is not None and not pd.isna(rev_val)) else None
                    ni_cr = round(float(ni_val) / 1e7, 1) if (ni_val is not None and not pd.isna(ni_val)) else None
                    
                    quarters.append({
                        "quarter": date_lbl,
                        "revenue_cr": f"₹{rev_cr:,.1f} Cr" if rev_cr is not None else "N/A",
                        "net_profit_cr": f"₹{ni_cr:,.1f} Cr" if ni_cr is not None else "N/A",
                        "is_profit": (ni_cr is not None and ni_cr >= 0)
                    })
        except Exception:
            quarters = []

        # If ROE or ROCE are N/A, try calculating from quarterly income statement and balance sheet
        if (raw_roe is None or pd.isna(raw_roe)) or (raw_roa is None or pd.isna(raw_roa)):
            try:
                bs = ticker.quarterly_balance_sheet
                if q is not None and not q.empty and bs is not None and not bs.empty:
                    ni_row = 'Net Income' if 'Net Income' in q.index else ('Net Income Common Stockholders' if 'Net Income Common Stockholders' in q.index else None)
                    eq_row = 'Stockholders Equity' if 'Stockholders Equity' in bs.index else ('Common Stock Equity' if 'Common Stock Equity' in bs.index else None)
                    op_row = 'Operating Income' if 'Operating Income' in q.index else None
                    ta_row = 'Total Assets' if 'Total Assets' in bs.index else None
                    cl_row = 'Current Liabilities' if 'Current Liabilities' in bs.index else None
                    
                    # ROE Calculation
                    if (raw_roe is None or pd.isna(raw_roe)) and ni_row and eq_row:
                        ttm_ni = float(q.loc[ni_row].iloc[:4].sum())
                        equity = float(bs.loc[eq_row].iloc[0])
                        if equity > 0:
                            calc_roe = (ttm_ni / equity) * 100.0
                            roe_display = f"{calc_roe:.1f}%"
                            
                    # ROCE Calculation: EBIT / (Total Assets - Current Liabilities)
                    if (raw_roa is None or pd.isna(raw_roa)) and op_row and ta_row:
                        ttm_ebit = float(q.loc[op_row].iloc[:4].sum())
                        assets = float(bs.loc[ta_row].iloc[0])
                        curr_liab = float(bs.loc[cl_row].iloc[0]) if cl_row else 0
                        capital_employed = assets - curr_liab
                        if capital_employed > 0:
                            calc_roce = (ttm_ebit / capital_employed) * 100.0
                            roce_display = f"{calc_roce:.1f}%"
            except Exception:
                pass

        return symbol, {
            "symbol": symbol,
            "market_cap": mc_display,
            "pe_ratio": pe_display,
            "roe": roe_display,
            "roce": roce_display,
            "debt_to_equity": de_display,
            "book_value": bv_display,
            "quarters": quarters,
            "last_updated": datetime.now().strftime("%d-%b-%Y %H:%M")
        }
    except Exception as e:
        return symbol, None

def main():
    print("=" * 70)
    print("MITS Pro Scanner - Syncing Real Fundamentals via yfinance")
    print("=" * 70)

    # 1. Determine Symbols Priority
    # High Priority: Symbols active in current scanner setups
    priority_symbols = []
    if os.path.exists(RESULTS_FILE):
        try:
            with open(RESULTS_FILE, "r", encoding="utf-8") as f:
                rdata = json.load(f)
                setups = rdata.get("setups", {})
                for sid, sdata in setups.items():
                    for sig in sdata.get("signals", []):
                        sym = sig.get("symbol")
                        if sym and sym not in priority_symbols:
                            priority_symbols.append(sym)
        except Exception as e:
            print(f"Notice: Could not parse results file: {e}")

    # All Nifty 500 Symbols
    all_symbols = []
    symbol_to_yf = {}
    if os.path.exists(SYMBOLS_FILE):
        try:
            with open(SYMBOLS_FILE, "r", encoding="utf-8") as f:
                sdata = json.load(f)
                for item in sdata.get("symbols", []):
                    sym = item.get("symbol")
                    yf_sym = item.get("yfinance", f"{sym}.NS")
                    if sym:
                        all_symbols.append(sym)
                        symbol_to_yf[sym] = yf_sym
        except Exception as e:
            print(f"Error loading symbols: {e}")

    if not all_symbols:
        all_symbols = priority_symbols

    # Load existing fundamentals cache if present
    fundamentals_map = {}
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                existing = json.load(f)
                fundamentals_map = existing.get("data", {})
                print(f"Loaded existing cache with {len(fundamentals_map)} symbols.")
        except Exception:
            fundamentals_map = {}

    # Target symbols: priority first, then remaining
    target_list = list(priority_symbols)
    for sym in all_symbols:
        if sym not in target_list:
            target_list.append(sym)

    print(f"Total Universe: {len(target_list)} symbols (Active Signals: {len(priority_symbols)})")

    # Sync using ThreadPoolExecutor
    # If called with --active-only, only fetch active signals for instant 10s run
    active_only = "--active-only" in sys.argv
    symbols_to_fetch = priority_symbols if active_only else target_list[:120]  # Fast batch for immediate availability

    print(f"Fetching fundamentals for {len(symbols_to_fetch)} symbols...")
    success_count = 0
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {
            executor.submit(fetch_single_ticker, sym, symbol_to_yf.get(sym, f"{sym}.NS")): sym
            for sym in symbols_to_fetch
        }
        for future in as_completed(futures):
            sym, result = future.result()
            if result:
                fundamentals_map[sym] = result
                success_count += 1
                if success_count % 10 == 0 or sym in priority_symbols:
                    print(f"  [OK] [{success_count}/{len(symbols_to_fetch)}] {sym}: MC={result['market_cap']}, PE={result['pe_ratio']}, ROE={result['roe']}, Qs={len(result['quarters'])}")

    output_payload = {
        "generated_at": datetime.now().isoformat(),
        "total_symbols": len(fundamentals_map),
        "source": "Yahoo Finance (Official Real Metrics)",
        "data": fundamentals_map
    }

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output_payload, f, indent=2)

    print(f"\nSuccessfully written {len(fundamentals_map)} symbols to {OUTPUT_FILE}")
    print("=" * 70)

if __name__ == "__main__":
    main()
