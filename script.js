/* global Chart, DeathClockCore */
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
  } = window.DeathClockCore;

  // ---- State -----------------------------------------------
  const BASE_DATE_MS = new Date(BASE_DATE_ISO).getTime();
  const pageLoadTime = Date.now();
  let currentTheme = 'dark';
  let chartInstance = null;

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
    if (btn) btn.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    currentTheme = theme;
    if (chartInstance) updateChartColors();
  }

  function toggleTheme() {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }

  // ---- Counter updater -------------------------------------
  function updateCounters() {
    const now = Date.now();
    const tokens = getCurrentTokens();
    const currentRate = getRateAtDate(new Date(now));
    const sessionTokens = Math.round((now - pageLoadTime) / 1000 * currentRate);
    const elapsed = Math.floor((now - pageLoadTime) / 1000);

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
      sessionTimeEl.textContent = m > 0 ? `${m}m ${s}s on page` : `${s}s on page`;
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

    // Update milestone progress bars
    const triggered = getTriggeredMilestones(tokens, MILESTONES);
    MILESTONES.forEach((m, idx) => {
      const card = document.getElementById('milestone-' + m.id);
      if (!card) return;
      const wasTriggered = card.classList.contains('triggered');
      const isTriggered = tokens >= m.tokens;

      if (isTriggered && !wasTriggered) {
        card.classList.add('triggered');
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
        ${prediction ? `<div class="milestone-predict">⏱ Predicted: ${escHtml(formatDate(prediction))}</div>` : ''}
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
    const projection = generateProjectionData(tokens, TOKENS_PER_SECOND, 18).map((d) => ({
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
            time: { unit: 'month', tooltipFormat: 'MMM yyyy', displayFormats: { month: 'MMM yy' } },
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
  const LB_LAST_MILESTONE = MILESTONES[MILESTONES.length - 1];

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
  }

  // ---- Bootstrap ------------------------------------------
  function init() {
    // Theme toggle
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);

    // Render static sections once
    renderMilestones();
    renderPredictionsTable();

    // Chart init is isolated so a missing date-adapter or other chart error
    // cannot prevent the counters and life-blocks from running.
    try {
      initChart();
    } catch (err) {
      console.error('Chart init failed:', err);
    }

    initLifeBlocks();

    // Kick off the live counter RAF loop
    requestAnimationFrame(updateCounters);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
