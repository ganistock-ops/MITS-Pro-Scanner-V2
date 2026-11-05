#!/usr/bin/env python3
"""
scripts/generate_backtest_data.py
MITS Pro Scanner V2 - Strategy & Backtest Offline Performance Generator
========================================================================
Decoupled quantitative backtest engine evaluating all 12 Scanners:
- 6 Quick Scanners (Bottom Reversal, Alpha Momentum, HTF, Weekly Swing, Pullback, DBR)
- 6 Advanced Institutional Scanners (RS Leaderboard, Early Breakout VCP, Momentum Continuation,
  Rally Base Rally, Confluence Engine, Wyckoff Absorption)

Modeling & Conservative Institutional Execution Rules:
1. Entry Anchor: Retest of Support 1 zone (Support 1 ± 0.8% buffer) on Day T+1 or T+2.
   If runaway, tag as UNFILLED.
2. Stop Loss: Fixed -5.0% below Support 1 (Support 1 * 0.95).
3. Slippage / Gap-Down: If Open <= SL, exit at Open.
4. Ambiguous Same-Candle Collision: If Low <= SL and High >= Target 1, SL takes precedence.
5. Evaluation Horizons: 20D (20 sessions), 1M (22 sessions), and 3M (63 sessions).
6. Targets: Target 1 (+10.0%), Target 2 (+15.0%), and Time-exit at Day 63 Close.
7. Payload Constraint: Static export to data/strategy_backtest_data.json (< 35 KB).
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


def simulate_forward_execution(sd: Dict[str, Any], t: int, support_1: float) -> Optional[Dict[str, Any]]:
    """
    Executes institutional conservative forward walk:
    - Retest fill: Day T+1 or T+2 must test Support 1 zone (Support 1 ± 0.8%).
    - Stop loss: Fixed -5.0% below Support 1.
    - Slippage: Gap-down opens below SL exit at Open price.
    - Collision precedence: Same-candle Low <= SL and High >= T1 counted as SL hit.
    - Targets: Target 1 (+10%), Target 2 (+15%), Time exit at Day 63.
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
    sl = round(support_1 * 0.95, 2)
    
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
        return {'status': 'UNFILLED'}
        
    t1 = round(entry_price * 1.10, 2)
    t2 = round(entry_price * 1.15, 2)
    
    max_horizon = 63
    end_bar = min(entry_bar + max_horizon, n - 1)
    
    peak_high = h[entry_bar]
    days_to_peak = 0
    
    hit_t1 = False
    hit_t2 = False
    hit_sl = False
    t1_bar = None
    t2_bar = None
    sl_bar = None
    sl_exit_price = sl
    
    for b in range(entry_bar, end_bar + 1):
        cur_h = h[b]
        cur_l = l[b]
        cur_o = o[b]
        
        if cur_h > peak_high:
            peak_high = cur_h
            days_to_peak = b - entry_bar
            
        # Ambiguous collision: Low <= SL and High >= T1 on same candle
        if not hit_t1 and cur_l <= sl and cur_h >= t1:
            hit_sl = True
            sl_bar = b
            sl_exit_price = sl
            break
            
        # Stop loss check
        if not hit_t1 and cur_l <= sl:
            hit_sl = True
            sl_bar = b
            sl_exit_price = cur_o if cur_o <= sl else sl
            break
            
        # Target 1 check (+10%)
        if not hit_t1 and cur_h >= t1:
            hit_t1 = True
            t1_bar = b
            
        # Target 2 check (+15%)
        if hit_t1 and cur_h >= t2:
            hit_t2 = True
            t2_bar = b
            break
            
        # Trailing breakeven protection after Target 1 is booked
        if hit_t1 and cur_l <= entry_price:
            break
            
    # Resolve status and exit pricing
    if hit_t2:
        status = "WIN_T2"
        exit_price = t2
        exit_bar = t2_bar
        overall_ret = 15.0
    elif hit_t1:
        status = "WIN_T1"
        exit_price = t1
        exit_bar = t1_bar
        overall_ret = 10.0
    elif hit_sl:
        status = "STOP_LOSS"
        exit_price = sl_exit_price
        exit_bar = sl_bar
        overall_ret = round(((exit_price - entry_price) / entry_price) * 100.0, 2)
    elif end_bar == entry_bar + max_horizon:
        status = "TIME_EXIT"
        exit_price = c[end_bar]
        exit_bar = end_bar
        overall_ret = round(((exit_price - entry_price) / entry_price) * 100.0, 2)
    else:
        status = "OPEN"
        exit_price = c[end_bar]
        exit_bar = end_bar
        overall_ret = round(((exit_price - entry_price) / entry_price) * 100.0, 2)
        
    peak_gain_pct = round(((peak_high - entry_price) / entry_price) * 100.0, 2)
    
    # Multi-horizon return calculations (20D, 1M=22D, 3M=63D)
    def calc_horizon(h_bars: int) -> float:
        h_end = entry_bar + h_bars
        if h_end >= n:
            if exit_bar is not None and exit_bar < n:
                return overall_ret
            return round(((c[-1] - entry_price) / entry_price) * 100.0, 2)
            
        if exit_bar is not None and exit_bar <= h_end:
            return overall_ret
        else:
            return round(((c[h_end] - entry_price) / entry_price) * 100.0, 2)
            
    ret_20d = calc_horizon(20)
    ret_1m = calc_horizon(22)
    ret_3m = calc_horizon(63)
    
    return {
        'status': status,
        'entry_bar': entry_bar,
        'entry_date': d[entry_bar],
        'trigger_date': d[t],
        'entry_price': entry_price,
        'sl': sl,
        't1': t1,
        't2': t2,
        'peak_gain_pct': peak_gain_pct,
        'days_to_peak': days_to_peak,
        'overall_ret_pct': overall_ret,
        'ret_20d': ret_20d,
        'ret_1m': ret_1m,
        'ret_3m': ret_3m,
        'exit_date': d[exit_bar] if exit_bar is not None else d[end_bar]
    }


def generate_backtest_suite() -> Dict[str, Any]:
    """Generates the full backtest database across all 12 setups and exports static JSON."""
    stock_data, symbol_meta = load_dataset()
    
    t_start = time.time()
    output_data = {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "universe_size": len(stock_data),
            "period": "1 Year Daily OHLCV (Nov 2025 - Nov 2026)",
            "execution_model": "Support 1 Buffer Retest (±0.8%) on T+1/T+2",
            "stop_loss": "-5.0% below Support 1 (Open if Gap-Down)",
            "targets": "Target 1 (+10.0%), Target 2 (+15.0%)",
            "setups_count": len(SETUPS)
        },
        "setups": {}
    }
    
    summary_rows = []
    
    print("\n" + "=" * 90)
    print(f"{'SETUP NAME':<30} | {'CAT':<5} | {'SIGNALS':<7} | {'FILLS':<6} | {'20D WR':<7} | {'1M WR':<7} | {'3M WR':<7} | {'1M PF':<5}")
    print("=" * 90)
    
    for setup in SETUPS:
        s_id = setup["id"]
        setup_signals = 0
        filled_trades = []
        
        for sym, sd in stock_data.items():
            sig_list = scan_setup_signals(sym, sd, s_id)
            setup_signals += len(sig_list)
            for t, s1 in sig_list:
                tr = simulate_forward_execution(sd, t, s1)
                if tr and tr['status'] != 'UNFILLED':
                    meta = symbol_meta.get(sym, {})
                    tr['sym'] = sym
                    tr['sec'] = meta.get('sector', 'Other')
                    filled_trades.append(tr)
                    
        filled_count = len(filled_trades)
        fill_rate = round((filled_count / setup_signals * 100.0), 1) if setup_signals > 0 else 0
        
        def compute_metrics(h_key: str) -> Dict[str, Any]:
            valid = [tr for tr in filled_trades if tr[h_key] is not None]
            if not valid:
                return {"win_rate": 0, "profit_factor": 0, "expectancy": 0, "avg_peak": 0, "samples": 0}
            
            rets = [tr[h_key] for tr in valid]
            gains = [r for r in rets if r > 0]
            losses = [abs(r) for r in rets if r < 0]
            
            wr = round((len(gains) / len(valid)) * 100.0, 1)
            pf = round(sum(gains) / sum(losses), 2) if losses and sum(losses) > 0 else 9.99
            exp = round(float(np.mean(rets)), 2)
            pk = round(float(np.mean([min(tr['peak_gain_pct'], 15.0) for tr in valid])), 2)
            
            return {
                "win_rate": wr,
                "profit_factor": pf,
                "expectancy": exp,
                "avg_peak": pk,
                "samples": len(valid)
            }
            
        m20 = compute_metrics('ret_20d')
        m1m = compute_metrics('ret_1m')
        m3m = compute_metrics('ret_3m')
        
        # Select Top 12 recent representative trades sorted by date descending
        filled_trades.sort(key=lambda x: x['entry_date'], reverse=True)
        recent_sample = filled_trades[:12]
        
        formatted_trades = []
        for tr in recent_sample:
            formatted_trades.append({
                "s": tr['sym'],
                "sec": tr['sec'],
                "d": tr['entry_date'],
                "ent": tr['entry_price'],
                "sl": tr['sl'],
                "t1": tr['t1'],
                "t2": tr['t2'],
                "pk": tr['peak_gain_pct'],
                "dur": tr['days_to_peak'],
                "r20": tr['ret_20d'],
                "r1m": tr['ret_1m'],
                "r3m": tr['ret_3m'],
                "st": tr['status']
            })
            
        output_data["setups"][s_id] = {
            "id": s_id,
            "name": setup["name"],
            "cat": setup["category"],
            "support": setup["support"],
            "sig": setup_signals,
            "fill": filled_count,
            "fill_pct": fill_rate,
            "m20": m20,
            "m1m": m1m,
            "m3m": m3m,
            "trades": formatted_trades
        }
        
        cat_short = "Quick" if "Quick" in setup["category"] else "Adv"
        print(f"{setup['name']:<30} | {cat_short:<5} | {setup_signals:<7} | {filled_count:<6} | {m20['win_rate']:<6}% | {m1m['win_rate']:<6}% | {m3m['win_rate']:<6}% | {m1m['profit_factor']:<5}")
        summary_rows.append({
            "setup": setup["name"],
            "cat": setup["category"],
            "signals": setup_signals,
            "fills": filled_count,
            "fill_rate": fill_rate,
            "m1m_wr": m1m["win_rate"],
            "m1m_pf": m1m["profit_factor"],
            "m1m_exp": m1m["expectancy"]
        })
        
    print("=" * 90 + "\n")
    
    # Save compact JSON (< 35 KB payload target)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output_data, f, separators=(',', ':'))
        
    file_size_bytes = OUTPUT_PATH.stat().st_size
    file_size_kb = file_size_bytes / 1024.0
    
    print(f"✅ Static backtest dataset saved to: {OUTPUT_PATH}")
    print(f"📦 Output Payload Size: {file_size_kb:.2f} KB ({file_size_bytes:,} bytes) [Target: < 35 KB]")
    print(f"⏱️ Total Execution Time: {time.time() - t_start:.2f} seconds\n")
    
    return output_data


if __name__ == "__main__":
    generate_backtest_suite()

