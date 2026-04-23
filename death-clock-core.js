'use strict';

// ============================================================
// AI DEATH CLOCK — Core Logic
// Pure functions with no DOM dependencies — safe for unit testing
//
// Wrapped in an IIFE so that top-level `const` declarations (e.g. MILESTONES)
// do not collide with the identically-named global declared by milestones-data.js
// when both scripts are loaded as classic (non-module) <script> tags.
// ============================================================

(function () {

// Estimated cumulative global AI tokens consumed since Jan 1, 2020
// Based on: OpenAI usage reports, scaling to all major model providers,
// and exponential-growth modeling published by AI-index 2024
const BASE_TOKENS = 65_000_000_000_000_000; // ~65 quadrillion as of April 2026

// Estimated current global AI inference rate at BASE_DATE_ISO (all providers combined)
const TOKENS_PER_SECOND = 100_000_000; // ~100 million tokens/second

// Piecewise token-production rate schedule driven by landmark AI events.
// Each entry defines the approximate global inference rate from that date forward
// until the next entry.  Sources: OpenAI capacity announcements, SemiAnalysis,
// Epoch AI compute trends, Anthropic engineering posts, AI Index 2024.
const RATE_SCHEDULE = [
  { date: '2020-01-01', ratePerSec:               100, event: 'GPT-2 era — pre-API access' },
  { date: '2020-06-01', ratePerSec:             2_000, event: 'GPT-3 launch (OpenAI API private beta)' },
  { date: '2021-01-01', ratePerSec:            10_000, event: 'GPT-3 API broadly available' },
  { date: '2022-01-01', ratePerSec:           200_000, event: 'DALL-E 2 & Codex wide release' },
  { date: '2022-11-30', ratePerSec:         3_000_000, event: 'ChatGPT launch (~100 M users in 60 days)' },
  { date: '2023-03-14', ratePerSec:        10_000_000, event: 'GPT-4 launch + ChatGPT Plus scaling' },
  { date: '2023-07-01', ratePerSec:        20_000_000, event: 'Claude 2, Llama 2 — open-model proliferation' },
  { date: '2024-01-01', ratePerSec:        40_000_000, event: 'GPT-4 Turbo, widespread enterprise adoption' },
  { date: '2024-03-04', ratePerSec:        55_000_000, event: 'Claude 3 Opus — new SOTA benchmark' },
  { date: '2024-05-13', ratePerSec:        70_000_000, event: 'GPT-4o real-time multimodal API' },
  { date: '2024-07-23', ratePerSec:        80_000_000, event: 'Llama 3.1 405B open-weights release' },
  { date: '2025-02-01', ratePerSec:        90_000_000, event: 'DeepSeek R1 — reasoning-model surge' },
  { date: '2025-05-22', ratePerSec:       100_000_000, event: 'Claude Code GA — agentic AI boom begins' },
  { date: '2026-04-14', ratePerSec:       100_000_000, event: 'BASE_DATE_ISO anchor (calibrated to BASE_TOKENS)' },
];

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

// ── Milestone data ────────────────────────────────────────────────────────────
// MILESTONES are defined in milestones.yaml (human-readable source of truth).
// The build step (`npm run build:milestones`) generates milestones-data.js.
//
// In the browser : milestones-data.js is loaded via <script> before this file,
//                  which sets window.MilestonesData.
// In Node.js/Jest: milestones-data.js is loaded via require().
/* istanbul ignore next */
const MILESTONES = (
  typeof window !== 'undefined' && window.MilestonesData
    ? window.MilestonesData.MILESTONES
    : typeof require === 'function'
      ? require('./milestones-data').MILESTONES
      : []
);

// ── Token-saving tips ─────────────────────────────────────────────────────────
// Each tip includes an estimate of token savings when applied consistently.
// savingPct: percentage of tokens saved (0-100) relative to typical usage.
// Sources: OpenAI prompt engineering guide, Anthropic documentation,
// academic work on LLM efficiency.
const TOKEN_TIPS = [
  {
    id: 'focused_prompts',
    icon: '✏️',
    title: 'Write Focused Prompts',
    tip: 'Be specific and remove filler words. A 30 % shorter prompt usually gets the same quality response with far fewer input tokens.',
    savingPct: 30,
    detail: 'Studies show that redundant preambles, excessive politeness markers, and repeated context each add tokens without improving output quality. Aim to cut prompt length by a third without losing essential context.',
    reference: 'https://platform.openai.com/docs/guides/prompt-engineering',
  },
  {
    id: 'right_model_size',
    icon: '🎯',
    title: 'Match Model to Task',
    tip: 'Don\'t use a frontier model (GPT-4, Claude 3.5 Opus) for simple tasks. Smaller models can be 10–100× cheaper on summarisation, classification, and simple Q&A.',
    savingPct: 80,
    detail: 'Frontier models are optimised for complex reasoning. For routine tasks — extracting data, reformatting, answering FAQs — a small model (7B parameters or fewer) achieves comparable accuracy at a fraction of the energy cost.',
    reference: 'https://www.anthropic.com/pricing',
  },
  {
    id: 'avoid_repetition',
    icon: '♻️',
    title: 'Avoid Repeating Context',
    tip: 'Modern models retain conversation history — there\'s no need to re-explain background in every message. Reuse the session instead of starting fresh.',
    savingPct: 25,
    detail: 'Re-sending the same system prompt or background document at every turn can easily double the token count of a long conversation. Keep the context window lean and leverage the model\'s memory.',
  },
  {
    id: 'cache_responses',
    icon: '💾',
    title: 'Cache Repeated Queries',
    tip: 'In automated pipelines, cache responses to identical queries. A cached response costs zero tokens.',
    savingPct: 60,
    detail: 'Many production AI workflows repeatedly ask the same questions (e.g. processing templated documents). Semantic caching — returning stored results for near-identical inputs — can eliminate the majority of API calls in high-volume pipelines.',
    reference: 'https://platform.openai.com/docs/guides/prompt-caching',
  },
  {
    id: 'batch_requests',
    icon: '📦',
    title: 'Batch Related Requests',
    tip: 'Instead of five separate API calls, ask for everything in one well-structured prompt. Each round trip carries overhead tokens for context and formatting.',
    savingPct: 20,
    detail: 'System messages and conversation headers are repeated for every independent call. Batching reduces per-request overhead and often allows the model to reason across sub-tasks more efficiently.',
  },
  {
    id: 'summarise_request',
    icon: '📋',
    title: 'Request Concise Outputs',
    tip: 'Ask for bullet points or a 3-sentence summary rather than full paragraphs when a summary suffices. Output tokens cost as much as input tokens.',
    savingPct: 40,
    detail: 'The default verbosity of large language models is a significant source of token waste. Explicit length constraints ("in 50 words or fewer", "bullet list only") reduce output tokens dramatically with minimal quality loss for most use-cases.',
  },
  {
    id: 'local_models',
    icon: '🏠',
    title: 'Run Local Models',
    tip: 'Tools like Ollama let you run efficient open-weight models (Phi-3, Llama 3.1 8B) on your own hardware — zero cloud tokens, and often better privacy.',
    savingPct: 100,
    detail: 'For private documents, repetitive internal tasks, or offline use cases, running a local model eliminates cloud API calls entirely. Modern quantised models run on a laptop with 16 GB RAM and are competitive with GPT-3.5 on many tasks.',
    reference: 'https://ollama.com',
  },
];

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
 * Generate future projection data points with optional exponential rate growth.
 *
 * With annualGrowthRate = 0 (default) the projection is linear (constant rate).
 * With annualGrowthRate > 0 the token-production rate itself grows by that
 * fraction each year — matching the observed hyper-exponential trajectory of
 * global AI inference and producing the classic "hockey stick" on a linear axis.
 *
 * @param {number} currentTokens    - tokens at `now`
 * @param {number} ratePerSec       - tokens per second at `now`
 * @param {number} months           - how many months to project
 * @param {Date}   [now]            - optional date override
 * @param {number} [annualGrowthRate] - fractional annual growth of ratePerSec
 *                                     (e.g. 0.5 = 50 % more tokens/sec each year)
 * @returns {Array<{ date: string, tokensT: number }>}
 */
function generateProjectionData(currentTokens, ratePerSec, months, now, annualGrowthRate) {
  if (
    typeof currentTokens !== 'number' ||
    typeof ratePerSec !== 'number' ||
    typeof months !== 'number' ||
    months < 0
  ) {
    return [];
  }
  const base = now instanceof Date ? now : new Date();
  const growth = typeof annualGrowthRate === 'number' && annualGrowthRate > 0
    ? annualGrowthRate
    : 0;
  const SECS_PER_YEAR = 365.25 * 24 * 3600;
  const data = [];
  for (let i = 0; i <= months; i++) {
    const d = new Date(base.getTime());
    d.setMonth(d.getMonth() + i);
    const elapsed = (d - base) / 1000; // seconds since base
    let additionalTokens;
    if (growth === 0) {
      additionalTokens = ratePerSec * elapsed;
    } else {
      // Integral of rate*(1+g)^(t/year) dt from 0 to elapsed:
      // = rate/k * ((1+g)^(elapsed/year) - 1)  where k = ln(1+g)/year
      const k = Math.log(1 + growth) / SECS_PER_YEAR;
      additionalTokens = (ratePerSec / k) * (Math.exp(k * elapsed) - 1);
    }
    data.push({
      date: d.toISOString().split('T')[0],
      tokensT: (currentTokens + additionalTokens) / 1e12,
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
 * Return a friendly "in X hours/days/months/years" string.
 * Supports hours and minutes for near-term milestones.
 * @param {Date|null} date
 * @param {Date}      [now]
 * @returns {string}
 */
function getTimeDelta(date, now) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const base = now instanceof Date ? now : new Date();
  const diff = date - base;
  if (diff <= 0) return 'Already passed';
  const totalSeconds = Math.floor(diff / 1000);
  const totalMinutes = Math.floor(diff / (1000 * 60));
  const totalHours   = Math.floor(diff / (1000 * 60 * 60));
  const days         = Math.floor(diff / (1000 * 60 * 60 * 24));
  const years        = Math.floor(days / 365);
  const months       = Math.floor(days / 30);
  if (years > 0)        return `in ~${years} year${years > 1 ? 's' : ''}`;
  if (months > 0)       return `in ~${months} month${months > 1 ? 's' : ''}`;
  if (days > 0)         return `in ~${days} day${days !== 1 ? 's' : ''}`;
  if (totalHours > 0)   return `in ~${totalHours} hour${totalHours !== 1 ? 's' : ''}`;
  if (totalMinutes > 0) return `in ~${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
  return `in ~${totalSeconds} second${totalSeconds !== 1 ? 's' : ''}`;
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
 * Return the estimated global AI inference rate (tokens/second) for a given date,
 * based on the piecewise RATE_SCHEDULE anchored to landmark AI events.
 * @param {Date} [date] - defaults to now
 * @returns {number} tokens per second
 */
function getRateAtDate(date) {
  const d = (date instanceof Date && !isNaN(date.getTime())) ? date : new Date();
  const ms = d.getTime();
  for (let i = RATE_SCHEDULE.length - 1; i >= 0; i--) {
    if (ms >= new Date(RATE_SCHEDULE[i].date).getTime()) {
      return RATE_SCHEDULE[i].ratePerSec;
    }
  }
  return RATE_SCHEDULE[0].ratePerSec;
}

/**
 * Calculate the collective daily environmental impact if a fraction of global users
 * consistently applies a token-saving tip.
 *
 * @param {number} savingPct      - 0–100, percentage of tokens saved per user per prompt
 * @param {number} percentOfUsers - 0–100, percentage of global users applying the tip
 * @param {number} [ratePerSec]   - tokens/sec globally (defaults to TOKENS_PER_SECOND)
 * @returns {{ tokensPerDay: number, kWhPerDay: number, co2KgPerDay: number, waterLPerDay: number }}
 */
function calculateTipImpact(savingPct, percentOfUsers, ratePerSec) {
  const rate = typeof ratePerSec === 'number' && ratePerSec > 0
    ? ratePerSec
    : TOKENS_PER_SECOND;
  if (
    typeof savingPct !== 'number' || savingPct < 0 ||
    typeof percentOfUsers !== 'number' || percentOfUsers < 0
  ) {
    return { tokensPerDay: 0, kWhPerDay: 0, co2KgPerDay: 0, waterLPerDay: 0 };
  }
  const tokensPerDay = rate * 86400; // 86400 seconds/day
  const saved = tokensPerDay * (Math.min(savingPct, 100) / 100) * (Math.min(percentOfUsers, 100) / 100);
  const impact = calculateEnvironmentalImpact(saved);
  return {
    tokensPerDay: saved,
    kWhPerDay:    impact.kWh,
    co2KgPerDay:  impact.co2Kg,
    waterLPerDay: impact.waterL,
  };
}

// ============================================================
// FUN FEATURE HELPERS
// ============================================================

/**
 * Internal compact number formatter used by equivalence helpers.
 * NOT exported — used only within this module.
 * @param {number} n
 * @returns {string}
 */
function _niceFmt(n) {
  if (typeof n !== 'number' || isNaN(n) || !isFinite(n)) return '0';
  const v = Math.max(0, n);
  if (v >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + ' billion';
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + ' million';
  if (v >= 1e3) return Math.round(v / 1e3) + 'K';
  if (v < 0.001) return '< 0.001';
  if (v < 1) return v.toFixed(3).replace(/\.?0+$/, '');
  return Math.round(v).toString();
}

/**
 * Generate a list of "what we could have done instead" equivalences for a
 * given cumulative token count.
 * @param {number}              tokens - cumulative token count
 * @param {'hopeful'|'snarky'} [mode='hopeful']
 * @returns {Array<{ icon: string, text: string }>}
 */
function generateEquivalences(tokens, mode) {
  if (typeof tokens !== 'number' || tokens < 0) return [];
  const { kWh, co2Kg, waterL, treesEquivalent } = calculateEnvironmentalImpact(tokens);
  const snarky = mode === 'snarky';
  return [
    {
      icon: '🏠',
      text: snarky
        ? `Kept ${_niceFmt(kWh / 10500)} fridges running while their owners argued about AI on social media`
        : `Powered ${_niceFmt(kWh / 10500)} homes for a year`,
    },
    {
      icon: '🚗',
      text: snarky
        ? `Charged ${_niceFmt(kWh / 75)} electric cars that will get stuck in AI-managed traffic`
        : `Fully charged ${_niceFmt(kWh / 75)} electric cars`,
    },
    {
      icon: '🏊',
      text: snarky
        ? `Filled ${_niceFmt(waterL / 2_500_000)} Olympic pools — for robots who can't swim`
        : `Filled ${_niceFmt(waterL / 2_500_000)} Olympic swimming pools`,
    },
    {
      icon: '☕',
      text: snarky
        ? `Wasted water for ${_niceFmt(waterL / 0.2)} cups of coffee that fuelled even more AI prompts`
        : `Brewed ${_niceFmt(waterL / 0.2)} cups of coffee`,
    },
    {
      icon: '🌳',
      text: snarky
        ? `Needed ${_niceFmt(treesEquivalent)} trees to offset — trees AI's data centres helped cut down`
        : `Offset by ${_niceFmt(treesEquivalent)} trees growing for a year`,
    },
    {
      icon: '📚',
      text: snarky
        ? `Generated ${_niceFmt(tokens / 90000)} novels' worth of text nobody asked for`
        : `Written the text of ${_niceFmt(tokens / 90000)} novels`,
    },
    {
      icon: '🚀',
      text: snarky
        ? `Burned the energy of ${_niceFmt(kWh / 1361)} rocket launches — to autocomplete emails`
        : `Equivalent to ${_niceFmt(kWh / 1361)} Falcon 9 rocket launches`,
    },
    {
      icon: '🏥',
      text: snarky
        ? `Used energy for ${_niceFmt(kWh / 20)} MRI machine-hours — to generate haiku about productivity`
        : `Run ${_niceFmt(kWh / 20)} MRI machine-hours`,
    },
  ];
}

/**
 * Calculate a personal weekly and annual AI usage footprint.
 * @param {number} promptsPerWeek
 * @param {number} tokensEach       - average tokens per prompt (input + output combined)
 * @param {number} modelMultiplier  - energy cost multiplier relative to GPT-3.5 baseline
 * @returns {{ weeklyTokens: number, weekly: object, annual: object, globalWeeklyCo2Kg: number }}
 */
function calculatePersonalFootprint(promptsPerWeek, tokensEach, modelMultiplier) {
  if (
    typeof promptsPerWeek  !== 'number' || promptsPerWeek  < 0 ||
    typeof tokensEach      !== 'number' || tokensEach      <= 0 ||
    typeof modelMultiplier !== 'number' || modelMultiplier <= 0
  ) {
    const zero = calculateEnvironmentalImpact(0);
    return { weeklyTokens: 0, weekly: zero, annual: zero, globalWeeklyCo2Kg: 0 };
  }
  const weeklyTokens      = promptsPerWeek * tokensEach * modelMultiplier;
  const weekly            = calculateEnvironmentalImpact(weeklyTokens);
  const annual            = calculateEnvironmentalImpact(weeklyTokens * 52);
  const globalWeeklyCo2Kg = weekly.co2Kg * 500_000_000; // ~500 M active AI users
  return { weeklyTokens, weekly, annual, globalWeeklyCo2Kg };
}

/**
 * Generate human-readable equivalence phrases for a session token count,
 * intended for social share text.
 * @param {number} sessionTokens - tokens consumed globally during the visitor's session
 * @returns {string[]}
 */
function sessionEquivalences(sessionTokens) {
  if (typeof sessionTokens !== 'number' || sessionTokens <= 0) return [];
  const { kWh, co2Kg, waterL } = calculateEnvironmentalImpact(sessionTokens);
  const list = [];
  const km      = co2Kg / 0.171;     // avg car emits 171 g CO₂/km
  if (km      >= 0.001) list.push('the CO₂ of driving '        + _niceFmt(km)           + ' km');
  const coffees = waterL / 0.2;      // 200 mL per cup
  if (coffees >= 0.01)  list.push('water for '                 + _niceFmt(coffees)      + ' cups of coffee');
  const charges = kWh / 0.015;       // 15 Wh per smartphone charge
  if (charges >= 0.01)  list.push('electricity for '           + _niceFmt(charges)      + ' phone charges');
  const novels  = sessionTokens / 90000; // average novel ≈ 90 k tokens
  if (novels  >= 0.001) list.push('enough text to fill '       + _niceFmt(novels)       + ' novels');
  return list;
}

// ============================================================
// ACCELERATOR GAME — Pure Helpers
// ============================================================

// ── Company Roles ─────────────────────────────────────────────────────────────
// Human job roles that can be "replaced" by AI in the Doom Accelerator game.
// Firing each role grants passive tokens/sec and costs Doom Points.
// Sorted ascending by cost for display order.
const COMPANY_ROLES = [
  { id: 'social_media_mgr', icon: '📱', name: 'Social Media Manager',  cost:    25, tps:       5_000, flavour: 'GPT handles the posts. And the engagement. And the existential dread.' },
  { id: 'copywriter',       icon: '✍️',  name: 'Copywriter',             cost:    50, tps:      15_000, flavour: '"Content" flows at 10,000 words/minute. Zero of them are original.' },
  { id: 'data_analyst',     icon: '📊', name: 'Data Analyst',           cost:   100, tps:      40_000, flavour: 'The model found 47 correlations. All in the deck. None actionable.' },
  { id: 'junior_dev',       icon: '💻', name: 'Junior Developer',       cost:   150, tps:      80_000, flavour: 'Writes its own tests. They all pass. Nothing works.' },
  { id: 'support_team',     icon: '🎧', name: 'Customer Support Team',  cost:   250, tps:     150_000, flavour: 'Response time: 0 ms. Empathy: undefined.' },
  { id: 'hr_manager',       icon: '📋', name: 'HR Manager',             cost:   500, tps:     300_000, flavour: 'The AI now fires the AI. Recursive efficiency unlocked.' },
  { id: 'cfo',              icon: '💰', name: 'Chief Financial Officer', cost: 1_500, tps:   1_000_000, flavour: 'Projections generated, reviewed, and approved by the same weights.' },
];

// ── AI Agents ─────────────────────────────────────────────────────────────────
// Passive token generators purchasable in the Doom Accelerator game.
// Multiple units of the same agent can be owned; counts stack linearly.
// Sorted ascending by cost for display order.
const AI_AGENTS = [
  { id: 'intern_bot',    icon: '🤖', name: 'ChatBot Intern',          cost:      5, tps:       1_000, flavour: 'Confidently wrong. Always available.' },
  { id: 'code_agent',    icon: '🐒', name: 'Code Monkey Agent',       cost:     30, tps:       8_000, flavour: "Opens issues about itself. Closes them. Does it again." },
  { id: 'content_farm',  icon: '🏭', name: 'Content Farm Instance',   cost:    150, tps:      50_000, flavour: '10,000 SEO articles/hr. Zero readers.' },
  { id: 'token_maxxer',  icon: '📈', name: 'Token Maxxer v1',         cost:    500, tps:     200_000, flavour: 'Optimises prompts to be longer, somehow.' },
  { id: 'vibe_coder',    icon: '🎵', name: 'Vibe Coding Engine',      cost:  2_000, tps:     900_000, flavour: "Doesn't compile. Vibes immaculate." },
  { id: 'ai_consultant', icon: '💼', name: 'AI Strategy Consultant',  cost:  8_000, tps:   4_000_000, flavour: '200 slide decks/sec. 0 actionable insights.' },
];

// Company stage progression ordered by minimum workers replaced.
const COMPANY_STAGES = [
  { minReplaced: 0, name: 'Garage Startup',        icon: '🌱' },
  { minReplaced: 1, name: 'AI-Curious Disruptor',  icon: '🚀' },
  { minReplaced: 3, name: 'AI-First Pivot',         icon: '🤖' },
  { minReplaced: 5, name: 'AI-Native Company',      icon: '🏢' },
  { minReplaced: 7, name: 'Fully Automated Corp',   icon: '☠️'  },
];

/**
 * Compute the total passive token generation rate (tokens/sec) from owned AI
 * agents and fired (replaced) company roles.
 *
 * @param {Object} ownedAgents   - { agentId: count }  (non-integer counts are floored)
 * @param {Object} replacedRoles - { roleId: true }
 * @returns {number}               tokens per second
 */
function computePassiveRate(ownedAgents, replacedRoles) {
  const agents = (typeof ownedAgents  === 'object' && ownedAgents  !== null) ? ownedAgents  : {};
  const roles  = (typeof replacedRoles === 'object' && replacedRoles !== null) ? replacedRoles : {};
  let rate = 0;
  AI_AGENTS.forEach((a) => {
    const count = Number.isFinite(agents[a.id]) ? Math.max(0, Math.floor(agents[a.id])) : 0;
    rate += count * a.tps;
  });
  COMPANY_ROLES.forEach((r) => {
    if (roles[r.id]) rate += r.tps;
  });
  return rate;
}

/**
 * Return the current company stage for the given number of replaced workers.
 *
 * @param {number} workersReplaced
 * @returns {{ minReplaced: number, name: string, icon: string }}
 */
function getCompanyStage(workersReplaced) {
  const count = (typeof workersReplaced === 'number' && isFinite(workersReplaced))
    ? Math.max(0, Math.floor(workersReplaced))
    : 0;
  let stage = COMPANY_STAGES[0];
  for (const s of COMPANY_STAGES) {
    if (count >= s.minReplaced) stage = s;
  }
  return stage;
}

/**
 * All possible session challenge definitions.
 * Each entry: { id, icon, label, desc, type, target, rewardDp }
 * type: 'taps' | 'tokens' | 'combo' | 'speed' | 'upgrade' | 'co2'
 */
const SESSION_CHALLENGE_DEFS = [
  { id: 'rapid_fire',    icon: '👆', label: 'Rapid Fire',         desc: 'Tap 100 times',                                      type: 'taps',    target: 100,   rewardDp: 200  },
  { id: 'billionaire',   icon: '💎', label: 'Token Billionaire',  desc: 'Contribute 1 billion personal tokens',               type: 'tokens',  target: 1e9,   rewardDp: 100  },
  { id: 'trillion',      icon: '💰', label: 'Trillion Touched',   desc: 'Contribute 1 trillion personal tokens',              type: 'tokens',  target: 1e12,  rewardDp: 1000 },
  { id: 'combo_king',    icon: '🔥', label: 'Combo King',         desc: 'Hit 10× combo 3 times',                              type: 'combo',   target: 3,     rewardDp: 500  },
  { id: 'speed_demon',   icon: '⚡', label: 'Speed Demon',        desc: 'Tap 50 times in under 10 seconds',                   type: 'speed',   target: 50,    rewardDp: 500  },
  { id: 'first_upgrade', icon: '🛒', label: 'Consumer Capitalism',desc: 'Purchase your first upgrade',                        type: 'upgrade', target: 1,     rewardDp: 50   },
  { id: 'carbon_sprint', icon: '💨', label: 'Carbon Sprint',      desc: 'Generate 1 tonne CO₂-equivalent in one session',    type: 'co2',     target: 1000,  rewardDp: 750  },
];

/**
 * Return the first personal milestone that the player has not yet crossed.
 * @param {number} personalTokens
 * @param {Array}  milestones
 * @returns {Object|null}
 */
function getNextMilestoneForPlayer(personalTokens, milestones) {
  if (typeof personalTokens !== 'number' || !Array.isArray(milestones)) return null;
  return milestones.find((m) => personalTokens < m.tokens) || null;
}

/**
 * Calculate the combo multiplier based on recent tap timestamps.
 * Counts taps within the last 1,000 ms of the most recent tap, capped at 10.
 * @param {number[]} tapTimestamps - array of epoch-ms tap times (oldest first)
 * @returns {number} integer 1–10
 */
function computeComboMultiplier(tapTimestamps) {
  if (!Array.isArray(tapTimestamps) || tapTimestamps.length === 0) return 1;
  const latest = tapTimestamps[tapTimestamps.length - 1];
  if (typeof latest !== 'number' || !isFinite(latest)) return 1;
  const cutoff = latest - 1000;
  const recent = tapTimestamps.filter((t) => typeof t === 'number' && t >= cutoff);
  return Math.min(10, Math.max(1, recent.length));
}

/**
 * Return 3 session challenges selected deterministically from SESSION_CHALLENGE_DEFS
 * using a daily seed (changes once per UTC day).
 * @param {number} [seedMs] - seed timestamp in ms (defaults to Date.now())
 * @returns {Array<Object>} exactly 3 challenge definition objects
 */
function getSessionChallenges(seedMs) {
  const ts = typeof seedMs === 'number' && isFinite(seedMs) ? seedMs : Date.now();
  const dayBucket = Math.abs(Math.floor(ts / 86400000));
  const start = dayBucket % SESSION_CHALLENGE_DEFS.length;
  const result = [];
  for (let i = 0; i < 3; i++) {
    result.push(SESSION_CHALLENGE_DEFS[(start + i) % SESSION_CHALLENGE_DEFS.length]);
  }
  return result;
}

/**
 * Format a Doom Points value into a human-readable string.
 * @param {number} dp
 * @returns {string}
 */
function formatDoomPoints(dp) {
  if (typeof dp !== 'number' || isNaN(dp) || dp < 0) return '0 DP';
  if (dp >= 1e6) return (dp / 1e6).toFixed(1).replace(/\.0$/, '') + 'M DP';
  if (dp >= 1e3) return (dp / 1e3).toFixed(1).replace(/\.0$/, '') + 'K DP';
  return Math.round(dp) + ' DP';
}

/**
 * Return a deterministic simulated viewer count for a given timestamp.
 *
 * The value is based on:
 *   - Time of day (UTC): peaks ~14:00, troughs ~03:00
 *   - Day of week: weekdays run ~1.25× weekends
 *   - A low-frequency sine variation (~1.8-hour cycle) for organic jitter
 *
 * The result is snapped to the nearest 5, minimum 12, and never requires
 * a network request.
 *
 * @param {number} [dateMs] - epoch milliseconds (defaults to Date.now())
 * @returns {number}          simulated concurrent viewers
 */
function getSimulatedViewerCount(dateMs) {
  const ms = typeof dateMs === 'number' && isFinite(dateMs) ? dateMs : Date.now();
  const d   = new Date(ms);
  const hr  = d.getUTCHours();
  const dow = d.getUTCDay(); // 0 = Sun, 6 = Sat

  // Hour multiplier: sinusoidal with peak at 14:00 UTC, trough at 03:00 UTC
  // Maps the 24-hour clock to [0, 2π] with peak at hr=14 → angle=π
  const hourAngle = ((hr - 3 + 24) % 24) * (Math.PI / 12);
  const hourMult  = 0.25 + 0.75 * Math.max(0, Math.sin(hourAngle));

  // Weekday / weekend multiplier
  const dayMult = (dow === 0 || dow === 6) ? 0.65 : 1.0;

  // Low-frequency organic jitter: ~1.8-hour period (6480000 ms)
  const organic = 1 + 0.12 * Math.sin(ms / 6480000);

  const raw = Math.round(165 * hourMult * dayMult * organic);

  // Snap to nearest 5, minimum 12
  return Math.max(12, Math.round(raw / 5) * 5);
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
  RATE_SCHEDULE,
  SESSION_CHALLENGE_DEFS,
  TOKEN_TIPS,
  COMPANY_ROLES,
  AI_AGENTS,
  COMPANY_STAGES,
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
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeathClockCore;
} else if (typeof window !== 'undefined') {
  window.DeathClockCore = DeathClockCore;
}

})();
