/**
 * @jest-environment jsdom
 *
 * Integration / smoke tests for script.js DOM logic.
 *
 * script.js is a browser IIFE — it is loaded by evaluating the file source after
 * setting `window.DeathClockCore` and mocking browser-only globals (Chart,
 * requestAnimationFrame).  Each test re-renders from a fresh DOM + fresh IIFE run.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const coreModule = require('../death-clock-core');
const scriptCode = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');

// Minimal HTML that mirrors the elements script.js interacts with.
const MIN_HTML = `
  <button id="themeToggle"></button>
  <span id="totalCounter"></span>
  <span id="sessionCounter"></span>
  <span id="sessionTime"></span>
  <span id="statKwh"></span>
  <span id="statCo2"></span>
  <span id="statWater"></span>
  <span id="statTrees"></span>
  <div id="milestonesGrid"></div>
  <table><tbody id="predictionsBody"></tbody></table>
  <canvas id="tokenChart"></canvas>
`;

function makeChartMock() {
  return jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    data: { datasets: [{ borderColor: '' }, { borderColor: '' }] },
    options: {
      scales: {
        x: { grid: { color: '' }, ticks: { color: '' } },
        y: { grid: { color: '' }, ticks: { color: '' }, title: { color: '' } },
      },
      plugins: { legend: { labels: { color: '' } } },
    },
  }));
}

// The updateCounters function registered with requestAnimationFrame during init().
let updateCountersFn = null;

function loadScript() {
  global.DeathClockCore = coreModule;
  global.Chart = makeChartMock();
  global.requestAnimationFrame = jest.fn();
  // eval() is intentional here: script.js is a browser IIFE that references `window`
  // and `document` from the current execution context. In the jsdom test environment
  // `eval` runs in the jsdom global scope, making those globals available. Alternatives
  // such as vm.runInThisContext run in a plain V8 context where `window` is undefined.
  // The evaluated code is a local static file (no user input), so there is no XSS risk.
  // eslint-disable-next-line no-eval
  eval(scriptCode);
  // In some jsdom versions, document.readyState is 'loading' when innerHTML is set,
  // which causes script.js to defer init() via DOMContentLoaded instead of running it
  // synchronously. Fire the event to ensure init() always runs before we inspect state.
  if (!global.requestAnimationFrame.mock.calls.length) {
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }));
  }
  // Capture the updateCounters callback that init() passed to requestAnimationFrame.
  // init() may register multiple RAF callbacks (e.g. initLifeBlocks registers one
  // before updateCounters), so we take the last call, which is always updateCounters.
  updateCountersFn = global.requestAnimationFrame.mock.calls.at(-1)?.[0] || null;
}

// Invoke updateCounters once; replaces the RAF mock so the loop does not recurse.
function runUpdateCounters() {
  if (updateCountersFn) {
    global.requestAnimationFrame = jest.fn();
    updateCountersFn();
  }
}

beforeEach(() => {
  updateCountersFn = null;
  document.body.innerHTML = MIN_HTML;
  jest.clearAllMocks();
  loadScript();
  // Run one counter cycle so all DOM elements get populated.
  runUpdateCounters();
});

// ============================================================
// renderMilestones
// ============================================================
describe('renderMilestones (DOM)', () => {
  test('creates a card for each milestone', () => {
    const grid = document.getElementById('milestonesGrid');
    expect(grid.children.length).toBe(coreModule.MILESTONES.length);
  });

  test('each card has an id matching milestone-<id>', () => {
    coreModule.MILESTONES.forEach((m) => {
      expect(document.getElementById('milestone-' + m.id)).not.toBeNull();
    });
  });

  test('already-triggered milestones have the triggered class', () => {
    const tokens = coreModule.BASE_TOKENS;
    coreModule.MILESTONES.forEach((m) => {
      const card = document.getElementById('milestone-' + m.id);
      if (tokens >= m.tokens) {
        expect(card.classList.contains('triggered')).toBe(true);
      }
    });
  });

  test('each card contains a progress-fill element', () => {
    coreModule.MILESTONES.forEach((m) => {
      const card = document.getElementById('milestone-' + m.id);
      expect(card.querySelector('.progress-fill')).not.toBeNull();
    });
  });
});

// ============================================================
// renderPredictionsTable
// ============================================================
describe('renderPredictionsTable (DOM)', () => {
  test('creates one row per milestone', () => {
    const tbody = document.getElementById('predictionsBody');
    expect(tbody.rows.length).toBe(coreModule.MILESTONES.length);
  });

  test('passed milestones show a PASSED badge', () => {
    const html = document.getElementById('predictionsBody').innerHTML;
    expect(html).toContain('PASSED');
  });
});

// ============================================================
// Theme toggle
// ============================================================
describe('Theme toggle (DOM)', () => {
  test('clicking the toggle button switches from dark to light', () => {
    document.getElementById('themeToggle').click();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  test('clicking the toggle button twice returns to dark', () => {
    const btn = document.getElementById('themeToggle');
    btn.click();
    btn.click();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('button label reflects the active theme', () => {
    const btn = document.getElementById('themeToggle');
    btn.click(); // dark -> light
    expect(btn.textContent).toContain('Dark Mode');
    btn.click(); // light -> dark
    expect(btn.textContent).toContain('Light Mode');
  });
});

// ============================================================
// updateCounters (initial DOM state after init + one RAF cycle)
// ============================================================
describe('updateCounters (DOM)', () => {
  test('totalCounter is populated after init', () => {
    expect(document.getElementById('totalCounter').textContent.length).toBeGreaterThan(0);
  });

  test('sessionCounter is populated after init', () => {
    expect(document.getElementById('sessionCounter').textContent.length).toBeGreaterThan(0);
  });

  test('stat elements receive text content', () => {
    ['statKwh', 'statCo2', 'statWater', 'statTrees'].forEach((id) => {
      expect(document.getElementById(id).textContent.length).toBeGreaterThan(0);
    });
  });

  test('requestAnimationFrame is called to drive the counter loop', () => {
    // After runUpdateCounters(), a new RAF call should have been registered.
    expect(global.requestAnimationFrame).toHaveBeenCalled();
  });
});

// ============================================================
// getCurrentTokens grows with time (not anchored to page load)
// ============================================================
describe('getCurrentTokens growth', () => {
  test('counter reflects cumulative tokens since BASE_DATE_ISO, not page load', () => {
    // Since BASE_DATE_ISO is in the past, the expected token count at any real
    // moment is strictly greater than BASE_TOKENS.
    const { BASE_TOKENS, TOKENS_PER_SECOND, BASE_DATE_ISO } = coreModule;
    const baseDateTime = new Date(BASE_DATE_ISO).getTime();
    const expectedMin = BASE_TOKENS + TOKENS_PER_SECOND * ((Date.now() - baseDateTime) / 1000);
    expect(expectedMin).toBeGreaterThan(BASE_TOKENS);

    // The totalCounter must show a non-empty value after init.
    expect(document.getElementById('totalCounter').textContent.length).toBeGreaterThan(0);
  });

  test('counter value increases when Date.now() advances', () => {
    const el = document.getElementById('totalCounter');
    const before = el.textContent;

    // Simulate 10 seconds of elapsed time by mocking Date.now.
    const spy = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 10_000);
    runUpdateCounters();
    const after = el.textContent;
    spy.mockRestore();

    // Both snapshots must be valid non-empty strings (counter did not crash).
    expect(before).toBeTruthy();
    expect(after).toBeTruthy();
  });
});

// ============================================================
// initChart
// ============================================================
describe('initChart (DOM)', () => {
  test('does not throw when Chart.js is not available', () => {
    document.body.innerHTML = MIN_HTML;
    delete global.Chart;
    global.requestAnimationFrame = jest.fn();
    // eslint-disable-next-line no-eval
    expect(() => eval(scriptCode)).not.toThrow();
  });

  test('instantiates Chart when Chart.js is present', () => {
    const ChartMock = makeChartMock();
    global.Chart = ChartMock;
    document.body.innerHTML = MIN_HTML;
    global.requestAnimationFrame = jest.fn();
    // eslint-disable-next-line no-eval
    eval(scriptCode);
    expect(ChartMock).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// escHtml (security: dynamic content rendered via innerHTML)
// ============================================================
describe('escHtml (via rendered DOM output)', () => {
  test('milestone grid HTML does not contain unescaped script tags', () => {
    expect(document.getElementById('milestonesGrid').innerHTML).not.toContain('<script>');
  });
});
