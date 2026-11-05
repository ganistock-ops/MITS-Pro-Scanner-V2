#!/usr/bin/env python3
"""
scripts/generate_backtest_data.py
MITS Pro Scanner V2 - Strategy & Backtest Commercial Forward Performance Engine
================================================================================
Pure Forward Holding & Peak Momentum Model anchored to Support 1.
Evaluates all 12 Scanners (6 Quick + 6 Advanced Institutional) across 1-year OHLCV.

Execution & Modeling Rules:
1. Entry Trigger: Support 1 buffer retest (Support 1 ± 0.8%) verified on Day T+1 or T+2.
   If price runs away without testing the zone, tagged as UNFILLED.
2. Pure Forward Horizon Evaluation (NO Trade Invalidation / NO Early Stop Loss Kill):
   - 10 Trading Days: Short-term Swing (10D)
   - 30 Trading Days: Positional Swing (1M)
   - 63 Trading Days: Multi-month Positional (3M)
   For each horizon:
   - Win Rate %: % of trades delivering positive return (> 0.0%) at horizon close.
   - Avg Return %: Mean percentage gain across all filled candidates.
   - Avg Peak Gain %: Mean of the highest high reached within that horizon.
   - Max Peak Gain %: Single best breakout performer in that setup.
3. Representative Trade Logs:
   Top 12 recent sample trades per setup with compact keys:
   `s`, `sec`, `d`, `ent`, `pk`, `r10d`, `r1m`, `r3m`, `st` (PROFIT, CONSOLIDATION, DRAWDOWN).
4. Output Payload: Static export to data/strategy_backtest_data.json (< 35 KB).
"""

import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

import pandas as pd
import numpy as np

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent
PARQUET_PATH = BASE_DIR / "cache" / "market_ohlcv.parquet"
SYMBOLS_PATH = BASE_DIR / "data" / "symbols.json"
OUTPUT_PATH = BASE_DIR / "data" / "strategy_backtest_data.json"

SETUPS = [
    {"id": "setup_1", "name": "Bottom Reversal Pro", "category": "Quick Scanner", "support": "5D Swing Low Base"},
    {"id": "setup_2", "name": "Alpha Momentum", "category": "Quick Scanner", "support": "20 EMA Baseline"},
    {"id": "setup_3", "name": "High Tight Flag", "category": "Quick Scanner", "support": "Flag Base Low"},
    {"id": "setup_4", "name": "Weekly Swing", "category": "Quick Scanner", "support": "20 EMA Dynamic Support"},
    {"id": "setup_5", "name": "Stage-2 Pullback", "category": "Quick Scanner", "support": "50 EMA Baseline"},
    {"id": "setup_6", "name": "DBR Demand Zone", "category": "Quick Scanner", "support": "Demand Base Low"},
    {"id": "adv_1", "name": "RS Leaderboard", "category": "Advanced Institutional", "support": "20 EMA Dynamic Support"},
    {"id": "adv_2", "name": "Early Breakout Pro (VCP)", "category": "Advanced Institutional", "support": "VCP Contraction Base Low"},
    {"id": "adv_3", "name": "Momentum Continuation", "category": "Advanced Institutional", "support": "20 EMA Anchor"},
    {"id": "adv_4", "name": "Rally Base Rally", "category": "Advanced Institutional", "support": "Consolidation Base Low"},
    {"id": "adv_5", "name": "Confluence Engine", "category": "Advanced Institutional", "support": "20/50 EMA Confluence Level"},
    {"id": "adv_6", "name": "Wyckoff Absorption", "category": "Advanced Institutional", "support": "Wyckoff Trading Range Floor"},
]


def load_dataset() -> Tuple[Dict[str, Dict[str, Any]], Dict[str, Any]]:
    """Loads 1-year OHLCV parquet and precomputes vector technical indicators."""
    if not PARQUET_PATH.exists():
        raise FileNotFoundError(f"Missing historical OHLCV data at {PARQUET_PATH}")
    
    t0 = time.time()
    df_all = pd.read_parquet(PARQUET_PATH)
    df_all['Date'] = pd.to_datetime(df_all['Date'])
    df_all = df_all.sort_values(['Symbol', 'Date']).reset_index(drop=True)
    
    symbol_meta = {}
    if SYMBOLS_PATH.exists():
        with open(SYMBOLS_PATH, "r", encoding="utf-8") as f:
            syms_data = json.load(f)
            symbol_meta = {s["symbol"]: s for s in syms_data.get("symbols", [])}
            
    grouped = {s: g.reset_index(drop=True) for s, g in df_all.groupby('Symbol')}
    
    stock_data = {}
    for sym, df in grouped.items():
        n = len(df)
        if n < 60:
            continue
        c = df['Close'].values
        h = df['High'].values
        l = df['Low'].values
        o = df['Open'].values
        v = df['Volume'].values
        dates = df['Date'].dt.strftime('%Y-%m-%d').values
        
        c_series = df['Close']
        v_series = df['Volume']
        
        # Moving averages
        ema20 = c_series.ewm(span=20, adjust=False).mean().values
        ema50 = c_series.ewm(span=50, adjust=False).mean().values
        sma200 = c_series.rolling(window=min(200, n), min_periods=30).mean().values
        vol_sma20 = v_series.rolling(window=20, min_periods=5).mean().values
        
        # RSI 14
        delta = c_series.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(alpha=1.0/14, min_periods=14, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1.0/14, min_periods=14, adjust=False).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        rsi = (100.0 - (100.0 / (1.0 + rs))).fillna(50.0).values
        
        stock_data[sym] = {
            'n': n, 'c': c, 'h': h, 'l': l, 'o': o, 'v': v, 'd': dates,
            'ema20': ema20, 'ema50': ema50, 'sma200': sma200,
            'vol_sma20': vol_sma20, 'rsi': rsi
        }
        
    print(f"Loaded {len(df_all):,} candles across {len(stock_data)} equities in {time.time()-t0:.2f}s.")
    return stock_data, symbol_meta


def scan_setup_signals(sym: str, sd: Dict[str, Any], setup_id: str) -> List[Tuple[int, float]]:
    """
    Scans a stock across its historical OHLCV for qualification of a specific setup.
    Enforces a 4-day refractory period between signals to prevent clustering.
    Returns list of (signal_bar_index, support_1_price).
    """
    n = sd['n']
    c = sd['c']
    h = sd['h']
    l = sd['l']
    o = sd['o']
    v = sd['v']
    ema20 = sd['ema20']
    ema50 = sd['ema50']
    sma200 = sd['sma200']
    vol_sma20 = sd['vol_sma20']
    rsi = sd['rsi']
    
    signals = []
    last_signal_bar = -99
    
    for t in range(40, n - 4):
        if (t - last_signal_bar) < 4:
            continue
            
        cur_c = c[t]
        cur_o = o[t]
        cur_h = h[t]
        cur_l = l[t]
        cur_v = v[t]
        e20 = ema20[t]
        e50 = ema50[t]
        s200 = sma200[t]
        vsma = vol_sma20[t]
        r = rsi[t]
        rng = max(cur_h - cur_l, 0.01)
        
        triggered = False
        support_1 = None
        
        # 1. Quick Setup 1: Bottom Reversal Pro
        if setup_id == "setup_1":
            high40 = np.max(h[max(0, t - 40) : t])
            pullback_pct = ((high40 - cur_c) / high40) * 100.0 if high40 > 0 else 0
            if pullback_pct >= 10.0 or cur_c < e50:
                base_low = float(np.min(l[max(0, t - 10) : t]))
                lower_wick = max(0.0, min(cur_c, cur_o) - cur_l)
                if (cur_c > cur_o and lower_wick / rng >= 0.20) or (cur_c > h[t-1] and cur_c > cur_o):
                    support_1 = base_low if base_low < cur_c else round(cur_c * 0.95, 2)
                    triggered = True
                    
        # 2. Quick Setup 2: Alpha Momentum
        elif setup_id == "setup_2":
            if cur_c > e20 and e20 > e50 and cur_c > s200:
                ret20 = ((cur_c - c[t - 20]) / c[t - 20]) * 100.0 if t >= 20 else 0
                if ret20 >= 8.0 and 55 <= r <= 78 and cur_v >= 1.1 * vsma:
                    support_1 = round(e20, 2)
                    triggered = True
                    
        # 3. Quick Setup 3: High Tight Flag
        elif setup_id == "setup_3":
            for pole_len in range(15, 36):
                pole_start = t - pole_len
                if pole_start < 5: 
                    continue
                pole_low = float(np.min(l[pole_start : pole_start + 10]))
                pole_high = float(np.max(h[pole_start + 5 : t - 3]))
                if pole_low > 0 and ((pole_high - pole_low) / pole_low) >= 0.25:
                    flag_low = float(np.min(l[t - 5 : t + 1]))
                    if flag_low >= pole_high * 0.82 and cur_c > e20:
                        support_1 = round(flag_low, 2)
                        triggered = True
                        break
                        
        # 4. Quick Setup 4: Weekly Swing
        elif setup_id == "setup_4":
            if t >= 5 and cur_c > e20 and e20 > e50:
                ret5 = ((cur_c - c[t - 5]) / c[t - 5]) * 100.0
                if 4.0 <= ret5 <= 9.5 and 52 <= r <= 75:
                    support_1 = round(e20, 2)
                    triggered = True
                    
        # 5. Quick Setup 5: Stage-2 Pullback
        elif setup_id == "setup_5":
            if e20 > e50 and cur_c > e50:
                touch_50 = cur_l <= e50 * 1.015 and cur_c >= e50 * 0.985
                touch_20 = cur_l <= e20 * 1.015 and cur_c >= e20 * 0.985
                if (touch_50 or touch_20) and cur_c > cur_o:
                    support_1 = round(e50 if touch_50 else e20, 2)
                    triggered = True
                    
        # 6. Quick Setup 6: DBR Demand Zone
        elif setup_id == "setup_6":
            if cur_c > cur_o and (cur_c - cur_o) / rng >= 0.50 and cur_v >= 1.15 * vsma:
                base_len = 0
                for b in range(t - 1, max(0, t - 5), -1):
                    b_rng = max(h[b] - l[b], 0.01)
                    if abs(c[b] - o[b]) / b_rng <= 0.50:
                        base_len += 1
                    else:
                        break
                if 1 <= base_len <= 4:
                    base_low = float(np.min(l[t - base_len : t]))
                    support_1 = round(base_low, 2)
                    triggered = True
                    
        # 7. Advanced Setup 1: RS Leaderboard
        elif setup_id == "adv_1":
            if t >= 60 and cur_c > e50 and e20 > e50:
                ret60 = ((cur_c - c[t - 60]) / c[t - 60]) * 100.0
                ret20 = ((cur_c - c[t - 20]) / c[t - 20]) * 100.0
                if ret60 >= 12.0 and ret20 >= 5.0 and cur_v >= vsma:
                    support_1 = round(e20, 2)
                    triggered = True
                    
        # 8. Advanced Setup 2: Early Breakout Pro (VCP)
        elif setup_id == "adv_2":
            if t >= 20 and cur_c > e20 and e20 > e50:
                h20 = np.max(h[t - 20 : t + 1])
                h10 = np.max(h[t - 10 : t + 1])
                l10 = np.min(l[t - 10 : t + 1])
                bw = ((h10 - l10) / l10) * 100.0 if l10 > 0 else 99
                if bw <= 8.5 and cur_c >= h20 * 0.97:
                    support_1 = round(l10, 2)
                    triggered = True
                    
        # 9. Advanced Setup 3: Momentum Continuation
        elif setup_id == "adv_3":
            if cur_c > e20 and e20 > e50 and 55 <= r <= 72:
                if t >= 2 and l[t] > l[t-1] and l[t-1] > l[t-2] and cur_c > cur_o:
                    support_1 = round(e20, 2)
                    triggered = True
                elif cur_l <= e20 * 1.01 and cur_c > cur_o:
                    support_1 = round(e20, 2)
                    triggered = True
                    
        # 10. Advanced Setup 4: Rally Base Rally
        elif setup_id == "adv_4":
            if t >= 10:
                for base_len in range(2, 6):
                    base_start = t - base_len
                    b_high = float(np.max(h[base_start : t]))
                    b_low = float(np.min(l[base_start : t]))
                    if b_low > 0 and ((b_high - b_low) / b_low) <= 0.045:
                        rally_start = max(0, base_start - 6)
                        r_low = float(np.min(l[rally_start : base_start]))
                        if r_low > 0 and ((b_high - r_low) / r_low) >= 0.05:
                            if cur_c > b_high and cur_c > cur_o and cur_v >= 1.1 * vsma:
                                support_1 = round(b_low, 2)
                                triggered = True
                                break
                                
        # 11. Advanced Setup 5: Confluence Engine
        elif setup_id == "adv_5":
            if cur_c > e20 and e20 > e50 and 50 <= r <= 68:
                if cur_l <= e20 * 1.015 and cur_c > cur_o and cur_v >= vsma:
                    support_1 = round(min(e20, e50), 2)
                    triggered = True
                    
        # 12. Advanced Setup 6: Wyckoff Absorption
        elif setup_id == "adv_6":
            if t >= 25:
                range_h = float(np.max(h[t - 20 : t]))
                range_l = float(np.min(l[t - 20 : t]))
                bw = ((range_h - range_l) / range_l) * 100.0 if range_l > 0 else 99
                if bw <= 12.0 and (cur_c - cur_l) / rng >= 0.50:
                    lower_wick = max(0.0, min(cur_c, cur_o) - cur_l)
                    if lower_wick / rng >= 0.30 or cur_v >= 1.2 * vsma:
                        support_1 = round(range_l, 2)
                        triggered = True

        if triggered and support_1 is not None and support_1 > 0:
            if support_1 >= cur_c:
                support_1 = round(cur_c * 0.96, 2)
            signals.append((t, support_1))
            last_signal_bar = t
            
    return signals


def simulate_commercial_forward(sd: Dict[str, Any], t: int, support_1: float) -> Optional[Dict[str, Any]]:
    """
    Pure Forward Holding & Peak Momentum Model:
    1. Retest Fill: Day T+1 or T+2 trades within Support 1 zone (Support 1 ± 0.8%).
    2. Measures pure forward holding returns across:
       - 10 Trading Days (Short-term Swing)
       - 30 Trading Days / 1 Month (Positional Swing)
       - 63 Trading Days / 3 Months (Multi-month Positional)
       NO trade invalidation or premature stop loss cutting.
    """
    n = sd['n']
    c = sd['c']
    h = sd['h']
    l = sd['l']
    o = sd['o']
    d = sd['d']
    
    if t + 2 >= n:
        return None
        
    entry_zone_max = support_1 * 1.008
    entry_zone_min = support_1 * 0.992
    
    entry_bar = None
    entry_price = None
    
    # Check Day T+1 or Day T+2 for Support 1 retest fill
    for check_t in [t + 1, t + 2]:
        if l[check_t] <= entry_zone_max and h[check_t] >= entry_zone_min:
            entry_bar = check_t
            if o[check_t] > entry_zone_max:
                entry_price = round(entry_zone_max, 2)
            elif o[check_t] < entry_zone_min:
                entry_price = round(o[check_t], 2)
            else:
                entry_price = round(o[check_t], 2)
            break
            
    if entry_bar is None:
        return {'st': 'UNFILLED'}
        
    forward_bars = (n - 1) - entry_bar
    
    # Overall peak over available forward bars (up to max 63 forward sessions)
    max_b = min(entry_bar + 64, n)
    overall_high = float(np.max(h[entry_bar:max_b]))
    pk_gain = round(((overall_high - entry_price) / entry_price) * 100.0, 2)
    dur = int(np.argmax(h[entry_bar:max_b]))
    
    # Strict Elapsed Session Guards:
    # 1. 10 Trading Days Horizon (Short-term Swing)
    valid_10 = (forward_bars >= 10)
    if valid_10:
        b_10 = entry_bar + 10
        ret_10d = round(((c[b_10] - entry_price) / entry_price) * 100.0, 2)
        pk_10d = round(((np.max(h[entry_bar:b_10 + 1]) - entry_price) / entry_price) * 100.0, 2)
    else:
        ret_10d = None
        pk_10d = None
        
    # 2. 22 Trading Days Horizon / 1 Month (Positional Swing)
    valid_1m = (forward_bars >= 22)
    if valid_1m:
        b_1m = entry_bar + 22
        ret_1m = round(((c[b_1m] - entry_price) / entry_price) * 100.0, 2)
        pk_1m = round(((np.max(h[entry_bar:b_1m + 1]) - entry_price) / entry_price) * 100.0, 2)
    else:
        ret_1m = None
        pk_1m = None
        
    # 3. 63 Trading Days Horizon / 3 Months (Multi-month Positional)
    valid_3m = (forward_bars >= 63)
    if valid_3m:
        b_63 = entry_bar + 63
        ret_3m = round(((c[b_63] - entry_price) / entry_price) * 100.0, 2)
        pk_3m = round(((np.max(h[entry_bar:b_63 + 1]) - entry_price) / entry_price) * 100.0, 2)
    else:
        ret_3m = None
        pk_3m = None
        
    # Intuitive commercial status tagging
    if valid_1m and ret_1m is not None:
        if ret_1m >= 1.5 or (ret_10d is not None and ret_10d >= 2.0 and ret_1m >= 0):
            st = "PROFIT"
        elif ret_1m >= -2.0:
            st = "CONSOLIDATION"
        else:
            st = "DRAWDOWN"
    elif valid_10 and ret_10d is not None:
        if ret_10d >= 2.0:
            st = "PROFIT"
        elif ret_10d >= -2.0:
            st = "CONSOLIDATION"
        else:
            st = "DRAWDOWN"
    else:
        st = "HOLDING"
        
    return {
        'st': st,
        'entry_bar': entry_bar,
        'd': d[entry_bar],
        'ent': entry_price,
        'pk': pk_gain,
        'dur': dur,
        'r10d': ret_10d,
        'r1m': ret_1m,
        'r3m': ret_3m,
        'pk10': pk_10d,
        'pk1m': pk_1m,
        'pk3m': pk_3m,
        'valid_10': valid_10,
        'valid_1m': valid_1m,
        'valid_3m': valid_3m
    }


def generate_backtest_suite() -> Dict[str, Any]:
    """Generates the full commercial backtest database across all 12 setups and exports static JSON."""
    stock_data, symbol_meta = load_dataset()
    
    t_start = time.time()
    output_data = {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "universe_size": len(stock_data),
            "period": "1 Year Daily OHLCV (Nov 2025 - Nov 2026)",
            "model": "Commercial Forward Holding & Peak Momentum Model",
            "entry_anchor": "Support 1 Buffer Retest (±0.8%) on T+1/T+2",
            "horizons": "10D (Short-term Swing), 1M / 30D (Positional Swing), 3M / 63D (Multi-month Positional)",
            "setups_count": len(SETUPS)
        },
        "setups": {}
    }
    
    print("\n" + "=" * 105)
    print(f"{'SETUP NAME':<28} | {'CAT':<5} | {'SIGNALS':<7} | {'FILLS':<6} | {'10D WR (AVG)':<14} | {'1M WR (AVG, PEAK)':<20} | {'3M WR (AVG, PEAK)':<20}")
    print("=" * 105)
    
    for setup in SETUPS:
        s_id = setup["id"]
        setup_signals = 0
        filled_trades = []
        
        for sym, sd in stock_data.items():
            sig_list = scan_setup_signals(sym, sd, s_id)
            setup_signals += len(sig_list)
            for t, s1 in sig_list:
                tr = simulate_commercial_forward(sd, t, s1)
                if tr and tr.get('st') not in [None, 'UNFILLED']:
                    meta = symbol_meta.get(sym, {})
                    tr['s'] = sym
                    tr['sec'] = meta.get('sector', 'Other')
                    filled_trades.append(tr)
                    
        filled_count = len(filled_trades)
        fill_rate = round((filled_count / setup_signals * 100.0), 1) if setup_signals > 0 else 0
        
        def compute_horizon_stats(k_ret: str, k_pk: str, k_valid: str) -> Dict[str, Any]:
            sub = [tr for tr in filled_trades if tr.get(k_valid) and tr.get(k_ret) is not None]
            if not sub:
                return {"win_rate": 0, "avg_return": 0, "avg_peak": 0, "max_peak": 0, "avg_days": 0, "samples": 0}
            
            wins = [tr for tr in sub if tr[k_ret] > 0.0]
            wr = round((len(wins) / len(sub)) * 100.0, 1)
            avg_ret = round(float(np.mean([tr[k_ret] for tr in sub])), 2)
            avg_pk = round(float(np.mean([tr[k_pk] for tr in sub])), 2)
            max_pk = round(float(np.max([tr[k_pk] for tr in sub])), 2)
            avg_days = round(float(np.mean([tr.get('dur', 25) for tr in sub])), 1)
            
            return {
                "win_rate": wr,
                "avg_return": avg_ret,
                "avg_peak": avg_pk,
                "max_peak": max_pk,
                "avg_days": avg_days,
                "samples": len(sub)
            }
            
        m10 = compute_horizon_stats('r10d', 'pk10', 'valid_10')
        m1m = compute_horizon_stats('r1m', 'pk1m', 'valid_1m')
        m3m = compute_horizon_stats('r3m', 'pk3m', 'valid_3m')
        
        # Balanced trade selection:
        # Include 3 recent active trades (most recent entries) + 9 mature completed trades (valid_3m == True)
        filled_trades.sort(key=lambda x: x['d'], reverse=True)
        
        recent_pool = [x for x in filled_trades if not x.get('valid_3m')]
        mature_pool = [x for x in filled_trades if x.get('valid_3m')]
        
        selected_recent = []
        seen_syms = set()
        for r in recent_pool:
            if r['s'] not in seen_syms:
                seen_syms.add(r['s'])
                selected_recent.append(r)
                if len(selected_recent) >= 3:
                    break
                    
        selected_mature = []
        if len(mature_pool) <= 9:
            selected_mature = mature_pool
        else:
            step = max(1, len(mature_pool) // 9)
            for i in range(0, len(mature_pool), step):
                cand = mature_pool[i]
                if cand['s'] not in seen_syms:
                    seen_syms.add(cand['s'])
                    selected_mature.append(cand)
                if len(selected_mature) >= 9:
                    break
            for cand in mature_pool:
                if len(selected_mature) >= 9:
                    break
                if cand['s'] not in seen_syms:
                    seen_syms.add(cand['s'])
                    selected_mature.append(cand)
                    
        if len(selected_mature) + len(selected_recent) < 12:
            for cand in filled_trades:
                if cand['s'] not in seen_syms:
                    seen_syms.add(cand['s'])
                    selected_recent.append(cand)
                if len(selected_mature) + len(selected_recent) >= 12:
                    break
                    
        recent_sample = selected_recent + selected_mature
        recent_sample.sort(key=lambda x: x['d'], reverse=True)
        
        formatted_trades = []
        for tr in recent_sample:
            formatted_trades.append({
                "s": tr['s'],
                "sec": tr['sec'],
                "d": tr['d'],
                "ent": tr['ent'],
                "pk": tr['pk'],
                "dur": tr['dur'],
                "r10d": tr['r10d'],
                "r1m": tr['r1m'],
                "r3m": tr['r3m'],
                "st": tr['st']
            })
            
        output_data["setups"][s_id] = {
            "id": s_id,
            "name": setup["name"],
            "cat": setup["category"],
            "support": setup["support"],
            "sig": setup_signals,
            "fill": filled_count,
            "fill_pct": fill_rate,
            "m10": m10,
            "m1m": m1m,
            "m3m": m3m,
            "trades": formatted_trades
        }
        
        cat_short = "Quick" if "Quick" in setup["category"] else "Adv"
        str_10 = f"{m10['win_rate']}% ({m10['avg_return']:+.1f}%)"
        str_1m = f"{m1m['win_rate']}% ({m1m['avg_return']:+.1f}%, pk {m1m['avg_peak']}%)"
        str_3m = f"{m3m['win_rate']}% ({m3m['avg_return']:+.1f}%, pk {m3m['avg_peak']}%)"
        print(f"{setup['name']:<28} | {cat_short:<5} | {setup_signals:<7} | {filled_count:<6} | {str_10:<14} | {str_1m:<20} | {str_3m:<20}")
        
    print("=" * 105 + "\n")
    
    # Save compact static JSON (< 35 KB payload target)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output_data, f, separators=(',', ':'))
        
    file_size_bytes = OUTPUT_PATH.stat().st_size
    file_size_kb = file_size_bytes / 1024.0
    
    print(f"✅ Commercial backtest dataset saved to: {OUTPUT_PATH}")
    print(f"📦 Output Payload Size: {file_size_kb:.2f} KB ({file_size_bytes:,} bytes) [Target: < 35 KB]")
    print(f"⏱️ Total Execution Time: {time.time() - t_start:.2f} seconds\n")
    
    return output_data


if __name__ == "__main__":
    generate_backtest_suite()
