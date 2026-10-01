/**
 * MITS Pro Institutional Suite V2 - Standalone Custom Scanner Engine
 * High-performance client-side in-memory screening engine (< 2ms execution).
 * Evaluates 500+ NSE liquid equities instantly without server reloads.
 */

(function () {
  'use strict';

  // State Management
  const state = {
    masterData: [],
    meta: {},
    filteredStocks: [],
    currentPage: 1,
    pageSize: 20,
    sortColumn: 'turnover_cr',
    sortDirection: 'desc',
    activePreset: null,
    searchQuery: '',
    filters: {
      breakoutType: 'ANY',    // ANY, BREAKOUT, BREAKDOWN, RETEST_SUPPORT, RETEST_RESISTANCE
      breakoutDays: '20',     // 10, 20, 50, 52W
      rsiMode: 'ANY',         // ANY, ABOVE, BELOW, BETWEEN
      rsiVal1: 50,
      rsiVal2: 70,
      proximity52w: 'ANY',    // ANY, NEW_HIGH, WITHIN_2, WITHIN_5, WITHIN_10, STAGE2_BASE
      bbSqueeze: false,
      nr7Coil: false,
      atrContraction: false,
      openEqualsLow: false,
      clvHigh: false,
      hammerSweep: false,
      nearEma20: false,
      nearEma20_2: false,
      ema20Bounce: false,
      trendStack: false,
      minDeliveryPct: 0,
      minDeliverySpike: 0,
      minRvol: 0,
      minDelivTurnoverCr: 0,
      minTurnoverCr: 0,
      minRsScore: 0,
      sector: 'ALL'
    }
  };

  // Preset Definitions
  const PRESETS = {
    whale: {
      name: "🐳 Whale Footprint",
      description: "High institutional absorption: Delivery % > 50%, Spike > 50%, Price above 20 EMA",
      filters: {
        minDeliveryPct: 50,
        minDeliverySpike: 50,
        nearEma20: false,
        trendStack: false,
        breakoutType: 'ANY',
        rsiMode: 'ANY',
        proximity52w: 'ANY'
      },
      customPredicate: (s) => s.cmp > s.ema_20 && s.delivery_pct >= 50 && s.delivery_spike_pct >= 50
    },
    momentum: {
      name: "🚀 Momentum Breakout",
      description: "High-conviction 20D expansion: 20D Breakout, RVOL > 2.0x, CLV > 90%",
      filters: {
        breakoutType: 'BREAKOUT',
        breakoutDays: '20',
        minRvol: 2.0,
        clvHigh: true
      },
      customPredicate: (s) => s.breakout_20d && s.rvol >= 2.0 && s.clv >= 0.90
    },
    vcp: {
      name: "🎯 Low-Risk VCP Pullback",
      description: "Volatility contraction coil: BB Squeeze or NR7, near 20 EMA, RS Score > 70",
      filters: {
        nearEma20: true,
        minRsScore: 70
      },
      customPredicate: (s) => (s.bb_squeeze || s.is_nr7) && Math.abs(s.dist_ema20_pct) <= 2.0 && s.rs_score >= 70
    }
  };

  // DOM Elements Cache
  const dom = {};

  function cacheDom() {
    dom.sessionDate = document.getElementById('cs-session-date');
    dom.lastSync = document.getElementById('cs-last-sync');
    dom.totalUniverse = document.getElementById('cs-total-universe');
    dom.matchCount = document.getElementById('cs-match-count');
    dom.evalSpeed = document.getElementById('cs-eval-speed');
    dom.tableBody = document.getElementById('cs-table-body');
    dom.pagination = document.getElementById('cs-pagination');
    dom.pageInfo = document.getElementById('cs-page-info');
    dom.pageControls = document.getElementById('cs-page-controls');
    dom.exportBtn = document.getElementById('cs-export-btn');
    dom.resetBtn = document.getElementById('cs-reset-btn');
    dom.searchInput = document.getElementById('cs-search-input');
    dom.sectorSelect = document.getElementById('cs-sector-select');

    // Controls
    dom.breakoutType = document.getElementById('cs-bo-type');
    dom.breakoutDays = document.getElementById('cs-bo-days');
    dom.rsiMode = document.getElementById('cs-rsi-mode');
    dom.rsiVal1 = document.getElementById('cs-rsi-val1');
    dom.rsiVal2 = document.getElementById('cs-rsi-val2');
    dom.rsiInputs = document.getElementById('cs-rsi-inputs');
    dom.rsiBetweenBox = document.getElementById('cs-rsi-between-box');
    dom.proximity52w = document.getElementById('cs-52w-prox');

    // Toggles
    dom.bbSqueeze = document.getElementById('cs-chk-bb-squeeze');
    dom.nr7Coil = document.getElementById('cs-chk-nr7');
    dom.atrContraction = document.getElementById('cs-chk-atr');
    dom.openEqualsLow = document.getElementById('cs-chk-marubozu');
    dom.clvHigh = document.getElementById('cs-chk-clv');
    dom.hammerSweep = document.getElementById('cs-chk-hammer');
    dom.nearEma20 = document.getElementById('cs-chk-near-ema20');
    dom.nearEma20_2 = document.getElementById('cs-chk-near-ema20-2');
    dom.ema20Bounce = document.getElementById('cs-chk-ema20-bounce');
    dom.trendStack = document.getElementById('cs-chk-trend-stack');

    // Number Inputs
    dom.minDeliveryPct = document.getElementById('cs-inp-deliv-pct');
    dom.minDeliverySpike = document.getElementById('cs-inp-deliv-spike');
    dom.minRvol = document.getElementById('cs-inp-rvol');
    dom.minDelivTurnoverCr = document.getElementById('cs-inp-deliv-turnover');
    dom.minTurnoverCr = document.getElementById('cs-inp-turnover');
    dom.minRsScore = document.getElementById('cs-inp-rs-score');

    // Modal
    dom.savePresetBtn = document.getElementById('cs-save-preset-btn');
    dom.modalOverlay = document.getElementById('cs-modal-overlay');
    dom.presetNameInput = document.getElementById('cs-preset-name-input');
    dom.modalCancelBtn = document.getElementById('cs-modal-cancel');
    dom.modalSaveBtn = document.getElementById('cs-modal-save');
    dom.savedPresetsSelect = document.getElementById('cs-saved-presets-select');
    dom.runScanBtn = document.getElementById('cs-run-scan-btn');
    dom.resetAllBtn = document.getElementById('cs-reset-all-btn');
  }

  function applyLoadedUniverse(data) {
    state.masterData = data.stocks || [];
    state.meta = {
      updatedAt: data.updated_at,
      tradeDate: data.trade_session_date,
      dateDisplay: data.session_date_display || data.trade_session_date,
      universeCount: data.universe_count || state.masterData.length
    };

    updateHeaderMeta();
    populateSectorDropdown();
    loadCustomPresetsFromStorage();
    evaluateFilters();
  }

  // Data Ingestion
  async function loadUniverseData() {
    // 1. First check window global (Guarantees 100% CORS-free file:// & local execution)
    if (window.MITS_MASTER_UNIVERSE_DATA && window.MITS_MASTER_UNIVERSE_DATA.stocks && window.MITS_MASTER_UNIVERSE_DATA.stocks.length > 0) {
      applyLoadedUniverse(window.MITS_MASTER_UNIVERSE_DATA);
      return;
    }

    const urls = [
      'data/master_universe_eod.json',
      '../data/master_universe_eod.json',
      'https://ganistock-ops.github.io/MITS-Pro-Scanner-V2/data/master_universe_eod.json',
      'https://raw.githubusercontent.com/ganistock-ops/MITS-Pro-Scanner-V2/main/data/master_universe_eod.json'
    ];

    let data = null;
    for (const url of urls) {
      try {
        const resp = await fetch(url + '?_t=' + Date.now());
        if (resp.ok) {
          data = await resp.json();
          break;
        }
      } catch (err) {
        // try next
      }
    }

    if (!data || !data.stocks) {
      if (dom.tableBody) {
        dom.tableBody.innerHTML = `
          <tr>
            <td colspan="10" style="text-align:center; padding: 3rem; color: #f87171;">
              ⚠️ Unable to load EOD Master Universe data.<br>
              <small style="color: #94a3b8; margin-top: 8px; display: inline-block;">
                Tip: Run via local server: <code>python -m http.server 8000</code> and open <code>http://localhost:8000/custom_scanner.html</code>
              </small>
            </td>
          </tr>
        `;
      }
      return;
    }

    applyLoadedUniverse(data);
  }

  function updateHeaderMeta() {
    if (dom.sessionDate) {
      dom.sessionDate.textContent = state.meta.dateDisplay || 'EOD';
    }
    if (dom.lastSync) {
      const dt = state.meta.updatedAt ? new Date(state.meta.updatedAt) : new Date();
      dom.lastSync.textContent = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST';
    }
    if (dom.totalUniverse) {
      dom.totalUniverse.textContent = state.masterData.length;
    }
  }

  function populateSectorDropdown() {
    if (!dom.sectorSelect) return;
    const sectors = new Set();
    state.masterData.forEach(s => {
      if (s.sector) sectors.add(s.sector);
    });

    const sortedSectors = Array.from(sectors).sort();
    let html = '<option value="ALL">All Sectors (' + sortedSectors.length + ')</option>';
    sortedSectors.forEach(sec => {
      html += `<option value="${sec}">${sec}</option>`;
    });
    dom.sectorSelect.innerHTML = html;
  }

  // Fast In-Memory Screening Engine (< 2ms)
  function evaluateFilters() {
    const t0 = performance.now();
    const f = state.filters;
    const q = state.searchQuery.toLowerCase().trim();

    let predicate = (s) => true;

    // Active Quick Preset override
    if (state.activePreset && PRESETS[state.activePreset] && PRESETS[state.activePreset].customPredicate) {
      predicate = PRESETS[state.activePreset].customPredicate;
    }

    const results = [];
    const len = state.masterData.length;

    for (let i = 0; i < len; i++) {
      const s = state.masterData[i];

      // Text Search
      if (q) {
        const symMatch = s.symbol.toLowerCase().includes(q);
        const nameMatch = s.name && s.name.toLowerCase().includes(q);
        if (!symMatch && !nameMatch) continue;
      }

      // Check preset-specific logic if active
      if (!predicate(s)) continue;

      // Section A: Breakout / Retest
      if (f.breakoutType !== 'ANY') {
        const days = f.breakoutDays;
        if (f.breakoutType === 'BREAKOUT') {
          if (days === '10' && !s.breakout_10d) continue;
          if (days === '20' && !s.breakout_20d) continue;
          if (days === '50' && !s.breakout_50d) continue;
          if (days === '52W' && !s.breakout_52w) continue;
        } else if (f.breakoutType === 'BREAKDOWN') {
          if (days === '10' && !s.breakdown_10d) continue;
          if (days === '20' && !s.breakdown_20d) continue;
          if (days === '50' && !s.breakdown_50d) continue;
          if (days === '52W' && !s.breakdown_52w) continue;
        } else if (f.breakoutType === 'RETEST_SUPPORT') {
          if (days === '10' && !s.retest_support_10d) continue;
          if (days === '20' && !s.retest_support_20d) continue;
          if (days === '50' && !s.retest_support_50d) continue;
          if (days === '52W' && !s.retest_support_52w) continue;
        } else if (f.breakoutType === 'RETEST_RESISTANCE') {
          if (days === '10' && !s.retest_resistance_10d) continue;
          if (days === '20' && !s.retest_resistance_20d) continue;
          if (days === '50' && !s.retest_resistance_50d) continue;
          if (days === '52W' && !s.retest_resistance_52w) continue;
        }
      }

      // Section B: RSI (14)
      if (f.rsiMode === 'ABOVE') {
        if (s.rsi_14 < f.rsiVal1) continue;
      } else if (f.rsiMode === 'BELOW') {
        if (s.rsi_14 > f.rsiVal1) continue;
      } else if (f.rsiMode === 'BETWEEN') {
        const rMin = Math.min(f.rsiVal1, f.rsiVal2);
        const rMax = Math.max(f.rsiVal1, f.rsiVal2);
        if (s.rsi_14 < rMin || s.rsi_14 > rMax) continue;
      }

      // Section C: 52-Week Proximity
      if (f.proximity52w === 'NEW_HIGH') {
        if (!s.is_new_52w_high) continue;
      } else if (f.proximity52w === 'WITHIN_2') {
        if (s.dist_52w_high_pct > 2.0) continue;
      } else if (f.proximity52w === 'WITHIN_5') {
        if (s.dist_52w_high_pct > 5.0) continue;
      } else if (f.proximity52w === 'WITHIN_10') {
        if (s.dist_52w_high_pct > 10.0) continue;
      } else if (f.proximity52w === 'STAGE2_BASE') {
        if (s.dist_52w_low_pct < 30.0) continue;
      }

      // Section D: Volatility & VCP Toggles
      if (f.bbSqueeze && !s.bb_squeeze) continue;
      if (f.nr7Coil && !s.is_nr7) continue;
      if (f.atrContraction && !s.atr_contraction) continue;

      // Section E: Candle Footprint
      if (f.openEqualsLow && !s.open_equals_low) continue;
      if (f.clvHigh && !s.clv_high) continue;
      if (f.hammerSweep && !s.hammer_liquidity_sweep) continue;

      // Section F: MA Proximity & Bounce
      if (f.nearEma20 && !s.near_ema20) continue;
      if (f.nearEma20_2 && !s.near_ema20_2) continue;
      if (f.ema20Bounce && !s.ema20_bounce) continue;
      if (f.trendStack && !s.trend_stack) continue;

      // Section G: Smart Money & Volume Footprint
      if (f.minDeliveryPct > 0 && s.delivery_pct < f.minDeliveryPct) continue;
      if (f.minDeliverySpike > 0 && s.delivery_spike_pct < f.minDeliverySpike) continue;
      if (f.minRvol > 0 && s.rvol < f.minRvol) continue;
      if (f.minDelivTurnoverCr > 0 && s.deliv_turnover_cr < f.minDelivTurnoverCr) continue;
      if (f.minTurnoverCr > 0 && s.turnover_cr < f.minTurnoverCr) continue;
      if (f.minRsScore > 0 && s.rs_score < f.minRsScore) continue;
      if (f.sector !== 'ALL' && s.sector !== f.sector) continue;

      results.push(s);
    }

    // Apply Sorting
    sortResults(results, state.sortColumn, state.sortDirection);

    state.filteredStocks = results;
    state.currentPage = 1;

    const t1 = performance.now();
    const evalMs = (t1 - t0).toFixed(2);

    if (dom.matchCount) {
      dom.matchCount.innerHTML = `<span>${results.length}</span> of ${state.masterData.length} stocks`;
    }
    if (dom.evalSpeed) {
      dom.evalSpeed.textContent = `⚡ ${evalMs} ms`;
    }

    renderTable();
  }

  function sortResults(arr, col, dir) {
    const mult = dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va = a[col];
      let vb = b[col];
      if (typeof va === 'string') {
        return va.localeCompare(vb) * mult;
      }
      if (va == null) va = -Infinity;
      if (vb == null) vb = -Infinity;
      return (va - vb) * mult;
    });
  }

  // Render Table & Pagination
  function renderTable() {
    if (!dom.tableBody) return;

    if (state.filteredStocks.length === 0) {
      dom.tableBody.innerHTML = `
        <tr>
          <td colspan="10">
            <div class="cs-empty-state">
              <div class="cs-empty-icon">🔍</div>
              <div class="cs-empty-title">No Qualifying Institutional Setups</div>
              <div class="cs-empty-sub">
                No stocks currently match your exact filter confluence. Try loosening parameters, clicking a Quick Preset, or clearing active filters.
              </div>
              <button class="cs-btn-sm cs-btn-reset" onclick="window.customScannerReset()">Reset All Filters</button>
            </div>
          </td>
        </tr>
      `;
      renderPagination(0);
      return;
    }

    const startIdx = (state.currentPage - 1) * state.pageSize;
    const endIdx = Math.min(startIdx + state.pageSize, state.filteredStocks.length);
    const pageRows = state.filteredStocks.slice(startIdx, endIdx);

    let html = '';
    for (let i = 0; i < pageRows.length; i++) {
      const s = pageRows[i];

      const chgClass = s.change_pct >= 0 ? 'cs-tag-bullish' : 'cs-tag-bearish';
      const chgSign = s.change_pct >= 0 ? '+' : '';

      // Breakout badge style
      let sigBadgeClass = 'cs-sig-neutral';
      if (s.breakout_status.includes('Breakout')) {
        sigBadgeClass = 'cs-sig-breakout';
      } else if (s.breakout_status.includes('Retest')) {
        sigBadgeClass = 'cs-sig-retest';
      } else if (s.breakout_status.includes('Breakdown')) {
        sigBadgeClass = 'cs-sig-breakdown';
      }

      // RS Leader star
      const rsStar = s.rs_score >= 80 ? ' <span title="Institutional RS Leader (Score > 80)" style="color:#fbbf24;">★</span>' : '';
      const newHighBadge = s.is_new_52w_high ? ' <span style="font-size:0.68rem; background:rgba(251,191,36,0.18); color:#fbbf24; border:1px solid rgba(251,191,36,0.4); padding:1px 4px; border-radius:4px; font-weight:700;">52W HIGH</span>' : '';

      // Moving Average proximity indicator
      let maHtml = '';
      if (s.near_ema20) {
        maHtml += `<span style="color:#34d399; font-weight:600;">Near 20 EMA (${s.dist_ema20_pct > 0 ? '+' : ''}${s.dist_ema20_pct}%)</span>`;
      } else {
        maHtml += `<span style="color:#94a3b8;">${s.dist_ema20_pct > 0 ? '+' : ''}${s.dist_ema20_pct}%</span>`;
      }
      if (s.trend_stack) {
        maHtml += ` <span title="Trend Stack (CMP > 20 > 50 > 200 EMA)" style="color:#fbbf24; font-size:0.75rem;">▲ Stack</span>`;
      }

      html += `
        <tr>
          <td>
            <div class="cs-sym-box">
              <a href="${s.tv_url}" target="_blank" rel="noopener noreferrer" class="cs-sym-link">
                ${s.symbol}${rsStar}${newHighBadge}
              </a>
              <div class="cs-sym-name" title="${s.name}">${s.name}</div>
            </div>
          </td>
          <td><span style="color:#94a3b8; font-size:0.8rem;">${s.sector}</span></td>
          <td>
            <strong style="font-family:var(--font-mono); color:#ffffff;">₹${s.cmp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </td>
          <td>
            <span class="${chgClass}">${chgSign}${s.change_pct.toFixed(2)}%</span>
          </td>
          <td>
            <div style="font-family:var(--font-mono); font-weight:600; color:#f8fafc;">
              ${s.delivery_pct.toFixed(1)}%
              ${s.delivery_spike_pct > 20 ? `<small style="color:#34d399; margin-left:4px;">(+${s.delivery_spike_pct.toFixed(0)}%)</small>` : ''}
            </div>
          </td>
          <td>
            <div style="font-family:var(--font-mono); color:${s.rvol >= 2.0 ? '#fbbf24' : '#f8fafc'}; font-weight:${s.rvol >= 2.0 ? '700' : '500'};">
              ${s.rvol.toFixed(2)}x
            </div>
            <div style="font-size:0.72rem; color:#64748b;">₹${s.turnover_cr.toFixed(1)} Cr</div>
          </td>
          <td>
            <span style="font-family:var(--font-mono); font-weight:600; color:${s.rsi_14 >= 60 ? '#34d399' : (s.rsi_14 <= 40 ? '#fb7185' : '#e2e8f0')};">
              ${s.rsi_14.toFixed(1)}
            </span>
          </td>
          <td>
            <span class="cs-badge-signal ${sigBadgeClass}">${s.breakout_status}</span>
          </td>
          <td>
            <div style="font-size:0.78rem; font-weight:600; color:#e2e8f0;">
              ${s.candle_pattern}
            </div>
            <div style="font-size:0.72rem; color:#64748b; font-family:var(--font-mono);">
              CLV: ${(s.clv * 100).toFixed(0)}%
            </div>
          </td>
          <td>
            <div style="font-size:0.78rem;">${maHtml}</div>
          </td>
          <td>
            <a href="${s.tv_url}" target="_blank" rel="noopener noreferrer" class="cs-tv-btn" title="Open TradingView Chart">
              <span>Chart</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </a>
          </td>
        </tr>
      `;
    }

    dom.tableBody.innerHTML = html;
    renderPagination(state.filteredStocks.length);
  }

  function renderPagination(totalCount) {
    if (!dom.pagination) return;
    if (totalCount === 0) {
      dom.pagination.style.display = 'none';
      return;
    }
    dom.pagination.style.display = 'flex';

    const totalPages = Math.ceil(totalCount / state.pageSize);
    const startIdx = (state.currentPage - 1) * state.pageSize + 1;
    const endIdx = Math.min(startIdx + state.pageSize - 1, totalCount);

    if (dom.pageInfo) {
      dom.pageInfo.textContent = `Showing ${startIdx}-${endIdx} of ${totalCount} results`;
    }

    if (dom.pageControls) {
      let btns = '';
      btns += `<button class="cs-page-btn" ${state.currentPage === 1 ? 'disabled' : ''} onclick="window.customScannerPage(${state.currentPage - 1})">Prev</button>`;

      const maxPagesToShow = 5;
      let startP = Math.max(1, state.currentPage - 2);
      let endP = Math.min(totalPages, startP + maxPagesToShow - 1);
      if (endP - startP < maxPagesToShow - 1) {
        startP = Math.max(1, endP - maxPagesToShow + 1);
      }

      for (let p = startP; p <= endP; p++) {
        btns += `<button class="cs-page-btn ${p === state.currentPage ? 'active' : ''}" onclick="window.customScannerPage(${p})">${p}</button>`;
      }

      btns += `<button class="cs-page-btn" ${state.currentPage === totalPages ? 'disabled' : ''} onclick="window.customScannerPage(${state.currentPage + 1})">Next</button>`;
      dom.pageControls.innerHTML = btns;
    }
  }

  // Presets & LocalStorage
  function applyPreset(key) {
    state.activePreset = key;
    document.querySelectorAll('.cs-preset-pill').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-preset') === key);
    });

    if (key && PRESETS[key]) {
      const p = PRESETS[key];
      // update filter state to reflect preset
      Object.assign(state.filters, p.filters);
      syncDomFromFilterState();
    }
    evaluateFilters();
  }

  function syncDomFromFilterState() {
    const f = state.filters;
    if (dom.breakoutType) dom.breakoutType.value = f.breakoutType;
    if (dom.breakoutDays) dom.breakoutDays.value = f.breakoutDays;
    if (dom.rsiMode) dom.rsiMode.value = f.rsiMode;
    if (dom.rsiVal1) dom.rsiVal1.value = f.rsiVal1;
    if (dom.rsiVal2) dom.rsiVal2.value = f.rsiVal2;
    if (dom.proximity52w) dom.proximity52w.value = f.proximity52w;

    if (dom.bbSqueeze) dom.bbSqueeze.checked = f.bbSqueeze;
    if (dom.nr7Coil) dom.nr7Coil.checked = f.nr7Coil;
    if (dom.atrContraction) dom.atrContraction.checked = f.atrContraction;
    if (dom.openEqualsLow) dom.openEqualsLow.checked = f.openEqualsLow;
    if (dom.clvHigh) dom.clvHigh.checked = f.clvHigh;
    if (dom.hammerSweep) dom.hammerSweep.checked = f.hammerSweep;
    if (dom.nearEma20) dom.nearEma20.checked = f.nearEma20;
    if (dom.nearEma20_2) dom.nearEma20_2.checked = f.nearEma20_2;
    if (dom.ema20Bounce) dom.ema20Bounce.checked = f.ema20Bounce;
    if (dom.trendStack) dom.trendStack.checked = f.trendStack;

    if (dom.minDeliveryPct) dom.minDeliveryPct.value = f.minDeliveryPct || '';
    if (dom.minDeliverySpike) dom.minDeliverySpike.value = f.minDeliverySpike || '';
    if (dom.minRvol) dom.minRvol.value = f.minRvol || '';
    if (dom.minDelivTurnoverCr) dom.minDelivTurnoverCr.value = f.minDelivTurnoverCr || '';
    if (dom.minTurnoverCr) dom.minTurnoverCr.value = f.minTurnoverCr || '';
    if (dom.minRsScore) dom.minRsScore.value = f.minRsScore || '';
    if (dom.sectorSelect) dom.sectorSelect.value = f.sector;

    updateRsiVisibility();
  }

  function updateRsiVisibility() {
    if (!dom.rsiInputs) return;
    const mode = dom.rsiMode.value;
    if (mode === 'ANY') {
      dom.rsiInputs.style.display = 'none';
    } else {
      dom.rsiInputs.style.display = 'flex';
      if (dom.rsiBetweenBox) {
        dom.rsiBetweenBox.style.display = mode === 'BETWEEN' ? 'inline-flex' : 'none';
      }
    }
  }

  function resetFilters() {
    state.activePreset = null;
    state.searchQuery = '';
    if (dom.searchInput) dom.searchInput.value = '';

    state.filters = {
      breakoutType: 'ANY',
      breakoutDays: '20',
      rsiMode: 'ANY',
      rsiVal1: 50,
      rsiVal2: 70,
      proximity52w: 'ANY',
      bbSqueeze: false,
      nr7Coil: false,
      atrContraction: false,
      openEqualsLow: false,
      clvHigh: false,
      hammerSweep: false,
      nearEma20: false,
      nearEma20_2: false,
      ema20Bounce: false,
      trendStack: false,
      minDeliveryPct: 0,
      minDeliverySpike: 0,
      minRvol: 0,
      minDelivTurnoverCr: 0,
      minTurnoverCr: 0,
      minRsScore: 0,
      sector: 'ALL'
    };

    document.querySelectorAll('.cs-preset-pill').forEach(el => el.classList.remove('active'));
    syncDomFromFilterState();
    evaluateFilters();
  }

  // LocalStorage Custom Presets
  const STORAGE_KEY = 'mits_pro_custom_scanner_presets';

  function getSavedPresets() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveCustomPreset(name) {
    if (!name || !name.trim()) return;
    const presets = getSavedPresets();
    presets[name.trim()] = {
      filters: Object.assign({}, state.filters),
      savedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
      loadCustomPresetsFromStorage();
    } catch (e) {
      alert('Could not save preset to LocalStorage.');
    }
  }

  function loadCustomPresetsFromStorage() {
    if (!dom.savedPresetsSelect) return;
    const presets = getSavedPresets();
    const names = Object.keys(presets);

    let html = '<option value="">-- Load Saved Custom Strategy --</option>';
    names.forEach(name => {
      html += `<option value="${name}">${name}</option>`;
    });
    dom.savedPresetsSelect.innerHTML = html;
  }

  function loadSavedPreset(name) {
    const presets = getSavedPresets();
    const target = presets[name];
    if (target && target.filters) {
      state.activePreset = null;
      document.querySelectorAll('.cs-preset-pill').forEach(el => el.classList.remove('active'));
      Object.assign(state.filters, target.filters);
      syncDomFromFilterState();
      evaluateFilters();
    }
  }

  // CSV Export
  function exportCSV() {
    if (!state.filteredStocks || state.filteredStocks.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = [
      'Symbol', 'Name', 'Sector', 'CMP', 'Change_Pct',
      'Delivery_Pct', 'Delivery_Spike_Pct', 'RVOL', 'Turnover_Cr',
      'Deliv_Turnover_Cr', 'RSI_14', 'Breakout_Status', 'Candle_Pattern',
      'CLV', 'EMA_20', 'Dist_EMA20_Pct', 'Trend_Stack', 'RS_Score',
      'BB_Squeeze', 'NR7', 'ATR_Contraction', 'TradingView_URL'
    ];

    const rows = state.filteredStocks.map(s => [
      `"${s.symbol}"`,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${s.sector}"`,
      s.cmp,
      s.change_pct,
      s.delivery_pct,
      s.delivery_spike_pct,
      s.rvol,
      s.turnover_cr,
      s.deliv_turnover_cr,
      s.rsi_14,
      `"${s.breakout_status}"`,
      `"${s.candle_pattern}"`,
      s.clv,
      s.ema_20,
      s.dist_ema20_pct,
      s.trend_stack ? 'YES' : 'NO',
      s.rs_score,
      s.bb_squeeze ? 'YES' : 'NO',
      s.is_nr7 ? 'YES' : 'NO',
      s.atr_contraction ? 'YES' : 'NO',
      `"${s.tv_url}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = state.meta.tradeDate || new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `MITS_Custom_Scanner_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Event Listeners Binding
  function bindEvents() {
    // Quick Presets
    document.querySelectorAll('.cs-preset-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-preset');
        if (state.activePreset === key) {
          resetFilters();
        } else {
          applyPreset(key);
        }
      });
    });

    // Run Institutional Scan button
    if (dom.runScanBtn) {
      dom.runScanBtn.addEventListener('click', () => {
        evaluateFilters();
        const tableCard = document.querySelector('.cs-table-card');
        if (tableCard) {
          tableCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    // Prominent Reset All button
    if (dom.resetAllBtn) {
      dom.resetAllBtn.addEventListener('click', resetFilters);
    }

    // Reset button (toolbar)
    if (dom.resetBtn) {
      dom.resetBtn.addEventListener('click', resetFilters);
    }

    // Export button
    if (dom.exportBtn) {
      dom.exportBtn.addEventListener('click', exportCSV);
    }

    // Live search input
    if (dom.searchInput) {
      dom.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        evaluateFilters();
      });
    }

    // Sector select
    if (dom.sectorSelect) {
      dom.sectorSelect.addEventListener('change', (e) => {
        state.filters.sector = e.target.value;
        state.activePreset = null;
        evaluateFilters();
      });
    }

    // Breakout Controls
    if (dom.breakoutType) {
      dom.breakoutType.addEventListener('change', (e) => {
        state.filters.breakoutType = e.target.value;
        state.activePreset = null;
        evaluateFilters();
      });
    }
    if (dom.breakoutDays) {
      dom.breakoutDays.addEventListener('change', (e) => {
        state.filters.breakoutDays = e.target.value;
        state.activePreset = null;
        evaluateFilters();
      });
    }

    // RSI Controls
    if (dom.rsiMode) {
      dom.rsiMode.addEventListener('change', (e) => {
        state.filters.rsiMode = e.target.value;
        state.activePreset = null;
        updateRsiVisibility();
        evaluateFilters();
      });
    }
    if (dom.rsiVal1) {
      dom.rsiVal1.addEventListener('input', (e) => {
        state.filters.rsiVal1 = parseFloat(e.target.value) || 50;
        state.activePreset = null;
        evaluateFilters();
      });
    }
    if (dom.rsiVal2) {
      dom.rsiVal2.addEventListener('input', (e) => {
        state.filters.rsiVal2 = parseFloat(e.target.value) || 70;
        state.activePreset = null;
        evaluateFilters();
      });
    }

    // 52W Proximity
    if (dom.proximity52w) {
      dom.proximity52w.addEventListener('change', (e) => {
        state.filters.proximity52w = e.target.value;
        state.activePreset = null;
        evaluateFilters();
      });
    }

    // Checkbox Toggles Helper
    function bindCheck(el, prop) {
      if (!el) return;
      el.addEventListener('change', (e) => {
        state.filters[prop] = e.target.checked;
        state.activePreset = null;
        evaluateFilters();
      });
    }

    bindCheck(dom.bbSqueeze, 'bbSqueeze');
    bindCheck(dom.nr7Coil, 'nr7Coil');
    bindCheck(dom.atrContraction, 'atrContraction');
    bindCheck(dom.openEqualsLow, 'openEqualsLow');
    bindCheck(dom.clvHigh, 'clvHigh');
    bindCheck(dom.hammerSweep, 'hammerSweep');
    bindCheck(dom.nearEma20, 'nearEma20');
    bindCheck(dom.nearEma20_2, 'nearEma20_2');
    bindCheck(dom.ema20Bounce, 'ema20Bounce');
    bindCheck(dom.trendStack, 'trendStack');

    // Number Inputs Helper
    function bindNum(el, prop) {
      if (!el) return;
      el.addEventListener('input', (e) => {
        state.filters[prop] = parseFloat(e.target.value) || 0;
        state.activePreset = null;
        evaluateFilters();
      });
    }

    bindNum(dom.minDeliveryPct, 'minDeliveryPct');
    bindNum(dom.minDeliverySpike, 'minDeliverySpike');
    bindNum(dom.minRvol, 'minRvol');
    bindNum(dom.minDelivTurnoverCr, 'minDelivTurnoverCr');
    bindNum(dom.minTurnoverCr, 'minTurnoverCr');
    bindNum(dom.minRsScore, 'minRsScore');

    // Table Header Sorting
    document.querySelectorAll('.cs-table th[data-col]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-col');
        if (state.sortColumn === col) {
          state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortColumn = col;
          state.sortDirection = 'desc';
        }

        document.querySelectorAll('.cs-table th').forEach(h => {
          h.classList.remove('sorted-asc', 'sorted-desc');
        });
        th.classList.add(state.sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');

        evaluateFilters();
      });
    });

    // Custom Presets Modal
    if (dom.savePresetBtn && dom.modalOverlay) {
      dom.savePresetBtn.addEventListener('click', () => {
        dom.modalOverlay.classList.add('active');
        if (dom.presetNameInput) dom.presetNameInput.focus();
      });
    }

    if (dom.modalCancelBtn && dom.modalOverlay) {
      dom.modalCancelBtn.addEventListener('click', () => {
        dom.modalOverlay.classList.remove('active');
      });
    }

    if (dom.modalSaveBtn && dom.modalOverlay) {
      dom.modalSaveBtn.addEventListener('click', () => {
        const name = dom.presetNameInput ? dom.presetNameInput.value.trim() : '';
        if (name) {
          saveCustomPreset(name);
          dom.presetNameInput.value = '';
          dom.modalOverlay.classList.remove('active');
        } else {
          alert('Please enter a name for the strategy preset.');
        }
      });
    }

    if (dom.savedPresetsSelect) {
      dom.savedPresetsSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          loadSavedPreset(e.target.value);
        }
      });
    }
  }

  // Global window functions for table pagination & reset
  window.customScannerPage = function (pageNum) {
    state.currentPage = pageNum;
    renderTable();
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  window.customScannerReset = function () {
    resetFilters();
  };

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    bindEvents();
    loadUniverseData();
  });
})();
