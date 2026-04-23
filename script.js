/* global Chart, DeathClockCore, ChangelogData, ProjectStatsData */
'use strict';

// ============================================================
// AI DEATH CLOCK — Browser / DOM layer
// Depends on death-clock-core.js being loaded first
// ============================================================

(function () {
  // ---- Unpack core ----------------------------------------
  const {
    BASE_TOKENS,
    TOKENS_PER_SECOND,
    BASE_DATE_ISO,
    HISTORICAL_DATA,
    MILESTONES,
    RATE_SCHEDULE,
    SESSION_CHALLENGE_DEFS,
    TOKEN_TIPS,
    COMPANY_ROLES,
    AI_AGENTS,
    formatTokenCount,
    formatTokenCountShort,
    getTriggeredMilestones,
    getNextMilestone,
    predictMilestoneDate,
    calculateEnvironmentalImpact,
    generateProjectionData,
    formatDate,
    getTimeDelta,
    milestoneProgress,
    getRateAtDate,
    calculateTipImpact,
    generateEquivalences,
    calculatePersonalFootprint,
    sessionEquivalences,
    getNextMilestoneForPlayer,
    computeComboMultiplier,
    getSessionChallenges,
    formatDoomPoints,
    computePassiveRate,
    getCompanyStage,
    getSimulatedViewerCount,
  } = window.DeathClockCore;

  // ---- Unpack changelog data ----------------------------------
  const {
    SITE_VERSION      = '',
    CHANGELOG_RELEASES = [],
  } = (typeof window !== 'undefined' && window.ChangelogData) || {};

  // ---- Unpack project stats -----------------------------------
  const {
    PROJECT_PR_COUNT     = 0,
    PROJECT_TOTAL_TOKENS = 0,
  } = (typeof window !== 'undefined' && window.ProjectStatsData) || {};

  // ---- State -----------------------------------------------
  const BASE_DATE_MS = new Date(BASE_DATE_ISO).getTime();
  const pageLoadTime = Date.now();
  let currentTheme = 'dark';
  let chartInstance = null;

  // ---- Persistence keys -----------------------------------
  const LS_FIRST_ARRIVAL_KEY = 'tokenDeathclockFirstArrival';
  const LS_THEME_KEY         = 'tokenDeathclockTheme';

  // Cumulative first-arrival timestamp — loaded from localStorage so the
  // "Tokens Since You Arrived" counter continues across return visits.
  let firstArrivalTime = pageLoadTime;
  try {
    const stored = parseInt(localStorage.getItem(LS_FIRST_ARRIVAL_KEY) || '0', 10);
    if (stored > 0 && stored <= pageLoadTime) {
      firstArrivalTime = stored;
    } else {
      localStorage.setItem(LS_FIRST_ARRIVAL_KEY, String(pageLoadTime));
    }
  } catch (_) { /* ignore quota / access errors */ }

  // ---- Helpers ---------------------------------------------
  function getCurrentTokens() {
    const elapsed = (Date.now() - BASE_DATE_MS) / 1000;
    return BASE_TOKENS + TOKENS_PER_SECOND * elapsed;
  }

  function numFmt(n) {
    // Compact formatting for the big live counter
    if (n >= 1e15) return (n / 1e15).toFixed(3) + ' Quadrillion';
    if (n >= 1e12) return (n / 1e12).toFixed(3) + ' Trillion';
    return formatTokenCount(n);
  }

  // ---- Theme toggle ----------------------------------------
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    currentTheme = theme;
    if (chartInstance) updateChartColors();
  }

  function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    try { localStorage.setItem(LS_THEME_KEY, newTheme); } catch (_) { /* ignore */ }
    if (newTheme === 'light') awardBadge('optimist');
  }

  // ---- Counter updater -------------------------------------
  function updateCounters() {
    const now = Date.now();
    const tokens = getCurrentTokens();
    const currentRate = getRateAtDate(new Date(now));
    // Use firstArrivalTime so the counter accumulates across return visits
    const sessionTokens = Math.round((now - firstArrivalTime) / 1000 * currentRate);
    const elapsed = Math.floor((now - firstArrivalTime) / 1000);

    const totalEl = document.getElementById('totalCounter');
    const sessionEl = document.getElementById('sessionCounter');
    const sessionTimeEl = document.getElementById('sessionTime');
    const rateEl = document.getElementById('rateCounter');
    const rateEventEl = document.getElementById('rateEvent');

    if (totalEl) totalEl.textContent = numFmt(tokens);
    if (sessionEl) sessionEl.textContent = formatTokenCount(sessionTokens);
    if (sessionTimeEl) {
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      const suffix = firstArrivalTime !== pageLoadTime ? 'since first visit' : 'on page';
      sessionTimeEl.textContent = m > 0 ? `${m}m ${s}s ${suffix}` : `${s}s ${suffix}`;
    }
    if (rateEl) rateEl.textContent = formatTokenCount(currentRate);
    if (rateEventEl) {
      // Show the event that triggered this rate step
      const rateEntry = [...RATE_SCHEDULE].reverse().find(
        (r) => now >= new Date(r.date).getTime()
      );
      if (rateEntry) rateEventEl.textContent = rateEntry.event + ' · tokens/sec';
    }

    // Impact stats
    const impact = calculateEnvironmentalImpact(tokens);
    setStatText('statKwh',   formatTokenCountShort(impact.kWh));
    setStatText('statCo2',   formatTokenCountShort(impact.co2Kg));
    setStatText('statWater', formatTokenCountShort(impact.waterL));
    setStatText('statTrees', formatTokenCountShort(impact.treesEquivalent));

    // Update doomsday clock (PRD 1)
    updateDoomsdayClock(tokens);

    // Update milestone progress bars
    const triggered = getTriggeredMilestones(tokens, MILESTONES);
    MILESTONES.forEach((m, idx) => {
      const card = document.getElementById('milestone-' + m.id);
      if (!card) return;
      const wasTriggered = card.classList.contains('triggered');
      const isTriggered = tokens >= m.tokens;

      if (isTriggered && !wasTriggered) {
        card.classList.add('triggered');
        if (!shownEmergencyBroadcasts.has(m.id)) {
          shownEmergencyBroadcasts.add(m.id);
          showEmergencyBroadcast(m);
        }
      }

      const fill = card.querySelector('.progress-fill');
      if (fill) {
        const prev = idx === 0 ? 0 : MILESTONES[idx - 1].tokens;
        const pct = milestoneProgress(tokens, prev, m.tokens);
        fill.style.width = pct + '%';
        const pctLabel = card.querySelector('.progress-pct');
        if (pctLabel) pctLabel.textContent = pct.toFixed(1) + '%';
      }
    });

    requestAnimationFrame(updateCounters);
  }

  function setStatText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // ---- Render milestones -----------------------------------
  function renderMilestones() {
    const grid = document.getElementById('milestonesGrid');
    if (!grid) return;

    const tokens = getCurrentTokens();
    grid.innerHTML = '';

    MILESTONES.forEach((m, idx) => {
      const isTriggered = tokens >= m.tokens;
      const prev = idx === 0 ? 0 : MILESTONES[idx - 1].tokens;
      const pct = milestoneProgress(tokens, prev, m.tokens);
      const prediction = predictMilestoneDate(tokens, TOKENS_PER_SECOND, m.tokens);

      const card = document.createElement('div');
      card.className = 'milestone-card' + (isTriggered ? ' triggered' : '');
      card.id = 'milestone-' + m.id;
      card.innerHTML = `
        <div class="milestone-header">
          <span class="milestone-icon" aria-hidden="true">${m.icon}</span>
          <div>
            <div class="milestone-name">${escHtml(m.name)}</div>
            <div class="milestone-threshold">${escHtml(m.shortDesc)}</div>
          </div>
        </div>
        <p class="milestone-desc">${escHtml(m.description)}</p>
        <p class="milestone-consequence">${escHtml(m.consequence)}</p>
        <div class="milestone-event">${escHtml(m.followingEvent)}</div>
        <div class="milestone-progress-wrap">
          <div class="milestone-progress-label">
            <span>Progress</span>
            <span class="progress-pct">${pct.toFixed(1)}%</span>
          </div>
          <div class="progress-bar" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
        ${prediction ? `<div class="milestone-predict">⏱ Predicted: ${escHtml(formatDate(prediction))} (${escHtml(getTimeDelta(prediction))})</div>` : ''}
        ${m.reference ? `<a href="${escHtml(m.reference)}" class="milestone-ref" target="_blank" rel="noopener noreferrer">📎 Source</a>` : ''}
      `;
      grid.appendChild(card);
    });
  }

  // ---- Render predictions table ----------------------------
  function renderPredictionsTable() {
    const tbody = document.getElementById('predictionsBody');
    if (!tbody) return;

    const tokens = getCurrentTokens();
    tbody.innerHTML = '';

    MILESTONES.forEach((m) => {
      const isPassed = tokens >= m.tokens;
      const prediction = isPassed
        ? null
        : predictMilestoneDate(tokens, TOKENS_PER_SECOND, m.tokens);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escHtml(m.icon)} ${escHtml(m.name)}</td>
        <td>${escHtml(m.shortDesc)}</td>
        <td>${isPassed ? '<span class="passed-badge">PASSED</span>' : '⏳ Pending'}</td>
        <td class="${isPassed ? '' : 'future-date'}">${isPassed ? '—' : escHtml(formatDate(prediction))}</td>
        <td>${isPassed ? '<span style="color:var(--accent)">Already triggered</span>' : escHtml(getTimeDelta(prediction))}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ---- Chart -----------------------------------------------
  function buildChartData() {
    const tokens = getCurrentTokens();
    const historical = HISTORICAL_DATA.map((d) => ({ x: d.date, y: d.tokensT }));
    // 60-month projection with 50 % annual growth in token-production rate,
    // producing the hockey-stick acceleration observed historically.
    const projection = generateProjectionData(tokens, TOKENS_PER_SECOND, 60, undefined, 0.5).map((d) => ({
      x: d.date,
      y: +d.tokensT.toFixed(2),
    }));
    return { historical, projection };
  }

  function chartColors() {
    const dark = currentTheme === 'dark';
    return {
      histLine:  dark ? '#ff3333' : '#cc0000',
      projLine:  dark ? '#ff8800' : '#cc6600',
      gridColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
      tickColor: dark ? '#888' : '#555',
      bg:        dark ? '#161616' : '#ffffff',
    };
  }

  function initChart() {
    const canvas = document.getElementById('tokenChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const { historical, projection } = buildChartData();
    const colors = chartColors();

    // Milestone annotations as horizontal lines
    const annotations = {};
    MILESTONES.forEach((m, i) => {
      annotations['milestone_' + i] = {
        type: 'line',
        yMin: m.tokens / 1e12,
        yMax: m.tokens / 1e12,
        borderColor: 'rgba(0,204,119,0.4)',
        borderWidth: 1,
        borderDash: [4, 4],
        label: {
          content: m.icon + ' ' + m.shortDesc,
          display: false,
        },
      };
    });

    chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Historical (estimated)',
            data: historical,
            borderColor: colors.histLine,
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.35,
            fill: false,
          },
          {
            label: 'Projected',
            data: projection,
            borderColor: colors.projLine,
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            tension: 0.35,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            type: 'time',
            time: { tooltipFormat: 'MMM yyyy', displayFormats: { month: 'MMM yy', year: 'yyyy', quarter: 'MMM yy' } },
            grid: { color: colors.gridColor },
            ticks: { color: colors.tickColor, maxRotation: 45 },
          },
          y: {
            type: 'logarithmic',
            title: {
              display: true,
              text: 'Cumulative Tokens (Trillions, log scale)',
              color: colors.tickColor,
              font: { size: 11 },
            },
            grid: { color: colors.gridColor },
            ticks: {
              color: colors.tickColor,
              callback: (v) => formatTokenCountShort(v * 1e12),
            },
          },
        },
        plugins: {
          legend: {
            labels: { color: colors.tickColor, boxWidth: 20, padding: 16, font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ' ' + formatTokenCount(ctx.parsed.y * 1e12) + ' tokens',
            },
          },
        },
      },
    });
  }

  function updateChartColors() {
    if (!chartInstance) return;
    const colors = chartColors();
    chartInstance.data.datasets[0].borderColor = colors.histLine;
    chartInstance.data.datasets[1].borderColor = colors.projLine;
    chartInstance.options.scales.x.grid.color = colors.gridColor;
    chartInstance.options.scales.y.grid.color = colors.gridColor;
    chartInstance.options.scales.x.ticks.color = colors.tickColor;
    chartInstance.options.scales.y.ticks.color = colors.tickColor;
    chartInstance.options.scales.y.title.color = colors.tickColor;
    chartInstance.options.plugins.legend.labels.color = colors.tickColor;
    chartInstance.update('none');
  }

  // ---- Security helper ------------------------------------
  function escHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---- Life Blocks ----------------------------------------
  // Use the milestone tagged extinctionMarker:true as the life-blocks countdown target.
  // Falls back to the last milestone only if no marker is found (defensive guard).
  const LB_LAST_MILESTONE = MILESTONES.find(m => m.extinctionMarker) || MILESTONES[MILESTONES.length - 1];

  // Drill-down state
  const lb = {
    level:  'days',   // 'days' | 'hours' | 'minutes' | 'seconds'
    day:    null,     // day offset from today (0 = today)
    hour:   null,     // 0-23
    minute: null,     // 0-59
    rafId:  null,
    lastSec: -1,
    lastMin: -1,
    lastHr:  -1,
    lastDayMs: 0,
    exploding: false,
  };

  function lbExtinctionMs() {
    const tokens = getCurrentTokens();
    if (tokens >= LB_LAST_MILESTONE.tokens) return Date.now();
    const secsLeft = (LB_LAST_MILESTONE.tokens - tokens) / TOKENS_PER_SECOND;
    return Date.now() + secsLeft * 1000;
  }

  function lbTotalDaysLeft() {
    const ms = lbExtinctionMs() - Date.now();
    return Math.max(0, Math.ceil(ms / 86400000));
  }

  function lbMidnight(now) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  // Returns 'dead' | 'dying' | 'future' for a block's state
  function lbBlockState(unitStart, unitDuration, now) {
    const unitEnd = unitStart + unitDuration;
    if (now >= unitEnd) return 'dead';
    if (now >= unitStart) return 'dying';
    return 'future';
  }

  function lbDayOffsetToMs(dayOffset, now) {
    return lbMidnight(now) + dayOffset * 86400000;
  }

  // ---- Rendering helpers ----

  function lbMakeDyingBlock(dataAttr, progress, label, content) {
    return `<div class="lb-block lb-dying" ${dataAttr}
      style="--progress:${progress.toFixed(2)}%"
      title="${label}" aria-label="${label}"
      tabindex="0" role="button">${content}</div>`;
  }

  function lbMakeBlock(state, dataAttr, label, content) {
    return `<div class="lb-block lb-${state}" ${dataAttr}
      title="${label}" aria-label="${label}"
      ${state !== 'dead' ? 'tabindex="0" role="button"' : 'aria-disabled="true"'}>${content}</div>`;
  }

  // Maximum days to render in life-blocks view (~10 years).
  // Beyond this, a summary block is shown to avoid creating millions of DOM elements.
  const MAX_LB_DAYS = 3650;

  // ---- View renderers ----

  function lbRenderDays(container, now) {
    const total = lbTotalDaysLeft();
    const displayed = Math.min(total, MAX_LB_DAYS);
    const todayMidnight = lbMidnight(now);
    const todayProgress = ((now - todayMidnight) / 86400000) * 100;
    const extDate = new Date(lbExtinctionMs());
    const extStr = extDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    let html = `<div class="lb-grid" style="--lb-cols:52" aria-label="${total} days remaining">`;
    // Day 0 = today (dying), days 1..displayed = future
    html += lbMakeDyingBlock('data-day="0"', todayProgress,
      'Today — burning away', '');
    for (let i = 1; i <= displayed; i++) {
      html += lbMakeBlock('future', `data-day="${i}"`,
        `Day ${i} from now`, '');
    }
    if (total > MAX_LB_DAYS) {
      html += `<div class="lb-block lb-future lb-overflow" aria-disabled="true"
        title="${(total - MAX_LB_DAYS).toLocaleString()} more days not shown"
        aria-label="${(total - MAX_LB_DAYS).toLocaleString()} more days">
        +${Math.round((total - MAX_LB_DAYS) / 365)}y</div>`;
    }
    html += '</div>';

    container.innerHTML = html;
    document.getElementById('lb-info').textContent =
      `${total.toLocaleString()} days until extinction · predicted ${extStr}`;
  }

  function lbRenderHours(container, dayOffset, now) {
    const dayStartMs = lbDayOffsetToMs(dayOffset, now);
    const isToday = dayOffset === 0;

    let html = '<div class="lb-grid lb-zoom" aria-label="24 hours">';
    for (let h = 0; h < 24; h++) {
      const unitStart = dayStartMs + h * 3600000;
      const state = isToday ? lbBlockState(unitStart, 3600000, now) : 'future';
      const label = `${String(h).padStart(2, '0')}:00`;
      const content = `<span class="lb-label">${String(h).padStart(2, '0')}</span>`;
      if (state === 'dying') {
        const prog = ((now - unitStart) / 3600000) * 100;
        html += lbMakeDyingBlock(`data-hour="${h}"`, prog, label, content);
      } else {
        html += lbMakeBlock(state, `data-hour="${h}"`, label, content);
      }
    }
    html += '</div>';
    container.innerHTML = html;
    const dayLabel = dayOffset === 0 ? 'Today' : `Day +${dayOffset}`;
    document.getElementById('lb-info').textContent = `${dayLabel} — select an hour`;
  }

  function lbRenderMinutes(container, dayOffset, hour, now) {
    const dayStartMs = lbDayOffsetToMs(dayOffset, now);
    const hourStartMs = dayStartMs + hour * 3600000;
    const isThisHour = dayOffset === 0 && now >= hourStartMs &&
                       now < hourStartMs + 3600000;

    let html = '<div class="lb-grid lb-zoom" aria-label="60 minutes">';
    for (let m = 0; m < 60; m++) {
      const unitStart = hourStartMs + m * 60000;
      const state = isThisHour ? lbBlockState(unitStart, 60000, now) : 'future';
      const label = `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const content = `<span class="lb-label">${String(m).padStart(2, '0')}</span>`;
      if (state === 'dying') {
        const prog = ((now - unitStart) / 60000) * 100;
        html += lbMakeDyingBlock(`data-minute="${m}"`, prog, label, content);
      } else {
        html += lbMakeBlock(state, `data-minute="${m}"`, label, content);
      }
    }
    html += '</div>';
    container.innerHTML = html;
    document.getElementById('lb-info').textContent =
      `${String(hour).padStart(2, '0')}:xx — select a minute`;
  }

  function lbRenderSeconds(container, dayOffset, hour, minute, now) {
    const dayStartMs = lbDayOffsetToMs(dayOffset, now);
    const minStartMs = dayStartMs + hour * 3600000 + minute * 60000;
    const isThisMinute = dayOffset === 0 && now >= minStartMs &&
                         now < minStartMs + 60000;

    let html = '<div class="lb-grid lb-zoom" aria-label="60 seconds">';
    for (let s = 0; s < 60; s++) {
      const unitStart = minStartMs + s * 1000;
      const state = isThisMinute ? lbBlockState(unitStart, 1000, now) : 'future';
      const label =
        `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      const content = `<span class="lb-label">${String(s).padStart(2, '0')}</span>`;
      if (state === 'dying') {
        const prog = ((now - unitStart) / 1000) * 100;
        html += lbMakeDyingBlock(`data-second="${s}"`, prog, label, content);
      } else {
        html += lbMakeBlock(state, `data-second="${s}"`, label, content);
      }
    }
    html += '</div>';
    container.innerHTML = html;
    document.getElementById('lb-info').textContent =
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:xx`;
  }

  function lbRenderBreadcrumb() {
    const el = document.getElementById('lb-breadcrumb');
    if (!el) return;
    const parts = [{ label: '💀 Days', level: 'days' }];
    if (lb.level !== 'days') {
      parts.push({ label: `Day ${lb.day === 0 ? 'Today' : '+' + lb.day}`, level: 'hours' });
    }
    if (lb.level === 'minutes' || lb.level === 'seconds') {
      parts.push({ label: `Hour ${String(lb.hour).padStart(2, '0')}`, level: 'minutes' });
    }
    if (lb.level === 'seconds') {
      parts.push({ label: `Min ${String(lb.minute).padStart(2, '0')}`, level: 'seconds' });
    }
    el.innerHTML = parts.map((p, i) => {
      const isCurrent = i === parts.length - 1;
      if (isCurrent) return `<span class="lb-breadcrumb-item lb-bc-current">${escHtml(p.label)}</span>`;
      return `<span class="lb-breadcrumb-item" data-nav="${escHtml(p.level)}" tabindex="0" role="button"
               aria-label="Back to ${escHtml(p.label)}">${escHtml(p.label)}</span>
              <span class="lb-breadcrumb-sep" aria-hidden="true">›</span>`;
    }).join('');
    // Wire up back-nav clicks
    el.querySelectorAll('[data-nav]').forEach((btn) => {
      const navTo = btn.getAttribute('data-nav');
      btn.addEventListener('click', () => lbNavigateTo(navTo));
      btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') lbNavigateTo(navTo); });
    });
  }

  function lbNavigateTo(level) {
    lb.level = level;
    if (level === 'days') { lb.day = null; lb.hour = null; lb.minute = null; }
    else if (level === 'hours') { lb.hour = null; lb.minute = null; }
    else if (level === 'minutes') { lb.minute = null; }
    lbFullRender();
  }

  function lbFullRender() {
    const container = document.getElementById('lb-container');
    if (!container) return;
    const now = Date.now();
    const nowDate = new Date(now);

    lb.lastSec = nowDate.getSeconds();
    lb.lastMin = nowDate.getMinutes();
    lb.lastHr  = nowDate.getHours();
    lb.lastDayMs = lbMidnight(nowDate);
    lb.exploding = false;

    if (lb.level === 'days') {
      lbRenderDays(container, now);
    } else if (lb.level === 'hours') {
      lbRenderHours(container, lb.day, now);
    } else if (lb.level === 'minutes') {
      lbRenderMinutes(container, lb.day, lb.hour, now);
    } else if (lb.level === 'seconds') {
      lbRenderSeconds(container, lb.day, lb.hour, lb.minute, now);
    }

    lbRenderBreadcrumb();
    lbAttachClicks(container);
  }

  function lbAttachClicks(container) {
    container.querySelectorAll('.lb-block:not(.lb-dead)').forEach((block) => {
      block.addEventListener('click', lbHandleBlockClick);
      block.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') lbHandleBlockClick.call(block, e);
      });
    });
  }

  function lbHandleBlockClick(e) {
    const block = e.currentTarget || this;
    if (lb.level === 'days') {
      lb.day   = parseInt(block.getAttribute('data-day'), 10);
      lb.level = 'hours';
    } else if (lb.level === 'hours') {
      lb.hour  = parseInt(block.getAttribute('data-hour'), 10);
      lb.level = 'minutes';
    } else if (lb.level === 'minutes') {
      lb.minute = parseInt(block.getAttribute('data-minute'), 10);
      lb.level  = 'seconds';
    } else {
      // At seconds level — no deeper drill-down exists
      return;
    }
    lbFullRender();
  }

  // ---- RAF update loop ----

  function lbTriggerExplosion(onDone) {
    if (lb.exploding) { onDone(); return; }
    const dyingEl = document.querySelector('#lb-container .lb-dying');
    if (!dyingEl) { onDone(); return; }
    lb.exploding = true;
    dyingEl.classList.add('lb-exploding');
    setTimeout(onDone, 560);
  }

  function lbUpdateFrame() {
    const now = Date.now();
    const nowDate = new Date(now);

    // Smooth progress on the dying block (no re-render needed)
    if (!lb.exploding) {
      const dyingEl = document.querySelector('#lb-container .lb-dying');
      if (dyingEl) {
        let unitStart, unitDur;
        if (lb.level === 'days') {
          unitStart = lbMidnight(nowDate);
          unitDur   = 86400000;
        } else if (lb.level === 'hours') {
          const h = nowDate.getHours();
          const dayMs = lbDayOffsetToMs(lb.day, now);
          unitStart = dayMs + h * 3600000;
          unitDur   = 3600000;
        } else if (lb.level === 'minutes') {
          const m = nowDate.getMinutes();
          const dayMs = lbDayOffsetToMs(lb.day, now);
          unitStart = dayMs + lb.hour * 3600000 + m * 60000;
          unitDur   = 60000;
        } else {
          const s = nowDate.getSeconds();
          const dayMs = lbDayOffsetToMs(lb.day, now);
          unitStart = dayMs + lb.hour * 3600000 + lb.minute * 60000 + s * 1000;
          unitDur   = 1000;
        }
        const prog = Math.min(100, ((now - unitStart) / unitDur) * 100);
        dyingEl.style.setProperty('--progress', prog.toFixed(2) + '%');
      }
    }

    // Check for time-boundary crossings and trigger explosion + re-render
    const sec = nowDate.getSeconds();
    const min = nowDate.getMinutes();
    const hr  = nowDate.getHours();
    const dayMs = lbMidnight(nowDate);

    // Only the boundary relevant to the current view needs to trigger a re-render
    // (e.g. watching 'hours': only a new hour matters; minute/second ticks are ignored).
    // lb.lastSec/Min/Hr/DayMs are reset on every full re-render, so they stay accurate.
    const secondsChanged = (lb.level === 'seconds') && sec !== lb.lastSec;
    const minutesChanged = (lb.level === 'minutes') && min !== lb.lastMin;
    const hoursChanged   = (lb.level === 'hours')   && hr  !== lb.lastHr;
    const dayChanged     = (lb.level === 'days')     && dayMs !== lb.lastDayMs;

    if ((secondsChanged || minutesChanged || hoursChanged || dayChanged) && !lb.exploding) {
      lb.lastSec  = sec;
      lb.lastMin  = min;
      lb.lastHr   = hr;
      lb.lastDayMs = dayMs;
      lbTriggerExplosion(() => lbFullRender());
    }

    lb.rafId = requestAnimationFrame(lbUpdateFrame);
  }

  function initLifeBlocks() {
    lbFullRender();
    lb.rafId = requestAnimationFrame(lbUpdateFrame);
    lbStackInit();
  }

  // ---- Always-On Stack Panel ------------------------------

  // Mapping from DOM level name to exploding-state key
  const LBSTACK_LEVEL_KEY = {
    seconds: 'sec', minutes: 'min', hours: 'hr',
    days: 'day', months: 'month', years: 'year',
  };

  const lbStack = {
    rafId:       null,
    active:      false,       // true once the section is in view
    initialized: false,       // whether lastSec/etc. have been seeded
    lastSec: -1, lastMin: -1, lastHr: -1,
    lastDay: -1, lastMonth: -1, lastYear: -1,
    pendingCascade: false,
    exploding: { sec: false, min: false, hr: false,
                 day: false, month: false, year: false },
  };

  // Render all blocks for one row into rowEl.
  // Dying + future blocks get data-stack-level for click-to-drill-down.
  function lbStackRenderRow(rowEl, level, now) {
    const nowDate    = new Date(now);
    const yr         = nowDate.getFullYear();
    const mo         = nowDate.getMonth();     // 0-based
    const dayOfMonth = nowDate.getDate();      // 1-based
    const hr         = nowDate.getHours();
    const min        = nowDate.getMinutes();
    const sec        = nowDate.getSeconds();

    const LABEL_TEXT = {
      years: 'YEARS', months: 'MONTHS', days: 'DAYS',
      hours: 'HOURS', minutes: 'MINS', seconds: 'SECS',
    };
    const MONTH_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN',
                         'JUL','AUG','SEP','OCT','NOV','DEC'];

    let totalBlocks, currentIdx, progress;
    let overflow = null; // overflow label text, or null
    let ariaLabelFn;     // (idx) → accessible label string

    switch (level) {
      case 'seconds':
        totalBlocks = 60;
        currentIdx  = sec;
        progress    = (now - Math.floor(now / 1000) * 1000) / 1000 * 100;
        ariaLabelFn = (i) => i < sec ? `Second ${i} of 60 — elapsed`
          : i === sec ? `Second ${sec} of 60 — active`
          : `Second ${i} of 60 — pending`;
        break;

      case 'minutes':
        totalBlocks = 60;
        currentIdx  = min;
        progress    = (now - Math.floor(now / 60000) * 60000) / 60000 * 100;
        ariaLabelFn = (i) => i < min ? `Minute ${i} — elapsed`
          : i === min ? `Minute ${min} of 60 — active`
          : `Minute ${i} — pending`;
        break;

      case 'hours':
        totalBlocks = 24;
        currentIdx  = hr;
        progress    = (now - Math.floor(now / 3600000) * 3600000) / 3600000 * 100;
        ariaLabelFn = (i) => {
          const t = String(i).padStart(2, '0') + ':00';
          if (i < hr)    return t + ' — elapsed';
          if (i === hr)  return t + ' — active';
          return t + ' — pending';
        };
        break;

      case 'days': {
        const daysInMonth = new Date(yr, mo + 1, 0).getDate();
        totalBlocks = daysInMonth;
        currentIdx  = dayOfMonth - 1; // convert to 0-based
        progress    = (now - lbMidnight(now)) / 86400000 * 100;
        ariaLabelFn = (i) => {
          const d = i + 1;
          if (i < currentIdx)  return `Day ${d} — elapsed`;
          if (i === currentIdx) return `Day ${d} — active`;
          return `Day ${d} — pending`;
        };
        break;
      }

      case 'months': {
        const monthStart = new Date(yr, mo, 1).getTime();
        const monthEnd   = new Date(yr, mo + 1, 1).getTime();
        totalBlocks = 12;
        currentIdx  = mo;
        progress    = (now - monthStart) / (monthEnd - monthStart) * 100;
        ariaLabelFn = (i) => {
          const n = MONTH_SHORT[i];
          if (i < mo)    return `${n} — elapsed`;
          if (i === mo)  return `${n} — active`;
          return `${n} — pending`;
        };
        break;
      }

      case 'years': {
        const extinctionYear = new Date(lbExtinctionMs()).getFullYear();
        const startYear  = yr - 2;
        const totalYears = extinctionYear - startYear + 1;
        const displayed  = Math.min(totalYears, 30);
        totalBlocks = displayed;
        currentIdx  = yr - startYear; // always 2
        const yearStart = new Date(yr, 0, 1).getTime();
        const yearEnd   = new Date(yr + 1, 0, 1).getTime();
        progress = (now - yearStart) / (yearEnd - yearStart) * 100;
        if (totalYears > 30) {
          overflow = `+${totalYears - 30}y`;
        }
        ariaLabelFn = (i) => {
          const y = startYear + i;
          if (y < yr)    return `${y} — elapsed`;
          if (y === yr)  return `${y} — active`;
          return `${y} — pending`;
        };
        break;
      }

      default:
        return;
    }

    let html = `<span class="lb-stack-label" aria-hidden="true">${LABEL_TEXT[level]}</span>`;
    html += `<div class="lb-stack-grid">`;

    for (let i = 0; i < totalBlocks; i++) {
      const lbl = escHtml(ariaLabelFn(i));
      if (i < currentIdx) {
        // dead — not interactive
        html += `<div class="lb-block lb-dead" aria-disabled="true"
          title="${lbl}" aria-label="${lbl}"></div>`;
      } else if (i === currentIdx) {
        // dying — interactive (navigates drill-down)
        html += `<div class="lb-block lb-dying"
          style="--progress:${progress.toFixed(2)}%"
          tabindex="0" role="button"
          data-stack-level="${level}" data-stack-idx="${i}"
          title="${lbl}" aria-label="${lbl}"></div>`;
      } else {
        // future — interactive
        const navLbl = escHtml(`Jump drill-down to ${level} view`);
        html += `<div class="lb-block lb-future"
          tabindex="0" role="button"
          data-stack-level="${level}" data-stack-idx="${i}"
          title="${lbl}" aria-label="${navLbl}"></div>`;
      }
    }

    if (overflow) {
      html += `<div class="lb-block lb-future lb-overflow" aria-disabled="true"
        title="${overflow} years not shown"
        aria-label="${overflow} more years">${escHtml(overflow)}</div>`;
    }

    html += `</div>`;
    rowEl.innerHTML = html;

    // Wire click + keyboard on dying and future blocks
    rowEl.querySelectorAll('[data-stack-level]').forEach((block) => {
      block.addEventListener('click', lbStackHandleClick);
      block.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          lbStackHandleClick.call(block, e);
        }
      });
    });
  }

  function lbStackRenderAll(now) {
    ['years', 'months', 'days', 'hours', 'minutes', 'seconds'].forEach((level) => {
      const rowEl = document.getElementById('lb-stack-' + level);
      if (rowEl) lbStackRenderRow(rowEl, level, now);
    });
  }

  // Update only the --progress CSS var on each dying block each RAF frame —
  // no full re-render required.
  function lbStackUpdateProgress(now) {
    const nowDate    = new Date(now);
    const yr         = nowDate.getFullYear();
    const mo         = nowDate.getMonth();
    const monthStart = new Date(yr, mo, 1).getTime();
    const monthEnd   = new Date(yr, mo + 1, 1).getTime();
    const yearStart  = new Date(yr, 0, 1).getTime();
    const yearEnd    = new Date(yr + 1, 0, 1).getTime();

    const progByLevel = {
      seconds: (now - Math.floor(now / 1000)    * 1000)    / 1000    * 100,
      minutes: (now - Math.floor(now / 60000)   * 60000)   / 60000   * 100,
      hours:   (now - Math.floor(now / 3600000) * 3600000) / 3600000 * 100,
      days:    (now - lbMidnight(now))                      / 86400000 * 100,
      months:  (now - monthStart) / (monthEnd - monthStart) * 100,
      years:   (now - yearStart)  / (yearEnd  - yearStart)  * 100,
    };

    Object.entries(progByLevel).forEach(([level, progress]) => {
      if (lbStack.exploding[LBSTACK_LEVEL_KEY[level]]) return;
      const rowEl = document.getElementById('lb-stack-' + level);
      if (!rowEl) return;
      const dyingEl = rowEl.querySelector('.lb-dying');
      if (dyingEl) dyingEl.style.setProperty('--progress', progress.toFixed(2) + '%');
    });
  }

  // Detect second/minute/hour/day/month/year crossings and schedule staggered
  // explosions (100 ms per level, seconds first → years last).
  function lbStackCheckBoundaries(now) {
    const nowDate = new Date(now);
    const sec   = nowDate.getSeconds();
    const min   = nowDate.getMinutes();
    const hr    = nowDate.getHours();
    const day   = nowDate.getDate();
    const month = nowDate.getMonth();
    const year  = nowDate.getFullYear();

    // First call: seed last-seen values without triggering explosions.
    if (!lbStack.initialized) {
      lbStack.lastSec   = sec;
      lbStack.lastMin   = min;
      lbStack.lastHr    = hr;
      lbStack.lastDay   = day;
      lbStack.lastMonth = month;
      lbStack.lastYear  = year;
      lbStack.initialized = true;
      return;
    }

    if (lbStack.pendingCascade) return;

    const secChanged   = sec   !== lbStack.lastSec;
    if (!secChanged) return;

    const minChanged   = min   !== lbStack.lastMin;
    const hrChanged    = hr    !== lbStack.lastHr;
    const dayChanged   = day   !== lbStack.lastDay;
    const monthChanged = month !== lbStack.lastMonth;
    const yearChanged  = year  !== lbStack.lastYear;

    lbStack.lastSec   = sec;
    lbStack.lastMin   = min;
    lbStack.lastHr    = hr;
    lbStack.lastDay   = day;
    lbStack.lastMonth = month;
    lbStack.lastYear  = year;

    // Build the cascade for all levels whose boundary was crossed.
    // Stagger: seconds=0 ms, minutes=100 ms, hours=200 ms, …
    const cascade = [{ key: 'sec',   level: 'seconds', delay: 0   }];
    if (minChanged)   cascade.push({ key: 'min',   level: 'minutes', delay: 100 });
    if (hrChanged)    cascade.push({ key: 'hr',    level: 'hours',   delay: 200 });
    if (dayChanged)   cascade.push({ key: 'day',   level: 'days',    delay: 300 });
    if (monthChanged) cascade.push({ key: 'month', level: 'months',  delay: 400 });
    if (yearChanged)  cascade.push({ key: 'year',  level: 'years',   delay: 500 });

    lbStack.pendingCascade = true;
    let remaining = cascade.length;

    cascade.forEach(({ key, level, delay }) => {
      setTimeout(() => {
        const rowEl   = document.getElementById('lb-stack-' + level);
        const dyingEl = rowEl ? rowEl.querySelector('.lb-dying') : null;
        if (!dyingEl) {
          remaining--;
          if (!remaining) lbStack.pendingCascade = false;
          return;
        }
        lbStack.exploding[key] = true;
        dyingEl.classList.add('lb-exploding');
        // After the explosion animation completes, re-render the row.
        setTimeout(() => {
          lbStack.exploding[key] = false;
          lbStackRenderRow(rowEl, level, Date.now());
          remaining--;
          if (!remaining) lbStack.pendingCascade = false;
        }, 560);
      }, delay);
    });
  }

  // Click handler for dying/future blocks in the always-on stack panel.
  // Navigates the existing drill-down panel to the corresponding time scale.
  function lbStackHandleClick(e) {
    const block = e.currentTarget || this;
    const level = block.getAttribute('data-stack-level');
    if (!level) return;

    const nowDate = new Date();
    switch (level) {
      case 'years':
      case 'months':
      case 'days':
        lb.level  = 'days';
        lb.day    = null;
        lb.hour   = null;
        lb.minute = null;
        break;
      case 'hours':
        lb.level  = 'hours';
        lb.day    = 0;
        lb.hour   = null;
        lb.minute = null;
        break;
      case 'minutes':
        lb.level  = 'minutes';
        lb.day    = 0;
        lb.hour   = nowDate.getHours();
        lb.minute = null;
        break;
      case 'seconds':
        lb.level  = 'seconds';
        lb.day    = 0;
        lb.hour   = nowDate.getHours();
        lb.minute = nowDate.getMinutes();
        break;
      default:
        return;
    }

    lbFullRender(); // internally calls lbRenderBreadcrumb()
    const container = document.getElementById('lb-container');
    if (container) {
      const reducedMotion =
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      container.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  }

  // RAF loop for the always-on stack panel.
  function lbStackFrame() {
    if (!lbStack.active) return;
    const now = Date.now();
    lbStackUpdateProgress(now);
    lbStackCheckBoundaries(now);
    lbStack.rafId = requestAnimationFrame(lbStackFrame);
  }

  // Initialise the always-on stack: render immediately, then use
  // IntersectionObserver to start/stop the RAF loop as needed.
  function lbStackInit() {
    const section = document.getElementById('life-blocks-section');
    if (!section) return;

    // Render once immediately so blocks are visible before scroll.
    lbStackRenderAll(Date.now());

    if (typeof IntersectionObserver === 'undefined') {
      // Fallback for environments without IO (e.g., jsdom in tests).
      lbStack.active = true;
      lbStack.rafId  = requestAnimationFrame(lbStackFrame);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!lbStack.active) {
            lbStack.active = true;
            lbStack.rafId  = requestAnimationFrame(lbStackFrame);
          }
        } else {
          lbStack.active = false;
          if (lbStack.rafId) {
            cancelAnimationFrame(lbStack.rafId);
            lbStack.rafId = null;
          }
        }
      });
    }, { threshold: 0.2 });

    observer.observe(section);
  }

  // ---- Render token-saving tips ---------------------------
  function renderTips() {
    const grid = document.getElementById('tipsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    TOKEN_TIPS.forEach((tip) => {
      const card = document.createElement('div');
      card.className = 'tip-card';
      card.id = 'tip-' + escHtml(tip.id);
      const impact = calculateTipImpact(tip.savingPct, 1); // 1 % of global users
      const savedTokensStr = formatTokenCountShort(impact.tokensPerDay);
      const savedCo2Str = formatTokenCountShort(impact.co2KgPerDay);
      card.innerHTML = `
        <div class="tip-header">
          <span class="tip-icon" aria-hidden="true">${tip.icon}</span>
          <div class="tip-title">${escHtml(tip.title)}</div>
        </div>
        <p class="tip-text">${escHtml(tip.tip)}</p>
        <p class="tip-detail">${escHtml(tip.detail)}</p>
        <div class="tip-impact">
          If 1&#x202F;% of global users applied this tip:<br>
          <strong>${escHtml(savedTokensStr)} tokens/day saved</strong> ·
          <strong>${escHtml(savedCo2Str)} kg CO₂/day avoided</strong>
        </div>
        ${tip.reference ? `<a href="${escHtml(tip.reference)}" class="tip-ref" target="_blank" rel="noopener noreferrer">📎 Learn more</a>` : ''}
      `;
      grid.appendChild(card);
    });
  }

  // ---- Render changelog tab -----------------------------------
  function renderChangelog() {
    const list = document.getElementById('changelogList');
    if (!list) return;

    const versionEl = document.getElementById('siteVersion');
    if (versionEl && SITE_VERSION) {
      versionEl.textContent = 'v' + SITE_VERSION;
    }

    if (!CHANGELOG_RELEASES || CHANGELOG_RELEASES.length === 0) {
      list.innerHTML = '<p class="about-body">No changelog entries found.</p>';
      return;
    }

    let html = '';
    CHANGELOG_RELEASES.forEach((release) => {
      const isUnreleased = release.version === 'Unreleased';
      const dateStr = release.date
        ? `<span class="changelog-date">${escHtml(release.date)}</span>`
        : '';
      const ghUrl = isUnreleased
        ? 'https://github.com/nitrocode/token-deathclock/compare/v' +
          escHtml(SITE_VERSION) + '...HEAD'
        : 'https://github.com/nitrocode/token-deathclock/releases/tag/v' +
          escHtml(release.version);
      html += `<div class="changelog-release${isUnreleased ? ' changelog-release--unreleased' : ''}">`;
      html += `<div class="changelog-release-header">`;
      html += `<a class="changelog-version" href="${ghUrl}" target="_blank" rel="noopener noreferrer">`;
      html += isUnreleased ? '🔧 Unreleased' : escHtml('v' + release.version);
      html += `</a>${dateStr}`;
      html += `</div>`;
      if (release.sections.length === 0) {
        html += `<p class="changelog-empty">No entries yet.</p>`;
      }
      release.sections.forEach((sec) => {
        html += `<div class="changelog-section">`;
        html += `<h4 class="changelog-section-heading">${escHtml(sec.heading)}</h4>`;
        html += `<ul class="changelog-items">`;
        sec.items.forEach((item) => {
          html += `<li class="changelog-item">${escHtml(item)}</li>`;
        });
        html += `</ul></div>`;
      });
      html += `</div>`;
    });

    list.innerHTML = html;
  }

  // ---- Render footer meta-irony stats -------------------------
  function renderFooterStats() {
    const el = document.getElementById('footerMetaIrony');
    if (!el || PROJECT_PR_COUNT == null || PROJECT_TOTAL_TOKENS == null) return;
    const formattedTokens = '~' + PROJECT_TOTAL_TOKENS.toLocaleString('en-US');
    el.innerHTML =
      '🔥 This site was built using AI coding agents across ' +
      escHtml(String(PROJECT_PR_COUNT)) + ' pull requests, consuming an estimated ' +
      '<strong>' + escHtml(formattedTokens) + ' tokens</strong> in the process \u2014 ' +
      'adding to the very problem it tracks.';
  }

  // ============================================================
  // FUN FEATURES
  // ============================================================

  const SITE_URL = 'https://nitrocode.github.io/token-deathclock/';
  const SHARE_PANEL_DELAY_MS = 10_000; // 10 000 ms — delay before showing floating share panel

  // ---- "AI Is Currently Generating…" Ticker ------------------

  const TICKER_ENTRIES = [
    { tokensEach: 400,   label: 'LinkedIn posts about disruption, transformation, and journeys' },
    { tokensEach: 800,   label: 'cover letters for jobs already filled by AI' },
    { tokensEach: 200,   label: 'apology emails for replying "per my last email"' },
    { tokensEach: 1500,  label: 'README files for projects that will never be committed' },
    { tokensEach: 3000,  label: 'passive-aggressive Slack messages softened by three rewrites' },
    { tokensEach: 600,   label: 'horoscopes for zodiac signs that don\'t exist yet' },
    { tokensEach: 2000,  label: 'attempts to explain consciousness to a language model' },
    { tokensEach: 500,   label: 'recursive prompts asking AI if it\'s sentient' },
    { tokensEach: 1200,  label: 'love poems for someone who asked for "something quick"' },
    { tokensEach: 400,   label: 'philosophical debates between two instances of the same model' },
    { tokensEach: 2500,  label: 'security advisories for vulnerabilities AI introduced last week' },
    { tokensEach: 800,   label: 'slide decks titled "AI Strategy 2026"' },
    { tokensEach: 300,   label: 'meeting summaries for meetings that could have been emails' },
    { tokensEach: 5000,  label: 'terms of service that no human will ever read' },
    { tokensEach: 600,   label: 'bedtime stories featuring a dragon named Gerald' },
    { tokensEach: 400,   label: 'recipes that add cheese to things that should not have cheese' },
    { tokensEach: 800,   label: 'cat pictures described in 800 words' },
    { tokensEach: 250,   label: 'arguments about whether a hot dog is a sandwich' },
    { tokensEach: 100,   label: 'variations of "hello world" in Rust' },
    { tokensEach: 1000,  label: 'strongly worded letters about a neighbour\'s leaf blower' },
  ];

  let tickerPaused = false;
  let tickerIdx    = 0;
  let tickerCurrent = null; // { entry, nStr, sessionTokens }
  let tickerInterval = null;

  function tickerNiceFmt(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + ' million';
    if (n >= 1e3) return (Math.round(n / 100) * 100).toLocaleString();
    return Math.max(1, Math.round(n)).toLocaleString();
  }

  function updateTicker() {
    if (tickerPaused) return;
    const now = Date.now();
    const elapsed = Math.max(1, (now - pageLoadTime) / 1000);
    const rate = getRateAtDate(new Date(now));
    const sessionTokens = elapsed * rate;
    const entry = TICKER_ENTRIES[tickerIdx % TICKER_ENTRIES.length];
    const count = Math.max(1, sessionTokens / entry.tokensEach);
    const nStr  = tickerNiceFmt(count);
    const el    = document.getElementById('ai-ticker-text');
    if (el) el.textContent = nStr + ' ' + entry.label;
    tickerCurrent = { entry, nStr, sessionTokens, rate };
    tickerIdx++;
  }

  function expandTicker() {
    if (!tickerCurrent) return;
    tickerPaused = true;
    const expanded = document.getElementById('ai-ticker-expanded');
    if (expanded) expanded.hidden = false;
    const toggleBtn = document.getElementById('ai-ticker-toggle');
    if (toggleBtn) { toggleBtn.textContent = '▶ Resume'; toggleBtn.setAttribute('aria-pressed', 'true'); }
    const math = document.getElementById('ai-ticker-math');
    if (math && tickerCurrent) {
      const { entry, nStr, sessionTokens, rate } = tickerCurrent;
      const elapsed = Math.round(sessionTokens / rate);
      math.textContent =
        `${elapsed}s × ${formatTokenCount(rate)} tokens/sec\n` +
        `= ${formatTokenCount(sessionTokens)} tokens consumed globally\n\n` +
        `÷ ${entry.tokensEach.toLocaleString()} tokens per item\n` +
        `≈ ${nStr} ${entry.label}\n\n` +
        `(Just in the time you've been watching.)`;
    }
  }

  function collapseTicker() {
    const expanded = document.getElementById('ai-ticker-expanded');
    if (expanded) expanded.hidden = true;
    tickerPaused = false;
    const toggleBtn = document.getElementById('ai-ticker-toggle');
    if (toggleBtn) { toggleBtn.textContent = '⏸ Pause'; toggleBtn.setAttribute('aria-pressed', 'false'); }
  }

  function shareTickerFact() {
    if (!tickerCurrent) return;
    const { entry, nStr, sessionTokens } = tickerCurrent;
    const elapsed = Math.floor((Date.now() - pageLoadTime) / 1000);
    const timeStr = elapsed >= 60
      ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
      : `${elapsed}s`;
    const text =
      `🤖 Since I arrived (${timeStr} ago), AI has probably generated:\n\n` +
      `${nStr} ${entry.label}\n\n` +
      `That's what ${formatTokenCount(tickerCurrent.rate)} tokens/sec looks like in human terms.\n` +
      `→ ${SITE_URL} #AIDeathClock #TokenDeathClock`;
    openSharePopup(text);
  }

  function initTicker() {
    const prefersReduced = typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    updateTicker();
    if (!prefersReduced) {
      tickerInterval = setInterval(updateTicker, 4000);
    }

    const textEl = document.getElementById('ai-ticker-text');
    if (textEl) textEl.addEventListener('click', expandTicker);

    const toggleBtn = document.getElementById('ai-ticker-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (tickerPaused) { collapseTicker(); } else { expandTicker(); }
      });
    }

    const resumeBtn = document.getElementById('ai-ticker-resume');
    if (resumeBtn) resumeBtn.addEventListener('click', collapseTicker);

    const shareBtn = document.getElementById('ai-ticker-share');
    if (shareBtn) shareBtn.addEventListener('click', shareTickerFact);
  }

  // ---- "What Could We Have Done Instead?" Equivalences -------

  let snarkMode = false;
  let equivIdx  = 0;

  function updateEquivalences() {
    const tokens  = getCurrentTokens();
    const entries = generateEquivalences(tokens, snarkMode ? 'snarky' : 'hopeful');
    if (!entries.length) return;
    const entry   = entries[equivIdx % entries.length];
    const iconEl  = document.getElementById('equivIcon');
    const textEl  = document.getElementById('equivText');
    if (iconEl) iconEl.textContent = entry.icon;
    if (textEl) textEl.textContent = entry.text;
    equivIdx++;
  }

  function initEquivalences() {
    updateEquivalences();
    setInterval(updateEquivalences, 5000);

    const toggle = document.getElementById('snarkToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        snarkMode = !snarkMode;
        toggle.textContent = snarkMode ? '🌱 Hopeful Mode' : '😤 Snarky Mode';
        toggle.setAttribute('aria-pressed', snarkMode ? 'true' : 'false');
        equivIdx = 0;
        updateEquivalences();
      });
    }
  }

  // ---- Share Your Doom ----------------------------------------

  function buildShareText() {
    const now     = Date.now();
    const elapsed = Math.floor((now - pageLoadTime) / 1000);
    const rate    = getRateAtDate(new Date(now));
    const sessionTokens = Math.max(1, elapsed * rate);
    const phrases = sessionEquivalences(sessionTokens);
    const equiv   = phrases.length
      ? phrases[Math.floor(Math.random() * phrases.length)]
      : null;
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
    let text =
      `💀 I just watched AI consume ${formatTokenCount(sessionTokens)} tokens ` +
      `in the ${timeStr} I spent on this site.`;
    if (equiv) text += `\nThat's ${equiv}.`;
    text += `\nAnd it never stops.\n→ ${SITE_URL} #AIDeathClock #TokenDeathClock`;
    return text;
  }

  // Generic share — uses OS share sheet when available, falls back to Twitter deep-link.
  // Use this for buttons that aren't labelled with a specific platform.
  function openSharePopup(text) {
    if (navigator.share) {
      navigator.share({ text, url: SITE_URL }).catch(() => {
        // User cancelled or share failed — fall back to Twitter
        openTwitterShare(text);
      });
      return;
    }
    openTwitterShare(text);
  }

  // Platform-specific deep-link helpers — bypass navigator.share intentionally.
  function openTwitterShare(text) {
    const url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer,width=560,height=420');
  }

  function openRedditShare(title) {
    const url = 'https://www.reddit.com/submit?url=' +
      encodeURIComponent(SITE_URL) + '&title=' + encodeURIComponent(title);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openLinkedInShare(text) {
    const url = 'https://www.linkedin.com/shareArticle?mini=true&url=' +
      encodeURIComponent(SITE_URL) + '&title=' +
      encodeURIComponent('Token Deathclock — AI\'s Environmental Cost, Live') +
      '&summary=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openWhatsAppShare(text) {
    const url = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openBlueskyShare(text) {
    const url = 'https://bsky.app/intent/compose?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // Copies `value` to clipboard; updates `btn` text to give feedback.
  function copyToClipboard(btn, value, resetLabel) {
    if (!navigator.clipboard) {
      btn.textContent = '❌ Not supported';
      setTimeout(() => { btn.textContent = resetLabel; }, 2000);
      return;
    }
    navigator.clipboard.writeText(value).then(() => {
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.textContent = resetLabel; }, 2000);
    }).catch(() => {
      btn.textContent = '❌ Failed';
      setTimeout(() => { btn.textContent = resetLabel; }, 2000);
    });
  }

  function initSharePanel() {
    const panel   = document.getElementById('share-doom-panel');
    const options = document.getElementById('share-doom-options');
    if (!panel) return;

    // Show floating panel after 10 s of page time
    setTimeout(() => { panel.hidden = false; }, SHARE_PANEL_DELAY_MS);

    // Support ?share=true URL param — auto-open options immediately
    if (new URLSearchParams(window.location.search).get('share') === 'true') {
      panel.hidden = false;
      if (options) options.hidden = false;
    }

    const mainBtn = document.getElementById('shareDoomBtn');
    if (mainBtn) {
      mainBtn.addEventListener('click', () => {
        if (options) options.hidden = !options.hidden;
      });
    }

    const twitterBtn = document.getElementById('shareTwitterBtn');
    if (twitterBtn) {
      twitterBtn.addEventListener('click', () => {
        // Use direct deep-link — bypasses navigator.share for platform-specific button
        openTwitterShare(buildShareText());
        awardBadge('spreading_doom');
        if (options) options.hidden = true;
      });
    }

    const redditBtn = document.getElementById('shareRedditBtn');
    if (redditBtn) {
      redditBtn.addEventListener('click', () => {
        const title = 'I watched AI consume millions of tokens in real time — the numbers are terrifying';
        openRedditShare(title);
        awardBadge('spreading_doom');
        if (options) options.hidden = true;
      });
    }

    const linkedinBtn = document.getElementById('shareLinkedInBtn');
    if (linkedinBtn) {
      linkedinBtn.addEventListener('click', () => {
        openLinkedInShare(buildShareText());
        awardBadge('spreading_doom');
        if (options) options.hidden = true;
      });
    }

    const whatsappBtn = document.getElementById('shareWhatsAppBtn');
    if (whatsappBtn) {
      whatsappBtn.addEventListener('click', () => {
        openWhatsAppShare(buildShareText());
        awardBadge('spreading_doom');
        if (options) options.hidden = true;
      });
    }

    const blueskyBtn = document.getElementById('shareBlueskyBtn');
    if (blueskyBtn) {
      blueskyBtn.addEventListener('click', () => {
        openBlueskyShare(buildShareText());
        awardBadge('spreading_doom');
        if (options) options.hidden = true;
      });
    }

    const copyBtn = document.getElementById('shareCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        copyToClipboard(copyBtn, buildShareText(), '📋 Copy text');
        awardBadge('spreading_doom');
        if (options) options.hidden = true;
      });
    }

    const closeBtn = document.getElementById('shareCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => { if (options) options.hidden = true; });
    }

    // Close options when clicking outside
    document.addEventListener('click', (e) => {
      if (options && !options.hidden && panel && !panel.contains(e.target)) {
        options.hidden = true;
      }
    });
  }

  // ---- Footer "Spread the Doom" share row ---------------------

  function initFooterShare() {
    const shareText = () => buildShareText();
    const redditTitle = 'I watched AI consume millions of tokens in real time — the numbers are terrifying';

    const map = [
      { id: 'footerShareTwitter',  fn: () => openTwitterShare(shareText()) },
      { id: 'footerShareReddit',   fn: () => openRedditShare(redditTitle) },
      { id: 'footerShareLinkedIn', fn: () => openLinkedInShare(shareText()) },
      { id: 'footerShareWhatsApp', fn: () => openWhatsAppShare(shareText()) },
      { id: 'footerShareBluesky',  fn: () => openBlueskyShare(shareText()) },
      { id: 'footerShareCopy',     fn: (btn) => copyToClipboard(btn, SITE_URL, '📋 Copy link') },
    ];

    map.forEach(({ id, fn }) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          fn(btn);
          awardBadge('spreading_doom');
        });
      }
    });
  }

  // ---- Token Receipt Modal ------------------------------------

  let receiptShown = false;

  function generateReceiptText() {
    const now     = new Date();
    const elapsed = Math.floor((Date.now() - pageLoadTime) / 1000);
    const rate    = getRateAtDate(now);
    const sessionTokens = Math.max(1, elapsed * rate);
    const impact  = calculateEnvironmentalImpact(sessionTokens);

    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const durationStr = m > 0 ? `${m} min ${s} sec` : `${s} sec`;

    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
    const timeStr = now.toUTCString().split(' ')[4] + ' UTC';

    const co2g     = (impact.co2Kg * 1000).toFixed(1);
    const waterMl  = Math.round(impact.waterL * 1000);
    const kwhStr   = impact.kWh < 0.000001 ? '< 0.000001' : impact.kWh.toFixed(6);
    const kmDriven = (impact.co2Kg / 0.171).toFixed(3);
    const phoneMin = Math.max(1, Math.round(impact.kWh / 0.015 * 60));
    const sips     = Math.max(1, Math.round(waterMl / 20));

    const L32 = '─'.repeat(32);
    const E32 = '═'.repeat(32);

    function pl(str, w) { return String(str).padStart(w); }

    return [
      '╔' + '═'.repeat(30) + '╗',
      '║  🧾  AI DEATH CLOCK          ║',
      '║     SESSION RECEIPT          ║',
      '╚' + '═'.repeat(30) + '╝',
      '',
      `  Date:     ${dateStr}`,
      `  Time:     ${timeStr}`,
      `  Duration: ${durationStr}`,
      '',
      L32,
      'ITEM                       VALUE',
      L32,
      `AI tokens consumed ${pl(formatTokenCount(sessionTokens), 12)}`,
      `Energy used (kWh)  ${pl(kwhStr, 12)}`,
      `CO\u2082 emitted (g)   ${pl(co2g, 12)}`,
      `Water used (mL)    ${pl(waterMl, 12)}`,
      '',
      `Global rate: ${formatTokenCount(rate)} tokens/sec`,
      L32,
      'ENVIRONMENTAL COST:',
      '',
      `  \uD83C\uDF21\uFE0F  ~${co2g} g CO\u2082`,
      `     \u2248 driving ${kmDriven} km`,
      '',
      `  \uD83C\uDF0A  ~${waterMl} mL water`,
      `     \u2248 ${sips} sip${sips !== 1 ? 's' : ''} of tea`,
      '',
      `  \u26A1  ~${kwhStr} kWh`,
      `     \u2248 phone for ${phoneMin} min`,
      L32,
      '   * * * NO REFUNDS * * *',
      '  THE PLANET CANNOT ISSUE',
      '   CARBON CREDITS FOR AI',
      L32,
      '    Please come again.',
      "    (We'll still be here.)",
      '           \uD83D\uDC80',
      E32,
    ].join('\n');
  }

  function buildReceiptShareText() {
    const elapsed = Math.floor((Date.now() - pageLoadTime) / 1000);
    const rate    = getRateAtDate(new Date());
    const sessionTokens = Math.max(1, elapsed * rate);
    const impact  = calculateEnvironmentalImpact(sessionTokens);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
    const co2g    = (impact.co2Kg * 1000).toFixed(1);
    const waterMl = Math.round(impact.waterL * 1000);
    return (
      `\uD83E\uDDFE My AI Death Clock receipt: AI consumed ${formatTokenCount(sessionTokens)} tokens in ${timeStr}. ` +
      `That's ${co2g}g CO\u2082, ${waterMl}mL water. ` +
      `And I didn't even prompt anything.\n` +
      `\u2192 ${SITE_URL} #TokenDeathClock #AIReceipt`
    );
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') {
      if (e.key === 'Escape') hideReceiptModal();
      return;
    }
    const modal    = document.getElementById('receipt-modal');
    if (!modal) return;
    const focusable = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  function showReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    if (!modal) return;
    const body = document.getElementById('receipt-body');
    if (body) body.textContent = generateReceiptText();
    modal.hidden = false;
    receiptShown = true;
    modal.addEventListener('keydown', trapFocus);
    const firstBtn = modal.querySelector('button');
    if (firstBtn) firstBtn.focus();
    awardBadge('receipt_collector');
  }

  function hideReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    if (!modal) return;
    modal.hidden = true;
    modal.removeEventListener('keydown', trapFocus);
  }

  function initReceiptModal() {
    const triggerBtn = document.getElementById('getReceiptBtn');
    if (triggerBtn) triggerBtn.addEventListener('click', showReceiptModal);

    const closeBtn = document.getElementById('receiptCloseBtn');
    if (closeBtn)   closeBtn.addEventListener('click', hideReceiptModal);

    const shareBtn = document.getElementById('receiptShareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        openSharePopup(buildReceiptShareText());
        awardBadge('spreading_doom');
      });
    }

    const copyBtn = document.getElementById('receiptCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const bodyEl = document.getElementById('receipt-body');
        const text   = bodyEl ? bodyEl.textContent : generateReceiptText();
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = '✅ Copied!';
          setTimeout(() => { copyBtn.textContent = '📋 Copy Receipt'; }, 2000);
        }).catch(() => {
          copyBtn.textContent = '❌ Failed';
          setTimeout(() => { copyBtn.textContent = '📋 Copy Receipt'; }, 2000);
        });
      });
    }

    // Close on backdrop click
    const modal = document.getElementById('receipt-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) hideReceiptModal();
      });
    }

  }

  // ---- Personal Footprint Calculator --------------------------

  function updateCalcResults() {
    const promptsEl = document.getElementById('calcPrompts');
    const lengthEl  = document.getElementById('calcLength');
    const modelEl   = document.getElementById('calcModel');
    if (!promptsEl || !lengthEl || !modelEl) return;

    const prompts = parseInt(promptsEl.value,  10) || 20;
    const tokens  = parseInt(lengthEl.value,   10) || 500;
    const mult    = parseFloat(modelEl.value)      || 1;

    const fp = calculatePersonalFootprint(prompts, tokens, mult);

    const co2g       = (fp.weekly.co2Kg   * 1000).toFixed(1);
    const waterMlW   = Math.round(fp.weekly.waterL * 1000);
    const co2gA      = Math.round(fp.annual.co2Kg   * 1000);
    const globalT    = (fp.globalWeeklyCo2Kg / 1000).toFixed(1);
    const kmDriven   = (fp.annual.co2Kg / 0.171).toFixed(1);
    const globalCars = formatTokenCount(fp.globalWeeklyCo2Kg / (0.171 * 1000 / 52));
    const treeBail   = Math.max(1, Math.round(fp.annual.co2Kg / 21));
    const phoneCharges = Math.round(fp.weekly.kWh / 0.015);

    const results = document.getElementById('calc-results');
    if (!results) return;

    results.innerHTML = `
      <div class="wanted-poster">
        <div class="wanted-title">WANTED</div>
        <div class="wanted-subtitle">For Environmental Crimes Against the Atmosphere</div>
        <div class="wanted-divider"></div>
        <div class="wanted-charges">
          <div class="wanted-charge"><strong>COUNT I:</strong> Consuming ${escHtml(formatTokenCount(fp.weeklyTokens))} tokens per week — enough to power ${escHtml(phoneCharges.toLocaleString())} smartphone charges.</div>
          <div class="wanted-charge"><strong>COUNT II:</strong> Emitting ${escHtml(co2g)} g CO\u2082 weekly — equivalent to driving ${escHtml(kmDriven)} km a year.</div>
          <div class="wanted-charge"><strong>COUNT III:</strong> Evaporating ${escHtml(String(waterMlW))} mL of cooling water per week without remorse.</div>
          <div class="wanted-charge"><strong>COUNT IV:</strong> Projecting annual emissions of ${escHtml(String(co2gA))} g CO\u2082 — sustained and premeditated.</div>
        </div>
        <div class="wanted-divider"></div>
        <div class="wanted-bail">⚖️ BAIL: Plant ${escHtml(String(treeBail))} tree${treeBail !== 1 ? 's' : ''} or delete your ChatGPT account.</div>
        <div class="wanted-global">If all 500M AI users matched this profile: ${escHtml(globalT)} tonnes CO\u2082/week — equiv. ${escHtml(globalCars)} cars driven.</div>
      </div>`;
  }

  function buildCalcShareText() {
    const promptsEl = document.getElementById('calcPrompts');
    const lengthEl  = document.getElementById('calcLength');
    const modelEl   = document.getElementById('calcModel');
    const prompts   = promptsEl ? (parseInt(promptsEl.value, 10) || 20) : 20;
    const tokens    = lengthEl  ? (parseInt(lengthEl.value,  10) || 500) : 500;
    const mult      = modelEl   ? (parseFloat(modelEl.value) || 1) : 1;
    const fp        = calculatePersonalFootprint(prompts, tokens, mult);
    const co2g      = (fp.weekly.co2Kg * 1000).toFixed(1);
    const globalT   = (fp.globalWeeklyCo2Kg / 1000).toFixed(0);
    return (
      `\uD83E\uDDEE I sent ${prompts} AI prompts this week. ` +
      `That's ~${formatTokenCount(fp.weeklyTokens)} tokens, ~${co2g}g CO\u2082. ` +
      `Multiply me by 500 million \u2192 ${globalT} tonnes of CO\u2082/week just from AI prompts.\n` +
      `\u2192 ${SITE_URL} #AICarbonFootprint #TokenDeathClock`
    );
  }

  function initCalculator() {
    const toggleBtn = document.getElementById('calcToggleBtn');
    const content   = document.getElementById('calc-content');
    if (toggleBtn && content) {
      toggleBtn.addEventListener('click', () => {
        const opening = content.hidden;
        content.hidden = !opening;
        toggleBtn.textContent = opening
          ? '\u25BC Close Calculator'
          : '\u25BA Open Personal AI Carbon Footprint Calculator';
        toggleBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
        if (opening) {
          updateCalcResults();
          awardBadge('number_cruncher');
        }
      });
    }

    ['calcPrompts', 'calcLength', 'calcModel'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        if (id === 'calcPrompts') {
          const val = document.getElementById('calcPromptsVal');
          if (val) val.textContent = el.value;
          el.setAttribute('aria-valuenow', el.value);
        }
        updateCalcResults();
      });
    });

    const shareBtn = document.getElementById('calcShareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        openSharePopup(buildCalcShareText());
        awardBadge('spreading_doom');
      });
    }
  }

  // ---- Doom Achievements / Badge System -----------------------

  const BADGE_DEFS = [
    { id: 'morbid_curious',       icon: '\uD83D\uDC40', name: 'Morbid Curious',         desc: 'Spent 30 seconds watching the apocalypse.',          type: 'time',   threshold: 30   },
    { id: 'doom_magnet',          icon: '\uD83E\uDDF2', name: 'Doom Magnet',             desc: 'Spent 3 minutes watching the apocalypse.',            type: 'time',   threshold: 180  },
    { id: 'chronic_doomscroller', icon: '\uD83D\uDECB\uFE0F', name: 'Chronic Doomscroller', desc: '10 minutes of uninterrupted doom.',               type: 'time',   threshold: 600  },
    { id: 'terminal_patient',     icon: '\uD83D\uDC80', name: 'Terminal Patient',         desc: 'Half an hour here. Are you okay?',                   type: 'time',   threshold: 1800 },
    { id: 'one_of_us',            icon: '\uD83E\uDD16', name: 'One of Us Now',            desc: "One hour. You're part of the machine now.",          type: 'time',   threshold: 3600 },
    { id: 'spreading_doom',       icon: '\uD83D\uDCE4', name: 'Spreading the Doom',       desc: 'Clicked Share. Sharing is caring.',                  type: 'manual' },
    { id: 'number_cruncher',      icon: '\uD83E\uDDEE', name: 'Number Cruncher',          desc: 'Opened the Personal Footprint Calculator.',          type: 'manual' },
    { id: 'receipt_collector',    icon: '\uD83E\uDDFE', name: 'Receipt Collector',        desc: 'Checked your session receipt.',                       type: 'manual' },
    { id: 'optimist',             icon: '\uD83C\uDF1E', name: 'Optimist',                 desc: 'Switched to Light Mode. Your optimism is noted.',    type: 'manual' },
    { id: 'nocturnal_doomer',     icon: '\uD83C\uDF13', name: 'Nocturnal Doomer',         desc: "Visiting between midnight and 4am. Can't sleep?",   type: 'easter' },
    { id: 'return_visitor',       icon: '\uD83D\uDD01', name: 'Glutton for Punishment',   desc: 'You came back. You knew what would happen.',         type: 'easter' },
    // Accelerator badges
    { id: 'accelerant',           icon: '\uD83D\uDE80', name: 'Accelerant',               desc: 'Made your first tap on the Big Red Button.',         type: 'manual' },
    { id: 'arsonist',             icon: '\uD83D\uDD25', name: 'Arsonist',                 desc: 'Reached 10\xD7 combo for the first time.',           type: 'manual' },
    { id: 'trillion_villain',     icon: '\u26A1',       name: 'Trillion Villain',         desc: 'Personally contributed 1 trillion tokens.',          type: 'manual' },
    { id: 'continental_threat',   icon: '\uD83C\uDF0D', name: 'Continental Threat',       desc: 'Purchased the Global Data Centre upgrade.',          type: 'manual' },
    { id: 'space_criminal',       icon: '\uD83D\uDEF0\uFE0F', name: 'Space Criminal',    desc: 'Purchased the Orbital Inference Array.',             type: 'manual' },
    { id: 'godlike',              icon: '\uD83E\uDDEC', name: 'Godlike',                  desc: 'Purchased the AGI Mode upgrade.',                    type: 'manual' },
    { id: 'first_blood',          icon: '\uD83C\uDFC1', name: 'First Blood',              desc: 'Personally triggered your first milestone.',         type: 'manual' },
    { id: 'apex_accelerant',      icon: '\u2620\uFE0F', name: 'Apex Accelerant',         desc: 'Personally triggered 5 milestones.',                 type: 'manual' },
    { id: 'bragging_rights',      icon: '\uD83D\uDCE4', name: 'Bragging Rights',          desc: 'Shared your personal acceleration total.',           type: 'manual' },
    // AI-Native company badges
    { id: 'layoff_legend',        icon: '📤',           name: 'Layoff Legend',            desc: 'Replaced your first human worker with AI.',          type: 'manual' },
    { id: 'token_maxxer_badge',   icon: '📈',           name: 'Token Maxxer',             desc: 'Deployed your first AI agent.',                      type: 'manual' },
    { id: 'ai_native_ceo',        icon: '🏢',           name: 'AI-Native CEO',            desc: 'Reached AI-Native Company stage.',                   type: 'manual' },
    { id: 'lights_out',           icon: '☠️',           name: 'Lights Out',               desc: 'Replaced every human worker. Fully automated.',      type: 'manual' },
    // Witness badges
    { id: 'witness',              icon: '👁️',           name: 'Witness',                  desc: 'Stayed to watch a milestone get crossed in real time.', type: 'manual' },
  ];

  const LS_BADGES_KEY = 'tokenDeathclockBadges';
  const LS_VISITS_KEY = 'tokenDeathclockVisits';

  let earnedBadges = new Set();
  const toastQueue = [];
  let   toastActive = false;

  function loadBadges() {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_BADGES_KEY) || '[]');
      if (Array.isArray(stored)) stored.forEach((id) => earnedBadges.add(id));
    } catch (_) { /* ignore quota / parse errors */ }
  }

  function saveBadges() {
    try {
      localStorage.setItem(LS_BADGES_KEY, JSON.stringify([...earnedBadges]));
    } catch (_) { /* ignore */ }
  }

  function awardBadge(id) {
    if (earnedBadges.has(id)) return;
    const def = BADGE_DEFS.find((b) => b.id === id);
    if (!def) return;
    earnedBadges.add(id);
    saveBadges();
    queueToast(def);
    updateBadgesGrid();
  }

  function checkTimeBadges() {
    const elapsed = Math.floor((Date.now() - pageLoadTime) / 1000);
    BADGE_DEFS.filter((b) => b.type === 'time').forEach((b) => {
      if (elapsed >= b.threshold) awardBadge(b.id);
    });
  }

  function checkEasterEggs() {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 4) awardBadge('nocturnal_doomer');
  }

  function renderBadgesGrid() {
    const grid = document.getElementById('badges-grid');
    if (!grid) return;
    grid.innerHTML = '';
    BADGE_DEFS.forEach((def) => {
      const earned = earnedBadges.has(def.id);
      const hint   = def.type === 'time'
        ? `Spend ${def.threshold < 60 ? def.threshold + 's' : Math.round(def.threshold / 60) + 'min'} on the page`
        : def.type === 'easter' ? 'A secret badge\u2026' : 'Complete a specific action';
      const div = document.createElement('div');
      div.className   = 'badge-item ' + (earned ? 'earned' : 'locked');
      div.id          = 'badge-' + def.id;
      div.title       = earned ? def.desc : hint;
      div.setAttribute('aria-label', earned ? `${def.name}: ${def.desc}` : `Locked: ${hint}`);
      div.innerHTML   = `
        <span class="badge-icon" aria-hidden="true">${earned ? escHtml(def.icon) : '\uD83D\uDD12'}</span>
        <span class="badge-name">${escHtml(def.name)}</span>`;
      grid.appendChild(div);
    });
  }

  function updateBadgesGrid() {
    BADGE_DEFS.forEach((def) => {
      const el = document.getElementById('badge-' + def.id);
      if (!el) return;
      const earned = earnedBadges.has(def.id);
      el.className   = 'badge-item ' + (earned ? 'earned' : 'locked');
      const iconEl   = el.querySelector('.badge-icon');
      if (iconEl) iconEl.textContent = earned ? def.icon : '\uD83D\uDD12';
      el.title       = earned ? def.desc : el.title;
      if (earned) el.setAttribute('aria-label', `${def.name}: ${def.desc}`);
    });
  }

  function queueToast(def) {
    toastQueue.push(def);
    if (!toastActive) showNextToast();
  }

  function showNextToast() {
    if (!toastQueue.length) { toastActive = false; return; }
    toastActive = true;
    const def     = toastQueue.shift();
    const toast   = document.getElementById('toast');
    const iconEl  = document.getElementById('toast-icon');
    const titleEl = document.getElementById('toast-title');
    const descEl  = document.getElementById('toast-desc');
    if (!toast) return;
    if (iconEl)  iconEl.textContent  = def.icon;
    if (titleEl) titleEl.textContent = '\uD83C\uDFC6 ' + def.name;
    if (descEl)  descEl.textContent  = def.desc;
    toast.hidden = false;
    toast.classList.remove('toast-out');
    toast.classList.add('toast-in');
    clearTimeout(toast._dismissTimer);
    toast._dismissTimer = setTimeout(dismissToast, 5000);
  }

  function dismissToast() {
    const toast = document.getElementById('toast');
    if (!toast || toast.hidden) return;
    toast.classList.remove('toast-in');
    toast.classList.add('toast-out');
    setTimeout(() => {
      toast.hidden = true;
      toast.classList.remove('toast-out');
      toastActive = false;
      if (toastQueue.length) showNextToast();
    }, 320);
  }

  function initBadges() {
    loadBadges();

    // Track visit count and award return visitor badge
    try {
      const visits = (parseInt(localStorage.getItem(LS_VISITS_KEY) || '0', 10) || 0) + 1;
      localStorage.setItem(LS_VISITS_KEY, visits);
      if (visits > 1) setTimeout(() => awardBadge('return_visitor'), 600);
    } catch (_) { /* ignore */ }

    checkEasterEggs();
    renderBadgesGrid();

    const closeBtn = document.getElementById('toast-close');
    if (closeBtn) closeBtn.addEventListener('click', dismissToast);
  }

  // ============================================================
  // ACCELERATE THE DOOM
  // ============================================================

  // ---- Constants -------------------------------------------

  /** Base tokens added to personal counter per tap (before multipliers). */
  const ACC_BASE_TOKENS_PER_TAP = 1_000_000;

  /** Doom Points earned per token (1 DP per 1 million tokens). */
  const ACC_DP_PER_TOKEN = 1 / 1_000_000;

  const UPGRADES = [
    { id: 'gpu_rack',    icon: '\uD83D\uDDA5\uFE0F', name: 'Extra GPU Rack',          cost:    10, multiplier:   2, flavour: 'More cores, more chaos'               },
    { id: 'liquid_cool', icon: '\u26A1',              name: 'Liquid Cooling Override', cost:    50, multiplier:   5, flavour: 'Ignore the thermal warnings'           },
    { id: 'global_dc',   icon: '\uD83C\uDF0D',        name: 'Global Data Centre',      cost:   200, multiplier:  10, flavour: 'Every continent contributing'          },
    { id: 'orbital',     icon: '\uD83D\uDEF0\uFE0F',  name: 'Orbital Inference Array', cost:  1000, multiplier:  25, flavour: 'Space itself regrets this'             },
    { id: 'agi_mode',    icon: '\uD83E\uDDEC',        name: 'AGI Mode',                cost:  5000, multiplier: 100, flavour: "It's writing its own prompts now"      },
  ];

  const LS_UPGRADES_KEY   = 'tokenDeathclockUpgrades';
  const LS_BESTSCORE_KEY  = 'tokenDeathclockBestScore';
  const LS_COMPANY_KEY    = 'tokenDeathclockCompany';
  const LS_GAME_STATE_KEY = 'tokenDeathclockGameState';

  // ---- State -----------------------------------------------

  const acc = {
    personalTokens:      0,
    doomPoints:          0,
    tapMultiplier:       1,
    combo:               1,
    tapTimestamps:       [],   // epoch-ms of recent taps (trimmed to last 3 s)
    totalTaps:           0,
    comboMaxHits:        0,    // times 10× combo was reached this session
    milestonesTriggered: 0,    // personal milestones crossed this session
    personalMilestoneSet: new Set(), // ids of milestones the player has crossed
    bestScore:           0,
    ownedUpgrades:       {},   // upgrade id → true
    challenges:          [],   // active challenge defs (3)
    challengeProgress:   {},   // challenge id → { value, completed }
    sessionStartTokens:  0,    // snapshot of personalTokens when section opens (for carbon sprint)
    sessionStartTime:    0,    // ms when section was opened
    _comboResetTimer:    null,
    _speedSecond:        { taps: 0, ts: 0 },  // taps in current 1-second bucket
    _speedStreak:        0,    // consecutive 1-sec buckets with ≥ 10 taps
    // Company / AI-Native
    replacedWorkers:     {},   // roleId → true
    ownedAgents:         {},   // agentId → count
    passiveRate:         0,    // tokens/sec from passive generators
  };

  // ---- Persistence -----------------------------------------

  function loadAcceleratorState() {
    try {
      const raw = localStorage.getItem(LS_UPGRADES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') acc.ownedUpgrades = parsed;
      }
    } catch (_) { /* ignore */ }
    try {
      const bs = parseFloat(localStorage.getItem(LS_BESTSCORE_KEY) || '0');
      if (isFinite(bs) && bs > 0) acc.bestScore = bs;
    } catch (_) { /* ignore */ }
    try {
      const raw = localStorage.getItem(LS_COMPANY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.replacedWorkers && typeof parsed.replacedWorkers === 'object') {
            acc.replacedWorkers = parsed.replacedWorkers;
          }
          if (parsed.ownedAgents && typeof parsed.ownedAgents === 'object') {
            acc.ownedAgents = parsed.ownedAgents;
          }
        }
      }
    } catch (_) { /* ignore */ }
    try {
      const raw = localStorage.getItem(LS_GAME_STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.personalTokens === 'number' && isFinite(parsed.personalTokens) && parsed.personalTokens >= 0) {
            acc.personalTokens = parsed.personalTokens;
          }
          if (typeof parsed.doomPoints === 'number' && isFinite(parsed.doomPoints) && parsed.doomPoints >= 0) {
            acc.doomPoints = parsed.doomPoints;
          }
          if (typeof parsed.totalTaps === 'number' && isFinite(parsed.totalTaps) && parsed.totalTaps >= 0) {
            acc.totalTaps = Math.floor(parsed.totalTaps);
          }
          if (typeof parsed.milestonesTriggered === 'number' && isFinite(parsed.milestonesTriggered) && parsed.milestonesTriggered >= 0) {
            acc.milestonesTriggered = Math.floor(parsed.milestonesTriggered);
          }
          if (Array.isArray(parsed.personalMilestoneSet)) {
            acc.personalMilestoneSet = new Set(
              parsed.personalMilestoneSet.filter((id) => typeof id === 'string')
            );
          }
        }
      }
    } catch (_) { /* ignore */ }
    // Recompute tap multiplier and passive rate from persisted state
    acc.tapMultiplier = currentTapMultiplier();
    acc.passiveRate   = computePassiveRate(acc.ownedAgents, acc.replacedWorkers);
  }

  function saveAcceleratorState() {
    try { localStorage.setItem(LS_UPGRADES_KEY, JSON.stringify(acc.ownedUpgrades)); } catch (_) { /* ignore */ }
    try { localStorage.setItem(LS_BESTSCORE_KEY, String(acc.bestScore)); } catch (_) { /* ignore */ }
    try {
      localStorage.setItem(LS_COMPANY_KEY, JSON.stringify({
        replacedWorkers: acc.replacedWorkers,
        ownedAgents:     acc.ownedAgents,
      }));
    } catch (_) { /* ignore */ }
    try {
      localStorage.setItem(LS_GAME_STATE_KEY, JSON.stringify({
        personalTokens:      acc.personalTokens,
        doomPoints:          acc.doomPoints,
        totalTaps:           acc.totalTaps,
        milestonesTriggered: acc.milestonesTriggered,
        personalMilestoneSet: [...acc.personalMilestoneSet],
      }));
    } catch (_) { /* ignore */ }
  }

  function currentTapMultiplier() {
    let mult = 1;
    UPGRADES.forEach((u) => {
      if (acc.ownedUpgrades[u.id]) mult = Math.max(mult, u.multiplier);
    });
    return mult;
  }

  // ---- Tap handler -----------------------------------------

  function handleTap() {
    const now = Date.now();

    // Record tap timestamp, keep a 3-second window
    acc.tapTimestamps.push(now);
    if (acc.tapTimestamps.length > 200) {
      acc.tapTimestamps = acc.tapTimestamps.filter((t) => t >= now - 3000);
    }

    // Update combo
    const newCombo = computeComboMultiplier(acc.tapTimestamps);
    const hitMaxCombo = newCombo === 10 && acc.combo < 10;
    acc.combo = newCombo;

    // Tokens this tap
    const tokensThisTap = ACC_BASE_TOKENS_PER_TAP * acc.tapMultiplier * acc.combo;
    acc.personalTokens += tokensThisTap;
    acc.doomPoints     += tokensThisTap * ACC_DP_PER_TOKEN;
    acc.totalTaps++;

    // Speed challenge tracking: bucket by 1-second windows
    const secBucket = Math.floor(now / 1000);
    if (secBucket === acc._speedSecond.ts) {
      acc._speedSecond.taps++;
    } else {
      if (acc._speedSecond.taps >= 10) {
        acc._speedStreak++;
      } else {
        acc._speedStreak = 0;
      }
      acc._speedSecond = { taps: 1, ts: secBucket };
    }

    // Combo-max hits (for combo_king challenge)
    if (hitMaxCombo) acc.comboMaxHits++;

    // Haptic
    if (typeof navigator.vibrate === 'function') navigator.vibrate(30);

    // Visual tap animation
    const btn = document.getElementById('bigRedButton');
    if (btn) {
      btn.classList.add('tapping');
      setTimeout(() => btn.classList.remove('tapping'), 140);
    }

    updateAcceleratorUI();
    checkAcceleratorAchievements();
    updateChallengeProgress();
    updateVillainLeaderboard();
  }

  // ---- Challenge progress ----------------------------------

  function initChallengeProgress() {
    acc.challenges = getSessionChallenges(Date.now());
    acc.challengeProgress = {};
    acc.challenges.forEach((c) => {
      acc.challengeProgress[c.id] = { value: 0, completed: false };
    });
    acc.sessionStartTokens = acc.personalTokens;
    acc.sessionStartTime   = Date.now();
  }

  function updateChallengeProgress() {
    let anyChanged = false;
    acc.challenges.forEach((c) => {
      const p = acc.challengeProgress[c.id];
      if (!p || p.completed) return;
      let newValue = p.value;

      switch (c.type) {
        case 'taps':    newValue = acc.totalTaps; break;
        case 'tokens':  newValue = acc.personalTokens; break;
        case 'combo':   newValue = acc.comboMaxHits; break;
        case 'upgrade': newValue = Object.keys(acc.ownedUpgrades).length; break;
        case 'co2': {
          const impact = calculateEnvironmentalImpact(acc.personalTokens);
          newValue = impact.co2Kg; // target is in kg (1000 kg = 1 tonne)
          break;
        }
        case 'speed': {
          // Speed: 50 taps in under 10 seconds
          // Check if the last 50 taps were within 10 seconds
          if (acc.tapTimestamps.length >= 50) {
            const earliest = acc.tapTimestamps[acc.tapTimestamps.length - 50];
            const latest   = acc.tapTimestamps[acc.tapTimestamps.length - 1];
            if (latest - earliest < 10000) {
              newValue = c.target; // mark complete
            }
          }
          break;
        }
        default: break;
      }

      if (newValue !== p.value) {
        p.value = newValue;
        anyChanged = true;
        if (newValue >= c.target && !p.completed) {
          p.completed = true;
          p.value = c.target;
          acc.doomPoints += c.rewardDp;
          showChallengeComplete(c);
          // Nocturnal bonus: any challenge completed between midnight and 4am
          const hour = new Date().getHours();
          if (hour >= 0 && hour < 4) awardBadge('nocturnal_doomer');
        }
      }
    });
    if (anyChanged) renderChallenges();
  }

  function showChallengeComplete(c) {
    queueToast({
      icon: c.icon,
      name: 'Challenge Complete: ' + c.label,
      desc: '+' + c.rewardDp + ' DP — ' + c.desc,
    });
  }

  // ---- Achievements ----------------------------------------

  function checkAcceleratorAchievements() {
    if (acc.totalTaps === 1)                         awardBadge('accelerant');
    if (acc.combo === 10)                            awardBadge('arsonist');
    if (acc.personalTokens >= 1e12)                  awardBadge('trillion_villain');
    if (acc.ownedUpgrades['global_dc'])              awardBadge('continental_threat');
    if (acc.ownedUpgrades['orbital'])                awardBadge('space_criminal');
    if (acc.ownedUpgrades['agi_mode'])               awardBadge('godlike');
    if (acc.milestonesTriggered >= 1)                awardBadge('first_blood');
    if (acc.milestonesTriggered >= 5)                awardBadge('apex_accelerant');
  }

  // ---- Upgrade purchase ------------------------------------

  function purchaseUpgrade(id) {
    const upgrade = UPGRADES.find((u) => u.id === id);
    if (!upgrade || acc.ownedUpgrades[id]) return;
    if (acc.doomPoints < upgrade.cost) return;
    acc.doomPoints -= upgrade.cost;
    acc.ownedUpgrades[id] = true;
    acc.tapMultiplier = currentTapMultiplier();
    saveAcceleratorState();

    queueToast({
      icon: upgrade.icon,
      name: 'Upgrade Unlocked: ' + upgrade.name,
      desc: upgrade.flavour + ' — now ' + upgrade.multiplier + '\xD7 per tap',
    });

    updateAcceleratorUI();
    renderUpgradeShop();
    checkAcceleratorAchievements();
    updateChallengeProgress(); // may complete first_upgrade challenge
  }

  // ---- UI rendering ----------------------------------------

  function updateAcceleratorUI() {
    const impact = calculateEnvironmentalImpact(acc.personalTokens);

    setAccelText('accelTokens', formatTokenCount(acc.personalTokens));
    setAccelText('accelDp',     formatDoomPoints(acc.doomPoints));

    // CO₂ display: grams when < 1 kg, otherwise kg
    const co2Val = impact.co2Kg < 1
      ? (impact.co2Kg * 1000).toFixed(1) + ' g'
      : impact.co2Kg.toFixed(2) + ' kg';
    setAccelText('accelCo2', co2Val);

    // Water display: mL when < 1 L, otherwise L
    const waterVal = impact.waterL < 1
      ? Math.round(impact.waterL * 1000) + ' mL'
      : impact.waterL.toFixed(2) + ' L';
    setAccelText('accelWater', waterVal);

    // Passive rate display
    setAccelText('passiveRateDisplay', formatTokenCount(acc.passiveRate) + ' tokens/sec');

    updateComboDisplay();
    updateMilestoneRace();
    updateBestScore();
    renderUpgradeShop();
    renderWorkforcePanel();
    renderAgentShop();
    updateCompanyStage();

    // Show/hide share button
    const shareBtn = document.getElementById('shareAccelerationBtn');
    if (shareBtn) shareBtn.hidden = acc.personalTokens <= 0;

    // Show tap rate
    const rateEl = document.getElementById('brbTapRate');
    if (rateEl && acc.tapTimestamps.length >= 2) {
      const window2s = acc.tapTimestamps.filter((t) => t >= Date.now() - 2000);
      const rate = window2s.length / 2;
      rateEl.textContent = rate.toFixed(1) + ' taps/sec';
    }
  }

  function setAccelText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function updateComboDisplay() {
    const el = document.getElementById('comboDisplay');
    const btn = document.getElementById('bigRedButton');
    const lbl = document.getElementById('brbLabel');
    if (!el) return;

    el.textContent = acc.combo + '\xD7';
    el.setAttribute('aria-label', 'Combo multiplier: ' + acc.combo + '\xD7');

    const isMax = acc.combo === 10;
    el.classList.toggle('combo-max', isMax);
    if (btn) {
      btn.classList.toggle('combo-max', isMax);
      btn.setAttribute('aria-label', 'Feed the Machine \u2014 ' + acc.combo + '\xD7 combo');
    }
    if (lbl) {
      if (acc.combo >= 10)      lbl.textContent = 'MAXIMUM DOOM \u2622\uFE0F';
      else if (acc.combo >= 5)  lbl.textContent = 'FASTER! \uD83D\uDD25';
      else if (acc.combo >= 2)  lbl.textContent = 'Keep Going\u2026';
      else                      lbl.textContent = 'Feed the Machine';
    }
  }

  function updateMilestoneRace() {
    const next = getNextMilestoneForPlayer(acc.personalTokens, MILESTONES);
    const nameEl = document.getElementById('milestoneRaceName');
    const pctEl  = document.getElementById('milestoneRacePct');
    const fill   = document.getElementById('milestoneRaceFill');
    const bar    = document.getElementById('milestoneRaceBar');

    if (!next) {
      if (nameEl) nameEl.textContent = 'All cleared \uD83D\uDC80';
      if (pctEl)  pctEl.textContent  = '100%';
      if (fill)   fill.style.width   = '100%';
      return;
    }

    // Find the previous milestone tokens as the lower bound
    const idx  = MILESTONES.indexOf(next);
    const prev = idx > 0 ? MILESTONES[idx - 1].tokens : 0;
    const pct  = milestoneProgress(acc.personalTokens, prev, next.tokens);

    if (nameEl) nameEl.textContent = next.icon + ' ' + next.name;
    if (pctEl)  pctEl.textContent  = pct.toFixed(1) + '%';
    if (fill)   fill.style.width   = pct + '%';
    if (bar)    bar.setAttribute('aria-valuenow', Math.round(pct));

    // Check if the player just triggered this milestone
    if (acc.personalTokens >= next.tokens && !acc.personalMilestoneSet.has(next.id)) {
      acc.personalMilestoneSet.add(next.id);
      acc.milestonesTriggered++;
      flashPersonalMilestoneTrigger(next);
      if (typeof navigator.vibrate === 'function') navigator.vibrate(80);
      checkAcceleratorAchievements();
    }
  }

  function flashPersonalMilestoneTrigger(milestone) {
    // Flash the race bar
    const wrap = document.querySelector('.milestone-race-wrap');
    if (wrap) {
      wrap.classList.add('milestone-triggered');
      setTimeout(() => wrap.classList.remove('milestone-triggered'), 700);
    }
    // Flash the global milestone card
    const card = document.getElementById('milestone-' + milestone.id);
    if (card) {
      card.classList.add('player-triggered');
      setTimeout(() => card.classList.remove('player-triggered'), 700);
    }
    queueToast({
      icon: milestone.icon,
      name: 'Milestone Triggered: ' + milestone.name,
      desc: 'You personally crossed ' + milestone.shortDesc + '. Catastrophe achieved.',
    });
  }

  function updateBestScore() {
    if (acc.personalTokens > acc.bestScore) {
      acc.bestScore = acc.personalTokens;
      saveAcceleratorState();
      const valueEl = document.getElementById('bestScoreValue');
      if (valueEl) {
        valueEl.textContent = formatTokenCount(acc.bestScore);
        valueEl.className = 'new-record';
        setTimeout(() => { valueEl.className = ''; }, 2000);
      }
      updateVillainLeaderboard();
    } else {
      const valueEl = document.getElementById('bestScoreValue');
      if (valueEl && valueEl.textContent === '\u2014') {
        valueEl.textContent = acc.bestScore > 0 ? formatTokenCount(acc.bestScore) : '\u2014';
      }
    }
  }

  function renderUpgradeShop() {
    const shop = document.getElementById('upgradeShop');
    if (!shop) return;

    shop.innerHTML = '';
    UPGRADES.forEach((u) => {
      const owned      = !!acc.ownedUpgrades[u.id];
      const affordable = acc.doomPoints >= u.cost;
      const btn        = document.createElement('button');
      btn.className    = 'upgrade-card' +
        (owned ? ' owned' : '') +
        (!owned && !affordable ? ' unaffordable' : '');
      btn.setAttribute('aria-label', owned
        ? u.name + ' (owned)'
        : u.name + ' \u2014 costs ' + u.cost + ' DP'
      );
      if (owned) btn.setAttribute('aria-disabled', 'true');
      btn.innerHTML = `
        <span class="upgrade-card-icon" aria-hidden="true">${escHtml(u.icon)}</span>
        <div class="upgrade-card-name">${escHtml(u.name)}</div>
        <div class="upgrade-card-flavour">${escHtml(u.flavour)}</div>
        <div class="upgrade-card-cost">${owned ? '\u2713 Owned' : escHtml(String(u.cost)) + ' DP'}</div>
        <div class="upgrade-card-mult">${escHtml(String(u.multiplier))}\xD7 per tap</div>`;
      if (!owned) {
        btn.addEventListener('click', () => purchaseUpgrade(u.id));
      }
      shop.appendChild(btn);
    });
  }

  // ---- Workforce panel (fire workers) ----------------------

  function fireWorker(id) {
    const role = COMPANY_ROLES.find((r) => r.id === id);
    if (!role || acc.replacedWorkers[id]) return;
    if (acc.doomPoints < role.cost) return;
    acc.doomPoints -= role.cost;
    acc.replacedWorkers[id] = true;
    acc.passiveRate = computePassiveRate(acc.ownedAgents, acc.replacedWorkers);
    saveAcceleratorState();
    queueToast({
      icon:  role.icon,
      name:  'Role Automated: ' + role.name,
      desc:  role.flavour + ' (+' + formatTokenCount(role.tps) + '/sec)',
    });
    updateAcceleratorUI();
    renderWorkforcePanel();
    checkCompanyAchievements();
    updateChallengeProgress();
  }

  function renderWorkforcePanel() {
    const panel = document.getElementById('workforcePanel');
    if (!panel) return;
    panel.innerHTML = '';
    COMPANY_ROLES.forEach((r) => {
      const fired      = !!acc.replacedWorkers[r.id];
      const affordable = !fired && acc.doomPoints >= r.cost;
      const card       = document.createElement('button');
      card.className   = 'worker-card' +
        (fired ? ' fired' : '') +
        (!fired && !affordable ? ' unaffordable' : '');
      card.setAttribute('aria-label', fired
        ? r.name + ' (automated)'
        : r.name + ' — fire for ' + r.cost + ' DP'
      );
      if (fired) card.setAttribute('aria-disabled', 'true');
      card.innerHTML = `
        <span class="worker-card-icon" aria-hidden="true">${escHtml(r.icon)}</span>
        <div class="worker-card-name">${escHtml(r.name)}</div>
        <div class="worker-card-flavour">${escHtml(r.flavour)}</div>
        <div class="worker-card-tps">+${escHtml(formatTokenCount(r.tps))}/sec</div>
        <div class="worker-card-cost">${fired ? '🤖 Automated' : escHtml(String(r.cost)) + ' DP'}</div>`;
      if (!fired) {
        card.addEventListener('click', () => fireWorker(r.id));
      }
      panel.appendChild(card);
    });
  }

  // ---- AI Agent shop (passive generators) ------------------

  function purchaseAgent(id) {
    const agent = AI_AGENTS.find((a) => a.id === id);
    if (!agent) return;
    if (acc.doomPoints < agent.cost) return;
    acc.doomPoints -= agent.cost;
    acc.ownedAgents[id] = (acc.ownedAgents[id] || 0) + 1;
    acc.passiveRate = computePassiveRate(acc.ownedAgents, acc.replacedWorkers);
    saveAcceleratorState();
    updateAcceleratorUI();
    renderAgentShop();
    checkCompanyAchievements();
    updateChallengeProgress();
  }

  function renderAgentShop() {
    const shop = document.getElementById('agentShop');
    if (!shop) return;
    shop.innerHTML = '';
    AI_AGENTS.forEach((a) => {
      const count      = acc.ownedAgents[a.id] || 0;
      const affordable = acc.doomPoints >= a.cost;
      const card       = document.createElement('button');
      card.className   = 'agent-card' + (!affordable ? ' unaffordable' : '');
      card.setAttribute('aria-label',
        a.name + (count ? ' (×' + count + ' owned)' : '') + ' — costs ' + a.cost + ' DP'
      );
      card.innerHTML = `
        <span class="agent-card-icon" aria-hidden="true">${escHtml(a.icon)}</span>
        <div class="agent-card-name">${escHtml(a.name)}</div>
        <div class="agent-card-flavour">${escHtml(a.flavour)}</div>
        <div class="agent-card-tps">+${escHtml(formatTokenCount(a.tps))}/sec each</div>
        <div class="agent-card-cost">${escHtml(String(a.cost))} DP</div>
        ${count ? `<div class="agent-card-owned">\u00D7${count} deployed</div>` : ''}`;
      card.addEventListener('click', () => purchaseAgent(a.id));
      shop.appendChild(card);
    });
  }

  // ---- Company stage display --------------------------------

  function updateCompanyStage() {
    const replaced = Object.keys(acc.replacedWorkers).length;
    const stage    = getCompanyStage(replaced);
    const iconEl   = document.getElementById('companyStageIcon');
    const nameEl   = document.getElementById('companyStageName');
    if (iconEl) iconEl.textContent = stage.icon;
    if (nameEl) nameEl.textContent = stage.name;
  }

  // ---- Company achievements --------------------------------

  function checkCompanyAchievements() {
    const replaced = Object.keys(acc.replacedWorkers).length;
    if (replaced >= 1) awardBadge('layoff_legend');
    if (replaced >= 5) awardBadge('ai_native_ceo');
    if (replaced >= COMPANY_ROLES.length) awardBadge('lights_out');
    const hasAgent = AI_AGENTS.some((a) => (acc.ownedAgents[a.id] || 0) > 0);
    if (hasAgent) awardBadge('token_maxxer_badge');
  }

  // ---- Passive token generation loop -----------------------

  function startPassiveLoop() {
    // Tick every 200 ms — add passiveRate × 0.2 tokens per tick.
    // Only update the minimal counter elements here; full UI re-renders
    // (shop affordability, challenge progress bars) happen via handleTap() and
    // purchase actions so we avoid heavy DOM churn every 200 ms.
    setInterval(() => {
      if (acc.passiveRate <= 0) return;
      const tokensAdded = acc.passiveRate * 0.2;
      acc.personalTokens += tokensAdded;
      acc.doomPoints     += tokensAdded * ACC_DP_PER_TOKEN;
      // Update only the lightweight numeric displays
      setAccelText('accelTokens', formatTokenCount(acc.personalTokens));
      setAccelText('accelDp',     formatDoomPoints(acc.doomPoints));
      updateMilestoneRace();
      updateBestScore();
      updateChallengeProgress();
    }, 200);
  }

  function renderChallenges() {
    const row = document.getElementById('challengeRow');
    if (!row) return;
    row.innerHTML = '';
    acc.challenges.forEach((c) => {
      const p       = acc.challengeProgress[c.id] || { value: 0, completed: false };
      const pct     = Math.min(100, (p.value / c.target) * 100);
      const card    = document.createElement('div');
      card.className = 'challenge-card' + (p.completed ? ' completed' : '');
      card.setAttribute('role', 'listitem');
      card.setAttribute('aria-label', c.label + (p.completed ? ' (completed)' : ''));
      card.innerHTML = `
        <span class="challenge-card-icon" aria-hidden="true">${escHtml(c.icon)}</span>
        <div class="challenge-card-label">${escHtml(c.label)}</div>
        <div class="challenge-card-desc">${escHtml(c.desc)}</div>
        <div class="challenge-card-reward">+${escHtml(String(c.rewardDp))} DP</div>
        <div class="challenge-card-progress">
          <div class="challenge-card-pct">${pct.toFixed(0)}%</div>
          <div class="progress-bar" role="progressbar"
               aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-fill challenge-progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
        ${p.completed ? '<span class="challenge-checkmark" aria-hidden="true">\u2705</span>' : ''}`;
      row.appendChild(card);
    });
  }

  // ---- Share -----------------------------------------------

  function buildAccelerationShareText() {
    const impact = calculateEnvironmentalImpact(acc.personalTokens);
    const co2g   = (impact.co2Kg * 1000).toFixed(1);
    const waterMl = Math.round(impact.waterL * 1000);
    const next   = getNextMilestoneForPlayer(acc.personalTokens, MILESTONES);
    const nextLabel = next ? next.name : 'civilisation collapse';
    return (
      '\uD83D\uDE80 I personally accelerated AI\u2019s environmental doom by contributing ' +
      formatTokenCount(acc.personalTokens) + ' tokens \u2014 ' +
      co2g + '\u2009g of CO\u2082, ' + waterMl + '\u2009mL of water. ' +
      'One step closer to ' + nextLabel + '. Come join the apocalypse.\n' +
      '\u2192 ' + SITE_URL + ' #AccelerateTheDoom #TokenDeathClock'
    );
  }

  // ---- Combo reset loop ------------------------------------

  function startComboResetLoop() {
    setInterval(() => {
      if (acc.tapTimestamps.length === 0) return;
      const lastTap = acc.tapTimestamps[acc.tapTimestamps.length - 1];
      if (Date.now() - lastTap > 1500) {
        // Reset combo
        acc.tapTimestamps = [];
        if (acc.combo !== 1) {
          acc.combo = 1;
          updateComboDisplay();
          const rateEl = document.getElementById('brbTapRate');
          if (rateEl) rateEl.textContent = 'Tap to begin';
        }
      }
    }, 100);
  }

  // ---- Init ------------------------------------------------

  function initAccelerator() {
    loadAcceleratorState();

    // Toggle open/close
    const toggleBtn = document.getElementById('accelToggleBtn');
    const content   = document.getElementById('accel-content');
    if (toggleBtn && content) {
      toggleBtn.addEventListener('click', () => {
        const opening = content.hidden;
        content.hidden = !opening;
        toggleBtn.textContent = opening
          ? '\u25BC Close Doom Accelerator'
          : '\u25BA Open Doom Accelerator';
        toggleBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
        if (opening) {
          initChallengeProgress();
          renderChallenges();
          renderUpgradeShop();
          renderWorkforcePanel();
          renderAgentShop();
          updateCompanyStage();
          updateAcceleratorUI();
          updateVillainLeaderboard();
          // Show best score from storage
          const valueEl = document.getElementById('bestScoreValue');
          if (valueEl) {
            valueEl.textContent = acc.bestScore > 0 ? formatTokenCount(acc.bestScore) : '\u2014';
          }
        }
      });
    }

    // Big Red Button — use pointerdown for instant response on mobile+desktop
    const btn = document.getElementById('bigRedButton');
    if (btn) {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handleTap();
      });
    }

    // Share button
    const shareBtn = document.getElementById('shareAccelerationBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        openSharePopup(buildAccelerationShareText());
        awardBadge('bragging_rights');
      });
    }

    // Combo reset timer
    startComboResetLoop();
    // Passive token generation loop
    startPassiveLoop();
  }

  // ============================================================
  // FEATURE: Social Ripple — "You're Not Alone"
  // ============================================================

  const PRESENCE_REACTIONS = [
    '"This makes me want to throw my laptop into the ocean." — Anonymous',
    '"I showed this to my manager. They said it was fine." — Anonymous',
    '"I can\'t stop refreshing it." — Anonymous',
    '"My AI assistant wrote this reaction." — Anonymous',
    '"Watching the counter tick feels weirdly calming?" — Anonymous',
    '"I sent this to my friends. None of them opened it." — Anonymous',
    '"We did this. We\'re still doing this." — Anonymous',
    '"The counter went up while I was typing this." — Anonymous',
  ];

  let presenceReactionIdx = 0;

  function updatePresenceStrip() {
    const countEl    = document.getElementById('presenceCount');
    const reactionEl = document.getElementById('presenceReaction');
    if (!countEl) return;

    const count = getSimulatedViewerCount(Date.now());
    countEl.textContent = count.toLocaleString();

    if (reactionEl) {
      reactionEl.style.opacity = '0';
      setTimeout(() => {
        // Wrap index to keep it bounded
        presenceReactionIdx = presenceReactionIdx % PRESENCE_REACTIONS.length;
        reactionEl.textContent = PRESENCE_REACTIONS[presenceReactionIdx];
        reactionEl.style.opacity = '1';
        presenceReactionIdx++;
      }, 500);
    }
  }

  function initPresenceStrip() {
    updatePresenceStrip();
    setInterval(updatePresenceStrip, 25000);
  }

  // ============================================================
  // FEATURE: Witness History — Live Session Event Log
  // ============================================================

  let logEntryCount = 0;
  const LOG_INTERVAL_MS  = 15000;
  const MAX_LOG_ENTRIES  = 50;

  function appendLogEntry() {
    const logEl = document.getElementById('event-log');
    if (!logEl) return;

    const now = Date.now();
    const elapsed = Math.max(1, (now - pageLoadTime) / 1000);
    const rate = getRateAtDate(new Date(now));
    const sessionTokens = elapsed * rate;

    const d = new Date(now);
    const timeStr = [
      String(d.getHours()).padStart(2, '0'),
      String(d.getMinutes()).padStart(2, '0'),
      String(d.getSeconds()).padStart(2, '0'),
    ].join(':');

    const equivs = generateEquivalences(sessionTokens, 'hopeful');
    const equiv = equivs.length
      ? equivs[logEntryCount % equivs.length]
      : null;

    const entry = document.createElement('div');
    entry.className = 'event-log-entry';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = timeStr;
    entry.appendChild(timeSpan);

    if (equiv) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'log-icon';
      iconSpan.setAttribute('aria-hidden', 'true');
      iconSpan.textContent = equiv.icon;
      entry.appendChild(iconSpan);
    }

    const textSpan = document.createElement('span');
    textSpan.className = 'log-text';
    const tokenStr = formatTokenCount(sessionTokens);
    textSpan.textContent = equiv
      ? '+' + tokenStr + ' tokens since you arrived · ' + equiv.text
      : '+' + tokenStr + ' tokens generated globally since you arrived';
    entry.appendChild(textSpan);

    logEl.appendChild(entry);

    // Cap at MAX_LOG_ENTRIES visible entries to avoid unbounded DOM growth
    while (logEl.children.length > MAX_LOG_ENTRIES) {
      logEl.removeChild(logEl.firstChild);
    }

    // Auto-scroll to the newest entry
    logEl.scrollTop = logEl.scrollHeight;
    logEntryCount++;
  }

  function buildLogExportText() {
    const logEl = document.getElementById('event-log');
    if (!logEl) return '';
    const lines = [];
    lines.push('=== AI DEATH CLOCK — SESSION LOG ===');
    lines.push('Session started: ' + new Date(pageLoadTime).toUTCString());
    lines.push('');
    logEl.querySelectorAll('.event-log-entry').forEach((entry) => {
      const time = entry.querySelector('.log-time');
      const text = entry.querySelector('.log-text');
      if (time && text) {
        lines.push('[' + time.textContent + '] ' + text.textContent);
      }
    });
    lines.push('');
    lines.push('\u2192 ' + SITE_URL);
    return lines.join('\n');
  }

  function initEventLog() {
    // First entry after 5 seconds, then every 15 seconds
    setTimeout(appendLogEntry, 5000);
    setInterval(appendLogEntry, LOG_INTERVAL_MS);

    const exportBtn = document.getElementById('exportLogBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const text = buildLogExportText();
        navigator.clipboard.writeText(text).then(() => {
          exportBtn.textContent = '\u2705 Copied!';
          setTimeout(() => { exportBtn.textContent = '\uD83D\uDCCB Copy Log'; }, 2000);
        }).catch(() => {
          exportBtn.textContent = '\u274C Failed';
          setTimeout(() => { exportBtn.textContent = '\uD83D\uDCCB Copy Log'; }, 2000);
        });
      });
    }
  }

  // ============================================================
  // SCARY & SATIRICAL FEATURES — PRDs 1–7
  // ============================================================

  // ── PRD 1: Doomsday Clock ────────────────────────────────────

  const shownEmergencyBroadcasts = new Set();

  // Cache milestone doom thresholds (static — computed once at init)
  const DOOM_FIRST_THRESHOLD = MILESTONES.length ? MILESTONES[0].tokens : 1e15;
  const DOOM_LAST_THRESHOLD  = MILESTONES.length ? MILESTONES[MILESTONES.length - 1].tokens : 1e18;
  const DOOM_RANGE = DOOM_LAST_THRESHOLD - DOOM_FIRST_THRESHOLD;

  function updateDoomsdayClock(tokens) {
    const doomPercent = Math.min(1, Math.max(0,
      (tokens - DOOM_FIRST_THRESHOLD) / DOOM_RANGE
    ));

    // Rotate minute hand from 330° (11 o'clock, 5 min before midnight) to 360°/0° (midnight)
    const angle = 330 + doomPercent * 30;
    const hand = document.getElementById('doomMinHand');
    if (hand) hand.setAttribute('transform', `rotate(${angle}, 50, 50)`);

    // Text display
    const minsLeft = Math.max(0, (1 - doomPercent) * 5);
    const timeEl = document.getElementById('doomTimeText');
    if (timeEl) {
      if (minsLeft < 0.05) {
        timeEl.textContent = '☠️ MIDNIGHT';
      } else {
        timeEl.textContent = minsLeft.toFixed(1) + ' MIN TO MIDNIGHT';
      }
    }

    // Percentage text
    const pctEl = document.getElementById('doomTokenPct');
    if (pctEl) pctEl.textContent = (doomPercent * 100).toFixed(1) + '%';

    // Progress bar
    const barFill = document.getElementById('doomBarFill');
    if (barFill) barFill.style.width = (doomPercent * 100).toFixed(2) + '%';
  }

  function showEmergencyBroadcast(milestone) {
    const el = document.getElementById('emergency-broadcast');
    const msgEl = document.getElementById('ebMsg');
    if (!el || !msgEl) return;

    msgEl.textContent =
      '\u26A0\uFE0F AI just crossed the \u201C' + milestone.name + '\u201D threshold \u2014 ' +
      milestone.shortDesc + '.';

    el.hidden = false;
    // Auto-dismiss after 6 seconds
    clearTimeout(el._dismissTimer);
    el._dismissTimer = setTimeout(() => { el.hidden = true; }, 6000);
  }

  function initDoomsdayClock() {
    updateDoomsdayClock(getCurrentTokens());
    const dismissBtn = document.getElementById('ebDismissBtn');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        const el = document.getElementById('emergency-broadcast');
        if (el) { clearTimeout(el._dismissTimer); el.hidden = true; }
      });
    }
  }

  // ── PRD 2: Apology Generator ─────────────────────────────────

  const APOLOGY_STATEMENTS = [
    'We deeply regret that in the time it took you to read this sentence, AI emitted 47 kg of CO\u2082. We remain committed to sustainability. Here is our 200-slide deck.',
    'We have engaged a third-party auditor to assess the environmental impact of generating the report about our environmental impact.',
    'Reducing our carbon footprint is a core strategic priority. We are on track to be net-zero by 2050, pending board approval and the invention of cold fusion.',
    'We acknowledge that AI training requires significant computational resources. We are actively exploring the use of AI to identify ways to use less AI.',
    'Following careful review, we have determined that the environmental cost of our sustainability report exceeded the impact of the initiatives it described. We are preparing a report on this finding.',
    'Our models are trained on green energy\u2014 sourced from the grid, which is mostly green, in the regions where it isn\u2019t mostly coal.',
    'We are proud to announce our \u201CTokens for Trees\u201D programme, in which we plant one sapling for every 10 billion tokens generated. The trees will mature by 2091.',
    'We take the climate crisis extremely seriously. That is why we have hired an AI to draft our climate commitments.',
    'In response to concerns about data centre water usage, we have begun cooling servers with water sourced from drought-resistant regions. These regions have since requested that we stop.',
    'We have reduced our per-token carbon footprint by 0.0003% year-on-year, which the UN has described as \u201Ctechnically measurable.\u201D',
    'Our latest sustainability framework represents a 47-page commitment to a future in which AI and the planet coexist. It was generated by an AI in 11 seconds.',
    'We appreciate your concern about AI\u2019s environmental impact. Please refer to our FAQ, which was produced using GPT-4 and is 14,000 words long.',
    'Rest assured: for every GPU we add, we plant a potted succulent in our San Francisco headquarters. The lobby is thriving.',
    'We are proud to say that our data centres run 24 hours a day, 7 days a week, 365 days a year, regardless of whether there is renewable energy available.',
    'We have commissioned independent research into the environmental cost of commissioning independent research into our environmental cost. Results pending.',
    'Our carbon offset programme involves investing in future carbon capture technology that does not yet exist, at a date to be determined.',
    'We remain committed to reducing emissions intensity per unit of compute, which is a different metric from total emissions, and the one we choose to report.',
    'We are thrilled to share that this apology consumed approximately 800 tokens to generate. We regret nothing.',
    'After extensive consultation, we have concluded that the most sustainable action is to continue exactly as we are while commissioning further consultations.',
    'Thank you for your feedback. It has been logged, summarised by an AI, and forwarded to a committee that meets quarterly.',
  ];

  let apologyIdx  = 0;
  let apologyText = '';

  function updateApology() {
    apologyIdx = (apologyIdx + 1) % APOLOGY_STATEMENTS.length;
    apologyText = APOLOGY_STATEMENTS[apologyIdx];
    const el = document.getElementById('apologyQuote');
    if (el) {
      el.style.opacity = '0';
      setTimeout(() => {
        el.textContent = apologyText;
        el.style.opacity = '1';
      }, 300);
    }
  }

  function initApologies() {
    apologyIdx = Math.floor(Math.random() * APOLOGY_STATEMENTS.length);
    apologyText = APOLOGY_STATEMENTS[apologyIdx];
    const el = document.getElementById('apologyQuote');
    if (el) el.textContent = apologyText;

    setInterval(updateApology, 30000);

    const copyBtn = document.getElementById('apologyCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const text = apologyText + '\n— The AI Industry, collectively\n\n\u2192 ' + SITE_URL;
        copyToClipboard(copyBtn, text, '\uD83D\uDCCB Copy &amp; Send to Your AI Vendor');
      });
    }

    const nextBtn = document.getElementById('apologyNextBtn');
    if (nextBtn) nextBtn.addEventListener('click', updateApology);
  }

  // ── PRD 3: Wanted Poster (modifies updateCalcResults) ────────
  // Overrides the output of the calculator section — handled in-place below.

  // ── PRD 4: Your Tab (Running) strip ──────────────────────────

  function updateSessionTabStrip() {
    const now     = Date.now();
    const elapsed = Math.max(1, (now - pageLoadTime) / 1000);
    const rate    = getRateAtDate(new Date(now));
    const tokens  = elapsed * rate;
    const impact  = calculateEnvironmentalImpact(tokens);

    // Cups of coffee (200 mL per cup, water use)
    const coffees = Math.max(0, impact.waterL / 0.2);
    // Trees needed for a year
    const trees = Math.max(0, impact.treesEquivalent);
    // Smartphone charges (0.015 kWh per charge)
    const charges = Math.max(0, impact.kWh / 0.015);
    // Metres driven (171 g CO2/km = 0.000171 kg/m)
    const metres = Math.max(0, impact.co2Kg / 0.000171);

    function fmtSmall(n) {
      if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      if (n >= 10)  return Math.round(n).toLocaleString();
      if (n >= 1)   return n.toFixed(1);
      if (n >= 0.01) return n.toFixed(3);
      return '< 0.01';
    }

    const waterEl   = document.getElementById('stiWater');
    const treesEl   = document.getElementById('stiTrees');
    const chargeEl  = document.getElementById('stiCharges');
    const metresEl  = document.getElementById('stiMetres');

    if (waterEl)  waterEl.textContent  = fmtSmall(coffees);
    if (treesEl)  treesEl.textContent  = fmtSmall(trees);
    if (chargeEl) chargeEl.textContent = fmtSmall(charges);
    if (metresEl) metresEl.textContent = fmtSmall(metres);
  }

  function initSessionTabStrip() {
    updateSessionTabStrip();
    setInterval(updateSessionTabStrip, 1000);
  }

  // ── PRD 5: Prompt Hall of Shame ──────────────────────────────

  const SHAME_PROMPTS = [
    { tokens: 3500, icon: '🌍', text: 'Write me a 5,000-word essay about why AI is bad for the environment' },
    { tokens: 200,  icon: '✉️', text: 'Rewrite this 3-word email in a professional tone' },
    { tokens: 1500, icon: '📊', text: 'Generate 40 variations of the word "synergy" for my deck' },
    { tokens: 800,  icon: '🔗', text: 'Explain blockchain to my mum (14th attempt)' },
    { tokens: 2500, icon: '♻️', text: 'Help me write a sustainability report for our AI company' },
    { tokens: 300,  icon: '💼', text: 'Make this 4-word subject line more "impactful"' },
    { tokens: 1200, icon: '📱', text: 'Turn my grocery list into a LinkedIn thought leadership post' },
    { tokens: 600,  icon: '😤', text: 'Write a passive-aggressive "thanks for your feedback" reply' },
    { tokens: 3000, icon: '📄', text: 'Summarise this 2-page document I have not read' },
    { tokens: 400,  icon: '🐔', text: 'Explain the philosophical implications of a chicken crossing a road' },
    { tokens: 250,  icon: '🌮', text: 'Is a hot dog a sandwich? 2,000 words. Both sides.' },
    { tokens: 100,  icon: '🦀', text: 'Hello world in Rust (variation #47)' },
    { tokens: 700,  icon: '😺', text: 'Describe this cat picture in 600 words' },
    { tokens: 900,  icon: '🧘', text: 'Motivational speech about the importance of not using AI so much' },
    { tokens: 1800, icon: '📜', text: 'Generate terms of service for my AI startup (that no one will read)' },
    { tokens: 450,  icon: '🌅', text: 'Write a haiku about productivity, but make it really long' },
    { tokens: 1100, icon: '🤖', text: 'Ask the AI if it is conscious (session 1 of 200)' },
    { tokens: 650,  icon: '🍕', text: 'Add cheese to this recipe that should not have cheese' },
    { tokens: 2200, icon: '💰', text: 'Explain why my AI startup is worth $2 billion' },
    { tokens: 380,  icon: '📣', text: 'Rewrite this tweet so it sounds spontaneous' },
  ];

  let shameAutoIdx = 0;

  function shameEnergyCost(tokens) {
    const kWh  = (tokens / 1000) * 0.0003;
    const co2g = (kWh * 0.4 * 1000).toFixed(1);
    return '~' + (kWh < 0.001 ? kWh.toFixed(5) : kWh.toFixed(4)) + ' kWh \u2022 ' + co2g + ' g CO\u2082';
  }

  function appendShameEntry(promptObj, isUserSubmitted) {
    const feed = document.getElementById('shameFeed');
    if (!feed) return;

    const entry = document.createElement('div');
    entry.className = 'shame-entry' + (isUserSubmitted ? ' user-submitted' : '');

    const icon = document.createElement('span');
    icon.className = 'shame-entry-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = isUserSubmitted ? '👤' : promptObj.icon;

    const content = document.createElement('div');
    content.className = 'shame-entry-content';

    const textSpan = document.createElement('div');
    textSpan.className = 'shame-entry-text';
    textSpan.textContent = '\u201C' + promptObj.text + '\u201D';

    const costSpan = document.createElement('div');
    costSpan.className = 'shame-entry-cost';
    costSpan.textContent = shameEnergyCost(promptObj.tokens);

    content.appendChild(textSpan);
    content.appendChild(costSpan);

    if (isUserSubmitted) {
      const tag = document.createElement('div');
      tag.className = 'shame-entry-user-tag';
      tag.textContent = '\u2B06 Submitted by you';
      content.appendChild(tag);
    }

    entry.appendChild(icon);
    entry.appendChild(content);

    // Prepend (newest at top)
    feed.insertBefore(entry, feed.firstChild);

    // Cap at 15 entries
    while (feed.children.length > 15) {
      feed.removeChild(feed.lastChild);
    }
  }

  function initShame() {
    // Seed with 5 initial entries
    const seed = [...SHAME_PROMPTS].sort(() => 0.5 - Math.random()).slice(0, 5);
    seed.forEach((p) => appendShameEntry(p, false));

    // Auto-add a new one every 7 seconds
    setInterval(() => {
      shameAutoIdx = (shameAutoIdx + 1) % SHAME_PROMPTS.length;
      appendShameEntry(SHAME_PROMPTS[shameAutoIdx], false);
    }, 7000);

    // Submit button
    const submitBtn = document.getElementById('shameSubmitBtn');
    const input     = document.getElementById('shameInput');
    if (submitBtn && input) {
      function doSubmit() {
        const raw = input.value.trim();
        if (!raw) return;
        // Sanitise user input — textContent assignment handles escaping below
        const randomTokens = 200 + Math.floor(Math.random() * 3000);
        const userPrompt = { tokens: randomTokens, icon: '👤', text: raw };
        appendShameEntry(userPrompt, true);
        input.value = '';
        awardBadge('spreading_doom');
      }
      submitBtn.addEventListener('click', doSubmit);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSubmit(); });
    }
  }

  // ── PRD 6: Villain Arc Leaderboard ───────────────────────────

  const VILLAIN_FAKE_LEADERBOARD = [
    { name: 'Elon M.',   dp: 847_293_847, note: 'Inference is just efficiency' },
    { name: 'Sam A.',    dp: 294_847_203, note: 'Negligible at scale' },
    { name: 'Jensen H.', dp: 184_293_840, note: 'GPU go brrr' },
    { name: 'Marc B.',   dp:  93_847_203, note: 'The metaverse needed training data' },
    { name: 'Sundar P.', dp:  48_293_040, note: 'AI for good (primarily)' },
  ];

  const VILLAIN_RANK_TITLES = [
    { min: 0,         title: 'Innocent Bystander' },
    { min: 10,        title: 'Accidental Accomplice' },
    { min: 100,       title: 'Carbon Enabler' },
    { min: 1_000,     title: 'Climate Criminal' },
    { min: 10_000,    title: 'Carbon Baron' },
    { min: 100_000,   title: 'The Accelerationist' },
    { min: 1_000_000, title: 'Extinction Level Event' },
  ];

  let villainCongratsShown = false;

  function getVillainRankTitle(dp) {
    let title = VILLAIN_RANK_TITLES[0].title;
    for (const tier of VILLAIN_RANK_TITLES) {
      if (dp >= tier.min) title = tier.title;
    }
    return title;
  }

  function updateVillainLeaderboard() {
    const userDp    = acc.doomPoints;
    const userBest  = acc.bestScore > 0 ? acc.bestScore * (1 / 1_000_000) : 0;
    const userTitle = getVillainRankTitle(userDp);

    // Update rank banner
    const rankTitleEl = document.getElementById('villainRankTitle');
    const rankScoreEl = document.getElementById('villainRankScore');
    if (rankTitleEl) rankTitleEl.textContent = userTitle;
    if (rankScoreEl) rankScoreEl.textContent = formatDoomPoints(userDp) + ' this session';

    // Build leaderboard rows (insert user at correct position)
    const tbody = document.getElementById('villainTableBody');
    if (!tbody) return;

    const entries = [
      ...VILLAIN_FAKE_LEADERBOARD.map((e) => ({ ...e, isUser: false })),
      { name: 'You', dp: userDp, note: userTitle, isUser: true },
    ].sort((a, b) => b.dp - a.dp);

    tbody.innerHTML = '';
    entries.forEach((entry, idx) => {
      const tr = document.createElement('tr');
      if (entry.isUser) tr.className = 'villain-row-you';
      tr.innerHTML =
        '<td class="villain-pos">' + (idx + 1) + '</td>' +
        '<td class="villain-name">' + escHtml(entry.name) + (entry.isUser ? ' 👈' : '') + '</td>' +
        '<td class="villain-score">' + (entry.dp >= 1_000_000
          ? (entry.dp / 1_000_000).toFixed(1) + 'M DP'
          : entry.dp >= 1000
          ? (entry.dp / 1000).toFixed(1) + 'K DP'
          : Math.round(entry.dp) + ' DP') + '</td>' +
        '<td class="villain-rank-cell">' + escHtml(entry.note) + '</td>';
      tbody.appendChild(tr);
    });

    // Congratulations if user has broken into the top position ahead of a fake entry
    if (!villainCongratsShown && userDp > VILLAIN_FAKE_LEADERBOARD[4].dp) {
      villainCongratsShown = true;
      const congrats = document.getElementById('villainCongrats');
      if (congrats) {
        congrats.hidden = false;
        setTimeout(() => { congrats.hidden = true; }, 5000);
      }
    }
  }

  function initVillainLeaderboard() {
    updateVillainLeaderboard();
  }

  // ── PRD 7: The Intervention ───────────────────────────────────

  let interventionFired = false;

  function showIntervention() {
    if (interventionFired) return;
    if (sessionStorage.getItem('interventionSeen')) return;
    interventionFired = true;

    const modal = document.getElementById('intervention-modal');
    if (!modal) return;

    const elapsed = Math.floor((Date.now() - pageLoadTime) / 1000);
    const rate    = getRateAtDate(new Date());
    const sessionTokens = Math.max(1, elapsed * rate);
    const impact  = calculateEnvironmentalImpact(sessionTokens);
    const co2g    = (impact.co2Kg * 1000).toFixed(1);

    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const timeStr = m > 0 ? `${m} min ${s} sec` : `${s} seconds`;

    const msgEl = document.getElementById('intervention-msg');
    if (msgEl) {
      msgEl.textContent =
        `You\u2019ve been here for ${timeStr}. In that time, AI emitted ` +
        `${co2g}\u202Fg of CO\u2082 globally. Just so you know.`;
    }

    modal.hidden = false;
    const stayBtn = document.getElementById('intervention-stay');
    if (stayBtn) stayBtn.focus();
  }

  function initIntervention() {
    if (sessionStorage.getItem('interventionSeen')) return;

    document.addEventListener('mouseleave', (e) => {
      if (e.clientY <= 0 && !interventionFired) {
        showIntervention();
      }
    });

    const modal = document.getElementById('intervention-modal');
    if (!modal) return;

    const stayBtn = document.getElementById('intervention-stay');
    if (stayBtn) {
      stayBtn.addEventListener('click', () => { modal.hidden = true; });
    }

    const leaveBtn = document.getElementById('intervention-leave');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => {
        sessionStorage.setItem('interventionSeen', '1');
        modal.hidden = true;
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        sessionStorage.setItem('interventionSeen', '1');
        modal.hidden = true;
      }
    });
  }

  // ============================================================
  // FEATURE: "Wait for It" — Milestone Countdown Alert
  // ============================================================

  const MILESTONE_ALERT_THRESHOLD_SECS = 120;
  const milestoneAlertShown = new Set(); // ids of milestones already flashed this session

  function checkMilestoneAlert() {
    const tokens = getCurrentTokens();
    const next   = getNextMilestone(tokens, MILESTONES);
    const bannerEl   = document.getElementById('milestone-alert-banner');
    const msgEl      = document.getElementById('milestone-alert-msg');
    const countEl    = document.getElementById('milestone-alert-countdown');
    const iconEl     = document.getElementById('milestone-alert-icon');

    if (!bannerEl) return;

    if (!next) {
      if (!bannerEl.hidden) bannerEl.hidden = true;
      return;
    }

    const secsToNext = (next.tokens - tokens) / TOKENS_PER_SECOND;

    if (secsToNext > MILESTONE_ALERT_THRESHOLD_SECS) {
      if (!bannerEl.hidden) bannerEl.hidden = true;
      return;
    }

    if (secsToNext <= 0) {
      // Milestone just crossed — fire flash once per milestone
      if (!milestoneAlertShown.has(next.id)) {
        milestoneAlertShown.add(next.id);
        bannerEl.hidden = true;
        showMilestoneFlash(next);
        awardBadge('witness');
      }
      return;
    }

    // Within alert window — show / update the banner
    bannerEl.hidden = false;
    if (iconEl) iconEl.textContent = next.icon;
    if (msgEl) {
      msgEl.textContent =
        '\u26A0\uFE0F ' + next.name + ' threshold crossing imminent \u2014 stay to witness it!';
    }
    if (countEl) {
      const s = Math.ceil(secsToNext);
      if (s < 60) {
        countEl.textContent = s + 's';
      } else {
        const mins = Math.floor(s / 60);
        const secs = String(s % 60).padStart(2, '0');
        countEl.textContent = `${mins}m\u00A0${secs}s`;
      }
    }
  }

  function showMilestoneFlash(milestone) {
    const overlay  = document.getElementById('milestone-flash-overlay');
    const nameEl   = document.getElementById('milestone-flash-name');
    const iconEl   = document.getElementById('milestone-flash-icon');
    const descEl   = document.getElementById('milestone-flash-desc');
    const closeBtn = document.getElementById('milestone-flash-close');
    if (!overlay) return;

    if (nameEl) nameEl.textContent = milestone.name;
    if (iconEl) iconEl.textContent = milestone.icon;
    if (descEl) descEl.textContent = `${milestone.shortDesc} \u2014 ${milestone.description}`;

    overlay.hidden = false;
    if (closeBtn) {
      closeBtn.focus();
      closeBtn.onclick = () => { overlay.hidden = true; };
    }

    // Haptic feedback where supported
    if (typeof navigator.vibrate === 'function') navigator.vibrate([200, 100, 200]);

    // Auto-dismiss after 6 seconds
    setTimeout(() => { overlay.hidden = true; }, 6000);
  }

  // ---- Tab navigation ------------------------------------
  function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn[data-tab]');
    const VALID_TABS = new Set(
      Array.from(tabBtns).map((btn) => btn.dataset.tab)
    );

    // Build sectionId → tabName map so direct section deep-links work.
    const sectionToTab = {};
    document.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
      const tabName = panel.id.replace(/^tab-/, '');
      panel.querySelectorAll('[id]').forEach((el) => {
        sectionToTab[el.id] = tabName;
      });
    });

    function switchTab(targetTab, updateHash = true) {
      if (!VALID_TABS.has(targetTab)) return;
      tabBtns.forEach((btn) => {
        const isActive = btn.dataset.tab === targetTab;
        btn.classList.toggle('tab-btn--active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
      });
      document.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
        panel.hidden = panel.id !== 'tab-' + targetTab;
      });
      if (updateHash) {
        history.pushState(null, '', '#' + targetTab);
      }
    }

    function applyHash(smooth) {
      const hash = location.hash.slice(1);
      if (!hash) return;
      if (VALID_TABS.has(hash)) {
        switchTab(hash, false);
      } else if (sectionToTab[hash]) {
        switchTab(sectionToTab[hash], false);
        requestAnimationFrame(() => {
          const el = document.getElementById(hash);
          if (el) el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
        });
      }
    }

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Inline "Dashboard" link inside the About tab
    document.querySelectorAll('.about-inline-tab-link[data-switch-tab]').forEach((link) => {
      link.addEventListener('click', () => switchTab(link.dataset.switchTab));
    });

    window.addEventListener('hashchange', () => applyHash(true));

    // Apply initial hash on page load without smooth-scroll
    applyHash(false);
  }

  // ---- Bootstrap ------------------------------------------
  function init() {
    // Restore persisted theme preference before rendering anything
    try {
      const savedTheme = localStorage.getItem(LS_THEME_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') applyTheme(savedTheme);
    } catch (_) { /* ignore */ }

    // Theme toggle
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);

    // Hide completed milestones toggle
    const hideCompletedCb = document.getElementById('hideCompletedMilestones');
    if (hideCompletedCb) {
      hideCompletedCb.addEventListener('change', function () {
        const grid = document.getElementById('milestonesGrid');
        if (grid) grid.classList.toggle('hide-completed', this.checked);
      });
    }
    // Tab navigation
    initTabs();

    // Render static sections once
    renderMilestones();
    renderPredictionsTable();
    renderTips();
    renderChangelog();
    renderFooterStats();

    // Chart init is isolated so a missing date-adapter or other chart error
    // cannot prevent the counters and life-blocks from running.
    try {
      initChart();
    } catch (err) {
      console.error('Chart init failed:', err);
    }

    initLifeBlocks();

    // Fun features
    initBadges();
    initTicker();
    initEquivalences();
    initSharePanel();
    initFooterShare();
    initReceiptModal();
    initCalculator();
    initAccelerator();
    // Engagement features
    initPresenceStrip();
    initEventLog();
    // Scary & satirical features (PRDs 1–7)
    initDoomsdayClock();
    initSessionTabStrip();
    initApologies();
    initShame();
    initVillainLeaderboard();
    initIntervention();

    // Persist accelerator game state every 30 seconds and on page hide
    setInterval(saveAcceleratorState, 30000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveAcceleratorState();
    });

    // Kick off the live counter RAF loop
    requestAnimationFrame(updateCounters);

    // Check time-based badges and milestone alert every second
    setInterval(() => {
      checkTimeBadges();
      checkMilestoneAlert();
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
