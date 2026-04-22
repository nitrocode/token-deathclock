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
    generateEquivalences,
    calculatePersonalFootprint,
    sessionEquivalences,
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
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    if (newTheme === 'light') awardBadge('optimist');
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

  // ============================================================
  // FUN FEATURES
  // ============================================================

  const SITE_URL = 'https://nitrocode.github.io/token-deathclock/';

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

  function openSharePopup(text) {
    const url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer,width=560,height=420');
  }

  function initSharePanel() {
    const panel   = document.getElementById('share-doom-panel');
    const options = document.getElementById('share-doom-options');
    if (!panel) return;

    // Show after 10 seconds
    setTimeout(() => { if (panel) panel.hidden = false; }, 10000);

    const mainBtn = document.getElementById('shareDoomBtn');
    if (mainBtn) {
      mainBtn.addEventListener('click', () => {
        if (options) options.hidden = !options.hidden;
      });
    }

    const twitterBtn = document.getElementById('shareTwitterBtn');
    if (twitterBtn) {
      twitterBtn.addEventListener('click', () => {
        openSharePopup(buildShareText());
        awardBadge('spreading_doom');
        if (options) options.hidden = true;
      });
    }

    const redditBtn = document.getElementById('shareRedditBtn');
    if (redditBtn) {
      redditBtn.addEventListener('click', () => {
        const title = 'I watched AI consume millions of tokens in real time — the numbers are terrifying';
        const url = 'https://www.reddit.com/submit?url=' +
          encodeURIComponent(SITE_URL) + '&title=' + encodeURIComponent(title);
        window.open(url, '_blank', 'noopener,noreferrer');
        awardBadge('spreading_doom');
        if (options) options.hidden = true;
      });
    }

    const copyBtn = document.getElementById('shareCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(buildShareText()).then(() => {
          copyBtn.textContent = '✅ Copied!';
          setTimeout(() => { copyBtn.textContent = '📋 Copy text'; }, 2000);
        }).catch(() => {
          copyBtn.textContent = '❌ Failed';
          setTimeout(() => { copyBtn.textContent = '📋 Copy text'; }, 2000);
        });
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
          setTimeout(() => { copyBtn.textContent = '📋 Copy Text'; }, 2000);
        }).catch(() => {
          copyBtn.textContent = '❌ Failed';
          setTimeout(() => { copyBtn.textContent = '📋 Copy Text'; }, 2000);
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

    // Offer receipt on beforeunload if session was meaningful
    window.addEventListener('beforeunload', (e) => {
      const elapsed = Math.floor((Date.now() - pageLoadTime) / 1000);
      if (elapsed >= 15 && !receiptShown) {
        showReceiptModal();
        e.preventDefault();
        e.returnValue = '';
      }
    });
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

    const results = document.getElementById('calc-results');
    if (!results) return;

    results.innerHTML = `
      <div class="calc-result-grid">
        <div class="calc-result-box">
          <div class="crb-label">Weekly Tokens</div>
          <div class="crb-value">${escHtml(formatTokenCount(fp.weeklyTokens))}</div>
        </div>
        <div class="calc-result-box">
          <div class="crb-label">Weekly CO\u2082</div>
          <div class="crb-value">${escHtml(co2g)} g</div>
        </div>
        <div class="calc-result-box">
          <div class="crb-label">Weekly Water</div>
          <div class="crb-value">${escHtml(String(waterMlW))} mL</div>
        </div>
        <div class="calc-result-box">
          <div class="crb-label">Annual CO\u2082</div>
          <div class="crb-value">${escHtml(String(co2gA))} g</div>
          <div class="crb-sub">\u2248 driving ${escHtml(kmDriven)} km</div>
        </div>
        <div class="calc-result-box global">
          <div class="crb-label">Scale to 500M users \u2192 weekly</div>
          <div class="crb-value">${escHtml(globalT)} tonnes CO\u2082</div>
          <div class="crb-sub">\u2248 ${escHtml(globalCars)} cars driven for a week</div>
        </div>
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

    // Fun features
    initBadges();
    initTicker();
    initEquivalences();
    initSharePanel();
    initReceiptModal();
    initCalculator();

    // Kick off the live counter RAF loop
    requestAnimationFrame(updateCounters);

    // Check time-based badges every second
    setInterval(checkTimeBadges, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
