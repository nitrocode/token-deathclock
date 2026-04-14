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
    HISTORICAL_DATA,
    MILESTONES,
    PROMPT_SCORING,
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
    computePromptScore,
  } = window.DeathClockCore;

  // ---- State -----------------------------------------------
  const pageLoadTime = Date.now();
  let currentTheme = 'dark';
  let chartInstance = null;

  // ---- Helpers ---------------------------------------------
  function getCurrentTokens() {
    const elapsed = (Date.now() - pageLoadTime) / 1000;
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
    const tokens = getCurrentTokens();
    const sessionTokens = Math.round((Date.now() - pageLoadTime) / 1000 * TOKENS_PER_SECOND);
    const elapsed = Math.floor((Date.now() - pageLoadTime) / 1000);

    const totalEl = document.getElementById('totalCounter');
    const sessionEl = document.getElementById('sessionCounter');
    const sessionTimeEl = document.getElementById('sessionTime');

    if (totalEl) totalEl.textContent = numFmt(tokens);
    if (sessionEl) sessionEl.textContent = formatTokenCount(sessionTokens);
    if (sessionTimeEl) {
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      sessionTimeEl.textContent = m > 0 ? `${m}m ${s}s on page` : `${s}s on page`;
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

  // ---- Prompt scoring section ------------------------------
  function renderScoring() {
    const container = document.getElementById('scoring-content');
    if (!container) return;

    const { totalInitial, totalFinal, maxScore } = computePromptScore(PROMPT_SCORING);

    let html = `
      <div class="score-summary">
        <div class="score-badge">
          <div class="badge-score">${totalInitial}/${maxScore}</div>
          <div class="badge-label">Prompt Score (initial)</div>
        </div>
        <div class="score-badge final">
          <div class="badge-score">${totalFinal}/${maxScore}</div>
          <div class="badge-label">After Addressing Recommendations</div>
        </div>
      </div>
      <div class="scoring-categories">
    `;

    PROMPT_SCORING.categories.forEach((cat) => {
      const bonus = cat.recommendations
        .filter((r) => r.implemented)
        .reduce((acc, r) => acc + (parseInt(r.impact, 10) || 0), 0);

      html += `
        <div class="scoring-cat">
          <div class="scoring-cat-header">
            <span class="scoring-cat-name">${escHtml(cat.name)}</span>
            <span class="scoring-cat-score">${cat.initial}${bonus ? '+' + bonus : ''}/${cat.max}</span>
          </div>
          <p class="scoring-cat-notes">${escHtml(cat.notes)}</p>
          ${cat.recommendations.length ? '<ul class="rec-list">' + cat.recommendations.map((r) => `
            <li class="rec-item ${r.implemented ? 'done' : ''}">
              <span>${r.implemented ? '✅' : '⬜'}</span>
              <span>${escHtml(r.text)}</span>
              <span class="rec-impact">${escHtml(r.impact)} pts</span>
            </li>
          `).join('') + '</ul>' : ''}
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  // ---- Collapsible scoring ---------------------------------
  function initScoringToggle() {
    const btn = document.getElementById('scoringToggle');
    const content = document.getElementById('scoring-content');
    if (!btn || !content) return;
    btn.addEventListener('click', () => {
      const open = content.classList.toggle('open');
      btn.textContent = (open ? '▼ Hide' : '▶ Show') + ' Scoring Details';
      btn.setAttribute('aria-expanded', String(open));
    });
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

  // ---- Bootstrap ------------------------------------------
  function init() {
    // Theme toggle
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);

    // Render static sections once
    renderMilestones();
    renderPredictionsTable();
    renderScoring();
    initScoringToggle();
    initChart();

    // Kick off the live counter RAF loop
    requestAnimationFrame(updateCounters);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
