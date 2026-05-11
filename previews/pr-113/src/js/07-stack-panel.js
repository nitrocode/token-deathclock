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

