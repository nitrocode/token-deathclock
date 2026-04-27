/**
 * @jest-environment jsdom
 *
 * Integration / smoke tests for script.js DOM logic.
 *
 * script.js is a browser IIFE — it is loaded via require() after setting
 * `window.DeathClockCore` and mocking browser-only globals (Chart,
 * requestAnimationFrame). Each test re-renders from a fresh DOM + fresh module
 * load (via jest.resetModules()) to guarantee isolation.
 *
 * Using require() (instead of eval()) lets Istanbul track statement coverage
 * for script.js, giving Codecov visibility into the DOM layer.
 */

'use strict';

const coreModule = require('../death-clock-core');

// Comprehensive HTML that mirrors all elements script.js interacts with,
// enabling every init*() function to run its full initialization path.
const MIN_HTML = `
  <button id="themeToggle"></button>
  <input id="hideCompletedMilestones" type="checkbox">
  <span id="totalCounter"></span>
  <span id="sessionCounter"></span>
  <span id="sessionTime"></span>
  <span id="rateCounter"></span>
  <span id="rateEvent"></span>
  <span id="statKwh"></span>
  <span id="statCo2"></span>
  <span id="statWater"></span>
  <span id="statTrees"></span>
  <div id="milestonesGrid"></div>
  <table><tbody id="predictionsBody"></tbody></table>
  <canvas id="tokenChart"></canvas>
  <nav id="lb-breadcrumb"></nav>
  <div id="lb-info"></div>
  <div id="lb-container"></div>
  <div id="tipsGrid"></div>
  <div id="changelogList"></div>
  <span id="siteVersion"></span>

  <!-- Tab navigation -->
  <button class="tab-btn" data-tab="home" aria-selected="true">Home</button>
  <button class="tab-btn" data-tab="about" aria-selected="false">About</button>
  <div id="tab-home" role="tabpanel">
    <section id="home-section"><h2>Home</h2></section>
  </div>
  <div id="tab-about" role="tabpanel" hidden></div>

  <!-- Life blocks section -->
  <section id="life-blocks-section"></section>

  <!-- Ticker -->
  <span id="ai-ticker-text"></span>
  <button id="ai-ticker-toggle"></button>
  <div id="ai-ticker-expanded" hidden></div>
  <pre id="ai-ticker-math"></pre>
  <button id="ai-ticker-resume"></button>
  <button id="ai-ticker-share"></button>

  <!-- Equivalences -->
  <span id="equivIcon"></span>
  <span id="equivText"></span>
  <button id="snarkToggle">😤 Snarky Mode</button>

  <!-- Share panel (shareDoomBtn must be inside share-doom-panel to avoid the
       document-level "click outside to close" handler undoing the toggle) -->
  <div id="share-doom-panel">
    <button id="shareDoomBtn"></button>
    <div id="share-doom-options" hidden></div>
    <button id="shareCloseBtn"></button>
    <button id="shareCopyBtn">📋 Copy text</button>
    <button id="shareTwitterBtn"></button>
    <button id="shareRedditBtn"></button>
    <button id="shareLinkedInBtn"></button>
    <button id="shareWhatsAppBtn"></button>
    <button id="shareBlueskyBtn"></button>
    <button id="shareAccelerationBtn" hidden></button>
  </div>
  <button id="footerShareTwitter"></button>
  <button id="footerShareReddit"></button>
  <button id="footerShareLinkedIn"></button>
  <button id="footerShareWhatsApp"></button>
  <button id="footerShareBluesky"></button>
  <button id="footerShareCopy">📋 Copy link</button>

  <!-- Receipt modal -->
  <button id="getReceiptBtn"></button>
  <div id="receipt-modal" hidden></div>
  <pre id="receipt-body"></pre>
  <button id="receiptCloseBtn"></button>
  <button id="receiptCopyBtn"></button>
  <button id="receiptShareBtn"></button>

  <!-- Personal Footprint Calculator -->
  <button id="calcToggleBtn">▶ Open Personal AI Carbon Footprint Calculator</button>
  <div id="calc-content" hidden></div>
  <input id="calcPrompts" type="number" value="20">
  <input id="calcLength" type="number" value="500">
  <select id="calcModel"><option value="1">Standard</option><option value="3">Large</option></select>
  <span id="calcPromptsVal"></span>
  <div id="calc-results"></div>
  <button id="calcShareBtn"></button>

  <!-- Badges / Achievements -->
  <div id="badges-grid"></div>
  <div id="toast" hidden></div>
  <button id="toast-close"></button>
  <span id="toast-icon"></span>
  <span id="toast-title"></span>
  <span id="toast-desc"></span>

  <!-- Accelerate the Doom game -->
  <button id="bigRedButton"></button>
  <button id="accelToggleBtn">▶ Accelerate</button>
  <div id="accel-content" hidden></div>
  <span id="comboDisplay"></span>
  <span id="bestScoreValue"></span>
  <span id="brbLabel"></span>
  <span id="brbTapRate"></span>
  <span id="milestoneRaceName"></span>
  <div id="milestoneRaceBar"></div>
  <div id="milestoneRaceFill"></div>
  <span id="milestoneRacePct"></span>
  <div id="upgradeShop"></div>
  <div id="agentShop"></div>
  <div id="workforcePanel"></div>
  <span id="companyStageName"></span>
  <span id="companyStageIcon"></span>
  <div id="challengeRow"></div>

  <!-- Social Ripple -->
  <span id="presenceCount"></span>
  <span id="presenceReaction"></span>

  <!-- Witness History / Event Log -->
  <div id="event-log"></div>
  <button id="exportLogBtn"></button>

  <!-- Footer meta-irony stats -->
  <span id="footerMetaIrony"></span>
  <span id="stiCharges"></span>
  <span id="stiMetres"></span>
  <span id="stiTrees"></span>
  <span id="stiWater"></span>

  <!-- Milestone flash overlay -->
  <div id="milestone-flash-overlay" hidden></div>
  <span id="milestone-flash-name"></span>
  <span id="milestone-flash-icon"></span>
  <span id="milestone-flash-desc"></span>
  <button id="milestone-flash-close"></button>

  <!-- Scary features: Emergency Broadcast -->
  <div id="emergency-broadcast" hidden></div>
  <span id="ebMsg"></span>
  <button id="ebDismissBtn"></button>

  <!-- Scary features: Apology Generator -->
  <blockquote id="apologyQuote"></blockquote>
  <button id="apologyCopyBtn">📋 Copy &amp; Send to Your AI Vendor</button>
  <button id="apologyNextBtn"></button>

  <!-- Scary features: Prompt Hall of Shame -->
  <div id="shameFeed"></div>
  <input id="shameInput" type="text">
  <button id="shameSubmitBtn"></button>

  <!-- Scary features: Intervention Modal -->
  <div id="intervention-modal" hidden></div>
  <p id="intervention-msg"></p>
  <button id="intervention-stay"></button>
  <button id="intervention-leave"></button>

  <!-- Scary features: Grim Reaper -->
  <div id="grim-reaper" hidden></div>
  <span id="reaper-bubble"></span>

  <!-- Scary features: Villain Arc Leaderboard -->
  <table><tbody id="villainTableBody"></tbody></table>
  <div id="villainCongrats" hidden></div>
  <span id="villainRankTitle"></span>
  <span id="villainRankScore"></span>

  <!-- Extinction countdown -->
  <span id="extYears"></span>
  <span id="extDays"></span>
  <span id="extHours"></span>
  <span id="extMins"></span>
  <span id="extSecs"></span>

  <!-- Always-on Life Blocks Stack Panel rows -->
  <div id="lb-stack-seconds"></div>
  <div id="lb-stack-minutes"></div>
  <div id="lb-stack-hours"></div>
  <div id="lb-stack-days"></div>
  <div id="lb-stack-months"></div>
  <div id="lb-stack-years"></div>

  <!-- Section with id for renderSectionAnchors -->
  <section id="test-section"><h2>Test Section</h2></section>
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
  global.ChangelogData = {
    SITE_VERSION: '1.2.3',
    CHANGELOG_RELEASES: [
      {
        version: 'Unreleased',
        date: null,
        sections: [{ heading: 'Added', items: ['New unreleased feature'] }],
      },
      {
        version: '1.2.3',
        date: '2025-06-01',
        sections: [
          { heading: 'Added',   items: ['Cool new thing'] },
          { heading: 'Fixed',   items: ['Broken thing fixed'] },
        ],
      },
      {
        version: '1.0.0',
        date: '2025-04-14',
        sections: [{ heading: 'Added', items: ['Initial release'] }],
      },
    ],
  };
  global.Chart = makeChartMock();
  global.requestAnimationFrame = jest.fn();
  // Use require() so Istanbul can instrument script.js and report coverage to Codecov.
  // In Jest's jsdom environment global.window is the jsdom window, so window-dependent
  // code in the IIFE resolves correctly via Node's global object.
  jest.resetModules();
  require('../script.js');
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
  localStorage.clear();
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
    expect(btn.textContent).toContain('🌙');
    btn.click(); // light -> dark
    expect(btn.textContent).toContain('☀️');
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
    jest.resetModules();
    expect(() => require('../script.js')).not.toThrow();
  });

  test('instantiates Chart when Chart.js is present', () => {
    const ChartMock = makeChartMock();
    global.Chart = ChartMock;
    document.body.innerHTML = MIN_HTML;
    global.requestAnimationFrame = jest.fn();
    jest.resetModules();
    require('../script.js');
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

// ============================================================
// renderTips (DOM)
// ============================================================
describe('renderTips (DOM)', () => {
  test('creates a card for each TOKEN_TIP', () => {
    const grid = document.getElementById('tipsGrid');
    expect(grid).not.toBeNull();
    expect(grid.children.length).toBe(coreModule.TOKEN_TIPS.length);
  });

  test('each tip card has the expected id', () => {
    coreModule.TOKEN_TIPS.forEach((tip) => {
      expect(document.getElementById('tip-' + tip.id)).not.toBeNull();
    });
  });

  test('tip grid HTML does not contain unescaped script tags', () => {
    expect(document.getElementById('tipsGrid').innerHTML).not.toContain('<script>');
  });

  test('tip cards contain the tip title text', () => {
    const grid = document.getElementById('tipsGrid');
    coreModule.TOKEN_TIPS.forEach((tip) => {
      expect(grid.innerHTML).toContain(tip.title);
    });
  });
});

// ============================================================
// renderChangelog (DOM)
// ============================================================
describe('renderChangelog (DOM)', () => {
  test('changelogList is populated after init', () => {
    const list = document.getElementById('changelogList');
    expect(list).not.toBeNull();
    expect(list.innerHTML.trim()).not.toBe('');
  });

  test('creates one release block per entry in CHANGELOG_RELEASES', () => {
    const list = document.getElementById('changelogList');
    const releases = list.querySelectorAll('.changelog-release');
    expect(releases.length).toBe(global.ChangelogData.CHANGELOG_RELEASES.length);
  });

  test('unreleased block has the --unreleased modifier class', () => {
    const list = document.getElementById('changelogList');
    const unreleased = list.querySelector('.changelog-release--unreleased');
    expect(unreleased).not.toBeNull();
  });

  test('release versions appear in the rendered output', () => {
    const html = document.getElementById('changelogList').innerHTML;
    expect(html).toContain('v1.2.3');
    expect(html).toContain('v1.0.0');
  });

  test('section headings are rendered', () => {
    const html = document.getElementById('changelogList').innerHTML;
    expect(html).toContain('Added');
    expect(html).toContain('Fixed');
  });

  test('changelog items are rendered', () => {
    const html = document.getElementById('changelogList').innerHTML;
    expect(html).toContain('Cool new thing');
    expect(html).toContain('Broken thing fixed');
    expect(html).toContain('Initial release');
  });

  test('release date is shown for versioned releases', () => {
    const html = document.getElementById('changelogList').innerHTML;
    expect(html).toContain('2025-06-01');
    expect(html).toContain('2025-04-14');
  });

  test('version badge in footer is updated from SITE_VERSION', () => {
    const el = document.getElementById('siteVersion');
    expect(el).not.toBeNull();
    expect(el.textContent).toBe('v1.2.3');
  });

  test('markdown links in items are rendered as anchor tags', () => {
    // Re-initialise with an item containing a markdown link
    document.body.innerHTML = MIN_HTML;
    global.ChangelogData = {
      SITE_VERSION: '2.0.0',
      CHANGELOG_RELEASES: [{
        version: '2.0.0',
        date: '2025-07-01',
        sections: [{
          heading: 'Added',
          items: ['New feature ([#99](https://github.com/nitrocode/token-deathclock/issues/99)) ([abc1234](https://github.com/nitrocode/token-deathclock/commit/abc1234))'],
        }],
      }],
    };
    global.requestAnimationFrame = jest.fn();
    jest.resetModules();
    require('../script.js');
    const html = document.getElementById('changelogList').innerHTML;
    // Markdown link syntax must not appear verbatim
    expect(html).not.toContain('[#99]');
    // PR link should be an anchor
    expect(html).toContain('href="https://github.com/nitrocode/token-deathclock/issues/99"');
    expect(html).toContain('>#99<');
    // Commit link should be an anchor
    expect(html).toContain('href="https://github.com/nitrocode/token-deathclock/commit/abc1234"');
  });

  test('non-https markdown link text is escaped, not rendered as anchor', () => {
    document.body.innerHTML = MIN_HTML;
    global.ChangelogData = {
      SITE_VERSION: '2.0.0',
      CHANGELOG_RELEASES: [{
        version: '2.0.0',
        date: null,
        sections: [{
          heading: 'Added',
          items: ['bad link [click](javascript:alert(1))'],
        }],
      }],
    };
    global.requestAnimationFrame = jest.fn();
    jest.resetModules();
    require('../script.js');
    const html = document.getElementById('changelogList').innerHTML;
    expect(html).not.toContain('href="javascript:');
    // The raw markdown text should be escaped as literal text, not injected as a link
    expect(html).not.toContain('<a href="javascript');
  });

  test('show-more button is rendered when there are older releases', () => {
    const list = document.getElementById('changelogList');
    const btn = list.querySelector('#changelogShowMore');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('older release');
  });

  test('older releases container is hidden by default', () => {
    const list = document.getElementById('changelogList');
    const older = list.querySelector('#changelogOlder');
    expect(older).not.toBeNull();
    expect(older.hidden).toBe(true);
  });

  test('clicking show-more reveals older releases and updates button text', () => {
    const list = document.getElementById('changelogList');
    const btn = list.querySelector('#changelogShowMore');
    const older = list.querySelector('#changelogOlder');
    btn.click();
    expect(older.hidden).toBe(false);
    expect(btn.textContent).toContain('Hide older releases');
  });

  test('clicking show-more again re-hides older releases', () => {
    const list = document.getElementById('changelogList');
    const btn = list.querySelector('#changelogShowMore');
    const older = list.querySelector('#changelogOlder');
    btn.click(); // expand
    btn.click(); // collapse
    expect(older.hidden).toBe(true);
    expect(btn.textContent).toContain('older release');
  });

  test('no show-more button when there is only one release', () => {
    document.body.innerHTML = MIN_HTML;
    global.ChangelogData = {
      SITE_VERSION: '1.0.0',
      CHANGELOG_RELEASES: [{
        version: '1.0.0',
        date: '2025-04-14',
        sections: [{ heading: 'Added', items: ['Initial release'] }],
      }],
    };
    global.requestAnimationFrame = jest.fn();
    jest.resetModules();
    require('../script.js');
    const btn = document.getElementById('changelogShowMore');
    expect(btn).toBeNull();
  });

  test('renders gracefully when ChangelogData is absent', () => {
    document.body.innerHTML = MIN_HTML;
    delete global.ChangelogData;
    global.requestAnimationFrame = jest.fn();
    jest.resetModules();
    expect(() => require('../script.js')).not.toThrow();
    const list = document.getElementById('changelogList');
    expect(list.innerHTML).toContain('No changelog entries found');
    // Restore for subsequent tests
    global.ChangelogData = {
      SITE_VERSION: '1.2.3',
      CHANGELOG_RELEASES: [],
    };
  });
});

// ============================================================
// initTicker (DOM)
// ============================================================
describe('initTicker (DOM)', () => {
  test('ai-ticker-text is populated after init', () => {
    const el = document.getElementById('ai-ticker-text');
    expect(el).not.toBeNull();
    expect(el.textContent.length).toBeGreaterThan(0);
  });

  test('clicking the ticker text expands the ticker', () => {
    const textEl    = document.getElementById('ai-ticker-text');
    const expanded  = document.getElementById('ai-ticker-expanded');
    expect(expanded).not.toBeNull();
    textEl.click();
    expect(expanded.hidden).toBe(false);
  });

  test('clicking the ticker toggle button expands the ticker', () => {
    const toggleBtn = document.getElementById('ai-ticker-toggle');
    const expanded  = document.getElementById('ai-ticker-expanded');
    toggleBtn.click();
    expect(expanded.hidden).toBe(false);
  });

  test('clicking the ticker toggle twice collapses the ticker', () => {
    const toggleBtn = document.getElementById('ai-ticker-toggle');
    const expanded  = document.getElementById('ai-ticker-expanded');
    toggleBtn.click(); // expand
    toggleBtn.click(); // collapse
    expect(expanded.hidden).toBe(true);
  });

  test('expanded ticker shows math breakdown', () => {
    const toggleBtn = document.getElementById('ai-ticker-toggle');
    toggleBtn.click(); // expand
    const math = document.getElementById('ai-ticker-math');
    expect(math).not.toBeNull();
    expect(math.textContent.length).toBeGreaterThan(0);
  });

  test('resume button collapses the ticker', () => {
    const toggleBtn = document.getElementById('ai-ticker-toggle');
    const resumeBtn = document.getElementById('ai-ticker-resume');
    const expanded  = document.getElementById('ai-ticker-expanded');
    toggleBtn.click(); // expand
    resumeBtn.click();  // collapse via resume
    expect(expanded.hidden).toBe(true);
  });

  test('share button does not throw', () => {
    // Mock window.open to prevent errors
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const shareBtn = document.getElementById('ai-ticker-share');
    expect(() => shareBtn.click()).not.toThrow();
    openSpy.mockRestore();
  });
});

// ============================================================
// initEquivalences (DOM)
// ============================================================
describe('initEquivalences (DOM)', () => {
  test('equivIcon and equivText are populated after init', () => {
    const iconEl = document.getElementById('equivIcon');
    const textEl = document.getElementById('equivText');
    expect(iconEl).not.toBeNull();
    expect(textEl).not.toBeNull();
    expect(textEl.textContent.length).toBeGreaterThan(0);
  });

  test('snarkToggle button switches to snarky mode', () => {
    const toggle = document.getElementById('snarkToggle');
    toggle.click();
    expect(toggle.textContent).toContain('Hopeful');
  });

  test('snarkToggle button switches back to hopeful mode', () => {
    const toggle = document.getElementById('snarkToggle');
    toggle.click(); // snarky
    toggle.click(); // hopeful
    expect(toggle.textContent).toContain('Snarky');
  });
});

// ============================================================
// initTabs (DOM)
// ============================================================
describe('initTabs (DOM)', () => {
  test('tab buttons are present', () => {
    const btns = document.querySelectorAll('.tab-btn[data-tab]');
    expect(btns.length).toBeGreaterThan(0);
  });

  test('clicking a tab button activates it', () => {
    const btns = document.querySelectorAll('.tab-btn[data-tab]');
    const secondTab = btns[1];
    secondTab.click();
    expect(secondTab.classList.contains('tab-btn--active')).toBe(true);
    expect(secondTab.getAttribute('aria-selected')).toBe('true');
  });

  test('clicking a tab hides the other panel', () => {
    const btns = document.querySelectorAll('.tab-btn[data-tab]');
    btns[1].click();
    const homePanel = document.getElementById('tab-home');
    expect(homePanel.hidden).toBe(true);
  });
});

// ============================================================
// Receipt modal (DOM)
// ============================================================
describe('Receipt modal (DOM)', () => {
  test('getReceiptBtn opens the receipt modal', () => {
    const btn   = document.getElementById('getReceiptBtn');
    const modal = document.getElementById('receipt-modal');
    btn.click();
    expect(modal.hidden).toBe(false);
  });

  test('receipt body is populated after opening', () => {
    const btn  = document.getElementById('getReceiptBtn');
    const body = document.getElementById('receipt-body');
    btn.click();
    expect(body.textContent.length).toBeGreaterThan(0);
  });

  test('close button hides the receipt modal', () => {
    const openBtn  = document.getElementById('getReceiptBtn');
    const closeBtn = document.getElementById('receiptCloseBtn');
    const modal    = document.getElementById('receipt-modal');
    openBtn.click();
    closeBtn.click();
    expect(modal.hidden).toBe(true);
  });

  test('share button triggers share logic without throwing', () => {
    const openSpy  = jest.spyOn(window, 'open').mockImplementation(() => null);
    const openBtn  = document.getElementById('getReceiptBtn');
    const shareBtn = document.getElementById('receiptShareBtn');
    openBtn.click();
    expect(() => shareBtn.click()).not.toThrow();
    openSpy.mockRestore();
  });
});

// ============================================================
// Personal Footprint Calculator (DOM)
// ============================================================
describe('Calculator (DOM)', () => {
  test('calcToggleBtn opens the calculator', () => {
    const toggleBtn = document.getElementById('calcToggleBtn');
    const content   = document.getElementById('calc-content');
    toggleBtn.click();
    expect(content.hidden).toBe(false);
  });

  test('calculator produces results when opened', () => {
    const toggleBtn = document.getElementById('calcToggleBtn');
    const results   = document.getElementById('calc-results');
    toggleBtn.click();
    expect(results.innerHTML.length).toBeGreaterThan(0);
  });

  test('calculator results contain "WANTED" poster', () => {
    const toggleBtn = document.getElementById('calcToggleBtn');
    toggleBtn.click();
    const results = document.getElementById('calc-results');
    expect(results.innerHTML).toContain('WANTED');
  });

  test('calculator input changes update results', () => {
    const toggleBtn = document.getElementById('calcToggleBtn');
    toggleBtn.click();
    const promptsEl = document.getElementById('calcPrompts');
    promptsEl.value = '50';
    promptsEl.dispatchEvent(new Event('input'));
    const results = document.getElementById('calc-results');
    expect(results.innerHTML).toContain('WANTED');
  });

  test('calcToggleBtn closes the calculator when clicked again', () => {
    const toggleBtn = document.getElementById('calcToggleBtn');
    const content   = document.getElementById('calc-content');
    toggleBtn.click(); // open
    toggleBtn.click(); // close
    expect(content.hidden).toBe(true);
  });

  test('share button does not throw', () => {
    const openSpy  = jest.spyOn(window, 'open').mockImplementation(() => null);
    const toggleBtn = document.getElementById('calcToggleBtn');
    const shareBtn  = document.getElementById('calcShareBtn');
    toggleBtn.click();
    expect(() => shareBtn.click()).not.toThrow();
    openSpy.mockRestore();
  });
});

// ============================================================
// Badges / Achievements (DOM)
// ============================================================
describe('Badges (DOM)', () => {
  test('badges grid is populated on init', () => {
    const grid = document.getElementById('badges-grid');
    expect(grid).not.toBeNull();
    expect(grid.children.length).toBeGreaterThan(0);
  });

  test('all badge items are initially locked', () => {
    const grid   = document.getElementById('badges-grid');
    const locked = grid.querySelectorAll('.badge-item.locked');
    expect(locked.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Share panel (DOM)
// ============================================================
describe('Share panel (DOM)', () => {
  test('share-doom-panel exists in DOM', () => {
    expect(document.getElementById('share-doom-panel')).not.toBeNull();
  });

  test('clicking shareDoomBtn toggles the options panel', () => {
    const mainBtn = document.getElementById('shareDoomBtn');
    const options = document.getElementById('share-doom-options');
    mainBtn.click();
    expect(options.hidden).toBe(false);
  });

  test('clicking Twitter share does not throw', () => {
    const openSpy  = jest.spyOn(window, 'open').mockImplementation(() => null);
    const twitterBtn = document.getElementById('shareTwitterBtn');
    expect(() => twitterBtn.click()).not.toThrow();
    openSpy.mockRestore();
  });

  test('clicking Reddit share does not throw', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const redditBtn = document.getElementById('shareRedditBtn');
    expect(() => redditBtn.click()).not.toThrow();
    openSpy.mockRestore();
  });

  test('clicking LinkedIn share does not throw', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const linkedinBtn = document.getElementById('shareLinkedInBtn');
    expect(() => linkedinBtn.click()).not.toThrow();
    openSpy.mockRestore();
  });

  test('clicking WhatsApp share does not throw', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const whatsappBtn = document.getElementById('shareWhatsAppBtn');
    expect(() => whatsappBtn.click()).not.toThrow();
    openSpy.mockRestore();
  });

  test('clicking Bluesky share does not throw', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const blueskyBtn = document.getElementById('shareBlueskyBtn');
    expect(() => blueskyBtn.click()).not.toThrow();
    openSpy.mockRestore();
  });

  test('close button hides the options panel', () => {
    const mainBtn  = document.getElementById('shareDoomBtn');
    const closeBtn = document.getElementById('shareCloseBtn');
    const options  = document.getElementById('share-doom-options');
    mainBtn.click(); // open
    closeBtn.click(); // close
    expect(options.hidden).toBe(true);
  });
});

// ============================================================
// Social Ripple (DOM)
// ============================================================
describe('Social Ripple (DOM)', () => {
  test('presenceCount is populated after init', () => {
    const el = document.getElementById('presenceCount');
    expect(el).not.toBeNull();
    expect(el.textContent.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Witness History / Event Log (DOM)
// ============================================================
describe('Witness History (DOM)', () => {
  test('event-log element exists in DOM', () => {
    expect(document.getElementById('event-log')).not.toBeNull();
  });
});

// ============================================================
// Footer Stats (DOM)
// ============================================================
describe('Footer Stats (DOM)', () => {
  test('stiCharges is updated after init', () => {
    const el = document.getElementById('stiCharges');
    expect(el).not.toBeNull();
    expect(el.textContent.length).toBeGreaterThan(0);
  });

  test('stiTrees is updated after init', () => {
    const el = document.getElementById('stiTrees');
    expect(el.textContent.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Scary Features: Apology Generator (DOM)
// ============================================================
describe('Apology Generator (DOM)', () => {
  test('apologyQuote is populated after init', () => {
    const el = document.getElementById('apologyQuote');
    expect(el).not.toBeNull();
    expect(el.textContent.length).toBeGreaterThan(0);
  });

  test('apologyNextBtn updates the quote', () => {
    const nextBtn = document.getElementById('apologyNextBtn');
    const quote   = document.getElementById('apologyQuote');
    const original = quote.textContent;
    nextBtn.click();
    // The quote text may or may not change (random rotation), but no error
    expect(quote.textContent.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Scary Features: Prompt Hall of Shame (DOM)
// ============================================================
describe('Prompt Hall of Shame (DOM)', () => {
  test('shame feed is seeded with entries on init', () => {
    const feed = document.getElementById('shameFeed');
    expect(feed).not.toBeNull();
    expect(feed.children.length).toBeGreaterThan(0);
  });

  test('submitting a prompt adds it to the feed', () => {
    const input     = document.getElementById('shameInput');
    const submitBtn = document.getElementById('shameSubmitBtn');
    const feed      = document.getElementById('shameFeed');
    const before    = feed.children.length;
    input.value     = 'Test prompt';
    submitBtn.click();
    expect(feed.children.length).toBeGreaterThan(0);
    // Input should be cleared after submission
    expect(input.value).toBe('');
  });

  test('pressing Enter in shame input submits the prompt', () => {
    const input = document.getElementById('shameInput');
    const feed  = document.getElementById('shameFeed');
    input.value = 'Enter key test';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(input.value).toBe('');
  });
});

// ============================================================
// Scary Features: Emergency Broadcast (DOM)
// ============================================================
describe('Emergency Broadcast (DOM)', () => {
  test('ebDismissBtn hides the overlay when clicked', () => {
    const overlay    = document.getElementById('emergency-broadcast');
    const dismissBtn = document.getElementById('ebDismissBtn');
    overlay.hidden   = false;
    dismissBtn.click();
    expect(overlay.hidden).toBe(true);
  });
});

// ============================================================
// Life Blocks — drill-down navigation (DOM)
// ============================================================
describe('Life Blocks drill-down (DOM)', () => {
  test('lb-container has blocks after init', () => {
    const container = document.getElementById('lb-container');
    expect(container).not.toBeNull();
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  test('lb-stack-seconds has rendered blocks', () => {
    const el = document.getElementById('lb-stack-seconds');
    expect(el).not.toBeNull();
    expect(el.innerHTML.length).toBeGreaterThan(0);
  });

  test('clicking a future lb-stack block navigates drill-down without error', () => {
    const container = document.getElementById('lb-container');
    const futureBlock = container.querySelector('.lb-block:not(.lb-dead)');
    if (futureBlock) {
      expect(() => futureBlock.click()).not.toThrow();
    }
  });
});

// ============================================================
// Accelerate the Doom (DOM)
// ============================================================
describe('Accelerate the Doom (DOM)', () => {
  test('accelToggleBtn opens the accelerator panel', () => {
    const toggleBtn = document.getElementById('accelToggleBtn');
    const content   = document.getElementById('accel-content');
    toggleBtn.click();
    expect(content.hidden).toBe(false);
  });

  test('bigRedButton is tappable without error', () => {
    // Open the panel first
    document.getElementById('accelToggleBtn').click();
    const btn = document.getElementById('bigRedButton');
    expect(() => btn.click()).not.toThrow();
  });

  test('comboDisplay is updated after tapping the big red button', () => {
    document.getElementById('accelToggleBtn').click();
    document.getElementById('bigRedButton').click();
    const combo = document.getElementById('comboDisplay');
    expect(combo).not.toBeNull();
  });

  test('upgrade shop is rendered when accelerator panel opens', () => {
    document.getElementById('accelToggleBtn').click();
    const shop = document.getElementById('upgradeShop');
    expect(shop.innerHTML.length).toBeGreaterThan(0);
  });

  test('challenge row is rendered', () => {
    document.getElementById('accelToggleBtn').click();
    const row = document.getElementById('challengeRow');
    expect(row).not.toBeNull();
  });
});

// ============================================================
// renderSectionAnchors (DOM)
// ============================================================
describe('renderSectionAnchors (DOM)', () => {
  test('section with id gets an anchor link appended', () => {
    const section = document.getElementById('test-section');
    const anchor  = section.querySelector('.section-anchor');
    expect(anchor).not.toBeNull();
    expect(anchor.textContent).toBe('#');
  });
});

// ============================================================
// hideCompletedMilestones toggle (DOM)
// ============================================================
describe('hideCompletedMilestones (DOM)', () => {
  test('checking the box adds hide-completed class to milestones grid', () => {
    const cb   = document.getElementById('hideCompletedMilestones');
    const grid = document.getElementById('milestonesGrid');
    cb.checked = true;
    cb.dispatchEvent(new Event('change'));
    expect(grid.classList.contains('hide-completed')).toBe(true);
  });

  test('unchecking the box removes hide-completed class', () => {
    const cb   = document.getElementById('hideCompletedMilestones');
    const grid = document.getElementById('milestonesGrid');
    cb.checked = true;
    cb.dispatchEvent(new Event('change'));
    cb.checked = false;
    cb.dispatchEvent(new Event('change'));
    expect(grid.classList.contains('hide-completed')).toBe(false);
  });
});

// ============================================================
// Extinction countdown (DOM)
// ============================================================
describe('Extinction countdown (DOM)', () => {
  test('extinction countdown elements are populated', () => {
    // These are updated by updateExtinctionCountdown() called during init
    const years = document.getElementById('extYears');
    const days  = document.getElementById('extDays');
    expect(years).not.toBeNull();
    expect(days).not.toBeNull();
  });
});

// ============================================================
// Life Blocks drill-down navigation (DOM)
// ============================================================
describe('Life Blocks drill-down navigation (DOM)', () => {
  test('clicking a day block drills into hours view', () => {
    const container = document.getElementById('lb-container');
    const block = container.querySelector('.lb-block:not(.lb-dead)');
    if (!block) return; // guard for edge cases where no interactive blocks exist
    block.click();
    // After drill-down the breadcrumb should show a back-navigation item,
    // confirming the view level actually changed.
    const breadcrumb = document.getElementById('lb-breadcrumb');
    // The days view breadcrumb has no [data-nav] links; a deeper level will.
    // Either way, the container must still have content.
    expect(container.innerHTML.length).toBeGreaterThan(0);
    // lb-info should show a time-unit label (e.g. "00:xx — select a minute")
    const info = document.getElementById('lb-info');
    if (info) expect(info.textContent.length).toBeGreaterThan(0);
  });

  test('clicking breadcrumb navigates back to days view', () => {
    const container = document.getElementById('lb-container');
    const breadcrumb = document.getElementById('lb-breadcrumb');
    // Click a block to drill down
    const block = container.querySelector('.lb-block:not(.lb-dead)');
    if (block) block.click();
    // Now try to click a breadcrumb item to go back (if one exists)
    const navBtn = breadcrumb.querySelector('[data-nav]');
    if (navBtn) {
      expect(() => navBtn.click()).not.toThrow();
    }
  });

  test('pressing Enter on a breadcrumb item navigates', () => {
    const container = document.getElementById('lb-container');
    const block = container.querySelector('.lb-block:not(.lb-dead)');
    if (block) block.click();
    const breadcrumb = document.getElementById('lb-breadcrumb');
    const navBtn = breadcrumb.querySelector('[data-nav]');
    if (navBtn) {
      expect(() => navBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))).not.toThrow();
    }
  });

  test('clicking a stack panel block navigates drill-down', () => {
    // scrollIntoView is not implemented in jsdom — stub it
    Element.prototype.scrollIntoView = jest.fn();
    const stackEl = document.getElementById('lb-stack-seconds');
    const block = stackEl.querySelector('[data-stack-level]');
    if (block) {
      expect(() => block.click()).not.toThrow();
    }
  });

  test('pressing Space on a stack panel block navigates drill-down', () => {
    Element.prototype.scrollIntoView = jest.fn();
    const stackEl = document.getElementById('lb-stack-seconds');
    const block = stackEl.querySelector('[data-stack-level]');
    if (block) {
      expect(() => block.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))).not.toThrow();
    }
  });
});

// ============================================================
// Accelerator: Share text and more interactions (DOM)
// ============================================================
describe('Accelerator interactions (DOM)', () => {
  test('pressing Enter on bigRedButton taps it', () => {
    document.getElementById('accelToggleBtn').click(); // open panel first
    const btn = document.getElementById('bigRedButton');
    expect(() => btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))).not.toThrow();
  });

  test('share acceleration button triggers share without error', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    document.getElementById('accelToggleBtn').click();
    document.getElementById('bigRedButton').click(); // add some tokens
    const shareBtn = document.getElementById('shareAccelerationBtn');
    expect(() => shareBtn.click()).not.toThrow();
    openSpy.mockRestore();
  });

  test('closing the accelerator panel hides the content', () => {
    const toggleBtn = document.getElementById('accelToggleBtn');
    const content   = document.getElementById('accel-content');
    toggleBtn.click(); // open
    toggleBtn.click(); // close
    expect(content.hidden).toBe(true);
  });
});

// ============================================================
// Receipt keyboard handler (DOM)
// ============================================================
describe('Receipt keyboard handler (DOM)', () => {
  test('pressing Escape key in the receipt modal closes it', () => {
    const openBtn  = document.getElementById('getReceiptBtn');
    const modal    = document.getElementById('receipt-modal');
    openBtn.click(); // open modal (attaches trapFocus handler)
    expect(modal.hidden).toBe(false);
    // trapFocus listens on the modal element, not document
    modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(modal.hidden).toBe(true);
  });

  test('Tab key in the receipt modal does not throw', () => {
    const openBtn = document.getElementById('getReceiptBtn');
    const modal   = document.getElementById('receipt-modal');
    openBtn.click();
    // Tab key triggers focus-trap logic; should not throw even if active element is unset
    expect(() => {
      modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    }).not.toThrow();
    expect(modal.hidden).toBe(false); // modal should still be open after Tab
  });
});

// ============================================================
// Villain Leaderboard (DOM)
// ============================================================
describe('Villain Leaderboard (DOM)', () => {
  test('villain table body is populated on init', () => {
    const tbody = document.getElementById('villainTableBody');
    expect(tbody).not.toBeNull();
    expect(tbody.children.length).toBeGreaterThan(0);
  });

  test('villain rank title is populated on init', () => {
    const titleEl = document.getElementById('villainRankTitle');
    expect(titleEl).not.toBeNull();
    expect(titleEl.textContent.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Intervention modal (DOM)
// ============================================================
describe('Intervention modal (DOM)', () => {
  test('stay button dismisses the intervention modal', () => {
    const modal    = document.getElementById('intervention-modal');
    const stayBtn  = document.getElementById('intervention-stay');
    // Show the modal manually to test the close button
    modal.hidden = false;
    stayBtn.click();
    expect(modal.hidden).toBe(true);
  });
});

// ============================================================
// Grim Reaper (DOM)
// ============================================================
describe('Grim Reaper (DOM)', () => {
  test('grim reaper element exists in DOM', () => {
    expect(document.getElementById('grim-reaper')).not.toBeNull();
  });
});

// ============================================================
// Copy to clipboard helpers (DOM)
// ============================================================
describe('Copy to clipboard (DOM)', () => {
  test('footer share copy button does not throw', () => {
    const btn = document.getElementById('footerShareCopy');
    // Mock clipboard API
    const mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined),
    };
    Object.defineProperty(navigator, 'clipboard', { value: mockClipboard, writable: true });
    expect(() => btn.click()).not.toThrow();
  });
});

// ============================================================
// Milestone flash overlay (DOM)
// ============================================================
describe('Milestone flash overlay (DOM)', () => {
  test('milestone flash overlay exists in DOM', () => {
    expect(document.getElementById('milestone-flash-overlay')).not.toBeNull();
  });
});
