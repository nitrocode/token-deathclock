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
    RATE_GROWTH_PER_YEAR,
    getDynamicRate,
    computeExtinctionSecsRemaining,
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
    HOROSCOPE_TEMPLATES,
    getDailyHoroscope,
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
    const elapsed = (Date.now() - BASE_DATE_MS) / 1000; // seconds since BASE_DATE
    // Integrate the exponentially-growing rate: tokens = BASE_TOKENS + R0/k * (e^(k*t) - 1)
    // where k = ln(1 + RATE_GROWTH_PER_YEAR) / SECS_PER_YEAR is the continuous growth rate constant.
    const SECS_PER_YEAR = 365.25 * 24 * 3600;
    const continuousGrowthRate = Math.log(1 + RATE_GROWTH_PER_YEAR) / SECS_PER_YEAR;
    return BASE_TOKENS + (TOKENS_PER_SECOND / continuousGrowthRate) * (Math.exp(continuousGrowthRate * elapsed) - 1);
  }

  // Map each power-of-ten threshold to a Unicode superscript suffix.
  // Used by appendExp() and numFmt() to annotate large numbers so viewers
  // can instantly see the order of magnitude without googling "quadrillion".
  const EXP_SUFFIXES = [
    { threshold: 1e18, suffix: ' ×10¹⁸' },
    { threshold: 1e15, suffix: ' ×10¹⁵' },
    { threshold: 1e12, suffix: ' ×10¹²' },
    { threshold: 1e9,  suffix: ' ×10⁹'  },
  ];

  // Append a ×10ⁿ exponent annotation to a formatted string for numbers ≥ 10⁹.
  // Returns the string unchanged for smaller numbers.
  function appendExp(n, text) {
    const entry = EXP_SUFFIXES.find(e => n >= e.threshold);
    return entry ? text + entry.suffix : text;
  }

  function numFmt(n) {
    // Compact formatting for the big live counter, with ×10ⁿ annotation
    if (n >= 1e15) return (n / 1e15).toFixed(3) + ' Quadrillion' + ' ×10¹⁵';
    if (n >= 1e12) return (n / 1e12).toFixed(3) + ' Trillion' + ' ×10¹²';
    return appendExp(n, formatTokenCount(n));
  }

