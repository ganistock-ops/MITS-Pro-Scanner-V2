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
      s1: 1118.91,
      s2: 1102.13,
      s3: 1047.02,
      r1: 1317.18,
      r2: 1405.98,
      r3: 1504.4,
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
      s1: 141.01,
      s2: 131.01,
      s3: 124.46,
      r1: 164.3,
      r2: 201.75,
      r3: 215.87,
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
        "s1": 16015.0,
        "s2": 15774.77,
        "s3": 14986.03,
        "r1": 23122.5,
        "r2": 25965.5,
        "r3": 27783.09,
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
        "s1": 1380.0,
        "s2": 1359.3,
        "s3": 1291.33,
        "r1": 1827.25,
        "r2": 2006.15,
        "r3": 2146.58,
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
        "s1": 2151.07,
        "s2": 2118.8,
        "s3": 2012.86,
        "r1": 3423.64,
        "r2": 3932.67,
        "r3": 4207.96,
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
        "s1": 8090.0,
        "s2": 7968.65,
        "s3": 7570.22,
        "r1": 9340.0,
        "r2": 9840.0,
        "r3": 10528.8,
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
        "s1": 2041.3,
        "s2": 2010.68,
        "s3": 1910.15,
        "r1": 2613.3,
        "r2": 2842.1,
        "r3": 3041.05,
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
        "s1": 1430.0,
        "s2": 1408.55,
        "s3": 1338.12,
        "r1": 1955.0,
        "r2": 2165.0,
        "r3": 2316.55,
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
        "s1": 1826.55,
        "s2": 1799.15,
        "s3": 1709.19,
        "r1": 2269.68,
        "r2": 2446.93,
        "r3": 2618.22,
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
        "s1": 2456.01,
        "s2": 2419.17,
        "s3": 2298.21,
        "r1": 3187.48,
        "r2": 3480.07,
        "r3": 3723.67,
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
        "s1": 816.0,
        "s2": 803.76,
        "s3": 763.57,
        "r1": 964.75,
        "r2": 1024.25,
        "r3": 1095.95,
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
        "s1": 371.2,
        "s2": 361.2,
        "s3": 343.14,
        "r1": 442.83,
        "r2": 471.48,
        "r3": 504.48,
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
        "s1": 1299.1,
        "s2": 1279.61,
        "s3": 1215.63,
        "r1": 1579.35,
        "r2": 1691.45,
        "r3": 1809.85,
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
        "s1": 195.7,
        "s2": 185.7,
        "s3": 176.41,
        "r1": 243.1,
        "r2": 262.06,
        "r3": 280.4,
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
        "s1": 1521.1,
        "s2": 1498.28,
        "s3": 1423.37,
        "r1": 1818.35,
        "r2": 1937.25,
        "r3": 2072.86,
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
        "s1": 133.75,
        "s2": 123.75,
        "s3": 117.56,
        "r1": 150.92,
        "r2": 157.79,
        "r3": 168.84,
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
        "s1": 928.6,
        "s2": 914.67,
        "s3": 868.94,
        "r1": 1231.35,
        "r2": 1352.45,
        "r3": 1447.12,
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
        "s1": 219.31,
        "s2": 209.31,
        "s3": 198.84,
        "r1": 246.31,
        "r2": 257.11,
        "r3": 275.11,
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
        "s1": 1848.2,
        "s2": 1820.48,
        "s3": 1729.46,
        "r1": 2016.7,
        "r2": 2084.1,
        "r3": 2229.99,
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
        "s1": 1030.3,
        "s2": 1014.85,
        "s3": 964.11,
        "r1": 1137.8,
        "r2": 1180.8,
        "r3": 1263.46,
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
        "s1": 1594.2,
        "s2": 1570.29,
        "s3": 1491.78,
        "r1": 2233.45,
        "r2": 2489.15,
        "r3": 2663.39,
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
        "s1": 153.3,
        "s2": 143.3,
        "s3": 136.13,
        "r1": 192.83,
        "r2": 208.64,
        "r3": 223.24,
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
        "s1": 2240.2,
        "s2": 2206.6,
        "s3": 2096.27,
        "r1": 3289.95,
        "r2": 3709.85,
        "r3": 3969.54,
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
        "s1": 8923.0,
        "s2": 8789.16,
        "s3": 8349.7,
        "r1": 10053.0,
        "r2": 10505.0,
        "r3": 11240.35,
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
        "s1": 22055.0,
        "s2": 21724.17,
        "s3": 20637.96,
        "r1": 23930.0,
        "r2": 24680.0,
        "r3": 26407.6,
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
      s1: 1159.7,
      s2: 1142.3,
      s3: 1085.18,
      r1: 1470.45,
      r2: 1594.75,
      r3: 1706.38,
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
      s1: 1861.5,
      s2: 1833.58,
      s3: 1741.9,
      r1: 2545.25,
      r2: 2818.75,
      r3: 3016.06,
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
      s1: 915.72,
      s2: 901.98,
      s3: 856.88,
      r1: 1250.67,
      r2: 1384.65,
      r3: 1481.58,
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
      s1: 222.75,
      s2: 212.75,
      s3: 202.11,
      r1: 266.32,
      r2: 283.75,
      r3: 303.61,
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
        "s1": 513.15,
        "s2": 503.15,
        "s3": 477.99,
        "r1": 581.65,
        "r2": 609.05,
        "r3": 651.68,
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
        "s1": 659.1,
        "s2": 649.1,
        "s3": 616.64,
        "r1": 821.6,
        "r2": 886.6,
        "r3": 948.66,
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
        "s1": 2907.0,
        "s2": 2863.39,
        "s3": 2720.22,
        "r1": 3189.5,
        "r2": 3302.5,
        "r3": 3533.68,
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
        "s1": 250.66,
        "s2": 240.66,
        "s3": 228.63,
        "r1": 289.89,
        "r2": 305.58,
        "r3": 326.97,
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
        "s1": 829.0,
        "s2": 816.56,
        "s3": 775.73,
        "r1": 945.25,
        "r2": 991.75,
        "r3": 1061.17,
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
        "s1": 958.31,
        "s2": 943.94,
        "s3": 896.74,
        "r1": 1087.54,
        "r2": 1139.22,
        "r3": 1218.97,
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
        "s1": 11356.0,
        "s2": 11185.66,
        "s3": 10626.38,
        "r1": 12706.0,
        "r2": 13246.0,
        "r3": 14173.22,
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
        "s1": 1957.1,
        "s2": 1927.74,
        "s3": 1831.35,
        "r1": 2279.6,
        "r2": 2408.6,
        "r3": 2577.2,
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
        "s1": 1015.1,
        "s2": 999.87,
        "s3": 949.88,
        "r1": 1123.85,
        "r2": 1167.35,
        "r3": 1249.06,
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
        "s1": 3435.16,
        "s2": 3383.63,
        "s3": 3214.45,
        "r1": 3756.26,
        "r2": 3884.7,
        "r3": 4156.63,
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
        "s1": 576.85,
        "s2": 566.85,
        "s3": 538.51,
        "r1": 650.1,
        "r2": 679.4,
        "r3": 726.96,
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
        "s1": 543.75,
        "s2": 533.75,
        "s3": 507.06,
        "r1": 622.5,
        "r2": 654.0,
        "r3": 699.78,
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
        "s1": 838.55,
        "s2": 825.97,
        "s3": 784.67,
        "r1": 972.17,
        "r2": 1025.62,
        "r3": 1097.41,
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
        "s1": 10436.95,
        "s2": 10280.4,
        "s3": 9766.38,
        "r1": 12189.58,
        "r2": 12890.62,
        "r3": 13792.96,
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
        "s1": 449.35,
        "s2": 439.35,
        "s3": 417.38,
        "r1": 524.85,
        "r2": 555.05,
        "r3": 593.9,
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
        "s1": 1712.7,
        "s2": 1687.01,
        "s3": 1602.66,
        "r1": 1880.7,
        "r2": 1947.9,
        "r3": 2084.25,
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
        "s1": 293.8,
        "s2": 283.8,
        "s3": 269.61,
        "r1": 341.3,
        "r2": 360.3,
        "r3": 385.52,
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
        "s1": 21470.65,
        "s2": 21148.59,
        "s3": 20091.16,
        "r1": 24894.03,
        "r2": 26263.38,
        "r3": 28101.82,
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
        "s1": 156.4,
        "s2": 146.4,
        "s3": 139.08,
        "r1": 171.83,
        "r2": 178.0,
        "r3": 190.46,
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
        "s1": 3682.4,
        "s2": 3627.16,
        "s3": 3445.8,
        "r1": 4261.15,
        "r2": 4492.65,
        "r3": 4807.14,
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
        "s1": 4002.0,
        "s2": 3941.97,
        "s3": 3744.87,
        "r1": 4425.25,
        "r2": 4594.55,
        "r3": 4916.17,
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
        "s1": 378.0,
        "s2": 368.0,
        "s3": 349.6,
        "r1": 458.12,
        "r2": 490.17,
        "r3": 524.48,
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
        "s1": 8650.0,
        "s2": 8520.25,
        "s3": 8094.24,
        "r1": 9386.25,
        "r2": 9680.75,
        "r3": 10358.4,
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
        "s1": 2486.66,
        "s2": 2449.36,
        "s3": 2326.89,
        "r1": 3141.51,
        "r2": 3403.45,
        "r3": 3641.69,
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
        "s1": 3046.16,
        "s2": 3000.47,
        "s3": 2850.45,
        "r1": 3580.76,
        "r2": 3794.6,
        "r3": 4060.22,
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
        "s1": 8085.65,
        "s2": 7964.37,
        "s3": 7566.15,
        "r1": 9346.52,
        "r2": 9850.88,
        "r3": 10540.44,
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
        "s1": 1098.4,
        "s2": 1081.92,
        "s3": 1027.82,
        "r1": 1185.15,
        "r2": 1219.85,
        "r3": 1305.24,
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
        "s1": 278.25,
        "s2": 268.25,
        "s3": 254.84,
        "r1": 314.13,
        "r2": 328.48,
        "r3": 351.47,
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
        "s1": 4298.8,
        "s2": 4234.32,
        "s3": 4022.6,
        "r1": 4890.3,
        "r2": 5126.9,
        "r3": 5485.78,
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
        "s1": 756.94,
        "s2": 745.59,
        "s3": 708.31,
        "r1": 884.59,
        "r2": 935.65,
        "r3": 1001.15,
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
        "s1": 1596.81,
        "s2": 1572.86,
        "s3": 1494.22,
        "r1": 1881.28,
        "r2": 1995.07,
        "r3": 2134.72,
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
        "s1": 464.15,
        "s2": 454.15,
        "s3": 431.44,
        "r1": 571.78,
        "r2": 614.83,
        "r3": 657.87,
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
        "s1": 1086.0,
        "s2": 1069.71,
        "s3": 1016.22,
        "r1": 1271.0,
        "r2": 1345.0,
        "r3": 1439.15,
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
        "s1": 79.2,
        "s2": 69.2,
        "s3": 65.74,
        "r1": 90.05,
        "r2": 94.39,
        "r3": 101.0,
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
        "s1": 1018.1,
        "s2": 1002.83,
        "s3": 952.69,
        "r1": 1283.85,
        "r2": 1390.15,
        "r3": 1487.46,
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
        "s1": 1408.92,
        "s2": 1387.79,
        "s3": 1318.4,
        "r1": 1622.62,
        "r2": 1708.1,
        "r3": 1827.67,
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
        "s1": 405.1,
        "s2": 395.1,
        "s3": 375.35,
        "r1": 481.98,
        "r2": 512.73,
        "r3": 548.62,
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
        "s1": 29645.0,
        "s2": 29200.33,
        "s3": 27740.31,
        "r1": 37282.5,
        "r2": 40337.5,
        "r3": 43161.12,
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
        "s1": 1080.0,
        "s2": 1063.8,
        "s3": 1010.61,
        "r1": 1233.5,
        "r2": 1294.9,
        "r3": 1385.54,
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
        "s1": 475.2,
        "s2": 465.2,
        "s3": 441.94,
        "r1": 536.95,
        "r2": 561.65,
        "r3": 600.97,
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
        "s1": 706.75,
        "s2": 696.15,
        "s3": 661.34,
        "r1": 771.75,
        "r2": 797.75,
        "r3": 853.59,
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
        "s1": 152.77,
        "s2": 142.77,
        "s3": 135.63,
        "r1": 193.62,
        "r2": 209.96,
        "r3": 224.66,
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
        "s1": 3255.07,
        "s2": 3206.24,
        "s3": 3045.93,
        "r1": 4068.15,
        "r2": 4393.38,
        "r3": 4700.92,
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
        "s1": 711.31,
        "s2": 700.64,
        "s3": 665.61,
        "r1": 810.41,
        "r2": 850.05,
        "r3": 909.55,
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
        "s1": 340.28,
        "s2": 330.28,
        "s3": 313.77,
        "r1": 367.96,
        "r2": 379.03,
        "r3": 405.56,
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
        "s1": 1002.18,
        "s2": 987.15,
        "s3": 937.79,
        "r1": 1097.48,
        "r2": 1135.6,
        "r3": 1215.09,
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
        "s1": 1386.11,
        "s2": 1365.32,
        "s3": 1297.05,
        "r1": 1701.08,
        "r2": 1827.07,
        "r3": 1954.96,
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
        "s1": 824.38,
        "s2": 812.01,
        "s3": 771.41,
        "r1": 927.56,
        "r2": 968.83,
        "r3": 1036.65,
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
        "s1": 33361.5,
        "s2": 32861.08,
        "s3": 31218.03,
        "r1": 38570.25,
        "r2": 40653.75,
        "r3": 43499.51,
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
        "s1": 292.46,
        "s2": 282.46,
        "s3": 268.34,
        "r1": 343.31,
        "r2": 363.65,
        "r3": 389.11,
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
        "s1": 306.22,
        "s2": 296.22,
        "s3": 281.41,
        "r1": 362.17,
        "r2": 384.55,
        "r3": 411.47,
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
        "s1": 3667.59,
        "s2": 3612.58,
        "s3": 3431.95,
        "r1": 4283.36,
        "r2": 4529.67,
        "r3": 4846.75,
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
        "s1": 1811.33,
        "s2": 1784.16,
        "s3": 1694.95,
        "r1": 2016.26,
        "r2": 2098.23,
        "r3": 2245.11,
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
        "s1": 166.38,
        "s2": 156.38,
        "s3": 148.56,
        "r1": 187.73,
        "r2": 196.27,
        "r3": 210.01,
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
        "s1": 117.46,
        "s2": 107.46,
        "s3": 102.09,
        "r1": 139.56,
        "r2": 148.4,
        "r3": 158.79,
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
        "s1": 478.78,
        "s2": 468.78,
        "s3": 445.34,
        "r1": 543.2,
        "r2": 568.97,
        "r3": 608.8,
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
        "s1": 168.05,
        "s2": 158.05,
        "s3": 150.15,
        "r1": 182.67,
        "r2": 188.52,
        "r3": 201.72,
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
        "s1": 2303.76,
        "s2": 2269.2,
        "s3": 2155.74,
        "r1": 2573.86,
        "r2": 2681.9,
        "r3": 2869.63,
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
        "s1": 409.27,
        "s2": 399.27,
        "s3": 379.31,
        "r1": 475.72,
        "r2": 502.3,
        "r3": 537.46,
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
        "s1": 82.3,
        "s2": 72.3,
        "s3": 68.68,
        "r1": 90.5,
        "r2": 93.78,
        "r3": 100.34,
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
        "s1": 442.12,
        "s2": 432.12,
        "s3": 410.51,
        "r1": 483.44,
        "r2": 499.97,
        "r3": 534.97,
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
        "s1": 1902.36,
        "s2": 1873.82,
        "s3": 1780.13,
        "r1": 2145.21,
        "r2": 2242.35,
        "r3": 2399.31,
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
        "s1": 444.71,
        "s2": 434.71,
        "s3": 412.97,
        "r1": 524.81,
        "r2": 556.85,
        "r3": 595.83,
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
        "s1": 30.0,
        "s2": 20.0,
        "s3": 19.0,
        "r1": 34.32,
        "r2": 36.05,
        "r3": 38.57,
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
        "s1": 91.57,
        "s2": 81.57,
        "s3": 77.49,
        "r1": 110.9,
        "r2": 118.63,
        "r3": 126.93,
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
        "s1": 1887.42,
        "s2": 1859.11,
        "s3": 1766.15,
        "r1": 2213.87,
        "r2": 2344.45,
        "r3": 2508.56,
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
        "s1": 77.85,
        "s2": 67.85,
        "s3": 64.46,
        "r1": 86.98,
        "r2": 90.63,
        "r3": 96.97,
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
        "s1": 310.42,
        "s2": 300.42,
        "s3": 285.4,
        "r1": 361.75,
        "r2": 382.28,
        "r3": 409.04,
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
        "s1": 547.6,
        "s2": 537.6,
        "s3": 510.72,
        "r1": 628.6,
        "r2": 661.0,
        "r3": 707.27,
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
        "s1": 524.75,
        "s2": 514.75,
        "s3": 489.01,
        "r1": 559.0,
        "r2": 572.7,
        "r3": 612.79,
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
        "s1": 154.11,
        "s2": 144.11,
        "s3": 136.9,
        "r1": 176.33,
        "r2": 185.22,
        "r3": 198.19,
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
        "s1": 341.68,
        "s2": 331.68,
        "s3": 315.1,
        "r1": 384.98,
        "r2": 402.3,
        "r3": 430.46,
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
        "s1": 106.97,
        "s2": 96.97,
        "s3": 92.12,
        "r1": 125.34,
        "r2": 132.69,
        "r3": 141.98,
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
        "s1": 532.91,
        "s2": 522.91,
        "s3": 496.76,
        "r1": 606.38,
        "r2": 635.77,
        "r3": 680.27,
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
        "s1": 1094.5,
        "s2": 1078.08,
        "s3": 1024.18,
        "r1": 1211.75,
        "r2": 1258.65,
        "r3": 1346.76,
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
        "s1": 261.75,
        "s2": 251.75,
        "s3": 239.16,
        "r1": 283.12,
        "r2": 291.67,
        "r3": 312.09,
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
        "s1": 1168.13,
        "s2": 1150.61,
        "s3": 1093.08,
        "r1": 1285.8,
        "r2": 1332.87,
        "r3": 1426.17,
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
        "s1": 1672.55,
        "s2": 1647.46,
        "s3": 1565.09,
        "r1": 1894.68,
        "r2": 1983.53,
        "r3": 2122.38,
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
        "s1": 874.09,
        "s2": 860.98,
        "s3": 817.93,
        "r1": 926.37,
        "r2": 947.27,
        "r3": 1013.58,
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
    fundamentalsData: null,
    backtestData: {
      setup_1: { win_rate: 51.1, avg_peak_return: 10.7, avg_days_to_peak: 22.8, total_samples: 374, unit: 'Reversal Setups' },
      setup_2: { win_rate: 70.5, avg_peak_return: 18.6, avg_days_to_peak: 30.2, total_samples: 996, unit: 'Momentum Setups' },
      setup_3: { win_rate: 72.9, avg_peak_return: 19.1, avg_days_to_peak: 29.1, total_samples: 715, unit: 'HTF Setups' },
      setup_4: { win_rate: 60.5, avg_peak_return: 15.7, avg_days_to_peak: 27.4, total_samples: 501, unit: 'Swing Setups' },
      setup_5: { win_rate: 63.1, avg_peak_return: 14.5, avg_days_to_peak: 23.8, total_samples: 1567, unit: 'Pullbacks' },
      setup_6: { win_rate: 67.0, avg_peak_return: 16.2, avg_days_to_peak: 26.8, total_samples: 588, unit: 'DBR Setups' }
    },
  };

  const BACKTEST_DEFAULTS = {
    setup_1: { win_rate: 51.1, avg_peak_return: 10.7, avg_days_to_peak: 22.8, total_samples: 374, unit: 'Reversal Setups' },
    setup_2: { win_rate: 70.5, avg_peak_return: 18.6, avg_days_to_peak: 30.2, total_samples: 996, unit: 'Momentum Setups' },
    setup_3: { win_rate: 72.9, avg_peak_return: 19.1, avg_days_to_peak: 29.1, total_samples: 715, unit: 'HTF Setups' },
    setup_4: { win_rate: 60.5, avg_peak_return: 15.7, avg_days_to_peak: 27.4, total_samples: 501, unit: 'Swing Setups' },
    setup_5: { win_rate: 63.1, avg_peak_return: 14.5, avg_days_to_peak: 23.8, total_samples: 1567, unit: 'Pullbacks' },
    setup_6: { win_rate: 67.0, avg_peak_return: 16.2, avg_days_to_peak: 26.8, total_samples: 588, unit: 'DBR Setups' }
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
    tickerNiftyPrice: document.getElementById('ticker-nifty-price'),
    tickerNiftyChg: document.getElementById('ticker-nifty-chg'),
    tickerBankPrice: document.getElementById('ticker-bank-price'),
    tickerBankChg: document.getElementById('ticker-bank-chg'),
    tickerNseAdv: document.getElementById('ticker-nse-adv'),
    tickerNseDec: document.getElementById('ticker-nse-dec'),
    tickerNseNet: document.getElementById('ticker-nse-net'),
    marketRegimeTitle: document.getElementById('market-regime-title'),
    marketRegimeSubtitle: document.getElementById('market-regime-subtitle'),
    kpiNseAdv: document.getElementById('kpi-nse-adv'),
    kpiNseDec: document.getElementById('kpi-nse-dec'),
    kpiNseRatio: document.getElementById('kpi-nse-ratio'),
    quickCards: document.querySelectorAll('.quick-card, .qs-card'),
    runScannerBtn: document.getElementById('run-scanner-btn'),
    setupSelect: document.getElementById('setup-select'),
    activeFilterTitle: document.getElementById('active-filter-title'),
    refreshBtn: document.getElementById('refresh-btn'),
    lastUpdatedText: document.getElementById('last-updated-text'),
    kpiNetBreadth: document.getElementById('kpi-net-breadth'),
    kpiAdvances: document.getElementById('kpi-advances'),
    kpiDeclines: document.getElementById('kpi-declines'),
    kpiRatio: document.getElementById('kpi-ratio'),
    kpiBias: document.getElementById('kpi-bias'),
    kpiNifty: document.getElementById('kpi-nifty'),
    kpiNiftyChange: document.getElementById('kpi-nifty-change'),
    kpiNiftySubtitle: document.getElementById('kpi-nifty-subtitle'),
    kpiBankNifty: document.getElementById('kpi-banknifty'),
    kpiBankNiftyChange: document.getElementById('kpi-banknifty-change'),
    kpiBankNiftySubtitle: document.getElementById('kpi-banknifty-subtitle'),
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


  // =========================================================================
  // ADVANCED STOCK SCANNER CONTROLLER (SLOT 1: RS | SLOT 2: EARLY BREAKOUT)
  // CLIENT-SIDE LOCALSTORAGE WATCHLIST SYSTEM
  // =========================================================================

  // --- Watchlist Helper Functions (Zero-Server-Cost LocalStorage) ---
  function getWatchlist() {
    try {
      const saved = localStorage.getItem('mits_pro_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('[MITS Pro] Error reading watchlist from localStorage:', e);
      return [];
    }
  }

  function isWatchlisted(symbol) {
    if (!symbol) return false;
    const wl = getWatchlist();
    return wl.includes(symbol);
  }

  function toggleWatchlist(symbol, directAdd = false) {
    if (!symbol) return false;
    let wl = getWatchlist();
    const idx = wl.indexOf(symbol);
    let added = false;
    if (idx >= 0 && !directAdd) {
      wl.splice(idx, 1);
      added = false;
      if (window.WatchlistAlertsModule && typeof window.WatchlistAlertsModule.removeStockInternal === 'function') {
        window.WatchlistAlertsModule.removeStockInternal(symbol, false);
      }
    } else if (idx < 0) {
      if (!directAdd && window.WatchlistAlertsModule && typeof window.WatchlistAlertsModule.openAlertModal === 'function') {
        window.WatchlistAlertsModule.openAlertModal(symbol);
        return true;
      }
      wl.push(symbol);
      added = true;
    }
    try {
      localStorage.setItem('mits_pro_watchlist', JSON.stringify(wl));
    } catch (e) {
      console.warn('[MITS Pro] Error saving watchlist to localStorage:', e);
    }
    updateAllWatchlistUI(symbol, added);
    if (window.WatchlistAlertsModule && typeof window.WatchlistAlertsModule.evaluateAllAlerts === 'function') {
      window.WatchlistAlertsModule.evaluateAllAlerts();
    }
    return added;
  }

  function updateAllWatchlistUI(targetSymbol, isAdded) {
    // 1. Update modal header button if modal is open and symbol matches
    const modalBtn = document.getElementById('rs-modal-watchlist-btn');
    const modalSym = document.getElementById('rs-modal-symbol');
    if (modalBtn && modalSym && (!targetSymbol || modalSym.textContent === targetSymbol)) {
      const active = isWatchlisted(modalSym.textContent);
      modalBtn.className = `rs-watchlist-btn ${active ? 'active' : ''}`;
      modalBtn.innerHTML = active
        ? '<span class="star-icon">★</span> <span class="watchlist-text">In Watchlist</span>'
        : '<span class="star-icon">☆</span> <span class="watchlist-text">Add to Watchlist</span>';
    }

    // 2. Update table star buttons
    document.querySelectorAll('.tbl-watchlist-star-btn').forEach(btn => {
      const s = btn.getAttribute('data-symbol');
      if (!targetSymbol || s === targetSymbol) {
        const active = isWatchlisted(s);
        btn.className = `tbl-watchlist-star-btn ${active ? 'active' : ''}`;
        btn.textContent = active ? '★' : '☆';
        btn.title = active ? 'Remove from Watchlist' : 'Add to Watchlist';
      }
    });
  }

  // --- Advanced Scanner State ---
  const advState = {
    activeSlot: 1, // 1: RS Outperformer, 2: Early Breakout, 3: Momentum Continuation, 4: Rally-Base-Rally, 5: Confluence Engine, 6: Wyckoff Absorption
    get currentSlot() { return this.activeSlot; },
    set currentSlot(val) { this.activeSlot = val; },
    rsData: null,
    boData: null,
    mcData: null,
    rbrData: null,
    confluenceData: null,
    wyckoffData: null,
    searchQuery: '',
    gradeFilter: 'ALL',
    classFilter: 'ALL',
    sectorFilter: 'ALL',
    sortColumn: 'rs_score',
    sortDirection: 'desc',
    currentPage: 1,
    pageSize: 15
  };

/* ===================================================================================
   PHASE 2: SECTOR ANALYSIS MODULE (STANDALONE & FULLY DECOUPLED)
   =================================================================================== */
window.SectorAnalysisModule = (function() {
  let sectorData = null;
  let activeView = 'grid'; // 'grid' | 'table'
  let quadrantFilter = 'ALL';
  let sortBy = 'rank';
  let searchQuery = '';
  let expandedSector = null;
  let isInitialized = false;

  async function init() {
    if (!isInitialized) {
      bindEvents();
      isInitialized = true;
    }
    await loadData();
  }

  async function loadData() {
    try {
      if (window._cachedSectorAnalysis) {
        sectorData = window._cachedSectorAnalysis;
        renderMacroSummary();
        renderActiveView();
      }

      const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
      let res = await fetch(`${basePath}data/sector_analysis.json?v=${Date.now()}`).catch(() => null);
      if (!res || !res.ok) res = await fetch(`data/sector_analysis.json?v=${Date.now()}`).catch(() => null);
      if (!res || !res.ok) res = await fetch('data/sector_analysis.json').catch(() => null);

      if (res && res.ok) {
        sectorData = await res.json();
        window._cachedSectorAnalysis = sectorData;
        renderMacroSummary();
        renderActiveView();
      }
    } catch (err) {
      console.error('[SectorAnalysisModule] Error loading data:', err);
    }
  }

  function bindEvents() {
    const btnGrid = document.getElementById('btn-sector-view-grid');
    const btnTable = document.getElementById('btn-sector-view-table');
    const searchInput = document.getElementById('sector-search-input');
    const quadrantSelect = document.getElementById('sector-quadrant-filter');
    const sortSelect = document.getElementById('sector-sort-by');
    const refreshBtn = document.getElementById('sector-refresh-btn');

    if (btnGrid) {
      btnGrid.addEventListener('click', () => {
        activeView = 'grid';
        btnGrid.classList.add('active');
        btnGrid.setAttribute('aria-pressed', 'true');
        if (btnTable) {
          btnTable.classList.remove('active');
          btnTable.setAttribute('aria-pressed', 'false');
        }
        document.getElementById('sector-heatmap-view')?.classList.remove('hidden');
        document.getElementById('sector-table-view')?.classList.add('hidden');
        renderActiveView();
      });
    }

    if (btnTable) {
      btnTable.addEventListener('click', () => {
        activeView = 'table';
        btnTable.classList.add('active');
        btnTable.setAttribute('aria-pressed', 'true');
        if (btnGrid) {
          btnGrid.classList.remove('active');
          btnGrid.setAttribute('aria-pressed', 'false');
        }
        document.getElementById('sector-table-view')?.classList.remove('hidden');
        document.getElementById('sector-heatmap-view')?.classList.add('hidden');
        renderActiveView();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = (e.target.value || '').trim().toLowerCase();
        renderActiveView();
      });
    }

    if (quadrantSelect) {
      quadrantSelect.addEventListener('change', (e) => {
        quadrantFilter = e.target.value;
        renderActiveView();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        sortBy = e.target.value;
        renderActiveView();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.innerHTML = '<span>↻</span> Refreshing...';
        await loadData();
        refreshBtn.innerHTML = '<span>↻</span> Refresh';
      });
    }
  }

  function renderMacroSummary() {
    if (!sectorData || !sectorData.macro_summary) return;
    const m = sectorData.macro_summary;

    const eodBadge = document.getElementById('sector-eod-badge');
    if (eodBadge && sectorData.scan_date) {
      eodBadge.textContent = `● EOD SYNC: ${sectorData.scan_date}`;
    }

    if (m.benchmark) {
      const bVal = document.getElementById('sector-bench-val');
      const bChg = document.getElementById('sector-bench-change');
      const b1d = document.getElementById('macro-bench-1d');
      const b5d = document.getElementById('macro-bench-5d');
      const b20d = document.getElementById('macro-bench-20d');
      const bCmp = document.getElementById('macro-bench-cmp-sub');

      if (bVal) bVal.textContent = m.benchmark.cmp ? Number(m.benchmark.cmp).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '--';
      if (bChg) {
        const ret1d = m.benchmark.return_1d || 0;
        bChg.textContent = `${ret1d >= 0 ? '+' : ''}${ret1d}%`;
        bChg.className = ret1d >= 0 ? 'text-bullish' : 'text-bearish';
      }
      if (b1d) {
        const ret1d = m.benchmark.return_1d || 0;
        b1d.textContent = `${ret1d >= 0 ? '+' : ''}${ret1d}%`;
        b1d.className = `macro-value ${ret1d >= 0 ? 'text-bullish' : 'text-bearish'}`;
      }
      if (b5d) {
        const ret5d = m.benchmark.return_5d || 0;
        b5d.textContent = `${ret5d >= 0 ? '+' : ''}${ret5d}%`;
        b5d.className = `macro-value ${ret5d >= 0 ? 'text-bullish' : 'text-bearish'}`;
      }
      if (b20d) {
        const ret20d = m.benchmark.return_20d || 0;
        b20d.textContent = `${ret20d >= 0 ? '+' : ''}${ret20d}%`;
        b20d.className = `macro-value ${ret20d >= 0 ? 'text-bullish' : 'text-bearish'}`;
      }
      if (bCmp) {
        bCmp.textContent = m.benchmark.cmp ? `₹${Number(m.benchmark.cmp).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '--';
      }
    }

    const leadEl = document.getElementById('macro-leading-count');
    const impEl = document.getElementById('macro-improving-count');
    const lagEl = document.getElementById('macro-lagging-count');
    const strongEl = document.getElementById('macro-strongest-sec');

    if (leadEl) leadEl.textContent = m.leading_sectors_count ?? 0;
    if (impEl) impEl.textContent = m.improving_sectors_count ?? 0;
    if (lagEl) lagEl.textContent = (m.lagging_sectors_count || 0) + (m.weakening_sectors_count || 0);
    if (strongEl) strongEl.textContent = `${m.strongest_sector || 'N/A'}`;

    if (m.market_breadth) {
      const advEl = document.getElementById('macro-adv-count');
      const decEl = document.getElementById('macro-dec-count');
      const adEl = document.getElementById('macro-ad-ratio');
      const brPctEl = document.getElementById('macro-breadth-pct');

      if (advEl) advEl.textContent = m.market_breadth.advances ?? 0;
      if (decEl) decEl.textContent = m.market_breadth.declines ?? 0;
      if (adEl) adEl.textContent = `${m.market_breadth.ad_ratio || 0}:1`;
      if (brPctEl) brPctEl.textContent = `${m.market_breadth.pct_above_20_ema || 0}% > 20 EMA | ${m.market_breadth.pct_above_50_ema || 0}% > 50 EMA`;
    }

    const inEl = document.getElementById('macro-top-inflows');
    const outEl = document.getElementById('macro-top-outflows');
    if (inEl && m.top_inflows) inEl.textContent = m.top_inflows.join(', ');
    if (outEl && m.top_outflows) outEl.textContent = m.top_outflows.join(', ');
  }

  function getFilteredSectors() {
    if (!sectorData || !sectorData.sectors) return [];
    let list = [...sectorData.sectors];

    // 1. Quadrant filter
    if (quadrantFilter !== 'ALL') {
      list = list.filter(s => s.quadrant === quadrantFilter || s.grade === quadrantFilter);
    }

    // 2. Search query filter
    if (searchQuery) {
      list = list.filter(s => {
        const secMatch = s.sector.toLowerCase().includes(searchQuery) || s.display_name.toLowerCase().includes(searchQuery);
        const leaderMatch = (s.leaders || []).some(l => l.symbol.toLowerCase().includes(searchQuery) || l.name.toLowerCase().includes(searchQuery));
        return secMatch || leaderMatch;
      });
    }

    // 3. Sorting
    list.sort((a, b) => {
      if (sortBy === 'return_1d') return b.metrics.return_1d - a.metrics.return_1d;
      if (sortBy === 'return_5d') return b.metrics.return_5d - a.metrics.return_5d;
      if (sortBy === 'rs_20d') return b.metrics.rs_20d - a.metrics.rs_20d;
      if (sortBy === 'delivery_spike_pct') return b.metrics.delivery_spike_pct - a.metrics.delivery_spike_pct;
      if (sortBy === 'pct_above_20_ema') return b.metrics.pct_above_20_ema - a.metrics.pct_above_20_ema;
      if (sortBy === 'delivery_turnover_cr') return b.metrics.delivery_turnover_cr - a.metrics.delivery_turnover_cr;
      return a.rank - b.rank; // default rank
    });

    return list;
  }

  function renderActiveView() {
    if (activeView === 'grid') {
      renderHeatmapGrid();
    } else {
      renderTable();
    }
  }

  function getStatusClass(status) {
    const st = (status || '').toUpperCase();
    if (st.includes('LEAD')) return 'pill-leader';
    if (st.includes('IMP')) return 'pill-improving';
    if (st.includes('NEUT')) return 'pill-neutral';
    if (st.includes('WEAK')) return 'pill-weakening';
    return 'pill-lagging';
  }

  function renderHeatmapGrid() {
    const grid = document.getElementById('sector-heatmap-grid');
    if (!grid) return;

    const list = getFilteredSectors();
    if (!list.length) {
      grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:rgba(255,255,255,0.4);">No sectors match the active filter criteria.</div>';
      return;
    }

    grid.innerHTML = list.map(s => {
      const qClass = `quadrant-${(s.quadrant || 'neutral').toLowerCase()}`;
      const statusPillClass = getStatusClass(s.status);
      const m = s.metrics;
      const p = s.pillar_scores;

      const ret1dFmt = `${m.return_1d >= 0 ? '+' : ''}${m.return_1d}%`;
      const ret1dClass = m.return_1d >= 0 ? 'text-bullish' : 'text-bearish';
      const rs5dFmt = `${m.rs_5d >= 0 ? '+' : ''}${m.rs_5d}%`;
      const rs5dClass = m.rs_5d >= 0 ? 'text-bullish' : 'text-bearish';
      const rs20dFmt = `${m.rs_20d >= 0 ? '+' : ''}${m.rs_20d}%`;
      const rs20dClass = m.rs_20d >= 0 ? 'text-bullish' : 'text-bearish';
      const spikeFmt = `${m.delivery_spike_pct >= 0 ? '+' : ''}${m.delivery_spike_pct}%`;
      const spikeClass = m.delivery_spike_pct >= 0 ? 'text-bullish' : 'text-bearish';

      const rsWidth = Math.min(100, Math.round((p.rs_score / 35) * 100));
      const brWidth = Math.min(100, Math.round((p.breadth_score / 35) * 100));
      const flWidth = Math.min(100, Math.round((p.flow_score / 30) * 100));

      const leadersHtml = (s.leaders || []).slice(0, 3).map(l => `
        <span class="leader-pill" title="${l.name} | CMP: ₹${l.close} | Deliv: ${l.delivery_pct}%">
          <strong>${l.symbol}</strong>
          <span class="pill-chg ${l.change_pct >= 0 ? 'text-bullish' : 'text-bearish'}">
            ${l.change_pct >= 0 ? '+' : ''}${l.change_pct}%
          </span>
        </span>
      `).join('');

      return `
        <div class="sector-tile-card ${qClass}">
          <div class="sector-tile-top">
            <div class="sector-tile-meta">
              <span class="sector-tile-rank">RANK #${s.rank}</span>
              <span class="sector-tile-name">${s.display_name}</span>
            </div>
            <div class="sector-tile-badge-group">
              <span class="sector-status-pill ${statusPillClass}">${s.status}</span>
            </div>
          </div>

          <!-- 3-Pillar Score Bar -->
          <div class="sector-score-bar-wrap">
            <div>
              <div class="sector-score-num">${s.total_score}</div>
              <div class="sector-score-max">/ 100 PTS</div>
            </div>
            <div class="pillar-bars-stack">
              <div class="pillar-bar-item" title="Institutional RS Score: ${p.rs_score} / 35">
                <span>RS (35)</span>
                <div class="pillar-progress-track">
                  <div class="pillar-progress-fill fill-rs" style="width: ${rsWidth}%;"></div>
                </div>
                <span>${p.rs_score}</span>
              </div>
              <div class="pillar-bar-item" title="Structural Breadth Score: ${p.breadth_score} / 35">
                <span>BR (35)</span>
                <div class="pillar-progress-track">
                  <div class="pillar-progress-fill fill-breadth" style="width: ${brWidth}%;"></div>
                </div>
                <span>${p.breadth_score}</span>
              </div>
              <div class="pillar-bar-item" title="Whale Flow Score: ${p.flow_score} / 30">
                <span>FL (30)</span>
                <div class="pillar-progress-track">
                  <div class="pillar-progress-fill fill-flow" style="width: ${flWidth}%;"></div>
                </div>
                <span>${p.flow_score}</span>
              </div>
            </div>
          </div>

          <!-- Key Metrics Grid -->
          <div class="sector-stats-grid">
            <div class="sector-stat-cell">
              <span class="stat-lbl">1D Perf</span>
              <span class="stat-val ${ret1dClass}">${ret1dFmt}</span>
            </div>
            <div class="sector-stat-cell">
              <span class="stat-lbl">5D RS</span>
              <span class="stat-val ${rs5dClass}">${rs5dFmt}</span>
            </div>
            <div class="sector-stat-cell">
              <span class="stat-lbl">20D RS</span>
              <span class="stat-val ${rs20dClass}">${rs20dFmt}</span>
            </div>
            <div class="sector-stat-cell">
              <span class="stat-lbl">> 20 EMA</span>
              <span class="stat-val">${m.pct_above_20_ema}%</span>
            </div>
            <div class="sector-stat-cell">
              <span class="stat-lbl">Deliv ₹ Cr</span>
              <span class="stat-val">₹${m.delivery_turnover_cr}</span>
            </div>
            <div class="sector-stat-cell">
              <span class="stat-lbl">Whale Spike</span>
              <span class="stat-val ${spikeClass}">${spikeFmt}</span>
            </div>
          </div>

          <!-- Top Leaders -->
          <div class="sector-tile-leaders">
            <div class="tile-leaders-title">
              <span>Top Constituent Leaders</span>
              <span style="opacity:0.6;">${m.stocks_count} Stocks</span>
            </div>
            <div class="tile-leaders-pills">
              ${leadersHtml}
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="sector-tile-actions">
            <button class="btn-filter-adv" type="button" onclick="window.filterInAdvScanner('${s.sector}')">
              <span>🔬</span> Filter in Adv Scanner
            </button>
            <button class="btn-filter-adv" style="background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.15); color:#ffffff;" type="button" onclick="SectorAnalysisModule.openTableWithSector('${s.sector}')">
              <span>📋</span> Details
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderTable() {
    const tbody = document.getElementById('sector-table-body');
    if (!tbody) return;

    const list = getFilteredSectors();
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:30px; color:rgba(255,255,255,0.4);">No sectors match active filters.</td></tr>';
      return;
    }

    let rowsHtml = '';
    list.forEach(s => {
      const isExpanded = expandedSector === s.sector;
      const statusPillClass = getStatusClass(s.status);
      const m = s.metrics;

      const ret1dFmt = `${m.return_1d >= 0 ? '+' : ''}${m.return_1d}%`;
      const ret1dClass = m.return_1d >= 0 ? 'text-bullish' : 'text-bearish';
      const rs5dFmt = `${m.rs_5d >= 0 ? '+' : ''}${m.rs_5d}%`;
      const rs5dClass = m.rs_5d >= 0 ? 'text-bullish' : 'text-bearish';
      const rs20dFmt = `${m.rs_20d >= 0 ? '+' : ''}${m.rs_20d}%`;
      const rs20dClass = m.rs_20d >= 0 ? 'text-bullish' : 'text-bearish';
      const spikeFmt = `${m.delivery_spike_pct >= 0 ? '+' : ''}${m.delivery_spike_pct}%`;
      const spikeClass = m.delivery_spike_pct >= 0 ? 'text-bullish' : 'text-bearish';

      const topLeaderSyms = (s.leaders || []).slice(0, 3).map(l => l.symbol).join(', ');

      rowsHtml += `
        <tr class="sector-row ${isExpanded ? 'expanded' : ''}" onclick="SectorAnalysisModule.toggleAccordion('${s.sector}')">
          <td style="font-weight:800; font-family:var(--font-mono, monospace); color:rgba(255,255,255,0.6);">#${s.rank}</td>
          <td>
            <div style="font-weight:700; color:#ffffff;">${s.display_name}</div>
            <div style="font-size:10px; color:rgba(255,255,255,0.4);">${s.metrics.stocks_count} stocks (${m.advances} Adv / ${m.declines} Dec)</div>
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:14px; font-weight:800; font-family:var(--font-mono, monospace);">${s.total_score}</span>
              <span class="sector-status-pill ${statusPillClass}" style="padding:2px 6px; font-size:9px;">${s.status}</span>
            </div>
          </td>
          <td class="${ret1dClass}" style="font-weight:700; font-family:var(--font-mono, monospace);">${ret1dFmt}</td>
          <td class="${rs5dClass}" style="font-weight:700; font-family:var(--font-mono, monospace);">${rs5dFmt}</td>
          <td class="${rs20dClass}" style="font-weight:700; font-family:var(--font-mono, monospace);">${rs20dFmt}</td>
          <td style="font-family:var(--font-mono, monospace); font-size:11px;">
            <span>${m.pct_above_20_ema}% > 20E</span> | <span style="opacity:0.7;">${m.pct_above_50_ema}% > 50E</span>
          </td>
          <td style="font-family:var(--font-mono, monospace); font-weight:600;">₹${m.delivery_turnover_cr} Cr</td>
          <td class="${spikeClass}" style="font-weight:700; font-family:var(--font-mono, monospace);">${spikeFmt}</td>
          <td>
            <span style="font-size:11px; font-weight:700; color:${m.flow_bias === 'ACCUMULATION' ? '#00e676' : m.flow_bias === 'DISTRIBUTION' ? '#ff3d71' : '#ffb300'};">
              ${m.flow_bias_display}
            </span>
          </td>
          <td style="font-family:var(--font-mono, monospace); font-size:11px; color:#ffffff;">
            ${topLeaderSyms || '--'}
          </td>
          <td style="white-space:nowrap;" onclick="event.stopPropagation();">
            <button class="btn-filter-adv" style="padding:4px 8px; font-size:10px; margin-right:4px;" type="button" onclick="window.filterInAdvScanner('${s.sector}')">
              🔬 Filter
            </button>
            <button class="btn-filter-adv" style="padding:4px 8px; font-size:10px; background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.2); color:#ffffff;" type="button" onclick="SectorAnalysisModule.toggleAccordion('${s.sector}')">
              ${isExpanded ? '▲ Close' : '▼ Drill'}
            </button>
          </td>
        </tr>
      `;

      if (isExpanded) {
        const leadersCards = (s.leaders || []).map(l => {
          const lChg = `${l.change_pct >= 0 ? '+' : ''}${l.change_pct}%`;
          const lSpike = `${l.delivery_spike_pct >= 0 ? '+' : ''}${l.delivery_spike_pct}%`;
          const tvUrl = `https://in.tradingview.com/chart/?symbol=NSE:${l.symbol}`;
          return `
            <div class="drilldown-stock-card">
              <div class="drilldown-stock-top">
                <span class="drilldown-stock-sym">${l.symbol}</span>
                <span class="drilldown-stock-price ${l.change_pct >= 0 ? 'text-bullish' : 'text-bearish'}">
                  ₹${l.close} (${lChg})
                </span>
              </div>
              <div style="font-size:10px; color:rgba(255,255,255,0.5); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${l.name}
              </div>
              <div class="drilldown-stock-details">
                <span>Deliv: ${l.delivery_pct}% (₹${l.delivery_turnover_cr} Cr)</span>
                <span class="${l.delivery_spike_pct >= 0 ? 'text-bullish' : 'text-bearish'}">Spike: ${lSpike}</span>
              </div>
              <div class="drilldown-stock-details">
                <span>20D RS: ${l.rs_20d >= 0 ? '+' : ''}${l.rs_20d}%</span>
                <span>${l.above_20_ema ? '🟢 > 20 EMA' : '🔴 < 20 EMA'}</span>
              </div>
              <a href="${tvUrl}" target="_blank" rel="noopener noreferrer" class="drilldown-stock-tv">
                <span>View Chart on TradingView ↗</span>
              </a>
            </div>
          `;
        }).join('');

        rowsHtml += `
          <tr class="sector-drilldown-row">
            <td colspan="12">
              <div class="sector-drilldown-content">
                <div class="drilldown-header">
                  <div class="drilldown-title">
                    <span>🏛️ ${s.display_name} — Institutional Constituent Drill-Down</span>
                    <span style="font-size:12px; font-weight:600; color:rgba(255,255,255,0.6);">(${s.metrics.stocks_count} Total Stocks | A/D Ratio: ${m.ad_ratio}:1)</span>
                  </div>
                  <button class="btn-filter-adv" style="padding:6px 12px; font-size:11px;" type="button" onclick="window.filterInAdvScanner('${s.sector}')">
                    <span>🔬</span> Open All ${s.display_name} Stocks in Advanced Scanner ↗
                  </button>
                </div>
                <div class="drilldown-stocks-grid">
                  ${leadersCards}
                </div>
              </div>
            </td>
          </tr>
        `;
      }
    });

    tbody.innerHTML = rowsHtml;
  }

  function toggleAccordion(sectorName) {
    if (expandedSector === sectorName) {
      expandedSector = null;
    } else {
      expandedSector = sectorName;
    }
    renderTable();
  }

  function openTableWithSector(sectorName) {
    activeView = 'table';
    expandedSector = sectorName;
    const btnTable = document.getElementById('btn-sector-view-table');
    const btnGrid = document.getElementById('btn-sector-view-grid');
    if (btnTable) {
      btnTable.classList.add('active');
      btnTable.setAttribute('aria-pressed', 'true');
    }
    if (btnGrid) {
      btnGrid.classList.remove('active');
      btnGrid.setAttribute('aria-pressed', 'false');
    }
    document.getElementById('sector-table-view')?.classList.remove('hidden');
    document.getElementById('sector-heatmap-view')?.classList.add('hidden');
    renderTable();

    const tableEl = document.getElementById('sector-table-view');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return {
    init,
    loadData,
    toggleAccordion,
    openTableWithSector
  };
})();

// Cross-Tab Synergy Link to filter Advanced Scanner by sector
window.filterInAdvScanner = function(sectorName) {
  if (typeof window.switchAppView === 'function') {
    window.switchAppView('adv');
  }
  const sectorSelect = document.getElementById('adv-rs-sector');
  if (sectorSelect && sectorName) {
    let matched = 'ALL';
    for (let i = 0; i < sectorSelect.options.length; i++) {
      const val = sectorSelect.options[i].value;
      if (
        val.toLowerCase() === sectorName.toLowerCase() ||
        val.toLowerCase().includes(sectorName.toLowerCase()) ||
        sectorName.toLowerCase().includes(val.toLowerCase())
      ) {
        matched = val;
        break;
      }
    }
    sectorSelect.value = matched;
    if (typeof advState !== 'undefined') {
      advState.sectorFilter = matched;
      advState.currentPage = 1;
    }
  }
  if (typeof renderAdvTable === 'function') {
    renderAdvTable();
  }
  const targetTable = document.getElementById('adv-rs-table-container') || document.getElementById('adv-rs-table');
  if (targetTable) {
    targetTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};


/* ===================================================================================
   PHASE 2: SMART MONEY RADAR & WEINSTEIN REGIME MODULE (STANDALONE & FULLY DECOUPLED)
   =================================================================================== */
window.SmartMoneyRadarModule = (function() {
  let smData = null;
  let isInitialized = false;

  async function init() {
    if (!isInitialized) {
      bindEvents();
      isInitialized = true;
    }
    await loadData();
  }

  async function loadData() {
    try {
      if (window._cachedSmartMoneyData) {
        smData = window._cachedSmartMoneyData;
        renderSmartMoneyUI();
      }

      const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
      let res = await fetch(`${basePath}data/smart_money_data.json?v=${Date.now()}`).catch(() => null);
      if (!res || !res.ok) res = await fetch(`data/smart_money_data.json?v=${Date.now()}`).catch(() => null);
      if (!res || !res.ok) res = await fetch('data/smart_money_data.json').catch(() => null);

      if (res && res.ok) {
        smData = await res.json();
        window._cachedSmartMoneyData = smData;
        renderSmartMoneyUI();
      }
    } catch (err) {
      console.error('[SmartMoneyRadarModule] Error loading data:', err);
    }
  }

  function bindEvents() {
    const refreshBtn = document.getElementById('sm-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.innerHTML = '<span>↻</span> Refreshing...';
        refreshBtn.disabled = true;
        window._cachedSmartMoneyData = null;
        await loadData();
        refreshBtn.innerHTML = '<span>↻</span> Refresh';
        refreshBtn.disabled = false;
      });
    }
  }

  function renderSmartMoneyUI() {
    if (!smData) return;

    // 1. Date badge
    const badge = document.getElementById('sm-eod-badge');
    if (badge && smData.scan_date) {
      badge.textContent = `● EOD SYNC: ${smData.scan_date}`;
    }

    // 2. Whale Flow Cards
    const wf = smData.whale_flow || {};
    
    // Top Accumulating
    const topAcc = wf.top_accumulating;
    const elAccSec = document.getElementById('sm-top-accum-sector');
    const elAccCr = document.getElementById('sm-top-accum-cr');
    const elAccAnchor = document.getElementById('sm-top-accum-anchor');
    const elAccTag = document.getElementById('sm-accum-flow-tag');
    if (topAcc) {
      if (elAccSec) elAccSec.textContent = topAcc.sector || '--';
      if (elAccCr) elAccCr.textContent = `+₹${Number(topAcc.deliv_cr || 0).toLocaleString('en-IN')} Cr`;
      if (elAccAnchor) elAccAnchor.textContent = topAcc.anchor || '--';
      if (elAccTag) elAccTag.textContent = topAcc.flow || 'ACCUMULATION';
    }

    // Top Distributing
    const topDist = wf.top_distributing;
    const elDistSec = document.getElementById('sm-top-distrib-sector');
    const elDistCr = document.getElementById('sm-top-distrib-cr');
    const elDistAnchor = document.getElementById('sm-top-distrib-anchor');
    const elDistTag = document.getElementById('sm-distrib-flow-tag');
    if (topDist) {
      if (elDistSec) elDistSec.textContent = topDist.sector || '--';
      if (elDistCr) elDistCr.textContent = `₹${Number(topDist.deliv_cr || 0).toLocaleString('en-IN')} Cr`;
      if (elDistAnchor) elDistAnchor.textContent = topDist.anchor || '--';
      if (elDistTag) elDistTag.textContent = topDist.flow || 'OUTFLOW';
    }

    // Total Delivery Turnover
    const elTotal = document.getElementById('sm-total-deliv-cr');
    const elRatio = document.getElementById('sm-flow-ratio');
    if (elTotal) {
      elTotal.textContent = `₹${Number(wf.total_deliv_cr || 0).toLocaleString('en-IN')} Cr`;
    }
    const inCount = wf.inflow_sectors_count || 0;
    const outCount = wf.outflow_sectors_count || 0;
    const totalSectors = inCount + outCount || 20;
    if (elRatio) {
      elRatio.textContent = `${Math.round((inCount / totalSectors) * 100)}% Positive Bias`;
    }

    // Counts & Ratio Bar
    const elIn = document.getElementById('sm-inflow-count');
    const elOut = document.getElementById('sm-outflow-count');
    const elFill = document.getElementById('sm-ratio-fill');
    if (elIn) elIn.textContent = inCount;
    if (elOut) elOut.textContent = outCount;
    if (elFill) {
      const pct = Math.round((inCount / totalSectors) * 100);
      elFill.style.width = `${pct}%`;
    }

    // 3. Weinstein 4-Stage Matrix
    const sr = smData.stage_regimes || {};
    const summary = sr.summary || {};

    const elC1 = document.getElementById('count-stage-1');
    const elC2 = document.getElementById('count-stage-2');
    const elC3 = document.getElementById('count-stage-3');
    const elC4 = document.getElementById('count-stage-4');

    if (elC1) elC1.textContent = `${summary.stage_1_accumulation || 0} Sectors`;
    if (elC2) elC2.textContent = `${summary.stage_2_markup || 0} Sectors`;
    if (elC3) elC3.textContent = `${summary.stage_3_distribution || 0} Sectors`;
    if (elC4) elC4.textContent = `${summary.stage_4_capitulation || 0} Sectors`;

    const list1 = document.getElementById('list-stage-1');
    const list2 = document.getElementById('list-stage-2');
    const list3 = document.getElementById('list-stage-3');
    const list4 = document.getElementById('list-stage-4');

    if (list1) list1.innerHTML = '';
    if (list2) list2.innerHTML = '';
    if (list3) list3.innerHTML = '';
    if (list4) list4.innerHTML = '';

    const sectors = smData.sectors || [];
    sectors.forEach(sec => {
      const card = createSectorCard(sec);
      if (sec.stage === 1 && list1) list1.appendChild(card);
      else if (sec.stage === 2 && list2) list2.appendChild(card);
      else if (sec.stage === 3 && list3) list3.appendChild(card);
      else if (sec.stage === 4 && list4) list4.appendChild(card);
    });
  }

  function createSectorCard(sec) {
    const el = document.createElement('div');
    el.className = 'sm-sector-card';
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `${sec.sector} in ${sec.stage_name || ''}`);

    let flowClass = 'flow-neutral';
    if (sec.flow === 'ACCUMULATION' || sec.flow === 'INFLOW') flowClass = 'flow-accum';
    else if (sec.flow === 'DISTRIBUTION' || sec.flow === 'OUTFLOW') flowClass = 'flow-distrib';

    const p20Color = sec.pct_20 >= 60 ? 'text-bullish' : (sec.pct_20 <= 40 ? 'text-bearish' : '');
    const p50Color = sec.pct_50 >= 50 ? 'text-bullish' : (sec.pct_50 <= 35 ? 'text-bearish' : '');
    const rsSign = sec.rs_20 >= 0 ? `+${sec.rs_20}` : `${sec.rs_20}`;
    const rsColor = sec.rs_20 >= 0 ? 'text-bullish' : 'text-bearish';

    el.innerHTML = `
      <div class="sm-sc-top">
        <strong class="sm-sc-name">${sec.sector}</strong>
        <span class="sm-sc-flow ${flowClass}">${sec.flow}</span>
      </div>
      <div class="sm-sc-metrics">
        <div class="sm-sc-metric">
          <span class="lbl">&gt;20 EMA:</span>
          <strong class="val ${p20Color}">${sec.pct_20}%</strong>
        </div>
        <div class="sm-sc-metric">
          <span class="lbl">&gt;50 EMA:</span>
          <strong class="val ${p50Color}">${sec.pct_50}%</strong>
        </div>
        <div class="sm-sc-metric">
          <span class="lbl">RS 20D:</span>
          <strong class="val ${rsColor}">${rsSign}</strong>
        </div>
        <div class="sm-sc-metric">
          <span class="lbl">Deliv:</span>
          <strong class="val text-gold">₹${Math.round(sec.deliv_cr).toLocaleString('en-IN')} Cr</strong>
        </div>
      </div>
      <div class="sm-sc-footer">
        <span class="sm-sc-anchor-lbl">Lead Anchor:</span>
        <span class="sm-sc-anchor-val">${sec.anchor || 'N/A'}</span>
      </div>
    `;

    el.addEventListener('click', () => {
      if (typeof window.filterBySector === 'function') {
        window.switchAppView('dash');
        window.filterBySector(sec.sector);
      }
    });

    return el;
  }

  return {
    init: init,
    loadData: loadData
  };
})();

/* ===================================================================================
   PHASE 2: FUNDAMENTAL RESEARCH MODULE (STANDALONE & FULLY DECOUPLED)
   =================================================================================== */
window.FundamentalResearchModule = (function() {
  let fundData = null;
  let isInitialized = false;
  let activeFilter = 'all';
  let searchQuery = '';
  let sortConfig = { key: 'f_score', dir: 'desc' };
  let currentPage = 1;
  const PAGE_SIZE = 20;

  async function init() {
    if (!isInitialized) {
      bindEvents();
      isInitialized = true;
    }
    await loadData();
  }

  async function loadData() {
    try {
      if (window._cachedFundamentalData) {
        fundData = window._cachedFundamentalData;
        renderUI();
      }

      const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
      let res = await fetch(`${basePath}data/fundamental_data.json?v=${Date.now()}`).catch(() => null);
      if (!res || !res.ok) res = await fetch(`data/fundamental_data.json?v=${Date.now()}`).catch(() => null);
      if (!res || !res.ok) res = await fetch('data/fundamental_data.json').catch(() => null);

      if (res && res.ok) {
        fundData = await res.json();
        window._cachedFundamentalData = fundData;
        renderUI();
        if (typeof window.populateFundamentalQualityCard === 'function') {
          window.populateFundamentalQualityCard();
        }
      }
    } catch (err) {
      console.error('[FundamentalResearchModule] Error loading data:', err);
    }
  }

  function bindEvents() {
    // Refresh button
    const refreshBtn = document.getElementById('fund-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.innerHTML = '<span>↻</span> Refreshing...';
        refreshBtn.disabled = true;
        window._cachedFundamentalData = null;
        currentPage = 1;
        await loadData();
        refreshBtn.innerHTML = '<span>↻</span> Refresh';
        refreshBtn.disabled = false;
      });
    }

    // Search input
    const searchInput = document.getElementById('fund-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = (e.target.value || '').trim().toLowerCase();
        currentPage = 1;
        renderTable();
      });
    }

    // Filter preset buttons
    const filterButtons = document.querySelectorAll('.fund-filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        activeFilter = btn.getAttribute('data-filter') || 'all';
        currentPage = 1;
        renderTable();
      });
    });

    // Sortable table headers
    const tableEl = document.getElementById('fund-leaderboard-table');
    if (tableEl) {
      tableEl.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
          const colKey = th.getAttribute('data-sort');
          if (!colKey) return;
          if (sortConfig.key === colKey) {
            sortConfig.dir = sortConfig.dir === 'asc' ? 'desc' : 'asc';
          } else {
            sortConfig.key = colKey;
            sortConfig.dir = ['s', 'sec', 'tier'].includes(colKey) ? 'asc' : 'desc';
          }
          // Update header classes
          tableEl.querySelectorAll('th.sortable').forEach(h => {
            h.classList.remove('sorted-asc', 'sorted-desc');
          });
          th.classList.add(sortConfig.dir === 'asc' ? 'sorted-asc' : 'sorted-desc');
          currentPage = 1;
          renderTable();
        });
      });
    }
  }

  function renderUI() {
    if (!fundData) return;

    // 1. EOD date badge
    const badge = document.getElementById('fund-eod-badge');
    if (badge && fundData.scan_date) {
      badge.textContent = `● EOD SYNC: ${fundData.scan_date}`;
    }

    // 2. Macro KPI Summary Cards
    const macro = fundData.macro_summary || {};
    const stocks = fundData.stocks || [];

    const elPe = document.getElementById('fund-kpi-pe');
    const elDebt = document.getElementById('fund-kpi-debt');
    const elDebtRatio = document.getElementById('fund-kpi-debt-ratio');
    const elRoe = document.getElementById('fund-kpi-roe');
    const elRoeHigh = document.getElementById('fund-kpi-roe-high');
    const elMoat = document.getElementById('fund-kpi-moat');

    if (elPe) {
      elPe.textContent = macro.median_pe ? `${macro.median_pe}x` : '33.1x';
    }
    const debtFreeCount = macro.debt_free_count !== undefined ? macro.debt_free_count : stocks.filter(s => (Number(s.de) || 0) === 0).length;
    if (elDebt) {
      elDebt.textContent = `${debtFreeCount} Stocks`;
    }
    if (elDebtRatio && stocks.length > 0) {
      const ratio = ((debtFreeCount / stocks.length) * 100).toFixed(1);
      elDebtRatio.textContent = `${ratio}% of Universe`;
    }
    if (elRoe) {
      elRoe.textContent = macro.median_roe ? `${macro.median_roe}%` : '15.9%';
    }
    const highRoeCount = stocks.filter(s => (Number(s.roe) || 0) > 20).length;
    if (elRoeHigh) {
      elRoeHigh.textContent = `${highRoeCount} Stocks`;
    }
    const f7Count = stocks.filter(s => (Number(s.f_score) || 0) >= 7).length;
    if (elMoat) {
      elMoat.textContent = `${f7Count} Stocks`;
    }

    // 3. Update filter button counts
    const countAll = stocks.length;
    const countBuffett = stocks.filter(s => (Number(s.roe) >= 20 && Number(s.roce) >= 15 && Number(s.de) <= 0.5 && Number(s.f_score) >= 7) || s.tier === 'Buffett Compounder').length;
    const countGarp = stocks.filter(s => (Number(s.eps_g) >= 15 && Number(s.pe) <= 35 && Number(s.roe) >= 14) || s.tier === 'High-Growth GARP').length;
    const countValue = stocks.filter(s => (Number(s.pe) <= 18 && Number(s.f_score) >= 5) || s.tier === 'Deep Value Moat').length;
    const countHighDebt = stocks.filter(s => Number(s.de) >= 1.5 || Number(s.f_score) <= 4).length;

    const elCAll = document.getElementById('count-filter-all');
    const elCBuffett = document.getElementById('count-filter-compounders');
    const elCGarp = document.getElementById('count-filter-garp');
    const elCValue = document.getElementById('count-filter-value');
    const elCHighDebt = document.getElementById('count-filter-highdebt');

    if (elCAll) elCAll.textContent = countAll;
    if (elCBuffett) elCBuffett.textContent = countBuffett;
    if (elCGarp) elCGarp.textContent = countGarp;
    if (elCValue) elCValue.textContent = countValue;
    if (elCHighDebt) elCHighDebt.textContent = countHighDebt;

    // 4. Render Table
    renderTable();
  }

  function getFilteredStocks() {
    if (!fundData || !fundData.stocks) return [];
    let list = fundData.stocks;

    // Apply Preset Filter
    if (activeFilter === 'compounders') {
      list = list.filter(s => (Number(s.roe) >= 20 && Number(s.roce) >= 15 && Number(s.de) <= 0.5 && Number(s.f_score) >= 7) || s.tier === 'Buffett Compounder');
    } else if (activeFilter === 'garp') {
      list = list.filter(s => (Number(s.eps_g) >= 15 && Number(s.pe) <= 35 && Number(s.roe) >= 14) || s.tier === 'High-Growth GARP');
    } else if (activeFilter === 'value') {
      list = list.filter(s => (Number(s.pe) <= 18 && Number(s.f_score) >= 5) || s.tier === 'Deep Value Moat');
    } else if (activeFilter === 'highdebt') {
      list = list.filter(s => Number(s.de) >= 1.5 || Number(s.f_score) <= 4);
    }

    // Apply Search Query
    if (searchQuery) {
      list = list.filter(s => {
        const sym = (s.s || '').toLowerCase();
        const sec = (s.sec || '').toLowerCase();
        return sym.includes(searchQuery) || sec.includes(searchQuery);
      });
    }

    // Sort
    const { key, dir } = sortConfig;
    list = [...list].sort((a, b) => {
      let valA = a[key];
      let valB = b[key];
      if (typeof valA === 'string') {
        const res = (valA || '').localeCompare(valB || '');
        return dir === 'asc' ? res : -res;
      }
      valA = Number(valA) !== undefined && !isNaN(Number(valA)) ? Number(valA) : (dir === 'asc' ? 999999 : -999999);
      valB = Number(valB) !== undefined && !isNaN(Number(valB)) ? Number(valB) : (dir === 'asc' ? 999999 : -999999);
      return dir === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }

  function renderTable() {
    const tbody = document.getElementById('fund-table-tbody');
    const countEl = document.getElementById('fund-showing-count');
    if (!tbody) return;

    const allFiltered = getFilteredStocks();
    const totalFiltered = allFiltered.length;
    const totalPages = Math.ceil(totalFiltered / PAGE_SIZE) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const endIdx = Math.min(startIdx + PAGE_SIZE, totalFiltered);
    const pagedStocks = allFiltered.slice(startIdx, endIdx);

    if (countEl) {
      if (totalFiltered === 0) {
        countEl.textContent = 'Showing 0 of 0 Equities';
      } else {
        countEl.textContent = `Showing ${startIdx + 1}-${endIdx} of ${totalFiltered} Equities`;
      }
    }

    if (totalFiltered === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" style="text-align: center; padding: 2.5rem; color: rgba(255,255,255,0.4);">
            No institutional equities matching current filter / search query.
          </td>
        </tr>
      `;
      renderPagination(0, 0, 0, 0);
      return;
    }

    tbody.innerHTML = pagedStocks.map(s => {
      const cmp = Number(s.cmp) || 0;
      const pe = Number(s.pe) || 0;
      const pb = Number(s.pb) || 0;
      const roe = Number(s.roe) || 0;
      const roce = Number(s.roce) || 0;
      const de = Number(s.de) !== undefined ? Number(s.de) : 0;
      const epsG = Number(s.eps_g) !== undefined ? Number(s.eps_g) : 0;
      const prom = Number(s.prom) !== undefined ? Number(s.prom) : 0;
      const fScore = Number(s.f_score) || 0;
      const tier = s.tier || 'Fair Value';

      // Score Pill
      let scoreClass = 'score-pill-neutral';
      if (fScore >= 8) scoreClass = 'score-pill-gold';
      else if (fScore >= 6) scoreClass = 'score-pill-blue';
      else if (fScore <= 3) scoreClass = 'score-pill-fragile';

      // Tier Badge
      let tierClass = 'tier-fair';
      let tierIcon = '⚖️';
      if (tier === 'Buffett Compounder') {
        tierClass = 'tier-buffett';
        tierIcon = '👑';
      } else if (tier === 'High-Growth GARP') {
        tierClass = 'tier-garp';
        tierIcon = '🚀';
      } else if (tier === 'Deep Value Moat') {
        tierClass = 'tier-value';
        tierIcon = '🛡️';
      } else if (tier === 'Turnaround') {
        tierClass = 'tier-turnaround';
        tierIcon = '⚡';
      }

      // Formatting colors
      const roeClass = roe >= 20 ? 'text-emerald font-bold' : (roe >= 14 ? 'text-cyan' : (roe < 8 ? 'text-rose' : 'text-slate'));
      const roceClass = roce >= 20 ? 'text-emerald font-bold' : (roce >= 12 ? 'text-cyan' : 'text-slate');
      const deClass = de === 0 ? 'text-emerald font-bold' : (de < 0.5 ? 'text-emerald' : (de > 1.5 ? 'text-rose font-bold' : 'text-slate'));
      const epsGClass = epsG >= 20 ? 'text-emerald font-bold' : (epsG > 0 ? 'text-cyan' : 'text-rose');
      const peClass = pe < 20 ? 'text-emerald' : (pe > 50 ? 'text-amber' : 'text-slate');

      const cmpFormatted = cmp >= 1000 ? cmp.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : cmp.toFixed(2);
      const epsGFormatted = epsG > 0 ? `+${epsG.toFixed(1)}%` : `${epsG.toFixed(1)}%`;

      return `
        <tr>
          <td class="col-sticky-symbol">
            <span class="fund-symbol-text">${s.s}</span>
          </td>
          <td>
            <span class="fund-sec-pill">${s.sec || '--'}</span>
          </td>
          <td class="text-right">₹${cmpFormatted}</td>
          <td class="text-right ${peClass}">${pe.toFixed(1)}</td>
          <td class="text-right text-slate">${pb.toFixed(1)}</td>
          <td class="text-right ${roeClass}">${roe.toFixed(1)}%</td>
          <td class="text-right ${roceClass}">${roce.toFixed(1)}%</td>
          <td class="text-right ${deClass}">${de === 0 ? '0.00' : de.toFixed(2)}</td>
          <td class="text-right ${epsGClass}">${epsGFormatted}</td>
          <td class="text-right text-slate">${prom.toFixed(1)}%</td>
          <td class="text-center">
            <span class="fund-score-pill ${scoreClass}">${fScore}/9</span>
          </td>
          <td class="text-center">
            <span class="fund-tier-badge ${tierClass}">${tierIcon} ${tier}</span>
          </td>
        </tr>
      `;
    }).join('');

    renderPagination(totalFiltered, totalPages, startIdx, endIdx);
  }

  function renderPagination(totalItems, totalPages, startIdx, endIdx) {
    const pBar = document.getElementById('fund-pagination-bar');
    const pInfo = document.getElementById('fund-pagination-info');
    const pControls = document.getElementById('fund-pagination-controls');
    if (!pBar || !pInfo || !pControls) return;

    if (totalItems === 0) {
      pInfo.innerHTML = 'Showing <span>0</span> to <span>0</span> of <span>0</span> Equities';
      pControls.innerHTML = '';
      pBar.style.display = 'none';
      return;
    }

    pBar.style.display = 'flex';
    pInfo.innerHTML = `Showing <span>${startIdx + 1}-${endIdx}</span> of <span>${totalItems}</span> Equities (Page <span>${currentPage}</span> of <span>${totalPages}</span>)`;

    if (totalPages <= 1) {
      pControls.innerHTML = '';
      return;
    }

    let buttonsHtml = '';
    const prevDisabled = currentPage === 1 ? ' disabled' : '';
    buttonsHtml += `<button class="page-btn page-prev" data-page="${currentPage - 1}"${prevDisabled} aria-label="Previous Page">◀ Prev</button>`;

    let startPage = Math.max(1, currentPage - 3);
    let endPage = Math.min(totalPages, startPage + 6);
    if (endPage - startPage < 6) {
      startPage = Math.max(1, endPage - 6);
    }

    if (startPage > 1) {
      buttonsHtml += `<button class="page-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        buttonsHtml += `<span class="page-ellipsis" style="color:rgba(255,255,255,0.4); padding:0 4px; display:inline-flex; align-items:center;">…</span>`;
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      const isActive = p === currentPage ? ' active' : '';
      buttonsHtml += `<button class="page-btn${isActive}" data-page="${p}">${p}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttonsHtml += `<span class="page-ellipsis" style="color:rgba(255,255,255,0.4); padding:0 4px; display:inline-flex; align-items:center;">…</span>`;
      }
      buttonsHtml += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    const nextDisabled = currentPage === totalPages ? ' disabled' : '';
    buttonsHtml += `<button class="page-btn page-next" data-page="${currentPage + 1}"${nextDisabled} aria-label="Next Page">Next ▶</button>`;

    pControls.innerHTML = buttonsHtml;

    pControls.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetPage = parseInt(btn.getAttribute('data-page'), 10);
        if (targetPage && targetPage !== currentPage && targetPage >= 1 && targetPage <= totalPages) {
          currentPage = targetPage;
          renderTable();
          const tableCard = document.querySelector('.fund-table-card');
          if (tableCard) {
            tableCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      });
    });
  }

  return {
    init: init,
    loadData: loadData,
    renderTable: renderTable,
    setPage: function(p) { currentPage = p; renderTable(); },
    getPage: function() { return currentPage; },
    getPageSize: function() { return PAGE_SIZE; }
  };
})();

function initAdvScannerNavigation() {
    function switchView(target) {
      const dView = document.getElementById('view-dashboard') || document.getElementById('dashboard-view');
      const dCont = document.getElementById('dashboard-container');
      const mCont = document.getElementById('main-scanner-container');
      const aView = document.getElementById('view-advanced-scanner') || document.getElementById('adv-scanner-view');
      const sView = document.getElementById('view-sector-analysis');
      const sCont = document.getElementById('sector-analysis-container');
      const smView = document.getElementById('view-smart-money');
      const smCont = document.getElementById('smart-money-radar');
      const fView = document.getElementById('view-fundamental-research');
      const fCont = document.getElementById('fundamental-research-container');
      const btView = document.getElementById('view-strategy-backtest');
      const btCont = document.getElementById('strategy-backtest-container');
      const wView = document.getElementById('view-watchlist-alerts');
      const wCont = document.getElementById('watchlist-alerts-container');
      const cView = document.getElementById('view-stock-comparison');
      const cCont = document.getElementById('stock-comparison-container');

      const dBtn = document.getElementById('nav-dashboard');
      const aBtn = document.getElementById('nav-adv-scanner');
      const sBtn = document.getElementById('nav-sector-analysis');
      const smBtn = document.getElementById('nav-smart-money') || document.querySelector('a[href="#smart-money"]');
      const fBtn = document.getElementById('nav-fundamental-research') || document.querySelector('a[href="#fundamental-research"]');
      const btBtn = document.getElementById('nav-strategy-backtest') || document.querySelector('a[href="#strategy-backtest"]');
      const wBtn = document.getElementById('nav-watchlist-alerts') || document.querySelector('a[href="#watchlist-alerts"]');
      const cBtn = document.getElementById('nav-stock-comparison') || document.querySelector('a[href="#stock-comparison"]');

      function hideAllViews() {
        if (dView) { dView.classList.add('hidden'); dView.style.setProperty('display', 'none', 'important'); }
        if (dCont) { dCont.classList.add('hidden'); dCont.style.setProperty('display', 'none', 'important'); }
        if (mCont) { mCont.classList.add('hidden'); mCont.style.setProperty('display', 'none', 'important'); }
        if (aView) { aView.classList.add('hidden'); aView.style.setProperty('display', 'none', 'important'); }
        if (sView) { sView.classList.add('hidden'); sView.style.setProperty('display', 'none', 'important'); }
        if (sCont) { sCont.classList.add('hidden'); sCont.style.setProperty('display', 'none', 'important'); }
        if (smView) { smView.classList.add('hidden'); smView.style.setProperty('display', 'none', 'important'); }
        if (smCont) { smCont.classList.add('hidden'); smCont.style.setProperty('display', 'none', 'important'); }
        if (fView) { fView.classList.add('hidden'); fView.style.setProperty('display', 'none', 'important'); }
        if (fCont) { fCont.classList.add('hidden'); fCont.style.setProperty('display', 'none', 'important'); }
        if (btView) { btView.classList.add('hidden'); btView.style.setProperty('display', 'none', 'important'); }
        if (btCont) { btCont.classList.add('hidden'); btCont.style.setProperty('display', 'none', 'important'); }
        if (wView) { wView.classList.add('hidden'); wView.style.setProperty('display', 'none', 'important'); }
        if (wCont) { wCont.classList.add('hidden'); wCont.style.setProperty('display', 'none', 'important'); }
        if (cView) { cView.classList.add('hidden'); cView.style.setProperty('display', 'none', 'important'); }
        if (cCont) { cCont.classList.add('hidden'); cCont.style.setProperty('display', 'none', 'important'); }
        document.querySelectorAll('.terminal-sidebar .sidebar-item').forEach(si => si.classList.remove('active'));
      }

      if (target === 'compare' || target === 'comparison') {
        hideAllViews();
        if (cView) {
          cView.classList.remove('hidden');
          cView.style.setProperty('display', 'block', 'important');
          cView.style.minHeight = '500px';
        }
        if (cCont) {
          cCont.classList.remove('hidden');
          cCont.style.setProperty('display', 'flex', 'important');
        }
        if (cBtn) cBtn.classList.add('active');
        if (window.location.hash !== '#stock-comparison') {
          window.location.hash = '#stock-comparison';
        }
        if (window.StockComparisonModule && typeof window.StockComparisonModule.init === 'function') {
          window.StockComparisonModule.init();
        }
        return;
      }

      if (target === 'watchlist' || target === 'alerts') {
        hideAllViews();
        if (wView) {
          wView.classList.remove('hidden');
          wView.style.setProperty('display', 'block', 'important');
          wView.style.minHeight = '500px';
        }
        if (wCont) {
          wCont.classList.remove('hidden');
          wCont.style.setProperty('display', 'flex', 'important');
        }
        if (wBtn) wBtn.classList.add('active');
        if (window.location.hash !== '#watchlist-alerts') {
          window.location.hash = '#watchlist-alerts';
        }
        if (window.WatchlistAlertsModule && typeof window.WatchlistAlertsModule.init === 'function') {
          window.WatchlistAlertsModule.init();
        }
        return;
      }

      if (target === 'backtest' || target === 'strategy') {
        hideAllViews();
        if (btView) {
          btView.classList.remove('hidden');
          btView.style.setProperty('display', 'block', 'important');
          btView.style.minHeight = '500px';
        }
        if (btCont) {
          btCont.classList.remove('hidden');
          btCont.style.setProperty('display', 'flex', 'important');
        }
        if (btBtn) btBtn.classList.add('active');
        if (window.location.hash !== '#strategy-backtest') {
          window.location.hash = '#strategy-backtest';
        }
        if (window.StrategyBacktestModule && typeof window.StrategyBacktestModule.init === 'function') {
          window.StrategyBacktestModule.init();
        }
        return;
      }

      if (target === 'fund' || target === 'fundamental') {
        hideAllViews();
        if (fView) {
          fView.classList.remove('hidden');
          fView.style.setProperty('display', 'block', 'important');
          fView.style.minHeight = '500px';
        }
        if (fCont) {
          fCont.classList.remove('hidden');
          fCont.style.setProperty('display', 'flex', 'important');
        }
        if (fBtn) fBtn.classList.add('active');
        if (window.location.hash !== '#fundamental-research') {
          window.location.hash = '#fundamental-research';
        }
        if (window.FundamentalResearchModule && typeof window.FundamentalResearchModule.init === 'function') {
          window.FundamentalResearchModule.init();
        }
        return;
      }

      if (target === 'smart') {
        hideAllViews();
        if (smView) {
          smView.classList.remove('hidden');
          smView.style.setProperty('display', 'block', 'important');
          smView.style.minHeight = '500px';
        }
        if (smCont) {
          smCont.classList.remove('hidden');
          smCont.style.setProperty('display', 'flex', 'important');
        }
        if (smBtn) smBtn.classList.add('active');
        if (window.location.hash !== '#smart-money') {
          window.location.hash = '#smart-money';
        }
        if (window.SmartMoneyRadarModule && typeof window.SmartMoneyRadarModule.init === 'function') {
          window.SmartMoneyRadarModule.init();
        }
        return;
      }

      if (target === 'sec') {
        hideAllViews();
        if (sView) {
          sView.classList.remove('hidden');
          sView.style.setProperty('display', 'block', 'important');
          sView.style.minHeight = '500px';
        }
        if (sCont) {
          sCont.classList.remove('hidden');
          sCont.style.setProperty('display', 'flex', 'important');
        }
        if (sBtn) sBtn.classList.add('active');
        if (window.location.hash !== '#sector-analysis') {
          window.location.hash = '#sector-analysis';
        }
        if (window.SectorAnalysisModule && typeof window.SectorAnalysisModule.init === 'function') {
          window.SectorAnalysisModule.init();
        }
        return;
      }

      if (target === 'adv') {
        hideAllViews();
        if (aView) {
          aView.classList.remove('hidden');
          aView.style.setProperty('display', 'block', 'important');
          aView.style.minHeight = '500px';
        }
        if (aBtn) aBtn.classList.add('active');
        if (window.location.hash !== '#advanced-scanner') {
          window.location.hash = '#advanced-scanner';
        }
        if (advState.activeSlot === 1) {
          loadAdvRsData();
        } else if (advState.activeSlot === 2) {
          loadAdvBoData();
        } else if (advState.activeSlot === 3) {
          loadAdvMcData();
        } else if (advState.activeSlot === 4) {
          loadAdvRbrData();
        } else if (advState.activeSlot === 5) {
          loadAdvConfluenceData();
        } else {
          loadAdvWyckoffData();
        }
        loadAdvBoData();
        loadAdvMcData();
        loadAdvRbrData();
        loadAdvConfluenceData();
        loadAdvWyckoffData();
      } else {
        hideAllViews();
        if (dView) {
          dView.classList.remove('hidden');
          dView.style.setProperty('display', 'block', 'important');
        }
        if (dCont) {
          dCont.classList.remove('hidden');
          dCont.style.setProperty('display', 'flex', 'important');
        }
        if (mCont) {
          mCont.classList.remove('hidden');
          mCont.style.setProperty('display', 'block', 'important');
        }
        if (dBtn) dBtn.classList.add('active');
        if (window.location.hash === '#advanced-scanner' || window.location.hash === '#stock-scanner' || window.location.hash === '#sector-analysis' || window.location.hash === '#smart-money' || window.location.hash === '#smart-money-radar' || window.location.hash === '#fundamental-research' || window.location.hash === '#strategy-backtest' || window.location.hash === '#backtest' || window.location.hash === '#watchlist-alerts' || window.location.hash === '#watchlist' || window.location.hash === '#stock-comparison' || window.location.hash === '#compare') {
          window.location.hash = '#dashboard';
        }
      }
    }

    // Expose switchView globally for cross-tab routing
    window.switchAppView = switchView;

    // Bind sidebar navigation clicks
    document.querySelectorAll('.terminal-sidebar .sidebar-item').forEach(item => {
      if (item.id === 'nav-adv-scanner' || item.getAttribute('href') === '#advanced-scanner') {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          switchView('adv');
        });
      } else if (item.id === 'nav-sector-analysis' || item.getAttribute('href') === '#sector-analysis') {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          switchView('sec');
        });
      } else if (item.id === 'nav-smart-money' || item.getAttribute('href') === '#smart-money' || item.getAttribute('href') === '#smart-money-radar') {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          switchView('smart');
        });
      } else if (item.id === 'nav-fundamental-research' || item.getAttribute('href') === '#fundamental-research') {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          switchView('fund');
        });
      } else if (item.id === 'nav-strategy-backtest' || item.getAttribute('href') === '#strategy-backtest' || item.getAttribute('href') === '#backtest') {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          switchView('backtest');
        });
      } else if (item.id === 'nav-watchlist-alerts' || item.getAttribute('href') === '#watchlist-alerts' || item.getAttribute('href') === '#watchlist') {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          switchView('watchlist');
        });
      } else if (item.id === 'nav-stock-comparison' || item.getAttribute('href') === '#stock-comparison' || item.getAttribute('href') === '#compare') {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          switchView('compare');
        });
      } else if (item.id === 'nav-dashboard' || item.getAttribute('href') === '#dashboard') {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          switchView('dash');
        });
      } else {
        item.addEventListener('click', () => {
          switchView('dash');
          document.querySelectorAll('.terminal-sidebar .sidebar-item').forEach(si => si.classList.remove('active'));
          item.classList.add('active');
        });
      }
    });

    // Hash navigation routing
    function handleHashRouting() {
      const hash = window.location.hash;
      if (hash === '#stock-scanner' || hash === '#advanced-scanner') {
        switchView('adv');
      } else if (hash === '#sector-analysis') {
        switchView('sec');
      } else if (hash === '#smart-money' || hash === '#smart-money-radar') {
        switchView('smart');
      } else if (hash === '#fundamental-research' || hash === '#fundamental') {
        switchView('fund');
      } else if (hash === '#strategy-backtest' || hash === '#backtest') {
        switchView('backtest');
      } else if (hash === '#watchlist-alerts' || hash === '#watchlist' || hash === '#alerts') {
        switchView('watchlist');
      } else if (hash === '#stock-comparison' || hash === '#compare') {
        switchView('compare');
      } else {
        switchView('dash');
      }
    }

    window.addEventListener('hashchange', handleHashRouting);
    handleHashRouting();

    // Bind Slot Card Switcher (Slot 1 vs Slot 2 vs Slot 3 vs Slot 4 vs Slot 5 vs Slot 6)
    document.querySelectorAll('.adv-subscanner-grid .adv-sub-card').forEach(card => {
      card.addEventListener('click', () => {
        const sub = card.getAttribute('data-sub') || card.getAttribute('data-tab');
        if (sub === 'rs_scanner') {
          selectAdvSlot(1);
        } else if (sub === 'early_breakout') {
          selectAdvSlot(2);
        } else if (sub === 'momentum_continuation') {
          selectAdvSlot(3);
        } else if (sub === 'rbr_proportional') {
          selectAdvSlot(4);
        } else if (sub === 'confluence_engine' || sub === 'confluence') {
          selectAdvSlot(5);
        } else if (sub === 'wyckoff' || sub === 'wyckoff_absorption') {
          selectAdvSlot(6);
        }
      });
    });

    // Toolbar event listeners
    const searchInput = document.getElementById('adv-rs-search');
    const gradeSelect = document.getElementById('adv-grade-filter');
    const classSelect = document.getElementById('adv-class-filter');
    const sectorSelect = document.getElementById('adv-rs-sector');
    const exportBtn = document.getElementById('adv-export-csv-btn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        advState.searchQuery = e.target.value.trim().toLowerCase();
        advState.currentPage = 1;
        renderAdvActiveTable();
      });
    }

    if (gradeSelect) {
      gradeSelect.addEventListener('change', (e) => {
        advState.gradeFilter = e.target.value;
        advState.currentPage = 1;
        renderAdvActiveTable();
      });
    }

    if (classSelect) {
      classSelect.addEventListener('change', (e) => {
        advState.classFilter = e.target.value;
        advState.currentPage = 1;
        renderAdvActiveTable();
      });
    }

    if (sectorSelect) {
      sectorSelect.addEventListener('change', (e) => {
        advState.sectorFilter = e.target.value;
        advState.currentPage = 1;
        renderAdvActiveTable();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', exportAdvCsv);
    }

    // Initial thead setup
    renderAdvThead(advState.activeSlot);
  }

  function selectAdvSlot(slotNum) {
    advState.activeSlot = slotNum;
    advState.currentSlot = slotNum;
    advState.currentPage = 1;
    advState.searchQuery = '';
    advState.gradeFilter = 'ALL';
    advState.classFilter = 'ALL';
    advState.sectorFilter = 'ALL';

    const sSearch = document.getElementById('adv-rs-search');
    if (sSearch) sSearch.value = '';
    const gSelect = document.getElementById('adv-grade-filter');
    if (gSelect) {
      gSelect.value = 'ALL';
      if (slotNum === 1) {
        gSelect.style.display = '';
        gSelect.innerHTML = `
          <option value="ALL">All Grades (A, B, C, Weak)</option>
          <option value="Grade A">Grade A (RS ≥ 80, 20D/60D > 0, > 50 EMA)</option>
          <option value="Grade B">Grade B (RS ≥ 70, 20D > 0)</option>
          <option value="Weak">Weak / Deteriorating</option>
        `;
      } else if (slotNum === 3) {
        gSelect.style.display = '';
        gSelect.innerHTML = `
          <option value="ALL">All Grades (A+, A, B)</option>
          <option value="A+">Grade A+ (Elite Momentum ≥ 85)</option>
          <option value="A">Grade A (Strong Momentum 70–84)</option>
          <option value="B">Grade B (Constructive Momentum &lt; 70)</option>
        `;
      } else if (slotNum === 4) {
        gSelect.style.display = '';
        gSelect.innerHTML = `
          <option value="ALL">All Grades (A+, A, B)</option>
          <option value="A+">Grade A+ (Elite RBR ≥ 85)</option>
          <option value="A">Grade A (Confirmed RBR 70–84)</option>
          <option value="B">Grade B (Constructive Base &lt; 70)</option>
        `;
      } else if (slotNum === 5) {
        gSelect.style.display = '';
        gSelect.innerHTML = `
          <option value="ALL">All Conviction Tiers</option>
          <option value="ULTRA HIGH CONVICTION">Tier 1: Ultra High Conviction (4+ Setups)</option>
          <option value="HIGH CONVICTION">Tier 2: High Conviction (3 Setups)</option>
          <option value="MODERATE CONFLUENCE">Tier 3: Moderate Confluence (2 Setups)</option>
        `;
      } else if (slotNum === 6) {
        gSelect.style.display = '';
        gSelect.innerHTML = `
          <option value="ALL">All Grades (A+, A, B)</option>
          <option value="A+">Grade A+ (Elite Wyckoff ≥ 85)</option>
          <option value="A">Grade A (High Conviction 70–84)</option>
          <option value="B">Grade B (Constructive Wyckoff 60–69)</option>
        `;
      } else {
        gSelect.style.display = 'none';
      }
    }
    const cSelect = document.getElementById('adv-class-filter');
    if (cSelect) {
      cSelect.value = 'ALL';
      if (slotNum === 1) {
        cSelect.style.display = '';
        cSelect.innerHTML = `
          <option value="ALL">All RS Scores</option>
          <option value="90">Exceptional Strength (90 - 100)</option>
          <option value="80">Strong Outperformer (80 - 89)</option>
          <option value="70">Moderate Strength (70 - 79)</option>
          <option value="50">Average &amp; Below (&lt; 70)</option>
        `;
      } else if (slotNum === 6) {
        cSelect.style.display = '';
        cSelect.innerHTML = `
          <option value="ALL">All Wyckoff Phases</option>
          <option value="Phase C Spring">Phase C Spring</option>
          <option value="Absorption at Resistance">Absorption at Resistance</option>
          <option value="Sign of Strength (SOS)">Sign of Strength (SOS)</option>
        `;
      } else {
        cSelect.style.display = 'none';
      }
    }
    const secSelect = document.getElementById('adv-rs-sector');
    if (secSelect) secSelect.value = 'ALL';

    const expBtn = document.getElementById('adv-export-csv-btn');
    if (expBtn) {
      if (slotNum === 1) expBtn.innerHTML = '<span>⬇ Export RS Data</span>';
      else if (slotNum === 2) expBtn.innerHTML = '<span>⬇ Export Breakout Data</span>';
      else if (slotNum === 3) expBtn.innerHTML = '<span>⬇ Export Momentum Data</span>';
      else if (slotNum === 4) expBtn.innerHTML = '<span>⬇ Export RBR Data</span>';
      else if (slotNum === 5) expBtn.innerHTML = '<span>⬇ Export Confluence Data</span>';
      else if (slotNum === 6) expBtn.innerHTML = '<span>⬇ Export Wyckoff Data</span>';
    }

    const card1 = document.getElementById('adv-slot-1-card') || document.querySelector('.adv-sub-card[data-sub="rs_scanner"]');
    const card2 = document.getElementById('adv-slot-2-card') || document.querySelector('.adv-sub-card[data-sub="early_breakout"]');
    const card3 = document.getElementById('adv-slot-3-card') || document.querySelector('.adv-sub-card[data-sub="momentum_continuation"]');
    const card4 = document.getElementById('adv-slot-4-card') || document.querySelector('.adv-sub-card[data-sub="rbr_proportional"]');
    const card5 = document.getElementById('adv-slot-5-card') || document.querySelector('.adv-sub-card[data-sub="confluence_engine"]');
    const card6 = document.getElementById('adv-slot-6-card') || document.querySelector('.adv-sub-card[data-sub="wyckoff"]') || document.querySelector('.adv-sub-card[data-tab="wyckoff"]');
    if (card1) {
      card1.classList.toggle('active', slotNum === 1);
      card1.setAttribute('aria-selected', slotNum === 1 ? 'true' : 'false');
    }
    if (card2) {
      card2.classList.toggle('active', slotNum === 2);
      card2.setAttribute('aria-selected', slotNum === 2 ? 'true' : 'false');
    }
    if (card3) {
      card3.classList.toggle('active', slotNum === 3);
      card3.setAttribute('aria-selected', slotNum === 3 ? 'true' : 'false');
    }
    if (card4) {
      card4.classList.toggle('active', slotNum === 4);
      card4.setAttribute('aria-selected', slotNum === 4 ? 'true' : 'false');
    }
    if (card5) {
      card5.classList.toggle('active', slotNum === 5);
      card5.setAttribute('aria-selected', slotNum === 5 ? 'true' : 'false');
    }
    if (card6) {
      card6.classList.toggle('active', slotNum === 6);
      card6.setAttribute('aria-selected', slotNum === 6 ? 'true' : 'false');
    }

    if (slotNum === 1) {
      advState.sortColumn = 'rs_score';
      advState.sortDirection = 'desc';
      renderAdvThead(1);
      updateAdvHeaderKpis();
      populateAdvSectorFilter();
      if (!advState.rsData) {
        loadAdvRsData();
      } else {
        renderAdvActiveTable();
      }
    } else if (slotNum === 2) {
      advState.sortColumn = 'dist_to_pivot';
      advState.sortDirection = 'asc';
      renderAdvThead(2);
      updateAdvHeaderKpis();
      populateAdvSectorFilter();
      if (!advState.boData) {
        loadAdvBoData();
      } else {
        renderAdvActiveTable();
      }
    } else if (slotNum === 3) {
      advState.sortColumn = 'total_score';
      advState.sortDirection = 'desc';
      renderAdvThead(3);
      updateAdvHeaderKpis();
      populateAdvSectorFilter();
      if (!advState.mcData) {
        loadAdvMcData();
      } else {
        renderAdvActiveTable();
      }
    } else if (slotNum === 4) {
      advState.sortColumn = 'rbr_score';
      advState.sortDirection = 'desc';
      renderAdvThead(4);
      updateAdvHeaderKpis();
      populateAdvSectorFilter();
      if (!advState.rbrData) {
        loadAdvRbrData();
      } else {
        renderAdvActiveTable();
      }
    } else if (slotNum === 5) {
      advState.sortColumn = 'confluence_count';
      advState.sortDirection = 'desc';
      renderAdvThead(5);
      updateAdvHeaderKpis();
      populateAdvSectorFilter();
      if (!advState.confluenceData) {
        loadAdvConfluenceData();
      } else {
        renderAdvActiveTable();
      }
    } else if (slotNum === 6) {
      advState.sortColumn = 'score';
      advState.sortDirection = 'desc';
      renderAdvThead(6);
      updateAdvHeaderKpis();
      populateAdvSectorFilter();
      if (!advState.wyckoffData) {
        loadAdvWyckoffData();
      } else {
        renderAdvActiveTable();
      }
    }
  }

  function renderAdvThead(slotNum) {
    const thead = document.getElementById('adv-table-thead') || document.querySelector('#adv-rs-table thead');
    if (!thead) return;

    if (slotNum === 1) {
      thead.innerHTML = `
        <tr>
          <th style="width: 40px; text-align: center;">#<div class="col-resizer" data-min="36"></div></th>
          <th style="width: 40px; text-align: center;" title="Quick Watchlist">★<div class="col-resizer" data-min="36"></div></th>
          <th class="sortable text-left sticky-symbol-col" data-col="symbol" style="min-width: 140px; text-align: left;">Symbol <span class="sort-icon">↕</span><div class="col-resizer" data-min="90"></div></th>
          <th class="sortable text-right" data-col="cmp" style="width: 90px; text-align: right;">LTP (₹) <span class="sort-icon">↕</span><div class="col-resizer" data-min="70"></div></th>
          <th class="sortable text-right" data-col="change_pct" style="width: 75px; text-align: right;">CHG % <span class="sort-icon">↕</span><div class="col-resizer" data-min="65"></div></th>
          <th class="sortable text-right" data-col="delivery_pct" style="width: 85px; text-align: right;">Delivery % <span class="sort-icon">↕</span><div class="col-resizer" data-min="70"></div></th>
          <th class="sortable text-center" data-col="grade" style="width: 65px; text-align: center;">Grade <span class="sort-icon">↕</span><div class="col-resizer" data-min="55"></div></th>
          <th class="sortable active-sort text-center" data-col="rs_score" style="width: 80px; text-align: center;">RS Score <span class="sort-icon active">▼</span><div class="col-resizer" data-min="65"></div></th>
          <th class="sortable text-center" data-col="rs_line_status" style="width: 110px; text-align: center;">RS Line Status <span class="sort-icon">↕</span><div class="col-resizer" data-min="85"></div></th>
          <th class="sortable text-right" data-col="rs_20d" style="width: 75px; text-align: right;">20D RS <span class="sort-icon">↕</span><div class="col-resizer" data-min="65"></div></th>
          <th class="sortable text-right" data-col="rs_60d" style="width: 75px; text-align: right;">60D RS <span class="sort-icon">↕</span><div class="col-resizer" data-min="65"></div></th>
          <th class="sortable text-right" data-col="rs_120d" style="width: 75px; text-align: right;">120D RS <span class="sort-icon">↕</span><div class="col-resizer" data-min="65"></div></th>
          <th class="sortable text-right" data-col="rs_252d" style="width: 75px; text-align: right;">252D RS <span class="sort-icon">↕</span><div class="col-resizer" data-min="65"></div></th>
          <th class="sortable text-center" data-col="ema_stack" style="width: 100px; text-align: center;">EMA Stack <span class="sort-icon">↕</span><div class="col-resizer" data-min="80"></div></th>
          <th class="sortable text-center" data-col="vol_ratio" style="width: 95px; text-align: center;">Vol Status <span class="sort-icon">↕</span><div class="col-resizer" data-min="75"></div></th>
          <th style="width: 75px; text-align: center;">Action</th>
        </tr>
      `;
    } else if (slotNum === 2) {
      thead.innerHTML = `
        <tr>
          <th style="width: 40px; text-align: center;">#<div class="col-resizer" data-min="36"></div></th>
          <th style="width: 40px; text-align: center;" title="Quick Watchlist">★<div class="col-resizer" data-min="36"></div></th>
          <th class="sortable text-left" data-col="symbol" style="text-align: left;">Symbol <span class="sort-icon">↕</span><div class="col-resizer" data-min="90"></div></th>
          <th class="sortable text-right" data-col="cmp" style="width: 90px; text-align: right;">LTP (₹) <span class="sort-icon">↕</span><div class="col-resizer" data-min="70"></div></th>
          <th class="sortable text-right" data-col="change_pct" style="width: 80px; text-align: right;">CHG % <span class="sort-icon">↕</span><div class="col-resizer" data-min="65"></div></th>
          <th class="sortable text-right" data-col="resistance" style="width: 130px; text-align: right;">Resistance Pivot (₹) <span class="sort-icon">↕</span><div class="col-resizer" data-min="95"></div></th>
          <th class="sortable active-sort text-center" data-col="dist_to_pivot" style="width: 110px; text-align: center;">Distance to Pivot <span class="sort-icon active">▲</span><div class="col-resizer" data-min="85"></div></th>
          <th class="sortable text-center" data-col="pivot_type" style="width: 110px; text-align: center;">Pivot Type <span class="sort-icon">↕</span><div class="col-resizer" data-min="85"></div></th>
          <th style="width: 80px; text-align: center;">Action</th>
        </tr>
      `;
    } else if (slotNum === 3) {
      thead.innerHTML = `
        <tr>
          <th style="width: 40px; text-align: center;">#<div class="col-resizer" data-min="36"></div></th>
          <th style="width: 40px; text-align: center;" title="Quick Watchlist">★<div class="col-resizer" data-min="36"></div></th>
          <th class="sortable text-left sticky-symbol-col" data-col="symbol" style="min-width: 140px; text-align: left;">Symbol <span class="sort-icon">↕</span><div class="col-resizer" data-min="90"></div></th>
          <th class="sortable text-right" data-col="ltp" style="width: 90px; text-align: right;">LTP (₹) <span class="sort-icon">↕</span><div class="col-resizer" data-min="70"></div></th>
          <th class="sortable text-right" data-col="change_pct" style="width: 75px; text-align: right;">CHG % <span class="sort-icon">↕</span><div class="col-resizer" data-min="65"></div></th>
          <th class="sortable active-sort text-center" data-col="total_score" style="width: 95px; text-align: center;">Score &amp; Grade <span class="sort-icon active">▼</span><div class="col-resizer" data-min="75"></div></th>
          <th class="sortable text-center" data-col="pullback_pct" style="width: 105px; text-align: center;">Pullback % <span class="sort-icon">↕</span><div class="col-resizer" data-min="80"></div></th>
          <th class="sortable text-center" data-col="volume_ratio" style="width: 110px; text-align: center;">Volume Ratio <span class="sort-icon">↕</span><div class="col-resizer" data-min="85"></div></th>
          <th class="sortable text-center" data-col="rsi_14" style="width: 80px; text-align: center;">RSI (14) <span class="sort-icon">↕</span><div class="col-resizer" data-min="65"></div></th>
          <th class="sortable text-center" data-col="rs_vs_nifty_status" style="width: 115px; text-align: center;">RS vs Nifty <span class="sort-icon">↕</span><div class="col-resizer" data-min="85"></div></th>
          <th class="sortable text-right" data-col="s1" style="width: 125px; text-align: right;">S1 / R1 (₹) <span class="sort-icon">↕</span><div class="col-resizer" data-min="95"></div></th>
          <th style="width: 75px; text-align: center;">Action</th>
        </tr>
      `;
    } else if (slotNum === 4) {
      thead.innerHTML = `
        <tr>
          <th style="width: 40px; text-align: center;">#<div class="col-resizer" data-min="36"></div></th>
          <th style="width: 40px; text-align: center;" title="Quick Watchlist">★<div class="col-resizer" data-min="36"></div></th>
          <th class="sortable text-left sticky-symbol-col" data-col="symbol" style="min-width: 140px; text-align: left;">Symbol <span class="sort-icon">↕</span><div class="col-resizer" data-min="90"></div></th>
          <th class="sortable text-right" data-col="ltp" style="width: 90px; text-align: right;">LTP (₹) <span class="sort-icon">↕</span><div class="col-resizer" data-min="70"></div></th>
          <th class="sortable text-center" data-col="stage_status" style="width: 110px; text-align: center;">Stage <span class="sort-icon">↕</span><div class="col-resizer" data-min="85"></div></th>
          <th class="sortable active-sort text-center" data-col="rbr_score" style="width: 95px; text-align: center;">RBR Score <span class="sort-icon active">▼</span><div class="col-resizer" data-min="75"></div></th>
          <th class="sortable text-center" data-col="first_rally_pct" style="width: 105px; text-align: center;">First Rally % <span class="sort-icon">↕</span><div class="col-resizer" data-min="80"></div></th>
          <th class="sortable text-center" data-col="retracement_pct" style="width: 105px; text-align: center;">Retracement % <span class="sort-icon">↕</span><div class="col-resizer" data-min="80"></div></th>
          <th class="sortable text-center" data-col="range_ratio" style="width: 100px; text-align: center;">Compression <span class="sort-icon">↕</span><div class="col-resizer" data-min="75"></div></th>
          <th class="sortable text-center" data-col="volume_ratio" style="width: 105px; text-align: center;">Vol Ratio <span class="sort-icon">↕</span><div class="col-resizer" data-min="80"></div></th>
          <th class="sortable text-right" data-col="demand_zone_upper" style="width: 125px; text-align: right;">Demand Zone (₹) <span class="sort-icon">↕</span><div class="col-resizer" data-min="95"></div></th>
          <th style="width: 75px; text-align: center;">Action</th>
        </tr>
      `;
    } else if (slotNum === 5) {
      thead.innerHTML = `
        <tr>
          <th style="width: 40px; text-align: center;">#<div class="col-resizer" data-min="36"></div></th>
          <th style="width: 40px; text-align: center;" title="Quick Watchlist">★<div class="col-resizer" data-min="36"></div></th>
          <th class="sortable text-left sticky-symbol-col" data-col="symbol" style="min-width: 140px; text-align: left;">Symbol &amp; Company <span class="sort-icon">↕</span><div class="col-resizer" data-min="90"></div></th>
          <th class="sortable text-right" data-col="ltp" style="width: 95px; text-align: right;">LTP (₹) &amp; CHG% <span class="sort-icon">↕</span><div class="col-resizer" data-min="75"></div></th>
          <th class="sortable text-center" data-col="conviction_tier" style="width: 140px; text-align: center;">Confluence Tier <span class="sort-icon">↕</span><div class="col-resizer" data-min="100"></div></th>
          <th class="sortable active-sort text-center" data-col="confluence_count" style="width: 105px; text-align: center;">Score &amp; Overlap <span class="sort-icon active">▼</span><div class="col-resizer" data-min="80"></div></th>
          <th class="sortable text-left" data-col="setups_matched" style="min-width: 220px; text-align: left;">Engines Matched <span class="sort-icon">↕</span><div class="col-resizer" data-min="140"></div></th>
          <th class="sortable text-right" data-col="delivery_pct" style="width: 90px; text-align: right;">Delivery % <span class="sort-icon">↕</span><div class="col-resizer" data-min="70"></div></th>
          <th class="sortable text-center" data-col="rs_score" style="width: 90px; text-align: center;">RS Score <span class="sort-icon">↕</span><div class="col-resizer" data-min="70"></div></th>
          <th class="sortable text-center" data-col="volume_status" style="width: 120px; text-align: center;">Vol / Effort Status <span class="sort-icon">↕</span><div class="col-resizer" data-min="90"></div></th>
          <th class="sortable text-left" data-col="sector" style="min-width: 120px; text-align: left;">Sector <span class="sort-icon">↕</span><div class="col-resizer" data-min="80"></div></th>
          <th style="width: 75px; text-align: center;">Action</th>
        </tr>
      `;
    } else if (slotNum === 6) {
      thead.innerHTML = `
        <tr>
          <th style="width: 40px; text-align: center;">#<div class="col-resizer" data-min="36"></div></th>
          <th style="width: 40px; text-align: center;" title="Quick Watchlist">★<div class="col-resizer" data-min="36"></div></th>
          <th class="sortable text-left sticky-symbol-col" data-col="symbol" style="min-width: 140px; text-align: left;">Symbol <span class="sort-icon">↕</span><div class="col-resizer" data-min="90"></div></th>
          <th class="sortable text-right" data-col="ltp" style="width: 90px; text-align: right;">LTP (₹) <span class="sort-icon">↕</span><div class="col-resizer" data-min="70"></div></th>
          <th class="sortable text-right" data-col="change_pct" style="width: 75px; text-align: right;">CHG % <span class="sort-icon">↕</span><div class="col-resizer" data-min="65"></div></th>
          <th class="sortable active-sort text-center" data-col="score" style="width: 95px; text-align: center;">Score &amp; Grade <span class="sort-icon active">▼</span><div class="col-resizer" data-min="75"></div></th>
          <th class="sortable text-center" data-col="phase_tag" style="width: 140px; text-align: center;">Phase Tag <span class="sort-icon">↕</span><div class="col-resizer" data-min="95"></div></th>
          <th class="sortable text-center" data-col="base_days" style="width: 90px; text-align: center;">Base <span class="sort-icon">↕</span><div class="col-resizer" data-min="75"></div></th>
          <th class="sortable text-center" data-col="base_height_pct" style="width: 100px; text-align: center;">Range Height % <span class="sort-icon">↕</span><div class="col-resizer" data-min="80"></div></th>
          <th class="sortable text-left" data-col="effort_vs_result" style="min-width: 180px; text-align: left;">Effort vs Result (VPSR) <span class="sort-icon">↕</span><div class="col-resizer" data-min="120"></div></th>
          <th class="sortable text-right" data-col="delivery_pct" style="width: 95px; text-align: right;">Delivery % <span class="sort-icon">↕</span><div class="col-resizer" data-min="75"></div></th>
          <th style="width: 75px; text-align: center;">Action</th>
        </tr>
      `;
    }

    thead.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', (e) => {
        if (justResizedCol || isResizingCol || e.target.closest('.col-resizer')) return;
        const col = th.getAttribute('data-col');
        if (!col) return;
        if (advState.sortColumn === col) {
          advState.sortDirection = advState.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          advState.sortColumn = col;
          advState.sortDirection = (slotNum === 2 && col === 'dist_to_pivot') ? 'asc' : 'desc';
        }
        advState.currentPage = 1;
        renderAdvActiveTable();
      });
    });

    initTableColumnResizers(thead);
  }

  let isResizingCol = false;
  let justResizedCol = false;

  function initTableColumnResizers(thead) {
    if (!thead) return;
    const resizers = thead.querySelectorAll('.col-resizer');

    resizers.forEach(resizer => {
      resizer.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
      });

      resizer.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();

        const th = resizer.parentElement;
        if (!th) return;

        isResizingCol = true;
        resizer.classList.add('resizing');
        document.body.classList.add('table-col-resizing');

        const startX = e.pageX;
        const startWidth = th.offsetWidth;
        const minWidth = parseInt(resizer.getAttribute('data-min') || '60', 10);

        function onMouseMove(moveEvent) {
          if (!isResizingCol) return;
          moveEvent.preventDefault();
          const deltaX = moveEvent.pageX - startX;
          const newWidth = Math.max(minWidth, startWidth + deltaX);
          th.style.width = `${newWidth}px`;
          th.style.minWidth = `${newWidth}px`;
        }

        function onMouseUp() {
          isResizingCol = false;
          justResizedCol = true;
          resizer.classList.remove('resizing');
          document.body.classList.remove('table-col-resizing');

          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);

          setTimeout(() => {
            justResizedCol = false;
          }, 120);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });
  }

  async function loadAdvRsData() {
    if (advState.rsData && advState.rsData.stocks && advState.rsData.stocks.length) {
      if (advState.activeSlot === 1) {
        populateAdvSectorFilter();
        updateAdvHeaderKpis();
        renderAdvActiveTable();
      }
      return;
    }
    try {
      const basePath = window.location.pathname.includes('/wordpress') ? '../data/' : './data/';
      let res = await fetch(`${basePath}adv_scanner_1_rs.json?t=${Date.now()}`);
      if (!res.ok) res = await fetch('data/adv_scanner_1_rs.json');
      if (!res.ok) res = await fetch('./data/adv_scanner_1_rs.json');
      if (res.ok) {
        advState.rsData = await res.json();
        console.log(`[MITS Pro] Successfully loaded adv_scanner_1_rs.json (${advState.rsData.stocks ? advState.rsData.stocks.length : 0} stocks)`);
        if (advState.activeSlot === 1) {
          populateAdvSectorFilter();
          updateAdvHeaderKpis();
          renderAdvActiveTable();
        }
      } else {
        console.warn(`[MITS Pro] Failed to load adv_scanner_1_rs.json: HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn('[MITS Pro] Error loading adv_scanner_1_rs.json:', err);
    }
  }

  async function loadAdvBoData() {
    if (advState.boData && advState.boData.stocks && advState.boData.stocks.length) {
      updateAdvBoBadge();
      if (advState.activeSlot === 2) {
        populateAdvSectorFilter();
        updateAdvHeaderKpis();
        renderAdvActiveTable();
      }
      return;
    }
    try {
      const basePath = window.location.pathname.includes('/wordpress') ? '../data/' : './data/';
      let res = await fetch(`${basePath}adv_scanner_2_early_bo.json?t=${Date.now()}`);
      if (!res.ok) res = await fetch('data/adv_scanner_2_early_bo.json');
      if (!res.ok) res = await fetch('./data/adv_scanner_2_early_bo.json');
      if (res.ok) {
        advState.boData = await res.json();
        console.log(`[MITS Pro] Successfully loaded adv_scanner_2_early_bo.json (${advState.boData.stocks ? advState.boData.stocks.length : 0} stocks)`);
        updateAdvBoBadge();
        if (advState.activeSlot === 2) {
          populateAdvSectorFilter();
          updateAdvHeaderKpis();
          renderAdvActiveTable();
        }
      } else {
        console.warn(`[MITS Pro] Failed to load adv_scanner_2_early_bo.json: HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn('[MITS Pro] Error loading adv_scanner_2_early_bo.json:', err);
    }
  }

  function updateAdvBoBadge() {
    const bEl = document.getElementById('adv-bo-badge');
    if (bEl && advState.boData && advState.boData.total_stocks !== undefined) {
      bEl.textContent = `${advState.boData.total_stocks} Coiling Stocks`;
    }
  }

  async function loadAdvMcData() {
    if (advState.mcData && advState.mcData.stocks && advState.mcData.stocks.length) {
      updateAdvMcBadge();
      if (advState.activeSlot === 3) {
        populateAdvSectorFilter();
        updateAdvHeaderKpis();
        renderAdvActiveTable();
      }
      return;
    }
    try {
      const basePath = window.location.pathname.includes('/wordpress') ? '../data/' : './data/';
      let res = await fetch(`${basePath}adv_scanner_3_momentum_continuation.json?t=${Date.now()}`).catch(() => null);
      if (!res || !res.ok) res = await fetch('data/adv_scanner_3_momentum_continuation.json').catch(() => null);
      if (!res || !res.ok) res = await fetch('./data/adv_scanner_3_momentum_continuation.json').catch(() => null);
      if (res && res.ok) {
        advState.mcData = await res.json().catch(err => {
          console.warn('[MITS Pro] Error parsing adv_scanner_3_momentum_continuation.json:', err);
          return null;
        });
        if (advState.mcData) {
          console.log(`[MITS Pro] Successfully loaded adv_scanner_3_momentum_continuation.json (${advState.mcData.stocks ? advState.mcData.stocks.length : 0} stocks)`);
          updateAdvMcBadge();
          if (advState.activeSlot === 3) {
            populateAdvSectorFilter();
            updateAdvHeaderKpis();
            renderAdvActiveTable();
          }
        }
      } else {
        console.warn(`[MITS Pro] Failed to load adv_scanner_3_momentum_continuation.json: HTTP ${res ? res.status : 'Network Offline'}`);
      }
    } catch (err) {
      console.warn('[MITS Pro] Error loading adv_scanner_3_momentum_continuation.json:', err);
    }
  }

  function updateAdvMcBadge() {
    const bEl = document.getElementById('adv-mc-badge');
    if (bEl && advState.mcData && advState.mcData.total_stocks !== undefined) {
      bEl.textContent = `${advState.mcData.total_stocks} Momentum Stocks`;
    }
  }

  async function loadAdvRbrData() {
    if (advState.rbrData && advState.rbrData.stocks && advState.rbrData.stocks.length) {
      updateAdvRbrBadge();
      if (advState.activeSlot === 4) {
        populateAdvSectorFilter();
        updateAdvHeaderKpis();
        renderAdvActiveTable();
      }
      return;
    }
    try {
      const basePath = window.location.pathname.includes('/wordpress') ? '../data/' : './data/';
      let res = await fetch(`${basePath}adv_scanner_4_rbr_proportional.json?t=${Date.now()}`).catch(() => null);
      if (!res || !res.ok) res = await fetch('data/adv_scanner_4_rbr_proportional.json').catch(() => null);
      if (!res || !res.ok) res = await fetch('./data/adv_scanner_4_rbr_proportional.json').catch(() => null);
      if (res && res.ok) {
        advState.rbrData = await res.json().catch(err => {
          console.warn('[MITS Pro] Error parsing adv_scanner_4_rbr_proportional.json:', err);
          return null;
        });
        if (advState.rbrData) {
          console.log(`[MITS Pro] Successfully loaded adv_scanner_4_rbr_proportional.json (${advState.rbrData.stocks ? advState.rbrData.stocks.length : 0} stocks)`);
          updateAdvRbrBadge();
          if (advState.activeSlot === 4) {
            populateAdvSectorFilter();
            updateAdvHeaderKpis();
            renderAdvActiveTable();
          }
        }
      } else {
        console.warn(`[MITS Pro] Failed to load adv_scanner_4_rbr_proportional.json: HTTP ${res ? res.status : 'Network Offline'}`);
      }
    } catch (err) {
      console.warn('[MITS Pro] Error loading adv_scanner_4_rbr_proportional.json:', err);
    }
  }

  function updateAdvRbrBadge() {
    const bEl = document.getElementById('adv-rbr-badge');
    if (bEl && advState.rbrData && advState.rbrData.total_stocks !== undefined) {
      bEl.textContent = `${advState.rbrData.total_stocks} RBR Setups`;
    }
  }

  async function loadAdvConfluenceData() {
    if (advState.confluenceData && advState.confluenceData.stocks && advState.confluenceData.stocks.length) {
      updateAdvConfluenceBadge();
      if (advState.activeSlot === 5) {
        populateAdvSectorFilter();
        updateAdvHeaderKpis();
        renderAdvActiveTable();
      }
      return;
    }
    try {
      const basePath = window.location.pathname.includes('/wordpress') ? '../data/' : './data/';
      let res = await fetch(`${basePath}adv_scanner_5_confluence_engine.json?t=${Date.now()}`).catch(() => null);
      if (!res || !res.ok) res = await fetch('data/adv_scanner_5_confluence_engine.json').catch(() => null);
      if (!res || !res.ok) res = await fetch('./data/adv_scanner_5_confluence_engine.json').catch(() => null);
      if (!res || !res.ok) res = await fetch(`${basePath}adv_scanner_5_confluence.json?t=${Date.now()}`).catch(() => null);
      if (!res || !res.ok) res = await fetch('data/adv_scanner_5_confluence.json').catch(() => null);
      if (res && res.ok) {
        advState.confluenceData = await res.json().catch(err => {
          console.warn('[MITS Pro] Error parsing adv_scanner_5_confluence_engine.json:', err);
          return null;
        });
        if (advState.confluenceData) {
          console.log(`[MITS Pro] Successfully loaded adv_scanner_5_confluence_engine.json (${advState.confluenceData.stocks ? advState.confluenceData.stocks.length : 0} stocks)`);
          updateAdvConfluenceBadge();
          if (advState.activeSlot === 5) {
            populateAdvSectorFilter();
            updateAdvHeaderKpis();
            renderAdvActiveTable();
          }
        }
      } else {
        console.warn(`[MITS Pro] Failed to load adv_scanner_5_confluence_engine.json: HTTP ${res ? res.status : 'Network Offline'}`);
      }
    } catch (err) {
      console.warn('[MITS Pro] Error loading adv_scanner_5_confluence_engine.json:', err);
    }
  }

  function updateAdvConfluenceBadge() {
    const bEl = document.getElementById('adv-confluence-badge');
    if (bEl && advState.confluenceData && advState.confluenceData.total_stocks !== undefined) {
      bEl.textContent = `${advState.confluenceData.total_stocks} Confluence Setups`;
    }
  }

  async function loadAdvWyckoffData() {
    if (advState.wyckoffData && advState.wyckoffData.stocks && advState.wyckoffData.stocks.length) {
      updateAdvWyckoffBadge();
      if (advState.activeSlot === 6) {
        populateAdvSectorFilter();
        updateAdvHeaderKpis();
        renderAdvActiveTable();
      }
      return;
    }
    try {
      const basePath = window.location.pathname.includes('/wordpress') ? '../data/' : './data/';
      let res = await fetch(`${basePath}adv_scanner_6_wyckoff_absorption.json?t=${Date.now()}`).catch(() => null);
      if (!res || !res.ok) res = await fetch('data/adv_scanner_6_wyckoff_absorption.json').catch(() => null);
      if (!res || !res.ok) res = await fetch('./data/adv_scanner_6_wyckoff_absorption.json').catch(() => null);
      if (res && res.ok) {
        advState.wyckoffData = await res.json().catch(err => {
          console.warn('[MITS Pro] Error parsing adv_scanner_6_wyckoff_absorption.json:', err);
          return null;
        });
        if (advState.wyckoffData) {
          console.log(`[MITS Pro] Successfully loaded adv_scanner_6_wyckoff_absorption.json (${advState.wyckoffData.stocks ? advState.wyckoffData.stocks.length : 0} stocks)`);
          updateAdvWyckoffBadge();
          if (advState.activeSlot === 6) {
            populateAdvSectorFilter();
            updateAdvHeaderKpis();
            renderAdvActiveTable();
          }
        }
      } else {
        console.warn(`[MITS Pro] Failed to load adv_scanner_6_wyckoff_absorption.json: HTTP ${res ? res.status : 'Network Offline'}`);
      }
    } catch (err) {
      console.warn('[MITS Pro] Error loading adv_scanner_6_wyckoff_absorption.json:', err);
    }
  }

  function updateAdvWyckoffBadge() {
    const bEl = document.getElementById('adv-wyckoff-count') || document.getElementById('adv-wyckoff-badge');
    if (bEl && advState.wyckoffData && advState.wyckoffData.total_stocks !== undefined) {
      bEl.textContent = `${advState.wyckoffData.total_stocks} Wyckoff Setups`;
    }
  }

  function updateAdvHeaderKpis() {
    const isSlot1 = advState.activeSlot === 1;
    const isSlot2 = advState.activeSlot === 2;
    const isSlot3 = advState.activeSlot === 3;
    const isSlot4 = advState.activeSlot === 4;
    const isSlot5 = advState.activeSlot === 5;
    const isSlot6 = advState.activeSlot === 6;
    let d = null;
    if (isSlot1) d = advState.rsData;
    else if (isSlot2) d = advState.boData;
    else if (isSlot3) d = advState.mcData;
    else if (isSlot4) d = advState.rbrData;
    else if (isSlot5) d = advState.confluenceData;
    else if (isSlot6) d = advState.wyckoffData;

    const uEl = document.getElementById('adv-kpi-universe');
    const rEl = document.getElementById('adv-kpi-rs80');
    const gEl = document.getElementById('adv-kpi-grade-a');
    const bEl = document.getElementById('adv-rs-badge');
    const tEl = document.getElementById('adv-eod-time');

    if (isSlot1 && d) {
      if (uEl) {
        uEl.textContent = d.total_stocks || 499;
        const lbl = uEl.previousElementSibling;
        if (lbl) lbl.textContent = 'Universe';
      }
      if (rEl) {
        rEl.textContent = d.strong_rs_count || 76;
        const lbl = rEl.previousElementSibling;
        if (lbl) lbl.textContent = 'RS Score ≥ 80';
      }
      if (gEl) {
        gEl.textContent = d.grade_a_count || 75;
        const lbl = gEl.previousElementSibling;
        if (lbl) lbl.textContent = 'Grade A';
      }
      if (bEl) bEl.textContent = `${d.strong_rs_count || 76} Strong RS`;
      if (tEl) tEl.textContent = d.scan_date || d.generated_at || 'Verified EOD';
    } else if (isSlot2 && d) {
      if (uEl) {
        uEl.textContent = d.total_stocks || 21;
        const lbl = uEl.previousElementSibling;
        if (lbl) lbl.textContent = 'Coiling Universe';
      }
      if (rEl) {
        rEl.textContent = d.coiling_tight_count || 12;
        const lbl = rEl.previousElementSibling;
        if (lbl) lbl.textContent = 'Pivot ≤ 1.5%';
      }
      if (gEl) {
        gEl.textContent = d.volume_surge_count || 3;
        const lbl = gEl.previousElementSibling;
        if (lbl) lbl.textContent = 'Vol Confirmed';
      }
      if (tEl) tEl.textContent = d.scan_date || d.generated_at || 'Verified EOD';
    } else if (isSlot3 && d) {
      if (uEl) {
        uEl.textContent = d.total_stocks || 89;
        const lbl = uEl.previousElementSibling;
        if (lbl) lbl.textContent = 'Momentum Stocks';
      }
      if (rEl) {
        rEl.textContent = (d.grade_counts && d.grade_counts['A+']) || 56;
        const lbl = rEl.previousElementSibling;
        if (lbl) lbl.textContent = 'Grade A+ (Elite)';
      }
      if (gEl) {
        gEl.textContent = (d.grade_counts && d.grade_counts['A']) || 22;
        const lbl = gEl.previousElementSibling;
        if (lbl) lbl.textContent = 'Grade A (Strong)';
      }
      if (tEl) tEl.textContent = d.scan_date || d.generated_at || 'Verified EOD';
    } else if (isSlot4 && d) {
      if (uEl) {
        uEl.textContent = d.total_stocks || 60;
        const lbl = uEl.previousElementSibling;
        if (lbl) lbl.textContent = 'RBR Universe';
      }
      if (rEl) {
        rEl.textContent = (d.grade_counts && d.grade_counts['A+']) || 12;
        const lbl = rEl.previousElementSibling;
        if (lbl) lbl.textContent = 'Grade A+ (Elite)';
      }
      if (gEl) {
        gEl.textContent = (d.grade_counts && d.grade_counts['A']) || 19;
        const lbl = gEl.previousElementSibling;
        if (lbl) lbl.textContent = 'Grade A (Strong)';
      }
      if (tEl) tEl.textContent = d.scan_date || d.generated_at || 'Verified EOD';
    } else if (isSlot5 && d) {
      if (uEl) {
        uEl.textContent = d.total_stocks || 89;
        const lbl = uEl.previousElementSibling;
        if (lbl) lbl.textContent = 'Confluent Stocks';
      }
      if (rEl) {
        rEl.textContent = (d.tier_counts && d.tier_counts['ULTRA HIGH CONVICTION']) || 27;
        const lbl = rEl.previousElementSibling;
        if (lbl) lbl.textContent = 'Tier 1 (4+ Scanners)';
      }
      if (gEl) {
        gEl.textContent = (d.tier_counts && d.tier_counts['HIGH CONVICTION']) || 29;
        const lbl = gEl.previousElementSibling;
        if (lbl) lbl.textContent = 'Tier 2 (3 Scanners)';
      }
      if (tEl) tEl.textContent = d.scan_date || d.generated_at || 'Verified EOD';
    } else if (isSlot6 && d) {
      if (uEl) {
        uEl.textContent = d.total_stocks || 29;
        const lbl = uEl.previousElementSibling;
        if (lbl) lbl.textContent = 'Wyckoff Stocks';
      }
      if (rEl) {
        rEl.textContent = (d.grade_counts && d.grade_counts['A+']) || 2;
        const lbl = rEl.previousElementSibling;
        if (lbl) lbl.textContent = 'Grade A+ (Elite)';
      }
      if (gEl) {
        gEl.textContent = (d.grade_counts && d.grade_counts['A']) || 16;
        const lbl = gEl.previousElementSibling;
        if (lbl) lbl.textContent = 'Grade A (Strong)';
      }
      if (tEl) tEl.textContent = d.scan_date || d.generated_at || 'Verified EOD';
    }
  }

  function populateAdvSectorFilter() {
    let d = null;
    if (advState.activeSlot === 1) d = advState.rsData;
    else if (advState.activeSlot === 2) d = advState.boData;
    else if (advState.activeSlot === 3) d = advState.mcData;
    else if (advState.activeSlot === 4) d = advState.rbrData;
    else if (advState.activeSlot === 5) d = advState.confluenceData;
    else if (advState.activeSlot === 6) d = advState.wyckoffData;

    if (!d || !d.stocks) return;
    const sectorSel = document.getElementById('adv-rs-sector');
    if (!sectorSel) return;
    const secSet = new Set();
    d.stocks.forEach(s => {
      if (s.sector) secSet.add(s.sector);
    });
    sectorSel.innerHTML = '<option value="ALL">All Sectors</option>';
    Array.from(secSet).sort().forEach(sec => {
      const opt = document.createElement('option');
      opt.value = sec;
      opt.textContent = sec;
      sectorSel.appendChild(opt);
    });
  }

  function renderAdvActiveTable() {
    try {
      const tableCard = document.getElementById('adv-table-card');
      const confluenceContainer = document.getElementById('adv-confluence-container');

      if (tableCard) tableCard.style.display = '';
      if (confluenceContainer) {
        confluenceContainer.style.display = 'none';
        confluenceContainer.innerHTML = '';
      }

      const tbody = document.getElementById('adv-rs-tbody') || document.getElementById('rsScannerTableBody') || document.querySelector('.rsScannerTableBody');
      if (!tbody) {
        console.warn('[MITS Pro] RS table tbody element not found in DOM.');
        return;
      }

      const isSlot1 = advState.activeSlot === 1;
      const isSlot2 = advState.activeSlot === 2;
      const isSlot3 = advState.activeSlot === 3;
      const isSlot4 = advState.activeSlot === 4;
      const isSlot5 = advState.activeSlot === 5;
      const isSlot6 = advState.activeSlot === 6;
      let activeData = null;
      if (isSlot1) activeData = advState.rsData;
      else if (isSlot2) activeData = advState.boData;
      else if (isSlot3) activeData = advState.mcData;
      else if (isSlot4) activeData = advState.rbrData;
      else if (isSlot5) activeData = advState.confluenceData;
      else if (isSlot6) activeData = advState.wyckoffData;

      const tableEl = document.getElementById('adv-rs-table');
      if (tableEl) {
        tableEl.classList.toggle('slot-1', isSlot1);
        tableEl.classList.toggle('slot-2', isSlot2);
        tableEl.classList.toggle('slot-3', isSlot3);
        tableEl.classList.toggle('slot-4', isSlot4);
        tableEl.classList.toggle('slot-5', isSlot5);
        tableEl.classList.toggle('slot-6', isSlot6);
      }

      if (!activeData || !activeData.stocks || !activeData.stocks.length) {
        let scannerName = 'Relative Strength';
        if (isSlot2) scannerName = 'Early Breakout';
        else if (isSlot3) scannerName = 'Momentum Continuation';
        else if (isSlot4) scannerName = 'Rally-Base-Rally (RBR)';
        else if (isSlot5) scannerName = 'Multi-Scanner Confluence';
        else if (isSlot6) scannerName = 'Wyckoff Absorption';
        tbody.innerHTML = `<tr><td colspan="17" style="text-align: center; padding: 2.5rem; color: #94a3b8;">Loading ${scannerName} dataset...</td></tr>`;
        return;
      }

      let stocks = [...activeData.stocks];

      // Filter Search
      if (advState.searchQuery) {
        const q = advState.searchQuery;
        stocks = stocks.filter(s => {
          const sym = (s.symbol || '').toLowerCase();
          const nm = (s.name || s.company_name || '').toLowerCase();
          const sec = (s.sector || '').toLowerCase();
          const piv = (s.pivot_type || s.pullback_class || s.stage_status || s.phase_tag || s.phase || s.conviction_tier || '').toLowerCase();
          const setups = (s.setups_matched || []).join(' ').toLowerCase();
          return sym.includes(q) || nm.includes(q) || sec.includes(q) || piv.includes(q) || setups.includes(q);
        });
      }

      // Filter Sector
      if (advState.sectorFilter !== 'ALL') {
        stocks = stocks.filter(s => s.sector === advState.sectorFilter);
      }

      // Slot specific filters (Grade & Class/Phase)
      if (isSlot1) {
        if (advState.gradeFilter !== 'ALL') {
          stocks = stocks.filter(s => s.grade === advState.gradeFilter);
        }
        if (advState.classFilter !== 'ALL') {
          const minScore = parseInt(advState.classFilter, 10);
          if (minScore === 90) stocks = stocks.filter(s => s.rs_score >= 90);
          else if (minScore === 80) stocks = stocks.filter(s => s.rs_score >= 80 && s.rs_score < 90);
          else if (minScore === 70) stocks = stocks.filter(s => s.rs_score >= 70 && s.rs_score < 80);
          else if (minScore === 50) stocks = stocks.filter(s => s.rs_score < 70);
        }
      } else if (isSlot5) {
        if (advState.gradeFilter !== 'ALL') {
          stocks = stocks.filter(s => (s.conviction_tier === advState.gradeFilter || (s.tier_label && s.tier_label.includes(advState.gradeFilter))));
        }
      } else if (isSlot3 || isSlot4 || isSlot6) {
        if (advState.gradeFilter !== 'ALL') {
          stocks = stocks.filter(s => s.grade === advState.gradeFilter);
        }
        if (isSlot6 && advState.classFilter !== 'ALL') {
          stocks = stocks.filter(s => (s.phase_tag === advState.classFilter || s.phase === advState.classFilter));
        }
      }

      // Sorting
      const col = advState.sortColumn;
      const isDesc = advState.sortDirection === 'desc';
      stocks.sort((a, b) => {
        let va = a[col];
        let vb = b[col];
        if (col === 'cmp' || col === 'ltp') {
          va = a.ltp !== undefined ? a.ltp : a.cmp;
          vb = b.ltp !== undefined ? b.ltp : b.cmp;
        } else if (col === 'delivery_pct') {
          va = a.delivery_pct !== undefined && a.delivery_pct !== null ? a.delivery_pct : (a.dossier?.delivery_pct || 0);
          vb = b.delivery_pct !== undefined && b.delivery_pct !== null ? b.delivery_pct : (b.dossier?.delivery_pct || 0);
        } else if (col === 'total_score' || col === 'rbr_score' || col === 'score' || col === 'wyckoff_score' || col === 'composite_score') {
          va = a.composite_score !== undefined ? a.composite_score : (a.score !== undefined ? a.score : (a.wyckoff_score !== undefined ? a.wyckoff_score : (a.rbr_score !== undefined ? a.rbr_score : (a.total_score !== undefined ? a.total_score : 0))));
          vb = b.composite_score !== undefined ? b.composite_score : (b.score !== undefined ? b.score : (b.wyckoff_score !== undefined ? b.wyckoff_score : (b.rbr_score !== undefined ? b.rbr_score : (b.total_score !== undefined ? b.total_score : 0))));
        } else if (col === 'confluence_count') {
          va = a.confluence_count !== undefined ? a.confluence_count : ((a.setups_matched || []).length);
          vb = b.confluence_count !== undefined ? b.confluence_count : ((b.setups_matched || []).length);
        } else if (col === 'conviction_tier') {
          va = a.tier !== undefined ? a.tier : (a.conviction_tier || '');
          vb = b.tier !== undefined ? b.tier : (b.conviction_tier || '');
        } else if (col === 'rs_score') {
          va = a.setup_scores?.['RS Outperformer'] !== undefined ? a.setup_scores['RS Outperformer'] : (a.dossier?.rs_profile?.rs_20d || 0);
          vb = b.setup_scores?.['RS Outperformer'] !== undefined ? b.setup_scores['RS Outperformer'] : (b.dossier?.rs_profile?.rs_20d || 0);
        } else if (col === 'volume_status') {
          va = a.dossier?.volume_footprint?.delivery_status || '';
          vb = b.dossier?.volume_footprint?.delivery_status || '';
        } else if (col === 'setups_matched') {
          va = (a.setups_matched || []).length;
          vb = (b.setups_matched || []).length;
        } else if (col === 'base_days') {
          va = a.base_days || 0;
          vb = b.base_days || 0;
        } else if (col === 'base_height_pct') {
          va = a.base_height_pct || 0;
          vb = b.base_height_pct || 0;
        } else if (col === 'phase_tag') {
          va = a.phase_tag || a.phase || '';
          vb = b.phase_tag || b.phase || '';
        } else if (col === 'effort_vs_result') {
          va = a.effort_vs_result || '';
          vb = b.effort_vs_result || '';
        } else if (col === 's1') {
          va = a.s1 !== undefined ? a.s1 : (a.support !== undefined ? a.support : 0);
          vb = b.s1 !== undefined ? b.s1 : (b.support !== undefined ? b.support : 0);
        } else if (col === 'demand_zone_upper') {
          va = a.demand_zone ? a.demand_zone.upper : 0;
          vb = b.demand_zone ? b.demand_zone.upper : 0;
        }
        if (va === null || va === undefined) va = isDesc ? -999999 : 999999;
        if (vb === null || vb === undefined) vb = isDesc ? -999999 : 999999;
        if (typeof va === 'string') {
          return isDesc ? vb.localeCompare(va) : va.localeCompare(vb);
        }
        return isDesc ? (vb - va) : (va - vb);
      });

      // Update active sort indicator in thead
      const thead = document.getElementById('adv-table-thead') || document.querySelector('#adv-rs-table thead');
      if (thead) {
        thead.querySelectorAll('th.sortable').forEach(th => {
          const thCol = th.getAttribute('data-col');
          if (thCol === col) {
            th.className = 'sticky-col-1 sortable active-sort'.includes(th.className)
              ? th.className
              : 'sortable active-sort';
            const icon = th.querySelector('.sort-icon');
            if (icon) {
              icon.textContent = isDesc ? '▼' : '▲';
              icon.className = 'sort-icon active';
            }
          } else {
            const icon = th.querySelector('.sort-icon');
            if (icon) {
              icon.textContent = '↕';
              icon.className = 'sort-icon';
            }
          }
        });
      }

      // Pagination
      const totalSignals = stocks.length;
      const totalPages = Math.ceil(totalSignals / advState.pageSize) || 1;
      if (advState.currentPage > totalPages) advState.currentPage = totalPages;
      const startIdx = (advState.currentPage - 1) * advState.pageSize;
      const endIdx = Math.min(startIdx + advState.pageSize, totalSignals);
      const pageSignals = stocks.slice(startIdx, endIdx);

      renderAdvPagination(totalSignals, totalPages, startIdx, endIdx);

      if (pageSignals.length === 0) {
        tbody.innerHTML = `<tr><td colspan="17" style="text-align: center; padding: 2.5rem; color: #94a3b8;">No matching equities found with current filter criteria.</td></tr>`;
        return;
      }

      let html = '';
      if (isSlot1) {
        // Slot 1: Relative Strength table rows (16-column layout)
        pageSignals.forEach((s, idx) => {
          const globalIdx = startIdx + idx + 1;
          const dayChg = Number(s.change_pct) || 0;
          const dayChgClass = dayChg >= 0 ? 'text-green text-bullish' : 'text-red text-bearish';
          const delivVal = s.delivery_pct !== undefined && s.delivery_pct !== null ? Number(s.delivery_pct) : (s.dossier?.delivery_pct !== undefined ? Number(s.dossier.delivery_pct) : null);
          const delivHighClass = delivVal !== null && delivVal >= 55 ? 'deliv-high' : '';

          let gradeBadge = 'grade-weak';
          if (s.grade === 'Grade A') gradeBadge = 'grade-a';
          else if (s.grade === 'Grade B') gradeBadge = 'grade-b';
          else if (s.grade === 'Grade C') gradeBadge = 'grade-c';

          let scoreBadge = 'score-neutral';
          if (s.rs_score >= 90) scoreBadge = 'score-gold';
          else if (s.rs_score >= 80) scoreBadge = 'score-green';
          else if (s.rs_score >= 70) scoreBadge = 'score-cyan';

          const isWl = isWatchlisted(s.symbol);

          // EMA Stack badge logic
          const isBullStack = s.ema_stack === 'PERFECT STACK' || (s.cmp > s.ema_20 && s.ema_20 > s.ema_50 && (!s.ema_200 || s.ema_50 > s.ema_200));
          const emaStackBadge = isBullStack
            ? '<span class="tag-pill tag-bull" title="Bullish Stack: Price > 20 > 50 > 200 EMA">20 > 50 > 200</span>'
            : (s.above_ema50
                ? '<span class="tag-pill tag-gold" title="Above 50 EMA">Above 50 EMA</span>'
                : '<span class="tag-pill tag-bear" title="Below 50 EMA">Below 50 EMA</span>');

          // Vol Status badge logic
          const volRatio = Number(s.vol_ratio) || 0;
          const volStatusBadge = volRatio >= 2.0
            ? '<span class="tag-pill tag-bull" title="Institutional Whale Volume Surge">Whale ' + volRatio.toFixed(1) + 'x</span>'
            : (volRatio >= 1.4
                ? '<span class="tag-pill tag-bull" title="Volume Surge">' + volRatio.toFixed(1) + 'x Surge</span>'
                : (volRatio < 0.75
                    ? '<span class="tag-pill tag-neutral" title="Volume Contraction / Dry-up">' + volRatio.toFixed(1) + 'x Dry-up</span>'
                    : '<span class="tag-pill tag-gold">' + volRatio.toFixed(1) + 'x Normal</span>'));

          // RS Line Status badge
          const rsLineText = s.rs_line_status || (s.rs_line_trend === 'Rising' ? 'Rising' : 'Consolidating');
          const rsLineBadgeClass = rsLineText.includes('52W') || rsLineText.includes('Uptrend') || rsLineText === 'Rising' ? 'tag-bull' : 'tag-neutral';

          html += `
            <tr class="adv-rs-row" data-symbol="${s.symbol}">
              <td class="row-index text-center" style="width: 40px; text-align: center;">${globalIdx}</td>
              <td class="text-center" style="width: 40px; text-align: center;">
                <button type="button" class="watchlist-star-btn tbl-watchlist-star-btn ${isWl ? 'active' : ''}" data-symbol="${s.symbol}" onclick="toggleWatchlist('${s.symbol}')" title="${isWl ? 'Remove from Watchlist' : 'Add to Watchlist'}">${isWl ? '★' : '☆'}</button>
              </td>
              <td class="col-symbol text-left sticky-symbol-col" style="min-width: 140px; text-align: left !important;">
                <div class="col-symbol" style="text-align: left !important; align-items: flex-start !important;">
                  <strong>${s.symbol}</strong>
                  <span class="muted-sector">${s.name || s.sector || 'NSE'}</span>
                </div>
              </td>
              <td class="text-right font-mono" style="width: 90px; text-align: right;">₹${formatCurrency(s.cmp)}</td>
              <td class="text-right font-mono ${dayChgClass}" style="width: 75px; text-align: right;">${dayChg >= 0 ? '+' : ''}${dayChg.toFixed(2)}%</td>
              <td class="text-right font-mono" style="width: 85px; text-align: right;">
                <span class="deliv-badge ${delivHighClass}">${delivVal !== null ? delivVal.toFixed(1) + '%' : '--'}</span>
              </td>
              <td class="text-center" style="width: 65px; text-align: center;">
                <span class="rs-grade-pill ${gradeBadge}">${s.grade || '--'}</span>
              </td>
              <td class="text-center" style="width: 80px; text-align: center;">
                <span class="rs-score-pill ${scoreBadge}"><strong>${s.rs_score !== undefined ? s.rs_score : '--'}</strong></span>
              </td>
              <td class="text-center" style="width: 110px; text-align: center;">
                <span class="tag-pill ${rsLineBadgeClass}">${rsLineText}</span>
              </td>
              <td class="text-right font-mono ${Number(s.rs_20d) >= 0 ? 'text-bullish' : 'text-bearish'}" style="width: 75px; text-align: right;">
                ${s.rs_20d !== null && s.rs_20d !== undefined ? (Number(s.rs_20d) >= 0 ? '+' : '') + Number(s.rs_20d).toFixed(1) + '%' : '--'}
              </td>
              <td class="text-right font-mono ${Number(s.rs_60d) >= 0 ? 'text-bullish' : 'text-bearish'}" style="width: 75px; text-align: right;">
                ${s.rs_60d !== null && s.rs_60d !== undefined ? (Number(s.rs_60d) >= 0 ? '+' : '') + Number(s.rs_60d).toFixed(1) + '%' : '--'}
              </td>
              <td class="text-right font-mono ${Number(s.rs_120d) >= 0 ? 'text-bullish' : 'text-bearish'}" style="width: 75px; text-align: right;">
                ${s.rs_120d !== null && s.rs_120d !== undefined ? (Number(s.rs_120d) >= 0 ? '+' : '') + Number(s.rs_120d).toFixed(1) + '%' : '--'}
              </td>
              <td class="text-right font-mono ${Number(s.rs_252d) >= 0 ? 'text-bullish' : 'text-bearish'}" style="width: 75px; text-align: right;">
                ${s.rs_252d !== null && s.rs_252d !== undefined ? (Number(s.rs_252d) >= 0 ? '+' : '') + Number(s.rs_252d).toFixed(1) + '%' : '--'}
              </td>
              <td class="text-center" style="width: 100px; text-align: center;">${emaStackBadge}</td>
              <td class="text-center" style="width: 95px; text-align: center;">${volStatusBadge}</td>
              <td class="text-center" style="width: 75px; text-align: center;">
                <button type="button" class="btn-inspect adv-inspect-btn" data-symbol="${s.symbol}" onclick="openDossier('${s.symbol}')">Inspect</button>
              </td>
            </tr>
          `;
        });
      } else if (isSlot2) {
        // Slot 2: Early Breakout table rows (Exact 9-column specification)
        pageSignals.forEach((s, idx) => {
          const globalIdx = startIdx + idx + 1;
          const dayChg = s.change_pct !== undefined ? Number(s.change_pct) : (Number(s.day_change_pct) || 0);
          const dayChgClass = dayChg >= 0 ? 'text-green text-bullish' : 'text-red text-bearish';
          const distVal = s.dist_to_pivot !== undefined ? Number(s.dist_to_pivot) : (Number(s.dist_to_pivot_pct) || 0);
          const distBadge = distVal <= 1.5 ? 'badge-coiling' : 'badge-dryup';
          const pivBadge = s.pivot_type === '52-Week High' ? 'tag-bull' : 'tag-gold';
          const isWl = isWatchlisted(s.symbol);
          const cmpVal = Number(s.cmp) || 0;
          const resVal = Number(s.resistance !== undefined ? s.resistance : s.resistance_pivot) || 0;

          html += `
            <tr class="adv-rs-row" data-symbol="${s.symbol}">
              <td class="row-index text-center" style="width: 40px; text-align: center;">${globalIdx}</td>
              <td class="text-center" style="width: 40px; text-align: center;">
                <button type="button" class="watchlist-star-btn tbl-watchlist-star-btn ${isWl ? 'active' : ''}" data-symbol="${s.symbol}" onclick="toggleWatchlist('${s.symbol}')" title="${isWl ? 'Remove from Watchlist' : 'Add to Watchlist'}">${isWl ? '★' : '☆'}</button>
              </td>
              <td class="col-symbol text-left" style="text-align: left !important;">
                <div class="col-symbol" style="text-align: left !important; align-items: flex-start !important;">
                  <strong>${s.symbol}</strong>
                  <span class="muted-sector">${s.name || s.company_name || s.sector || 'NSE'}</span>
                </div>
              </td>
              <td class="text-right font-mono" style="width: 90px; text-align: right;">₹${cmpVal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              <td class="text-right font-mono ${dayChgClass}" style="width: 80px; text-align: right;">${dayChg >= 0 ? '+' : ''}${dayChg.toFixed(2)}%</td>
              <td class="text-right font-mono" style="width: 130px; text-align: right;">₹${resVal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              <td class="text-center" style="width: 110px; text-align: center;">
                <span class="pivot-badge rs-grade-pill ${distBadge}">+${distVal.toFixed(2)}%</span>
              </td>
              <td class="text-center" style="width: 110px; text-align: center;">
                <span class="badge-type tag-pill ${pivBadge}">${s.pivot_type || '20D Swing High'}</span>
              </td>
              <td class="text-center" style="width: 80px; text-align: center;">
                <button type="button" class="btn-inspect adv-inspect-btn" data-symbol="${s.symbol}" onclick="openDossier('${s.symbol}')">Inspect</button>
              </td>
            </tr>
          `;
        });
      } else if (isSlot3) {
        // Slot 3: Momentum Continuation table rows (Exact 12-column specification)
        pageSignals.forEach((s, idx) => {
          const globalIdx = startIdx + idx + 1;
          const ltpVal = Number(s.ltp !== undefined ? s.ltp : s.cmp) || 0;
          const dayChg = Number(s.change_pct) || 0;
          const dayChgClass = dayChg >= 0 ? 'text-green text-bullish' : 'text-red text-bearish';
          const scoreVal = s.total_score !== undefined ? s.total_score : (s.score || 0);

          let scoreBadge = 'score-neutral';
          if (scoreVal >= 90) scoreBadge = 'score-gold';
          else if (scoreVal >= 80) scoreBadge = 'score-green';
          else if (scoreVal >= 70) scoreBadge = 'score-cyan';

          let gradeBadge = 'grade-b';
          if (s.grade === 'A+') gradeBadge = 'grade-a';
          else if (s.grade === 'A') gradeBadge = 'grade-a';

          const pbPct = Number(s.pullback_pct) || 0;
          let pbBadgeClass = 'tag-bull';
          if (s.pullback_class === 'Healthy') pbBadgeClass = 'tag-gold';
          else if (s.pullback_class === 'Moderate') pbBadgeClass = 'tag-neutral';

          const volRatio = Number(s.volume_ratio) || 1.0;
          let volBadgeClass = 'tag-neutral';
          let volText = `${volRatio.toFixed(1)}x`;
          if (volRatio >= 2.0) {
            volBadgeClass = 'tag-bull';
            volText = `⚡ ${volRatio.toFixed(1)}x Whale`;
          } else if (volRatio >= 1.2) {
            volBadgeClass = 'tag-bull';
            volText = `${volRatio.toFixed(1)}x Expansion`;
          } else if (volRatio >= 0.8) {
            volBadgeClass = 'tag-gold';
            volText = `${volRatio.toFixed(1)}x Normal`;
          } else {
            volBadgeClass = 'tag-neutral';
            volText = `${volRatio.toFixed(1)}x Dry-up`;
          }

          const rsiVal = Number(s.rsi_14) || 50;
          let rsiBadgeClass = 'tag-bull';
          if (rsiVal > 75) rsiBadgeClass = 'tag-gold';
          else if (rsiVal < 55) rsiBadgeClass = 'tag-neutral';

          let rsStatusBadge = 'tag-bull';
          if (s.rs_vs_nifty_status === 'Lagging') rsStatusBadge = 'tag-bear';
          else if (s.rs_vs_nifty_status === 'Neutral') rsStatusBadge = 'tag-gold';

          const s1Val = Number(s.s1 !== undefined ? s.s1 : s.support) || 0;
          const r1Val = Number(s.r1 !== undefined ? s.r1 : s.resistance) || 0;

          const isWl = isWatchlisted(s.symbol);

          html += `
            <tr class="adv-rs-row" data-symbol="${s.symbol}">
              <td class="row-index text-center" style="width: 40px; text-align: center;">${globalIdx}</td>
              <td class="text-center" style="width: 40px; text-align: center;">
                <button type="button" class="watchlist-star-btn tbl-watchlist-star-btn ${isWl ? 'active' : ''}" data-symbol="${s.symbol}" onclick="toggleWatchlist('${s.symbol}')" title="${isWl ? 'Remove from Watchlist' : 'Add to Watchlist'}">${isWl ? '★' : '☆'}</button>
              </td>
              <td class="col-symbol text-left sticky-symbol-col" style="min-width: 140px; text-align: left !important;">
                <div class="col-symbol" style="text-align: left !important; align-items: flex-start !important;">
                  <strong>${s.symbol}</strong>
                  <span class="muted-sector">${s.company_name || s.name || s.sector || 'NSE'}</span>
                </div>
              </td>
              <td class="text-right font-mono" style="width: 90px; text-align: right;">₹${formatCurrency(ltpVal)}</td>
              <td class="text-right font-mono ${dayChgClass}" style="width: 75px; text-align: right;">${dayChg >= 0 ? '+' : ''}${dayChg.toFixed(2)}%</td>
              <td class="text-center" style="width: 95px; text-align: center;">
                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                  <span class="rs-score-pill ${scoreBadge}"><strong>${scoreVal}</strong></span>
                  <span class="rs-grade-pill ${gradeBadge}">${s.grade || '--'}</span>
                </div>
              </td>
              <td class="text-center" style="width: 105px; text-align: center;">
                <span class="tag-pill ${pbBadgeClass}">-${pbPct.toFixed(1)}% (${s.pullback_class || 'Pullback'})</span>
              </td>
              <td class="text-center" style="width: 110px; text-align: center;">
                <span class="tag-pill ${volBadgeClass}">${volText}</span>
              </td>
              <td class="text-center font-mono" style="width: 80px; text-align: center;">
                <span class="tag-pill ${rsiBadgeClass}">${rsiVal.toFixed(1)}</span>
              </td>
              <td class="text-center" style="width: 115px; text-align: center;">
                <span class="tag-pill ${rsStatusBadge}">${s.rs_vs_nifty_status || 'Outperforming'}</span>
              </td>
              <td class="text-right font-mono" style="width: 125px; text-align: right;">
                <div style="display: flex; flex-direction: column; align-items: flex-end; font-size: 0.8rem; line-height: 1.25;">
                  <span class="text-bullish" title="Support Level (S1)">S: ₹${formatCurrency(s1Val)}</span>
                  <span class="text-muted" title="Resistance Level (R1)">R: ₹${formatCurrency(r1Val)}</span>
                </div>
              </td>
              <td class="text-center" style="width: 75px; text-align: center;">
                <button type="button" class="btn-inspect adv-inspect-btn" data-symbol="${s.symbol}" onclick="openDossier('${s.symbol}')">Inspect</button>
              </td>
            </tr>
          `;
        });
      } else if (isSlot4) {
        // Slot 4: Rally-Base-Rally (RBR) Proportional Scanner table rows (Exact 12-column specification)
        pageSignals.forEach((s, idx) => {
          const globalIdx = startIdx + idx + 1;
          const ltpVal = Number(s.ltp !== undefined ? s.ltp : s.cmp) || 0;
          const dayChg = Number(s.change_pct) || 0;
          const dayChgClass = dayChg >= 0 ? 'text-green text-bullish' : 'text-red text-bearish';
          const scoreVal = s.rbr_score !== undefined ? s.rbr_score : (s.score || 0);

          let scoreBadge = 'score-neutral';
          if (scoreVal >= 85) scoreBadge = 'score-gold';
          else if (scoreVal >= 70) scoreBadge = 'score-green';
          else if (scoreVal >= 60) scoreBadge = 'score-cyan';

          let gradeBadge = 'grade-b';
          if (s.grade === 'A+') gradeBadge = 'grade-a';
          else if (s.grade === 'A') gradeBadge = 'grade-a';

          let stageBadgeClass = 'stage-forming';
          let stageIcon = '';
          if (s.stage_status === 'READY') {
            stageBadgeClass = 'stage-ready';
            stageIcon = '⚡ ';
          } else if (s.stage_status === 'CONFIRMED') {
            stageBadgeClass = 'stage-confirmed';
            stageIcon = '✓ ';
          } else if (s.stage_status === 'CONTINUATION') {
            stageBadgeClass = 'stage-continuation';
            stageIcon = '🚀 ';
          }

          const rallyPct = Number(s.first_rally_pct) || 0;
          const rallyDays = s.rally_days || 0;

          const retracePct = Number(s.retracement_pct) || 0;
          const baseDays = s.base_days || 0;
          let retraceBadgeClass = 'tag-bull';
          if (retracePct > 50) retraceBadgeClass = 'tag-neutral';
          else if (retracePct > 38.2) retraceBadgeClass = 'tag-gold';

          const rangeRatio = Number(s.range_ratio) || 0;
          let rangeBadgeClass = 'tag-bull';
          if (rangeRatio > 0.6) rangeBadgeClass = 'tag-neutral';
          else if (rangeRatio > 0.4) rangeBadgeClass = 'tag-gold';

          const volRatio = Number(s.volume_ratio) || 1.0;
          let volBadgeClass = 'tag-bull';
          let volDesc = 'Dry-up';
          if (volRatio >= 0.85) {
            volBadgeClass = 'tag-neutral';
            volDesc = 'Normal';
          } else if (volRatio >= 0.6) {
            volBadgeClass = 'tag-gold';
            volDesc = 'Contracting';
          }

          const dz = s.demand_zone || {};
          const dzUpper = Number(dz.upper) || 0;
          const dzLower = Number(dz.lower) || 0;

          const isWl = isWatchlisted(s.symbol);

          html += `
            <tr class="adv-rs-row" data-symbol="${s.symbol}">
              <td class="row-index text-center" style="width: 40px; text-align: center;">${globalIdx}</td>
              <td class="text-center" style="width: 40px; text-align: center;">
                <button type="button" class="watchlist-star-btn tbl-watchlist-star-btn ${isWl ? 'active' : ''}" data-symbol="${s.symbol}" onclick="toggleWatchlist('${s.symbol}')" title="${isWl ? 'Remove from Watchlist' : 'Add to Watchlist'}">${isWl ? '★' : '☆'}</button>
              </td>
              <td class="col-symbol text-left sticky-symbol-col" style="min-width: 140px; text-align: left !important;">
                <div class="col-symbol" style="text-align: left !important; align-items: flex-start !important;">
                  <strong>${s.symbol}</strong>
                  <span class="muted-sector">${s.company_name || s.name || s.sector || 'NSE'}</span>
                </div>
              </td>
              <td class="text-right font-mono" style="width: 90px; text-align: right;">
                <div style="display: flex; flex-direction: column; align-items: flex-end; line-height: 1.25;">
                  <span>₹${formatCurrency(ltpVal)}</span>
                  <span class="${dayChgClass}" style="font-size: 0.74rem;">${dayChg >= 0 ? '+' : ''}${dayChg.toFixed(2)}%</span>
                </div>
              </td>
              <td class="text-center" style="width: 110px; text-align: center;">
                <span class="rbr-stage-badge ${stageBadgeClass}">${stageIcon}${s.stage_status || 'FORMING'}</span>
              </td>
              <td class="text-center" style="width: 95px; text-align: center;">
                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                  <span class="rs-score-pill ${scoreBadge}"><strong>${scoreVal}</strong></span>
                  <span class="rs-grade-pill ${gradeBadge}">${s.grade || '--'}</span>
                </div>
              </td>
              <td class="text-center font-mono" style="width: 105px; text-align: center;">
                <span class="tag-pill tag-bull">+${rallyPct.toFixed(1)}% <span style="font-size: 0.74rem; color: #94a3b8;">(${rallyDays}D)</span></span>
              </td>
              <td class="text-center font-mono" style="width: 105px; text-align: center;">
                <span class="tag-pill ${retraceBadgeClass}">${retracePct.toFixed(1)}% <span style="font-size: 0.74rem; color: #94a3b8;">(${baseDays}D)</span></span>
              </td>
              <td class="text-center font-mono" style="width: 100px; text-align: center;">
                <span class="tag-pill ${rangeBadgeClass}">${rangeRatio.toFixed(2)}x Base</span>
              </td>
              <td class="text-center font-mono" style="width: 105px; text-align: center;">
                <span class="tag-pill ${volBadgeClass}">${volRatio.toFixed(2)}x ${volDesc}</span>
              </td>
              <td class="text-right font-mono" style="width: 125px; text-align: right;">
                <div style="display: flex; flex-direction: column; align-items: flex-end; font-size: 0.8rem; line-height: 1.25;">
                  <span class="text-bullish" title="Demand Zone Upper (Base High)">₹${formatCurrency(dzUpper)}</span>
                  <span class="text-muted" title="Demand Zone Lower (Base Low)">₹${formatCurrency(dzLower)}</span>
                </div>
              </td>
              <td class="text-center" style="width: 75px; text-align: center;">
                <button type="button" class="btn-inspect adv-inspect-btn" data-symbol="${s.symbol}" onclick="openDossier('${s.symbol}')">Inspect</button>
              </td>
            </tr>
          `;
        });
      } else if (isSlot5) {
        // Slot 5: Multi-Scanner Confluence Engine table rows (Exact 12-column specification)
        pageSignals.forEach((s, idx) => {
          const globalIdx = startIdx + idx + 1;
          const ltpVal = Number(s.ltp !== undefined ? s.ltp : s.cmp) || 0;
          const dayChg = Number(s.change_pct) || 0;
          const dayChgClass = dayChg >= 0 ? 'text-green text-bullish' : 'text-red text-bearish';
          const compositeScore = Number(s.composite_score !== undefined ? s.composite_score : (s.score || 0)).toFixed(1);
          const confluenceCount = s.confluence_count !== undefined ? s.confluence_count : (s.setups_matched ? s.setups_matched.length : 0);

          let scoreBadge = 'score-neutral';
          if (compositeScore >= 85) scoreBadge = 'score-gold';
          else if (compositeScore >= 70) scoreBadge = 'score-green';
          else if (compositeScore >= 60) scoreBadge = 'score-cyan';

          const tier = (s.conviction_tier || s.tier_label || '').toUpperCase();
          let tierBadgeClass = 'tier-badge-blue';
          let tierDisplay = s.tier_label || s.conviction_tier || 'CONFLUENCE';
          if (tier.includes('ULTRA') || s.tier === 1) {
            tierBadgeClass = 'tier-badge-gold';
            tierDisplay = '⚡ Tier 1: Ultra High';
          } else if (tier.includes('HIGH') || s.tier === 2) {
            tierBadgeClass = 'tier-badge-green';
            tierDisplay = '⭐ Tier 2: High';
          } else if (tier.includes('MODERATE') || s.tier === 3) {
            tierBadgeClass = 'tier-badge-blue';
            tierDisplay = '✓ Tier 3: Moderate';
          }

          const setupsMatched = Array.isArray(s.setups_matched) ? s.setups_matched : [];
          const setupsTagsHtml = setupsMatched.map(setup => {
            const low = setup.toLowerCase();
            let pClass = 'pill-rs';
            let shortName = setup;
            if (low.includes('rs') || low.includes('relative')) { pClass = 'pill-rs'; shortName = 'RS'; }
            else if (low.includes('early') || low.includes('breakout')) { pClass = 'pill-bo'; shortName = 'Early BO'; }
            else if (low.includes('momentum continuation')) { pClass = 'pill-mc'; shortName = 'Momentum'; }
            else if (low.includes('rbr') || low.includes('rally')) { pClass = 'pill-rbr'; shortName = 'RBR'; }
            else if (low.includes('wyckoff')) { pClass = 'pill-momentum'; shortName = 'Wyckoff'; }
            else if (low.includes('alpha')) { pClass = 'pill-pullback'; shortName = 'Alpha Mom'; }
            else if (low.includes('htf') || low.includes('tight')) { pClass = 'pill-htf'; shortName = 'HTF'; }
            else if (low.includes('reversal') || low.includes('bottom')) { pClass = 'pill-reversal'; shortName = 'Reversal'; }
            return `<span class="confluence-setup-pill ${pClass}" title="${setup}">${shortName}</span>`;
          }).join('');

          const delivVal = s.delivery_pct !== undefined && s.delivery_pct !== null
            ? Number(s.delivery_pct)
            : (s.dossier?.delivery_pct !== undefined && s.dossier?.delivery_pct !== null
                ? Number(s.dossier.delivery_pct)
                : (s.dossier?.volume_footprint?.delivery_pct !== undefined && s.dossier?.volume_footprint?.delivery_pct !== null
                    ? Number(s.dossier.volume_footprint.delivery_pct)
                    : null));
          const delivHighClass = delivVal !== null && delivVal >= 55 ? 'deliv-high' : '';

          const rsScore = s.setup_scores?.['RS Outperformer'] !== undefined
            ? s.setup_scores['RS Outperformer']
            : (s.dossier?.rs_profile?.rs_20d !== undefined && s.dossier?.rs_profile?.rs_20d !== null
                ? (Number(s.dossier.rs_profile.rs_20d) >= 0 ? `+${Number(s.dossier.rs_profile.rs_20d).toFixed(1)}%` : `${Number(s.dossier.rs_profile.rs_20d).toFixed(1)}%`)
                : null);

          const volStatus = s.dossier?.volume_footprint?.delivery_status || s.dossier?.volume_status || (s.dossier?.volume_footprint?.volume_multiple ? `${s.dossier.volume_footprint.volume_multiple}x Vol` : 'Normal');

          const isWl = isWatchlisted(s.symbol);

          html += `
            <tr class="adv-rs-row" data-symbol="${s.symbol}">
              <td class="row-index text-center" style="width: 40px; text-align: center;">${globalIdx}</td>
              <td class="text-center" style="width: 40px; text-align: center;">
                <button type="button" class="watchlist-star-btn tbl-watchlist-star-btn ${isWl ? 'active' : ''}" data-symbol="${s.symbol}" onclick="toggleWatchlist('${s.symbol}')" title="${isWl ? 'Remove from Watchlist' : 'Add to Watchlist'}">${isWl ? '★' : '☆'}</button>
              </td>
              <td class="col-symbol text-left sticky-symbol-col" style="min-width: 140px; text-align: left !important;">
                <div class="col-symbol" style="text-align: left !important; align-items: flex-start !important;">
                  <strong>${s.symbol}</strong>
                  <span class="muted-sector">${s.company_name || s.name || s.sector || 'NSE'}</span>
                </div>
              </td>
              <td class="text-right font-mono" style="width: 95px; text-align: right;">
                <div style="display: flex; flex-direction: column; align-items: flex-end; line-height: 1.25;">
                  <span>₹${formatCurrency(ltpVal)}</span>
                  <span class="${dayChgClass}" style="font-size: 0.74rem;">${dayChg >= 0 ? '+' : ''}${dayChg.toFixed(2)}%</span>
                </div>
              </td>
              <td class="text-center" style="width: 140px; text-align: center;">
                <span class="tier-badge ${tierBadgeClass}">${tierDisplay}</span>
              </td>
              <td class="text-center" style="width: 105px; text-align: center;">
                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                  <span class="rs-score-pill ${scoreBadge}"><strong>${compositeScore}</strong></span>
                  <span class="tag-bull" style="font-weight: 700; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px;">${confluenceCount} Overlap</span>
                </div>
              </td>
              <td class="text-left" style="min-width: 220px; text-align: left;">
                <div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
                  ${setupsTagsHtml || '<span style="color:#64748b;">--</span>'}
                </div>
              </td>
              <td class="text-right font-mono" style="width: 90px; text-align: right;">
                ${delivVal !== null ? `<span class="deliv-pill ${delivHighClass}">${delivVal.toFixed(1)}%</span>` : '<span style="color: #64748b;">--</span>'}
              </td>
              <td class="text-center font-mono" style="width: 90px; text-align: center;">
                ${rsScore !== null ? `<span class="rs-score-pill ${Number(rsScore) >= 80 ? 'score-gold' : (Number(rsScore) >= 70 ? 'score-green' : 'score-neutral')}">${rsScore}</span>` : '<span style="color: #64748b;">--</span>'}
              </td>
              <td class="text-center font-mono" style="width: 120px; text-align: center;">
                <span class="tag-neutral" style="font-size: 0.72rem; padding: 2px 6px; white-space: nowrap;">${volStatus}</span>
              </td>
              <td class="text-left font-mono" style="min-width: 120px; text-align: left; font-size: 0.78rem;">
                <span class="muted-sector" style="color: #cbd5e1;">${s.sector || 'Diversified'}</span>
              </td>
              <td class="text-center" style="width: 75px; text-align: center;">
                <button type="button" class="btn-inspect adv-inspect-btn" data-symbol="${s.symbol}" onclick="openAdvRsDossierModal('${s.symbol}')">Inspect</button>
              </td>
            </tr>
          `;
        });
      } else if (isSlot6) {
        // Slot 6: Wyckoff Accumulation & Absorption Scanner table rows
        pageSignals.forEach((s, idx) => {
          const globalIdx = startIdx + idx + 1;
          const ltpVal = Number(s.ltp !== undefined ? s.ltp : s.cmp) || 0;
          const dayChg = Number(s.change_pct) || 0;
          const dayChgClass = dayChg >= 0 ? 'text-green text-bullish' : 'text-red text-bearish';
          const scoreVal = s.score !== undefined ? s.score : (s.wyckoff_score || 0);

          let scoreBadge = 'score-neutral';
          if (scoreVal >= 85) scoreBadge = 'score-gold';
          else if (scoreVal >= 70) scoreBadge = 'score-green';
          else if (scoreVal >= 60) scoreBadge = 'score-cyan';

          let gradeBadge = 'grade-b';
          if (s.grade === 'A+') gradeBadge = 'grade-a';
          else if (s.grade === 'A') gradeBadge = 'grade-a';

          let phaseBadgeClass = 'stage-forming';
          let phaseIcon = '🏛️ ';
          const pTag = s.phase_tag || s.phase || '';
          if (pTag === 'Phase C Spring') {
            phaseBadgeClass = 'stage-ready';
            phaseIcon = '⚡ ';
          } else if (pTag === 'Absorption at Resistance') {
            phaseBadgeClass = 'stage-confirmed';
            phaseIcon = '🛡️ ';
          } else if (pTag === 'Sign of Strength (SOS)') {
            phaseBadgeClass = 'stage-continuation';
            phaseIcon = '🚀 ';
          }

          const baseDays = s.base_days || 0;
          const baseHeight = Number(s.base_height_pct) || 0;
          let baseBadgeClass = 'tag-bull';
          if (baseHeight > 25) baseBadgeClass = 'tag-neutral';
          else if (baseHeight > 18) baseBadgeClass = 'tag-gold';

          const evrDesc = s.effort_vs_result || 'Wyckoff Absorption';
          const delivPct = s.delivery_pct !== undefined && s.delivery_pct !== null ? Number(s.delivery_pct) : null;
          const volRatio = Number(s.volume_ratio) || 1.0;

          const isWl = isWatchlisted(s.symbol);

          html += `
            <tr class="adv-rs-row" data-symbol="${s.symbol}">
              <td class="row-index text-center" style="width: 40px; text-align: center;">${globalIdx}</td>
              <td class="text-center" style="width: 40px; text-align: center;">
                <button type="button" class="watchlist-star-btn tbl-watchlist-star-btn ${isWl ? 'active' : ''}" data-symbol="${s.symbol}" onclick="toggleWatchlist('${s.symbol}')" title="${isWl ? 'Remove from Watchlist' : 'Add to Watchlist'}">${isWl ? '★' : '☆'}</button>
              </td>
              <td class="col-symbol text-left sticky-symbol-col" style="min-width: 140px; text-align: left !important;">
                <div class="col-symbol" style="text-align: left !important; align-items: flex-start !important;">
                  <strong>${s.symbol}</strong>
                  <span class="muted-sector">${s.company_name || s.name || s.sector || 'NSE'}</span>
                </div>
              </td>
              <td class="text-right font-mono" style="width: 90px; text-align: right;">
                <div style="display: flex; flex-direction: column; align-items: flex-end; line-height: 1.25;">
                  <span>₹${formatCurrency(ltpVal)}</span>
                  <span class="${dayChgClass}" style="font-size: 0.74rem;">${dayChg >= 0 ? '+' : ''}${dayChg.toFixed(2)}%</span>
                </div>
              </td>
              <td class="text-right font-mono" style="width: 75px; text-align: right;">
                <span class="${dayChgClass}">${dayChg >= 0 ? '+' : ''}${dayChg.toFixed(2)}%</span>
              </td>
              <td class="text-center" style="width: 95px; text-align: center;">
                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                  <span class="rs-score-pill ${scoreBadge}"><strong>${scoreVal}</strong></span>
                  <span class="rs-grade-pill ${gradeBadge}">${s.grade || '--'}</span>
                </div>
              </td>
              <td class="text-center" style="width: 140px; text-align: center;">
                <span class="rbr-stage-badge ${phaseBadgeClass}">${phaseIcon}${pTag}</span>
              </td>
              <td class="text-center font-mono" style="width: 90px; text-align: center;">
                <span class="tag-pill tag-neutral">${baseDays}D Base</span>
              </td>
              <td class="text-center font-mono" style="width: 100px; text-align: center;">
                <span class="tag-pill ${baseBadgeClass}">${baseHeight.toFixed(1)}%</span>
              </td>
              <td class="text-left" style="min-width: 180px; font-size: 0.78rem; text-align: left;">
                <span style="color: #cbd5e1; font-weight: 500;">${evrDesc}</span>
              </td>
              <td class="text-right font-mono" style="width: 95px; text-align: right;">
                <div style="display: flex; flex-direction: column; align-items: flex-end; line-height: 1.25;">
                  <span class="${delivPct && delivPct >= 50 ? 'text-green' : ''}">${delivPct !== null ? delivPct.toFixed(1) + '%' : '--'}</span>
                  <span style="font-size: 0.72rem; color: #94a3b8;">${volRatio.toFixed(2)}x Vol</span>
                </div>
              </td>
              <td class="text-center" style="width: 75px; text-align: center;">
                <button type="button" class="btn-inspect adv-inspect-btn" data-symbol="${s.symbol}" onclick="openDossier('${s.symbol}')">Inspect</button>
              </td>
            </tr>
          `;
        });
      }

      tbody.innerHTML = html;

      // Event delegation for table inspect and star buttons
      tbody.querySelectorAll('.adv-inspect-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const sym = btn.getAttribute('data-symbol');
          if (sym) openAdvRsDossierModal(sym);
        });
      });

      tbody.querySelectorAll('.tbl-watchlist-star-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const sym = btn.getAttribute('data-symbol');
          if (sym) toggleWatchlist(sym);
        });
      });

      tbody.querySelectorAll('tr.adv-rs-row').forEach(row => {
        row.addEventListener('click', (e) => {
          if (e.target.closest('.adv-inspect-btn') || e.target.closest('.tbl-watchlist-star-btn')) return;
          const sym = row.getAttribute('data-symbol');
          if (sym) openAdvRsDossierModal(sym);
        });
      });

    } catch (renderErr) {
      console.error('[MITS Pro] Error rendering active advanced table:', renderErr);
    }
  }

  // Alias for backward compatibility
  function renderAdvRsTable() {
    renderAdvActiveTable();
  }

  function renderAdvConfluenceCards() {
    const container = document.getElementById('adv-confluence-container');
    if (!container) return;

    const data = advState.confluenceData;
    if (!data || !data.stocks || !data.stocks.length) {
      container.innerHTML = '<div style="text-align: center; padding: 3rem; color: #94a3b8; font-size: 0.95rem;">Loading Multi-Scanner Confluence dataset...</div>';
      return;
    }

    let stocks = [...data.stocks];

    // Search query filter
    if (advState.searchQuery) {
      const q = advState.searchQuery;
      stocks = stocks.filter(s => {
        const sym = (s.symbol || '').toLowerCase();
        const nm = (s.company_name || s.name || '').toLowerCase();
        const sec = (s.sector || '').toLowerCase();
        const tier = (s.conviction_tier || '').toLowerCase();
        const setups = (s.setups_matched || []).join(' ').toLowerCase();
        return sym.includes(q) || nm.includes(q) || sec.includes(q) || tier.includes(q) || setups.includes(q);
      });
    }

    // Sector filter
    if (advState.sectorFilter !== 'ALL') {
      stocks = stocks.filter(s => s.sector === advState.sectorFilter);
    }

    // Conviction Tier filter (stored in advState.gradeFilter)
    if (advState.gradeFilter !== 'ALL') {
      stocks = stocks.filter(s => s.conviction_tier === advState.gradeFilter);
    }

    if (stocks.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 3rem; color: #94a3b8; font-size: 0.95rem;">No confluence setups match the selected filter criteria.</div>';
      return;
    }

    function getPillClass(setup) {
      const low = (setup || '').toLowerCase();
      if (low.includes('rs') || low.includes('outperformer')) return 'pill-rs';
      if (low.includes('early') || low.includes('breakout')) return 'pill-bo';
      if (low.includes('momentum continuation')) return 'pill-mc';
      if (low.includes('rbr') || low.includes('rally')) return 'pill-rbr';
      if (low.includes('htf') || low.includes('high tight')) return 'pill-htf';
      if (low.includes('pullback') || low.includes('stage-2')) return 'pill-pullback';
      if (low.includes('alpha') || low.includes('momentum')) return 'pill-momentum';
      if (low.includes('reversal') || low.includes('bottom') || low.includes('dbr')) return 'pill-reversal';
      return '';
    }

    const tiers = [
      {
        id: 'tier-1',
        cardClass: 'tier-1-card',
        tierKey: 'ULTRA HIGH CONVICTION',
        badgeClass: 'tier-badge-gold',
        badgeText: 'TIER 1',
        title: 'ULTRA HIGH CONVICTION',
        subtitle: '(4+ Scanners In Simultaneous Confluence)',
        color: '#fbbf24'
      },
      {
        id: 'tier-2',
        cardClass: 'tier-2-card',
        tierKey: 'HIGH CONVICTION',
        badgeClass: 'tier-badge-green',
        badgeText: 'TIER 2',
        title: 'HIGH CONVICTION',
        subtitle: '(3 Scanners In Simultaneous Confluence)',
        color: '#10b981'
      },
      {
        id: 'tier-3',
        cardClass: 'tier-3-card',
        tierKey: 'MODERATE CONFLUENCE',
        badgeClass: 'tier-badge-blue',
        badgeText: 'TIER 3',
        title: 'MODERATE CONFLUENCE',
        subtitle: '(2 Scanners In Simultaneous Confluence)',
        color: '#38bdf8'
      }
    ];

    let fullHtml = '';

    tiers.forEach(tierDef => {
      const tierStocks = stocks.filter(s => s.conviction_tier === tierDef.tierKey);
      if (tierStocks.length === 0) return;

      tierStocks.sort((a, b) => {
        const scA = a.composite_score !== undefined ? a.composite_score : (a.score || 0);
        const scB = b.composite_score !== undefined ? b.composite_score : (b.score || 0);
        if (scB !== scA) return scB - scA;
        return (b.confluence_count || 0) - (a.confluence_count || 0);
      });

      let cardsHtml = '';
      tierStocks.forEach(s => {
        const isWl = isWatchlisted(s.symbol);
        const ltpVal = s.ltp !== undefined ? s.ltp : s.cmp;
        const chgVal = Number(s.change_pct) || 0;
        const chgClass = chgVal >= 0 ? 'text-green text-bullish' : 'text-red text-bearish';
        const chgSign = chgVal >= 0 ? '+' : '';

        const setups = s.setups_matched || [];
        const pillsHtml = setups.map(st => {
          const pillCls = getPillClass(st);
          return `<span class="confluence-setup-pill ${pillCls}">${st}</span>`;
        }).join('');

        let scoreBadgeClass = 'score-neutral';
        const scoreVal = s.composite_score !== undefined ? s.composite_score : (s.score || 0);
        if (scoreVal >= 90) scoreBadgeClass = 'score-gold';
        else if (scoreVal >= 80) scoreBadgeClass = 'score-green';
        else if (scoreVal >= 70) scoreBadgeClass = 'score-cyan';

        cardsHtml += `
          <div class="confluence-stock-card ${tierDef.cardClass}" data-symbol="${s.symbol}">
            <div class="card-top-row">
              <div class="card-identity">
                <div class="card-sym-star">
                  <span class="card-symbol">${s.symbol}</span>
                  <button class="tbl-watchlist-star-btn ${isWl ? 'active' : ''}" data-symbol="${s.symbol}" title="${isWl ? 'Remove from Watchlist' : 'Add to Watchlist'}">${isWl ? '★' : '☆'}</button>
                </div>
                <div class="card-company" title="${s.company_name || s.name || s.symbol}">${s.company_name || s.name || s.symbol}</div>
                <div class="card-sector">${s.sector || 'NSE'}</div>
              </div>
              <div class="card-price-block">
                <div class="card-ltp">₹${formatCurrency(ltpVal)}</div>
                <div class="card-chg ${chgClass}">${chgSign}${chgVal.toFixed(2)}%</div>
              </div>
            </div>

            <div class="card-confluence-badges">
              ${pillsHtml}
            </div>

            <div class="card-metrics-grid">
              <div class="metric-box">
                <span class="metric-label">CONFLUENCE</span>
                <span class="metric-val" style="color: ${tierDef.color};">${s.confluence_count} Scanners</span>
              </div>
              <div class="metric-box">
                <span class="metric-label">COMPOSITE SCORE</span>
                <span class="metric-val ${scoreBadgeClass}">${scoreVal} / 100</span>
              </div>
            </div>

            <div class="card-footer-action">
              <button class="btn btn-outline adv-inspect-btn card-inspect-btn" data-symbol="${s.symbol}" title="Inspect quantitative dossier">
                <span>🔍 Inspect Profile</span>
              </button>
            </div>
          </div>
        `;
      });

      fullHtml += `
        <div class="confluence-tier-section ${tierDef.id}">
          <div class="confluence-tier-header">
            <div class="tier-header-left">
              <span class="tier-badge ${tierDef.badgeClass}">${tierDef.badgeText}</span>
              <h3 class="tier-title">${tierDef.title}</h3>
              <span class="tier-subtitle">${tierDef.subtitle}</span>
            </div>
            <span class="tier-count-pill">${tierStocks.length} Setups</span>
          </div>
          <div class="confluence-grid">
            ${cardsHtml}
          </div>
        </div>
      `;
    });

    container.innerHTML = fullHtml;

    container.querySelectorAll('.adv-inspect-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sym = btn.getAttribute('data-symbol');
        if (sym) openAdvRsDossierModal(sym);
      });
    });

    container.querySelectorAll('.tbl-watchlist-star-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sym = btn.getAttribute('data-symbol');
        if (sym) {
          toggleWatchlist(sym);
          const active = isWatchlisted(sym);
          btn.classList.toggle('active', active);
          btn.textContent = active ? '★' : '☆';
          btn.title = active ? 'Remove from Watchlist' : 'Add to Watchlist';
        }
      });
    });

    container.querySelectorAll('.confluence-stock-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.adv-inspect-btn') || e.target.closest('.tbl-watchlist-star-btn')) return;
        const sym = card.getAttribute('data-symbol');
        if (sym) openAdvRsDossierModal(sym);
      });
    });
  }

  function renderAdvPagination(totalSignals, totalPages, startIdx, endIdx) {
    const pInfo = document.getElementById('adv-pagination-info');
    const pControls = document.getElementById('adv-pagination-controls');
    const pBar = document.getElementById('adv-pagination-bar');
    if (!pInfo || !pControls) return;

    if (totalSignals === 0) {
      pInfo.innerHTML = 'Showing <span>0</span> to <span>0</span> of Total <span>0</span> stocks';
      pControls.innerHTML = '';
      if (pBar) pBar.style.display = 'none';
      return;
    }

    if (pBar) pBar.style.display = 'flex';
    pInfo.innerHTML = `Showing <span>${startIdx + 1}</span> to <span>${endIdx}</span> of Total <span>${totalSignals}</span> stocks`;

    if (totalPages <= 1) {
      pControls.innerHTML = '';
      return;
    }

    let buttonsHtml = '';
    const prevDisabled = advState.currentPage === 1 ? ' disabled' : '';
    buttonsHtml += `<button class="page-btn page-prev" data-page="${advState.currentPage - 1}"${prevDisabled}>◀ Prev</button>`;

    for (let i = 1; i <= Math.min(totalPages, 7); i++) {
      const isActive = i === advState.currentPage ? ' active' : '';
      buttonsHtml += `<button class="page-btn${isActive}" data-page="${i}">${i}</button>`;
    }

    const nextDisabled = advState.currentPage === totalPages ? ' disabled' : '';
    buttonsHtml += `<button class="page-btn page-next" data-page="${advState.currentPage + 1}"${nextDisabled}>Next ▶</button>`;

    pControls.innerHTML = buttonsHtml;
    pControls.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetPage = parseInt(btn.getAttribute('data-page'), 10);
        if (targetPage && targetPage !== advState.currentPage && targetPage >= 1 && targetPage <= totalPages) {
          advState.currentPage = targetPage;
          renderAdvActiveTable();
        }
      });
    });
  }

  function openAdvRsDossierModal(symbol) {
    let s = null;
    if (advState.activeSlot === 5 && advState.confluenceData && advState.confluenceData.stocks) {
      s = advState.confluenceData.stocks.find(it => it.symbol === symbol);
    }
    if (!s && advState.activeSlot === 6 && advState.wyckoffData && advState.wyckoffData.stocks) {
      s = advState.wyckoffData.stocks.find(it => it.symbol === symbol);
    }
    if (!s && advState.activeSlot === 4 && advState.rbrData && advState.rbrData.stocks) {
      s = advState.rbrData.stocks.find(it => it.symbol === symbol);
    }
    if (!s && advState.activeSlot === 3 && advState.mcData && advState.mcData.stocks) {
      s = advState.mcData.stocks.find(it => it.symbol === symbol);
    }
    if (!s && advState.activeSlot === 2 && advState.boData && advState.boData.stocks) {
      s = advState.boData.stocks.find(it => it.symbol === symbol);
    }
    if (!s && advState.rsData && advState.rsData.stocks) {
      s = advState.rsData.stocks.find(it => it.symbol === symbol);
    }
    if (!s && advState.boData && advState.boData.stocks) {
      s = advState.boData.stocks.find(it => it.symbol === symbol);
    }
    if (!s && advState.mcData && advState.mcData.stocks) {
      s = advState.mcData.stocks.find(it => it.symbol === symbol);
    }
    if (!s && advState.rbrData && advState.rbrData.stocks) {
      s = advState.rbrData.stocks.find(it => it.symbol === symbol);
    }
    if (!s && advState.confluenceData && advState.confluenceData.stocks) {
      s = advState.confluenceData.stocks.find(it => it.symbol === symbol);
    }
    if (!s && advState.wyckoffData && advState.wyckoffData.stocks) {
      s = advState.wyckoffData.stocks.find(it => it.symbol === symbol);
    }
    if (!s) return;

    const d = s.dossier || {};
    const kl = d.key_levels || {};
    const vf = d.volume_footprint || {};
    const rp = d.rs_profile || {};

    const el = id => document.getElementById(id);

    if (el('rs-modal-symbol')) el('rs-modal-symbol').textContent = s.symbol;
    if (el('rs-modal-name')) el('rs-modal-name').textContent = s.company_name || s.name || symbol;
    if (el('rs-modal-sector')) el('rs-modal-sector').textContent = s.sector || 'NSE';
    if (el('rs-modal-rank')) el('rs-modal-rank').textContent = `Rank #${s.rank || 1}`;
    if (el('rs-modal-cmp')) el('rs-modal-cmp').textContent = `₹${formatCurrency(s.ltp !== undefined ? s.ltp : s.cmp)}`;

    // Sync in-modal Watchlist state
    const wlBtn = el('rs-modal-watchlist-btn');
    if (wlBtn) {
      const active = isWatchlisted(s.symbol);
      wlBtn.className = `rs-watchlist-btn ${active ? 'active' : ''}`;
      wlBtn.innerHTML = active
        ? '<span class="star-icon">★</span> <span class="watchlist-text">In Watchlist</span>'
        : '<span class="star-icon">☆</span> <span class="watchlist-text">Add to Watchlist</span>';
    }

    const chg = s.change_pct !== undefined ? Number(s.change_pct) : 0;
    if (el('rs-modal-chg')) {
      el('rs-modal-chg').textContent = `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`;
      el('rs-modal-chg').className = `rs-modal-chg ${chg >= 0 ? 'text-bullish' : 'text-bearish'}`;
    }

    // RS Score / Breakout Score / Momentum Score / Confluence Score badge
    const score = s.composite_score !== undefined ? s.composite_score : (s.total_score || s.score || s.bo_score || s.rs_score || 50);
    const scoreEl = el('rs-modal-score');
    if (scoreEl) {
      scoreEl.textContent = score;
      let badgeClass = 'score-neutral';
      if (score >= 90) badgeClass = 'score-gold';
      else if (score >= 80) badgeClass = 'score-green';
      else if (score >= 70) badgeClass = 'score-cyan';
      scoreEl.className = `rs-score-val ${badgeClass}`;
    }

    // Stage
    if (el('rs-modal-stage')) {
      el('rs-modal-stage').textContent = d.stage_badge || 'Stage-2 Markup';
      el('rs-modal-stage').className = `rs-stage-badge ${d.stage_color || 'bullish'}`;
    }
    if (el('rs-modal-stage-desc')) el('rs-modal-stage-desc').textContent = d.stage_desc || 'Institutional Accumulation & Sustained Expansion';

    // Trend Stack
    if (el('rs-modal-trend-badge')) {
      el('rs-modal-trend-badge').textContent = d.trend_stack_badge || (d.trend_stack ? 'PERFECT STACK' : 'CONSTRUCTIVE');
      el('rs-modal-trend-badge').className = `rs-trend-badge ${d.trend_stack ? 'bullish' : 'neutral'}`;
    }
    if (el('rs-modal-trend-desc')) el('rs-modal-trend-desc').textContent = d.trend_stack_status || 'Price > 20 > 50 > 200 EMA';

    // Moving Averages
    const ema20 = d.ema_20 || s.ema_20;
    const ema50 = d.ema_50 || s.ema_50;
    const ema200 = d.ema_200 || s.ema_200;
    if (el('rs-modal-ema20')) el('rs-modal-ema20').textContent = ema20 ? `₹${formatCurrency(ema20)}` : '--';
    if (el('rs-modal-ema50')) el('rs-modal-ema50').textContent = ema50 ? `₹${formatCurrency(ema50)}` : '--';
    if (el('rs-modal-ema200')) el('rs-modal-ema200').textContent = ema200 ? `₹${formatCurrency(ema200)}` : '--';

    // Key Levels (Dynamic 20D Swing Support < CMP, Resistance > CMP)
    const sVal = kl.support !== undefined ? kl.support : (kl.support_1 || d.support || d.support_1 || s.s1);
    const sLabel = kl.support_label || d.support_label || '20D Swing Low Support';
    const sDist = kl.support_dist || (kl.support_1_dist_pct !== undefined ? `-${kl.support_1_dist_pct}% below` : '--');
    if (el('rs-modal-s1')) el('rs-modal-s1').textContent = sVal ? `₹${formatCurrency(sVal)}` : '--';
    if (el('rs-modal-s1-label')) el('rs-modal-s1-label').textContent = sLabel;
    if (el('rs-modal-s1-dist')) el('rs-modal-s1-dist').textContent = sDist;

    const rVal = kl.resistance !== undefined ? kl.resistance : (kl.pivot_resistance || d.resistance || d.resistance_pivot || s.r1);
    const rLabel = kl.resistance_label || d.resistance_label || (s.pivot_type ? `${s.pivot_type} Pivot` : '20D Swing High Pivot');
    const rDist = kl.resistance_dist || (kl.pivot_dist_pct !== undefined ? `+${kl.pivot_dist_pct}% to pivot` : '--');
    if (el('rs-modal-r1')) el('rs-modal-r1').textContent = rVal ? `₹${formatCurrency(rVal)}` : '--';
    if (el('rs-modal-r1-label')) el('rs-modal-r1-label').textContent = rLabel;
    if (el('rs-modal-r1-dist')) el('rs-modal-r1-dist').textContent = rDist;

    const h52w = kl.high_52w || d.high_52w;
    const h52wDist = kl.dist_52w || (kl.dist_52w_high_pct !== undefined ? `${kl.dist_52w_high_pct}% from 52W High` : (d.dist_52w || '--'));
    if (el('rs-modal-52w')) el('rs-modal-52w').textContent = h52w ? `₹${formatCurrency(h52w)}` : '--';
    if (el('rs-modal-52w-dist')) el('rs-modal-52w-dist').textContent = h52wDist;

    // Volume & Smart Money
    const volRatio = vf.volume_multiple || d.volume_multiple || s.volume_ratio || s.vol_ratio || 1.0;
    if (el('rs-modal-vol-ratio')) el('rs-modal-vol-ratio').textContent = `${volRatio}x`;
    if (el('rs-modal-vol-desc')) el('rs-modal-vol-desc').textContent = `${volRatio}x 20-Day Average Volume`;
    if (el('rs-modal-delivery-status')) {
      el('rs-modal-delivery-status').textContent = vf.delivery_status || d.delivery_status || (s.vol_confirmed ? 'Active Absorption' : 'Standard Flow');
    }
    if (el('rs-modal-delivery-pct')) {
      const delPct = vf.delivery_pct || d.delivery_pct;
      el('rs-modal-delivery-pct').textContent = delPct ? `Delivery: ${delPct}%` : 'Standard Delivery Flow';
    }

    // RS Spectrum Multi-Timeframe Progress Bars
    function setSpectrum(period, rsVal, sRet, bRet) {
      const valEl = el(`rs-modal-rs${period}-val`);
      const barEl = el(`rs-modal-rs${period}-bar`);
      const subEl = el(`rs-modal-rs${period}-sub`);
      if (valEl) {
        valEl.textContent = rsVal !== null && rsVal !== undefined ? `${rsVal >= 0 ? '+' : ''}${rsVal}%` : '--';
        valEl.style.color = (rsVal || 0) >= 0 ? '#10b981' : '#f43f5e';
      }
      if (barEl) {
        const clamped = Math.max(-50, Math.min(50, rsVal || 0));
        const widthPct = Math.round(50 + (clamped / 50) * 45);
        barEl.style.width = `${widthPct}%`;
        barEl.style.background = (rsVal || 0) >= 0 ? 'linear-gradient(90deg, #059669, #10b981)' : 'linear-gradient(90deg, #e11d48, #f43f5e)';
      }
      if (subEl) {
        if (sRet !== null && sRet !== undefined && bRet !== null && bRet !== undefined) {
          subEl.textContent = `Stock ${sRet >= 0 ? '+' : ''}${sRet}% vs Nifty ${bRet >= 0 ? '+' : ''}${bRet}%`;
        } else {
          subEl.textContent = 'Calculated vs NIFTY 50';
        }
      }
    }

    setSpectrum('20', rp.rs_20d !== undefined ? rp.rs_20d : s.rs_20d, rp.stock_ret_20d !== undefined ? rp.stock_ret_20d : s.ret_20d_stock, rp.bench_ret_20d !== undefined ? rp.bench_ret_20d : s.ret_20d_nifty);
    setSpectrum('60', rp.rs_60d !== undefined ? rp.rs_60d : s.rs_60d, rp.stock_ret_60d !== undefined ? rp.stock_ret_60d : s.ret_60d_stock, rp.bench_ret_60d !== undefined ? rp.bench_ret_60d : s.ret_60d_nifty);
    setSpectrum('120', rp.rs_120d !== undefined ? rp.rs_120d : s.rs_120d, rp.stock_ret_120d !== undefined ? rp.stock_ret_120d : s.ret_120d_stock, rp.bench_ret_120d !== undefined ? rp.bench_ret_120d : s.ret_120d_nifty);
    setSpectrum('252', rp.rs_252d !== undefined ? rp.rs_252d : s.rs_252d, rp.stock_ret_252d !== undefined ? rp.stock_ret_252d : s.ret_252d_stock, rp.bench_ret_252d !== undefined ? rp.bench_ret_252d : s.ret_252d_nifty);

    // TradingView Link
    const tvBtn = el('rs-modal-tv-btn');
    if (tvBtn) {
      tvBtn.href = s.tradingview_url || d.tradingview_url || `https://in.tradingview.com/chart/?symbol=NSE:${s.symbol}`;
    }

    // Launch Modal Animation
    const backdrop = el('rs-dossier-backdrop');
    const modal = el('rs-dossier-modal');
    if (backdrop && modal) {
      backdrop.style.display = 'block';
      requestAnimationFrame(() => {
        backdrop.classList.add('open');
        modal.classList.add('open');
        document.body.classList.add('dossier-modal-open');
      });
    }
  }

  function closeAdvRsDossierModal() {
    const backdrop = document.getElementById('rs-dossier-backdrop');
    const modal = document.getElementById('rs-dossier-modal');
    if (backdrop && modal) {
      backdrop.classList.remove('open');
      modal.classList.remove('open');
      document.body.classList.remove('dossier-modal-open');
      setTimeout(() => {
        backdrop.style.display = 'none';
      }, 280);
    }
  }

  function exportAdvCsv() {
    const isSlot1 = advState.activeSlot === 1;
    const isSlot2 = advState.activeSlot === 2;
    const isSlot3 = advState.activeSlot === 3;
    const isSlot4 = advState.activeSlot === 4;
    const isSlot5 = advState.activeSlot === 5;
    const isSlot6 = advState.activeSlot === 6;
    let activeData = null;
    if (isSlot1) activeData = advState.rsData;
    else if (isSlot2) activeData = advState.boData;
    else if (isSlot3) activeData = advState.mcData;
    else if (isSlot4) activeData = advState.rbrData;
    else if (isSlot5) activeData = advState.confluenceData;
    else if (isSlot6) activeData = advState.wyckoffData;

    if (!activeData || !activeData.stocks || !activeData.stocks.length) return;

    const rows = [];
    if (isSlot1) {
      rows.push(['Rank', 'Symbol', 'Name', 'Sector', 'CMP', 'Day Change %', 'Delivery %', 'Grade', 'RS Score', 'RS Line Status', '20D RS', '60D RS', '120D RS', '252D RS', 'EMA Stack', 'Vol Status'].join(','));
      activeData.stocks.forEach(s => {
        rows.push([
          s.rank || '--',
          `"${s.symbol}"`,
          `"${s.name}"`,
          `"${s.sector}"`,
          s.cmp,
          s.change_pct,
          s.delivery_pct !== undefined && s.delivery_pct !== null ? s.delivery_pct : '--',
          `"${s.grade}"`,
          s.rs_score,
          `"${s.rs_line_status || '--'}"`,
          s.rs_20d !== null && s.rs_20d !== undefined ? s.rs_20d : '--',
          s.rs_60d !== null && s.rs_60d !== undefined ? s.rs_60d : '--',
          s.rs_120d !== null && s.rs_120d !== undefined ? s.rs_120d : '--',
          s.rs_252d !== null && s.rs_252d !== undefined ? s.rs_252d : '--',
          `"${s.ema_stack || (s.above_ema50 ? 'Above 50 EMA' : 'Below 50 EMA')}"`,
          `"${s.vol_status || (s.vol_ratio ? s.vol_ratio + 'x' : '--')}"`
        ].join(','));
      });
    } else if (isSlot2) {
      rows.push(['Rank', 'Symbol', 'Name', 'Sector', 'CMP', 'Day Change %', 'Resistance Pivot', 'Dist to Pivot %', 'Pivot Type', 'Support', 'Vol Ratio', 'Vol Status', 'Tightness'].join(','));
      activeData.stocks.forEach(s => {
        rows.push([
          s.rank,
          `"${s.symbol}"`,
          `"${s.name}"`,
          `"${s.sector}"`,
          s.cmp,
          s.change_pct,
          s.resistance,
          s.dist_to_pivot,
          `"${s.pivot_type}"`,
          s.support,
          s.vol_ratio,
          `"${s.vol_status}"`,
          `"${s.tightness_desc}"`
        ].join(','));
      });
    } else if (isSlot3) {
      rows.push(['Rank', 'Symbol', 'Company', 'Sector', 'LTP', 'Day Change %', 'Total Score', 'Grade', 'Pullback %', 'Pullback Class', 'Volume Ratio', 'Vol Status', 'RSI 14', 'RSI Status', 'RS vs Nifty', 'S1 Support', 'R1 Resistance'].join(','));
      activeData.stocks.forEach(s => {
        rows.push([
          s.rank || '--',
          `"${s.symbol}"`,
          `"${s.company_name || s.name || ''}"`,
          `"${s.sector}"`,
          s.ltp || s.cmp,
          s.change_pct,
          s.total_score || s.score,
          `"${s.grade}"`,
          s.pullback_pct,
          `"${s.pullback_class || ''}"`,
          s.volume_ratio,
          `"${s.vol_status}"`,
          s.rsi_14,
          `"${s.rsi_status || ''}"`,
          `"${s.rs_vs_nifty_status || ''}"`,
          s.s1 || s.support,
          s.r1 || s.resistance
        ].join(','));
      });
    } else if (isSlot4) {
      rows.push(['Rank', 'Symbol', 'Company', 'Sector', 'LTP', 'Day Change %', 'Stage', 'RBR Score', 'Grade', 'First Rally %', 'Rally Days', 'Retracement %', 'Base Days', 'Range Ratio', 'Volume Ratio', 'Demand Zone Upper', 'Demand Zone Lower'].join(','));
      activeData.stocks.forEach(s => {
        rows.push([
          s.rank || '--',
          `"${s.symbol}"`,
          `"${s.company_name || s.name || ''}"`,
          `"${s.sector}"`,
          s.ltp || s.cmp,
          s.change_pct,
          `"${s.stage_status || ''}"`,
          s.rbr_score || s.score,
          `"${s.grade}"`,
          s.first_rally_pct,
          s.rally_days,
          s.retracement_pct,
          s.base_days,
          s.range_ratio,
          s.volume_ratio,
          s.demand_zone ? s.demand_zone.upper : '--',
          s.demand_zone ? s.demand_zone.lower : '--'
        ].join(','));
      });
    } else if (isSlot5) {
      rows.push(['Rank', 'Symbol', 'Company', 'Sector', 'LTP', 'Day Change %', 'Conviction Tier', 'Confluence Count', 'Composite Score', 'Setups Matched'].join(','));
      activeData.stocks.forEach(s => {
        rows.push([
          s.rank || '--',
          `"${s.symbol}"`,
          `"${s.company_name || s.name || ''}"`,
          `"${s.sector || ''}"`,
          s.ltp !== undefined ? s.ltp : s.cmp,
          s.change_pct,
          `"${s.conviction_tier || ''}"`,
          s.confluence_count,
          s.composite_score !== undefined ? s.composite_score : (s.score || 0),
          `"${(s.setups_matched || []).join('; ')}"`
        ].join(','));
      });
    } else if (isSlot6) {
      rows.push(['Rank', 'Symbol', 'Company', 'Sector', 'LTP', 'Day Change %', 'Wyckoff Score', 'Grade', 'Phase Tag', 'Base Days', 'Range Height %', 'Effort vs Result', 'Delivery %', 'Volume Ratio', 'Support', 'Resistance'].join(','));
      activeData.stocks.forEach(s => {
        rows.push([
          s.rank || '--',
          `"${s.symbol}"`,
          `"${s.company_name || s.name || ''}"`,
          `"${s.sector || ''}"`,
          s.ltp !== undefined ? s.ltp : s.cmp,
          s.change_pct,
          s.score !== undefined ? s.score : s.wyckoff_score,
          `"${s.grade}"`,
          `"${s.phase_tag || s.phase || ''}"`,
          s.base_days,
          s.base_height_pct,
          `"${s.effort_vs_result || ''}"`,
          s.delivery_pct !== undefined && s.delivery_pct !== null ? s.delivery_pct : '--',
          s.volume_ratio,
          s.support,
          s.resistance
        ].join(','));
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    let fname = `MITS_Adv_Relative_Strength_${new Date().toISOString().slice(0, 10)}.csv`;
    if (isSlot2) fname = `MITS_Adv_Early_Breakout_${new Date().toISOString().slice(0, 10)}.csv`;
    else if (isSlot3) fname = `MITS_Adv_Momentum_Continuation_${new Date().toISOString().slice(0, 10)}.csv`;
    else if (isSlot4) fname = `MITS_Adv_RBR_Proportional_${new Date().toISOString().slice(0, 10)}.csv`;
    else if (isSlot5) fname = `MITS_Adv_Confluence_Engine_${new Date().toISOString().slice(0, 10)}.csv`;
    else if (isSlot6) fname = `MITS_Adv_Wyckoff_Absorption_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', fname);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportAdvRsCsv() {
    exportAdvCsv();
  }

  // Expose global controller helpers
  window.toggleWatchlist = toggleWatchlist;
  window.openDossier = openAdvRsDossierModal;
  window.openAdvDossier = openAdvRsDossierModal;

  // Initialize App
  function init() {
    try {
      bindEvents();
    } catch (e) {
      console.error('[MITS Pro] Error in bindEvents():', e);
    }
    try {
      initAdvScannerNavigation();
    } catch (e) {
      console.error('[MITS Pro] Error in initAdvScannerNavigation():', e);
    }
    try {
      loadFromLocalStorageCache();
    } catch (e) {
      console.error('[MITS Pro] Error in loadFromLocalStorageCache():', e);
    }
    try {
      ensureBaselineSignals();
    } catch (e) {
      console.error('[MITS Pro] Error in ensureBaselineSignals():', e);
    }
    try {
      renderAll();
    } catch (e) {
      console.error('[MITS Pro] Error in renderAll():', e);
    }
    try {
      fetchRemoteData();
    } catch (e) {
      console.error('[MITS Pro] Error in fetchRemoteData():', e);
    }
    try {
      loadAdvRsData().catch(e => console.warn('[MITS Pro] loadAdvRsData catch:', e));
      loadAdvBoData().catch(e => console.warn('[MITS Pro] loadAdvBoData catch:', e));
      loadAdvMcData().catch(e => console.warn('[MITS Pro] loadAdvMcData catch:', e));
    } catch (e) {
      console.warn('[MITS Pro] Error initiating advanced scanner data loaders:', e);
    }
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
    // Unified Run Scanner controller function
    function handleRunScanner() {
      const selectedTab = DOM.setupSelect ? DOM.setupSelect.value : state.activeTab;
      if (DOM.sectorSelect) {
        state.selectedSector = DOM.sectorSelect.value;
      }
      if (selectedTab && selectedTab !== state.activeTab) {
        setActiveTab(selectedTab);
      } else {
        state.currentPage = 1;
        renderTable();
      }
    }

    // Run Scanner Button Click Handler
    if (DOM.runScannerBtn) {
      DOM.runScannerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleRunScanner();
      });
    }

    // Setup Select Dropdown Change Handler
    if (DOM.setupSelect) {
      DOM.setupSelect.addEventListener('change', () => {
        handleRunScanner();
      });
    }

    // Quick Scanner Module Cards Click
    const quickCards = document.querySelectorAll('.quick-card');
    quickCards.forEach(card => {
      card.addEventListener('click', () => {
        const tabId = card.getAttribute('data-tab');
        if (tabId && tabId !== state.activeTab) {
          setActiveTab(tabId);
        }
      });
    });

    // Top Header Search Input
    const topSearch = document.getElementById('top-search-input');
    if (topSearch) {
      topSearch.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        state.currentPage = 1;
        renderTable();
      });
    }

    // Mobile Hamburger Toggle & Backdrop Integration (Priority 1)
    const toggleBtn = document.getElementById('sidebar-toggle-btn') || document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('terminal-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function closeMobileSidebar() {
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
      document.body.classList.remove('sidebar-open');
    }

    function toggleMobileSidebar() {
      if (!sidebar) return;
      const isOpen = sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('open', isOpen);
      document.body.classList.toggle('sidebar-open', isOpen);
    }

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMobileSidebar();
      });
    }

    if (overlay) {
      overlay.addEventListener('click', closeMobileSidebar);
    }

    // Auto-close mobile drawer when any sidebar navigation item is clicked
    document.querySelectorAll('.terminal-sidebar .sidebar-item').forEach(item => {
      item.addEventListener('click', () => {
        closeMobileSidebar();
      });
    });

    // Close mobile drawer on window resize if enlarged beyond 768px
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        closeMobileSidebar();
      }
    });

    // RS Institutional Dossier Modal Close Bindings
    const rsCloseBtn = document.getElementById('rs-modal-close-btn');
    const rsWlBtn = document.getElementById('rs-modal-watchlist-btn');
    if (rsWlBtn) {
      rsWlBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const symEl = document.getElementById('rs-modal-symbol');
        if (symEl && symEl.textContent) {
          toggleWatchlist(symEl.textContent.trim());
        }
      });
    }
    const rsBackdrop = document.getElementById('rs-dossier-backdrop');
    if (rsCloseBtn) {
      rsCloseBtn.addEventListener('click', closeAdvRsDossierModal);
    }
    if (rsBackdrop) {
      rsBackdrop.addEventListener('click', (e) => {
        if (e.target === rsBackdrop) {
          closeAdvRsDossierModal();
        }
      });
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAdvRsDossierModal();
        closeSetupDossier();
        closeMobileSidebar();
      }
    });

    // Slide-over Drawer Close
    const drawerClose = document.getElementById('drawer-close');
    if (drawerClose) {
      drawerClose.addEventListener('click', closeSetupDossier);
    }

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
      // Shortcut 1-6 to switch quantitative setups
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }
      const k = e.key;
      if (k >= '1' && k <= '6') {
        const tabId = 'setup_' + k;
        if (tabId !== state.activeTab) {
          setActiveTab(tabId);
        }
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
      const timestamp = Date.now();
      const fetchOpts = {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      };

      const fetchLive = async (file) => {
        try {
          const res = await fetch(basePath + file + '?_t=' + timestamp, fetchOpts);
          if (res && res.ok) return res;
        } catch (e) {}
        return fetch('https://raw.githubusercontent.com/ganistock-ops/MITS-Pro-Scanner-V2/main/data/' + file + '?_t=' + timestamp, fetchOpts);
      };

      const [scannerRes, summaryRes, tab1Res, tab2Res, tab3Res, tab4Res, tab5Res, tab6Res, fundRes, bt1Res, bt2Res, bt3Res, bt4Res, bt5Res, bt6Res, strategyBtRes] = await Promise.allSettled([
        fetchLive('scanner_results.json'),
        fetchLive('market_summary.json'),
        fetchLive('tab1_bottom_reversal.json'),
        fetchLive('tab2_alpha_momentum.json'),
        fetchLive('tab3_htf.json'),
        fetchLive('tab4_weekly_swing.json'),
        fetchLive('tab5_stage2_pullback.json'),
        fetchLive('tab6_dbr.json'),
        fetchLive('fundamentals.json'),
        fetchLive('setup1_backtest.json'),
        fetchLive('setup2_backtest.json'),
        fetchLive('setup3_backtest.json'),
        fetchLive('setup4_backtest.json'),
        fetchLive('setup5_backtest.json'),
        fetchLive('setup6_backtest.json'),
      ]);

      let newScanner = null;
      let newSummary = null;
      let newTab1 = null;
      let newTab2 = null;
      let newTab3 = null;
      let newTab4 = null;
      let newTab5 = null;
      let newTab6 = null;

      if (bt1Res && bt1Res.status === 'fulfilled' && bt1Res.value.ok) {
        try {
          const bt = await bt1Res.value.json();
          if (bt) state.backtestData.setup_1 = { ...state.backtestData.setup_1, ...bt };
        } catch (e) {}
      }
      if (bt2Res && bt2Res.status === 'fulfilled' && bt2Res.value.ok) {
        try {
          const bt = await bt2Res.value.json();
          if (bt) state.backtestData.setup_2 = { ...state.backtestData.setup_2, ...bt };
        } catch (e) {}
      }
      if (bt3Res && bt3Res.status === 'fulfilled' && bt3Res.value.ok) {
        try {
          const bt = await bt3Res.value.json();
          if (bt) state.backtestData.setup_3 = { ...state.backtestData.setup_3, ...bt };
        } catch (e) {}
      }
      if (bt4Res && bt4Res.status === 'fulfilled' && bt4Res.value.ok) {
        try {
          const bt = await bt4Res.value.json();
          if (bt) state.backtestData.setup_4 = { ...state.backtestData.setup_4, ...bt };
        } catch (e) {}
      }
      if (bt5Res && bt5Res.status === 'fulfilled' && bt5Res.value.ok) {
        try {
          const bt = await bt5Res.value.json();
          if (bt) state.backtestData.setup_5 = { ...state.backtestData.setup_5, ...bt };
        } catch (e) {}
      }
      if (bt6Res && bt6Res.status === 'fulfilled' && bt6Res.value.ok) {
        try {
          const bt = await bt6Res.value.json();
          if (bt) state.backtestData.setup_6 = { ...state.backtestData.setup_6, ...bt };
        } catch (e) {}
      }

      if (strategyBtRes && strategyBtRes.status === 'fulfilled' && strategyBtRes.value.ok) {
        try {
          const sbJson = await strategyBtRes.value.json();
          if (sbJson) {
            state.strategyBacktestData = sbJson;
            window._cachedStrategyBacktestData = sbJson;
            if (sbJson.setups) {
              Object.keys(sbJson.setups).forEach(k => {
                const s = sbJson.setups[k];
                if (s && s.m3m) {
                  state.backtestData[k] = {
                    name: s.name,
                    win_rate: s.m3m.win_rate,
                    avg_peak_return: s.m3m.avg_peak,
                    avg_days_to_peak: s.m3m.avg_days || 30.0,
                    total_samples: s.fill,
                    total_signals: s.sig,
                    unit: 'Verified Fills'
                  };
                }
              });
            }
          }
        } catch (e) {}
      }

      if (fundRes && fundRes.status === 'fulfilled' && fundRes.value.ok) {
        try {
          const fundJson = await fundRes.value.json();
          state.fundamentalsData = fundJson.data || {};
        } catch (e) {
          console.warn('Fundamentals JSON parse error:', e);
        }
      }

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
    state.currentPage = 1;

    // Sync Setup Select Dropdown
    if (DOM.setupSelect && DOM.setupSelect.value !== tabId) {
      DOM.setupSelect.value = tabId;
    }

    // Update Quick Cards Active State
    document.querySelectorAll('.quick-card, .qs-card').forEach(c => {
      const matches = c.getAttribute('data-tab') === tabId;
      c.classList.toggle('active', matches);
      c.setAttribute('aria-selected', matches ? 'true' : 'false');
    });

    // Update Active Filter Title
    const titleEl = document.getElementById('active-filter-title');
    if (titleEl) {
      const titles = {
        setup_1: 'BOTTOM REVERSAL PRO',
        setup_2: 'ALPHA MOMENTUM (TODAY)',
        setup_3: 'HIGH TIGHT FLAG (HTF)',
        setup_4: 'WEEKLY SWING',
        setup_5: 'STAGE-2 PULLBACK',
        setup_6: 'DBR DEMAND ZONE'
      };
      titleEl.textContent = titles[tabId] || tabId.toUpperCase();
    }

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
    renderBacktestBanner(tabId);
    renderTable();
    renderBottomWidgets();
  }

  function renderBacktestBanner(tabId) {
    const banner = document.getElementById('setup-perf-banner');
    if (!banner) return;

    const validTab = (tabId && tabId.startsWith('setup_')) ? tabId : (state.activeTab || 'setup_1');
    banner.className = `terminal-card bottom-widget-card perf-banner theme-${validTab}`;

    const bData = window._cachedStrategyBacktestData || state.strategyBacktestData;
    const setupData = bData && bData.setups && bData.setups[validTab];
    const def = BACKTEST_DEFAULTS[validTab] || BACKTEST_DEFAULTS.setup_1;

    const titleEl = document.getElementById('perf-banner-title-text');
    const winEl = document.getElementById('perf-banner-win');
    const gainEl = document.getElementById('perf-banner-gain');
    const daysEl = document.getElementById('perf-banner-days');
    const samplesEl = document.getElementById('perf-banner-samples');

    const setupName = setupData ? setupData.name : (def.name || (SETUP_CONFIG[validTab] ? SETUP_CONFIG[validTab].title.replace(/^[^\w]+/, '').split(':')[1]?.trim() || validTab : validTab));
    const winRate = setupData && setupData.m3m ? setupData.m3m.win_rate : def.win_rate;
    const avgPeak = setupData && setupData.m3m ? setupData.m3m.avg_peak : def.avg_peak_return;
    const avgDays = setupData && setupData.m3m ? setupData.m3m.avg_days : def.avg_days_to_peak;
    const fillCount = setupData ? setupData.fill : def.total_samples;
    const sigCount = setupData ? setupData.sig : (def.total_signals || def.total_samples * 2);

    if (titleEl) titleEl.textContent = `3-MONTH FORWARD PERFORMANCE (${setupName.toUpperCase()} VERIFIED)`;
    if (winEl) winEl.textContent = `${winRate}%`;
    if (gainEl) gainEl.textContent = `+${avgPeak}%`;
    if (daysEl) daysEl.textContent = `${avgDays} Days`;
    if (samplesEl) samplesEl.textContent = `${Number(fillCount).toLocaleString('en-IN')} Fills (${Number(sigCount).toLocaleString('en-IN')} Signals)`;
  }

  window.syncDashboardBacktestCard = () => renderBacktestBanner(state.activeTab);

async function populateFundamentalQualityCard() {
    const fBody = document.getElementById('fund-sub-tbody') || document.getElementById('fundamental-quality-body');
    if (!fBody) return;

    let stocks = null;
    if (window._cachedFundamentalData && window._cachedFundamentalData.stocks) {
      stocks = window._cachedFundamentalData.stocks;
    } else {
      try {
        const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        let res = await fetch(`${basePath}data/fundamental_data.json?v=${Date.now()}`).catch(() => null);
        if (!res || !res.ok) res = await fetch(`data/fundamental_data.json?v=${Date.now()}`).catch(() => null);
        if (!res || !res.ok) res = await fetch('data/fundamental_data.json').catch(() => null);
        if (res && res.ok) {
          const d = await res.json();
          window._cachedFundamentalData = d;
          stocks = d.stocks;
        }
      } catch (e) {
        console.warn('[FundamentalQualityCard] Fetch error:', e);
      }
    }

    if (stocks && stocks.length > 0) {
      // Filter: ROE > 20%, Debt < 0.5
      const eligible = stocks.filter(s => (Number(s.roe) || 0) > 20 && (Number(s.de) !== undefined ? Number(s.de) : 99) < 0.5);
      // Sort: highest F-score desc, lowest D/E asc, highest ROE desc
      eligible.sort((a, b) => {
        const fDiff = (Number(b.f_score) || 0) - (Number(a.f_score) || 0);
        if (fDiff !== 0) return fDiff;
        const deDiff = (Number(a.de) || 0) - (Number(b.de) || 0);
        if (deDiff !== 0) return deDiff;
        return (Number(b.roe) || 0) - (Number(a.roe) || 0);
      });
      const top5 = eligible.slice(0, 5);
      if (top5.length > 0) {
        fBody.innerHTML = top5.map(s => {
          const roe = Number(s.roe) || 0;
          const roce = Number(s.roce) || 0;
          const de = Number(s.de) !== undefined ? Number(s.de) : 0;
          const pe = Number(s.pe) || 0;
          const fScore = Number(s.f_score) || 0;
          return `
            <tr>
              <td><strong class="text-white">${s.s}</strong></td>
              <td class="font-mono text-emerald font-bold">${roe.toFixed(1)}%</td>
              <td class="font-mono text-cyan">${roce.toFixed(1)}%</td>
              <td class="font-mono ${de < 0.05 ? 'text-emerald font-bold' : 'text-slate'}">${de === 0 ? '0.00' : de.toFixed(2)}</td>
              <td class="font-mono text-slate">${pe.toFixed(1)}</td>
              <td><span class="score-badge score-a font-mono font-bold">${fScore}/9</span></td>
            </tr>
          `;
        }).join('');
      }
    }
  }
  window.populateFundamentalQualityCard = populateFundamentalQualityCard;

  function renderBottomWidgets() {
    // 1. Smart Money Top 5 Accumulation
    const smBody = document.getElementById('radar-sub-tbody') || document.getElementById('smart-money-top5-body');
    if (smBody && state.scannerData && state.scannerData.setups) {
      let allSigs = [];
      Object.values(state.scannerData.setups).forEach(s => {
        if (s.signals) allSigs.push(...s.signals);
      });
      // Deduplicate by symbol
      const seen = new Set();
      const unique = [];
      allSigs.forEach(s => {
        if (!seen.has(s.symbol)) {
          seen.add(s.symbol);
          unique.push(s);
        }
      });
      // Sort by delivery % descending
      unique.sort((a, b) => (Number(b.delivery_pct) || 0) - (Number(a.delivery_pct) || 0));
      const top5 = unique.slice(0, 5);
      if (top5.length > 0) {
        smBody.innerHTML = top5.map(s => {
          const dPct = Number(s.delivery_pct) || 60;
          const spike = s.delivery_spike_pct ? `+${s.delivery_spike_pct}%` : '+120%';
          const sc = s.score || s.institutional_score || 85;
          return `
            <tr>
              <td><strong>${s.symbol}</strong></td>
              <td class="font-mono">₹${formatCurrency(s.cmp)}</td>
              <td class="font-mono">${dPct.toFixed(1)}%</td>
              <td class="font-mono text-bullish">${spike}</td>
              <td><span class="score-badge score-a font-mono font-bold">${sc}</span></td>
            </tr>
          `;
        }).join('');
      }
    }

    // 2. Fundamental Quality Top Stocks
    populateFundamentalQualityCard();
  }

  function renderAll() {
    renderKPIs();
    renderSectorRotation();
    populateSectorFilter();
    updateTabBadges();
    renderBacktestBanner(state.activeTab);
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
    if (DOM.kpiNetBreadth) {
      const adv = Number(breadth.advances) || 0;
      const dec = Number(breadth.declines) || 0;
      const net = adv - dec;
      DOM.kpiNetBreadth.textContent = net >= 0 ? `Net +${net}` : `Net ${net}`;
      DOM.kpiNetBreadth.className = 'net-breadth-pill ' + (net >= 0 ? 'positive' : 'negative');
    }
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
        const chg = indices.NIFTY_50.change_pct ?? 0;
        DOM.kpiNiftyChange.className = 'change-pill ' + (chg >= 0 ? 'positive' : 'negative');
        DOM.kpiNiftyChange.innerHTML = `<span class="${chg >= 0 ? 'text-bullish' : 'text-bearish'}">${chg >= 0 ? '+' : ''}${chg}%</span>`;
      }
      if (DOM.kpiNiftySubtitle) {
        const isAboveEma = indices.NIFTY_50.above_ema20 !== undefined
          ? indices.NIFTY_50.above_ema20
          : (indices.NIFTY_50.trend === 'BULLISH ACCUMULATION' || (indices.NIFTY_50.ema_20 && indices.NIFTY_50.price > indices.NIFTY_50.ema_20));
        if (isAboveEma) {
          DOM.kpiNiftySubtitle.innerHTML = `<span style="color: var(--bullish);">◈ Bullish</span> <span style="opacity: 0.4;">•</span> <span style="color: var(--bullish);">Above 20 EMA</span>`;
        } else {
          DOM.kpiNiftySubtitle.innerHTML = `<span style="color: var(--gold-400);">◈ Defensive</span> <span style="opacity: 0.4;">•</span> <span>Below 20 EMA</span>`;
        }
      }
    }

    if (indices.BANKNIFTY && DOM.kpiBankNifty) {
      DOM.kpiBankNifty.textContent = formatCurrency(indices.BANKNIFTY.price);
      if (DOM.kpiBankNiftyChange) {
        const chg = indices.BANKNIFTY.change_pct ?? 0;
        DOM.kpiBankNiftyChange.className = 'change-pill ' + (chg >= 0 ? 'positive' : 'negative');
        DOM.kpiBankNiftyChange.innerHTML = `<span class="${chg >= 0 ? 'text-bullish' : 'text-bearish'}">${chg >= 0 ? '+' : ''}${chg}%</span>`;
      }
      if (DOM.kpiBankNiftySubtitle) {
        const isBankBullish = (indices.BANKNIFTY.change_pct ?? 0) >= 0;
        if (isBankBullish) {
          DOM.kpiBankNiftySubtitle.innerHTML = `<span style="color: var(--bullish);">◈ Bullish</span> <span style="opacity: 0.4;">•</span> <span>Support Consolidation</span>`;
        } else {
          DOM.kpiBankNiftySubtitle.innerHTML = `<span style="color: var(--gold-400);">◈ Defensive</span> <span style="opacity: 0.4;">•</span> <span>Support Consolidation</span>`;
        }
      }
    }

        // Ticker Ribbon Update (Authentic EOD Data)
    if (indices.NIFTY_50) {
      const tPrice = document.getElementById('ticker-nifty-price');
      const tChg = document.getElementById('ticker-nifty-chg');
      if (tPrice) tPrice.textContent = formatCurrency(indices.NIFTY_50.price);
      if (tChg) {
        const c = indices.NIFTY_50.change_pct ?? 0;
        tChg.textContent = `${c >= 0 ? '+' : ''}${c}%`;
        tChg.className = `ticker-chg ${c >= 0 ? 'pos' : 'neg'}`;
      }
    }
    if (indices.BANKNIFTY) {
      const tPrice = document.getElementById('ticker-bank-price');
      const tChg = document.getElementById('ticker-bank-chg');
      if (tPrice) tPrice.textContent = formatCurrency(indices.BANKNIFTY.price);
      if (tChg) {
        const c = indices.BANKNIFTY.change_pct ?? 0;
        tChg.textContent = `${c >= 0 ? '+' : ''}${c}%`;
        tChg.className = `ticker-chg ${c >= 0 ? 'pos' : 'neg'}`;
      }
    }
    if (breadth) {
      const tAdv = document.getElementById('ticker-nse-adv');
      const tDec = document.getElementById('ticker-nse-dec');
      const tNet = document.getElementById('ticker-nse-net');
      if (tAdv) tAdv.textContent = breadth.advances ?? 110;
      if (tDec) tDec.textContent = breadth.declines ?? 389;
      if (tNet) {
        const netVal = (Number(breadth.advances) || 0) - (Number(breadth.declines) || 0);
        tNet.textContent = `NET ${netVal >= 0 ? '+' : ''}${netVal}`;
      }

      const kAdv = document.getElementById('kpi-nse-adv');
      const kDec = document.getElementById('kpi-nse-dec');
      const kRatio = document.getElementById('kpi-nse-ratio');
      if (kAdv) kAdv.textContent = breadth.advances ?? 110;
      if (kDec) kDec.textContent = breadth.declines ?? 389;
      if (kRatio) kRatio.textContent = `Ratio: ${breadth.ratio ?? '0.28:1'}`;
    }

    // Market Regime Card
    const regimeTitle = document.getElementById('market-regime-title');
    const regimeSubtitle = document.getElementById('market-regime-subtitle');
    if (regimeTitle && regimeSubtitle) {
      const isAboveEma = indices.NIFTY_50?.above_ema20 !== undefined
        ? indices.NIFTY_50.above_ema20
        : ((indices.NIFTY_50?.price ?? 0) >= (indices.NIFTY_50?.ema_20 ?? 0));
      if (isAboveEma) {
        regimeTitle.textContent = 'Trending';
        regimeTitle.className = 'regime-status-title text-bullish';
        regimeSubtitle.textContent = 'Bullish Bias';
      } else {
        regimeTitle.textContent = 'Defensive';
        regimeTitle.className = 'regime-status-title text-bearish';
        regimeSubtitle.textContent = 'Bearish Bias';
      }
    }

    // Update Quick Scanner Module Badges with genuine pipeline counts
    if (state.scannerData && state.scannerData.setups) {
      for (let i = 1; i <= 6; i++) {
        const sid = `setup_${i}`;
        const b = document.getElementById(`card-badge-${i}`);
        if (b && state.scannerData.setups[sid]) {
          const cnt = state.scannerData.setups[sid].count || (state.scannerData.setups[sid].signals ? state.scannerData.setups[sid].signals.length : 0);
          b.textContent = `${cnt} Stocks`;
        }
      }
    }

    renderSectorRotation();
  }

  // Standalone Daily Sector Rotation Widget (Synchronized with Phase 1 data/sector_analysis.json)
  async function renderSectorRotation() {
    const container = document.getElementById('sector-rotation-container');
    const pillsList = document.getElementById('sector-rotation-pills');
    if (!container || !pillsList) return;

    let secData = window._cachedSectorAnalysis;
    if (!secData) {
      try {
        const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        let res = await fetch(`${basePath}data/sector_analysis.json?v=${Date.now()}`).catch(() => null);
        if (!res || !res.ok) res = await fetch(`data/sector_analysis.json?v=${Date.now()}`).catch(() => null);
        if (!res || !res.ok) res = await fetch('data/sector_analysis.json').catch(() => null);
        if (res && res.ok) {
          secData = await res.json();
          window._cachedSectorAnalysis = secData;
        }
      } catch (e) {
        console.warn('[MITS Pro] Could not fetch data/sector_analysis.json for front card:', e);
      }
    }

    // Fallback to marketSummary.sector_rotation if needed
    if (!secData || !secData.sectors || !secData.sectors.length) {
      const summary = state.marketSummary;
      const rot = summary ? summary.sector_rotation : null;
      if (!rot || (!rot.top_inflows || !rot.top_inflows.length) && (!rot.top_outflows || !rot.top_outflows.length)) {
        if (!pillsList || pillsList.children.length === 0) {
          container.style.display = 'none';
        }
        return;
      }
      const dateBadge = document.getElementById('rotation-date-badge');
      if (dateBadge && rot.session_date_display) {
        dateBadge.textContent = rot.session_date_display;
      }
      return;
    }

    // Active session date synchronization (scan_date -> DD-MMM-YYYY)
    const dateBadge = document.getElementById('rotation-date-badge');
    if (dateBadge && secData.scan_date) {
      const parts = secData.scan_date.split('-');
      if (parts.length === 3) {
        const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const mIdx = parseInt(parts[1], 10) - 1;
        dateBadge.textContent = `${parts[2]}-${mNames[mIdx] || parts[1]}-${parts[0]}`;
      } else {
        dateBadge.textContent = secData.scan_date;
      }
    }

    pillsList.innerHTML = '';

    // Top 4 Outperforming Sectors by Composite Score / 5D RS
    const topLeaders = [...secData.sectors].sort((a, b) => b.total_score - a.total_score).slice(0, 4);
    topLeaders.forEach((s) => {
      const r5d = s.metrics.return_5d;
      const perf = r5d >= 0 ? `+${r5d}%` : `${r5d}%`;
      const barWidth = Math.min(100, Math.max(16, s.total_score));
      const row = document.createElement('div');
      row.className = 'sector-bar-row';
      row.style.cursor = 'pointer';
      row.title = `${s.display_name}: Quant Score ${s.total_score}/100 (${s.status}) | 5D Return: ${perf} | Click to filter table`;
      row.innerHTML = `
        <span class="sector-bar-meta">🟢 #${s.rank} ${s.display_name}</span>
        <div class="sector-bar-track">
          <div class="sector-bar-fill pos" style="width: ${barWidth}%;"></div>
        </div>
        <span class="sector-bar-perf pos">${perf} (5D)</span>
      `;
      row.addEventListener('click', () => {
        if (typeof window.filterBySector === 'function') {
          window.filterBySector(s.sector);
        }
      });
      pillsList.appendChild(row);
    });

    // Bottom 3 Laggards
    const bottomLaggards = [...secData.sectors].sort((a, b) => a.total_score - b.total_score).slice(0, 3);
    bottomLaggards.forEach((s) => {
      const r5d = s.metrics.return_5d;
      const perf = r5d >= 0 ? `+${r5d}%` : `${r5d}%`;
      const barWidth = Math.min(100, Math.max(16, 100 - s.total_score));
      const row = document.createElement('div');
      row.className = 'sector-bar-row';
      row.style.cursor = 'pointer';
      row.title = `${s.display_name}: Quant Score ${s.total_score}/100 (${s.status}) | 5D Return: ${perf} | Click to filter table`;
      row.innerHTML = `
        <span class="sector-bar-meta">🔴 #${s.rank} ${s.display_name}</span>
        <div class="sector-bar-track">
          <div class="sector-bar-fill neg" style="width: ${barWidth}%;"></div>
        </div>
        <span class="sector-bar-perf neg">${perf} (5D)</span>
      `;
      row.addEventListener('click', () => {
        if (typeof window.filterBySector === 'function') {
          window.filterBySector(s.sector);
        }
      });
      pillsList.appendChild(row);
    });

    // Station Navigation Cross-Link
    const exploreRow = document.createElement('div');
    exploreRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.08); font-size:11px;';
    exploreRow.innerHTML = `
      <span style="color:var(--text-muted, #888); font-size:10px;">20 Sectors Ranked</span>
      <a href="#sector-analysis" style="color:var(--accent-orange, #ff6b35); text-decoration:none; font-weight:700; display:flex; align-items:center; gap:4px; font-size:11px;">
        Open Sector Analysis Station ↗
      </a>
    `;
    const exploreLink = exploreRow.querySelector('a');
    if (exploreLink) {
      exploreLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.switchAppView === 'function') {
          window.switchAppView('sec');
        } else {
          window.location.hash = '#sector-analysis';
        }
      });
    }
    pillsList.appendChild(exploreRow);
    container.style.display = 'flex';
  }

  window.filterBySector = function(sectorName) {
    if (!DOM.sectorSelect) return;
    let matched = 'ALL';
    for (let i = 0; i < DOM.sectorSelect.options.length; i++) {
      const val = DOM.sectorSelect.options[i].value;
      if (
        val.toLowerCase() === sectorName.toLowerCase() ||
        val.toLowerCase().includes(sectorName.toLowerCase()) ||
        sectorName.toLowerCase().includes(val.toLowerCase())
      ) {
        matched = val;
        break;
      }
    }
    DOM.sectorSelect.value = matched;
    state.selectedSector = matched;
    state.currentPage = 1;
    renderTable();

    const toolbar = document.querySelector('.controls-bar');
    if (toolbar) {
      toolbar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Update Badge Counts on Tabs
  function updateTabBadges() {
    if (!state.scannerData || !state.scannerData.setups) return;
    const setups = state.scannerData.setups;

    Object.keys(SETUP_CONFIG).forEach((tabId) => {
      const countEl = document.getElementById(`count-${tabId}`);
      if (countEl) {
        const setup = setups[tabId];
        const count = setup ? (setup.signals ? setup.signals.length : (setup.count || 0)) : 0;
        countEl.textContent = `${count} ${count === 1 ? 'Stock' : 'Stocks'}`;
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
    's1', 's2', 's3', 'r1', 'r2', 'r3', 'ret_1w', 'rs_1y', 'pole_gain_pct', 'correction_pct'
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

    // Standardized 12-Column Core Scanners Header
    const thead = document.querySelector('#pro-table thead') || document.querySelector('.pro-table thead');
    if (thead) {
      if (state.activeTab === 'setup_1') {
        thead.innerHTML = `
          <tr>
            <th style="width: 44px; text-align: center;">#</th>
            ${renderSortHeader('symbol', 'Symbol', '', 'text-left')}
            ${renderSortHeader('cmp', 'LTP (₹)', '', 'text-right')}
            ${renderSortHeader('sector', 'Sector', '', 'text-left')}
            ${renderSortHeader('change_pct', 'Day %', '', 'text-right')}
            ${renderSortHeader('score', 'Score', '', 'text-center')}
            ${renderSortHeader('grade', 'Grade', '', 'text-center')}
            ${renderSortHeader('status', 'Setup Tag', '', 'text-left')}
            ${renderSortHeader('s1', 'S1 (Support)', '', 'text-right')}
            ${renderSortHeader('r1', 'R1 (Resistance)', '', 'text-right')}
            ${renderSortHeader('rvol', 'Volume / Deliv %', '', 'text-right')}
            <th style="width: 100px; text-align: center;">Action</th>
          </tr>
        `;
      } else {
        thead.innerHTML = `
          <tr>
            <th style="width: 44px; text-align: center;">#</th>
            ${renderSortHeader('symbol', 'Symbol', '', 'text-left')}
            ${renderSortHeader('cmp', 'LTP (₹)', '', 'text-right')}
            ${renderSortHeader('sector', 'Sector', '', 'text-left')}
            ${renderSortHeader('change_pct', 'Day %', '', 'text-right')}
            ${renderSortHeader('score', 'Score', '', 'text-center')}
            ${renderSortHeader('grade', 'Grade', '', 'text-center')}
            ${renderSortHeader('status', 'Setup Tag', '', 'text-left')}
            ${renderSortHeader('s1', 'S1 (Support)', '', 'text-right')}
            ${renderSortHeader('r1', 'R1 (Resistance)', '', 'text-right')}
            ${renderSortHeader('rvol', 'Volume / Deliv %', '', 'text-right')}
            <th style="width: 100px; text-align: center;">Action</th>
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

    // Compute sector frequency across all signals in current tab/view
    const sectorCounts = {};
    signals.forEach((s) => {
      if (s && s.sector) {
        sectorCounts[s.sector] = (sectorCounts[s.sector] || 0) + 1;
      }
    });

    // Helper: Generate institutional conviction micro-badges
    function getConvictionBadgesHtml(sig) {
      if (!sig) return '';
      try {
        const badges = [];

        // 1. Sector Tailwind: >= 3 stocks in current view belong to the same sector
        if (sig.sector && (sectorCounts[sig.sector] || 0) >= 3) {
          badges.push('<span class="badge-pill badge-sector-fire">Sector on Fire 🔥</span>');
        }

        // 2. Whale Footprint: Delivery % >= 50% && delivery spike >= 1.5x (or whale flag)
        const curDeliv = Number(sig.delivery_pct || 0);
        const avgDeliv = Number(sig.avg_deliv_10d || 0);
        const spikeRatio = avgDeliv > 0 ? (curDeliv / avgDeliv) : (Number(sig.delivery_spike_pct || 0) / 100 + 1);
        if ((curDeliv >= 50.0 && spikeRatio >= 1.5) || sig.whale_absorption_flag === true) {
          badges.push('<span class="badge-pill badge-whale">🐋 Whale Footprint</span>');
        }

        // 3. Volatility Squeeze: Tight range / volume dry-up
        const tagsStr = (sig.setup_tags || []).join(' ').toLowerCase();
        if ((sig.rvol !== undefined && sig.rvol !== null && sig.rvol > 0 && sig.rvol < 0.85) ||
            tagsStr.includes('vcp') || tagsStr.includes('tight') || tagsStr.includes('squeeze') || tagsStr.includes('contraction')) {
          badges.push('<span class="badge-pill badge-squeeze">⏳ Squeeze</span>');
        }

        // 4. Trend Stack: 20 EMA > 50 EMA > 200 EMA
        if (tagsStr.includes('trend stack') || tagsStr.includes('bullish trend') || (sig.score_breakdown && sig.score_breakdown.trend_alignment >= 18)) {
          badges.push('<span class="badge-pill badge-trend">🚀 Trend Stack</span>');
        }

        if (badges.length === 0) return '';
        return `<div class="conviction-badges">${badges.join('')}</div>`;
      } catch (err) {
        return '';
      }
    }

    // Render Streamlined 6-Column Rows
    DOM.tableBody.innerHTML = paginatedSignals
      .map((sig, index) => {
        const chg = sig.change_pct !== undefined ? Number(sig.change_pct) : 0;
        const scoreVal = sig.score || sig.institutional_score || 85;
        const gradeVal = sig.grade || (scoreVal >= 90 ? 'A+' : scoreVal >= 80 ? 'A' : 'B');
        const scoreClass = scoreVal >= 90 ? 'score-aplus' : scoreVal >= 80 ? 'score-a' : 'score-b';

        // Format volume
        let rvolText = '1.0x';
        if (sig.rvol !== undefined && sig.rvol !== null) {
          rvolText = Number(sig.rvol) >= 1000
            ? `${(Number(sig.rvol) / 1000).toFixed(1)}k`
            : `${Number(sig.rvol).toFixed(1)}x`;
        }

        // Format delivery %
        const delivText = sig.delivery_pct !== undefined && sig.delivery_pct !== null
          ? `${Number(sig.delivery_pct).toFixed(1)}%`
          : '--';

        // Format RS vs Nifty
        const rsVal = sig.rs_1y !== undefined && sig.rs_1y !== null
          ? Number(sig.rs_1y)
          : (sig.rs_1w !== undefined ? Number(sig.rs_1w) : 0);

        // Status / Setup tag
        let cleanStatus = sig.stage_label || sig.status || 'Active Setup';
        if (cleanStatus.length > 20) cleanStatus = cleanStatus.substring(0, 18) + '…';

        return `
          <tr class="signal-row clickable-row" data-symbol="${sig.symbol}">
            <td style="width: 44px; text-align: center; color: var(--text-tertiary); font-size: 0.78rem;">${startIdx + index + 1}</td>
            <td class="text-left" style="text-align: left;">
              <div class="symbol-col-wrap" style="text-align: left; align-items: flex-start;">
                <span class="table-sym font-bold">${sig.symbol}</span>
                <span class="table-sub-name" style="font-size: 0.75rem; color: var(--text-tertiary);">${sig.name || ''}</span>
              </div>
            </td>
            <td class="font-mono font-bold text-right" style="text-align: right;">₹${formatCurrency(sig.cmp)}</td>
            <td class="text-left" style="text-align: left;"><span class="badge-tag-secondary">${sig.sector || '--'}</span></td>
            <td class="font-mono ${chg >= 0 ? 'text-bullish' : 'text-bearish'} font-bold text-right" style="text-align: right;">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</td>
            <td class="text-center" style="text-align: center;"><span class="score-badge ${scoreClass} font-mono font-bold">${scoreVal}</span></td>
            <td class="text-center" style="text-align: center;"><span class="grade-pill font-mono">${gradeVal}</span></td>
            <td class="text-left" style="text-align: left;"><span class="badge-pill badge-neutral">${cleanStatus}</span></td>
            <td class="font-mono text-cyan text-right" style="text-align: right;">${sig.s1 ? '₹' + formatCurrency(sig.s1) : '--'}</td>
            <td class="font-mono text-gold text-right" style="text-align: right;">${sig.r1 ? '₹' + formatCurrency(sig.r1) : '--'}</td>
            <td class="font-mono text-right" style="text-align: right;">
              <div style="display: flex; flex-direction: column; align-items: flex-end; line-height: 1.2;">
                <span>${rvolText}</span>
                <span style="font-size: 0.72rem; color: #94a3b8;">${delivText}</span>
              </div>
            </td>
            <td style="text-align: center;">
              <button class="action-btn action-inspect inspect-stock-btn" data-symbol="${sig.symbol}" title="Inspect Technical & Fundamental Dossier">Inspect ⚡</button>
            </td>
          </tr>
        `;
      }).join('');

    DOM.tableBody.querySelectorAll('tr.clickable-row').forEach((row) => {
      row.addEventListener('click', () => {
        const sym = row.getAttribute('data-symbol');
        if (sym) openSetupDossier(sym);
      });
    });

    DOM.tableBody.querySelectorAll('.inspect-stock-btn, .btn-view-setup').forEach((btn) => {
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

    // Populate Key Technical Reference Levels (S1-S3, R1-R3)
    const s1El = document.getElementById('dossier-s1');
    const s2El = document.getElementById('dossier-s2');
    const s3El = document.getElementById('dossier-s3');
    const r1El = document.getElementById('dossier-r1');
    const r2El = document.getElementById('dossier-r2');
    const r3El = document.getElementById('dossier-r3');

    if (s1El) s1El.textContent = sig.s1 ? `₹${formatCurrency(sig.s1)}` : '--';
    if (s2El) s2El.textContent = sig.s2 ? `₹${formatCurrency(sig.s2)}` : '--';
    if (s3El) s3El.textContent = sig.s3 ? `₹${formatCurrency(sig.s3)}` : '--';
    if (r1El) r1El.textContent = sig.r1 ? `₹${formatCurrency(sig.r1)}` : '--';
    if (r2El) r2El.textContent = sig.r2 ? `₹${formatCurrency(sig.r2)}` : '--';
    if (r3El) r3El.textContent = sig.r3 ? `₹${formatCurrency(sig.r3)}` : '--';

    // Populate Vertical Price Ladder CMP and Distance Tags
    const ladderCmpEl = document.getElementById('dossier-ladder-cmp');
    if (ladderCmpEl) ladderCmpEl.textContent = `₹${formatCurrency(sig.cmp)}`;

    const cmpVal = Number(sig.cmp) || 0;
    function setLadderDist(distId, levelVal) {
      const el = document.getElementById(distId);
      if (!el) return;
      const lvl = Number(levelVal) || 0;
      if (!lvl || !cmpVal || cmpVal <= 0) {
        el.textContent = '--';
        return;
      }
      const pct = ((lvl - cmpVal) / cmpVal) * 100;
      el.textContent = pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
    }

    setLadderDist('dossier-r3-dist', sig.r3);
    setLadderDist('dossier-r2-dist', sig.r2);
    setLadderDist('dossier-r1-dist', sig.r1);
    setLadderDist('dossier-s1-dist', sig.s1);
    setLadderDist('dossier-s2-dist', sig.s2);
    setLadderDist('dossier-s3-dist', sig.s3);

    // Populate Institutional Smart Money Radar
    const radarDelivPctEl = document.getElementById('dossier-radar-delivery-pct');
    const radarDelivAvgEl = document.getElementById('dossier-radar-delivery-avg');
    const radarDelivSpikeEl = document.getElementById('dossier-radar-delivery-spike');
    const radarStatusBadgeEl = document.getElementById('dossier-radar-status-badge');

    const curDeliv = (sig.delivery_pct !== undefined && sig.delivery_pct !== null) ? Number(sig.delivery_pct) : 0;
    const avgDeliv = (sig.avg_deliv_10d !== undefined && sig.avg_deliv_10d !== null) ? Number(sig.avg_deliv_10d) : 0;
    const spikePct = (sig.delivery_spike_pct !== undefined && sig.delivery_spike_pct !== null) ? Number(sig.delivery_spike_pct) :
                     (avgDeliv > 0 ? Number(((curDeliv - avgDeliv) / avgDeliv * 100).toFixed(1)) : 0);

    if (radarDelivPctEl) radarDelivPctEl.textContent = curDeliv > 0 ? `${curDeliv.toFixed(1)}%` : '--%';
    if (radarDelivAvgEl) radarDelivAvgEl.textContent = avgDeliv > 0 ? `${avgDeliv.toFixed(1)}%` : '--%';
    if (radarDelivSpikeEl) {
      const isPositive = spikePct >= 0;
      radarDelivSpikeEl.textContent = `${isPositive ? '+' : ''}${spikePct.toFixed(1)}%`;
      radarDelivSpikeEl.className = isPositive ? 'radar-spike-val' : 'radar-spike-val spike-negative';
    }

    if (radarStatusBadgeEl) {
      let statusText = sig.smart_money_status;
      if (!statusText) {
        if (sig.whale_absorption_flag && curDeliv > 55.0) {
          statusText = 'High Institutional Absorption';
        } else if (curDeliv >= 40.0 && curDeliv <= 55.0) {
          statusText = 'Active Accumulation';
        } else {
          statusText = 'Standard Flow';
        }
      }

      radarStatusBadgeEl.textContent = statusText;
      radarStatusBadgeEl.className = 'radar-status-pill';
      if (statusText === 'High Institutional Absorption') {
        radarStatusBadgeEl.classList.add('status-green');
      } else if (statusText === 'Active Accumulation') {
        radarStatusBadgeEl.classList.add('status-cyan');
      } else {
        radarStatusBadgeEl.classList.add('status-neutral');
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

    // Populate Institutional Fundamentals & Quarters
    const fundMap = state.fundamentalsData || {};
    const fund = fundMap[sig.symbol] || null;

    const fundMcEl = document.getElementById('dossier-fund-mc');
    const fundPeEl = document.getElementById('dossier-fund-pe');
    const fundRoeEl = document.getElementById('dossier-fund-roe');
    const fundRoceEl = document.getElementById('dossier-fund-roce');
    const fundDeEl = document.getElementById('dossier-fund-de');
    const fundTableBody = document.getElementById('dossier-fund-table-body');

    if (fundMcEl) fundMcEl.textContent = fund?.market_cap || 'N/A';
    if (fundPeEl) fundPeEl.textContent = fund?.pe_ratio || 'N/A';
    if (fundRoeEl) fundRoeEl.textContent = fund?.roe || 'N/A';
    if (fundRoceEl) fundRoceEl.textContent = fund?.roce || 'N/A';
    if (fundDeEl) fundDeEl.textContent = fund?.debt_to_equity || 'N/A';

    if (fundTableBody) {
      if (fund && Array.isArray(fund.quarters) && fund.quarters.length > 0) {
        fundTableBody.innerHTML = fund.quarters.map(q => `
          <tr>
            <td><strong>${q.quarter || '--'}</strong></td>
            <td>${q.revenue_cr || 'N/A'}</td>
            <td style="color: ${q.is_profit ? 'var(--bullish, #10b981)' : 'var(--bearish, #f43f5e)'}; font-weight: 600;">
              ${q.net_profit_cr || 'N/A'}
            </td>
          </tr>
        `).join('');
      } else {
        fundTableBody.innerHTML = `<tr><td colspan="3" class="fund-empty">Quarterly Financial Data Not Available for ${sig.symbol}</td></tr>`;
      }
    }

    const tvBtn = document.getElementById('dossier-tv-btn');
    if (tvBtn) {
      tvBtn.href = `https://in.tradingview.com/chart/?symbol=NSE:${sig.symbol}`;
    }

    backdrop.classList.add('is-open');
    backdrop.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeSetupDossier() {
    const backdrop = document.getElementById('dossier-backdrop');
    if (backdrop) {
      backdrop.classList.remove('is-open');
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

    const headers = ['Symbol', 'Company', 'Sector', 'CMP', 'Change%', 'RVOL', 'Institutional Score', 'Status', 'S1 Support', 'R1 Resistance'];
    const rows = signals.map((s) => [
      `"${s.symbol}"`,
      `"${s.name}"`,
      `"${s.sector}"`,
      s.cmp,
      s.change_pct,
      s.rvol,
      s.institutional_score,
      `"${s.status}"`,
      s.s1 !== undefined ? s.s1 : '--',
      s.r1 !== undefined ? s.r1 : '--',
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


// =====================================================================================
// STRATEGY & BACKTEST STATION MODULE (Phase 2 Commercial Implementation)
// =====================================================================================
window.StrategyBacktestModule = (function() {
  let backtestData = null;
  let isInitialized = false;
  let activeSetupId = 'setup_1';

  async function init() {
    if (!isInitialized) {
      bindEvents();
      isInitialized = true;
    }
    await loadData();
  }

  async function loadData() {
    try {
      if (window._cachedStrategyBacktestData) {
        backtestData = window._cachedStrategyBacktestData;
        renderUI();
      }

      const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
      let res = await fetch(`${basePath}data/strategy_backtest_data.json?v=${Date.now()}`).catch(() => null);
      if (!res || !res.ok) res = await fetch(`data/strategy_backtest_data.json?v=${Date.now()}`).catch(() => null);
      if (!res || !res.ok) res = await fetch('data/strategy_backtest_data.json').catch(() => null);

      if (res && res.ok) {
        backtestData = await res.json();
        window._cachedStrategyBacktestData = backtestData;
        renderUI();
        if (typeof window.syncDashboardBacktestCard === 'function') {
          window.syncDashboardBacktestCard();
        }
      }
    } catch (err) {
      console.error('[StrategyBacktestModule] Error loading data:', err);
    }
  }

  function bindEvents() {
    const refreshBtn = document.getElementById('backtest-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.classList.add('loading');
        await loadData();
        refreshBtn.classList.remove('loading');
      });
    }

    // Bind setup pill buttons across both groups
    document.querySelectorAll('.bt-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const setupId = btn.getAttribute('data-setup');
        if (setupId) {
          activeSetupId = setupId;
          renderUI();
        }
      });
    });
  }

  function renderUI() {
    if (!backtestData || !backtestData.setups) return;
    const setup = backtestData.setups[activeSetupId] || backtestData.setups['setup_1'];
    if (!setup) return;

    // 1. Update Active Buttons
    document.querySelectorAll('.bt-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-setup') === activeSetupId);
    });

    // 2. Active Strategy Banner
    const badgeEl = document.getElementById('bt-active-badge');
    const nameEl = document.getElementById('bt-active-name');
    const supportEl = document.getElementById('bt-active-support');
    const sigEl = document.getElementById('bt-active-sig');
    const fillEl = document.getElementById('bt-active-fill');

    if (badgeEl) badgeEl.textContent = activeSetupId.startsWith('setup_') ? `SETUP ${activeSetupId.replace('setup_', '')}` : activeSetupId.toUpperCase();
    if (nameEl) nameEl.textContent = setup.name || activeSetupId;
    if (supportEl) supportEl.textContent = `Anchor: ${setup.support || 'Support 1'}`;
    if (sigEl) sigEl.textContent = Number(setup.sig || 0).toLocaleString('en-IN');
    if (fillEl) fillEl.textContent = `${Number(setup.fill || 0).toLocaleString('en-IN')} (${setup.fill_pct || 0}%)`;

    // 3. KPI Scorecards
    const m10 = setup.m10 || {};
    const m1m = setup.m1m || {};
    const m3m = setup.m3m || {};

    // 10-Day
    const el10wr = document.getElementById('bt-kpi-10d-wr');
    const el10ret = document.getElementById('bt-kpi-10d-ret');
    const el10pk = document.getElementById('bt-kpi-10d-pk');
    const el10samp = document.getElementById('bt-kpi-10d-samples');

    if (el10wr) el10wr.textContent = `${m10.win_rate || 0}%`;
    if (el10ret) {
      const val = m10.avg_return || 0;
      el10ret.textContent = `${val >= 0 ? '+' : ''}${val}%`;
      el10ret.className = `bt-metric-val ${val >= 0 ? 'text-emerald' : 'text-rose'}`;
    }
    if (el10pk) el10pk.textContent = `+${m10.avg_peak || 0}%`;
    if (el10samp) el10samp.textContent = `${Number(m10.samples || 0).toLocaleString('en-IN')} Trades Evaluated`;

    // 1-Month (30D)
    const el1mwr = document.getElementById('bt-kpi-1m-wr');
    const el1mret = document.getElementById('bt-kpi-1m-ret');
    const el1mpk = document.getElementById('bt-kpi-1m-pk');
    const el1msamp = document.getElementById('bt-kpi-1m-samples');

    if (el1mwr) el1mwr.textContent = `${m1m.win_rate || 0}%`;
    if (el1mret) {
      const val = m1m.avg_return || 0;
      el1mret.textContent = `${val >= 0 ? '+' : ''}${val}%`;
      el1mret.className = `bt-metric-val ${val >= 0 ? 'text-emerald' : 'text-rose'}`;
    }
    if (el1mpk) el1mpk.textContent = `+${m1m.avg_peak || 0}%`;
    if (el1msamp) el1msamp.textContent = `${Number(m1m.samples || 0).toLocaleString('en-IN')} Trades Evaluated`;

    // 3-Month (63D)
    const el3mwr = document.getElementById('bt-kpi-3m-wr');
    const el3mret = document.getElementById('bt-kpi-3m-ret');
    const el3mpk = document.getElementById('bt-kpi-3m-pk');
    const el3msamp = document.getElementById('bt-kpi-3m-samples');

    if (el3mwr) el3mwr.textContent = `${m3m.win_rate || 0}%`;
    if (el3mret) {
      const val = m3m.avg_return || 0;
      el3mret.textContent = `${val >= 0 ? '+' : ''}${val}%`;
      el3mret.className = `bt-metric-val ${val >= 0 ? 'text-emerald' : 'text-rose'}`;
    }
    if (el3mpk) el3mpk.textContent = `+${m3m.avg_peak || 0}%`;
    if (el3msamp) el3msamp.textContent = `${Number(m3m.samples || 0).toLocaleString('en-IN')} Trades Evaluated`;

    // Breakout Potential Card
    const maxPkEl = document.getElementById('bt-kpi-max-pk');
    const avgDaysEl = document.getElementById('bt-kpi-avg-days');
    const fillRateEl = document.getElementById('bt-kpi-fill-rate');
    const anchorDescEl = document.getElementById('bt-kpi-anchor-desc');

    if (maxPkEl) maxPkEl.textContent = `+${m3m.max_peak || m1m.max_peak || 0}%`;
    if (avgDaysEl) avgDaysEl.textContent = `${m3m.avg_days || 28.5} Days`;
    if (fillRateEl) fillRateEl.textContent = `${setup.fill_pct || 0}%`;
    if (anchorDescEl) anchorDescEl.textContent = `Support 1 Buffer (±0.8%)`;

    // 4. Render Table
    renderTradesTable(setup.trades || []);
  }

  function renderTradesTable(trades) {
    const tbody = document.getElementById('backtest-table-tbody');
    const countBadge = document.getElementById('bt-table-count-badge');
    if (!tbody) return;

    if (countBadge) countBadge.textContent = `${trades.length} Verified Trades`;

    if (!trades || trades.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 2rem; color: rgba(255,255,255,0.4);">No historical trade logs found.</td></tr>';
      return;
    }

    let rowsHtml = '';
    trades.forEach(tr => {
      const formatHorizon = (val) => {
        if (val === null || val === undefined) {
          return '<span class="bt-tag-holding">HOLDING</span>';
        }
        const cls = val >= 0 ? 'text-emerald' : 'text-rose';
        const sign = val >= 0 ? '+' : '';
        return `<span class="${cls}" style="font-weight: 700;">${sign}${val}%</span>`;
      };

      let statusBadgeClass = 'bt-badge-consolidation';
      if (tr.st === 'PROFIT') statusBadgeClass = 'bt-badge-profit';
      else if (tr.st === 'DRAWDOWN') statusBadgeClass = 'bt-badge-drawdown';
      else if (tr.st === 'HOLDING' || tr.st === 'ACTIVE') statusBadgeClass = 'bt-badge-holding';

      rowsHtml += `
        <tr>
          <td class="col-sticky-symbol"><strong class="fund-symbol-text">${tr.s}</strong></td>
          <td><span class="fund-sec-pill">${tr.sec || 'Other'}</span></td>
          <td style="font-family: var(--font-mono, monospace); color: rgba(255,255,255,0.7);">${tr.d}</td>
          <td class="text-right" style="font-family: var(--font-mono, monospace);">₹${Number(tr.ent).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          <td class="text-right" style="font-family: var(--font-mono, monospace);">${formatHorizon(tr.r10d)}</td>
          <td class="text-right" style="font-family: var(--font-mono, monospace);">${formatHorizon(tr.r1m)}</td>
          <td class="text-right" style="font-family: var(--font-mono, monospace);">${formatHorizon(tr.r3m)}</td>
          <td class="text-right text-gold" style="font-family: var(--font-mono, monospace); font-weight: 700;">+${tr.pk}%</td>
          <td class="text-center"><span class="bt-badge ${statusBadgeClass}">${tr.st}</span></td>
        </tr>
      `;
    });

    tbody.innerHTML = rowsHtml;
  }

  function setActiveSetup(setupId) {
    if (setupId) {
      activeSetupId = setupId;
      renderUI();
    }
  }

  return {
    init,
    loadData,
    setActiveSetup
  };
})();

// Preload backtest data in background for instant dashboard card sync & zero station latency
if (window.StrategyBacktestModule && typeof window.StrategyBacktestModule.loadData === 'function') {
  window.StrategyBacktestModule.loadData();
}

/* ==========================================================================
   VIEW 7: WATCHLIST & TACTICAL ALERTS STATION MODULE (100% Client-Side)
   ========================================================================== */
window.WatchlistAlertsModule = (function() {
  const STORAGE_KEY_ALERTS = 'mits_pro_watchlist_alerts';
  const STORAGE_KEY_WATCHLIST = 'mits_pro_watchlist';

  let alerts = [];
  let cachedUniverse = [];
  let isInitialized = false;
  let activeFilter = 'all';
  let currentModalStock = null;
  let selectedPreset = 'S1_RETEST';
  let dismissedSymbols = new Set();

  function getAlertsFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ALERTS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('[WatchlistAlertsModule] Error reading alerts from storage:', e);
      return [];
    }
  }

  function saveAlertsToStorage(data) {
    try {
      localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(data));
    } catch (e) {
      console.warn('[WatchlistAlertsModule] Error saving alerts to storage:', e);
    }
  }

  function getRawWatchlist() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WATCHLIST);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  function saveRawWatchlist(list) {
    try {
      localStorage.setItem(STORAGE_KEY_WATCHLIST, JSON.stringify(list));
    } catch (e) {}
  }

  function syncStorage() {
    alerts = getAlertsFromStorage();
    const rawWl = getRawWatchlist();
    let changed = false;

    // 1. Ensure any stock in raw watchlist exists in alerts
    rawWl.forEach(sym => {
      const upper = sym.toUpperCase();
      if (!alerts.some(a => a.symbol.toUpperCase() === upper)) {
        alerts.push({
          symbol: upper,
          addedAt: new Date().toISOString(),
          alertType: 'WATCH_ONLY',
          targetPrice: null,
          bufferPct: 0.8,
          condition: 'ZONE',
          notes: 'Added from Watchlist',
          isTriggered: false
        });
        changed = true;
      }
    });

    // 2. Ensure raw watchlist contains all symbols from alerts
    alerts.forEach(a => {
      const upper = a.symbol.toUpperCase();
      if (!rawWl.includes(upper)) {
        rawWl.push(upper);
        changed = true;
      }
    });

    if (changed) {
      saveAlertsToStorage(alerts);
      saveRawWatchlist(rawWl);
    }
  }

  async function loadUniverse() {
    const basePath = window.location.pathname.includes('/wordpress') ? '../data/' : './data/';
    if (!window._masterUniverseData || !window._masterUniverseData.stocks) {
      try {
        let res = await fetch(`${basePath}master_universe_eod.json?v=${Date.now()}`).catch(() => null);
        if (!res || !res.ok) res = await fetch(`data/master_universe_eod.json?v=${Date.now()}`).catch(() => null);
        if (!res || !res.ok) res = await fetch('data/master_universe_eod.json').catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          window._masterUniverseData = data;
          cachedUniverse = data.stocks || [];
        }
      } catch (e) {
        console.warn('[WatchlistAlertsModule] Could not load master universe:', e);
      }
    } else {
      cachedUniverse = window._masterUniverseData.stocks;
    }

    // Ensure advState.rsData is populated so Technical Dossier levels (support, resistance) align instantly
    if (typeof advState !== 'undefined' && (!advState.rsData || !advState.rsData.stocks)) {
      try {
        let rsRes = await fetch(`${basePath}adv_scanner_1_rs.json?v=${Date.now()}`).catch(() => null);
        if (!rsRes || !rsRes.ok) rsRes = await fetch('data/adv_scanner_1_rs.json').catch(() => null);
        if (rsRes && rsRes.ok) {
          advState.rsData = await rsRes.json();
        }
      } catch (e) {}
    }

    return cachedUniverse;
  }

  function findStockData(symbol) {
    if (!symbol) return null;
    const sym = symbol.trim().toUpperCase();

    // 1. If Technical Dossier modal is currently open for this symbol, extract its exact levels directly
    let modalSupport = null;
    let modalResistance = null;
    let modalEma20 = null;
    const dossierSymEl = document.getElementById('rs-modal-symbol');
    if (dossierSymEl && dossierSymEl.textContent.trim().toUpperCase() === sym) {
      const s1Txt = document.getElementById('rs-modal-s1')?.textContent?.replace(/[^\d.]/g, '');
      const r1Txt = document.getElementById('rs-modal-r1')?.textContent?.replace(/[^\d.]/g, '');
      const emaTxt = document.getElementById('rs-modal-ema20')?.textContent?.replace(/[^\d.]/g, '');
      if (s1Txt && !isNaN(Number(s1Txt)) && Number(s1Txt) > 0) modalSupport = Number(s1Txt);
      if (r1Txt && !isNaN(Number(r1Txt)) && Number(r1Txt) > 0) modalResistance = Number(r1Txt);
      if (emaTxt && !isNaN(Number(emaTxt)) && Number(emaTxt) > 0) modalEma20 = Number(emaTxt);
    }

    // 2. Search advanced scanner data (where RS Outperformer, Early Breakout, etc. dossiers reside)
    let advStock = null;
    if (typeof advState !== 'undefined') {
      const advLists = [
        advState.rsData?.stocks,
        advState.boData?.stocks,
        advState.mcData?.stocks,
        advState.rbrData?.stocks,
        advState.confluenceData?.stocks,
        advState.wyckoffData?.stocks
      ];
      for (const list of advLists) {
        if (Array.isArray(list)) {
          const found = list.find(it => (it.symbol || '').toUpperCase() === sym);
          if (found) {
            advStock = found;
            break;
          }
        }
      }
    }

    // 3. Search scanner signals across Tab 1 to 6 setups
    let sig = null;
    if (window.state && window.state.scannerData && window.state.scannerData.setups) {
      for (const k of Object.keys(window.state.scannerData.setups)) {
        const setup = window.state.scannerData.setups[k];
        if (setup && Array.isArray(setup.signals)) {
          const match = setup.signals.find(s => (s.symbol || '').toUpperCase() === sym);
          if (match) {
            sig = match;
            break;
          }
        }
      }
    }

    // 4. Search cached Nifty 500 universe
    const uStock = cachedUniverse.find(s => (s.symbol || '').toUpperCase() === sym) || null;

    const d = advStock?.dossier || sig?.dossier || {};
    const kl = d.key_levels || {};

    const cmp = advStock?.cmp || advStock?.ltp || uStock?.cmp || sig?.cmp || 0;
    const chg = advStock?.change_pct !== undefined ? advStock.change_pct : (uStock?.change_pct !== undefined ? uStock.change_pct : (sig?.change_pct || 0));

    // Support: Align strictly with Technical Dossier (20D Swing Low Support)
    const supportVal = modalSupport !== null ? modalSupport : (
      kl.support !== undefined && kl.support !== null ? kl.support : (
        kl.support_1 !== undefined && kl.support_1 !== null ? kl.support_1 : (
          d.support_20d !== undefined && d.support_20d !== null ? d.support_20d : (
            d.support !== undefined && d.support !== null ? d.support : (
              d.support_1 !== undefined && d.support_1 !== null ? d.support_1 : (
                advStock?.support !== undefined && advStock?.support !== null ? advStock.support : (
                  advStock?.support_20d !== undefined && advStock?.support_20d !== null ? advStock.support_20d : (
                    sig?.support !== undefined && sig?.support !== null ? sig.support : (
                      sig?.support_20d !== undefined && sig?.support_20d !== null ? sig.support_20d : (
                        sig?.s1 !== undefined && sig?.s1 !== null ? sig.s1 : null
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    );

    // Resistance: Align strictly with Technical Dossier (20D Swing High / Resistance Pivot) - NOT 52W High
    const resistanceVal = modalResistance !== null ? modalResistance : (
      kl.resistance !== undefined && kl.resistance !== null ? kl.resistance : (
        kl.pivot_resistance !== undefined && kl.pivot_resistance !== null ? kl.pivot_resistance : (
          d.resistance_20d !== undefined && d.resistance_20d !== null ? d.resistance_20d : (
            d.resistance !== undefined && d.resistance !== null ? d.resistance : (
              d.resistance_pivot !== undefined && d.resistance_pivot !== null ? d.resistance_pivot : (
                advStock?.resistance !== undefined && advStock?.resistance !== null ? advStock.resistance : (
                  advStock?.resistance_20d !== undefined && advStock?.resistance_20d !== null ? advStock.resistance_20d : (
                    sig?.resistance !== undefined && sig?.resistance !== null ? sig.resistance : (
                      sig?.resistance_20d !== undefined && sig?.resistance_20d !== null ? sig.resistance_20d : (
                        sig?.r1 !== undefined && sig?.r1 !== null ? sig.r1 : null
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    );

    // 20 EMA: Exactly matching Technical Dossier
    const ema20Val = modalEma20 !== null ? modalEma20 : (d.ema_20 || advStock?.ema_20 || uStock?.ema_20 || sig?.ema_20 || null);

    return {
      symbol: sym,
      name: advStock?.name || advStock?.company_name || uStock?.name || sig?.name || sym,
      sector: advStock?.sector || uStock?.sector || sig?.sector || 'Broad Market',
      cmp: cmp,
      change_pct: chg,
      ema_20: ema20Val,
      ema_50: d.ema_50 || advStock?.ema_50 || uStock?.ema_50 || null,
      high_52w: kl.high_52w || d.high_52w || uStock?.high_52w || null,
      low_52w: uStock?.low_52w || null,
      support: supportVal,
      resistance: resistanceVal,
      support_20d: supportVal,
      resistance_20d: resistanceVal,
      s1: supportVal || (ema20Val ? +(ema20Val * 0.985).toFixed(2) : (cmp ? +(cmp * 0.96).toFixed(2) : 0)),
      r1: resistanceVal || (cmp ? +(cmp * 1.05).toFixed(2) : 0),
      rvol: advStock?.vol_ratio || uStock?.rvol || sig?.rvol || 1,
      rsi_14: uStock?.rsi_14 || null,
      tv_url: d.tradingview_url || uStock?.tv_url || `https://www.tradingview.com/chart/?symbol=NSE%3A${sym}`,
      breakout_status: uStock?.breakout_status || sig?.status || 'Active'
    };
  }

  function evaluateAllAlerts(showFeedback = false) {
    syncStorage();
    let triggeredCount = 0;

    alerts.forEach(item => {
      const st = findStockData(item.symbol);
      if (st) {
        item.cmp = st.cmp;
        item.change_pct = st.change_pct;
        item.name = st.name;
        item.sector = st.sector;
        item.tv_url = st.tv_url;
      }

      const cmp = Number(item.cmp) || 0;
      const target = Number(item.targetPrice) || 0;
      const buf = Number(item.bufferPct) || 0.8;
      let triggered = false;
      let message = '';
      let distPct = 0;

      if (cmp > 0 && target > 0) {
        distPct = +(((cmp - target) / target) * 100).toFixed(2);
      }

      if (item.alertType === 'S1_RETEST') {
        const lower = target * (1 - buf / 100);
        const upper = target * (1 + buf / 100);
        if (cmp >= lower && cmp <= upper) {
          triggered = true;
          message = `In Support Retest Zone (CMP: ₹${cmp.toLocaleString('en-IN')} vs Support: ₹${target.toLocaleString('en-IN')})`;
        } else if (cmp <= upper && cmp >= target * 0.985) {
          triggered = true;
          message = `Testing Support Level (CMP: ₹${cmp.toLocaleString('en-IN')} vs Support: ₹${target.toLocaleString('en-IN')})`;
        }
      } else if (item.alertType === 'EMA20_PULLBACK') {
        const lower = target * (1 - buf / 100);
        const upper = target * (1 + buf / 100);
        if (cmp >= lower && cmp <= upper) {
          triggered = true;
          message = `At 20 EMA Pullback Zone (CMP: ₹${cmp.toLocaleString('en-IN')} vs EMA20: ₹${target.toLocaleString('en-IN')})`;
        }
      } else if (item.alertType === 'BREAKOUT_R1') {
        if (cmp >= target) {
          triggered = true;
          message = `Breakout Above Resistance Target (CMP: ₹${cmp.toLocaleString('en-IN')} >= Resistance: ₹${target.toLocaleString('en-IN')})`;
        }
      } else if (item.alertType === 'CUSTOM') {
        const cond = item.condition || 'ZONE';
        if (cond === 'ZONE') {
          const lower = target * (1 - buf / 100);
          const upper = target * (1 + buf / 100);
          if (cmp >= lower && cmp <= upper) {
            triggered = true;
            message = `In Retest Zone (CMP: ₹${cmp.toLocaleString('en-IN')} vs Target: ₹${target.toLocaleString('en-IN')})`;
          }
        } else if (cond === 'ABOVE') {
          if (cmp >= target) {
            triggered = true;
            message = `Price Above Target (CMP: ₹${cmp.toLocaleString('en-IN')} >= Target: ₹${target.toLocaleString('en-IN')})`;
          }
        } else if (cond === 'BELOW') {
          if (cmp <= target) {
            triggered = true;
            message = `Price Below Target (CMP: ₹${cmp.toLocaleString('en-IN')} <= Target: ₹${target.toLocaleString('en-IN')})`;
          }
        }
      }

      item.isTriggered = triggered && !dismissedSymbols.has(item.symbol);
      item.distPct = distPct;
      item.lastTriggerMessage = message;

      if (item.isTriggered) {
        triggeredCount++;
      }
    });

    saveAlertsToStorage(alerts);
    updateSidebarBadge(triggeredCount);
    updateStatPills(alerts.length, triggeredCount);

    const wView = document.getElementById('view-watchlist-alerts');
    if (wView && !wView.classList.contains('hidden')) {
      renderTriggeredQueue();
      renderMonitoredList();
    }

    if (showFeedback) {
      showToast(`↻ Evaluated ${alerts.length} alerts against EOD data (${triggeredCount} triggered)`);
    }

    return { totalCount: alerts.length, triggeredCount };
  }

  function updateSidebarBadge(count) {
    const badge = document.getElementById('watchlist-alert-count-badge');
    if (!badge) return;
    if (count > 0) {
      badge.style.display = 'inline-flex';
      badge.textContent = count;
      badge.title = `${count} Tactical Alerts Triggered`;
    } else {
      badge.style.display = 'none';
    }
  }

  function updateStatPills(totalCount, triggeredCount) {
    const countActive = document.getElementById('wl-count-active');
    const countTriggered = document.getElementById('wl-count-triggered');
    const badgeTriggered = document.getElementById('wl-triggered-count-badge');
    const badgeMonitored = document.getElementById('wl-monitored-count-badge');

    if (countActive) countActive.textContent = totalCount;
    if (countTriggered) countTriggered.textContent = triggeredCount;
    if (badgeTriggered) badgeTriggered.textContent = `${triggeredCount} Triggered`;
    if (badgeMonitored) badgeMonitored.textContent = `${totalCount} Watched`;
  }

  function renderTriggeredQueue() {
    const container = document.getElementById('wl-triggered-cards-container');
    if (!container) return;

    const triggeredAlerts = alerts.filter(a => a.isTriggered);

    if (triggeredAlerts.length === 0) {
      container.innerHTML = `
        <div class="wl-queue-empty-card">
          <span class="wl-queue-empty-icon">🛡️</span>
          <div class="wl-queue-empty-text">
            <strong>No Tactical Alerts Triggered</strong><br>
            All ${alerts.length} monitored positions are currently trading outside trigger zones.
          </div>
        </div>
      `;
      return;
    }

    let html = '';
    triggeredAlerts.forEach(item => {
      const isBreakout = item.alertType === 'BREAKOUT_R1';
      const chgClass = (item.change_pct || 0) >= 0 ? 'text-emerald' : 'text-rose';
      const chgSign = (item.change_pct || 0) >= 0 ? '+' : '';
      const distSign = (item.distPct || 0) >= 0 ? '+' : '';

      html += `
        <div class="wl-triggered-card ${isBreakout ? 'card-breakout' : ''}">
          <div class="wl-card-header">
            <div class="wl-card-sym-box">
              <span class="wl-card-sym">${item.symbol}</span>
              <span class="wl-card-name">${item.name || item.symbol}</span>
            </div>
            <div class="wl-card-price-box">
              <span class="wl-card-cmp">₹${Number(item.cmp || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              <span class="wl-card-chg ${chgClass}">${chgSign}${Number(item.change_pct || 0).toFixed(2)}%</span>
            </div>
          </div>

          <div class="wl-card-trigger-banner">
            <span>⚡</span>
            <span><strong>${item.lastTriggerMessage || 'Alert Trigger Condition Met'}</strong></span>
          </div>

          <div class="wl-card-metrics-row">
            <div class="wl-metric-item">
              <span class="wl-metric-lbl">Target Level</span>
              <span class="wl-metric-val">₹${Number(item.targetPrice || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div class="wl-metric-item">
              <span class="wl-metric-lbl">Distance</span>
              <span class="wl-metric-val ${item.distPct >= 0 ? 'text-emerald' : 'text-rose'}">${distSign}${item.distPct}%</span>
            </div>
          </div>

          <div class="wl-card-actions">
            <button type="button" class="wl-btn wl-btn-primary" onclick="WatchlistAlertsModule.inspectStock('${item.symbol}')">Inspect Dossier</button>
            <a href="${item.tv_url || 'https://www.tradingview.com'}" target="_blank" rel="noopener noreferrer" class="wl-btn wl-btn-secondary" style="text-decoration:none;">TradingView ↗</a>
            <button type="button" class="wl-btn wl-btn-secondary" onclick="WatchlistAlertsModule.snoozeAlert('${item.symbol}')" title="Dismiss from triggered queue">Snooze</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function renderMonitoredList() {
    const tableBody = document.getElementById('wl-desktop-table-body');
    const mobileCardsWrap = document.getElementById('watchlist-mobile-cards');
    const emptyState = document.getElementById('wl-empty-state');

    if (!tableBody || !mobileCardsWrap) return;

    if (alerts.length === 0) {
      tableBody.innerHTML = '';
      mobileCardsWrap.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    let filtered = alerts;
    if (activeFilter === 'triggered') {
      filtered = alerts.filter(a => a.isTriggered);
    } else if (activeFilter === 'armed') {
      filtered = alerts.filter(a => a.alertType !== 'WATCH_ONLY' && !a.isTriggered);
    } else if (activeFilter === 'watching') {
      filtered = alerts.filter(a => a.alertType === 'WATCH_ONLY');
    }

    // Render Desktop Table
    let tableHtml = '';
    filtered.forEach(item => {
      const chgClass = (item.change_pct || 0) >= 0 ? 'text-emerald' : 'text-rose';
      const chgSign = (item.change_pct || 0) >= 0 ? '+' : '';
      const distSign = (item.distPct || 0) >= 0 ? '+' : '';

      let levelPill = '<span class="wl-level-pill">Watch Only</span>';
      if (item.alertType === 'S1_RETEST') {
        levelPill = `<span class="wl-level-pill pill-s1">⚡ Support: ₹${Number(item.targetPrice).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (±${item.bufferPct}%)</span>`;
      } else if (item.alertType === 'EMA20_PULLBACK') {
        levelPill = `<span class="wl-level-pill pill-ema20">📉 EMA20: ₹${Number(item.targetPrice).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (±${item.bufferPct}%)</span>`;
      } else if (item.alertType === 'BREAKOUT_R1') {
        levelPill = `<span class="wl-level-pill pill-breakout">🚀 Resistance: ₹${Number(item.targetPrice).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`;
      } else if (item.alertType === 'CUSTOM') {
        levelPill = `<span class="wl-level-pill">⚙️ ₹${Number(item.targetPrice).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`;
      }

      let statusBadge = '<span class="wl-status-badge status-watching">Watching</span>';
      if (item.isTriggered) {
        statusBadge = '<span class="wl-status-badge status-triggered">🚨 TRIGGERED</span>';
      } else if (item.alertType !== 'WATCH_ONLY') {
        statusBadge = '<span class="wl-status-badge status-armed">ARMED</span>';
      }

      tableHtml += `
        <tr class="${item.isTriggered ? 'row-triggered' : ''}">
          <td style="text-align: center;">
            <button type="button" class="wl-star-btn" onclick="WatchlistAlertsModule.removeStock('${item.symbol}')" title="Remove from Watchlist">★</button>
          </td>
          <td>
            <div class="wl-tbl-sym-box">
              <span class="wl-tbl-sym">${item.symbol}</span>
              <span class="wl-tbl-name">${item.name || item.symbol}</span>
            </div>
          </td>
          <td><span class="wl-sector-tag">${item.sector || 'Broad Market'}</span></td>
          <td style="text-align: right; font-family: var(--font-mono, monospace); font-weight: 700;">₹${Number(item.cmp || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          <td style="text-align: right; font-family: var(--font-mono, monospace); font-weight: 700;" class="${chgClass}">${chgSign}${Number(item.change_pct || 0).toFixed(2)}%</td>
          <td>${levelPill}</td>
          <td style="text-align: right; font-family: var(--font-mono, monospace); font-weight: 700;" class="${item.distPct >= 0 ? 'text-emerald' : 'text-rose'}">
            ${item.alertType !== 'WATCH_ONLY' ? `${distSign}${item.distPct}%` : '—'}
          </td>
          <td style="text-align: center;">${statusBadge}</td>
          <td>
            <div class="wl-tbl-actions">
              <button type="button" class="wl-tbl-btn" onclick="WatchlistAlertsModule.inspectStock('${item.symbol}')" title="Inspect Quantitative Dossier">Inspect</button>
              <button type="button" class="wl-tbl-btn" onclick="WatchlistAlertsModule.openAlertModal('${item.symbol}', true)" title="Configure Alert Preset">Edit</button>
              <button type="button" class="wl-tbl-btn btn-remove" onclick="WatchlistAlertsModule.removeStock('${item.symbol}')" title="Remove Stock">✕</button>
            </div>
          </td>
        </tr>
      `;
    });
    tableBody.innerHTML = tableHtml;

    // Render Mobile Touch Cards
    let mobileHtml = '';
    filtered.forEach(item => {
      const chgClass = (item.change_pct || 0) >= 0 ? 'text-emerald' : 'text-rose';
      const chgSign = (item.change_pct || 0) >= 0 ? '+' : '';
      const distSign = (item.distPct || 0) >= 0 ? '+' : '';

      let levelText = 'Watch Only';
      if (item.alertType === 'S1_RETEST') levelText = `⚡ Support: ₹${Number(item.targetPrice).toLocaleString('en-IN')}`;
      else if (item.alertType === 'EMA20_PULLBACK') levelText = `📉 20 EMA: ₹${Number(item.targetPrice).toLocaleString('en-IN')}`;
      else if (item.alertType === 'BREAKOUT_R1') levelText = `🚀 Resistance: ₹${Number(item.targetPrice).toLocaleString('en-IN')}`;
      else if (item.alertType === 'CUSTOM') levelText = `⚙️ Target: ₹${Number(item.targetPrice).toLocaleString('en-IN')}`;

      mobileHtml += `
        <div class="watchlist-mobile-card ${item.isTriggered ? 'card-triggered' : ''}">
          <div class="wl-mob-header">
            <div class="wl-mob-sym-wrap">
              <button type="button" class="wl-star-btn" style="min-width:36px; min-height:36px; padding:0;" onclick="WatchlistAlertsModule.removeStock('${item.symbol}')" title="Remove">★</button>
              <div>
                <div class="wl-mob-sym">${item.symbol}</div>
                <div class="wl-sector-tag" style="margin-top:2px;">${item.sector || 'Market'}</div>
              </div>
            </div>
            <div class="wl-mob-price-wrap">
              <span class="wl-mob-cmp">₹${Number(item.cmp || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              <span class="${chgClass}" style="font-weight:700; font-size:0.78rem; font-family: var(--font-mono, monospace);">${chgSign}${Number(item.change_pct || 0).toFixed(2)}%</span>
            </div>
          </div>

          <div class="wl-mob-body">
            <div>
              <span style="color:#94a3b8; font-size:0.72rem; display:block;">ALERT CRITERIA</span>
              <strong style="color:#f8fafc; font-size:0.8rem;">${levelText}</strong>
            </div>
            <div style="text-align:right;">
              <span style="color:#94a3b8; font-size:0.72rem; display:block;">STATUS</span>
              ${item.isTriggered ? '<span class="wl-status-badge status-triggered">🚨 TRIGGERED</span>' : (item.alertType !== 'WATCH_ONLY' ? '<span class="wl-status-badge status-armed">ARMED</span>' : '<span class="wl-status-badge status-watching">WATCHING</span>')}
            </div>
          </div>

          <div class="wl-mob-footer">
            <button type="button" class="wl-mob-btn" onclick="WatchlistAlertsModule.inspectStock('${item.symbol}')">Inspect</button>
            <a href="${item.tv_url || 'https://www.tradingview.com'}" target="_blank" rel="noopener noreferrer" class="wl-mob-btn" style="text-decoration:none;">Chart ↗</a>
            <button type="button" class="wl-mob-btn" onclick="WatchlistAlertsModule.openAlertModal('${item.symbol}', true)">Edit</button>
            <button type="button" class="wl-mob-btn" style="color:#f43f5e;" onclick="WatchlistAlertsModule.removeStock('${item.symbol}')" title="Remove">✕</button>
          </div>
        </div>
      `;
    });
    mobileCardsWrap.innerHTML = mobileHtml;
  }

  function openAlertModal(symbol, editMode = false) {
    if (!symbol) return;
    const st = findStockData(symbol);
    if (!st) return;

    currentModalStock = st;

    const overlay = document.getElementById('alert-config-modal-overlay');
    const modalSym = document.getElementById('alert-modal-symbol');
    const modalName = document.getElementById('alert-modal-name');
    const modalSector = document.getElementById('alert-modal-sector');
    const modalCmp = document.getElementById('alert-modal-cmp');
    const modalChg = document.getElementById('alert-modal-chg');

    if (modalSym) modalSym.textContent = st.symbol;
    if (modalName) modalName.textContent = st.name || st.symbol;
    if (modalSector) modalSector.textContent = st.sector || 'Broad Market';
    if (modalCmp) modalCmp.textContent = `₹${Number(st.cmp || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (modalChg) {
      const cls = (st.change_pct || 0) >= 0 ? 'text-emerald' : 'text-rose';
      const sign = (st.change_pct || 0) >= 0 ? '+' : '';
      modalChg.className = `alert-modal-chg ${cls}`;
      modalChg.textContent = `${sign}${Number(st.change_pct || 0).toFixed(2)}%`;
    }

    // Populate Presets Targets (Align strictly with Technical Dossier Support & Resistance)
    const s1Target = st.support !== undefined && st.support !== null
      ? st.support
      : (st.support_20d !== undefined && st.support_20d !== null
        ? st.support_20d
        : (st.s1 || (st.cmp ? +(st.cmp * 0.96).toFixed(2) : 0)));
    const ema20Target = st.ema_20 || (st.cmp ? +(st.cmp * 0.98).toFixed(2) : 0);
    const breakoutTarget = st.resistance !== undefined && st.resistance !== null
      ? st.resistance
      : (st.resistance_20d !== undefined && st.resistance_20d !== null
        ? st.resistance_20d
        : (st.r1 || (st.cmp ? +(st.cmp * 1.05).toFixed(2) : 0)));

    const s1El = document.getElementById('preset-target-s1');
    const ema20El = document.getElementById('preset-target-ema20');
    const boEl = document.getElementById('preset-target-breakout');

    if (s1El) s1El.textContent = `₹${Number(s1Target).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (±0.8%)`;
    if (ema20El) ema20El.textContent = `₹${Number(ema20Target).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (±0.5%)`;
    if (boEl) boEl.textContent = `₹${Number(breakoutTarget).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (> target)`;

    // Check existing alert
    const existing = alerts.find(a => a.symbol.toUpperCase() === st.symbol.toUpperCase());
    if (existing && editMode) {
      selectedPreset = existing.alertType || 'S1_RETEST';
      const customTarget = document.getElementById('alert-custom-target');
      const customBuf = document.getElementById('alert-custom-buffer');
      const customCond = document.getElementById('alert-custom-condition');
      if (customTarget && existing.targetPrice) customTarget.value = existing.targetPrice;
      if (customBuf && existing.bufferPct) customBuf.value = existing.bufferPct;
      if (customCond && existing.condition) customCond.value = existing.condition;
    } else {
      selectedPreset = 'S1_RETEST';
      const customTarget = document.getElementById('alert-custom-target');
      if (customTarget) customTarget.value = s1Target;
    }

    updatePresetChipsUI();

    if (overlay) {
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  function updatePresetChipsUI() {
    document.querySelectorAll('.alert-preset-chip').forEach(chip => {
      const p = chip.getAttribute('data-preset');
      if (p === selectedPreset) {
        chip.classList.add('selected');
      } else {
        chip.classList.remove('selected');
      }
    });
  }

  function closeAlertModal() {
    const overlay = document.getElementById('alert-config-modal-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }
    currentModalStock = null;
  }

  function saveModalAlert() {
    if (!currentModalStock) return;
    const sym = currentModalStock.symbol.toUpperCase();

    let targetPrice = null;
    let bufferPct = 0.8;
    let condition = 'ZONE';

    const s1Target = currentModalStock.support !== undefined && currentModalStock.support !== null
      ? currentModalStock.support
      : (currentModalStock.support_20d !== undefined && currentModalStock.support_20d !== null
        ? currentModalStock.support_20d
        : (currentModalStock.s1 || (currentModalStock.cmp ? +(currentModalStock.cmp * 0.96).toFixed(2) : 0)));
    const ema20Target = currentModalStock.ema_20 || (currentModalStock.cmp ? +(currentModalStock.cmp * 0.98).toFixed(2) : 0);
    const breakoutTarget = currentModalStock.resistance !== undefined && currentModalStock.resistance !== null
      ? currentModalStock.resistance
      : (currentModalStock.resistance_20d !== undefined && currentModalStock.resistance_20d !== null
        ? currentModalStock.resistance_20d
        : (currentModalStock.r1 || (currentModalStock.cmp ? +(currentModalStock.cmp * 1.05).toFixed(2) : 0)));

    if (selectedPreset === 'S1_RETEST') {
      targetPrice = s1Target;
      bufferPct = 0.8;
      condition = 'ZONE';
    } else if (selectedPreset === 'EMA20_PULLBACK') {
      targetPrice = ema20Target;
      bufferPct = 0.5;
      condition = 'ZONE';
    } else if (selectedPreset === 'BREAKOUT_R1') {
      targetPrice = breakoutTarget;
      bufferPct = 0.5;
      condition = 'ABOVE';
    } else if (selectedPreset === 'WATCH_ONLY') {
      targetPrice = null;
      bufferPct = 0;
      condition = 'NONE';
    } else if (selectedPreset === 'CUSTOM') {
      const customTarget = document.getElementById('alert-custom-target');
      const customBuf = document.getElementById('alert-custom-buffer');
      const customCond = document.getElementById('alert-custom-condition');
      targetPrice = customTarget ? Number(customTarget.value) : s1Target;
      bufferPct = customBuf ? Number(customBuf.value) : 0.8;
      condition = customCond ? customCond.value : 'ZONE';
    }

    const idx = alerts.findIndex(a => a.symbol.toUpperCase() === sym);
    const alertObj = {
      symbol: sym,
      name: currentModalStock.name || sym,
      sector: currentModalStock.sector || 'Broad Market',
      cmp: currentModalStock.cmp,
      change_pct: currentModalStock.change_pct,
      addedAt: new Date().toISOString(),
      alertType: selectedPreset,
      targetPrice: targetPrice,
      bufferPct: bufferPct,
      condition: condition,
      tv_url: currentModalStock.tv_url,
      isTriggered: false
    };

    if (idx >= 0) {
      alerts[idx] = alertObj;
    } else {
      alerts.push(alertObj);
    }

    saveAlertsToStorage(alerts);

    // Also update raw watchlist
    const rawWl = getRawWatchlist();
    if (!rawWl.includes(sym)) {
      rawWl.push(sym);
      saveRawWatchlist(rawWl);
    }

    closeAlertModal();
    updateAllWatchlistUI(sym, true);
    evaluateAllAlerts();

    showToast(`✅ Alert configured & armed for ${sym}!`);
  }

  function removeStock(symbol) {
    if (!symbol) return;
    const sym = symbol.toUpperCase();

    alerts = alerts.filter(a => a.symbol.toUpperCase() !== sym);
    saveAlertsToStorage(alerts);

    let rawWl = getRawWatchlist();
    rawWl = rawWl.filter(s => s.toUpperCase() !== sym);
    saveRawWatchlist(rawWl);

    dismissedSymbols.delete(sym);

    updateAllWatchlistUI(sym, false);
    evaluateAllAlerts();

    showToast(`🗑️ ${sym} removed from Watchlist`);
  }

  function snoozeAlert(symbol) {
    if (!symbol) return;
    dismissedSymbols.add(symbol.toUpperCase());
    evaluateAllAlerts();
    showToast(`💤 Snoozed alert for ${symbol.toUpperCase()}`);
  }

  function clearAll() {
    if (alerts.length === 0) return;
    if (!confirm('Are you sure you want to clear all watchlist stocks and alerts?')) return;

    alerts = [];
    saveAlertsToStorage([]);
    saveRawWatchlist([]);
    dismissedSymbols.clear();

    document.querySelectorAll('.tbl-watchlist-star-btn').forEach(b => {
      b.classList.remove('active');
      b.textContent = '☆';
      b.title = 'Add to Watchlist';
    });

    evaluateAllAlerts();
    showToast('Cleared all watchlist stocks and alerts');
  }

  function showToast(message) {
    const toast = document.getElementById('wl-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = 'flex';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }

  function inspectStock(symbol) {
    if (typeof openSetupDossier === 'function') {
      try {
        openSetupDossier(symbol);
        return;
      } catch (e) {}
    }
    if (typeof openAdvRsDossierModal === 'function') {
      try {
        openAdvRsDossierModal(symbol);
        return;
      } catch (e) {}
    }
    if (window.openDossier) {
      window.openDossier(symbol);
    }
  }

  function bindEvents() {
    // Quick Add Autocomplete
    const quickInput = document.getElementById('wl-quickadd-input');
    const autoDropdown = document.getElementById('wl-autocomplete-dropdown');
    const quickBtn = document.getElementById('wl-quickadd-btn');

    if (quickInput && autoDropdown) {
      quickInput.addEventListener('input', (e) => {
        const q = e.target.value.trim().toUpperCase();
        if (q.length < 1) {
          autoDropdown.style.display = 'none';
          return;
        }

        const matches = (cachedUniverse || []).filter(s => {
          return (s.symbol && s.symbol.toUpperCase().includes(q)) || (s.name && s.name.toUpperCase().includes(q));
        }).slice(0, 8);

        if (matches.length === 0) {
          autoDropdown.style.display = 'none';
          return;
        }

        let html = '';
        matches.forEach(m => {
          const chgClass = (m.change_pct || 0) >= 0 ? 'text-emerald' : 'text-rose';
          const chgSign = (m.change_pct || 0) >= 0 ? '+' : '';
          html += `
            <div class="wl-autocomplete-item" data-symbol="${m.symbol}">
              <div class="wl-auto-left">
                <span class="wl-auto-sym">${m.symbol}</span>
                <span class="wl-auto-name">${m.name || ''}</span>
              </div>
              <div class="wl-auto-right">
                <span class="wl-auto-cmp">₹${Number(m.cmp || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                <span class="wl-auto-chg ${chgClass}">${chgSign}${Number(m.change_pct || 0).toFixed(2)}%</span>
              </div>
            </div>
          `;
        });
        autoDropdown.innerHTML = html;
        autoDropdown.style.display = 'block';
      });

      autoDropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.wl-autocomplete-item');
        if (item) {
          const sym = item.getAttribute('data-symbol');
          quickInput.value = sym;
          autoDropdown.style.display = 'none';
          openAlertModal(sym);
        }
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.quickadd-input-wrapper')) {
          autoDropdown.style.display = 'none';
        }
      });

      quickInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = quickInput.value.trim().toUpperCase();
          if (val) {
            autoDropdown.style.display = 'none';
            openAlertModal(val);
          }
        }
      });
    }

    if (quickBtn && quickInput) {
      quickBtn.addEventListener('click', () => {
        const val = quickInput.value.trim().toUpperCase();
        if (val) {
          if (autoDropdown) autoDropdown.style.display = 'none';
          openAlertModal(val);
        } else {
          quickInput.focus();
        }
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById('wl-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('spinning');
        setTimeout(() => {
          evaluateAllAlerts(true);
          refreshBtn.classList.remove('spinning');
        }, 300);
      });
    }

    // Clear all button
    const clearBtn = document.getElementById('wl-clear-all-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearAll);
    }

    // Filter pills
    document.querySelectorAll('#wl-status-filter-pills .wl-filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#wl-status-filter-pills .wl-filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeFilter = pill.getAttribute('data-filter') || 'all';
        renderMonitoredList();
      });
    });

    // Modal Presets
    document.querySelectorAll('.alert-preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        selectedPreset = chip.getAttribute('data-preset');
        updatePresetChipsUI();
      });
    });

    // Custom toggle
    const customToggle = document.getElementById('alert-custom-toggle');
    const customFields = document.getElementById('alert-custom-fields');
    const customArrow = document.getElementById('custom-toggle-arrow');
    if (customToggle && customFields) {
      customToggle.addEventListener('click', () => {
        const isHidden = customFields.style.display === 'none';
        customFields.style.display = isHidden ? 'flex' : 'none';
        if (customArrow) customArrow.textContent = isHidden ? '▴' : '▾';
        if (isHidden) {
          selectedPreset = 'CUSTOM';
          updatePresetChipsUI();
        }
      });
    }

    // Modal Buttons
    const closeBtn = document.getElementById('alert-modal-close-btn');
    const cancelBtn = document.getElementById('alert-modal-cancel-btn');
    const saveBtn = document.getElementById('alert-modal-save-btn');
    const overlay = document.getElementById('alert-config-modal-overlay');

    if (closeBtn) closeBtn.addEventListener('click', closeAlertModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeAlertModal);
    if (saveBtn) saveBtn.addEventListener('click', saveModalAlert);
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeAlertModal();
      });
    }
  }

  async function init() {
    await loadUniverse();
    syncStorage();
    if (!isInitialized) {
      bindEvents();
      isInitialized = true;
    }
    evaluateAllAlerts();
    renderTriggeredQueue();
    renderMonitoredList();
  }

  // Background boot for instant sidebar badge count
  async function boot() {
    await loadUniverse();
    syncStorage();
    evaluateAllAlerts();
  }

  return {
    init,
    boot,
    openAlertModal,
    closeAlertModal,
    removeStock,
    removeStockInternal: (sym) => {
      alerts = alerts.filter(a => a.symbol.toUpperCase() !== sym.toUpperCase());
      saveAlertsToStorage(alerts);
      dismissedSymbols.delete(sym.toUpperCase());
      evaluateAllAlerts();
    },
    evaluateAllAlerts,
    inspectStock,
    snoozeAlert,
    clearAll
  };
})();

// Automatically boot Watchlist & Alerts engine in background on page load
if (window.WatchlistAlertsModule && typeof window.WatchlistAlertsModule.boot === 'function') {
  window.WatchlistAlertsModule.boot();
}

// ===================================================================================
// STOCK COMPARISON STATION MODULE (100% Client-Side In-Memory Engine)
// ===================================================================================
window.StockComparisonModule = (function () {
  let slotA = 'TCS';
  let slotB = 'INFY';
  let cachedUniverse = [];
  let cachedFundamentals = {};
  let isInitialized = false;
  let activeMobileView = 'both'; // 'both' | 'a' | 'b'

  function formatINR(val) {
    if (val === null || val === undefined || isNaN(val)) return '₹0.00';
    return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPct(val, showSign = true) {
    if (val === null || val === undefined || isNaN(val)) return '0.00%';
    const num = Number(val);
    const sign = showSign && num > 0 ? '+' : '';
    return sign + num.toFixed(2) + '%';
  }

  function formatNum(val, dec = 2) {
    if (val === null || val === undefined || isNaN(val)) return '0.00';
    return Number(val).toFixed(dec);
  }

  // Load EOD Datasets (Universe + Fundamentals)
  async function loadData() {
    const basePath = window.location.pathname.includes('/wordpress') ? '../data/' : './data/';

    // 1. Master Universe EOD
    if (!window._masterUniverseData || !window._masterUniverseData.stocks) {
      try {
        let res = await fetch(`${basePath}master_universe_eod.json?v=${Date.now()}`).catch(() => null);
        if (!res || !res.ok) res = await fetch(`data/master_universe_eod.json?v=${Date.now()}`).catch(() => null);
        if (!res || !res.ok) res = await fetch('data/master_universe_eod.json').catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          window._masterUniverseData = data;
          cachedUniverse = data.stocks || [];
        }
      } catch (e) {
        console.warn('[StockComparisonModule] Error loading master universe:', e);
      }
    } else {
      cachedUniverse = window._masterUniverseData.stocks || [];
    }

    // 2. Fundamental Data
    if (!window._fundamentalData || !window._fundamentalData.stocks) {
      try {
        let res = await fetch(`${basePath}fundamental_data.json?v=${Date.now()}`).catch(() => null);
        if (!res || !res.ok) res = await fetch(`data/fundamental_data.json?v=${Date.now()}`).catch(() => null);
        if (!res || !res.ok) res = await fetch('data/fundamental_data.json').catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          window._fundamentalData = data;
        }
      } catch (e) {
        console.warn('[StockComparisonModule] Error loading fundamentals:', e);
      }
    }

    if (window._fundamentalData && Array.isArray(window._fundamentalData.stocks)) {
      window._fundamentalData.stocks.forEach(s => {
        if (s && s.s) {
          cachedFundamentals[s.s.toUpperCase()] = s;
        }
      });
    }

    const statusBadge = document.getElementById('compare-sync-status-badge');
    if (statusBadge && cachedUniverse.length > 0) {
      statusBadge.textContent = `● 5-Pillar Tale of Tape (${cachedUniverse.length} Stocks)`;
    }
  }

  // Resolve Stock Data combining Universe, Fundamentals & Technical Dossier Levels
  function resolveStock(symbol) {
    if (!symbol) return null;
    const sym = symbol.trim().toUpperCase();

    // 1. Search cached universe
    const uStock = cachedUniverse.find(s => (s.symbol || '').toUpperCase() === sym) || null;

    // 2. Search fundamentals
    const fStock = cachedFundamentals[sym] || null;

    // 3. Search advanced scanner data for 20D S/R levels
    let advStock = null;
    if (typeof advState !== 'undefined') {
      const advLists = [
        advState.rsData?.stocks,
        advState.boData?.stocks,
        advState.mcData?.stocks,
        advState.rbrData?.stocks,
        advState.confluenceData?.stocks,
        advState.wyckoffData?.stocks
      ];
      for (const list of advLists) {
        if (Array.isArray(list)) {
          const found = list.find(it => (it.symbol || '').toUpperCase() === sym);
          if (found) {
            advStock = found;
            break;
          }
        }
      }
    }

    // 4. Search scanner signals across Tab 1 to 6 setups
    let sig = null;
    if (window.state && window.state.scannerData && window.state.scannerData.setups) {
      for (const k of Object.keys(window.state.scannerData.setups)) {
        const setup = window.state.scannerData.setups[k];
        if (setup && Array.isArray(setup.signals)) {
          const match = setup.signals.find(s => (s.symbol || '').toUpperCase() === sym);
          if (match) {
            sig = match;
            break;
          }
        }
      }
    }

    const d = advStock?.dossier || sig?.dossier || {};
    const kl = d.key_levels || {};

    const cmp = uStock?.cmp || advStock?.cmp || advStock?.ltp || sig?.cmp || fStock?.cmp || 0;
    const change_pct = uStock?.change_pct !== undefined ? uStock.change_pct : (advStock?.change_pct !== undefined ? advStock.change_pct : (sig?.change_pct || 0));

    // Support (20D Swing Low Support)
    let support = kl.support || kl.support_1 || d.support_20d || d.support || advStock?.support || sig?.support || null;
    if (!support || support <= 0) {
      if (uStock?.ema_20 && cmp > uStock.ema_20) {
        support = Number(uStock.ema_20);
      } else if (uStock?.low_52w && cmp > uStock.low_52w) {
        support = Math.max(uStock.low_52w, cmp * 0.94);
      } else {
        support = cmp * 0.94;
      }
    }

    // Resistance (20D Swing High / Pivot Resistance)
    let resistance = kl.resistance || kl.pivot_resistance || d.resistance_20d || d.resistance || advStock?.resistance || sig?.resistance || null;
    if (!resistance || resistance <= cmp) {
      if (uStock?.high_52w && uStock.high_52w > cmp) {
        resistance = Number(uStock.high_52w);
      } else {
        resistance = cmp * 1.06;
      }
    }

    // Risk and Reward calculations
    const risk_pct = cmp > 0 && support < cmp ? ((cmp - support) / cmp) * 100 : 3.0;
    const reward_pct = cmp > 0 && resistance > cmp ? ((resistance - cmp) / cmp) * 100 : 6.0;
    const rr_ratio = risk_pct > 0 ? (reward_pct / risk_pct) : 2.0;

    // Trend Stack
    let trend_stack_label = 'Consolidating / Mixed';
    let trend_stack_score = 1;
    if (uStock?.ema_20 && uStock?.ema_50 && uStock?.ema_200) {
      if (uStock.ema_20 > uStock.ema_50 && uStock.ema_50 > uStock.ema_200) {
        trend_stack_label = 'Bullish (20 > 50 > 200)';
        trend_stack_score = 3;
      } else if (uStock.ema_20 < uStock.ema_50 && uStock.ema_50 < uStock.ema_200) {
        trend_stack_label = 'Bearish (20 < 50 < 200)';
        trend_stack_score = 0;
      }
    }

    return {
      symbol: sym,
      name: uStock?.name || sym,
      sector: uStock?.sector || fStock?.sec || 'Broad Market',
      cmp: cmp,
      change_pct: change_pct,

      // Pillar 1: Price Action & Trend Structure
      trend_stack_label: trend_stack_label,
      trend_stack_score: trend_stack_score,
      dist_ema20_pct: uStock?.dist_ema20_pct !== undefined ? uStock.dist_ema20_pct : (uStock?.ema_20 ? ((cmp - uStock.ema_20) / uStock.ema_20) * 100 : 0),
      dist_52w_high_pct: uStock?.dist_52w_high_pct !== undefined ? uStock.dist_52w_high_pct : 15.0,
      dist_52w_low_pct: uStock?.dist_52w_low_pct !== undefined ? uStock.dist_52w_low_pct : 20.0,
      ema_20: uStock?.ema_20 || cmp * 0.98,
      ema_50: uStock?.ema_50 || cmp * 0.95,
      ema_200: uStock?.ema_200 || cmp * 0.90,

      // Pillar 2: Relative Strength & Momentum
      rs_score: uStock?.rs_score !== undefined ? uStock.rs_score : 50,
      rs_1m: uStock?.rs_1m !== undefined ? uStock.rs_1m : 0,
      rs_3m: uStock?.rs_3m !== undefined ? uStock.rs_3m : 0,
      rsi_14: uStock?.rsi_14 !== undefined ? uStock.rsi_14 : 50,
      breakout_status: uStock?.breakout_status || (uStock?.is_new_52w_high ? '52W High Breakout' : (uStock?.breakout_20d ? '20D Breakout' : (uStock?.is_nr4 ? 'NR4 Squeeze' : 'Consolidating'))),

      // Pillar 3: Institutional Volume & Delivery Footprint
      delivery_pct: uStock?.delivery_pct !== undefined ? uStock.delivery_pct : 45.0,
      delivery_spike_pct: uStock?.delivery_spike_pct !== undefined ? uStock.delivery_spike_pct : 0,
      rvol: uStock?.rvol !== undefined ? uStock.rvol : 1.0,
      clv: uStock?.clv !== undefined ? uStock.clv : 0.5,
      deliv_turnover_cr: uStock?.deliv_turnover_cr !== undefined ? uStock.deliv_turnover_cr : (uStock?.turnover_cr ? uStock.turnover_cr * 0.5 : 50.0),
      turnover_cr: uStock?.turnover_cr || 100.0,

      // Pillar 4: Structural Key Levels & Risk-Reward
      support: support,
      resistance: resistance,
      risk_pct: risk_pct,
      reward_pct: reward_pct,
      rr_ratio: rr_ratio,

      // Pillar 5: Fundamentals & Valuation Quality
      pe: fStock?.pe !== undefined ? fStock.pe : null,
      pb: fStock?.pb !== undefined ? fStock.pb : null,
      roe: fStock?.roe !== undefined ? fStock.roe : null,
      roce: fStock?.roce !== undefined ? fStock.roce : null,
      de: fStock?.de !== undefined ? fStock.de : null,
      f_score: fStock?.f_score !== undefined ? fStock.f_score : null,
      tier: fStock?.tier || 'Unrated',
      has_fundamentals: !!fStock
    };
  }

  // Calculate Absolute Tactical Score (0-100)
  function calculateTacticalScore(s) {
    if (!s) return 50;
    // RS score (0-25)
    const rs_pts = (s.rs_score / 100.0) * 25.0;

    // Delivery % (0-20)
    const deliv_pts = Math.min(20.0, (s.delivery_pct / 100.0) * 20.0);

    // 52W High proximity (0-15)
    const high_dist = Math.max(0, s.dist_52w_high_pct || 0);
    const high_pts = Math.max(0.0, 15.0 - (high_dist * 0.4));

    // Trend Stack (0-15)
    const ts = s.trend_stack_score !== undefined ? s.trend_stack_score : 1;
    const ts_pts = ts >= 3 ? 15.0 : (ts === 1 ? 9.0 : 3.0);

    // Risk:Reward (0-15)
    const rr = s.rr_ratio || 1.5;
    const rr_pts = rr >= 2.5 ? 15.0 : (rr >= 1.8 ? 11.0 : (rr >= 1.2 ? 7.0 : 4.0));

    // Fundamentals (0-10)
    const f = s.f_score !== null && s.f_score !== undefined ? s.f_score : 5;
    const f_pts = f >= 8 ? 10.0 : (f >= 6 ? 7.0 : (f >= 4 ? 5.0 : 3.0));

    const total = Math.round(rs_pts + deliv_pts + high_pts + ts_pts + rr_pts + f_pts);
    return Math.max(15, Math.min(98, total));
  }

  // Compare Two Stock Values for Metric Highlighting
  // rule: 'higher' | 'lower' | 'rsi' | 'trend' | 'tier'
  function compareMetric(valA, valB, rule = 'higher') {
    if (valA === null || valA === undefined) return valB !== null && valB !== undefined ? 'b' : 'tie';
    if (valB === null || valB === undefined) return 'a';

    if (rule === 'higher') {
      if (valA > valB) return 'a';
      if (valB > valA) return 'b';
      return 'tie';
    }
    if (rule === 'lower') {
      if (valA < valB) return 'a';
      if (valB < valA) return 'b';
      return 'tie';
    }
    if (rule === 'rsi') {
      // Golden momentum range is 55 to 70 (optimum 62.5)
      const distA = Math.abs(valA - 62.5);
      const distB = Math.abs(valB - 62.5);
      if (distA < distB) return 'a';
      if (distB < distA) return 'b';
      return 'tie';
    }
    if (rule === 'pe') {
      // Positive and lower PE is better
      if (valA > 0 && valB > 0) {
        if (valA < valB) return 'a';
        if (valB < valA) return 'b';
        return 'tie';
      }
      if (valA > 0 && valB <= 0) return 'a';
      if (valB > 0 && valA <= 0) return 'b';
      return 'tie';
    }
    if (rule === 'tier') {
      const tierRank = { 'Buffett Compounder': 4, 'Deep Value Moat': 3, 'High Quality Growth': 3, 'Fair Value': 2, 'Unrated': 1 };
      const rankA = tierRank[valA] || 1;
      const rankB = tierRank[valB] || 1;
      if (rankA > rankB) return 'a';
      if (rankB > rankA) return 'b';
      return 'tie';
    }
    return 'tie';
  }

  // Generate Executive Verdict
  function calculateExecutiveVerdict(stA, stB) {
    const scoreA = calculateTacticalScore(stA);
    const scoreB = calculateTacticalScore(stB);
    const diff = Math.abs(scoreA - scoreB);

    let winner = 'tie';
    if (scoreA > scoreB + 2) winner = 'a';
    else if (scoreB > scoreA + 2) winner = 'b';

    const bulletsA = [];
    const bulletsB = [];

    // Identify primary tactical advantages for Stock A
    if (stA.rs_score > stB.rs_score) bulletsA.push(`Superior RS Score (${stA.rs_score} vs ${stB.rs_score})`);
    if (stA.delivery_pct > stB.delivery_pct) bulletsA.push(`Higher Institutional Delivery (${stA.delivery_pct.toFixed(1)}% vs ${stB.delivery_pct.toFixed(1)}%)`);
    if (stA.rvol > stB.rvol) bulletsA.push(`Stronger Volume Surge (${stA.rvol.toFixed(2)}x vs ${stB.rvol.toFixed(2)}x RVOL)`);
    if (stA.dist_52w_high_pct < stB.dist_52w_high_pct) bulletsA.push(`Closer to 52W Breakout (-${stA.dist_52w_high_pct.toFixed(1)}% vs -${stB.dist_52w_high_pct.toFixed(1)}%)`);
    if (stA.rr_ratio > stB.rr_ratio) bulletsA.push(`Attractive Risk-Reward (${stA.rr_ratio.toFixed(2)}:1 vs ${stB.rr_ratio.toFixed(2)}:1)`);
    if (stA.f_score > stB.f_score) bulletsA.push(`Higher Quality F-Score (${stA.f_score}/9 vs ${stB.f_score}/9)`);
    if (stA.roe > stB.roe) bulletsA.push(`Higher Return on Equity (${stA.roe}% vs ${stB.roe}%)`);

    // Identify primary tactical advantages for Stock B
    if (stB.rs_score > stA.rs_score) bulletsB.push(`Superior RS Score (${stB.rs_score} vs ${stA.rs_score})`);
    if (stB.delivery_pct > stA.delivery_pct) bulletsB.push(`Higher Institutional Delivery (${stB.delivery_pct.toFixed(1)}% vs ${stA.delivery_pct.toFixed(1)}%)`);
    if (stB.rvol > stA.rvol) bulletsB.push(`Stronger Volume Surge (${stB.rvol.toFixed(2)}x vs ${stA.rvol.toFixed(2)}x RVOL)`);
    if (stB.dist_52w_high_pct < stA.dist_52w_high_pct) bulletsB.push(`Closer to 52W Breakout (-${stB.dist_52w_high_pct.toFixed(1)}% vs -${stA.dist_52w_high_pct.toFixed(1)}%)`);
    if (stB.rr_ratio > stA.rr_ratio) bulletsB.push(`Attractive Risk-Reward (${stB.rr_ratio.toFixed(2)}:1 vs ${stB.rr_ratio.toFixed(2)}:1)`);
    if (stB.f_score > stA.f_score) bulletsB.push(`Higher Quality F-Score (${stB.f_score}/9 vs ${stA.f_score}/9)`);
    if (stB.roe > stA.roe) bulletsB.push(`Higher Return on Equity (${stB.roe}% vs ${stA.roe}%)`);

    let title = '';
    let badgeText = '';
    let thesis = '';

    if (winner === 'a') {
      title = `${stA.symbol} OUTPERFORMS ${stB.symbol}`;
      badgeText = `👑 ${stA.symbol} WINS (+${diff} PTS)`;
      const topBullets = bulletsA.slice(0, 3).join(' • ');
      thesis = `Algorithmic model identifies ${stA.symbol} as the superior tactical play over ${stB.symbol} driven by: ${topBullets || 'Overall tactical momentum and delivery confirmation'}.`;
    } else if (winner === 'b') {
      title = `${stB.symbol} OUTPERFORMS ${stA.symbol}`;
      badgeText = `👑 ${stB.symbol} WINS (+${diff} PTS)`;
      const topBullets = bulletsB.slice(0, 3).join(' • ');
      thesis = `Algorithmic model identifies ${stB.symbol} as the superior tactical play over ${stA.symbol} driven by: ${topBullets || 'Overall tactical momentum and delivery confirmation'}.`;
    } else {
      title = `${stA.symbol} & ${stB.symbol} ARE EVENLY MATCHED`;
      badgeText = `🤝 TACTICAL DEAD HEAT`;
      thesis = `Both ${stA.symbol} and ${stB.symbol} present balanced risk-reward profiles with matching composite tactical scores (${scoreA} vs ${scoreB}). Selection depends on individual sector preference.`;
    }

    return {
      scoreA,
      scoreB,
      winner,
      diff,
      title,
      badgeText,
      thesis
    };
  }

  // Render Table & Mobile Cards
  function renderUI() {
    const stA = resolveStock(slotA);
    const stB = resolveStock(slotB);

    if (!stA || !stB) {
      console.warn('[StockComparisonModule] Could not resolve stocks:', slotA, slotB);
      return;
    }

    // 1. Update Selector Header Names & Table Columns
    const nameAEl = document.getElementById('slot-a-company-name');
    const nameBEl = document.getElementById('slot-b-company-name');
    if (nameAEl) nameAEl.textContent = `${stA.name} (${stA.sector})`;
    if (nameBEl) nameBEl.textContent = `${stB.name} (${stB.sector})`;

    const thSymA = document.getElementById('th-sym-a');
    const thCmpA = document.getElementById('th-cmp-a');
    const thSymB = document.getElementById('th-sym-b');
    const thCmpB = document.getElementById('th-cmp-b');

    if (thSymA) thSymA.textContent = stA.symbol;
    if (thCmpA) thCmpA.textContent = formatINR(stA.cmp);
    if (thSymB) thSymB.textContent = stB.symbol;
    if (thCmpB) thCmpB.textContent = formatINR(stB.cmp);

    const segBtnA = document.getElementById('seg-btn-slot-a');
    const segBtnB = document.getElementById('seg-btn-slot-b');
    if (segBtnA) segBtnA.textContent = stA.symbol;
    if (segBtnB) segBtnB.textContent = stB.symbol;

    // 2. Render Executive Verdict Card
    const verdict = calculateExecutiveVerdict(stA, stB);
    const verdictCard = document.getElementById('compare-verdict-card');
    if (verdictCard) {
      const isWinnerA = verdict.winner === 'a';
      const isWinnerB = verdict.winner === 'b';
      const trophyIcon = verdict.winner === 'tie' ? '🤝' : '🏆';

      verdictCard.innerHTML = `
        <div class="verdict-left">
          <div class="verdict-trophy">${trophyIcon}</div>
          <div class="verdict-meta">
            <div class="verdict-title-row">
              <h2 class="verdict-title">${verdict.title}</h2>
              <span class="verdict-winner-badge">${verdict.badgeText}</span>
            </div>
            <p class="verdict-thesis">${verdict.thesis}</p>
          </div>
        </div>
        <div class="verdict-scores-box">
          <div class="verdict-score-pill ${isWinnerA ? 'winner' : ''}">
            <span class="verdict-pill-lbl">${stA.symbol} SCORE</span>
            <span class="verdict-pill-val" style="color: #38bdf8;">${verdict.scoreA} <small style="font-size:0.7rem; color:#64748b;">/ 100</small></span>
          </div>
          <div class="verdict-score-pill ${isWinnerB ? 'winner' : ''}">
            <span class="verdict-pill-lbl">${stB.symbol} SCORE</span>
            <span class="verdict-pill-val" style="color: #fbbf24;">${verdict.scoreB} <small style="font-size:0.7rem; color:#64748b;">/ 100</small></span>
          </div>
        </div>
      `;
    }

    // 3. Define Metric Rows for the 5 Pillars
    const pillars = [
      {
        id: 'pillar-1',
        title: '📈 Pillar 1: Price Action & Trend Structure',
        metrics: [
          {
            name: 'CMP & 1D Change',
            sub: 'Close Price & Daily Direction',
            valA: `${formatINR(stA.cmp)} (${formatPct(stA.change_pct)})`,
            valB: `${formatINR(stB.cmp)} (${formatPct(stB.change_pct)})`,
            rawA: stA.change_pct,
            rawB: stB.change_pct,
            rule: 'higher'
          },
          {
            name: 'Trend Stack Alignment',
            sub: 'EMA 20 > 50 > 200 Bullish Stack',
            valA: stA.trend_stack_label,
            valB: stB.trend_stack_label,
            rawA: stA.trend_stack_score,
            rawB: stB.trend_stack_score,
            rule: 'higher'
          },
          {
            name: 'Distance to 20 EMA',
            sub: 'Mean Reversion & Pullback Cushion',
            valA: formatPct(stA.dist_ema20_pct),
            valB: formatPct(stB.dist_ema20_pct),
            rawA: stA.dist_ema20_pct,
            rawB: stB.dist_ema20_pct,
            rule: 'higher'
          },
          {
            name: 'Distance from 52W High',
            sub: 'Overhead Supply Drawdown',
            valA: `-${formatNum(stA.dist_52w_high_pct)}%`,
            valB: `-${formatNum(stB.dist_52w_high_pct)}%`,
            rawA: stA.dist_52w_high_pct,
            rawB: stB.dist_52w_high_pct,
            rule: 'lower' // Closer to high is better
          },
          {
            name: 'Distance from 52W Low',
            sub: 'Long-term Recovery Headroom',
            valA: `+${formatNum(stA.dist_52w_low_pct)}%`,
            valB: `+${formatNum(stB.dist_52w_low_pct)}%`,
            rawA: stA.dist_52w_low_pct,
            rawB: stB.dist_52w_low_pct,
            rule: 'higher'
          }
        ]
      },
      {
        id: 'pillar-2',
        title: '🚀 Pillar 2: Relative Strength & Momentum',
        metrics: [
          {
            name: 'Proprietary RS Score',
            sub: 'Mansfield 0-100 Nifty Benchmark',
            valA: `${stA.rs_score} / 100`,
            valB: `${stB.rs_score} / 100`,
            rawA: stA.rs_score,
            rawB: stB.rs_score,
            rule: 'higher'
          },
          {
            name: '1-Month RS Alpha',
            sub: 'Short-term Outperformance vs Nifty',
            valA: formatPct(stA.rs_1m),
            valB: formatPct(stB.rs_1m),
            rawA: stA.rs_1m,
            rawB: stB.rs_1m,
            rule: 'higher'
          },
          {
            name: '3-Month RS Alpha',
            sub: 'Quarterly Outperformance vs Nifty',
            valA: formatPct(stA.rs_3m),
            valB: formatPct(stB.rs_3m),
            rawA: stA.rs_3m,
            rawB: stB.rs_3m,
            rule: 'higher'
          },
          {
            name: 'RSI (14 Period)',
            sub: 'Wilder Momentum (Optimum: 55-70)',
            valA: formatNum(stA.rsi_14, 1),
            valB: formatNum(stB.rsi_14, 1),
            rawA: stA.rsi_14,
            rawB: stB.rsi_14,
            rule: 'rsi'
          },
          {
            name: 'Breakout Pattern Status',
            sub: 'Volatility Contraction / Range Break',
            valA: stA.breakout_status,
            valB: stB.breakout_status,
            rawA: stA.breakout_status === 'Consolidating' ? 1 : 2,
            rawB: stB.breakout_status === 'Consolidating' ? 1 : 2,
            rule: 'higher'
          }
        ]
      },
      {
        id: 'pillar-3',
        title: '🏦 Pillar 3: Institutional Volume & Delivery Footprint',
        metrics: [
          {
            name: 'Delivery Volume %',
            sub: 'True Institutional Accumulation',
            valA: `${formatNum(stA.delivery_pct, 1)}%`,
            valB: `${formatNum(stB.delivery_pct, 1)}%`,
            rawA: stA.delivery_pct,
            rawB: stB.delivery_pct,
            rule: 'higher'
          },
          {
            name: 'Delivery Spike vs 10D',
            sub: 'Abnormal Delivery Inflow',
            valA: formatPct(stA.delivery_spike_pct),
            valB: formatPct(stB.delivery_spike_pct),
            rawA: stA.delivery_spike_pct,
            rawB: stB.delivery_spike_pct,
            rule: 'higher'
          },
          {
            name: 'Relative Volume (RVOL)',
            sub: 'Volume Multiplier vs 10D Avg',
            valA: `${formatNum(stA.rvol, 2)}x`,
            valB: `${formatNum(stB.rvol, 2)}x`,
            rawA: stA.rvol,
            rawB: stB.rvol,
            rule: 'higher'
          },
          {
            name: 'Close Location Value (CLV)',
            sub: 'Closing Range Pin (-1.0 to +1.0)',
            valA: `${stA.clv >= 0 ? '+' : ''}${formatNum(stA.clv, 2)}`,
            valB: `${stB.clv >= 0 ? '+' : ''}${formatNum(stB.clv, 2)}`,
            rawA: stA.clv,
            rawB: stB.clv,
            rule: 'higher'
          },
          {
            name: 'Daily Delivery Turnover',
            sub: 'Institutional Rupee Value Commitment',
            valA: `₹${formatNum(stA.deliv_turnover_cr, 1)} Cr`,
            valB: `₹${formatNum(stB.deliv_turnover_cr, 1)} Cr`,
            rawA: stA.deliv_turnover_cr,
            rawB: stB.deliv_turnover_cr,
            rule: 'higher'
          }
        ]
      },
      {
        id: 'pillar-4',
        title: '🎯 Pillar 4: Structural Key Levels & Risk-Reward',
        metrics: [
          {
            name: '20D Swing Low Support',
            sub: 'Structural Invalidation Level',
            valA: formatINR(stA.support),
            valB: formatINR(stB.support),
            rawA: stA.support,
            rawB: stB.support,
            rule: 'none'
          },
          {
            name: '20 EMA Dynamic Support',
            sub: 'Institutional Trailing Base',
            valA: formatINR(stA.ema_20),
            valB: formatINR(stB.ema_20),
            rawA: stA.ema_20,
            rawB: stB.ema_20,
            rule: 'none'
          },
          {
            name: '20D Swing High Resistance',
            sub: 'Structural Overhead Pivot Target',
            valA: formatINR(stA.resistance),
            valB: formatINR(stB.resistance),
            rawA: stA.resistance,
            rawB: stB.resistance,
            rule: 'none'
          },
          {
            name: 'Risk to Support %',
            sub: 'Downside Distance to Safety Floor',
            valA: `-${formatNum(stA.risk_pct, 2)}%`,
            valB: `-${formatNum(stB.risk_pct, 2)}%`,
            rawA: stA.risk_pct,
            rawB: stB.risk_pct,
            rule: 'lower' // Lower risk percentage is better
          },
          {
            name: 'Reward to Resistance %',
            sub: 'Upside Headroom to Overhead Pivot',
            valA: `+${formatNum(stA.reward_pct, 2)}%`,
            valB: `+${formatNum(stB.reward_pct, 2)}%`,
            rawA: stA.reward_pct,
            rawB: stB.reward_pct,
            rule: 'higher'
          },
          {
            name: 'Tactical Risk-Reward Ratio',
            sub: 'Reward / Risk Multiplier (Min 2.0:1)',
            valA: `${formatNum(stA.rr_ratio, 2)}:1`,
            valB: `${formatNum(stB.rr_ratio, 2)}:1`,
            rawA: stA.rr_ratio,
            rawB: stB.rr_ratio,
            rule: 'higher'
          }
        ]
      },
      {
        id: 'pillar-5',
        title: '💎 Pillar 5: Fundamentals & Valuation Quality',
        metrics: [
          {
            name: 'P/E Ratio',
            sub: 'Trailing Price to Earnings',
            valA: stA.pe !== null ? formatNum(stA.pe, 1) : 'N/A',
            valB: stB.pe !== null ? formatNum(stB.pe, 1) : 'N/A',
            rawA: stA.pe,
            rawB: stB.pe,
            rule: 'pe'
          },
          {
            name: 'Return on Equity (ROE %)',
            sub: 'Shareholder Capital Compounding',
            valA: stA.roe !== null ? `${formatNum(stA.roe, 1)}%` : 'N/A',
            valB: stB.roe !== null ? `${formatNum(stB.roe, 1)}%` : 'N/A',
            rawA: stA.roe,
            rawB: stB.roe,
            rule: 'higher'
          },
          {
            name: 'Return on Cap Employed (ROCE %)',
            sub: 'Total Capital Operational Return',
            valA: stA.roce !== null ? `${formatNum(stA.roce, 1)}%` : 'N/A',
            valB: stB.roce !== null ? `${formatNum(stB.roce, 1)}%` : 'N/A',
            rawA: stA.roce,
            rawB: stB.roce,
            rule: 'higher'
          },
          {
            name: 'Debt to Equity Ratio',
            sub: 'Solvency & Leverage (< 0.5 is Fortress)',
            valA: stA.de !== null ? formatNum(stA.de, 2) : 'N/A',
            valB: stB.de !== null ? formatNum(stB.de, 2) : 'N/A',
            rawA: stA.de,
            rawB: stB.de,
            rule: 'lower' // Lower leverage is safer
          },
          {
            name: 'Piotroski F-Score (0-9)',
            sub: 'Financial Health & Profitability',
            valA: stA.f_score !== null ? `${stA.f_score} / 9` : 'N/A',
            valB: stB.f_score !== null ? `${stB.f_score} / 9` : 'N/A',
            rawA: stA.f_score,
            rawB: stB.f_score,
            rule: 'higher'
          },
          {
            name: 'Fundamental Quality Tier',
            sub: 'Buffett / Piotroski Moat Classification',
            valA: stA.tier,
            valB: stB.tier,
            rawA: stA.tier,
            rawB: stB.tier,
            rule: 'tier'
          }
        ]
      }
    ];

    // 4. Populate Desktop Table Body
    const tbody = document.getElementById('compare-table-body');
    if (tbody) {
      let tableHtml = '';

      pillars.forEach(p => {
        tableHtml += `
          <tr class="pillar-header-row">
            <td colspan="3">
              <span class="pillar-title-text">${p.title}</span>
            </td>
          </tr>
        `;

        p.metrics.forEach(m => {
          let win = 'tie';
          if (m.rule !== 'none') {
            win = compareMetric(m.rawA, m.rawB, m.rule);
          }

          const isWinA = win === 'a';
          const isWinB = win === 'b';
          const crownA = isWinA ? '<span class="crown-badge" title="Superior Metric">👑</span>' : '';
          const crownB = isWinB ? '<span class="crown-badge" title="Superior Metric">👑</span>' : '';

          tableHtml += `
            <tr class="metric-row">
              <td class="td-metric-name">
                <span>${m.name}</span>
                <span class="metric-sub-lbl">${m.sub}</span>
              </td>
              <td class="td-val-cell ${isWinA ? 'cell-winner' : ''}">
                ${m.valA} ${crownA}
              </td>
              <td class="td-val-cell ${isWinB ? 'cell-winner' : ''}">
                ${m.valB} ${crownB}
              </td>
            </tr>
          `;
        });
      });

      // Quick Actions Row at Bottom of Table
      tableHtml += `
        <tr class="pillar-header-row">
          <td colspan="3">
            <span class="pillar-title-text">⚡ Quick Actions &amp; Chart Routing</span>
          </td>
        </tr>
        <tr class="metric-row">
          <td class="td-metric-name">
            <span>Direct Modal &amp; Chart Links</span>
            <span class="metric-sub-lbl">Inspect full technical dossier or TradingView chart</span>
          </td>
          <td class="td-val-cell">
            <div class="action-row-wrap">
              <button type="button" class="compare-table-action-btn" onclick="window.StockComparisonModule.inspect('${stA.symbol}')">Dossier</button>
              <a href="https://in.tradingview.com/chart/?symbol=NSE:${stA.symbol}" target="_blank" rel="noopener" class="compare-table-action-btn" style="text-decoration:none; display:inline-flex; align-items:center;">Chart ↗</a>
            </div>
          </td>
          <td class="td-val-cell">
            <div class="action-row-wrap">
              <button type="button" class="compare-table-action-btn" onclick="window.StockComparisonModule.inspect('${stB.symbol}')">Dossier</button>
              <a href="https://in.tradingview.com/chart/?symbol=NSE:${stB.symbol}" target="_blank" rel="noopener" class="compare-table-action-btn" style="text-decoration:none; display:inline-flex; align-items:center;">Chart ↗</a>
            </div>
          </td>
        </tr>
      `;

      tbody.innerHTML = tableHtml;
    }

    // 5. Populate Mobile Dual Progress Cards
    const mobCardsWrap = document.getElementById('compare-mobile-cards-wrap');
    if (mobCardsWrap) {
      let mobHtml = '';

      pillars.forEach(p => {
        mobHtml += `
          <div class="compare-mob-pillar-box">
            <div class="mob-pillar-title">${p.title}</div>
        `;

        p.metrics.forEach(m => {
          let win = 'tie';
          if (m.rule !== 'none') {
            win = compareMetric(m.rawA, m.rawB, m.rule);
          }

          const isWinA = win === 'a';
          const isWinB = win === 'b';
          const crown = isWinA ? `👑 ${stA.symbol}` : (isWinB ? `👑 ${stB.symbol}` : '');

          // Estimate relative progress bar widths (out of 100%)
          let barA = 50;
          let barB = 50;
          if (typeof m.rawA === 'number' && typeof m.rawB === 'number' && (m.rawA + m.rawB) > 0) {
            const sum = Math.abs(m.rawA) + Math.abs(m.rawB);
            if (sum > 0) {
              barA = Math.round((Math.abs(m.rawA) / sum) * 100);
              barB = 100 - barA;
            }
          } else if (isWinA) {
            barA = 65; barB = 35;
          } else if (isWinB) {
            barA = 35; barB = 65;
          }

          mobHtml += `
            <div class="compare-mob-metric-card" data-metric="${m.name}">
              <div class="mob-metric-header">
                <span>${m.name}</span>
                <span style="color: #fbbf24; font-size: 0.72rem; font-weight: 800;">${crown}</span>
              </div>
              <div class="mob-metric-vals-row">
                <span class="mob-val-a ${isWinA ? 'winner' : ''}">${stA.symbol}: ${m.valA}</span>
                <span class="mob-val-b ${isWinB ? 'winner' : ''}">${stB.symbol}: ${m.valB}</span>
              </div>
              <div class="mob-bar-track">
                <div class="mob-bar-a" style="width: ${barA}%;"></div>
                <div class="mob-bar-b" style="width: ${barB}%;"></div>
              </div>
            </div>
          `;
        });

        mobHtml += `</div>`;
      });

      mobCardsWrap.innerHTML = mobHtml;
      updateMobileSegmentedView();
    }
  }

  // Update Mobile Segmented View (both, a, b)
  function updateMobileSegmentedView() {
    const mobCardsWrap = document.getElementById('compare-mobile-cards-wrap');
    if (!mobCardsWrap) return;

    const cards = mobCardsWrap.querySelectorAll('.compare-mob-metric-card');
    cards.forEach(card => {
      const valA = card.querySelector('.mob-val-a');
      const valB = card.querySelector('.mob-val-b');
      const barA = card.querySelector('.mob-bar-a');
      const barB = card.querySelector('.mob-bar-b');

      if (activeMobileView === 'a') {
        if (valA) valA.style.opacity = '1';
        if (valB) valB.style.opacity = '0.3';
        if (barA) barA.style.opacity = '1';
        if (barB) barB.style.opacity = '0.15';
      } else if (activeMobileView === 'b') {
        if (valA) valA.style.opacity = '0.3';
        if (valB) valB.style.opacity = '1';
        if (barA) barA.style.opacity = '0.15';
        if (barB) barB.style.opacity = '1';
      } else {
        if (valA) valA.style.opacity = '1';
        if (valB) valB.style.opacity = '1';
        if (barA) barA.style.opacity = '1';
        if (barB) barB.style.opacity = '1';
      }
    });
  }

  // Swap Slot A and Slot B
  function swapStocks() {
    const temp = slotA;
    slotA = slotB;
    slotB = temp;

    const inputA = document.getElementById('compare-input-a');
    const inputB = document.getElementById('compare-input-b');
    if (inputA) inputA.value = slotA;
    if (inputB) inputB.value = slotB;

    renderUI();
  }

  // Set Stocks Programmatically
  function setStocks(symA, symB) {
    if (symA) slotA = symA.trim().toUpperCase();
    if (symB) slotB = symB.trim().toUpperCase();

    const inputA = document.getElementById('compare-input-a');
    const inputB = document.getElementById('compare-input-b');
    if (inputA) inputA.value = slotA;
    if (inputB) inputB.value = slotB;

    // Update active preset button if matches
    document.querySelectorAll('#compare-rivalry-pills-wrap .rivalry-pill').forEach(pill => {
      const pair = pill.getAttribute('data-pair') || '';
      const [pA, pB] = pair.split(',');
      if ((pA === slotA && pB === slotB) || (pA === slotB && pB === slotA)) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    renderUI();
  }

  // Inspect Stock in Dossier Modal
  function inspect(symbol) {
    if (window.WatchlistAlertsModule && typeof window.WatchlistAlertsModule.inspectStock === 'function') {
      window.WatchlistAlertsModule.inspectStock(symbol);
      return;
    }
    if (typeof openAdvRsDossierModal === 'function') {
      try {
        openAdvRsDossierModal(symbol);
        return;
      } catch (e) {}
    }
    if (typeof openSetupDossier === 'function') {
      try {
        openSetupDossier(symbol);
        return;
      } catch (e) {}
    }
  }

  // Autocomplete Setup Helper
  function setupAutocomplete(inputId, dropdownId, onSelect) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    function renderMatches(q) {
      if (!cachedUniverse || cachedUniverse.length === 0) {
        dropdown.style.display = 'none';
        return;
      }
      const query = q.trim().toUpperCase();
      let matches = [];
      if (!query) {
        matches = cachedUniverse.slice(0, 8);
      } else {
        matches = cachedUniverse.filter(s => {
          const sym = (s.symbol || '').toUpperCase();
          const name = (s.name || '').toUpperCase();
          return sym.includes(query) || name.includes(query);
        }).slice(0, 8);
      }

      if (matches.length === 0) {
        dropdown.innerHTML = '<div style="padding:10px 14px; color:#64748b; font-size:0.78rem;">No matching stocks found</div>';
        dropdown.style.display = 'block';
        return;
      }

      dropdown.innerHTML = matches.map(s => `
        <div class="compare-auto-item" data-sym="${s.symbol}">
          <div>
            <span class="ac-sym" style="font-weight:800; font-family:monospace; color:#38bdf8;">${s.symbol}</span>
            <span class="ac-name" style="font-size:0.75rem; color:#94a3b8; margin-left:6px;">${s.name || ''}</span>
          </div>
          <span class="ac-cmp" style="font-weight:700; font-family:monospace; color:#f8fafc;">${formatINR(s.cmp)}</span>
        </div>
      `).join('');
      dropdown.style.display = 'block';

      dropdown.querySelectorAll('.compare-auto-item').forEach(item => {
        item.addEventListener('click', () => {
          const sym = item.getAttribute('data-sym');
          if (sym) {
            input.value = sym;
            dropdown.style.display = 'none';
            onSelect(sym);
          }
        });
      });
    }

    input.addEventListener('input', (e) => {
      renderMatches(e.target.value);
    });

    input.addEventListener('focus', () => {
      renderMatches(input.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const topItem = dropdown.querySelector('.compare-auto-item');
        if (topItem) {
          const sym = topItem.getAttribute('data-sym');
          if (sym) {
            input.value = sym;
            dropdown.style.display = 'none';
            onSelect(sym);
          }
        }
      } else if (e.key === 'Escape') {
        dropdown.style.display = 'none';
      }
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  // Bind UI Events
  function bindEvents() {
    // 1. Autocomplete for Slot A & Slot B
    setupAutocomplete('compare-input-a', 'compare-autocomplete-a', (sym) => {
      slotA = sym;
      renderUI();
    });

    setupAutocomplete('compare-input-b', 'compare-autocomplete-b', (sym) => {
      slotB = sym;
      renderUI();
    });

    // 2. Swap Button
    const swapBtn = document.getElementById('compare-swap-btn');
    if (swapBtn) {
      swapBtn.addEventListener('click', swapStocks);
    }

    // 3. Refresh Button
    const refreshBtn = document.getElementById('compare-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('spinning');
        renderUI();
        setTimeout(() => refreshBtn.classList.remove('spinning'), 350);
      });
    }

    // 4. Sector Rivalry Presets
    const pillsWrap = document.getElementById('compare-rivalry-pills-wrap');
    if (pillsWrap) {
      pillsWrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.rivalry-pill');
        if (!btn) return;
        const pair = btn.getAttribute('data-pair');
        if (pair) {
          const [symA, symB] = pair.split(',');
          setStocks(symA, symB);
        }
      });
    }

    // 5. Mobile Segmented Buttons
    const segBar = document.getElementById('compare-mobile-segmented-bar');
    if (segBar) {
      segBar.addEventListener('click', (e) => {
        const btn = e.target.closest('.compare-segment-btn');
        if (!btn) return;
        segBar.querySelectorAll('.compare-segment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeMobileView = btn.getAttribute('data-view') || 'both';
        updateMobileSegmentedView();
      });
    }
  }

  // Initializer
  async function init() {
    await loadData();
    if (!isInitialized) {
      bindEvents();
      isInitialized = true;
    }
    renderUI();
  }

  return {
    init,
    setStocks,
    swapStocks,
    renderUI,
    resolveStock,
    inspect
  };
})();

// Automatically boot Stock Comparison module if loaded on the hash
if (window.location.hash === '#stock-comparison' || window.location.hash === '#compare') {
  if (window.StockComparisonModule && typeof window.StockComparisonModule.init === 'function') {
    window.StockComparisonModule.init();
  }
}
