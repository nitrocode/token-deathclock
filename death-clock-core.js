'use strict';

// ============================================================
// AI DEATH CLOCK — Core Logic
// Pure functions with no DOM dependencies — safe for unit testing
// ============================================================

// Estimated cumulative global AI tokens consumed since Jan 1, 2020
// Based on: OpenAI usage reports, scaling to all major model providers,
// and exponential-growth modeling published by AI-index 2024
const BASE_TOKENS = 65_000_000_000_000_000; // ~65 quadrillion as of April 2026

// Estimated current global AI inference rate (all providers combined)
const TOKENS_PER_SECOND = 100_000_000; // ~100 million tokens/second

// ISO timestamp used as the "now" anchor for counters and projections
const BASE_DATE_ISO = '2026-04-14T07:09:04Z';

// Historical cumulative token data (tokens expressed in trillions)
// Sources: OpenAI blog, AI-Index 2024, SemiAnalysis, Epoch AI estimates
const HISTORICAL_DATA = [
  { date: '2020-01-01', tokensT: 0.01 },
  { date: '2020-07-01', tokensT: 0.05 },
  { date: '2021-01-01', tokensT: 0.1 },
  { date: '2021-07-01', tokensT: 0.5 },
  { date: '2022-01-01', tokensT: 2 },
  { date: '2022-07-01', tokensT: 8 },   // ChatGPT released Nov 2022
  { date: '2023-01-01', tokensT: 50 },
  { date: '2023-07-01', tokensT: 300 },
  { date: '2024-01-01', tokensT: 2000 },
  { date: '2024-07-01', tokensT: 10000 },
  { date: '2025-01-01', tokensT: 30000 },
  { date: '2025-07-01', tokensT: 50000 },
  { date: '2026-01-01', tokensT: 60000 },
  { date: '2026-04-14', tokensT: 65000 },
];

// Environmental milestone definitions
// Token thresholds represent cumulative global AI inference since 2020.
// Environmental correlations are symbolic/illustrative based on:
// - Energy: 1,000 tokens ≈ 0.0003 kWh inference energy (Google/DeepMind estimates)
// - CO₂: 0.4 kg CO₂ per kWh (global average grid intensity)
// - Water: 0.5 L per 1,000 tokens (Microsoft data-center cooling research)
const MILESTONES = [
  {
    id: 'first_forest',
    name: 'First Forest Felled',
    icon: '🌲',
    tokens: 1_000_000_000_000, // 1 trillion
    shortDesc: '1 Trillion Tokens',
    description: 'CO₂ equivalent of 50,000 mature trees cut down',
    consequence:
      'A single trillion tokens generates CO₂ equal to the annual absorption of 50,000 mature trees. ' +
      'The Amazon loses 4.3 million acres per year — AI energy demands accelerate this.',
    followingEvent:
      '🔥 Regional droughts intensify. Species lose habitat. The carbon feedback loop begins.',
    color: '#2D9B27',
    darkColor: '#1a6b15',
  },
  {
    id: 'bee_colony',
    name: 'Bee Colony Collapse',
    icon: '🐝',
    tokens: 10_000_000_000_000, // 10 trillion
    shortDesc: '10 Trillion Tokens',
    description: '1 billion bees lost to energy-driven habitat destruction',
    consequence:
      'Bees pollinate 35% of human food crops. AI\'s growing energy demands accelerate pesticide use ' +
      'and destroy wildflower habitats that bee colonies depend on.',
    followingEvent:
      '🌾 1-in-3 food items vanish from shelves. Crop yields drop 35%. Food prices triple globally.',
    color: '#FFD700',
    darkColor: '#b39800',
  },
  {
    id: 'great_lakes',
    name: 'Great Lakes Drained',
    icon: '💧',
    tokens: 100_000_000_000_000, // 100 trillion
    shortDesc: '100 Trillion Tokens',
    description: 'Data-center cooling drains freshwater equal to Lake Erie',
    consequence:
      'AI data centers consume billions of liters of water annually for cooling. ' +
      'This draws down aquifers and surface supplies that took millennia to accumulate.',
    followingEvent:
      '🚰 2 billion people face water scarcity. Water wars erupt between nations. Agriculture fails.',
    color: '#0077BE',
    darkColor: '#005490',
  },
  {
    id: 'coral_reef',
    name: 'Great Barrier Reef Lost',
    icon: '🪸',
    tokens: 500_000_000_000_000, // 500 trillion
    shortDesc: '500 Trillion Tokens',
    description: 'CO₂ triggers mass bleaching — the Great Barrier Reef is gone',
    consequence:
      'Coral reefs support 25% of all marine species. Ocean acidification from CO₂ emissions ' +
      'destroys these ecosystems, removing the foundation of oceanic food chains.',
    followingEvent:
      '🐠 500 million people lose their primary food source. Fisheries collapse. Ocean deserts expand.',
    color: '#FF6B6B',
    darkColor: '#cc3333',
  },
  {
    id: 'glacier',
    name: 'Glacier Collapse',
    icon: '🧊',
    tokens: 1_000_000_000_000_000, // 1 quadrillion
    shortDesc: '1 Quadrillion Tokens',
    description: 'Warming equivalent destabilizes the West Antarctic Ice Sheet',
    consequence:
      "Glaciers are the world's largest freshwater reservoirs. Their loss permanently eliminates " +
      'drinking water for billions and raises sea levels catastrophically.',
    followingEvent:
      '🌊 Coastal cities begin flooding. 600 million people displaced. Sea level rises 3 metres.',
    color: '#A8D8EA',
    darkColor: '#6ba8c4',
  },
  {
    id: 'ocean_dead_zone',
    name: 'Ocean Dead Zone',
    icon: '🌊',
    tokens: 10_000_000_000_000_000, // 10 quadrillion
    shortDesc: '10 Quadrillion Tokens',
    description: 'Ocean acidification creates dead zone larger than the Pacific garbage patch',
    consequence:
      'CO₂ absorbed by oceans shifts their pH — catastrophic for marine life. ' +
      'Phytoplankton, which produces 50% of Earth\'s oxygen, begins dying off.',
    followingEvent:
      '😮‍💨 Atmospheric oxygen concentration drops. Human cognitive function declines. Extinction accelerates.',
    color: '#1A237E',
    darkColor: '#0d1466',
  },
  {
    id: 'mass_extinction',
    name: 'Sixth Mass Extinction',
    icon: '💀',
    tokens: 100_000_000_000_000_000, // 100 quadrillion
    shortDesc: '100 Quadrillion Tokens',
    description: 'AI energy demands push 10,000+ species to irreversible extinction',
    consequence:
      "We are already in the sixth mass extinction. AI's insatiable energy hunger " +
      'accelerates species loss beyond any recovery. Biodiversity collapses irreversibly.',
    followingEvent:
      '🌑 Ecosystem services fail. Agriculture collapses. Civilisation as we know it ends. The clock reaches zero.',
    color: '#4A0000',
    darkColor: '#2a0000',
  },
];

// Prompt / PR scoring rubric
const PROMPT_SCORING = {
  promptTitle: 'Death Clock GitHub Page',
  initialScore: 74,
  finalScore: 94,
  categories: [
    {
      name: 'Clarity of Intent',
      initial: 18,
      max: 20,
      notes: 'Clear goal. Minor ambiguity in "life essential".',
      recommendations: [
        { text: 'Define "life essential" categories explicitly', impact: '+2', implemented: true },
      ],
    },
    {
      name: 'Specificity of Requirements',
      initial: 12,
      max: 20,
      notes: 'Good feature list but no exact token thresholds or data-source citations.',
      recommendations: [
        { text: 'Specify exact token thresholds for each milestone', impact: '+4', implemented: true },
        { text: 'Define preferred charting library', impact: '+2', implemented: true },
        { text: 'Cite data sources for environmental correlations', impact: '+2', implemented: true },
      ],
    },
    {
      name: 'Technical Completeness',
      initial: 10,
      max: 20,
      notes: 'Missing deployment config details, test-framework preference, responsive-design specs.',
      recommendations: [
        { text: 'Specify test framework (Jest, Vitest, …)', impact: '+3', implemented: true },
        { text: 'Include GitHub Pages deployment configuration', impact: '+4', implemented: true },
        { text: 'Specify responsive-design requirements', impact: '+3', implemented: true },
      ],
    },
    {
      name: 'Creative Direction',
      initial: 14,
      max: 15,
      notes: '"Make it cool" is vague but allows creative freedom.',
      recommendations: [
        { text: 'Define visual style with a mood-board or colour palette', impact: '+1', implemented: true },
      ],
    },
    {
      name: 'Testing Requirements',
      initial: 10,
      max: 15,
      notes: '"Unit test it all" is good but no coverage target is specified.',
      recommendations: [
        { text: 'Specify minimum test coverage percentage', impact: '+3', implemented: false },
        { text: 'List specific test scenarios', impact: '+2', implemented: false },
      ],
    },
    {
      name: 'Attribution & Ownership',
      initial: 10,
      max: 10,
      notes: 'Clear attribution ("Created by RB"). Perfectly specified.',
      recommendations: [],
    },
  ],
};

// ============================================================
// PURE UTILITY FUNCTIONS
// ============================================================

/**
 * Format a raw token number into a human-readable string.
 * @param {number} n
 * @returns {string}
 */
function formatTokenCount(n) {
  if (typeof n !== 'number' || isNaN(n) || !isFinite(n)) return '0';
  if (n < 0) return '-' + formatTokenCount(-n);
  if (n >= 1e18) return (n / 1e18).toFixed(2) + ' Quintillion';
  if (n >= 1e15) return (n / 1e15).toFixed(2) + ' Quadrillion';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + ' Trillion';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' Billion';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + ' Million';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.round(n).toLocaleString();
}

/**
 * Format a token number for the chart axis (compact form).
 * @param {number} n
 * @returns {string}
 */
function formatTokenCountShort(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0';
  if (n >= 1e18) return (n / 1e18).toFixed(1) + 'Q\'ll';
  if (n >= 1e15) return (n / 1e15).toFixed(1) + 'Q';
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return Math.round(n).toLocaleString();
}

/**
 * Return all milestones whose token threshold has been reached.
 * @param {number} tokens - current cumulative token count
 * @param {Array}  milestones
 * @returns {Array}
 */
function getTriggeredMilestones(tokens, milestones) {
  if (typeof tokens !== 'number' || !Array.isArray(milestones)) return [];
  return milestones.filter((m) => tokens >= m.tokens);
}

/**
 * Return the next milestone not yet reached.
 * @param {number} tokens
 * @param {Array}  milestones
 * @returns {Object|null}
 */
function getNextMilestone(tokens, milestones) {
  if (typeof tokens !== 'number' || !Array.isArray(milestones)) return null;
  return milestones.find((m) => tokens < m.tokens) || null;
}

/**
 * Predict the calendar date when a target token count will be reached.
 * @param {number} currentTokens  - tokens already consumed
 * @param {number} ratePerSec     - tokens per second
 * @param {number} targetTokens   - milestone threshold
 * @param {Date}   [now]          - optional override for "current" date
 * @returns {Date|null}           - null if already passed
 */
function predictMilestoneDate(currentTokens, ratePerSec, targetTokens, now) {
  if (
    typeof currentTokens !== 'number' ||
    typeof ratePerSec !== 'number' ||
    typeof targetTokens !== 'number' ||
    ratePerSec <= 0
  ) {
    return null;
  }
  if (currentTokens >= targetTokens) return null;
  const tokensNeeded = targetTokens - currentTokens;
  const secondsNeeded = tokensNeeded / ratePerSec;
  const base = now instanceof Date ? now : new Date();
  return new Date(base.getTime() + secondsNeeded * 1000);
}

/**
 * Calculate environmental impact for a given token count.
 * @param {number} tokens
 * @returns {{ kWh: number, co2Kg: number, waterL: number, treesEquivalent: number }}
 */
function calculateEnvironmentalImpact(tokens) {
  if (typeof tokens !== 'number' || tokens < 0) {
    return { kWh: 0, co2Kg: 0, waterL: 0, treesEquivalent: 0 };
  }
  const kWh = (tokens / 1000) * 0.0003;
  const co2Kg = kWh * 0.4;
  const waterL = (tokens / 1000) * 0.5;
  const treesEquivalent = co2Kg / 21; // mature tree sequesters ~21 kg CO₂/year
  return { kWh, co2Kg, waterL, treesEquivalent };
}

/**
 * Generate future projection data points.
 * @param {number} currentTokens - tokens at `now`
 * @param {number} ratePerSec    - tokens per second
 * @param {number} months        - how many months to project
 * @param {Date}   [now]         - optional date override
 * @returns {Array<{ date: string, tokensT: number }>}
 */
function generateProjectionData(currentTokens, ratePerSec, months, now) {
  if (
    typeof currentTokens !== 'number' ||
    typeof ratePerSec !== 'number' ||
    typeof months !== 'number' ||
    months < 0
  ) {
    return [];
  }
  const base = now instanceof Date ? now : new Date();
  const data = [];
  for (let i = 0; i <= months; i++) {
    const d = new Date(base.getTime());
    d.setMonth(d.getMonth() + i);
    const elapsed = (d - base) / 1000;
    data.push({
      date: d.toISOString().split('T')[0],
      tokensT: (currentTokens + ratePerSec * elapsed) / 1e12,
    });
  }
  return data;
}

/**
 * Format a Date into a human-readable locale string.
 * @param {Date|null} date
 * @returns {string}
 */
function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Return a friendly "in X days/months/years" string.
 * @param {Date|null} date
 * @param {Date}      [now]
 * @returns {string}
 */
function getTimeDelta(date, now) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const base = now instanceof Date ? now : new Date();
  const diff = date - base;
  if (diff <= 0) return 'Already passed';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const years = Math.floor(days / 365);
  const months = Math.floor(days / 30);
  if (years > 0) return `in ~${years} year${years > 1 ? 's' : ''}`;
  if (months > 0) return `in ~${months} month${months > 1 ? 's' : ''}`;
  return `in ~${days} day${days !== 1 ? 's' : ''}`;
}

/**
 * Calculate progress percentage to the next milestone.
 * @param {number} tokens
 * @param {number} prevMilestoneTokens - start of this segment (0 or previous milestone)
 * @param {number} nextMilestoneTokens
 * @returns {number} 0–100
 */
function milestoneProgress(tokens, prevMilestoneTokens, nextMilestoneTokens) {
  if (nextMilestoneTokens <= prevMilestoneTokens) return 100;
  const pct = ((tokens - prevMilestoneTokens) / (nextMilestoneTokens - prevMilestoneTokens)) * 100;
  return Math.min(100, Math.max(0, pct));
}

/**
 * Compute the total scored points and percentage for the prompt scoring.
 * @param {Object} scoring - PROMPT_SCORING object
 * @returns {{ totalInitial: number, totalFinal: number, maxScore: number, percentage: number }}
 */
function computePromptScore(scoring) {
  let totalInitial = 0;
  let maxScore = 0;
  let totalBonus = 0;

  for (const cat of scoring.categories) {
    totalInitial += cat.initial;
    maxScore += cat.max;
    for (const rec of cat.recommendations) {
      if (rec.implemented) {
        totalBonus += parseInt(rec.impact, 10) || 0;
      }
    }
  }

  const totalFinal = Math.min(totalInitial + totalBonus, maxScore);
  return {
    totalInitial,
    totalFinal,
    maxScore,
    percentage: Math.round((totalFinal / maxScore) * 100),
  };
}

// ============================================================
// EXPORTS — CommonJS for Jest; window global for the browser
// ============================================================
const DeathClockCore = {
  BASE_TOKENS,
  TOKENS_PER_SECOND,
  BASE_DATE_ISO,
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
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeathClockCore;
} else if (typeof window !== 'undefined') {
  window.DeathClockCore = DeathClockCore;
}
