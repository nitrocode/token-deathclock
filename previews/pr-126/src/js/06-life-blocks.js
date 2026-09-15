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

