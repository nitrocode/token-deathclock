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

