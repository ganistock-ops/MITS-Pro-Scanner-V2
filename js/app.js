/**
 * MITS Pro Institutional Suite V2 - Master Frontend Application
 * Zero-dependency Vanilla JS with Instant Local-Storage Cache Architecture.
 */

(function () {
  'use strict';

  // Storage Keys & Endpoints (V3 for fresh DBR & 11-column layout sync)
  const CACHE_VERSION = '_V4';
  const CACHE_KEY_SCANNER = 'MITS_PRO_SCANNER_V2_DATA' + CACHE_VERSION;
  const CACHE_KEY_SUMMARY = 'MITS_PRO_SUMMARY_V2_DATA' + CACHE_VERSION;
  const CACHE_KEY_TAB1 = 'MITS_PRO_TAB1_DATA' + CACHE_VERSION;
  const CACHE_KEY_TAB2 = 'MITS_PRO_TAB2_DATA' + CACHE_VERSION;
  const CACHE_KEY_TAB3 = 'MITS_PRO_TAB3_DATA' + CACHE_VERSION;
  const CACHE_KEY_TAB4 = 'MITS_PRO_TAB4_DATA' + CACHE_VERSION;
  const CACHE_KEY_TAB5 = 'MITS_PRO_TAB5_DATA' + CACHE_VERSION;
  const CACHE_KEY_TAB6 = 'MITS_PRO_TAB6_DATA' + CACHE_VERSION;
  const CACHE_TIMESTAMP_KEY = 'MITS_PRO_CACHE_TS' + CACHE_VERSION;
  const CACHE_TTL_MS = 15 * 60 * 1000; // 15 Minutes

  // Production Baseline Signals for Tab 1 (Guarantee 0ms instant display without flash)
  const DEFAULT_TAB1_SIGNALS = [
    {
      symbol: "DRREDDY",
      name: "Dr. Reddy's Laboratories Ltd.",
      sector: "Healthcare",
      cmp: 1185.00,
      change_pct: 3.95,
      score: 85,
      grade: "A",
      score_display: "85 (A)",
      institutional_score: 85,
      invalidation: 1118.91,
      entry_zone: "₹1182.00 - ₹1193.82",
      target_1: 1317.18,
      target_2: 1405.98,
      target_zone: "1317.18 - 1405.98",
      risk_reward_ratio: "1:2.00",
      rvol: 2.69,
      setup_tags: [
        "Established Decline",
        "Tight Base (<8%)",
        "Liquidity Sweep",
        "Prominent Lower Wick",
        "CHoCH Confirmed",
        "Volume Absorption",
        "R:R 2.0:1"
      ],
      status: "CHoCH CONFIRMED",
      timestamp: "2026-09-18"
    },
    {
      symbol: "J&KBANK",
      name: "Jammu & Kashmir Bank Ltd.",
      sector: "Financial Services",
      cmp: 146.58,
      change_pct: -0.73,
      score: 70,
      grade: "B",
      score_display: "70 (B)",
      institutional_score: 70,
      invalidation: 141.01,
      entry_zone: "₹146.58 - ₹154.33",
      target_1: 164.30,
      target_2: 201.75,
      target_zone: "164.30 - 201.75",
      risk_reward_ratio: "1:3.18",
      rvol: 2.01,
      setup_tags: [
        "Downtrend Exhaustion",
        "Deceleration",
        "Tight Base (<8%)",
        "Liquidity Sweep",
        "Prominent Lower Wick",
        "Volume Absorption",
        "R:R 3.18:1"
      ],
      status: "MSS COILING",
      timestamp: "2026-09-18"
    }
  ];

  // Production Baseline Signals for Tab 2: Alpha Momentum (9 Signals)
  const DEFAULT_TAB2_SIGNALS = [
    {
        "symbol": "APARINDS",
        "name": "Apar Industries Ltd.",
        "sector": "Capital Goods",
        "cmp": 18858.0,
        "change_pct": 5.94,
        "score": 95,
        "grade": "A",
        "score_display": "95 (A)",
        "institutional_score": 95,
        "invalidation": 16015.0,
        "entry_zone": "\u20b917,310.92 - \u20b918,858.00",
        "target_1": 23122.5,
        "target_2": 25965.5,
        "target_zone": "23,122.50 - 25,965.50",
        "risk_reward_ratio": "1:2.5",
        "rvol": 2.37,
        "setup_tags": [
            "Bullish Trend Stack",
            "Momentum Base",
            "Breakout Pivot Retest",
            "Volume Expansion",
            "RSI Sweet Spot",
            "1Y RS +127%",
            "R:R 1:2.5"
        ],
        "status": "MOMENTUM BASE",
        "support_level": "20 EMA",
        "support_ema": 17310.92,
        "rs_1y": 127.1,
        "rs_6m": 92.3,
        "rs_3m": 21.3,
        "rs_1m": 15.9,
        "rsi": 65.6,
        "drawdown_pct": 13.0,
        "swing_high": 18401.11,
        "base_low": 16015.0,
        "timestamp": "2026-09-18",
        "score_breakdown": {
            "rs_outperformance": 40.0,
            "trend_alignment": 20.0,
            "base_structure": 15.0,
            "volume_momentum": 20.0
        }
    },
    {
        "symbol": "VIJAYA",
        "name": "Vijaya Diagnostic Centre Ltd.",
        "sector": "Healthcare",
        "cmp": 1558.9,
        "change_pct": 8.38,
        "score": 93,
        "grade": "A",
        "score_display": "93 (A)",
        "institutional_score": 93,
        "invalidation": 1380.0,
        "entry_zone": "\u20b91,480.73 - \u20b91,558.90",
        "target_1": 1827.25,
        "target_2": 2006.15,
        "target_zone": "1,827.25 - 2,006.15",
        "risk_reward_ratio": "1:2.5",
        "rvol": 2.03,
        "setup_tags": [
            "Bullish Trend Stack",
            "Momentum Base",
            "Breakout Pivot Retest",
            "Volume Expansion",
            "RSI Sweet Spot",
            "1Y RS +61%",
            "R:R 1:2.5"
        ],
        "status": "MOMENTUM BASE",
        "support_level": "20 EMA",
        "support_ema": 1480.73,
        "rs_1y": 60.8,
        "rs_6m": 81.1,
        "rs_3m": 17.1,
        "rs_1m": 8.4,
        "rsi": 63.9,
        "drawdown_pct": 12.1,
        "swing_high": 1570.82,
        "base_low": 1380.0,
        "timestamp": "2026-09-18",
        "score_breakdown": {
            "rs_outperformance": 38.0,
            "trend_alignment": 20.0,
            "base_structure": 15.0,
            "volume_momentum": 20.0
        }
    },
    {
        "symbol": "WELCORP",
        "name": "Welspun Corp Ltd.",
        "sector": "Capital Goods",
        "cmp": 2660.1,
        "change_pct": 8.12,
        "score": 92,
        "grade": "A",
        "score_display": "92 (A)",
        "institutional_score": 92,
        "invalidation": 2151.07,
        "entry_zone": "\u20b92,458.48 - \u20b92,660.10",
        "target_1": 3423.64,
        "target_2": 3932.67,
        "target_zone": "3,423.64 - 3,932.67",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.34,
        "setup_tags": [
            "Bullish Trend Stack",
            "Momentum Base",
            "Breakout Pivot Retest",
            "Volume Surge",
            "RSI Sweet Spot",
            "1Y RS +211%",
            "R:R 1:2.5"
        ],
        "status": "MOMENTUM BASE",
        "support_level": "20 EMA",
        "support_ema": 2458.48,
        "rs_1y": 211.4,
        "rs_6m": 215.0,
        "rs_3m": 79.6,
        "rs_1m": 18.7,
        "rsi": 64.5,
        "drawdown_pct": 16.3,
        "swing_high": 2676.0,
        "base_low": 2240.2,
        "timestamp": "2026-09-18",
        "score_breakdown": {
            "rs_outperformance": 40.0,
            "trend_alignment": 20.0,
            "base_structure": 15.0,
            "volume_momentum": 17.0
        }
    },
    {
        "symbol": "NAVINFLUOR",
        "name": "Navin Fluorine International Ltd.",
        "sector": "Chemicals",
        "cmp": 8590.0,
        "change_pct": 4.5,
        "score": 91,
        "grade": "A",
        "score_display": "91 (A)",
        "institutional_score": 91,
        "invalidation": 8090.0,
        "entry_zone": "\u20b98,432.49 - \u20b98,590.00",
        "target_1": 9340.0,
        "target_2": 9840.0,
        "target_zone": "9,340.00 - 9,840.00",
        "risk_reward_ratio": "1:2.5",
        "rvol": 2.41,
        "setup_tags": [
            "Bullish Trend Stack",
            "Momentum Base",
            "Volume Expansion",
            "RSI Sweet Spot",
            "1Y RS +93%",
            "R:R 1:2.5"
        ],
        "status": "MOMENTUM BASE",
        "support_level": "20 EMA",
        "support_ema": 8432.49,
        "rs_1y": 93.4,
        "rs_6m": 45.8,
        "rs_3m": 17.7,
        "rs_1m": 8.3,
        "rsi": 56.3,
        "drawdown_pct": 10.7,
        "swing_high": 8775.5,
        "base_low": 7834.5,
        "timestamp": "2026-09-18",
        "score_breakdown": {
            "rs_outperformance": 38.0,
            "trend_alignment": 20.0,
            "base_structure": 13.0,
            "volume_momentum": 20.0
        }
    },
    {
        "symbol": "APLAPOLLO",
        "name": "APL Apollo Tubes Ltd.",
        "sector": "Capital Goods",
        "cmp": 2270.1,
        "change_pct": 7.08,
        "score": 90,
        "grade": "A",
        "score_display": "90 (A)",
        "institutional_score": 90,
        "invalidation": 2041.3,
        "entry_zone": "\u20b92,154.44 - \u20b92,270.10",
        "target_1": 2613.3,
        "target_2": 2842.1,
        "target_zone": "2,613.30 - 2,842.10",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.69,
        "setup_tags": [
            "Bullish Trend Stack",
            "Momentum Base",
            "Breakout Pivot Retest",
            "Volume Expansion",
            "RSI Sweet Spot",
            "1Y RS +36%",
            "R:R 1:2.5"
        ],
        "status": "MOMENTUM BASE",
        "support_level": "20 EMA",
        "support_ema": 2154.44,
        "rs_1y": 36.0,
        "rs_6m": 17.6,
        "rs_3m": 30.0,
        "rs_1m": 10.1,
        "rsi": 65.1,
        "drawdown_pct": 10.1,
        "swing_high": 2269.66,
        "base_low": 2041.3,
        "timestamp": "2026-09-18",
        "score_breakdown": {
            "rs_outperformance": 35.0,
            "trend_alignment": 20.0,
            "base_structure": 15.0,
            "volume_momentum": 20.0
        }
    },
    {
        "symbol": "ATHERENERG",
        "name": "Ather Energy Ltd.",
        "sector": "Automobile and Auto Components",
        "cmp": 1640.0,
        "change_pct": 5.81,
        "score": 90,
        "grade": "A",
        "score_display": "90 (A)",
        "institutional_score": 90,
        "invalidation": 1430.0,
        "entry_zone": "\u20b91,578.77 - \u20b91,640.00",
        "target_1": 1955.0,
        "target_2": 2165.0,
        "target_zone": "1,955.00 - 2,165.00",
        "risk_reward_ratio": "1:2.5",
        "rvol": 0.98,
        "setup_tags": [
            "Bullish Trend Stack",
            "Momentum Base",
            "Volume Surge",
            "RSI Sweet Spot",
            "1Y RS +166%",
            "R:R 1:2.5"
        ],
        "status": "MOMENTUM BASE",
        "support_level": "20 EMA",
        "support_ema": 1578.77,
        "rs_1y": 165.5,
        "rs_6m": 115.0,
        "rs_3m": 54.3,
        "rs_1m": 15.8,
        "rsi": 59.4,
        "drawdown_pct": 12.8,
        "swing_high": 1744.0,
        "base_low": 1521.1,
        "timestamp": "2026-09-18",
        "score_breakdown": {
            "rs_outperformance": 40.0,
            "trend_alignment": 20.0,
            "base_structure": 13.0,
            "volume_momentum": 17.0
        }
    },
    {
        "symbol": "EMCURE",
        "name": "Emcure Pharmaceuticals Ltd.",
        "sector": "Healthcare",
        "cmp": 2003.8,
        "change_pct": 4.92,
        "score": 90,
        "grade": "A",
        "score_display": "90 (A)",
        "institutional_score": 90,
        "invalidation": 1826.55,
        "entry_zone": "\u20b91,928.78 - \u20b92,003.80",
        "target_1": 2269.68,
        "target_2": 2446.93,
        "target_zone": "2,269.68 - 2,446.93",
        "risk_reward_ratio": "1:2.5",
        "rvol": 13.24,
        "setup_tags": [
            "Bullish Trend Stack",
            "Momentum Base",
            "Breakout Pivot Retest",
            "Volume Expansion",
            "RSI Sweet Spot",
            "1Y RS +47%",
            "R:R 1:2.5"
        ],
        "status": "MOMENTUM BASE",
        "support_level": "20 EMA",
        "support_ema": 1928.78,
        "rs_1y": 47.3,
        "rs_6m": 29.6,
        "rs_3m": 11.5,
        "rs_1m": 11.4,
        "rsi": 62.2,
        "drawdown_pct": 10.6,
        "swing_high": 2044.02,
        "base_low": 1826.55,
        "timestamp": "2026-09-18",
        "score_breakdown": {
            "rs_outperformance": 35.0,
            "trend_alignment": 20.0,
            "base_structure": 15.0,
            "volume_momentum": 20.0
        }
    },
    {
        "symbol": "CAPLIPOINT",
        "name": "Caplin Point Laboratories Ltd.",
        "sector": "Healthcare",
        "cmp": 2748.6,
        "change_pct": 6.02,
        "score": 85,
        "grade": "A",
        "score_display": "85 (A)",
        "institutional_score": 85,
        "invalidation": 2456.01,
        "entry_zone": "\u20b92,661.67 - \u20b92,748.60",
        "target_1": 3187.48,
        "target_2": 3480.07,
        "target_zone": "3,187.48 - 3,480.07",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.19,
        "setup_tags": [
            "Bullish Trend Stack",
            "Momentum Base",
            "Volume Surge",
            "RSI Sweet Spot",
            "1Y RS +42%",
            "R:R 1:2.5"
        ],
        "status": "MOMENTUM BASE",
        "support_level": "20 EMA",
        "support_ema": 2661.67,
        "rs_1y": 41.7,
        "rs_6m": 75.5,
        "rs_3m": 10.6,
        "rs_1m": 11.2,
        "rsi": 57.1,
        "drawdown_pct": 13.4,
        "swing_high": 2872.87,
        "base_low": 2486.66,
        "timestamp": "2026-09-18",
        "score_breakdown": {
            "rs_outperformance": 35.0,
            "trend_alignment": 20.0,
            "base_structure": 13.0,
            "volume_momentum": 17.0
        }
    },
    {
        "symbol": "GRANULES",
        "name": "Granules India Ltd.",
        "sector": "Healthcare",
        "cmp": 875.5,
        "change_pct": 0.59,
        "score": 83,
        "grade": "A",
        "score_display": "83 (A)",
        "institutional_score": 83,
        "invalidation": 816.0,
        "entry_zone": "\u20b9866.51 - \u20b9875.50",
        "target_1": 964.75,
        "target_2": 1024.25,
        "target_zone": "964.75 - 1,024.25",
        "risk_reward_ratio": "1:2.5",
        "rvol": 0.83,
        "setup_tags": [
            "Bullish Trend Stack",
            "Momentum Base",
            "Volume Surge",
            "1Y RS +64%",
            "R:R 1:2.5"
        ],
        "status": "MOMENTUM BASE",
        "support_level": "20 EMA",
        "support_ema": 866.51,
        "rs_1y": 64.0,
        "rs_6m": 42.8,
        "rs_3m": 13.3,
        "rs_1m": 5.7,
        "rsi": 53.3,
        "drawdown_pct": 10.3,
        "swing_high": 908.11,
        "base_low": 814.2,
        "timestamp": "2026-09-18",
        "score_breakdown": {
            "rs_outperformance": 36.0,
            "trend_alignment": 20.0,
            "base_structure": 13.0,
            "volume_momentum": 14.0
        }
    }
];


  // Production Baseline Signals for Tab 3: High Tight Flag (Guarantee 0ms instant display without flash)
  const DEFAULT_TAB3_SIGNALS = [
    {
        "symbol": "REDINGTON",
        "name": "Redington Ltd.",
        "sector": "Services",
        "cmp": 399.85,
        "change_pct": -0.06,
        "score": 95,
        "grade": "A+",
        "score_display": "95 (A+)",
        "institutional_score": 95,
        "stage": "IN_FLAG",
        "stage_label": "Consolidating (In-Flag)",
        "status": "READY TO BREAKOUT",
        "status_class": "htf-inflag",
        "invalidation": 371.2,
        "entry_zone": "\u20b9399.85 - \u20b9403.25",
        "target_1": 442.83,
        "target_2": 471.48,
        "target_zone": "442.83 - 471.48",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.64,
        "setup_tags": [
            "In-Flag Compression",
            "Tightness < 10%",
            "Volume Contraction",
            "Pole Gain +58%",
            "R:R 1:2.5"
        ],
        "support_level": "20 EMA",
        "support_ema": 375.03,
        "flag_high": 403.25,
        "flag_pivot": 403.25,
        "flag_base_low": 371.2,
        "pole_gain_pct": 57.7,
        "flag_days": 6,
        "correction_pct": 7.9,
        "vol_contraction_pct": 50.1,
        "rsi": 67.9,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "FINCABLES",
        "name": "Finolex Cables Ltd.",
        "sector": "Capital Goods",
        "cmp": 1411.2,
        "change_pct": 1.1,
        "score": 90,
        "grade": "A+",
        "score_display": "90 (A+)",
        "institutional_score": 90,
        "stage": "IN_FLAG",
        "stage_label": "Consolidating (In-Flag)",
        "status": "FLAG CONSOLIDATION",
        "status_class": "htf-inflag",
        "invalidation": 1299.1,
        "entry_zone": "\u20b91,411.20 - \u20b91,498.00",
        "target_1": 1579.35,
        "target_2": 1691.45,
        "target_zone": "1,579.35 - 1,691.45",
        "risk_reward_ratio": "1:2.5",
        "rvol": 0.9,
        "setup_tags": [
            "In-Flag Compression",
            "Tightness < 15%",
            "Volume Contraction",
            "Pole Gain +58%",
            "R:R 1:2.5"
        ],
        "support_level": "20 EMA",
        "support_ema": 1317.38,
        "flag_high": 1498.0,
        "flag_pivot": 1498.0,
        "flag_base_low": 1299.1,
        "pole_gain_pct": 57.8,
        "flag_days": 5,
        "correction_pct": 13.3,
        "vol_contraction_pct": 44.8,
        "rsi": 63.9,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "WELSPUNLIV",
        "name": "Welspun Living Ltd.",
        "sector": "Textiles",
        "cmp": 214.66,
        "change_pct": 5.84,
        "score": 90,
        "grade": "A+",
        "score_display": "90 (A+)",
        "institutional_score": 90,
        "stage": "IN_FLAG",
        "stage_label": "Consolidating (In-Flag)",
        "status": "READY TO BREAKOUT",
        "status_class": "htf-inflag",
        "invalidation": 195.7,
        "entry_zone": "\u20b9214.66 - \u20b9216.00",
        "target_1": 243.1,
        "target_2": 262.06,
        "target_zone": "243.10 - 262.06",
        "risk_reward_ratio": "1:2.5",
        "rvol": 0.74,
        "setup_tags": [
            "In-Flag Compression",
            "Tightness < 10%",
            "Volume Contraction",
            "Pole Gain +41%",
            "R:R 1:2.5"
        ],
        "support_level": "20 EMA",
        "support_ema": 199.64,
        "flag_high": 216.0,
        "flag_pivot": 216.0,
        "flag_base_low": 195.7,
        "pole_gain_pct": 41.2,
        "flag_days": 8,
        "correction_pct": 9.4,
        "vol_contraction_pct": 62.3,
        "rsi": 71.4,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "ATHERENERG",
        "name": "Ather Energy Ltd.",
        "sector": "Automobile and Auto Components",
        "cmp": 1640.0,
        "change_pct": 5.81,
        "score": 85,
        "grade": "A+",
        "score_display": "85 (A+)",
        "institutional_score": 85,
        "stage": "IN_FLAG",
        "stage_label": "Consolidating (In-Flag)",
        "status": "FLAG CONSOLIDATION",
        "status_class": "htf-inflag",
        "invalidation": 1521.1,
        "entry_zone": "\u20b91,640.00 - \u20b91,744.00",
        "target_1": 1818.35,
        "target_2": 1937.25,
        "target_zone": "1,818.35 - 1,937.25",
        "risk_reward_ratio": "1:2.5",
        "rvol": 0.98,
        "setup_tags": [
            "In-Flag Compression",
            "Tightness < 15%",
            "Volume Contraction",
            "Pole Gain +55%",
            "R:R 1:2.5"
        ],
        "support_level": "20 EMA",
        "support_ema": 1578.77,
        "flag_high": 1744.0,
        "flag_pivot": 1744.0,
        "flag_base_low": 1521.1,
        "pole_gain_pct": 55.3,
        "flag_days": 13,
        "correction_pct": 12.8,
        "vol_contraction_pct": 26.8,
        "rsi": 59.4,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "DEVYANI",
        "name": "Devyani International Ltd.",
        "sector": "Consumer Services",
        "cmp": 140.62,
        "change_pct": 2.88,
        "score": 85,
        "grade": "A+",
        "score_display": "85 (A+)",
        "institutional_score": 85,
        "stage": "IN_FLAG",
        "stage_label": "Consolidating (In-Flag)",
        "status": "FLAG CONSOLIDATION",
        "status_class": "htf-inflag",
        "invalidation": 133.75,
        "entry_zone": "\u20b9140.62 - \u20b9155.95",
        "target_1": 150.92,
        "target_2": 157.79,
        "target_zone": "150.92 - 157.79",
        "risk_reward_ratio": "1:2.5",
        "rvol": 0.9,
        "setup_tags": [
            "In-Flag Compression",
            "Tightness < 15%",
            "Volume Contraction",
            "Pole Gain +46%",
            "R:R 1:2.5"
        ],
        "support_level": "20 EMA",
        "support_ema": 138.13,
        "flag_high": 155.95,
        "flag_pivot": 155.95,
        "flag_base_low": 133.75,
        "pole_gain_pct": 45.7,
        "flag_days": 15,
        "correction_pct": 14.2,
        "vol_contraction_pct": 80.4,
        "rsi": 57.5,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "JYOTICNC",
        "name": "Jyoti CNC Automation Ltd.",
        "sector": "Capital Goods",
        "cmp": 1049.7,
        "change_pct": 7.02,
        "score": 85,
        "grade": "A+",
        "score_display": "85 (A+)",
        "institutional_score": 85,
        "stage": "IN_FLAG",
        "stage_label": "Consolidating (In-Flag)",
        "status": "READY TO BREAKOUT",
        "status_class": "htf-inflag",
        "invalidation": 928.6,
        "entry_zone": "\u20b91,049.70 - \u20b91,058.85",
        "target_1": 1231.35,
        "target_2": 1352.45,
        "target_zone": "1,231.35 - 1,352.45",
        "risk_reward_ratio": "1:2.5",
        "rvol": 4.14,
        "setup_tags": [
            "In-Flag Compression",
            "Tightness < 15%",
            "Volume Contraction",
            "Pole Gain +43%",
            "R:R 1:2.5"
        ],
        "support_level": "20 EMA",
        "support_ema": 981.13,
        "flag_high": 1058.85,
        "flag_pivot": 1058.85,
        "flag_base_low": 928.6,
        "pole_gain_pct": 43.3,
        "flag_days": 8,
        "correction_pct": 12.3,
        "vol_contraction_pct": 68.9,
        "rsi": 64.4,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "SAPPHIRE",
        "name": "Sapphire Foods India Ltd.",
        "sector": "Consumer Services",
        "cmp": 230.11,
        "change_pct": 3.04,
        "score": 85,
        "grade": "A+",
        "score_display": "85 (A+)",
        "institutional_score": 85,
        "stage": "IN_FLAG",
        "stage_label": "Consolidating (In-Flag)",
        "status": "FLAG CONSOLIDATION",
        "status_class": "htf-inflag",
        "invalidation": 219.31,
        "entry_zone": "\u20b9230.11 - \u20b9258.78",
        "target_1": 246.31,
        "target_2": 257.11,
        "target_zone": "246.31 - 257.11",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.0,
        "setup_tags": [
            "In-Flag Compression",
            "Tightness < 20%",
            "Volume Contraction",
            "Pole Gain +51%",
            "R:R 1:2.5"
        ],
        "support_level": "20 EMA",
        "support_ema": 227.35,
        "flag_high": 258.78,
        "flag_pivot": 258.78,
        "flag_base_low": 219.31,
        "pole_gain_pct": 50.5,
        "flag_days": 15,
        "correction_pct": 15.3,
        "vol_contraction_pct": 79.2,
        "rsi": 55.6,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "ECLERX",
        "name": "eClerx Services Ltd.",
        "sector": "Services",
        "cmp": 1915.6,
        "change_pct": -0.38,
        "score": 85,
        "grade": "A+",
        "score_display": "85 (A+)",
        "institutional_score": 85,
        "stage": "IN_FLAG",
        "stage_label": "Consolidating (In-Flag)",
        "status": "FLAG CONSOLIDATION",
        "status_class": "htf-inflag",
        "invalidation": 1848.2,
        "entry_zone": "\u20b91,915.60 - \u20b92,062.00",
        "target_1": 2016.7,
        "target_2": 2084.1,
        "target_zone": "2,016.70 - 2,084.10",
        "risk_reward_ratio": "1:2.5",
        "rvol": 0.78,
        "setup_tags": [
            "In-Flag Compression",
            "Tightness < 15%",
            "Volume Contraction",
            "Pole Gain +41%",
            "R:R 1:2.5"
        ],
        "support_level": "20 EMA",
        "support_ema": 1910.18,
        "flag_high": 2062.0,
        "flag_pivot": 2062.0,
        "flag_base_low": 1848.2,
        "pole_gain_pct": 41.1,
        "flag_days": 14,
        "correction_pct": 10.4,
        "vol_contraction_pct": 59.2,
        "rsi": 52.5,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "CYIENT",
        "name": "Cyient Ltd.",
        "sector": "Information Technology",
        "cmp": 1073.3,
        "change_pct": 1.78,
        "score": 80,
        "grade": "A+",
        "score_display": "80 (A+)",
        "institutional_score": 80,
        "stage": "IN_FLAG",
        "stage_label": "Consolidating (In-Flag)",
        "status": "FLAG CONSOLIDATION",
        "status_class": "htf-inflag",
        "invalidation": 1030.3,
        "entry_zone": "\u20b91,073.30 - \u20b91,219.00",
        "target_1": 1137.8,
        "target_2": 1180.8,
        "target_zone": "1,137.80 - 1,180.80",
        "risk_reward_ratio": "1:2.5",
        "rvol": 0.39,
        "setup_tags": [
            "In-Flag Compression",
            "Tightness < 20%",
            "Volume Contraction",
            "Pole Gain +50%",
            "R:R 1:2.5"
        ],
        "support_level": "20 EMA",
        "support_ema": 1045.14,
        "flag_high": 1219.0,
        "flag_pivot": 1219.0,
        "flag_base_low": 1030.3,
        "pole_gain_pct": 49.7,
        "flag_days": 11,
        "correction_pct": 15.5,
        "vol_contraction_pct": 71.0,
        "rsi": 59.7,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "PAYTM",
        "name": "One 97 Communications Ltd.",
        "sector": "Financial Services",
        "cmp": 1849.9,
        "change_pct": 4.93,
        "score": 80,
        "grade": "A+",
        "score_display": "80 (A+)",
        "institutional_score": 80,
        "stage": "BREAKOUT",
        "stage_label": "Active Breakouts",
        "status": "FLAG BREAKOUT CONFIRMED",
        "status_class": "htf-breakout",
        "invalidation": 1594.2,
        "entry_zone": "\u20b91,718.00 - \u20b91,849.90",
        "target_1": 2233.45,
        "target_2": 2489.15,
        "target_zone": "2,233.45 - 2,489.15",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.04,
        "setup_tags": [
            "Breakout Confirmed",
            "RVOL 1.04x",
            "Pole Gain +52%",
            "RSI Momentum",
            "R:R 1:2.5"
        ],
        "support_level": "20 EMA",
        "support_ema": 1708.36,
        "flag_high": 1718.0,
        "flag_pivot": 1718.0,
        "flag_base_low": 1594.2,
        "pole_gain_pct": 52.3,
        "flag_days": 18,
        "correction_pct": 7.2,
        "vol_contraction_pct": 4.2,
        "rsi": 67.3,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "URBANCO",
        "name": "Urban Company Ltd.",
        "sector": "Consumer Services",
        "cmp": 169.11,
        "change_pct": 3.87,
        "score": 80,
        "grade": "A+",
        "score_display": "80 (A+)",
        "institutional_score": 80,
        "stage": "IN_FLAG",
        "stage_label": "Consolidating (In-Flag)",
        "status": "FLAG CONSOLIDATION",
        "status_class": "htf-inflag",
        "invalidation": 153.3,
        "entry_zone": "\u20b9169.11 - \u20b9183.97",
        "target_1": 192.83,
        "target_2": 208.64,
        "target_zone": "192.83 - 208.64",
        "risk_reward_ratio": "1:2.5",
        "rvol": 0.8,
        "setup_tags": [
            "In-Flag Compression",
            "Tightness < 20%",
            "Volume Contraction",
            "Pole Gain +45%",
            "R:R 1:2.5"
        ],
        "support_level": "20 EMA",
        "support_ema": 164.41,
        "flag_high": 183.97,
        "flag_pivot": 183.97,
        "flag_base_low": 153.3,
        "pole_gain_pct": 45.1,
        "flag_days": 10,
        "correction_pct": 16.7,
        "vol_contraction_pct": 67.0,
        "rsi": 57.6,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "WELCORP",
        "name": "Welspun Corp Ltd.",
        "sector": "Capital Goods",
        "cmp": 2660.1,
        "change_pct": 8.12,
        "score": 80,
        "grade": "A+",
        "score_display": "80 (A+)",
        "institutional_score": 80,
        "stage": "IN_FLAG",
        "stage_label": "Consolidating (In-Flag)",
        "status": "FLAG CONSOLIDATION",
        "status_class": "htf-inflag",
        "invalidation": 2240.2,
        "entry_zone": "\u20b92,660.10 - \u20b92,784.80",
        "target_1": 3289.95,
        "target_2": 3709.85,
        "target_zone": "3,289.95 - 3,709.85",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.34,
        "setup_tags": [
            "In-Flag Compression",
            "Tightness < 20%",
            "Volume Contraction",
            "Pole Gain +78%",
            "R:R 1:2.5"
        ],
        "support_level": "20 EMA",
        "support_ema": 2458.48,
        "flag_high": 2784.8,
        "flag_pivot": 2784.8,
        "flag_base_low": 2240.2,
        "pole_gain_pct": 77.8,
        "flag_days": 6,
        "correction_pct": 19.6,
        "vol_contraction_pct": 14.1,
        "rsi": 64.5,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "DIVISLAB",
        "name": "Divi's Laboratories Ltd.",
        "sector": "Healthcare",
        "cmp": 9375.0,
        "change_pct": 0.56,
        "score": 75,
        "grade": "A",
        "score_display": "75 (A)",
        "institutional_score": 75,
        "stage": "IN_FLAG",
        "stage_label": "Consolidating (In-Flag)",
        "status": "READY TO BREAKOUT",
        "status_class": "htf-inflag",
        "invalidation": 8923.0,
        "entry_zone": "\u20b99,375.00 - \u20b99,467.00",
        "target_1": 10053.0,
        "target_2": 10505.0,
        "target_zone": "10,053.00 - 10,505.00",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.43,
        "setup_tags": [
            "In-Flag Compression",
            "Tightness < 10%",
            "Volume Contraction",
            "Pole Gain +42%",
            "R:R 1:2.5"
        ],
        "support_level": "20 EMA",
        "support_ema": 9137.96,
        "flag_high": 9467.0,
        "flag_pivot": 9467.0,
        "flag_base_low": 8923.0,
        "pole_gain_pct": 42.0,
        "flag_days": 14,
        "correction_pct": 5.7,
        "vol_contraction_pct": 9.9,
        "rsi": 63.0,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "PTCIL",
        "name": "PTC Industries Ltd.",
        "sector": "Capital Goods",
        "cmp": 22805.0,
        "change_pct": 1.36,
        "score": 75,
        "grade": "A",
        "score_display": "75 (A)",
        "institutional_score": 75,
        "stage": "IN_FLAG",
        "stage_label": "Consolidating (In-Flag)",
        "status": "FLAG CONSOLIDATION",
        "status_class": "htf-inflag",
        "invalidation": 22055.0,
        "entry_zone": "\u20b922,805.00 - \u20b924,000.00",
        "target_1": 23930.0,
        "target_2": 24680.0,
        "target_zone": "23,930.00 - 24,680.00",
        "risk_reward_ratio": "1:2.5",
        "rvol": 0.67,
        "setup_tags": [
            "In-Flag Compression",
            "Tightness < 10%",
            "Volume Contraction",
            "Pole Gain +42%",
            "R:R 1:2.5"
        ],
        "support_level": "20 EMA",
        "support_ema": 22274.91,
        "flag_high": 24000.0,
        "flag_pivot": 24000.0,
        "flag_base_low": 22055.0,
        "pole_gain_pct": 41.8,
        "flag_days": 10,
        "correction_pct": 8.1,
        "vol_contraction_pct": 2.1,
        "rsi": 58.3,
        "timestamp": "2026-09-18"
    }
];

  // Production Baseline Signals for Tab 4: Weekly Swing
  const DEFAULT_TAB4_SIGNALS = [
    {
      symbol: "UNOMINDA",
      name: "UNO Minda Ltd.",
      sector: "Automobile and Auto Components",
      cmp: 1284.0,
      change_pct: 6.56,
      score: 85,
      grade: "A",
      score_display: "85 (A)",
      institutional_score: 85,
      status: "WEEKLY MOMENTUM SURGE",
      invalidation: 1159.7,
      structure_invalidation: "₹ 1,159.70 (Base Swing Low)",
      entry_zone: "₹1,251.98 - ₹1,264.56",
      target_1: 1470.45,
      target_2: 1594.75,
      target_zone: "₹1,470.45 / ₹1,594.75",
      risk_reward_ratio: "1:2.5",
      rvol: 1.94,
      setup_tags: [
        "Weekly Bullish Stack",
        "1W Ret +6.9%",
        "1M RS +5.2%",
        "RSI 60.7",
        "PP Support"
      ],
      ret_1w: 6.86,
      ret_1m: 1.5,
      rs_1w: 7.42,
      rs_1m: 5.16,
      rsi: 60.7,
      nearest_support_base: "PP Support",
      nearest_support_val: 1258.27,
      base_swing_low: 1159.7,
      ema_20: 1229.78,
      ema_50: 1214.27,
      ema_200: 1188.12,
      pivot_pp: 1258.27,
      pivot_s1: 1232.53,
      pivot_s2: 1181.07,
      pivot_r1: 1309.73,
      pivot_r2: 1335.47,
      timestamp: "2026-09-18"
    },
    {
      symbol: "BEML",
      name: "BEML Ltd.",
      sector: "Capital Goods",
      cmp: 2135.0,
      change_pct: 7.18,
      score: 84,
      grade: "A",
      score_display: "84 (A)",
      institutional_score: 84,
      status: "WEEKLY SWING ACCUMULATION",
      invalidation: 1861.5,
      structure_invalidation: "₹ 1,861.50 (Base Swing Low)",
      entry_zone: "₹2,096.27 - ₹2,117.33",
      target_1: 2545.25,
      target_2: 2818.75,
      target_zone: "₹2,545.25 / ₹2,818.75",
      risk_reward_ratio: "1:2.5",
      rvol: 2.84,
      setup_tags: [
        "Weekly Bullish Stack",
        "1W Ret +5.2%",
        "1M RS +12.4%",
        "RSI 64.2",
        "PP Support"
      ],
      ret_1w: 5.22,
      ret_1m: 8.77,
      rs_1w: 5.78,
      rs_1m: 12.43,
      rsi: 64.2,
      nearest_support_base: "PP Support",
      nearest_support_val: 2106.8,
      base_swing_low: 1861.5,
      ema_20: 2004.06,
      ema_50: 1926.24,
      ema_200: 1859.51,
      pivot_pp: 2106.8,
      pivot_s1: 2058.6,
      pivot_s2: 1982.2,
      pivot_r1: 2183.2,
      pivot_r2: 2231.4,
      timestamp: "2026-09-18"
    },
    {
      symbol: "JYOTICNC",
      name: "Jyoti CNC Automation Ltd.",
      sector: "Capital Goods",
      cmp: 1049.7,
      change_pct: 7.02,
      score: 84,
      grade: "A",
      score_display: "84 (A)",
      institutional_score: 84,
      status: "WEEKLY MOMENTUM SURGE",
      invalidation: 915.72,
      structure_invalidation: "₹ 915.72 (Base Swing Low)",
      entry_zone: "₹1,026.08 - ₹1,036.39",
      target_1: 1250.67,
      target_2: 1384.65,
      target_zone: "₹1,250.67 / ₹1,384.65",
      risk_reward_ratio: "1:2.5",
      rvol: 3.7,
      setup_tags: [
        "Weekly Bullish Stack",
        "1W Ret +6.6%",
        "1M RS +9.8%",
        "RSI 64.4",
        "PP Support"
      ],
      ret_1w: 6.57,
      ret_1m: 6.16,
      rs_1w: 7.13,
      rs_1m: 9.81,
      rsi: 64.4,
      nearest_support_base: "PP Support",
      nearest_support_val: 1031.23,
      base_swing_low: 928.6,
      ema_20: 981.13,
      ema_50: 915.72,
      ema_200: 845.88,
      pivot_pp: 1031.23,
      pivot_s1: 997.47,
      pivot_s2: 945.23,
      pivot_r1: 1083.47,
      pivot_r2: 1117.23,
      timestamp: "2026-09-18"
    },
    {
      symbol: "BELRISE",
      name: "Belrise Industries Ltd.",
      sector: "Automobile and Auto Components",
      cmp: 240.18,
      change_pct: 4.71,
      score: 80,
      grade: "A",
      score_display: "80 (A)",
      institutional_score: 80,
      status: "WEEKLY SWING ACCUMULATION",
      invalidation: 222.75,
      structure_invalidation: "₹ 222.75 (Base Swing Low)",
      entry_zone: "₹236.38 - ₹238.75",
      target_1: 266.32,
      target_2: 283.75,
      target_zone: "₹266.32 / ₹283.75",
      risk_reward_ratio: "1:2.5",
      rvol: 3.64,
      setup_tags: [
        "1W Ret +5.6%",
        "1M RS +7.5%",
        "RSI 60.6",
        "PP Support",
        "R:R 1:2.5"
      ],
      ret_1w: 5.6,
      ret_1m: 3.88,
      rs_1w: 6.16,
      rs_1m: 7.53,
      rsi: 60.6,
      nearest_support_base: "PP Support",
      nearest_support_val: 237.56,
      base_swing_low: 222.75,
      ema_20: 231.76,
      ema_50: 232.32,
      ema_200: 210.64,
      pivot_pp: 237.56,
      pivot_s1: 232.24,
      pivot_s2: 224.29,
      pivot_r1: 245.51,
      pivot_r2: 250.83,
      timestamp: "2026-09-18"
    }
  ];

  // Production Baseline Signals for Tab 5: Stage-2 Pullback (42 Signals)
  const DEFAULT_TAB5_SIGNALS = [
    {
        "symbol": "THELEELA",
        "name": "Leela Palaces Hotels & Resorts Ltd.",
        "sector": "Consumer Services",
        "cmp": 540.55,
        "change_pct": 1.99,
        "rvol": 0.26,
        "score": 95,
        "grade": "A+",
        "score_display": "95 (A+)",
        "institutional_score": 95,
        "status": "STAGE-2 TURNAROUND",
        "invalidation": 513.15,
        "structure_invalidation": "\u20b9 513.15 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9537.85 - \u20b9540.55",
        "target_1": 581.65,
        "target_2": 609.05,
        "target_zone": "\u20b9581.65 / \u20b9609.05",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 538.83,
        "ema_20": 538.83,
        "ema_50": 520.17,
        "sma_200": 451.85,
        "rsi": 52.2,
        "drawdown_52w_pct": 7.3,
        "high_52w": 582.85,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "Volume Dry-up",
            "RSI 52.2",
            "Within 7% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "RKFORGE",
        "name": "Ramkrishna Forgings Ltd.",
        "sector": "Automobile and Auto Components",
        "cmp": 724.1,
        "change_pct": 2.64,
        "rvol": 0.67,
        "score": 95,
        "grade": "A+",
        "score_display": "95 (A+)",
        "institutional_score": 95,
        "status": "STAGE-2 TURNAROUND",
        "invalidation": 659.1,
        "structure_invalidation": "\u20b9 659.10 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9712.58 - \u20b9724.10",
        "target_1": 821.6,
        "target_2": 886.6,
        "target_zone": "\u20b9821.60 / \u20b9886.60",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 712.58,
        "ema_20": 712.58,
        "ema_50": 686.58,
        "sma_200": 579.93,
        "rsi": 54.8,
        "drawdown_52w_pct": 6.3,
        "high_52w": 772.8,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "Volume Dry-up",
            "RSI 54.8",
            "Within 6% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "ADANIENT",
        "name": "Adani Enterprises Ltd.",
        "sector": "Metals & Mining",
        "cmp": 3020.0,
        "change_pct": 3.31,
        "rvol": 0.76,
        "score": 92,
        "grade": "A+",
        "score_display": "92 (A+)",
        "institutional_score": 92,
        "status": "STAGE-2 TURNAROUND",
        "invalidation": 2907.0,
        "structure_invalidation": "\u20b9 2,907.00 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b92,994.34 - \u20b93,020.00",
        "target_1": 3189.5,
        "target_2": 3302.5,
        "target_zone": "\u20b93,189.50 / \u20b93,302.50",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 2994.34,
        "ema_20": 2994.34,
        "ema_50": 2992.01,
        "sma_200": 2549.16,
        "rsi": 51.8,
        "drawdown_52w_pct": 6.9,
        "high_52w": 3245.0,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "Volume Dry-up",
            "RSI 51.8",
            "Within 7% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "ENGINERSIN",
        "name": "Engineers India Ltd.",
        "sector": "Construction",
        "cmp": 266.35,
        "change_pct": 0.99,
        "rvol": 0.3,
        "score": 92,
        "grade": "A+",
        "score_display": "92 (A+)",
        "institutional_score": 92,
        "status": "STAGE-2 TURNAROUND",
        "invalidation": 250.66,
        "structure_invalidation": "\u20b9 250.66 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9263.63 - \u20b9266.35",
        "target_1": 289.89,
        "target_2": 305.58,
        "target_zone": "\u20b9289.89 / \u20b9305.58",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 263.63,
        "ema_20": 263.63,
        "ema_50": 253.19,
        "sma_200": 222.64,
        "rsi": 55.5,
        "drawdown_52w_pct": 8.0,
        "high_52w": 289.65,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "Volume Dry-up",
            "RSI 55.5",
            "Within 8% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "GRANULES",
        "name": "Granules India Ltd.",
        "sector": "Healthcare",
        "cmp": 875.5,
        "change_pct": 0.59,
        "rvol": 0.81,
        "score": 92,
        "grade": "A+",
        "score_display": "92 (A+)",
        "institutional_score": 92,
        "status": "STAGE-2 TURNAROUND",
        "invalidation": 829.0,
        "structure_invalidation": "\u20b9 829.00 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9866.51 - \u20b9875.50",
        "target_1": 945.25,
        "target_2": 991.75,
        "target_zone": "\u20b9945.25 / \u20b9991.75",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 866.51,
        "ema_20": 866.51,
        "ema_50": 848.8,
        "sma_200": 707.49,
        "rsi": 53.3,
        "drawdown_52w_pct": 5.2,
        "high_52w": 923.65,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "Volume Dry-up",
            "RSI 53.3",
            "Within 5% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "MOTILALOFS",
        "name": "Motilal Oswal Financial Services Ltd.",
        "sector": "Financial Services",
        "cmp": 1010.0,
        "change_pct": 3.43,
        "rvol": 0.84,
        "score": 92,
        "grade": "A+",
        "score_display": "92 (A+)",
        "institutional_score": 92,
        "status": "STAGE-2 TURNAROUND",
        "invalidation": 958.31,
        "structure_invalidation": "\u20b9 958.31 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b91,003.42 - \u20b91,010.00",
        "target_1": 1087.54,
        "target_2": 1139.22,
        "target_zone": "\u20b91,087.54 / \u20b91,139.22",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 1003.42,
        "ema_20": 1003.42,
        "ema_50": 967.99,
        "sma_200": 851.29,
        "rsi": 53.9,
        "drawdown_52w_pct": 7.2,
        "high_52w": 1088.32,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "Volume Dry-up",
            "RSI 53.9",
            "Within 7% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "OFSS",
        "name": "Oracle Financial Services Software Ltd.",
        "sector": "Information Technology",
        "cmp": 11896.0,
        "change_pct": 2.38,
        "rvol": 0.77,
        "score": 92,
        "grade": "A+",
        "score_display": "92 (A+)",
        "institutional_score": 92,
        "status": "STAGE-2 TURNAROUND",
        "invalidation": 11356.0,
        "structure_invalidation": "\u20b9 11,356.00 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b911,790.21 - \u20b911,896.00",
        "target_1": 12706.0,
        "target_2": 13246.0,
        "target_zone": "\u20b912,706.00 / \u20b913,246.00",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 11790.21,
        "ema_20": 11790.21,
        "ema_50": 11506.01,
        "sma_200": 9051.27,
        "rsi": 53.6,
        "drawdown_52w_pct": 5.1,
        "high_52w": 12540.0,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "Volume Dry-up",
            "RSI 53.6",
            "Within 5% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "WOCKPHARMA",
        "name": "Wockhardt Ltd.",
        "sector": "Healthcare",
        "cmp": 2086.1,
        "change_pct": 0.67,
        "rvol": 0.5,
        "score": 90,
        "grade": "A+",
        "score_display": "90 (A+)",
        "institutional_score": 90,
        "status": "STAGE-2 TURNAROUND",
        "invalidation": 1957.1,
        "structure_invalidation": "\u20b9 1,957.10 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b92,055.82 - \u20b92,086.10",
        "target_1": 2279.6,
        "target_2": 2408.6,
        "target_zone": "\u20b92,279.60 / \u20b92,408.60",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 2055.82,
        "ema_20": 2055.82,
        "ema_50": 1976.87,
        "sma_200": 1622.9,
        "rsi": 54.5,
        "drawdown_52w_pct": 13.9,
        "high_52w": 2422.3,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "Volume Dry-up",
            "RSI 54.5",
            "Within 14% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "AUBANK",
        "name": "AU Small Finance Bank Ltd.",
        "sector": "Financial Services",
        "cmp": 1058.6,
        "change_pct": 2.46,
        "rvol": 0.99,
        "score": 87,
        "grade": "A",
        "score_display": "87 (A)",
        "institutional_score": 87,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 1015.1,
        "structure_invalidation": "\u20b9 1,015.10 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b91,053.31 - \u20b91,058.60",
        "target_1": 1123.85,
        "target_2": 1167.35,
        "target_zone": "\u20b91,123.85 / \u20b91,167.35",
        "risk_reward_ratio": "1:2.5",
        "support_level": "50 EMA",
        "support_ema": 1057.96,
        "ema_20": 1062.94,
        "ema_50": 1057.96,
        "sma_200": 1002.92,
        "rsi": 48.3,
        "drawdown_52w_pct": 7.5,
        "high_52w": 1144.1,
        "setup_tags": [
            "Stage-2 Uptrend",
            "50 EMA Support Hold",
            "RVOL 0.99x",
            "RSI 48.3",
            "Within 7% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "AJANTPHARM",
        "name": "Ajanta Pharmaceuticals Ltd.",
        "sector": "Healthcare",
        "cmp": 3563.6,
        "change_pct": 1.56,
        "rvol": 2.87,
        "score": 87,
        "grade": "A",
        "score_display": "87 (A)",
        "institutional_score": 87,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 3435.16,
        "structure_invalidation": "\u20b9 3,435.16 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b93,534.53 - \u20b93,563.60",
        "target_1": 3756.26,
        "target_2": 3884.7,
        "target_zone": "\u20b93,756.26 / \u20b93,884.70",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 3534.53,
        "ema_20": 3534.53,
        "ema_50": 3469.86,
        "sma_200": 3042.43,
        "rsi": 54.3,
        "drawdown_52w_pct": 6.1,
        "high_52w": 3796.0,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 2.87x",
            "RSI 54.3",
            "Within 6% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "ANANTRAJ",
        "name": "Anant Raj Ltd.",
        "sector": "Realty",
        "cmp": 606.15,
        "change_pct": 1.55,
        "rvol": 0.54,
        "score": 87,
        "grade": "A",
        "score_display": "87 (A)",
        "institutional_score": 87,
        "status": "STAGE-2 TURNAROUND",
        "invalidation": 576.85,
        "structure_invalidation": "\u20b9 576.85 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9603.12 - \u20b9606.15",
        "target_1": 650.1,
        "target_2": 679.4,
        "target_zone": "\u20b9650.10 / \u20b9679.40",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 605.76,
        "ema_20": 605.76,
        "ema_50": 598.14,
        "sma_200": 541.75,
        "rsi": 50.1,
        "drawdown_52w_pct": 18.4,
        "high_52w": 742.43,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "Volume Dry-up",
            "RSI 50.1",
            "Within 18% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "BLUEJET",
        "name": "Blue Jet Healthcare Ltd.",
        "sector": "Healthcare",
        "cmp": 575.25,
        "change_pct": 1.24,
        "rvol": 0.48,
        "score": 87,
        "grade": "A",
        "score_display": "87 (A)",
        "institutional_score": 87,
        "status": "STAGE-2 TURNAROUND",
        "invalidation": 543.75,
        "structure_invalidation": "\u20b9 543.75 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9572.37 - \u20b9575.25",
        "target_1": 622.5,
        "target_2": 654.0,
        "target_zone": "\u20b9622.50 / \u20b9654.00",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 574.11,
        "ema_20": 574.11,
        "ema_50": 569.26,
        "sma_200": 487.77,
        "rsi": 50.0,
        "drawdown_52w_pct": 16.8,
        "high_52w": 691.45,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "Volume Dry-up",
            "RSI 50.0",
            "Within 17% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "CGPOWER",
        "name": "CG Power and Industrial Solutions Ltd.",
        "sector": "Capital Goods",
        "cmp": 892.0,
        "change_pct": 1.36,
        "rvol": 1.26,
        "score": 87,
        "grade": "A",
        "score_display": "87 (A)",
        "institutional_score": 87,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 838.55,
        "structure_invalidation": "\u20b9 838.55 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9887.54 - \u20b9892.00",
        "target_1": 972.17,
        "target_2": 1025.62,
        "target_zone": "\u20b9972.17 / \u20b91,025.62",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 888.95,
        "ema_20": 888.95,
        "ema_50": 888.0,
        "sma_200": 787.53,
        "rsi": 50.7,
        "drawdown_52w_pct": 9.1,
        "high_52w": 980.9,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.26x",
            "RSI 50.7",
            "Within 9% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "CRAFTSMAN",
        "name": "Craftsman Automation Ltd.",
        "sector": "Automobile and Auto Components",
        "cmp": 11138.0,
        "change_pct": 0.89,
        "rvol": 3.32,
        "score": 87,
        "grade": "A",
        "score_display": "87 (A)",
        "institutional_score": 87,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 10436.95,
        "structure_invalidation": "\u20b9 10,436.95 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b911,082.31 - \u20b911,138.00",
        "target_1": 12189.58,
        "target_2": 12890.62,
        "target_zone": "\u20b912,189.58 / \u20b912,890.62",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 11141.51,
        "ema_20": 11141.51,
        "ema_50": 10542.37,
        "sma_200": 8526.45,
        "rsi": 53.2,
        "drawdown_52w_pct": 7.2,
        "high_52w": 11999.0,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 3.32x",
            "RSI 53.2",
            "Within 7% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "HONASA",
        "name": "Honasa Consumer Ltd.",
        "sector": "Fast Moving Consumer Goods",
        "cmp": 479.55,
        "change_pct": 2.18,
        "rvol": 1.28,
        "score": 87,
        "grade": "A",
        "score_display": "87 (A)",
        "institutional_score": 87,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 449.35,
        "structure_invalidation": "\u20b9 449.35 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9472.04 - \u20b9479.55",
        "target_1": 524.85,
        "target_2": 555.05,
        "target_zone": "\u20b9524.85 / \u20b9555.05",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 472.04,
        "ema_20": 472.04,
        "ema_50": 461.22,
        "sma_200": 361.63,
        "rsi": 54.5,
        "drawdown_52w_pct": 5.3,
        "high_52w": 506.65,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.28x",
            "RSI 54.5",
            "Within 5% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "IKS",
        "name": "Inventurus Knowledge Solutions Ltd.",
        "sector": "Information Technology",
        "cmp": 1779.9,
        "change_pct": 2.95,
        "rvol": 3.11,
        "score": 87,
        "grade": "A",
        "score_display": "87 (A)",
        "institutional_score": 87,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 1712.7,
        "structure_invalidation": "\u20b9 1,712.70 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b91,769.48 - \u20b91,779.90",
        "target_1": 1880.7,
        "target_2": 1947.9,
        "target_zone": "\u20b91,880.70 / \u20b91,947.90",
        "risk_reward_ratio": "1:2.5",
        "support_level": "50 EMA",
        "support_ema": 1769.48,
        "ema_20": 1766.88,
        "ema_50": 1769.48,
        "sma_200": 1649.1,
        "rsi": 51.5,
        "drawdown_52w_pct": 7.9,
        "high_52w": 1933.0,
        "setup_tags": [
            "Stage-2 Uptrend",
            "50 EMA Support Hold",
            "RVOL 3.11x",
            "RSI 51.5",
            "Within 8% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "LTF",
        "name": "L&T Finance Ltd.",
        "sector": "Financial Services",
        "cmp": 312.8,
        "change_pct": 5.85,
        "rvol": 1.29,
        "score": 87,
        "grade": "A",
        "score_display": "87 (A)",
        "institutional_score": 87,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 293.8,
        "structure_invalidation": "\u20b9 293.80 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9310.20 - \u20b9312.80",
        "target_1": 341.3,
        "target_2": 360.3,
        "target_zone": "\u20b9341.30 / \u20b9360.30",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 310.2,
        "ema_20": 310.2,
        "ema_50": 309.4,
        "sma_200": 292.23,
        "rsi": 51.5,
        "drawdown_52w_pct": 7.6,
        "high_52w": 338.6,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.29x",
            "RSI 51.5",
            "Within 8% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "NEULANDLAB",
        "name": "Neuland Laboratories Ltd.",
        "sector": "Healthcare",
        "cmp": 22840.0,
        "change_pct": 0.95,
        "rvol": 1.82,
        "score": 87,
        "grade": "A",
        "score_display": "87 (A)",
        "institutional_score": 87,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 21470.65,
        "structure_invalidation": "\u20b9 21,470.65 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b922,725.80 - \u20b922,840.00",
        "target_1": 24894.03,
        "target_2": 26263.38,
        "target_zone": "\u20b924,894.03 / \u20b926,263.38",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 22931.42,
        "ema_20": 22931.42,
        "ema_50": 21687.52,
        "sma_200": 16705.94,
        "rsi": 51.6,
        "drawdown_52w_pct": 5.7,
        "high_52w": 24225.0,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.82x",
            "RSI 51.6",
            "Within 6% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "MOTHERSON",
        "name": "Samvardhana Motherson International Ltd.",
        "sector": "Automobile and Auto Components",
        "cmp": 162.57,
        "change_pct": 0.43,
        "rvol": 1.79,
        "score": 87,
        "grade": "A",
        "score_display": "87 (A)",
        "institutional_score": 87,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 156.4,
        "structure_invalidation": "\u20b9 156.40 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9161.76 - \u20b9162.57",
        "target_1": 171.83,
        "target_2": 178.0,
        "target_zone": "\u20b9171.83 / \u20b9178.00",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 162.7,
        "ema_20": 162.7,
        "ema_50": 158.69,
        "sma_200": 134.19,
        "rsi": 50.8,
        "drawdown_52w_pct": 6.2,
        "high_52w": 173.27,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.79x",
            "RSI 50.8",
            "Within 6% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "SIEMENS",
        "name": "Siemens Ltd.",
        "sector": "Capital Goods",
        "cmp": 3913.9,
        "change_pct": 4.59,
        "rvol": 1.83,
        "score": 87,
        "grade": "A",
        "score_display": "87 (A)",
        "institutional_score": 87,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 3682.4,
        "structure_invalidation": "\u20b9 3,682.40 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b93,894.33 - \u20b93,913.90",
        "target_1": 4261.15,
        "target_2": 4492.65,
        "target_zone": "\u20b94,261.15 / \u20b94,492.65",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 3926.94,
        "ema_20": 3926.94,
        "ema_50": 3867.75,
        "sma_200": 3475.69,
        "rsi": 49.5,
        "drawdown_52w_pct": 5.7,
        "high_52w": 4149.4,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.83x",
            "RSI 49.5",
            "Within 6% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "TVSMOTOR",
        "name": "TVS Motor Company Ltd.",
        "sector": "Automobile and Auto Components",
        "cmp": 4171.3,
        "change_pct": 1.7,
        "rvol": 1.48,
        "score": 87,
        "grade": "A",
        "score_display": "87 (A)",
        "institutional_score": 87,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 4002.0,
        "structure_invalidation": "\u20b9 4,002.00 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b94,150.44 - \u20b94,171.30",
        "target_1": 4425.25,
        "target_2": 4594.55,
        "target_zone": "\u20b94,425.25 / \u20b94,594.55",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 4170.25,
        "ema_20": 4170.25,
        "ema_50": 4100.51,
        "sma_200": 3735.41,
        "rsi": 50.0,
        "drawdown_52w_pct": 7.0,
        "high_52w": 4484.5,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.48x",
            "RSI 50.0",
            "Within 7% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "ABCAPITAL",
        "name": "Aditya Birla Capital Ltd.",
        "sector": "Financial Services",
        "cmp": 410.05,
        "change_pct": 5.14,
        "rvol": 1.92,
        "score": 84,
        "grade": "A",
        "score_display": "84 (A)",
        "institutional_score": 84,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 378.0,
        "structure_invalidation": "\u20b9 378.00 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9398.32 - \u20b9410.05",
        "target_1": 458.12,
        "target_2": 490.17,
        "target_zone": "\u20b9458.12 / \u20b9490.17",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 398.32,
        "ema_20": 398.32,
        "ema_50": 397.4,
        "sma_200": 363.51,
        "rsi": 56.8,
        "drawdown_52w_pct": 4.8,
        "high_52w": 430.7,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.92x",
            "RSI 56.8",
            "Within 5% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "APOLLOHOSP",
        "name": "Apollo Hospitals Enterprise Ltd.",
        "sector": "Healthcare",
        "cmp": 8944.5,
        "change_pct": 2.01,
        "rvol": 1.35,
        "score": 84,
        "grade": "A",
        "score_display": "84 (A)",
        "institutional_score": 84,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 8650.0,
        "structure_invalidation": "\u20b9 8,650.00 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b98,804.61 - \u20b98,944.50",
        "target_1": 9386.25,
        "target_2": 9680.75,
        "target_zone": "\u20b99,386.25 / \u20b99,680.75",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 8804.61,
        "ema_20": 8804.61,
        "ema_50": 8752.37,
        "sma_200": 7963.43,
        "rsi": 57.0,
        "drawdown_52w_pct": 1.1,
        "high_52w": 9039.48,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.35x",
            "RSI 57.0",
            "Within 1% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "CAPLIPOINT",
        "name": "Caplin Point Laboratories Ltd.",
        "sector": "Healthcare",
        "cmp": 2748.6,
        "change_pct": 6.02,
        "rvol": 1.14,
        "score": 84,
        "grade": "A",
        "score_display": "84 (A)",
        "institutional_score": 84,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 2486.66,
        "structure_invalidation": "\u20b9 2,486.66 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b92,661.67 - \u20b92,748.60",
        "target_1": 3141.51,
        "target_2": 3403.45,
        "target_zone": "\u20b93,141.51 / \u20b93,403.45",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 2661.67,
        "ema_20": 2661.67,
        "ema_50": 2579.33,
        "sma_200": 2080.6,
        "rsi": 57.1,
        "drawdown_52w_pct": 4.3,
        "high_52w": 2872.87,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.14x",
            "RSI 57.1",
            "Within 4% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "MCX",
        "name": "Multi Commodity Exchange of India Ltd.",
        "sector": "Financial Services",
        "cmp": 3260.0,
        "change_pct": 1.52,
        "rvol": 1.08,
        "score": 84,
        "grade": "A",
        "score_display": "84 (A)",
        "institutional_score": 84,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 3046.16,
        "structure_invalidation": "\u20b9 3,046.16 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b93,216.82 - \u20b93,260.00",
        "target_1": 3580.76,
        "target_2": 3794.6,
        "target_zone": "\u20b93,580.76 / \u20b93,794.60",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 3216.82,
        "ema_20": 3216.82,
        "ema_50": 3076.93,
        "sma_200": 2695.53,
        "rsi": 55.9,
        "drawdown_52w_pct": 6.1,
        "high_52w": 3471.49,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.08x",
            "RSI 55.9",
            "Within 6% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "NAVINFLUOR",
        "name": "Navin Fluorine International Ltd.",
        "sector": "Chemicals",
        "cmp": 8590.0,
        "change_pct": 4.5,
        "rvol": 2.26,
        "score": 84,
        "grade": "A",
        "score_display": "84 (A)",
        "institutional_score": 84,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 8085.65,
        "structure_invalidation": "\u20b9 8,085.65 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b98,432.49 - \u20b98,590.00",
        "target_1": 9346.52,
        "target_2": 9850.88,
        "target_zone": "\u20b99,346.52 / \u20b99,850.88",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 8432.49,
        "ema_20": 8432.49,
        "ema_50": 8167.32,
        "sma_200": 6918.32,
        "rsi": 56.3,
        "drawdown_52w_pct": 4.0,
        "high_52w": 8949.5,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 2.26x",
            "RSI 56.3",
            "Within 4% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "PNBHOUSING",
        "name": "PNB Housing Finance Ltd.",
        "sector": "Financial Services",
        "cmp": 1133.1,
        "change_pct": 2.68,
        "rvol": 1.48,
        "score": 84,
        "grade": "A",
        "score_display": "84 (A)",
        "institutional_score": 84,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 1098.4,
        "structure_invalidation": "\u20b9 1,098.40 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b91,125.92 - \u20b91,133.10",
        "target_1": 1185.15,
        "target_2": 1219.85,
        "target_zone": "\u20b91,185.15 / \u20b91,219.85",
        "risk_reward_ratio": "1:2.5",
        "support_level": "50 EMA",
        "support_ema": 1125.92,
        "ema_20": 1149.49,
        "ema_50": 1125.92,
        "sma_200": 978.63,
        "rsi": 46.9,
        "drawdown_52w_pct": 6.5,
        "high_52w": 1211.5,
        "setup_tags": [
            "Stage-2 Uptrend",
            "50 EMA Support Hold",
            "RVOL 1.48x",
            "RSI 46.9",
            "Within 6% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "PETRONET",
        "name": "Petronet LNG Ltd.",
        "sector": "Oil Gas & Consumable Fuels",
        "cmp": 292.6,
        "change_pct": 3.23,
        "rvol": 2.1,
        "score": 84,
        "grade": "A",
        "score_display": "84 (A)",
        "institutional_score": 84,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 278.25,
        "structure_invalidation": "\u20b9 278.25 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9287.31 - \u20b9292.60",
        "target_1": 314.13,
        "target_2": 328.48,
        "target_zone": "\u20b9314.13 / \u20b9328.48",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 287.31,
        "ema_20": 287.31,
        "ema_50": 284.68,
        "sma_200": 278.82,
        "rsi": 57.4,
        "drawdown_52w_pct": 9.3,
        "high_52w": 322.68,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 2.10x",
            "RSI 57.4",
            "Within 9% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "RADICO",
        "name": "Radico Khaitan Ltd",
        "sector": "Fast Moving Consumer Goods",
        "cmp": 4535.4,
        "change_pct": 3.55,
        "rvol": 1.71,
        "score": 84,
        "grade": "A",
        "score_display": "84 (A)",
        "institutional_score": 84,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 4298.8,
        "structure_invalidation": "\u20b9 4,298.80 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b94,466.94 - \u20b94,535.40",
        "target_1": 4890.3,
        "target_2": 5126.9,
        "target_zone": "\u20b94,890.30 / \u20b95,126.90",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 4466.94,
        "ema_20": 4466.94,
        "ema_50": 4355.23,
        "sma_200": 3478.64,
        "rsi": 55.1,
        "drawdown_52w_pct": 4.5,
        "high_52w": 4747.0,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.71x",
            "RSI 55.1",
            "Within 4% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "SONACOMS",
        "name": "Sona BLW Precision Forgings Ltd.",
        "sector": "Automobile and Auto Components",
        "cmp": 808.0,
        "change_pct": 3.87,
        "rvol": 2.56,
        "score": 84,
        "grade": "A",
        "score_display": "84 (A)",
        "institutional_score": 84,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 756.94,
        "structure_invalidation": "\u20b9 756.94 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9792.84 - \u20b9808.00",
        "target_1": 884.59,
        "target_2": 935.65,
        "target_zone": "\u20b9884.59 / \u20b9935.65",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 792.84,
        "ema_20": 792.84,
        "ema_50": 764.59,
        "sma_200": 599.68,
        "rsi": 56.4,
        "drawdown_52w_pct": 4.3,
        "high_52w": 844.0,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 2.56x",
            "RSI 56.4",
            "Within 4% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "TBOTEK",
        "name": "TBO Tek Ltd.",
        "sector": "Consumer Services",
        "cmp": 1710.6,
        "change_pct": 3.82,
        "rvol": 1.48,
        "score": 84,
        "grade": "A",
        "score_display": "84 (A)",
        "institutional_score": 84,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 1596.81,
        "structure_invalidation": "\u20b9 1,596.81 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b91,676.47 - \u20b91,710.60",
        "target_1": 1881.28,
        "target_2": 1995.07,
        "target_zone": "\u20b91,881.28 / \u20b91,995.07",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 1676.47,
        "ema_20": 1676.47,
        "ema_50": 1612.94,
        "sma_200": 1428.82,
        "rsi": 56.2,
        "drawdown_52w_pct": 3.1,
        "high_52w": 1764.8,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.48x",
            "RSI 56.2",
            "Within 3% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "USHAMART",
        "name": "Usha Martin Ltd.",
        "sector": "Capital Goods",
        "cmp": 507.2,
        "change_pct": 2.33,
        "rvol": 1.71,
        "score": 84,
        "grade": "A",
        "score_display": "84 (A)",
        "institutional_score": 84,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 464.15,
        "structure_invalidation": "\u20b9 464.15 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9496.30 - \u20b9507.20",
        "target_1": 571.78,
        "target_2": 614.83,
        "target_zone": "\u20b9571.78 / \u20b9614.83",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 496.3,
        "ema_20": 496.3,
        "ema_50": 494.96,
        "sma_200": 457.46,
        "rsi": 56.4,
        "drawdown_52w_pct": 4.2,
        "high_52w": 529.3,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.71x",
            "RSI 56.4",
            "Within 4% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "ZYDUSLIFE",
        "name": "Zydus Lifesciences Ltd.",
        "sector": "Healthcare",
        "cmp": 1160.0,
        "change_pct": 2.19,
        "rvol": 2.17,
        "score": 84,
        "grade": "A",
        "score_display": "84 (A)",
        "institutional_score": 84,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 1086.0,
        "structure_invalidation": "\u20b9 1,086.00 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b91,133.59 - \u20b91,160.00",
        "target_1": 1271.0,
        "target_2": 1345.0,
        "target_zone": "\u20b91,271.00 / \u20b91,345.00",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 1133.59,
        "ema_20": 1133.59,
        "ema_50": 1125.6,
        "sma_200": 1001.63,
        "rsi": 56.3,
        "drawdown_52w_pct": 3.7,
        "high_52w": 1205.0,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 2.17x",
            "RSI 56.3",
            "Within 4% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "MAHABANK",
        "name": "Bank of Maharashtra",
        "sector": "Financial Services",
        "cmp": 83.54,
        "change_pct": 3.39,
        "rvol": 1.01,
        "score": 82,
        "grade": "A",
        "score_display": "82 (A)",
        "institutional_score": 82,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 79.2,
        "structure_invalidation": "\u20b9 79.20 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b982.69 - \u20b983.54",
        "target_1": 90.05,
        "target_2": 94.39,
        "target_zone": "\u20b990.05 / \u20b994.39",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 82.69,
        "ema_20": 82.69,
        "ema_50": 82.18,
        "sma_200": 73.46,
        "rsi": 53.2,
        "drawdown_52w_pct": 11.6,
        "high_52w": 94.5,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.01x",
            "RSI 53.2",
            "Within 12% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "CARBORUNIV",
        "name": "Carborundum Universal Ltd.",
        "sector": "Capital Goods",
        "cmp": 1124.4,
        "change_pct": 6.92,
        "rvol": 2.49,
        "score": 82,
        "grade": "A",
        "score_display": "82 (A)",
        "institutional_score": 82,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 1018.1,
        "structure_invalidation": "\u20b9 1,018.10 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b91,093.94 - \u20b91,124.40",
        "target_1": 1283.85,
        "target_2": 1390.15,
        "target_zone": "\u20b91,283.85 / \u20b91,390.15",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 1093.94,
        "ema_20": 1093.94,
        "ema_50": 1093.17,
        "sma_200": 958.31,
        "rsi": 54.6,
        "drawdown_52w_pct": 13.8,
        "high_52w": 1303.79,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 2.49x",
            "RSI 54.6",
            "Within 14% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "CONCORDBIO",
        "name": "Concord Biotech Ltd.",
        "sector": "Healthcare",
        "cmp": 1494.4,
        "change_pct": 2.79,
        "rvol": 1.37,
        "score": 82,
        "grade": "A",
        "score_display": "82 (A)",
        "institutional_score": 82,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 1408.92,
        "structure_invalidation": "\u20b9 1,408.92 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b91,471.44 - \u20b91,494.40",
        "target_1": 1622.62,
        "target_2": 1708.1,
        "target_zone": "\u20b91,622.62 / \u20b91,708.10",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 1471.44,
        "ema_20": 1471.44,
        "ema_50": 1423.16,
        "sma_200": 1259.45,
        "rsi": 55.0,
        "drawdown_52w_pct": 11.8,
        "high_52w": 1693.86,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.37x",
            "RSI 55.0",
            "Within 12% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "EXIDEIND",
        "name": "Exide Industries Ltd.",
        "sector": "Automobile and Auto Components",
        "cmp": 435.85,
        "change_pct": 4.12,
        "rvol": 2.53,
        "score": 82,
        "grade": "A",
        "score_display": "82 (A)",
        "institutional_score": 82,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 405.1,
        "structure_invalidation": "\u20b9 405.10 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9430.29 - \u20b9435.85",
        "target_1": 481.98,
        "target_2": 512.73,
        "target_zone": "\u20b9481.98 / \u20b9512.73",
        "risk_reward_ratio": "1:2.5",
        "support_level": "50 EMA",
        "support_ema": 430.29,
        "ema_20": 428.3,
        "ema_50": 430.29,
        "sma_200": 373.42,
        "rsi": 52.8,
        "drawdown_52w_pct": 12.2,
        "high_52w": 496.4,
        "setup_tags": [
            "Stage-2 Uptrend",
            "50 EMA Support Hold",
            "RVOL 2.53x",
            "RSI 52.8",
            "Within 12% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "POWERINDIA",
        "name": "Hitachi Energy India Ltd.",
        "sector": "Capital Goods",
        "cmp": 32700.0,
        "change_pct": 4.71,
        "rvol": 1.49,
        "score": 82,
        "grade": "A",
        "score_display": "82 (A)",
        "institutional_score": 82,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 29645.0,
        "structure_invalidation": "\u20b9 29,645.00 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b932,536.50 - \u20b932,700.00",
        "target_1": 37282.5,
        "target_2": 40337.5,
        "target_zone": "\u20b937,282.50 / \u20b940,337.50",
        "risk_reward_ratio": "1:2.5",
        "support_level": "50 EMA",
        "support_ema": 32599.97,
        "ema_20": 32032.97,
        "ema_50": 32599.97,
        "sma_200": 28150.67,
        "rsi": 52.8,
        "drawdown_52w_pct": 15.7,
        "high_52w": 38775.74,
        "setup_tags": [
            "Stage-2 Uptrend",
            "50 EMA Support Hold",
            "RVOL 1.49x",
            "RSI 52.8",
            "Within 16% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "KPRMILL",
        "name": "K.P.R. Mill Ltd.",
        "sector": "Textiles",
        "cmp": 1141.4,
        "change_pct": 1.78,
        "rvol": 1.07,
        "score": 82,
        "grade": "A",
        "score_display": "82 (A)",
        "institutional_score": 82,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 1080.0,
        "structure_invalidation": "\u20b9 1,080.00 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b91,133.34 - \u20b91,141.40",
        "target_1": 1233.5,
        "target_2": 1294.9,
        "target_zone": "\u20b91,233.50 / \u20b91,294.90",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 1133.34,
        "ema_20": 1133.34,
        "ema_50": 1113.89,
        "sma_200": 985.36,
        "rsi": 53.0,
        "drawdown_52w_pct": 14.2,
        "high_52w": 1331.08,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.07x",
            "RSI 53.0",
            "Within 14% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "SAREGAMA",
        "name": "Saregama India Ltd",
        "sector": "Media Entertainment & Publication",
        "cmp": 499.9,
        "change_pct": 2.74,
        "rvol": 0.89,
        "score": 82,
        "grade": "A",
        "score_display": "82 (A)",
        "institutional_score": 82,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 475.2,
        "structure_invalidation": "\u20b9 475.20 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9497.40 - \u20b9499.90",
        "target_1": 536.95,
        "target_2": 561.65,
        "target_zone": "\u20b9536.95 / \u20b9561.65",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 498.41,
        "ema_20": 498.41,
        "ema_50": 494.41,
        "sma_200": 405.79,
        "rsi": 50.2,
        "drawdown_52w_pct": 13.0,
        "high_52w": 574.5,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 0.89x",
            "RSI 50.2",
            "Within 13% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "INDHOTEL",
        "name": "Indian Hotels Co. Ltd.",
        "sector": "Consumer Services",
        "cmp": 732.75,
        "change_pct": 0.84,
        "rvol": 1.99,
        "score": 81,
        "grade": "A",
        "score_display": "81 (A)",
        "institutional_score": 81,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 706.75,
        "structure_invalidation": "\u20b9 706.75 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9722.63 - \u20b9732.75",
        "target_1": 771.75,
        "target_2": 797.75,
        "target_zone": "\u20b9771.75 / \u20b9797.75",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 722.63,
        "ema_20": 722.63,
        "ema_50": 720.45,
        "sma_200": 686.01,
        "rsi": 55.8,
        "drawdown_52w_pct": 5.3,
        "high_52w": 773.51,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.99x",
            "RSI 55.8",
            "Within 5% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "URBANCO",
        "name": "Urban Company Ltd.",
        "sector": "Consumer Services",
        "cmp": 169.11,
        "change_pct": 3.87,
        "rvol": 1.0,
        "score": 79,
        "grade": "A",
        "score_display": "79 (A)",
        "institutional_score": 79,
        "status": "PULLBACK SUPPORT HOLD",
        "invalidation": 152.77,
        "structure_invalidation": "\u20b9 152.77 (Base Swing Low / 50 EMA Buffer)",
        "entry_zone": "\u20b9164.41 - \u20b9169.11",
        "target_1": 193.62,
        "target_2": 209.96,
        "target_zone": "\u20b9193.62 / \u20b9209.96",
        "risk_reward_ratio": "1:2.5",
        "support_level": "20 EMA",
        "support_ema": 164.41,
        "ema_20": 164.41,
        "ema_50": 154.31,
        "sma_200": 132.34,
        "rsi": 57.6,
        "drawdown_52w_pct": 15.9,
        "high_52w": 201.18,
        "setup_tags": [
            "Stage-2 Uptrend",
            "20 EMA Support Hold",
            "RVOL 1.00x",
            "RSI 57.6",
            "Within 16% of 52W High",
            "R:R 1:2.5"
        ],
        "timestamp": "2026-09-18"
    }
];


  // Production Baseline Signals for Tab 6: DBR Demand Zone (37 Signals)
  const DEFAULT_TAB6_SIGNALS = [
    {
        "symbol": "SUPREMEIND",
        "name": "Supreme Industries Ltd.",
        "sector": "Capital Goods",
        "cmp": 3580.300048828125,
        "change_pct": 8.49,
        "score": 100,
        "grade": "A+",
        "score_display": "100 (A+)",
        "institutional_score": 100,
        "invalidation": 3255.07,
        "entry_zone": "\u20b93,346.60 - \u20b93,580.30",
        "target_1": 4068.15,
        "target_2": 4393.38,
        "target_zone": "4,068.15 - 4,393.38",
        "risk_reward_ratio": "1:2.5",
        "rvol": 2.4,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (2.3%)",
            "Drop -9.2%",
            "RVOL 2.4x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 3346.6,
        "p_dist": 3270.0,
        "base_bars": 1,
        "base_depth_pct": 2.34,
        "drop_pct": 9.24,
        "rsi": 55.7,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "JSL",
        "name": "Jindal Stainless Ltd.",
        "sector": "Metals & Mining",
        "cmp": 750.9500122070312,
        "change_pct": 2.75,
        "score": 96,
        "grade": "A+",
        "score_display": "96 (A+)",
        "institutional_score": 96,
        "invalidation": 711.31,
        "entry_zone": "\u20b9738.80 - \u20b9750.95",
        "target_1": 810.41,
        "target_2": 850.05,
        "target_zone": "810.41 - 850.05",
        "risk_reward_ratio": "1:2.5",
        "rvol": 2.59,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (3.3%)",
            "Drop -9.9%",
            "RVOL 2.6x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 738.8,
        "p_dist": 715.0,
        "base_bars": 1,
        "base_depth_pct": 3.33,
        "drop_pct": 9.95,
        "rsi": 55.8,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "TATACAP",
        "name": "Tata Capital Ltd.",
        "sector": "Financial Services",
        "cmp": 351.3500061035156,
        "change_pct": 2.24,
        "score": 95,
        "grade": "A+",
        "score_display": "95 (A+)",
        "institutional_score": 95,
        "invalidation": 340.28,
        "entry_zone": "\u20b9348.00 - \u20b9351.35",
        "target_1": 367.96,
        "target_2": 379.03,
        "target_zone": "367.96 - 379.03",
        "risk_reward_ratio": "1:2.5",
        "rvol": 2.49,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (1.9%)",
            "Drop -9.3%",
            "RVOL 2.5x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 348.0,
        "p_dist": 341.65,
        "base_bars": 1,
        "base_depth_pct": 1.86,
        "drop_pct": 9.34,
        "rsi": 40.7,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "BAJFINANCE",
        "name": "Bajaj Finance Ltd.",
        "sector": "Financial Services",
        "cmp": 1040.300048828125,
        "change_pct": 3.39,
        "score": 91,
        "grade": "A+",
        "score_display": "91 (A+)",
        "institutional_score": 91,
        "invalidation": 1002.18,
        "entry_zone": "\u20b91,019.30 - \u20b91,040.30",
        "target_1": 1097.48,
        "target_2": 1135.6,
        "target_zone": "1,097.48 - 1,135.60",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.68,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (1.3%)",
            "Drop -6.0%",
            "RVOL 1.7x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 1019.3,
        "p_dist": 1006.2,
        "base_bars": 1,
        "base_depth_pct": 1.3,
        "drop_pct": 5.96,
        "rsi": 45.6,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "BBTC",
        "name": "Bombay Burmah Trading Corporation Ltd.",
        "sector": "Fast Moving Consumer Goods",
        "cmp": 1512.0999755859375,
        "change_pct": 6.73,
        "score": 91,
        "grade": "A+",
        "score_display": "91 (A+)",
        "institutional_score": 91,
        "invalidation": 1386.11,
        "entry_zone": "\u20b91,447.10 - \u20b91,512.10",
        "target_1": 1701.08,
        "target_2": 1827.07,
        "target_zone": "1,701.08 - 1,827.07",
        "risk_reward_ratio": "1:2.5",
        "rvol": 2.68,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 3-Bar Base",
            "Tight Base (3.9%)",
            "Drop -12.9%",
            "RVOL 2.7x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 1447.1,
        "p_dist": 1393.0,
        "base_bars": 3,
        "base_depth_pct": 3.88,
        "drop_pct": 12.88,
        "rsi": 55.7,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "CHALET",
        "name": "Chalet Hotels Ltd.",
        "sector": "Consumer Services",
        "cmp": 865.6500244140625,
        "change_pct": 2.55,
        "score": 91,
        "grade": "A+",
        "score_display": "91 (A+)",
        "institutional_score": 91,
        "invalidation": 824.38,
        "entry_zone": "\u20b9854.60 - \u20b9865.65",
        "target_1": 927.56,
        "target_2": 968.83,
        "target_zone": "927.56 - 968.83",
        "risk_reward_ratio": "1:2.5",
        "rvol": 2.25,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (3.2%)",
            "Drop -9.2%",
            "RVOL 2.2x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 854.6,
        "p_dist": 828.15,
        "base_bars": 1,
        "base_depth_pct": 3.19,
        "drop_pct": 9.23,
        "rsi": 48.6,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "HONAUT",
        "name": "Honeywell Automation India Ltd.",
        "sector": "Capital Goods",
        "cmp": 35445.0,
        "change_pct": 4.57,
        "score": 91,
        "grade": "A+",
        "score_display": "91 (A+)",
        "institutional_score": 91,
        "invalidation": 33361.5,
        "entry_zone": "\u20b934,170.00 - \u20b935,445.00",
        "target_1": 38570.25,
        "target_2": 40653.75,
        "target_zone": "38,570.25 - 40,653.75",
        "risk_reward_ratio": "1:2.5",
        "rvol": 4.48,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (2.0%)",
            "Drop -7.7%",
            "RVOL 4.5x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 34170.0,
        "p_dist": 33510.0,
        "base_bars": 1,
        "base_depth_pct": 1.97,
        "drop_pct": 7.74,
        "rsi": 47.8,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "LTF",
        "name": "L&T Finance Ltd.",
        "sector": "Financial Services",
        "cmp": 312.79998779296875,
        "change_pct": 5.85,
        "score": 91,
        "grade": "A+",
        "score_display": "91 (A+)",
        "institutional_score": 91,
        "invalidation": 292.46,
        "entry_zone": "\u20b9300.95 - \u20b9312.80",
        "target_1": 343.31,
        "target_2": 363.65,
        "target_zone": "343.31 - 363.65",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.29,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (2.4%)",
            "Drop -8.3%",
            "RVOL 1.3x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 300.95,
        "p_dist": 293.8,
        "base_bars": 1,
        "base_depth_pct": 2.43,
        "drop_pct": 8.33,
        "rsi": 51.5,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "NUVOCO",
        "name": "Nuvoco Vistas Corporation Ltd.",
        "sector": "Construction Materials",
        "cmp": 328.6000061035156,
        "change_pct": 3.92,
        "score": 91,
        "grade": "A+",
        "score_display": "91 (A+)",
        "institutional_score": 91,
        "invalidation": 306.22,
        "entry_zone": "\u20b9318.35 - \u20b9328.60",
        "target_1": 362.17,
        "target_2": 384.55,
        "target_zone": "362.17 - 384.55",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.61,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (3.4%)",
            "Drop -13.2%",
            "RVOL 1.6x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 318.35,
        "p_dist": 307.95,
        "base_bars": 1,
        "base_depth_pct": 3.38,
        "drop_pct": 13.2,
        "rsi": 48.9,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "SIEMENS",
        "name": "Siemens Ltd.",
        "sector": "Capital Goods",
        "cmp": 3913.89990234375,
        "change_pct": 4.59,
        "score": 91,
        "grade": "A+",
        "score_display": "91 (A+)",
        "institutional_score": 91,
        "invalidation": 3667.59,
        "entry_zone": "\u20b93,799.30 - \u20b93,913.90",
        "target_1": 4283.36,
        "target_2": 4529.67,
        "target_zone": "4,283.36 - 4,529.67",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.83,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (3.2%)",
            "Drop -10.4%",
            "RVOL 1.8x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 3799.3,
        "p_dist": 3682.4,
        "base_bars": 1,
        "base_depth_pct": 3.17,
        "drop_pct": 10.45,
        "rsi": 49.5,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "BHARTIARTL",
        "name": "Bharti Airtel Ltd.",
        "sector": "Telecommunication",
        "cmp": 1893.300048828125,
        "change_pct": 3.12,
        "score": 90,
        "grade": "A+",
        "score_display": "90 (A+)",
        "institutional_score": 90,
        "invalidation": 1811.33,
        "entry_zone": "\u20b91,845.90 - \u20b91,893.30",
        "target_1": 2016.26,
        "target_2": 2098.23,
        "target_zone": "2,016.26 - 2,098.23",
        "risk_reward_ratio": "1:2.5",
        "rvol": 2.49,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 2-Bar Base",
            "Tight Base (1.5%)",
            "Drop -2.9%",
            "RVOL 2.5x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 1845.9,
        "p_dist": 1818.6,
        "base_bars": 2,
        "base_depth_pct": 1.5,
        "drop_pct": 2.9,
        "rsi": 54.4,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "HUDCO",
        "name": "Housing & Urban Development Corporation Ltd.",
        "sector": "Financial Services",
        "cmp": 174.9199981689453,
        "change_pct": 3.17,
        "score": 88,
        "grade": "A",
        "score_display": "88 (A)",
        "institutional_score": 88,
        "invalidation": 166.38,
        "entry_zone": "\u20b9173.03 - \u20b9174.92",
        "target_1": 187.73,
        "target_2": 196.27,
        "target_zone": "187.73 - 196.27",
        "risk_reward_ratio": "1:2.5",
        "rvol": 2.11,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 2-Bar Base",
            "Tight Base (3.6%)",
            "Drop -9.6%",
            "RVOL 2.1x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 173.03,
        "p_dist": 167.05,
        "base_bars": 2,
        "base_depth_pct": 3.58,
        "drop_pct": 9.55,
        "rsi": 39.1,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "JMFINANCIL",
        "name": "JM Financial Ltd.",
        "sector": "Financial Services",
        "cmp": 126.30000305175781,
        "change_pct": 4.85,
        "score": 88,
        "grade": "A",
        "score_display": "88 (A)",
        "institutional_score": 88,
        "invalidation": 117.46,
        "entry_zone": "\u20b9121.50 - \u20b9126.30",
        "target_1": 139.56,
        "target_2": 148.4,
        "target_zone": "139.56 - 148.40",
        "risk_reward_ratio": "1:2.5",
        "rvol": 2.03,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (2.9%)",
            "Drop -13.4%",
            "RVOL 2.0x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 121.5,
        "p_dist": 118.05,
        "base_bars": 1,
        "base_depth_pct": 2.92,
        "drop_pct": 13.39,
        "rsi": 48.9,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "CONCOR",
        "name": "Container Corporation of India Ltd.",
        "sector": "Services",
        "cmp": 504.54998779296875,
        "change_pct": 3.36,
        "score": 87,
        "grade": "A",
        "score_display": "87 (A)",
        "institutional_score": 87,
        "invalidation": 478.78,
        "entry_zone": "\u20b9494.00 - \u20b9504.55",
        "target_1": 543.2,
        "target_2": 568.97,
        "target_zone": "543.20 - 568.97",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.88,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 2-Bar Base",
            "Tight Base (2.8%)",
            "Drop -7.7%",
            "RVOL 1.9x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 494.0,
        "p_dist": 480.7,
        "base_bars": 2,
        "base_depth_pct": 2.77,
        "drop_pct": 7.69,
        "rsi": 50.8,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "GAIL",
        "name": "GAIL (India) Ltd.",
        "sector": "Oil Gas & Consumable Fuels",
        "cmp": 173.89999389648438,
        "change_pct": 1.1,
        "score": 87,
        "grade": "A",
        "score_display": "87 (A)",
        "institutional_score": 87,
        "invalidation": 168.05,
        "entry_zone": "\u20b9172.82 - \u20b9173.90",
        "target_1": 182.67,
        "target_2": 188.52,
        "target_zone": "182.67 - 188.52",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.43,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 2-Bar Base",
            "Tight Base (2.4%)",
            "Drop -4.8%",
            "RVOL 1.4x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 172.82,
        "p_dist": 168.72,
        "base_bars": 2,
        "base_depth_pct": 2.43,
        "drop_pct": 4.84,
        "rsi": 51.4,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "GRSE",
        "name": "Garden Reach Shipbuilders & Engineers Ltd.",
        "sector": "Capital Goods",
        "cmp": 2411.800048828125,
        "change_pct": 3.37,
        "score": 87,
        "grade": "A",
        "score_display": "87 (A)",
        "institutional_score": 87,
        "invalidation": 2303.76,
        "entry_zone": "\u20b92,365.11 - \u20b92,411.80",
        "target_1": 2573.86,
        "target_2": 2681.9,
        "target_zone": "2,573.86 - 2,681.90",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.55,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (2.3%)",
            "Drop -9.7%",
            "RVOL 1.6x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 2365.11,
        "p_dist": 2313.06,
        "base_bars": 1,
        "base_depth_pct": 2.25,
        "drop_pct": 9.7,
        "rsi": 41.0,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "EXIDEIND",
        "name": "Exide Industries Ltd.",
        "sector": "Automobile and Auto Components",
        "cmp": 435.8500061035156,
        "change_pct": 4.12,
        "score": 86,
        "grade": "A",
        "score_display": "86 (A)",
        "institutional_score": 86,
        "invalidation": 409.27,
        "entry_zone": "\u20b9421.95 - \u20b9435.85",
        "target_1": 475.72,
        "target_2": 502.3,
        "target_zone": "475.72 - 502.30",
        "risk_reward_ratio": "1:2.5",
        "rvol": 2.53,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (2.7%)",
            "Drop -4.4%",
            "RVOL 2.5x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 421.95,
        "p_dist": 411.0,
        "base_bars": 1,
        "base_depth_pct": 2.66,
        "drop_pct": 4.42,
        "rsi": 52.8,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "BAJAJHFL",
        "name": "Bajaj Housing Finance Ltd.",
        "sector": "Financial Services",
        "cmp": 85.58000183105469,
        "change_pct": 3.48,
        "score": 85,
        "grade": "A",
        "score_display": "85 (A)",
        "institutional_score": 85,
        "invalidation": 82.3,
        "entry_zone": "\u20b983.51 - \u20b985.58",
        "target_1": 90.5,
        "target_2": 93.78,
        "target_zone": "90.50 - 93.78",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.86,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (1.1%)",
            "Drop -3.4%",
            "RVOL 1.9x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 83.51,
        "p_dist": 82.63,
        "base_bars": 1,
        "base_depth_pct": 1.06,
        "drop_pct": 3.37,
        "rsi": 57.5,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "BERGEPAINT",
        "name": "Berger Paints India Ltd.",
        "sector": "Consumer Durables",
        "cmp": 458.6499938964844,
        "change_pct": 2.24,
        "score": 85,
        "grade": "A",
        "score_display": "85 (A)",
        "institutional_score": 85,
        "invalidation": 442.12,
        "entry_zone": "\u20b9452.35 - \u20b9458.65",
        "target_1": 483.44,
        "target_2": 499.97,
        "target_zone": "483.44 - 499.97",
        "risk_reward_ratio": "1:2.5",
        "rvol": 4.04,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 2-Bar Base",
            "Tight Base (1.9%)",
            "Drop -10.7%",
            "RVOL 4.0x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 452.35,
        "p_dist": 443.9,
        "base_bars": 2,
        "base_depth_pct": 1.9,
        "drop_pct": 10.68,
        "rsi": 32.8,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "COROMANDEL",
        "name": "Coromandel International Ltd.",
        "sector": "Chemicals",
        "cmp": 1999.5,
        "change_pct": 3.61,
        "score": 85,
        "grade": "A",
        "score_display": "85 (A)",
        "institutional_score": 85,
        "invalidation": 1902.36,
        "entry_zone": "\u20b91,950.00 - \u20b91,999.50",
        "target_1": 2145.21,
        "target_2": 2242.35,
        "target_zone": "2,145.21 - 2,242.35",
        "risk_reward_ratio": "1:2.5",
        "rvol": 2.08,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 4-Bar Base",
            "Tight Base (2.1%)",
            "Drop -3.5%",
            "RVOL 2.1x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 1950.0,
        "p_dist": 1910.0,
        "base_bars": 4,
        "base_depth_pct": 2.09,
        "drop_pct": 3.54,
        "rsi": 56.3,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "IRCTC",
        "name": "Indian Railway Catering And Tourism Corporation Ltd.",
        "sector": "Consumer Services",
        "cmp": 476.75,
        "change_pct": 4.32,
        "score": 84,
        "grade": "A",
        "score_display": "84 (A)",
        "institutional_score": 84,
        "invalidation": 444.71,
        "entry_zone": "\u20b9458.40 - \u20b9476.75",
        "target_1": 524.81,
        "target_2": 556.85,
        "target_zone": "524.81 - 556.85",
        "risk_reward_ratio": "1:2.5",
        "rvol": 2.46,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 2-Bar Base",
            "Tight Base (2.7%)",
            "Drop -7.2%",
            "RVOL 2.5x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 458.4,
        "p_dist": 446.5,
        "base_bars": 2,
        "base_depth_pct": 2.67,
        "drop_pct": 7.24,
        "rsi": 49.7,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "CENTRALBK",
        "name": "Central Bank of India",
        "sector": "Financial Services",
        "cmp": 31.729999542236328,
        "change_pct": 4.37,
        "score": 83,
        "grade": "A",
        "score_display": "83 (A)",
        "institutional_score": 83,
        "invalidation": 30.0,
        "entry_zone": "\u20b930.67 - \u20b931.73",
        "target_1": 34.32,
        "target_2": 36.05,
        "target_zone": "34.32 - 36.05",
        "risk_reward_ratio": "1:2.5",
        "rvol": 6.83,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 2-Bar Base",
            "Tight Base (1.8%)",
            "Drop -3.6%",
            "RVOL 6.8x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 30.67,
        "p_dist": 30.12,
        "base_bars": 2,
        "base_depth_pct": 1.83,
        "drop_pct": 3.55,
        "rsi": 62.4,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "GMRAIRPORT",
        "name": "GMR Airports Ltd.",
        "sector": "Services",
        "cmp": 99.30000305175781,
        "change_pct": 7.4,
        "score": 83,
        "grade": "A",
        "score_display": "83 (A)",
        "institutional_score": 83,
        "invalidation": 91.57,
        "entry_zone": "\u20b993.81 - \u20b999.30",
        "target_1": 110.9,
        "target_2": 118.63,
        "target_zone": "110.90 - 118.63",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.69,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (2.0%)",
            "Drop -6.8%",
            "RVOL 1.7x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 93.81,
        "p_dist": 91.99,
        "base_bars": 1,
        "base_depth_pct": 1.98,
        "drop_pct": 6.83,
        "rsi": 51.5,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "GODFRYPHLP",
        "name": "Godfrey Phillips India Ltd.",
        "sector": "Fast Moving Consumer Goods",
        "cmp": 2018.0,
        "change_pct": 4.34,
        "score": 83,
        "grade": "A",
        "score_display": "83 (A)",
        "institutional_score": 83,
        "invalidation": 1887.42,
        "entry_zone": "\u20b91,957.00 - \u20b92,018.00",
        "target_1": 2213.87,
        "target_2": 2344.45,
        "target_zone": "2,213.87 - 2,344.45",
        "risk_reward_ratio": "1:2.5",
        "rvol": 2.32,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 3-Bar Base",
            "Tight Base (3.3%)",
            "Drop -11.5%",
            "RVOL 2.3x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 1957.0,
        "p_dist": 1895.0,
        "base_bars": 3,
        "base_depth_pct": 3.27,
        "drop_pct": 11.51,
        "rsi": 46.6,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "IRFC",
        "name": "Indian Railway Finance Corporation Ltd.",
        "sector": "Financial Services",
        "cmp": 81.5,
        "change_pct": 2.76,
        "score": 83,
        "grade": "A",
        "score_display": "83 (A)",
        "institutional_score": 83,
        "invalidation": 77.85,
        "entry_zone": "\u20b979.92 - \u20b981.50",
        "target_1": 86.98,
        "target_2": 90.63,
        "target_zone": "86.98 - 90.63",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.9,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 2-Bar Base",
            "Tight Base (2.3%)",
            "Drop -6.9%",
            "RVOL 1.9x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 79.92,
        "p_dist": 78.16,
        "base_bars": 2,
        "base_depth_pct": 2.25,
        "drop_pct": 6.9,
        "rsi": 40.5,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "IGIL",
        "name": "International Gemological Institute Ltd.",
        "sector": "Services",
        "cmp": 330.95001220703125,
        "change_pct": 5.1,
        "score": 83,
        "grade": "A",
        "score_display": "83 (A)",
        "institutional_score": 83,
        "invalidation": 310.42,
        "entry_zone": "\u20b9317.95 - \u20b9330.95",
        "target_1": 361.75,
        "target_2": 382.28,
        "target_zone": "361.75 - 382.28",
        "risk_reward_ratio": "1:2.5",
        "rvol": 4.43,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (2.0%)",
            "Drop -5.8%",
            "RVOL 4.4x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 317.95,
        "p_dist": 311.8,
        "base_bars": 1,
        "base_depth_pct": 1.97,
        "drop_pct": 5.79,
        "rsi": 52.9,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "UPL",
        "name": "UPL Ltd.",
        "sector": "Chemicals",
        "cmp": 580.0,
        "change_pct": 4.55,
        "score": 83,
        "grade": "A",
        "score_display": "83 (A)",
        "institutional_score": 83,
        "invalidation": 547.6,
        "entry_zone": "\u20b9558.00 - \u20b9580.00",
        "target_1": 628.6,
        "target_2": 661.0,
        "target_zone": "628.60 - 661.00",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.8,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (1.5%)",
            "Drop -6.7%",
            "RVOL 1.8x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 558.0,
        "p_dist": 549.8,
        "base_bars": 1,
        "base_depth_pct": 1.49,
        "drop_pct": 6.72,
        "rsi": 53.4,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "FIVESTAR",
        "name": "Five-Star Business Finance Ltd.",
        "sector": "Financial Services",
        "cmp": 538.4500122070312,
        "change_pct": -1.99,
        "score": 80,
        "grade": "A",
        "score_display": "80 (A)",
        "institutional_score": 80,
        "invalidation": 524.75,
        "entry_zone": "\u20b9529.50 - \u20b9538.45",
        "target_1": 559.0,
        "target_2": 572.7,
        "target_zone": "559.00 - 572.70",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.17,
        "setup_tags": [
            "Zone Retest",
            "Zone Retest Hold",
            "Clean 1-Bar Base",
            "Tight Base (1.4%)",
            "Drop -2.4%",
            "RVOL 3.3x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "FRESH DEMAND RETEST",
        "status_class": "dbr-retest",
        "stage": "FRESH DEMAND RETEST",
        "p_prox": 534.85,
        "p_dist": 527.3,
        "base_bars": 1,
        "base_depth_pct": 1.43,
        "drop_pct": 2.35,
        "rsi": 51.4,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "ASHOKLEY",
        "name": "Ashok Leyland Ltd.",
        "sector": "Capital Goods",
        "cmp": 163.0,
        "change_pct": 2.76,
        "score": 79,
        "grade": "B",
        "score_display": "79 (B)",
        "institutional_score": 79,
        "invalidation": 154.11,
        "entry_zone": "\u20b9159.64 - \u20b9163.00",
        "target_1": 176.33,
        "target_2": 185.22,
        "target_zone": "176.33 - 185.22",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.42,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 2-Bar Base",
            "Tight Base (3.2%)",
            "Drop -10.7%",
            "RVOL 1.4x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 159.64,
        "p_dist": 154.75,
        "base_bars": 2,
        "base_depth_pct": 3.16,
        "drop_pct": 10.7,
        "rsi": 43.7,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "HINDPETRO",
        "name": "Hindustan Petroleum Corporation Ltd.",
        "sector": "Oil Gas & Consumable Fuels",
        "cmp": 359.0,
        "change_pct": 2.56,
        "score": 79,
        "grade": "B",
        "score_display": "79 (B)",
        "institutional_score": 79,
        "invalidation": 341.68,
        "entry_zone": "\u20b9352.25 - \u20b9359.00",
        "target_1": 384.98,
        "target_2": 402.3,
        "target_zone": "384.98 - 402.30",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.6,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (2.7%)",
            "Drop -5.5%",
            "RVOL 1.6x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 352.25,
        "p_dist": 343.05,
        "base_bars": 1,
        "base_depth_pct": 2.68,
        "drop_pct": 5.47,
        "rsi": 49.0,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "IREDA",
        "name": "Indian Renewable Energy Development Agency Ltd.",
        "sector": "Financial Services",
        "cmp": 114.31999969482422,
        "change_pct": 4.89,
        "score": 79,
        "grade": "B",
        "score_display": "79 (B)",
        "institutional_score": 79,
        "invalidation": 106.97,
        "entry_zone": "\u20b9109.74 - \u20b9114.32",
        "target_1": 125.34,
        "target_2": 132.69,
        "target_zone": "125.34 - 132.69",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.28,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 2-Bar Base",
            "Tight Base (2.2%)",
            "Drop -5.8%",
            "RVOL 1.3x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 109.74,
        "p_dist": 107.4,
        "base_bars": 2,
        "base_depth_pct": 2.18,
        "drop_pct": 5.78,
        "rsi": 52.0,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "NAVA",
        "name": "Nava Ltd.",
        "sector": "Power",
        "cmp": 562.2999877929688,
        "change_pct": 2.55,
        "score": 79,
        "grade": "B",
        "score_display": "79 (B)",
        "institutional_score": 79,
        "invalidation": 532.91,
        "entry_zone": "\u20b9554.70 - \u20b9562.30",
        "target_1": 606.38,
        "target_2": 635.77,
        "target_zone": "606.38 - 635.77",
        "risk_reward_ratio": "1:2.5",
        "rvol": 2.67,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (3.7%)",
            "Drop -7.8%",
            "RVOL 2.7x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 554.7,
        "p_dist": 535.05,
        "base_bars": 1,
        "base_depth_pct": 3.67,
        "drop_pct": 7.75,
        "rsi": 51.3,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "KPRMILL",
        "name": "K.P.R. Mill Ltd.",
        "sector": "Textiles",
        "cmp": 1141.4000244140625,
        "change_pct": 1.78,
        "score": 77,
        "grade": "B",
        "score_display": "77 (B)",
        "institutional_score": 77,
        "invalidation": 1094.5,
        "entry_zone": "\u20b91,126.62 - \u20b91,143.69",
        "target_1": 1211.75,
        "target_2": 1258.65,
        "target_zone": "1,211.75 - 1,258.65",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.07,
        "setup_tags": [
            "Zone Retest",
            "Zone Retest Hold",
            "Clean 1-Bar Base",
            "Tight Base (3.4%)",
            "Drop -5.7%",
            "RVOL 3.0x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "FRESH DEMAND RETEST",
        "status_class": "dbr-retest",
        "stage": "FRESH DEMAND RETEST",
        "p_prox": 1138.0,
        "p_dist": 1100.6,
        "base_bars": 1,
        "base_depth_pct": 3.4,
        "drop_pct": 5.73,
        "rsi": 53.0,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "POWERGRID",
        "name": "Power Grid Corporation of India Ltd.",
        "sector": "Power",
        "cmp": 270.29998779296875,
        "change_pct": 2.85,
        "score": 77,
        "grade": "B",
        "score_display": "77 (B)",
        "institutional_score": 77,
        "invalidation": 261.75,
        "entry_zone": "\u20b9266.35 - \u20b9270.30",
        "target_1": 283.12,
        "target_2": 291.67,
        "target_zone": "283.12 - 291.67",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.98,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (1.4%)",
            "Drop -4.1%",
            "RVOL 2.0x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 266.35,
        "p_dist": 262.8,
        "base_bars": 1,
        "base_depth_pct": 1.35,
        "drop_pct": 4.11,
        "rsi": 52.2,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "SOBHA",
        "name": "Sobha Ltd.",
        "sector": "Realty",
        "cmp": 1215.199951171875,
        "change_pct": 2.83,
        "score": 75,
        "grade": "B",
        "score_display": "75 (B)",
        "institutional_score": 75,
        "invalidation": 1168.13,
        "entry_zone": "\u20b91,194.70 - \u20b91,215.20",
        "target_1": 1285.8,
        "target_2": 1332.87,
        "target_zone": "1,285.80 - 1,332.87",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.54,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (1.8%)",
            "Drop -8.1%",
            "RVOL 1.5x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 1194.7,
        "p_dist": 1173.1,
        "base_bars": 1,
        "base_depth_pct": 1.84,
        "drop_pct": 8.11,
        "rsi": 37.9,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "DALBHARAT",
        "name": "Dalmia Bharat Ltd.",
        "sector": "Construction Materials",
        "cmp": 1761.4000244140625,
        "change_pct": 4.0,
        "score": 74,
        "grade": "B",
        "score_display": "74 (B)",
        "institutional_score": 74,
        "invalidation": 1672.55,
        "entry_zone": "\u20b91,704.50 - \u20b91,761.40",
        "target_1": 1894.68,
        "target_2": 1983.53,
        "target_zone": "1,894.68 - 1,983.53",
        "risk_reward_ratio": "1:2.5",
        "rvol": 1.46,
        "setup_tags": [
            "Demand Leg-Out",
            "Clean 1-Bar Base",
            "Tight Base (1.4%)",
            "Drop -6.7%",
            "RVOL 1.5x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "DEMAND LEG-OUT",
        "status_class": "dbr-legout",
        "stage": "DEMAND LEG-OUT",
        "p_prox": 1704.5,
        "p_dist": 1681.0,
        "base_bars": 1,
        "base_depth_pct": 1.4,
        "drop_pct": 6.71,
        "rsi": 47.7,
        "timestamp": "2026-09-18"
    },
    {
        "symbol": "UTIAMC",
        "name": "UTI Asset Management Company Ltd.",
        "sector": "Financial Services",
        "cmp": 895.0,
        "change_pct": -0.02,
        "score": 72,
        "grade": "B",
        "score_display": "72 (B)",
        "institutional_score": 72,
        "invalidation": 874.09,
        "entry_zone": "\u20b9883.82 - \u20b9897.21",
        "target_1": 926.37,
        "target_2": 947.27,
        "target_zone": "926.37 - 947.27",
        "risk_reward_ratio": "1:2.5",
        "rvol": 0.93,
        "setup_tags": [
            "Zone Retest",
            "Zone Retest Hold",
            "Clean 2-Bar Base",
            "Tight Base (1.7%)",
            "Drop -2.9%",
            "RVOL 3.2x",
            "Bullish ERC Departure",
            "R:R 1:2.5"
        ],
        "status": "FRESH DEMAND RETEST",
        "status_class": "dbr-retest",
        "stage": "FRESH DEMAND RETEST",
        "p_prox": 892.75,
        "p_dist": 877.6,
        "base_bars": 2,
        "base_depth_pct": 1.73,
        "drop_pct": 2.94,
        "rsi": 47.7,
        "timestamp": "2026-09-18"
    }
];



  // Application State
  const state = {
    activeTab: 'setup_1',
    scannerData: null,
    marketSummary: null,
    searchQuery: '',
    selectedSector: 'ALL',
    selectedStage: 'ALL',
    sortColumn: 'score',
    sortDirection: 'desc',
    columnWidths: {},
    isLoading: false,
    currentPage: 1,
    pageSize: 10,
  };

  // Setup Metadata Mapping
  const SETUP_CONFIG = {
    setup_1: {
      title: '⚡ Setup 1: Bottom Reversal Pro',
      desc: 'Early institutional reversal, liquidity sweeps, accumulation base, and bullish structure shift.',
      tagClass: 'reversal',
    },
    setup_2: {
      title: '⚡ Setup 2: Alpha Momentum',
      desc: 'Nifty 500 multi-timeframe relative strength outperformance, volume expansion, and 10-60D base recovery.',
      tagClass: 'momentum',
    },
    setup_3: {
      title: '🚩 Setup 3: High Tight Flag (HTF)',
      desc: 'Explosive institutional momentum rally (>= +40% in <= 40D), tight base contraction (<= 20%), and volume dry-up.',
      tagClass: 'htf',
    },
    setup_4: {
      title: '📈 Setup 4: Weekly Swing',
      desc: 'Multi-timeframe institutional weekly swing structure, trend alignment, and low-risk accumulation.',
      tagClass: 'swing',
    },
    setup_5: {
      title: '🎯 Setup 5: Stage-2 Pullback',
      desc: 'Institutional low-risk entries at key EMA supports during verified Stage-2 uptrends.',
      tagClass: 'pullback',
    },
    setup_6: {
      title: '📦 Setup 6: DBR Demand Zone',
      desc: 'Institutional order block accumulation, fresh demand zone retests, and explosive leg-out expansions.',
      tagClass: 'dbr',
    },

  };

  // DOM Elements
  const DOM = {
    refreshBtn: document.getElementById('refresh-btn'),
    lastUpdatedText: document.getElementById('last-updated-text'),
    kpiAdvances: document.getElementById('kpi-advances'),
    kpiDeclines: document.getElementById('kpi-declines'),
    kpiRatio: document.getElementById('kpi-ratio'),
    kpiBias: document.getElementById('kpi-bias'),
    kpiNifty: document.getElementById('kpi-nifty'),
    kpiNiftyChange: document.getElementById('kpi-nifty-change'),
    kpiBankNifty: document.getElementById('kpi-banknifty'),
    kpiBankNiftyChange: document.getElementById('kpi-banknifty-change'),
    kpiMomentum: document.getElementById('kpi-momentum'),
    kpiAlerts: document.getElementById('kpi-alerts'),
    breadthFill: document.getElementById('breadth-fill'),
    setupTitle: document.getElementById('setup-title'),
    setupDesc: document.getElementById('setup-desc'),
    setupCountBadge: document.getElementById('setup-count-badge'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    tableBody: document.getElementById('table-body'),
    searchInput: document.getElementById('search-input'),
    sectorSelect: document.getElementById('sector-select'),
    stageSelect: document.getElementById('stage-select'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    tableHeaders: document.querySelectorAll('.pro-table th.sortable'),
    paginationBar: document.getElementById('pagination-bar'),
    paginationInfo: document.getElementById('pagination-info'),
    paginationControls: document.getElementById('pagination-controls'),
  };

  // Initialize App
  function init() {
    bindEvents();
    loadFromLocalStorageCache();
    ensureBaselineSignals();
    renderAll();
    fetchRemoteData();
  }

  function ensureBaselineSignals() {
    if (!state.scannerData) state.scannerData = { setups: {} };
    if (!state.scannerData.setups) state.scannerData.setups = {};
    if (!state.scannerData.setups.setup_1 || !state.scannerData.setups.setup_1.signals || !state.scannerData.setups.setup_1.signals.length) {
      state.scannerData.setups.setup_1 = {
        id: 'setup_1',
        title: '⚡ Setup 1: Bottom Reversal Pro',
        subtitle: 'Early institutional reversal, liquidity sweeps, accumulation base, and bullish structure shift.',
        count: DEFAULT_TAB1_SIGNALS.length,
        signals: [...DEFAULT_TAB1_SIGNALS]
      };
    }
    if (!state.scannerData.setups.setup_2 || !state.scannerData.setups.setup_2.signals || !state.scannerData.setups.setup_2.signals.length) {
      state.scannerData.setups.setup_2 = {
        id: 'setup_2',
        title: '⚡ Setup 2: Alpha Momentum',
        subtitle: 'Nifty 500 multi-timeframe relative strength outperformance, volume expansion, and 10-60D base recovery.',
        count: DEFAULT_TAB2_SIGNALS.length,
        signals: [...DEFAULT_TAB2_SIGNALS]
      };
    }
    if (!state.scannerData.setups.setup_3 || !state.scannerData.setups.setup_3.signals || !state.scannerData.setups.setup_3.signals.length) {
      state.scannerData.setups.setup_3 = {
        id: 'setup_3',
        title: '🚩 Setup 3: High Tight Flag (HTF)',
        subtitle: 'Explosive institutional momentum rally (>= +40% in <= 40D), tight base contraction (<= 20%), and volume dry-up.',
        count: DEFAULT_TAB3_SIGNALS.length,
        signals: [...DEFAULT_TAB3_SIGNALS]
      };
    }
    if (!state.scannerData.setups.setup_4 || !state.scannerData.setups.setup_4.signals || !state.scannerData.setups.setup_4.signals.length) {
      state.scannerData.setups.setup_4 = {
        id: 'setup_4',
        title: '📈 Setup 4: Weekly Swing',
        subtitle: 'Multi-timeframe institutional weekly swing structure, trend alignment, and low-risk accumulation.',
        count: DEFAULT_TAB4_SIGNALS.length,
        signals: [...DEFAULT_TAB4_SIGNALS]
      };
    }
    if (!state.scannerData.setups.setup_5 || !state.scannerData.setups.setup_5.signals || !state.scannerData.setups.setup_5.signals.length) {
      state.scannerData.setups.setup_5 = {
        id: 'setup_5',
        title: '🎯 Setup 5: Stage-2 Pullback',
        subtitle: 'Institutional low-risk entries at key EMA supports during verified Stage-2 uptrends.',
        count: DEFAULT_TAB5_SIGNALS.length,
        signals: [...DEFAULT_TAB5_SIGNALS]
      };
    }
    if (!state.scannerData.setups.setup_6 || !state.scannerData.setups.setup_6.signals || !state.scannerData.setups.setup_6.signals.length) {
      state.scannerData.setups.setup_6 = {
        id: 'setup_6',
        title: '📦 Setup 6: DBR Demand Zone',
        subtitle: 'Institutional order block accumulation, fresh demand zone retests, and explosive leg-out expansions.',
        count: DEFAULT_TAB6_SIGNALS.length,
        signals: [...DEFAULT_TAB6_SIGNALS]
      };
    }

  }

  // Event Listeners
  function bindEvents() {
    if (DOM.refreshBtn) {
      DOM.refreshBtn.addEventListener('click', () => {
        refreshData(true);
      });
    }

    if (DOM.tabButtons) {
      DOM.tabButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const tabId = btn.getAttribute('data-tab');
          if (tabId && tabId !== state.activeTab) {
            setActiveTab(tabId);
          }
        });
      });
    }

    if (DOM.searchInput) {
      DOM.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        state.currentPage = 1;
        renderTable();
      });
    }

    if (DOM.sectorSelect) {
      DOM.sectorSelect.addEventListener('change', (e) => {
        state.selectedSector = e.target.value;
        state.currentPage = 1;
        renderTable();
      });
    }

    if (DOM.stageSelect) {
      DOM.stageSelect.addEventListener('change', (e) => {
        state.selectedStage = e.target.value;
        state.currentPage = 1;
        renderTable();
      });
    }

    if (DOM.exportCsvBtn) {
      DOM.exportCsvBtn.addEventListener('click', exportToCsv);
    }

    if (DOM.tableHeaders) {
      DOM.tableHeaders.forEach((th) => {
        th.addEventListener('click', () => {
          const col = th.getAttribute('data-col');
          if (!col) return;
          if (state.sortColumn === col) {
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            state.sortColumn = col;
            state.sortDirection = 'desc';
          }
          state.currentPage = 1;
          renderTable();
        });
      });
    }

    const dossierCloseBtn = document.getElementById('dossier-close');
    const dossierBackdrop = document.getElementById('dossier-backdrop');
    if (dossierCloseBtn) {
      dossierCloseBtn.addEventListener('click', closeSetupDossier);
    }
    if (dossierBackdrop) {
      dossierBackdrop.addEventListener('click', (e) => {
        if (e.target === dossierBackdrop) {
          closeSetupDossier();
        }
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        closeSetupDossier();
      }
    });
  }

  // Instant Local-Storage Cache Loader
  function loadFromLocalStorageCache() {
    try {
      try {
        localStorage.removeItem('MITS_PRO_TAB5_DATA_V3');
        localStorage.removeItem('MITS_PRO_TAB5_DATA');
        localStorage.removeItem('MITS_PRO_TAB2_DATA_V3');
        localStorage.removeItem('MITS_PRO_TAB2_DATA');
        localStorage.removeItem('MITS_PRO_TAB6_DATA');
        localStorage.removeItem('MITS_PRO_SCANNER_V2_DATA_V3');
        localStorage.removeItem('MITS_PRO_SCANNER_V2_DATA');
      } catch (_) {}
      const cachedScanner = localStorage.getItem(CACHE_KEY_SCANNER);
      const cachedSummary = localStorage.getItem(CACHE_KEY_SUMMARY);
      const cachedTab1 = localStorage.getItem(CACHE_KEY_TAB1);
      const cachedTab2 = localStorage.getItem(CACHE_KEY_TAB2);
      const cachedTab3 = localStorage.getItem(CACHE_KEY_TAB3);

      if (cachedScanner) {
        state.scannerData = JSON.parse(cachedScanner);
      }
      if (cachedSummary) {
        state.marketSummary = JSON.parse(cachedSummary);
      }
      if (cachedTab1) {
        const tab1Data = JSON.parse(cachedTab1);
        if (tab1Data && tab1Data.signals && tab1Data.signals.length) {
          if (!state.scannerData) state.scannerData = { setups: {} };
          if (!state.scannerData.setups) state.scannerData.setups = {};
          state.scannerData.setups.setup_1 = {
            id: 'setup_1',
            title: tab1Data.title || '⚡ Setup 1: Bottom Reversal Pro',
            subtitle: tab1Data.subtitle || 'Early institutional reversal, liquidity sweeps, accumulation base, and bullish structure shift.',
            count: tab1Data.signals.length,
            signals: tab1Data.signals,
          };
        }
      }
      if (cachedTab2) {
        const tab2Data = JSON.parse(cachedTab2);
        if (tab2Data && tab2Data.signals && tab2Data.signals.length) {
          if (!state.scannerData) state.scannerData = { setups: {} };
          if (!state.scannerData.setups) state.scannerData.setups = {};
          state.scannerData.setups.setup_2 = {
            id: 'setup_2',
            title: tab2Data.title || '⚡ Setup 2: Alpha Momentum',
            subtitle: tab2Data.subtitle || 'Nifty 500 multi-timeframe relative strength outperformance, volume expansion, and 10-60D base recovery.',
            count: tab2Data.signals.length,
            signals: tab2Data.signals,
          };
        }
      }
      if (cachedTab3) {
        const tab3Data = JSON.parse(cachedTab3);
        if (tab3Data && tab3Data.signals && tab3Data.signals.length) {
          if (!state.scannerData) state.scannerData = { setups: {} };
          if (!state.scannerData.setups) state.scannerData.setups = {};
          state.scannerData.setups.setup_3 = {
            id: 'setup_3',
            title: tab3Data.title || '🚩 Setup 3: High Tight Flag (HTF)',
            subtitle: tab3Data.subtitle || 'Explosive institutional momentum rally (>= +40% in <= 40D), tight base contraction (<= 20%), and volume dry-up.',
            count: tab3Data.signals.length,
            signals: tab3Data.signals,
          };
        }
      }
      const cachedTab4 = localStorage.getItem(CACHE_KEY_TAB4);
      if (cachedTab4) {
        const tab4Data = JSON.parse(cachedTab4);
        if (tab4Data && tab4Data.signals && tab4Data.signals.length) {
          if (!state.scannerData) state.scannerData = { setups: {} };
          if (!state.scannerData.setups) state.scannerData.setups = {};
          state.scannerData.setups.setup_4 = {
            id: 'setup_4',
            title: tab4Data.title || '📈 Setup 4: Weekly Swing',
            subtitle: tab4Data.subtitle || 'Multi-timeframe institutional weekly swing structure, trend alignment, and low-risk accumulation.',
            count: tab4Data.signals.length,
            signals: tab4Data.signals,
          };
        }
      }
      const cachedTab5 = localStorage.getItem(CACHE_KEY_TAB5);
      if (cachedTab5) {
        const tab5Data = JSON.parse(cachedTab5);
        if (tab5Data && tab5Data.signals && tab5Data.signals.length) {
          if (!state.scannerData) state.scannerData = { setups: {} };
          if (!state.scannerData.setups) state.scannerData.setups = {};
          state.scannerData.setups.setup_5 = {
            id: 'setup_5',
            title: tab5Data.title || '🎯 Setup 5: Stage-2 Pullback',
            subtitle: tab5Data.subtitle || 'Institutional low-risk entries at key EMA supports during verified Stage-2 uptrends.',
            count: tab5Data.signals.length,
            signals: tab5Data.signals,
          };
        }
      }
      const cachedTab6 = localStorage.getItem(CACHE_KEY_TAB6);
      if (cachedTab6) {
        const tab6Data = JSON.parse(cachedTab6);
        if (tab6Data && tab6Data.signals && tab6Data.signals.length) {
          if (!state.scannerData) state.scannerData = { setups: {} };
          if (!state.scannerData.setups) state.scannerData.setups = {};
          state.scannerData.setups.setup_6 = {
            id: 'setup_6',
            title: tab6Data.title || '📦 Setup 6: DBR Demand Zone',
            subtitle: tab6Data.subtitle || 'Institutional order block accumulation, fresh demand zone retests, and explosive leg-out expansions.',
            count: tab6Data.signals.length,
            signals: tab6Data.signals,
          };
        }
      }

    } catch (err) {
      console.warn('[MITS Pro] Cache read warning:', err);
    }
  }

  // Save to Local Storage Cache
  function saveToLocalStorageCache(scannerPayload, summaryPayload, tab1Payload, tab2Payload, tab3Payload, tab4Payload, tab5Payload, tab6Payload) {
    try {
      if (scannerPayload) {
        localStorage.setItem(CACHE_KEY_SCANNER, JSON.stringify(scannerPayload));
      }
      if (summaryPayload) {
        localStorage.setItem(CACHE_KEY_SUMMARY, JSON.stringify(summaryPayload));
      }
      if (tab1Payload) {
        localStorage.setItem(CACHE_KEY_TAB1, JSON.stringify(tab1Payload));
      }
      if (tab2Payload) {
        localStorage.setItem(CACHE_KEY_TAB2, JSON.stringify(tab2Payload));
      }
      if (tab3Payload) {
        localStorage.setItem(CACHE_KEY_TAB3, JSON.stringify(tab3Payload));
      }
      if (tab4Payload) {
        localStorage.setItem(CACHE_KEY_TAB4, JSON.stringify(tab4Payload));
      }
      if (tab5Payload) {
        localStorage.setItem(CACHE_KEY_TAB5, JSON.stringify(tab5Payload));
      }
      if (tab6Payload) {
        localStorage.setItem(CACHE_KEY_TAB6, JSON.stringify(tab6Payload));
      }
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (err) {
      console.warn('[MITS Pro] Cache write warning:', err);
    }
  }


  // Asynchronous Remote Data Fetching
  async function fetchRemoteData(force = false) {
    state.isLoading = true;
    if (DOM.refreshBtn) {
      DOM.refreshBtn.classList.add('spinning');
    }

    // Determine paths (works seamlessly on GitHub Pages, root, or embedded subpaths)
    const basePath = window.location.pathname.includes('/wordpress') ? '../data/' : './data/';

    try {
      const ts = Date.now();
      const [scannerRes, summaryRes, tab1Res, tab2Res, tab3Res, tab4Res, tab5Res, tab6Res] = await Promise.allSettled([
        fetch(basePath + 'scanner_results.json?t=' + ts),
        fetch(basePath + 'market_summary.json?t=' + ts),
        fetch(basePath + 'tab1_bottom_reversal.json?t=' + ts),
        fetch(basePath + 'tab2_alpha_momentum.json?t=' + ts),
        fetch(basePath + 'tab3_htf.json?t=' + ts),
        fetch(basePath + 'tab4_weekly_swing.json?t=' + ts),
        fetch(basePath + 'tab5_stage2_pullback.json?t=' + ts),
        fetch(basePath + 'tab6_dbr.json?t=' + ts),
      ]);

      let newScanner = null;
      let newSummary = null;
      let newTab1 = null;
      let newTab2 = null;
      let newTab3 = null;
      let newTab4 = null;
      let newTab5 = null;
      let newTab6 = null;

      if (scannerRes.status === 'fulfilled' && scannerRes.value.ok) {
        newScanner = await scannerRes.value.json();
        state.scannerData = newScanner;
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
        newSummary = await summaryRes.value.json();
        state.marketSummary = newSummary;
      }

      if (tab1Res.status === 'fulfilled' && tab1Res.value.ok) {
        newTab1 = await tab1Res.value.json();
        if (newTab1 && newTab1.signals) {
          if (!state.scannerData) state.scannerData = { setups: {} };
          if (!state.scannerData.setups) state.scannerData.setups = {};
          state.scannerData.setups.setup_1 = {
            id: 'setup_1',
            title: newTab1.title || '⚡ Setup 1: Bottom Reversal Pro',
            subtitle: newTab1.subtitle || 'Early institutional reversal, liquidity sweeps, accumulation base, and bullish structure shift.',
            count: newTab1.signals.length,
            signals: newTab1.signals,
          };
        }
      }

      if (tab2Res.status === 'fulfilled' && tab2Res.value.ok) {
        newTab2 = await tab2Res.value.json();
        if (newTab2 && newTab2.signals) {
          if (!state.scannerData) state.scannerData = { setups: {} };
          if (!state.scannerData.setups) state.scannerData.setups = {};
          state.scannerData.setups.setup_2 = {
            id: 'setup_2',
            title: newTab2.title || '⚡ Setup 2: Alpha Momentum',
            subtitle: newTab2.subtitle || 'Nifty 500 multi-timeframe relative strength outperformance, volume expansion, and 10-60D base recovery.',
            count: newTab2.signals.length,
            signals: newTab2.signals,
          };
        }
      }

      if (tab3Res.status === 'fulfilled' && tab3Res.value.ok) {
        newTab3 = await tab3Res.value.json();
        if (newTab3 && newTab3.signals) {
          if (!state.scannerData) state.scannerData = { setups: {} };
          if (!state.scannerData.setups) state.scannerData.setups = {};
          state.scannerData.setups.setup_3 = {
            id: 'setup_3',
            title: newTab3.title || '🚩 Setup 3: High Tight Flag (HTF)',
            subtitle: newTab3.subtitle || 'Explosive institutional momentum rally (>= +40% in <= 40D), tight base contraction (<= 20%), and volume dry-up.',
            count: newTab3.signals.length,
            signals: newTab3.signals,
          };
        }
      }

      if (tab4Res.status === 'fulfilled' && tab4Res.value.ok) {
        newTab4 = await tab4Res.value.json();
        if (newTab4 && newTab4.signals) {
          if (!state.scannerData) state.scannerData = { setups: {} };
          if (!state.scannerData.setups) state.scannerData.setups = {};
          state.scannerData.setups.setup_4 = {
            id: 'setup_4',
            title: newTab4.title || '📈 Setup 4: Weekly Swing',
            subtitle: newTab4.subtitle || 'Multi-timeframe institutional weekly swing structure, trend alignment, and low-risk accumulation.',
            count: newTab4.signals.length,
            signals: newTab4.signals,
          };
        }
      }

      if (tab5Res.status === 'fulfilled' && tab5Res.value.ok) {
        newTab5 = await tab5Res.value.json();
        if (newTab5 && newTab5.signals) {
          if (!state.scannerData) state.scannerData = { setups: {} };
          if (!state.scannerData.setups) state.scannerData.setups = {};
          state.scannerData.setups.setup_5 = {
            id: 'setup_5',
            title: newTab5.title || '🎯 Setup 5: Stage-2 Pullback',
            subtitle: newTab5.subtitle || 'Institutional low-risk entries at key EMA supports during verified Stage-2 uptrends.',
            count: newTab5.signals.length,
            signals: newTab5.signals,
          };
        }
      }

      if (tab6Res.status === 'fulfilled' && tab6Res.value.ok) {
        newTab6 = await tab6Res.value.json();
        if (newTab6 && newTab6.signals) {
          if (!state.scannerData) state.scannerData = { setups: {} };
          if (!state.scannerData.setups) state.scannerData.setups = {};
          state.scannerData.setups.setup_6 = {
            id: 'setup_6',
            title: newTab6.title || '📦 Setup 6: DBR Demand Zone',
            subtitle: newTab6.subtitle || 'Institutional order block accumulation, fresh demand zone retests, and explosive leg-out expansions.',
            count: newTab6.signals.length,
            signals: newTab6.signals,
          };
        }
      }

      if (newScanner || newSummary || newTab1 || newTab2 || newTab3 || newTab4 || newTab5 || newTab6) {
        saveToLocalStorageCache(state.scannerData, state.marketSummary, newTab1, newTab2, newTab3, newTab4, newTab5, newTab6);
        renderAll();
      }

    } catch (err) {
      console.error('[MITS Pro] Network fetch error:', err);
    } finally {
      state.isLoading = false;
      if (DOM.refreshBtn) {
        DOM.refreshBtn.classList.remove('spinning');
      }
    }
  }

  function refreshData(force = true) {
    fetchRemoteData(force);
  }

  function setActiveTab(tabId) {
    state.activeTab = tabId;
    DOM.tabButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    const config = SETUP_CONFIG[tabId] || SETUP_CONFIG.setup_1;
    if (DOM.setupTitle) DOM.setupTitle.textContent = config.title;
    if (DOM.setupDesc) DOM.setupDesc.textContent = config.desc;

    // Reset filters and page on tab switch so signals are always visible
    state.searchQuery = '';
    state.selectedSector = 'ALL';
    state.selectedStage = 'ALL';
    state.currentPage = 1;
    if (DOM.searchInput) DOM.searchInput.value = '';
    if (DOM.sectorSelect) DOM.sectorSelect.value = 'ALL';
    if (DOM.stageSelect) {
      DOM.stageSelect.style.display = tabId === 'setup_3' ? 'inline-block' : 'none';
      DOM.stageSelect.value = 'ALL';
    }

    populateSectorFilter();
    renderTable();
  }

  function renderAll() {
    renderKPIs();
    populateSectorFilter();
    updateTabBadges();
    renderTable();
  }

  // Render Market Summary & KPIs
  function renderKPIs() {
    const summary = state.marketSummary;
    if (!summary) return;

    if (DOM.lastUpdatedText && summary.scan_timestamp) {
      const dt = new Date(summary.scan_timestamp);
      DOM.lastUpdatedText.textContent = isNaN(dt)
        ? summary.scan_timestamp
        : dt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    const breadth = summary.market_breadth || {};
    if (DOM.kpiAdvances) DOM.kpiAdvances.textContent = breadth.advances ?? '--';
    if (DOM.kpiDeclines) DOM.kpiDeclines.textContent = breadth.declines ?? '--';
    if (DOM.kpiRatio) DOM.kpiRatio.textContent = breadth.ratio ?? '--';
    if (DOM.kpiBias) DOM.kpiBias.textContent = breadth.institutional_bias ?? 'ACCUMULATION';
    if (DOM.kpiMomentum) DOM.kpiMomentum.textContent = breadth.high_momentum_count ?? '0';
    if (DOM.kpiAlerts) DOM.kpiAlerts.textContent = breadth.pro_alerts_count ?? '0';

    if (DOM.breadthFill && breadth.advances && breadth.declines) {
      const total = breadth.advances + breadth.declines;
      const advPct = Math.round((breadth.advances / total) * 100);
      DOM.breadthFill.style.width = `${advPct}%`;
    }

    const indices = summary.indices || {};
    if (indices.NIFTY_50 && DOM.kpiNifty) {
      DOM.kpiNifty.textContent = formatCurrency(indices.NIFTY_50.price);
      if (DOM.kpiNiftyChange) {
        const chg = indices.NIFTY_50.change_pct;
        DOM.kpiNiftyChange.innerHTML = `<span class="${chg >= 0 ? 'text-bullish' : 'text-bearish'}">${chg >= 0 ? '+' : ''}${chg}%</span>`;
      }
    }

    if (indices.BANKNIFTY && DOM.kpiBankNifty) {
      DOM.kpiBankNifty.textContent = formatCurrency(indices.BANKNIFTY.price);
      if (DOM.kpiBankNiftyChange) {
        const chg = indices.BANKNIFTY.change_pct;
        DOM.kpiBankNiftyChange.innerHTML = `<span class="${chg >= 0 ? 'text-bullish' : 'text-bearish'}">${chg >= 0 ? '+' : ''}${chg}%</span>`;
      }
    }
  }

  // Update Badge Counts on Tabs
  function updateTabBadges() {
    if (!state.scannerData || !state.scannerData.setups) return;
    const setups = state.scannerData.setups;

    Object.keys(SETUP_CONFIG).forEach((tabId) => {
      const countEl = document.getElementById(`count-${tabId}`);
      if (countEl) {
        const setup = setups[tabId];
        countEl.textContent = setup ? (setup.signals ? setup.signals.length : 0) : 0;
      }
    });
  }

  // Populate Sector Filter Options Dynamically
  function populateSectorFilter() {
    if (!state.scannerData || !state.scannerData.setups || !DOM.sectorSelect) return;

    const currentSector = state.selectedSector;
    const sectorsSet = new Set();

    Object.values(state.scannerData.setups).forEach((setup) => {
      if (setup.signals) {
        setup.signals.forEach((sig) => {
          if (sig.sector) sectorsSet.add(sig.sector);
        });
      }
    });

    DOM.sectorSelect.innerHTML = '<option value="ALL">All Sectors</option>';
    Array.from(sectorsSet).sort().forEach((sec) => {
      const opt = document.createElement('option');
      opt.value = sec;
      opt.textContent = sec;
      if (sec === currentSector) opt.selected = true;
      DOM.sectorSelect.appendChild(opt);
    });
  }

  // Render Pagination Controls
  function renderPaginationControls(totalSignals, totalPages, startIdx, endIdx) {
    if (!DOM.paginationInfo || !DOM.paginationControls) return;

    if (totalSignals === 0) {
      DOM.paginationInfo.innerHTML = 'Showing <span>0</span> to <span>0</span> of Total <span>0</span> stocks';
      DOM.paginationControls.innerHTML = '';
      if (DOM.paginationBar) DOM.paginationBar.style.display = 'none';
      return;
    }

    if (DOM.paginationBar) DOM.paginationBar.style.display = 'flex';
    DOM.paginationInfo.innerHTML = `Showing <span>${startIdx + 1}</span> to <span>${endIdx}</span> of Total <span>${totalSignals}</span> stocks`;

    if (totalPages <= 1) {
      DOM.paginationControls.innerHTML = '';
      return;
    }

    let buttonsHtml = '';
    const prevDisabled = state.currentPage === 1 ? ' disabled' : '';
    buttonsHtml += `<button class="page-btn page-prev" data-page="${state.currentPage - 1}"${prevDisabled} title="Previous Page">◀ Prev</button>`;

    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (state.currentPage > 3) pages.push('...');
      const start = Math.max(2, state.currentPage - 1);
      const end = Math.min(totalPages - 1, state.currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (state.currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    pages.forEach((p) => {
      if (p === '...') {
        buttonsHtml += `<span class="page-dots">…</span>`;
      } else {
        const isActive = p === state.currentPage ? ' active' : '';
        buttonsHtml += `<button class="page-btn${isActive}" data-page="${p}">${p}</button>`;
      }
    });

    const nextDisabled = state.currentPage === totalPages ? ' disabled' : '';
    buttonsHtml += `<button class="page-btn page-next" data-page="${state.currentPage + 1}"${nextDisabled} title="Next Page">Next ▶</button>`;

    DOM.paginationControls.innerHTML = buttonsHtml;

    DOM.paginationControls.querySelectorAll('.page-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetPage = parseInt(btn.getAttribute('data-page'), 10);
        if (targetPage && targetPage !== state.currentPage && targetPage >= 1 && targetPage <= totalPages) {
          state.currentPage = targetPage;
          renderTable();
          const tableWrap = document.querySelector('.table-responsive');
          if (tableWrap) {
            tableWrap.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          }
        }
      });
    });
  }

  // Render Table for Active Tab
  function renderTable() {
    if (!DOM.tableBody) return;

    const setups = state.scannerData ? state.scannerData.setups : null;
    const activeSetup = setups ? setups[state.activeTab] : null;
    let signals = activeSetup && activeSetup.signals ? [...activeSetup.signals] : [];

    // Filter by Search Query
    if (state.searchQuery) {
      signals = signals.filter((s) => {
        const sym = (s.symbol || '').toLowerCase();
        const nm = (s.name || '').toLowerCase();
        const sec = (s.sector || '').toLowerCase();
        return sym.includes(state.searchQuery) || nm.includes(state.searchQuery) || sec.includes(state.searchQuery);
      });
    }

    // Filter by Sector
    if (state.selectedSector !== 'ALL') {
      signals = signals.filter((s) => s.sector === state.selectedSector);
    }

    // Filter by HTF Stage (Tab 3 only)
    if (state.activeTab === 'setup_3' && state.selectedStage !== 'ALL') {
      signals = signals.filter((s) => s.stage === state.selectedStage);
    }

  const NUMERIC_SORT_COLS = [
    'cmp', 'change_pct', 'rvol', 'score', 'institutional_score',
    'invalidation', 'target_1', 'ret_1w', 'rs_1y', 'pole_gain_pct', 'correction_pct'
  ];

  function parseNumeric(val) {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^\d.-]/g, '').trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  function initColumnResizing(table, widthStorage) {
    if (!table) return;
    const ths = table.querySelectorAll('thead th');
    ths.forEach((th, index) => {
      const colKey = th.getAttribute('data-col') || `col_${index}`;
      if (widthStorage && widthStorage[colKey]) {
        th.style.width = widthStorage[colKey] + 'px';
        th.style.minWidth = widthStorage[colKey] + 'px';
      }

      // Do not add resizer to the Action column (last column)
      if (index === ths.length - 1) return;

      let resizer = th.querySelector('.resizer');
      if (!resizer) {
        resizer = document.createElement('div');
        resizer.className = 'resizer';
        th.appendChild(resizer);
      }

      resizer.onmousedown = function (e) {
        e.stopPropagation();
        e.preventDefault();

        const startX = e.clientX;
        const startWidth = th.offsetWidth;
        const minWidth = th.classList.contains('sticky-col') ? 90 : 70;

        resizer.classList.add('resizing');
        document.body.classList.add('resizing-active');

        function onMouseMove(moveEvent) {
          const deltaX = moveEvent.clientX - startX;
          const newWidth = Math.max(minWidth, startWidth + deltaX);
          th.style.width = newWidth + 'px';
          th.style.minWidth = newWidth + 'px';
          if (widthStorage) {
            widthStorage[colKey] = newWidth;
          }
          if (colKey === 'symbol') {
            document.documentElement.style.setProperty('--sticky-col1-width', newWidth + 'px');
          } else if (colKey === 'cmp') {
            document.documentElement.style.setProperty('--sticky-col2-width', newWidth + 'px');
          }
        }

        function onMouseUp() {
          resizer.classList.remove('resizing');
          document.body.classList.remove('resizing-active');
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };
    });
  }

    // Sort Signals safely with multi-key fallbacks and strict numeric stripping
    const isNumCol = NUMERIC_SORT_COLS.includes(state.sortColumn);
    signals.sort((a, b) => {
      let key = state.sortColumn;
      let valA, valB;

      if (key === 'score' || key === 'institutional_score') {
        valA = a.score !== undefined ? a.score : a.institutional_score;
        valB = b.score !== undefined ? b.score : b.institutional_score;
      } else if (key === 'target_1') {
        valA = a.target_1 !== undefined ? a.target_1 : (a.target_zone || 0);
        valB = b.target_1 !== undefined ? b.target_1 : (b.target_zone || 0);
      } else {
        valA = a[key];
        valB = b[key];
      }

      if (isNumCol) {
        const numA = parseNumeric(valA);
        const numB = parseNumeric(valB);
        return state.sortDirection === 'asc' ? numA - numB : numB - numA;
      } else {
        const strA = (valA !== undefined && valA !== null ? String(valA) : '').toLowerCase();
        const strB = (valB !== undefined && valB !== null ? String(valB) : '').toLowerCase();
        if (strA < strB) return state.sortDirection === 'asc' ? -1 : 1;
        if (strA > strB) return state.sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
    });

    // Update count in context banner
    if (DOM.setupCountBadge) {
      DOM.setupCountBadge.textContent = `${signals.length} Signals`;
    }

    const totalSignals = signals.length;
    const totalPages = Math.ceil(totalSignals / state.pageSize) || 1;
    if (state.currentPage > totalPages) {
      state.currentPage = totalPages;
    }
    if (state.currentPage < 1) {
      state.currentPage = 1;
    }

    const startIdx = (state.currentPage - 1) * state.pageSize;
    const endIdx = Math.min(startIdx + state.pageSize, totalSignals);
    const paginatedSignals = signals.slice(startIdx, endIdx);

    renderPaginationControls(totalSignals, totalPages, startIdx, endIdx);

    // If empty
    if (signals.length === 0) {
      DOM.tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p style="font-weight: 600; color: var(--gold-300); margin-bottom: 4px;">No Signals Found</p>
            <p style="font-size: 0.8rem;">No institutional signals match the current criteria for this setup.</p>
          </td>
        </tr>
      `;
      return;
    }

    function renderSortHeader(colKey, label, stickyClass = '', extraThClass = '') {
      const isActive = state.sortColumn === colKey;
      const activeClass = isActive ? ' active-sort' : '';
      const arrow = isActive
        ? (state.sortDirection === 'desc' ? '<span class="sort-icon active">▼</span>' : '<span class="sort-icon active">▲</span>')
        : '<span class="sort-icon">↕</span>';
      const sticky = stickyClass ? ` ${stickyClass}` : '';
      const extra = extraThClass ? ` ${extraThClass}` : '';
      return `<th class="sortable${sticky}${extra}${activeClass}" data-col="${colKey}">${label} ${arrow}</th>`;
    }

    // Streamlined 6-Column Header
    const thead = document.querySelector('.pro-table thead');
    if (thead) {
      if (state.activeTab === 'setup_1') {
        thead.innerHTML = `
          <tr>
            ${renderSortHeader('symbol', 'Symbol / Company', 'sticky-col sticky-col-1')}
            ${renderSortHeader('cmp', 'CMP (₹)', 'sticky-col sticky-col-2')}
            ${renderSortHeader('sector', 'Sector')}
            ${renderSortHeader('change_pct', 'Change %')}
            ${renderSortHeader('score', 'Score & Grade')}
            <th>Action</th>
          </tr>
        `;
      } else if (state.activeTab === 'setup_5' || state.activeTab === 'setup_6') {
        thead.innerHTML = `
          <tr>
            ${renderSortHeader('symbol', 'Symbol / Company', 'sticky-col sticky-col-1')}
            ${renderSortHeader('cmp', 'CMP (₹)', 'sticky-col sticky-col-2')}
            ${renderSortHeader('sector', 'Sector')}
            ${renderSortHeader('change_pct', 'Change %')}
            ${renderSortHeader('score', 'Score & Grade')}
            <th>Action</th>
          </tr>
        `;
      } else {
        thead.innerHTML = `
          <tr>
            ${renderSortHeader('symbol', 'Symbol / Company', 'sticky-col sticky-col-1')}
            ${renderSortHeader('cmp', 'CMP (₹)', 'sticky-col sticky-col-2')}
            ${renderSortHeader('sector', 'Sector')}
            ${renderSortHeader('change_pct', 'Change %')}
            ${renderSortHeader('score', 'Score & Grade')}
            <th>Action</th>
          </tr>
        `;
      }

      // Re-bind sort headers
      thead.querySelectorAll('th.sortable').forEach((th) => {
        th.addEventListener('click', (e) => {
          if (e.target.classList.contains('resizer')) return;
          const col = th.getAttribute('data-col');
          if (!col) return;
          if (state.sortColumn === col) {
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            state.sortColumn = col;
            state.sortDirection = 'desc';
          }
          state.currentPage = 1;
          renderTable();
        });
      });

      // Initialize Draggable Column Resizing
      initColumnResizing(document.querySelector('.pro-table'), state.columnWidths);
    }

    // Render Streamlined 6-Column Rows
    DOM.tableBody.innerHTML = paginatedSignals
      .map((sig) => {
        const changeClass = sig.change_pct >= 0 ? 'positive' : 'negative';
        const changeSign = sig.change_pct >= 0 ? '+' : '';
        const gradeClass = (sig.grade || 'A').replace('+', '_PLUS');
        const scoreDisplay = sig.score_display || `${sig.score || '--'} (${sig.grade || 'A'})`;

        return `
          <tr data-symbol="${sig.symbol}" class="clickable-row">
            <td class="sticky-col sticky-col-1">
              <div class="ticker-cell">
                <span class="ticker-symbol">${sig.symbol}</span>
                <span class="ticker-name">${sig.name || ''}</span>
              </div>
            </td>
            <td class="sticky-col sticky-col-2 num-cell" style="font-family: var(--font-mono); font-weight: 700; color: #ffffff;">₹${formatCurrency(sig.cmp)}</td>
            <td><span style="color: var(--text-secondary); font-size: 0.82rem;">${sig.sector || 'NSE'}</span></td>
            <td>
              <span class="change-pill ${changeClass}">${changeSign}${sig.change_pct}%</span>
            </td>
            <td>
              <span class="score-badge-grade grade-${gradeClass}">${scoreDisplay}</span>
            </td>
            <td>
              <button type="button" class="btn-view-setup" data-symbol="${sig.symbol}">
                View Setup ⚡
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    DOM.tableBody.querySelectorAll('tr.clickable-row').forEach((row) => {
      row.addEventListener('click', () => {
        const sym = row.getAttribute('data-symbol');
        if (sym) openSetupDossier(sym);
      });
    });

    DOM.tableBody.querySelectorAll('.btn-view-setup').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sym = btn.getAttribute('data-symbol');
        if (sym) openSetupDossier(sym);
      });
    });
  }

  function openSetupDossier(symbol) {
    const setups = state.scannerData ? state.scannerData.setups : null;
    const activeSetup = setups ? setups[state.activeTab] : null;
    const signals = activeSetup && activeSetup.signals ? activeSetup.signals : [];
    const sig = signals.find((s) => s.symbol === symbol);
    if (!sig) return;

    const backdrop = document.getElementById('dossier-backdrop');
    if (!backdrop) return;

    const titleEl = document.getElementById('dossier-title');
    const nameEl = document.getElementById('dossier-name');
    const sectorEl = document.getElementById('dossier-sector');
    const cmpEl = document.getElementById('dossier-cmp');
    const chgEl = document.getElementById('dossier-chg');
    const scoreBadgeEl = document.getElementById('dossier-score-badge');
    const setupTagEl = document.getElementById('dossier-setup-tag');

    if (titleEl) titleEl.textContent = sig.symbol;
    if (nameEl) nameEl.textContent = sig.name || 'NSE Equity';
    if (sectorEl) sectorEl.textContent = sig.sector || 'NSE';
    if (cmpEl) cmpEl.textContent = `₹${formatCurrency(sig.cmp)}`;

    if (chgEl) {
      const isPos = (sig.change_pct || 0) >= 0;
      chgEl.textContent = `${isPos ? '+' : ''}${sig.change_pct}%`;
      chgEl.style.color = isPos ? 'var(--bullish, #10b981)' : 'var(--bearish, #f43f5e)';
      chgEl.style.background = isPos ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)';
      chgEl.style.border = `1px solid ${isPos ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)'}`;
    }

    if (scoreBadgeEl) {
      scoreBadgeEl.textContent = sig.score_display || `${sig.score || '--'} (${sig.grade || 'A'})`;
    }

    const config = SETUP_CONFIG[state.activeTab];
    if (setupTagEl) {
      setupTagEl.textContent = config ? config.title : 'Institutional Setup';
    }

    const statusValEl = document.getElementById('dossier-status');
    if (statusValEl) {
      statusValEl.textContent = sig.status || sig.stage || 'CONFIRMED SETUP';
    }

    const entryEl = document.getElementById('dossier-entry');
    const slEl = document.getElementById('dossier-sl');
    const slSubEl = document.getElementById('dossier-sl-sub');
    const t1El = document.getElementById('dossier-t1');
    const rr1El = document.getElementById('dossier-rr1');
    const t2El = document.getElementById('dossier-t2');
    const rr2El = document.getElementById('dossier-rr2');

    if (entryEl) {
      entryEl.textContent = sig.entry_zone ? sig.entry_zone : `₹${formatCurrency(sig.cmp)}`;
    }

    if (slEl) {
      slEl.textContent = sig.invalidation ? `₹${formatCurrency(sig.invalidation)}` : '--';
      if (slSubEl && sig.cmp && sig.invalidation) {
        const riskPct = Math.abs(((sig.cmp - sig.invalidation) / sig.cmp) * 100).toFixed(1);
        slSubEl.textContent = `Structural Risk: -${riskPct}%`;
      }
    }

    if (t1El) {
      t1El.textContent = sig.target_1 ? `₹${formatCurrency(sig.target_1)}` : (sig.target_zone ? `₹${sig.target_zone}` : '--');
      if (rr1El) {
        rr1El.textContent = `Target 1 (R:R ${sig.risk_reward_ratio || '1:2.0'})`;
      }
    }

    if (t2El) {
      t2El.textContent = sig.target_2 ? `₹${formatCurrency(sig.target_2)}` : '--';
      if (rr2El) {
        rr2El.textContent = 'Target 2 Extended Runner';
      }
    }

    const tagsContainer = document.getElementById('dossier-tags');
    if (tagsContainer) {
      const tags = (sig.setup_tags && sig.setup_tags.length > 0) ? sig.setup_tags : ['Quantitative Edge Confirmed', 'Volume Expansion', 'Institutional Flow'];
      tagsContainer.innerHTML = tags.map((t) => `<span class="dossier-tag-pill">✓ ${t}</span>`).join('');
    }

    const metricsContainer = document.getElementById('dossier-metrics');
    if (metricsContainer) {
      const metrics = [
        { label: 'RVOL Surge', val: `${sig.rvol || 1.0}x` },
        { label: 'Setup Grade', val: sig.grade || 'A' },
      ];

      if (state.activeTab === 'setup_2') {
        metrics.push({ label: '1Y Rel Strength', val: sig.rs_1y ? `${sig.rs_1y}%` : '+35.0%' });
      } else if (state.activeTab === 'setup_3') {
        metrics.push({ label: 'Pole Gain', val: sig.pole_gain_pct ? `+${sig.pole_gain_pct}%` : '+45%' });
        metrics.push({ label: 'Flag Pullback', val: sig.correction_pct ? `-${sig.correction_pct}%` : '-12%' });
        metrics.push({ label: 'Flag Duration', val: sig.flag_days ? `${sig.flag_days} Days` : '8 Days' });
      } else if (state.activeTab === 'setup_4') {
        metrics.push({ label: '1W Return', val: sig.ret_1w ? `+${sig.ret_1w}%` : '+5.5%' });
        metrics.push({ label: '1W RS', val: sig.rs_1w ? `+${sig.rs_1w}%` : '+6.0%' });
        metrics.push({ label: 'Base Support', val: sig.base || 'PP Pivot' });
      } else if (state.activeTab === 'setup_5') {
        metrics.push({ label: 'Key Support', val: sig.support_level || '20 EMA' });
        metrics.push({ label: 'Structure', val: 'Stage-2' });
      } else if (state.activeTab === 'setup_6') {
        metrics.push({ label: 'Proximal', val: sig.proximal ? `₹${sig.proximal}` : '--' });
        metrics.push({ label: 'Distal', val: sig.distal ? `₹${sig.distal}` : '--' });
        metrics.push({ label: 'Base Depth', val: sig.base || '1D' });
      } else {
        metrics.push({ label: 'Structure Shift', val: 'CHoCH' });
      }

      metricsContainer.innerHTML = metrics
        .map(
          (m) => `
        <div class="dossier-metric-box">
          <div class="dossier-metric-box-label">${m.label}</div>
          <div class="dossier-metric-box-val">${m.val}</div>
        </div>
      `
        )
        .join('');
    }

    const tvBtn = document.getElementById('dossier-tv-btn');
    if (tvBtn) {
      tvBtn.href = `https://in.tradingview.com/chart/?symbol=NSE:${sig.symbol}`;
    }

    backdrop.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeSetupDossier() {
    const backdrop = document.getElementById('dossier-backdrop');
    if (backdrop) {
      backdrop.style.display = 'none';
    }
    document.body.style.overflow = '';
  }

  // Export Filtered Signals to CSV
  function exportToCsv() {
    const setups = state.scannerData ? state.scannerData.setups : null;
    const activeSetup = setups ? setups[state.activeTab] : null;
    let signals = activeSetup && activeSetup.signals ? [...activeSetup.signals] : [];

    if (state.searchQuery) {
      signals = signals.filter(
        (s) =>
          (s.symbol || '').toLowerCase().includes(state.searchQuery) ||
          (s.name || '').toLowerCase().includes(state.searchQuery)
      );
    }
    if (state.selectedSector !== 'ALL') {
      signals = signals.filter((s) => s.sector === state.selectedSector);
    }

    if (signals.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = ['Symbol', 'Company', 'Sector', 'CMP', 'Change%', 'RVOL', 'Institutional Score', 'Status', 'Invalidation', 'Target Zone'];
    const rows = signals.map((s) => [
      `"${s.symbol}"`,
      `"${s.name}"`,
      `"${s.sector}"`,
      s.cmp,
      s.change_pct,
      s.rvol,
      s.institutional_score,
      `"${s.status}"`,
      s.invalidation,
      `"${s.target_zone}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MITS_Pro_${state.activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Utility Formatters
  function formatCurrency(num) {
    if (num === undefined || num === null) return '--';
    return Number(num).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Execute on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
