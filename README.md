# MITS Pro Institutional Suite V2 (MITS Pro Scanner)

> **Exclusive Pro Members Zone** • Real-Time & EOD Quantitative Market Scanner for Indian Equities (NIFTY 500).

---

## 💎 Product Identity & Aesthetics

- **Brand Aesthetic**: Ultra-modern **Luxury Golden / Amber Dark Theme** designed specifically for institutional trading and proprietary desk analytics.
- **Design Tokens**: Obsidian & Midnight Slate base (`#06090e`, `#101726`), Metallic Gold & Amber gradients (`#f59e0b`, `#fbbf24`, `#d97706`), refined borders, and glassmorphism cards.
- **Fluid Viewport Architecture**: 100% full-width viewport responsiveness without artificial desktop container bottlenecks (`max-width` free layout).
- **Mobile UX**: Touch-optimized horizontal scrolling data table with a **sticky left symbol/ticker column** ensuring stock names stay permanently visible while panning across technical metrics.
- **11-Column Institutional Table Layout**: Symbol, Sector, CMP, Change %, RVOL, Score & Grade, Trigger Status, Invalidation (SL), Entry & Targets (R:R), Evidence Tags, and Interactive Chart Action.

---

## ⚡ The 6 Verified Institutional Scanners

| Tab | Setup Name | Quantitative Engine & Methodology |
| :--- | :--- | :--- |
| **Setup 1** | **Bottom Reversal Pro** | Early institutional reversal, liquidity sweeps, accumulation base (<8%), bullish structure shift (CHoCH), and volume absorption. |
| **Setup 2** | **Alpha Momentum** | NIFTY 500 multi-timeframe relative strength outperformance (1M, 3M, 6M, 1Y vs NIFTY 50), volume expansion, and 10–60D base recovery. |
| **Setup 3** | **High Tight Flag (HTF)** | Explosive institutional momentum rally (≥ +40% within ≤ 40 days), shallow flag consolidation (≤ 20%), and volume dry-up. |
| **Setup 4** | **Weekly Swing** | Multi-timeframe institutional weekly swing structure, weekly EMA alignment, pivot point support hold, and low-risk accumulation. |
| **Setup 5** | **Stage-2 Pullback** | Institutional low-risk entries at key moving average supports (20 EMA / 50 EMA) during verified Stage-2 uptrends (Price > 50 EMA > 200 EMA). |
| **Setup 6** | **DBR Demand Zone** | Institutional order block accumulation, Drop-Base-Rally structures, fresh demand zone retests, and explosive leg-out expansions. |

---

## 🚀 Dual Distribution Targets

### 1. Root Web App (`index.html`) — GitHub Pages Ready
- Fully configured standalone web application with zero external framework dependencies.
- **Instant Local-Storage Cache**: Loads cached data in `<1ms` from `localStorage` on initial paint with zero layout shift, then transparently updates with live JSON feeds.
- Ready for GitHub Pages deployment (`Settings > Pages > Build and deployment > Source: Deploy from a branch > Branch: main / (root)`).

### 2. WordPress & Elementor Embed (`wordpress_live_embed.html`)
- **Engineered for Direct Injection**: Fully scoped under `#mits-pro-embed-root` so WordPress theme CSS (e.g., Astra, Divi, Hello Elementor) will **not** distort the scanner, nor will scanner styles bleed into WordPress.
- **How to Inject**:
  1. Open your target page in **Elementor** or the WordPress Block Editor.
  2. Add an **HTML** widget (set section to **Full Width / Stretch**).
  3. Paste the contents of `wordpress_live_embed.html`.
  4. Point `MITS_PRO_REMOTE_BASE` to your GitHub Pages URL or relative `./data/`.

---

## ⏱️ Daily EOD Automation (4:15 PM IST / 10:45 UTC)

A turnkey GitHub Actions workflow is configured in [`.github/workflows/eod_scan.yml`](.github/workflows/eod_scan.yml):
- **Schedule**: Executes automatically on weekdays at **4:15 PM IST (10:45 UTC)**, 45 minutes after Indian equity markets close.
- **Data Engine**: Runs `scripts/run_pipeline.py` using Python and `yfinance` to process the entire NIFTY 500 universe with 5 parallel workers.
- **Autonomous EOD Processing**: Broker APIs are **not** required for this pipeline. The engine computes mathematical setups, relative strength against NIFTY 50, dynamic index benchmarks, and sector matrix metrics directly.
- **Automated Commit & Push**: Automatically commits and pushes updated `data/*.json` files back to `main`, instantly refreshing GitHub Pages and live embeds.
- **Manual Trigger**: Supports on-demand execution via GitHub Actions `workflow_dispatch`.

---

## 📂 Project Structure

```text
MITS-Pro-Scanner-V2/
├── .github/
│   └── workflows/
│       └── eod_scan.yml            # Weekday cron automation at 4:15 PM IST (10:45 UTC)
├── css/
│   ├── tokens.css                  # Golden / Amber luxury design tokens
│   └── style.css                   # Responsive full-width layout & sticky table architecture
├── data/
│   ├── market_summary.json         # Live market breadth, index snapshots, sector matrix
│   ├── scanner_results.json        # Unified payload for all 6 Pro Setups
│   ├── symbols.json                # NIFTY 500 universe configuration
│   ├── tab1_bottom_reversal.json   # Bottom Reversal Pro signals
│   ├── tab2_alpha_momentum.json    # Alpha Momentum signals
│   ├── tab3_htf.json               # High Tight Flag signals
│   ├── tab4_weekly_swing.json      # Weekly Swing Watchlist signals
│   ├── tab5_stage2_pullback.json   # Stage-2 Pullback signals
│   └── tab6_dbr.json               # DBR Demand Zone signals
├── js/
│   └── app.js                      # Vanilla JS state manager & localStorage cache layer
├── scripts/
│   ├── config.py                   # Paths, universe, and setup definitions
│   ├── run_pipeline.py             # Master EOD scanner pipeline coordinator
│   ├── scanner_engine.py           # Core indicators and screening utilities
│   ├── tab1_bottom_reversal.py     # Tab 1 quantitative engine
│   ├── tab2_alpha_momentum.py      # Tab 2 quantitative engine
│   ├── tab3_htf.py                 # Tab 3 quantitative engine
│   ├── tab4_weekly_swing.py        # Tab 4 quantitative engine
│   ├── tab5_stage2_pullback.py     # Tab 5 quantitative engine
│   ├── tab6_dbr.py                 # Tab 6 quantitative engine
│   └── yfinance_feed.py            # Technical indicator & feature calculation
├── tests/                          # Automated unit & integration tests
├── .env.example                    # Local environment variable template
├── .gitignore                      # Git ignore rules for Python, IDE, and cache
├── index.html                      # Production-ready GitHub Pages root application
├── requirements.txt                # Python dependencies
├── wordpress_live_embed.html       # Scoped, self-contained WordPress / Elementor embed
└── README.md                       # Documentation
```

---

## 💻 Local Testing & Execution

```bash
# 1. Run all unit and schema verification tests
python -m unittest discover tests

# 2. Run the complete EOD scanner pipeline locally
python scripts/run_pipeline.py

# 3. Preview web app locally
python -m http.server 8080
```
Open `http://localhost:8080` in your browser.
