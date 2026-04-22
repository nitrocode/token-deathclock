'use strict';

// ============================================================
// AI DEATH CLOCK — Core Logic
// Pure functions with no DOM dependencies — safe for unit testing
// ============================================================

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
// EXPORTS — CommonJS for Jest; window global for the browser
// ============================================================
const DeathClockCore = {
  BASE_TOKENS,
  TOKENS_PER_SECOND,
  BASE_DATE_ISO,
  HISTORICAL_DATA,
  MILESTONES,
  RATE_SCHEDULE,
  TOKEN_TIPS,
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
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeathClockCore;
} else if (typeof window !== 'undefined') {
  window.DeathClockCore = DeathClockCore;
}
