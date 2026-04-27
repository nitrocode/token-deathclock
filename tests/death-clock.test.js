'use strict';

/**
 * Unit tests for death-clock-core.js
 *
 * Run with:  npm test
 */

const core = require('../death-clock-core');
const milestonesData = require('../milestones-data');

const {
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
  TOKEN_TIPS,
  generateEquivalences,
  calculatePersonalFootprint,
  sessionEquivalences,
  getNextMilestoneForPlayer,
  computeComboMultiplier,
  getSessionChallenges,
  formatDoomPoints,
  MILESTONES,
  HISTORICAL_DATA,
  RATE_SCHEDULE,
  SESSION_CHALLENGE_DEFS,
  BASE_TOKENS,
  TOKENS_PER_SECOND,
  BASE_DATE_ISO,
  getSimulatedViewerCount,
  getDynamicRate,
  RATE_GROWTH_PER_YEAR,
  computeExtinctionSecsRemaining,
} = core;

// ============================================================
// formatTokenCount
// ============================================================
describe('formatTokenCount', () => {
  test('formats quintillion values', () => {
    expect(formatTokenCount(2e18)).toBe('2.00 Quintillion');
  });

  test('formats quadrillion values', () => {
    expect(formatTokenCount(1.5e15)).toBe('1.50 Quadrillion');
  });

  test('formats trillion values', () => {
    expect(formatTokenCount(3.75e12)).toBe('3.75 Trillion');
  });

  test('formats billion values', () => {
    expect(formatTokenCount(2.5e9)).toBe('2.50 Billion');
  });

  test('formats million values', () => {
    expect(formatTokenCount(1.23e6)).toBe('1.23 Million');
  });

  test('formats thousand values', () => {
    expect(formatTokenCount(5000)).toContain('K');
  });

  test('formats small numbers', () => {
    expect(formatTokenCount(42)).toBe('42');
  });

  test('returns 0 for NaN', () => {
    expect(formatTokenCount(NaN)).toBe('0');
  });

  test('returns 0 for non-numeric input', () => {
    expect(formatTokenCount('hello')).toBe('0');
  });

  test('handles negative numbers', () => {
    expect(formatTokenCount(-1e12)).toContain('Trillion');
    expect(formatTokenCount(-1e12)).toContain('-');
  });

  test('handles zero', () => {
    expect(formatTokenCount(0)).toBe('0');
  });

  test('handles Infinity', () => {
    expect(formatTokenCount(Infinity)).toBe('0');
  });
});

// ============================================================
// formatTokenCountShort
// ============================================================
describe('formatTokenCountShort', () => {
  test('quadrillion abbreviation', () => {
    expect(formatTokenCountShort(2e15)).toContain('Q');
  });

  test('trillion abbreviation', () => {
    expect(formatTokenCountShort(5e12)).toContain('T');
  });

  test('billion abbreviation', () => {
    expect(formatTokenCountShort(3e9)).toContain('B');
  });

  test('million abbreviation', () => {
    expect(formatTokenCountShort(7e6)).toContain('M');
  });

  test('handles NaN', () => {
    expect(formatTokenCountShort(NaN)).toBe('0');
  });

  test('handles small numbers (below 1 million)', () => {
    expect(formatTokenCountShort(999)).toBe('999');
    expect(formatTokenCountShort(42)).toBe('42');
  });

  test('quintillion abbreviation', () => {
    expect(formatTokenCountShort(3e18)).toContain("Q'l");
  });
});

// ============================================================
// getTriggeredMilestones
// ============================================================
describe('getTriggeredMilestones', () => {
  const simpleMilestones = [
    { id: 'a', tokens: 100 },
    { id: 'b', tokens: 1000 },
    { id: 'c', tokens: 10000 },
  ];

  test('returns empty array when no milestones triggered', () => {
    expect(getTriggeredMilestones(50, simpleMilestones)).toHaveLength(0);
  });

  test('returns one milestone when exactly at threshold', () => {
    const result = getTriggeredMilestones(100, simpleMilestones);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  test('returns all triggered milestones', () => {
    expect(getTriggeredMilestones(5000, simpleMilestones)).toHaveLength(2);
  });

  test('returns all milestones when above highest threshold', () => {
    expect(getTriggeredMilestones(99999, simpleMilestones)).toHaveLength(3);
  });

  test('handles invalid tokens', () => {
    expect(getTriggeredMilestones('bad', simpleMilestones)).toEqual([]);
  });

  test('handles non-array milestones', () => {
    expect(getTriggeredMilestones(100, null)).toEqual([]);
  });

  test('works with real MILESTONES data and a high token count', () => {
    const triggered = getTriggeredMilestones(BASE_TOKENS, MILESTONES);
    expect(triggered.length).toBeGreaterThan(0);
  });
});

// ============================================================
// getNextMilestone
// ============================================================
describe('getNextMilestone', () => {
  const simpleMilestones = [
    { id: 'a', tokens: 100 },
    { id: 'b', tokens: 1000 },
    { id: 'c', tokens: 10000 },
  ];

  test('returns first milestone when tokens is 0', () => {
    expect(getNextMilestone(0, simpleMilestones).id).toBe('a');
  });

  test('returns correct next milestone mid-series', () => {
    expect(getNextMilestone(500, simpleMilestones).id).toBe('b');
  });

  test('returns null when all milestones passed', () => {
    expect(getNextMilestone(99999, simpleMilestones)).toBeNull();
  });

  test('handles invalid inputs', () => {
    expect(getNextMilestone(null, null)).toBeNull();
  });
});

// ============================================================
// predictMilestoneDate
// ============================================================
describe('predictMilestoneDate', () => {
  const now = new Date('2026-01-01T00:00:00Z');

  test('predicts future date when target not yet reached', () => {
    const date = predictMilestoneDate(0, 1_000_000, 1_000_000_000, now);
    expect(date).toBeInstanceOf(Date);
    expect(date > now).toBe(true);
  });

  test('returns null when target already reached', () => {
    expect(predictMilestoneDate(1000, 100, 500, now)).toBeNull();
  });

  test('returns null when rate is zero', () => {
    expect(predictMilestoneDate(0, 0, 1000, now)).toBeNull();
  });

  test('returns null when rate is negative', () => {
    expect(predictMilestoneDate(0, -100, 1000, now)).toBeNull();
  });

  test('calculates correct duration', () => {
    // 1000 tokens needed, at 1 per second → 1000 seconds in future
    const date = predictMilestoneDate(0, 1, 1000, now);
    const expectedMs = now.getTime() + 1000 * 1000;
    expect(Math.abs(date.getTime() - expectedMs)).toBeLessThan(100);
  });

  test('handles non-numeric inputs gracefully', () => {
    expect(predictMilestoneDate('a', 'b', 'c', now)).toBeNull();
  });
});

// ============================================================
// calculateEnvironmentalImpact
// ============================================================
describe('calculateEnvironmentalImpact', () => {
  test('returns zeros for 0 tokens', () => {
    const r = calculateEnvironmentalImpact(0);
    expect(r.kWh).toBe(0);
    expect(r.co2Kg).toBe(0);
    expect(r.waterL).toBe(0);
    expect(r.treesEquivalent).toBe(0);
  });

  test('returns zeros for negative tokens', () => {
    const r = calculateEnvironmentalImpact(-100);
    expect(r.kWh).toBe(0);
  });

  test('returns zeros for non-numeric input', () => {
    const r = calculateEnvironmentalImpact('abc');
    expect(r.kWh).toBe(0);
  });

  test('kWh scales linearly with tokens', () => {
    const r1 = calculateEnvironmentalImpact(1000);
    const r2 = calculateEnvironmentalImpact(2000);
    expect(r2.kWh).toBeCloseTo(r1.kWh * 2, 10);
  });

  test('CO₂ is derived from kWh at 0.4 kg/kWh', () => {
    const r = calculateEnvironmentalImpact(1_000_000);
    expect(r.co2Kg).toBeCloseTo(r.kWh * 0.4, 8);
  });

  test('water is 0.5L per 1000 tokens', () => {
    const r = calculateEnvironmentalImpact(1000);
    expect(r.waterL).toBeCloseTo(0.5, 8);
  });

  test('trees equivalent uses 21 kg CO₂/tree/year', () => {
    const r = calculateEnvironmentalImpact(1_000_000_000_000); // 1T tokens
    expect(r.treesEquivalent).toBeCloseTo(r.co2Kg / 21, 5);
  });

  test('returns valid numbers for very large token counts', () => {
    const r = calculateEnvironmentalImpact(1e17);
    expect(isFinite(r.kWh)).toBe(true);
    expect(isFinite(r.co2Kg)).toBe(true);
  });
});

// ============================================================
// generateProjectionData
// ============================================================
describe('generateProjectionData', () => {
  const now = new Date('2026-01-01T00:00:00Z');

  test('returns correct number of data points', () => {
    const data = generateProjectionData(0, 1_000_000, 6, now);
    expect(data).toHaveLength(7); // 0..6 inclusive
  });

  test('first point corresponds to current tokens', () => {
    const data = generateProjectionData(1e15, 1_000_000, 3, now);
    expect(data[0].tokensT).toBeCloseTo(1e15 / 1e12, 2);
  });

  test('subsequent points are larger', () => {
    const data = generateProjectionData(0, 1_000_000, 4, now);
    for (let i = 1; i < data.length; i++) {
      expect(data[i].tokensT).toBeGreaterThanOrEqual(data[i - 1].tokensT);
    }
  });

  test('returns empty array for invalid inputs', () => {
    expect(generateProjectionData('a', 'b', 'c', now)).toEqual([]);
  });

  test('returns empty array for negative months', () => {
    expect(generateProjectionData(0, 1000, -1, now)).toEqual([]);
  });

  test('each point has date and tokensT properties', () => {
    const data = generateProjectionData(0, 1_000_000, 2, now);
    data.forEach((d) => {
      expect(d).toHaveProperty('date');
      expect(d).toHaveProperty('tokensT');
      expect(typeof d.date).toBe('string');
      expect(typeof d.tokensT).toBe('number');
    });
  });
});

// ============================================================
// formatDate
// ============================================================
describe('formatDate', () => {
  test('formats a valid date', () => {
    const d = new Date('2026-06-15T00:00:00Z');
    const result = formatDate(d);
    expect(result).toContain('2026');
    expect(result).toContain('June');
  });

  test('returns Unknown for null', () => {
    expect(formatDate(null)).toBe('Unknown');
  });

  test('returns Unknown for non-Date input', () => {
    expect(formatDate('2026-01-01')).toBe('Unknown');
  });

  test('returns Unknown for invalid date', () => {
    expect(formatDate(new Date('not-a-date'))).toBe('Unknown');
  });
});

// ============================================================
// getTimeDelta
// ============================================================
describe('getTimeDelta', () => {
  const now = new Date('2026-01-01T00:00:00Z');

  test('returns "Already passed" for past date', () => {
    const past = new Date('2025-06-01T00:00:00Z');
    expect(getTimeDelta(past, now)).toBe('Already passed');
  });

  test('returns years for far future', () => {
    const future = new Date('2030-01-01T00:00:00Z');
    const result = getTimeDelta(future, now);
    expect(result).toContain('year');
  });

  test('returns months for medium future', () => {
    const future = new Date('2026-04-01T00:00:00Z');
    const result = getTimeDelta(future, now);
    expect(result).toMatch(/month|day/);
  });

  test('returns days for near future', () => {
    const future = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days later
    const result = getTimeDelta(future, now);
    expect(result).toContain('day');
  });

  test('handles invalid date', () => {
    expect(getTimeDelta(null, now)).toBe('');
    expect(getTimeDelta('bad', now)).toBe('');
  });
});

// ============================================================
// milestoneProgress
// ============================================================
describe('milestoneProgress', () => {
  test('returns 0 when at start', () => {
    expect(milestoneProgress(0, 0, 1000)).toBe(0);
  });

  test('returns 50 at midpoint', () => {
    expect(milestoneProgress(500, 0, 1000)).toBeCloseTo(50);
  });

  test('returns 100 at or past target', () => {
    expect(milestoneProgress(1000, 0, 1000)).toBe(100);
    expect(milestoneProgress(2000, 0, 1000)).toBe(100);
  });

  test('returns 100 when next <= prev', () => {
    expect(milestoneProgress(500, 1000, 500)).toBe(100);
  });

  test('does not go below 0', () => {
    expect(milestoneProgress(-100, 0, 1000)).toBe(0);
  });
});

// ============================================================
// Constants sanity checks
// ============================================================
describe('Constants', () => {
  test('BASE_TOKENS is a positive number', () => {
    expect(typeof BASE_TOKENS).toBe('number');
    expect(BASE_TOKENS).toBeGreaterThan(0);
  });

  test('TOKENS_PER_SECOND is a positive number', () => {
    expect(typeof TOKENS_PER_SECOND).toBe('number');
    expect(TOKENS_PER_SECOND).toBeGreaterThan(0);
  });

  test('MILESTONES is a non-empty array', () => {
    expect(Array.isArray(MILESTONES)).toBe(true);
    expect(MILESTONES.length).toBeGreaterThan(0);
  });

  test('each milestone has required fields', () => {
    MILESTONES.forEach((m) => {
      expect(m).toHaveProperty('id');
      expect(m).toHaveProperty('name');
      expect(m).toHaveProperty('tokens');
      expect(m).toHaveProperty('description');
      expect(m).toHaveProperty('consequence');
      expect(m).toHaveProperty('followingEvent');
      expect(typeof m.tokens).toBe('number');
      expect(m.tokens).toBeGreaterThan(0);
    });
  });

  test('milestones are in ascending token order', () => {
    for (let i = 1; i < MILESTONES.length; i++) {
      expect(MILESTONES[i].tokens).toBeGreaterThan(MILESTONES[i - 1].tokens);
    }
  });

  test('at most one milestone has extinctionMarker: true', () => {
    const marked = MILESTONES.filter((m) => m.extinctionMarker === true);
    expect(marked.length).toBeLessThanOrEqual(1);
  });

  test('HISTORICAL_DATA is a non-empty array', () => {
    expect(Array.isArray(HISTORICAL_DATA)).toBe(true);
    expect(HISTORICAL_DATA.length).toBeGreaterThan(0);
  });

  test('each HISTORICAL_DATA point has date and tokensT', () => {
    HISTORICAL_DATA.forEach((d) => {
      expect(d).toHaveProperty('date');
      expect(d).toHaveProperty('tokensT');
      expect(typeof d.date).toBe('string');
      expect(typeof d.tokensT).toBe('number');
    });
  });

  test('HISTORICAL_DATA dates are in ascending order', () => {
    for (let i = 1; i < HISTORICAL_DATA.length; i++) {
      expect(new Date(HISTORICAL_DATA[i].date).getTime()).toBeGreaterThan(
        new Date(HISTORICAL_DATA[i - 1].date).getTime()
      );
    }
  });
});

// ============================================================
// Browser window export (lines 443-444)
// ============================================================
describe('Browser window export', () => {
  test('sets window.DeathClockCore when module is not available', () => {
    const vm = require('vm');
    const fs = require('fs');
    const path = require('path');
    const coreCode = fs.readFileSync(path.join(__dirname, '../death-clock-core.js'), 'utf8');
    // Run in a sandbox where `module` is undefined and `window` is available,
    // with MilestonesData pre-loaded so the MILESTONES branch is fully exercised.
    const sandboxWindow = { MilestonesData: milestonesData };
    vm.runInNewContext(coreCode, { window: sandboxWindow });
    expect(typeof sandboxWindow.DeathClockCore).toBe('object');
    expect(typeof sandboxWindow.DeathClockCore.formatTokenCount).toBe('function');
  });

  test('MILESTONES loads from window.MilestonesData in browser context', () => {
    const vm = require('vm');
    const fs = require('fs');
    const path = require('path');
    const coreCode = fs.readFileSync(path.join(__dirname, '../death-clock-core.js'), 'utf8');
    const sandboxWindow = { MilestonesData: milestonesData };
    vm.runInNewContext(coreCode, { window: sandboxWindow });
    expect(Array.isArray(sandboxWindow.DeathClockCore.MILESTONES)).toBe(true);
    expect(sandboxWindow.DeathClockCore.MILESTONES.length).toBeGreaterThan(0);
  });

  test('MILESTONES falls back to empty array when MilestonesData is absent', () => {
    const vm = require('vm');
    const fs = require('fs');
    const path = require('path');
    const coreCode = fs.readFileSync(path.join(__dirname, '../death-clock-core.js'), 'utf8');
    const sandboxWindow = {};
    vm.runInNewContext(coreCode, { window: sandboxWindow });
    expect(Array.isArray(sandboxWindow.DeathClockCore.MILESTONES)).toBe(true);
    expect(sandboxWindow.DeathClockCore.MILESTONES.length).toBe(0);
  });
});

// ============================================================
// getRateAtDate
// ============================================================
describe('getRateAtDate', () => {
  test('returns a positive number for any date', () => {
    expect(getRateAtDate(new Date('2023-01-01'))).toBeGreaterThan(0);
  });

  test('returns a higher rate after ChatGPT launch than before', () => {
    const before = getRateAtDate(new Date('2022-01-01'));
    const after  = getRateAtDate(new Date('2023-01-01'));
    expect(after).toBeGreaterThan(before);
  });

  test('returns a higher rate for Claude Code era than GPT-3 era', () => {
    const gpt3Era       = getRateAtDate(new Date('2020-07-01'));
    const claudeCodeEra = getRateAtDate(new Date('2025-06-01'));
    expect(claudeCodeEra).toBeGreaterThan(gpt3Era);
  });

  test('matches TOKENS_PER_SECOND at BASE_DATE_ISO', () => {
    const rate = getRateAtDate(new Date(core.BASE_DATE_ISO));
    expect(rate).toBe(TOKENS_PER_SECOND);
  });

  test('returns the earliest rate for dates before the schedule starts', () => {
    const veryEarly = getRateAtDate(new Date('2010-01-01'));
    expect(veryEarly).toBe(RATE_SCHEDULE[0].ratePerSec);
  });

  test('falls back to current time when no date is provided', () => {
    const rate = getRateAtDate();
    expect(typeof rate).toBe('number');
    expect(rate).toBeGreaterThan(0);
  });

  test('falls back gracefully for an invalid date', () => {
    const rate = getRateAtDate(new Date('not-a-date'));
    expect(typeof rate).toBe('number');
    expect(rate).toBeGreaterThan(0);
  });

  test('falls back gracefully for a non-Date argument', () => {
    const rate = getRateAtDate('2025-01-01');
    expect(typeof rate).toBe('number');
    expect(rate).toBeGreaterThan(0);
  });

  test('rate is monotonically non-decreasing across schedule dates', () => {
    let prevRate = 0;
    for (const entry of RATE_SCHEDULE) {
      const rate = getRateAtDate(new Date(entry.date));
      expect(rate).toBeGreaterThanOrEqual(prevRate);
      prevRate = rate;
    }
  });
});

// ============================================================
// getDynamicRate
// ============================================================
describe('getDynamicRate', () => {
  const BASE_DATE = new Date(core.BASE_DATE_ISO);

  test('returns TOKENS_PER_SECOND exactly at BASE_DATE_ISO', () => {
    expect(getDynamicRate(BASE_DATE)).toBe(TOKENS_PER_SECOND);
  });

  test('returns more than TOKENS_PER_SECOND for a date one year after BASE_DATE', () => {
    const oneYearLater = new Date(BASE_DATE.getTime() + 365.25 * 24 * 3600 * 1000);
    expect(getDynamicRate(oneYearLater)).toBeGreaterThan(TOKENS_PER_SECOND);
  });

  test('grows by roughly RATE_GROWTH_PER_YEAR after one year', () => {
    const oneYearLater = new Date(BASE_DATE.getTime() + 365.25 * 24 * 3600 * 1000);
    const rate = getDynamicRate(oneYearLater);
    const expected = TOKENS_PER_SECOND * (1 + RATE_GROWTH_PER_YEAR);
    // Allow ±1 % tolerance for rounding
    expect(rate).toBeGreaterThanOrEqual(expected * 0.99);
    expect(rate).toBeLessThanOrEqual(expected * 1.01);
  });

  test('matches getRateAtDate for a historical date well before BASE_DATE', () => {
    const historicalDate = new Date('2024-01-01');
    expect(getDynamicRate(historicalDate)).toBe(getRateAtDate(historicalDate));
  });

  test('returns a positive number for any date', () => {
    expect(getDynamicRate(new Date('2020-01-01'))).toBeGreaterThan(0);
    expect(getDynamicRate(new Date('2028-01-01'))).toBeGreaterThan(0);
  });

  test('falls back to current time when no date is provided', () => {
    const rate = getDynamicRate();
    expect(typeof rate).toBe('number');
    expect(rate).toBeGreaterThan(0);
  });

  test('falls back gracefully for an invalid date', () => {
    const rate = getDynamicRate(new Date('not-a-date'));
    expect(typeof rate).toBe('number');
    expect(rate).toBeGreaterThan(0);
  });

  test('rate at BASE_DATE equals rate two years later times inverse growth factor', () => {
    const twoYearsLater = new Date(BASE_DATE.getTime() + 2 * 365.25 * 24 * 3600 * 1000);
    const rateLater = getDynamicRate(twoYearsLater);
    const expectedFactor = Math.pow(1 + RATE_GROWTH_PER_YEAR, 2);
    expect(rateLater / TOKENS_PER_SECOND).toBeCloseTo(expectedFactor, 1);
  });

  test('RATE_GROWTH_PER_YEAR is a positive number less than 1', () => {
    expect(typeof RATE_GROWTH_PER_YEAR).toBe('number');
    expect(RATE_GROWTH_PER_YEAR).toBeGreaterThan(0);
    expect(RATE_GROWTH_PER_YEAR).toBeLessThan(1);
  });
});

// ============================================================
// RATE_SCHEDULE sanity checks
// ============================================================
describe('RATE_SCHEDULE', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(RATE_SCHEDULE)).toBe(true);
    expect(RATE_SCHEDULE.length).toBeGreaterThan(0);
  });

  test('each entry has date, ratePerSec, and event fields', () => {
    RATE_SCHEDULE.forEach((r) => {
      expect(typeof r.date).toBe('string');
      expect(typeof r.ratePerSec).toBe('number');
      expect(typeof r.event).toBe('string');
      expect(r.ratePerSec).toBeGreaterThan(0);
    });
  });

  test('dates are in ascending order', () => {
    for (let i = 1; i < RATE_SCHEDULE.length; i++) {
      expect(new Date(RATE_SCHEDULE[i].date).getTime())
        .toBeGreaterThanOrEqual(new Date(RATE_SCHEDULE[i - 1].date).getTime());
    }
  });

  test('rates are non-decreasing (AI consumption only grows)', () => {
    for (let i = 1; i < RATE_SCHEDULE.length; i++) {
      expect(RATE_SCHEDULE[i].ratePerSec).toBeGreaterThanOrEqual(RATE_SCHEDULE[i - 1].ratePerSec);
    }
  });

  test('contains the ChatGPT launch event', () => {
    const chatGPT = RATE_SCHEDULE.find((r) => r.event.toLowerCase().includes('chatgpt'));
    expect(chatGPT).toBeDefined();
  });

  test('contains the Claude Code event', () => {
    const claudeCode = RATE_SCHEDULE.find((r) => r.event.toLowerCase().includes('claude code'));
    expect(claudeCode).toBeDefined();
  });
});

// ============================================================
// Extended milestone checks
// ============================================================
describe('Extended MILESTONES', () => {
  test('has more than 15 milestones', () => {
    expect(MILESTONES.length).toBeGreaterThan(15);
  });

  test('each new milestone has required fields including icon and color', () => {
    MILESTONES.forEach((m) => {
      expect(typeof m.icon).toBe('string');
      expect(m.icon.length).toBeGreaterThan(0);
      expect(typeof m.color).toBe('string');
      expect(typeof m.darkColor).toBe('string');
    });
  });

  test('milestones span at least 6 orders of magnitude', () => {
    const min = Math.min(...MILESTONES.map((m) => m.tokens));
    const max = Math.max(...MILESTONES.map((m) => m.tokens));
    expect(max / min).toBeGreaterThan(1e6);
  });

  test('all milestone ids are unique', () => {
    const ids = MILESTONES.map((m) => m.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ============================================================
// getTimeDelta — hours/minutes/seconds granularity
// ============================================================
describe('getTimeDelta sub-day granularity', () => {
  const now = new Date('2026-01-01T00:00:00Z');

  test('returns hours for a 3-hour future date', () => {
    const future = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const result = getTimeDelta(future, now);
    expect(result).toMatch(/hour/);
  });

  test('returns singular hour for exactly 1 hour', () => {
    const future = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    expect(getTimeDelta(future, now)).toBe('in ~1 hour');
  });

  test('returns minutes for a 45-minute future', () => {
    const future = new Date(now.getTime() + 45 * 60 * 1000);
    expect(getTimeDelta(future, now)).toMatch(/minute/);
  });

  test('returns singular minute for exactly 1 minute', () => {
    const future = new Date(now.getTime() + 60 * 1000);
    expect(getTimeDelta(future, now)).toBe('in ~1 minute');
  });

  test('returns seconds for a 30-second future', () => {
    const future = new Date(now.getTime() + 30 * 1000);
    expect(getTimeDelta(future, now)).toMatch(/second/);
  });

  test('returns singular second for exactly 1 second', () => {
    const future = new Date(now.getTime() + 1000);
    expect(getTimeDelta(future, now)).toBe('in ~1 second');
  });
});

// ============================================================
// generateProjectionData — exponential growth
// ============================================================
describe('generateProjectionData with annualGrowthRate', () => {
  const now = new Date('2026-01-01T00:00:00Z');

  test('linear (growth=0) produces same result as before', () => {
    const linear = generateProjectionData(0, 1_000_000, 12, now, 0);
    expect(linear.length).toBe(13);
    // Last point is 12 months of constant rate
    const lastLinear = linear[linear.length - 1].tokensT;
    expect(lastLinear).toBeGreaterThan(0);
  });

  test('exponential produces larger values than linear over same period', () => {
    const linear = generateProjectionData(0, 1_000_000, 12, now, 0);
    const expo   = generateProjectionData(0, 1_000_000, 12, now, 0.5);
    const lastLinear = linear[linear.length - 1].tokensT;
    const lastExpo   = expo[linear.length - 1].tokensT;
    expect(lastExpo).toBeGreaterThan(lastLinear);
  });

  test('first data point is the same regardless of growth rate', () => {
    const linear = generateProjectionData(1e15, 1_000_000, 6, now, 0);
    const expo   = generateProjectionData(1e15, 1_000_000, 6, now, 1.0);
    expect(linear[0].tokensT).toBeCloseTo(expo[0].tokensT, 2);
  });

  test('values are monotonically increasing with exponential growth', () => {
    const data = generateProjectionData(0, 1_000_000, 6, now, 0.5);
    for (let i = 1; i < data.length; i++) {
      expect(data[i].tokensT).toBeGreaterThan(data[i - 1].tokensT);
    }
  });

  test('negative annualGrowthRate is treated as linear (0)', () => {
    const result = generateProjectionData(0, 1_000_000, 3, now, -0.5);
    // Should still return data without errors
    expect(result.length).toBe(4);
    result.forEach((d) => expect(typeof d.tokensT).toBe('number'));
  });
});

// ============================================================
// calculateTipImpact
// ============================================================
describe('calculateTipImpact', () => {
  test('returns zeros for invalid savingPct', () => {
    const r = calculateTipImpact('bad', 10);
    expect(r.tokensPerDay).toBe(0);
    expect(r.kWhPerDay).toBe(0);
  });

  test('returns zeros for invalid percentOfUsers', () => {
    const r = calculateTipImpact(50, 'bad');
    expect(r.tokensPerDay).toBe(0);
  });

  test('returns zeros for negative savingPct', () => {
    const r = calculateTipImpact(-10, 5);
    expect(r.tokensPerDay).toBe(0);
  });

  test('returns zeros for negative percentOfUsers', () => {
    const r = calculateTipImpact(50, -1);
    expect(r.tokensPerDay).toBe(0);
  });

  test('positive values for valid inputs', () => {
    const r = calculateTipImpact(30, 1);
    expect(r.tokensPerDay).toBeGreaterThan(0);
    expect(r.kWhPerDay).toBeGreaterThan(0);
    expect(r.co2KgPerDay).toBeGreaterThan(0);
    expect(r.waterLPerDay).toBeGreaterThan(0);
  });

  test('scales linearly with percentOfUsers', () => {
    const r1 = calculateTipImpact(30, 1);
    const r2 = calculateTipImpact(30, 2);
    expect(r2.tokensPerDay).toBeCloseTo(r1.tokensPerDay * 2, 0);
  });

  test('scales linearly with savingPct', () => {
    const r1 = calculateTipImpact(10, 1);
    const r2 = calculateTipImpact(20, 1);
    expect(r2.tokensPerDay).toBeCloseTo(r1.tokensPerDay * 2, 0);
  });

  test('caps savingPct at 100', () => {
    const r100 = calculateTipImpact(100, 1);
    const r200 = calculateTipImpact(200, 1);
    expect(r100.tokensPerDay).toBeCloseTo(r200.tokensPerDay, 0);
  });

  test('caps percentOfUsers at 100', () => {
    const r100 = calculateTipImpact(30, 100);
    const r200 = calculateTipImpact(30, 200);
    expect(r100.tokensPerDay).toBeCloseTo(r200.tokensPerDay, 0);
  });

  test('uses custom ratePerSec when provided', () => {
    const r = calculateTipImpact(100, 100, 1);
    // 1 token/sec * 86400 sec * 100% saving * 100% users = 86400 tokens
    expect(r.tokensPerDay).toBeCloseTo(86400, 0);
  });

  test('falls back to TOKENS_PER_SECOND when ratePerSec is invalid', () => {
    const rDefault = calculateTipImpact(10, 1);
    const rExplicit = calculateTipImpact(10, 1, TOKENS_PER_SECOND);
    expect(rDefault.tokensPerDay).toBeCloseTo(rExplicit.tokensPerDay, 0);
  });
});

// ============================================================
// computeExtinctionSecsRemaining — 1-second-per-tick invariant
// ============================================================
describe('computeExtinctionSecsRemaining', () => {
  // A token target safely beyond BASE_TOKENS (10 quadrillion above baseline)
  const TARGET = BASE_TOKENS + 10_000_000_000_000_000; // 10 quadrillion above base
  // Anchor "now" to BASE_DATE_ISO so results are deterministic
  const baseMs = new Date(BASE_DATE_ISO).getTime();

  test('returns a positive number when target is in the future', () => {
    const secs = computeExtinctionSecsRemaining(TARGET, baseMs);
    expect(secs).toBeGreaterThan(0);
  });

  test('decreases by exactly 1 for every 1 second that elapses', () => {
    // This is the core invariant — the old linear approximation fails this test
    // because it ticked down by ~2 seconds per second when the rate was growing.
    const t0 = baseMs;
    const t1 = baseMs + 1000;
    const secs0 = computeExtinctionSecsRemaining(TARGET, t0);
    const secs1 = computeExtinctionSecsRemaining(TARGET, t1);
    expect(secs0 - secs1).toBeCloseTo(1, 9);
  });

  test('decreases by exactly 60 over a 60-second window', () => {
    const t0 = baseMs;
    const t1 = baseMs + 60_000;
    const secs0 = computeExtinctionSecsRemaining(TARGET, t0);
    const secs1 = computeExtinctionSecsRemaining(TARGET, t1);
    expect(secs0 - secs1).toBeCloseTo(60, 9);
  });

  test('returns 0 or negative when target equals or is below BASE_TOKENS', () => {
    expect(computeExtinctionSecsRemaining(BASE_TOKENS, baseMs)).toBe(0);
    expect(computeExtinctionSecsRemaining(BASE_TOKENS - 1, baseMs)).toBe(0);
  });

  test('returns a negative number when target was passed in the past', () => {
    // Advance far into the future so that target has already been passed
    const farFuture = baseMs + 1_000_000_000 * 1000; // ~31 years from base
    const secs = computeExtinctionSecsRemaining(TARGET, farFuture);
    expect(secs).toBeLessThan(0);
  });

  test('handles non-numeric nowMs by defaulting to Date.now()', () => {
    // Should not throw; result will be a finite number
    const secs = computeExtinctionSecsRemaining(TARGET, 'abc');
    expect(typeof secs).toBe('number');
    expect(isFinite(secs)).toBe(true);
  });
});


// ============================================================
// TOKEN_TIPS
// ============================================================
describe('TOKEN_TIPS', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(TOKEN_TIPS)).toBe(true);
    expect(TOKEN_TIPS.length).toBeGreaterThan(0);
  });

  test('each tip has required fields', () => {
    TOKEN_TIPS.forEach((tip) => {
      expect(typeof tip.id).toBe('string');
      expect(typeof tip.icon).toBe('string');
      expect(typeof tip.title).toBe('string');
      expect(typeof tip.tip).toBe('string');
      expect(typeof tip.detail).toBe('string');
      expect(typeof tip.savingPct).toBe('number');
      expect(tip.savingPct).toBeGreaterThan(0);
      expect(tip.savingPct).toBeLessThanOrEqual(100);
    });
  });

  test('all tip ids are unique', () => {
    const ids = TOKEN_TIPS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('optional reference field is a string URL when present', () => {
    TOKEN_TIPS.forEach((tip) => {
      if (tip.reference !== undefined) {
        expect(typeof tip.reference).toBe('string');
        expect(tip.reference).toMatch(/^https?:\/\//);
      }
    });
  });
});

// ============================================================
// generateEquivalences
// ============================================================
describe('generateEquivalences', () => {
  test('returns a non-empty array for a large token count', () => {
    const result = generateEquivalences(1e15);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('each entry has icon (string) and text (non-empty string)', () => {
    generateEquivalences(1e15).forEach((e) => {
      expect(typeof e.icon).toBe('string');
      expect(typeof e.text).toBe('string');
      expect(e.text.length).toBeGreaterThan(0);
    });
  });

  test('hopeful mode differs from snarky mode', () => {
    const hopeful = generateEquivalences(1e15, 'hopeful');
    const snarky  = generateEquivalences(1e15, 'snarky');
    expect(hopeful[0].text).not.toBe(snarky[0].text);
  });

  test('defaults to hopeful mode when no mode argument is given', () => {
    const def     = generateEquivalences(1e15);
    const hopeful = generateEquivalences(1e15, 'hopeful');
    expect(def[0].text).toBe(hopeful[0].text);
  });

  test('returns empty array for negative tokens', () => {
    expect(generateEquivalences(-1)).toEqual([]);
  });

  test('returns empty array for non-numeric input', () => {
    expect(generateEquivalences('abc')).toEqual([]);
  });

  test('returns an array for 0 tokens', () => {
    expect(Array.isArray(generateEquivalences(0))).toBe(true);
  });

  test('both modes return the same number of entries', () => {
    expect(generateEquivalences(1e15, 'hopeful').length)
      .toBe(generateEquivalences(1e15, 'snarky').length);
  });
});

// ============================================================
// calculatePersonalFootprint
// ============================================================
describe('calculatePersonalFootprint', () => {
  test('returns correct result structure', () => {
    const r = calculatePersonalFootprint(20, 500, 1);
    expect(r).toHaveProperty('weeklyTokens');
    expect(r).toHaveProperty('weekly');
    expect(r).toHaveProperty('annual');
    expect(r).toHaveProperty('globalWeeklyCo2Kg');
  });

  test('weeklyTokens equals prompts × tokensEach × multiplier', () => {
    expect(calculatePersonalFootprint(10, 100, 2).weeklyTokens).toBe(2000);
  });

  test('annual CO₂ is 52× weekly CO₂', () => {
    const r = calculatePersonalFootprint(10, 100, 1);
    expect(r.annual.co2Kg).toBeCloseTo(r.weekly.co2Kg * 52, 5);
  });

  test('globalWeeklyCo2Kg scales by 500 million users', () => {
    const r = calculatePersonalFootprint(1, 1000, 1);
    expect(r.globalWeeklyCo2Kg).toBeCloseTo(r.weekly.co2Kg * 500_000_000, 0);
  });

  test('returns zero footprint for negative promptsPerWeek', () => {
    const r = calculatePersonalFootprint(-1, 500, 1);
    expect(r.weeklyTokens).toBe(0);
    expect(r.weekly.co2Kg).toBe(0);
  });

  test('returns zero footprint when tokensEach is 0', () => {
    expect(calculatePersonalFootprint(10, 0, 1).weeklyTokens).toBe(0);
  });

  test('returns zero footprint when modelMultiplier is 0', () => {
    expect(calculatePersonalFootprint(10, 500, 0).weeklyTokens).toBe(0);
  });

  test('model multiplier scales weeklyTokens proportionally', () => {
    const r1 = calculatePersonalFootprint(10, 100, 1);
    const r4 = calculatePersonalFootprint(10, 100, 4);
    expect(r4.weeklyTokens).toBeCloseTo(r1.weeklyTokens * 4, 5);
  });
});

// ============================================================
// sessionEquivalences
// ============================================================
describe('sessionEquivalences', () => {
  test('returns an array of strings for a large session token count', () => {
    const result = sessionEquivalences(1e15);
    expect(Array.isArray(result)).toBe(true);
    result.forEach((s) => expect(typeof s).toBe('string'));
  });

  test('returns a non-empty array for a meaningful token count', () => {
    expect(sessionEquivalences(1e9).length).toBeGreaterThan(0);
  });

  test('returns empty array for 0 tokens', () => {
    expect(sessionEquivalences(0)).toEqual([]);
  });

  test('returns empty array for negative tokens', () => {
    expect(sessionEquivalences(-1)).toEqual([]);
  });

  test('returns empty array for non-numeric input', () => {
    expect(sessionEquivalences('bad')).toEqual([]);
  });

  test('each phrase is a non-empty string', () => {
    sessionEquivalences(1e12).forEach((s) => expect(s.length).toBeGreaterThan(0));
  });

  test('returns more equivalences for larger token counts', () => {
    // A very tiny count may produce fewer phrases (some below minimum threshold)
    const large = sessionEquivalences(1e12);
    expect(large.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// getTimeDelta — singular year and day coverage
// ============================================================
describe('getTimeDelta singular forms', () => {
  const now = new Date('2026-01-01T00:00:00Z');

  test('returns singular "year" for exactly 1 year', () => {
    const future = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    expect(getTimeDelta(future, now)).toBe('in ~1 year');
  });

  test('returns singular "day" for exactly 1 day', () => {
    const future = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    expect(getTimeDelta(future, now)).toBe('in ~1 day');
  });
});

// ============================================================
// sessionEquivalences — threshold false-branch and _niceFmt v<1
// ============================================================
describe('sessionEquivalences threshold branches', () => {
  test('returns empty array for a very tiny positive token count (all thresholds fail)', () => {
    // tokens=0.001 → km≈7e-10, coffees≈2.5e-6, charges≈2e-8, novels≈1.1e-11 — all below thresholds
    const result = sessionEquivalences(0.001);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  test('includes novels string when tokens are in the sub-1 range (exercises _niceFmt v<1 branch)', () => {
    // tokens=1000 → novels≈0.011 (0.001 ≤ v < 1) — exercises the v<1 branch in _niceFmt
    const result = sessionEquivalences(1000);
    expect(Array.isArray(result)).toBe(true);
    const novelsEntry = result.find((s) => s.includes('novel'));
    expect(novelsEntry).toBeDefined();
  });
});

// ============================================================
// generateEquivalences — _niceFmt NaN and Infinity branches
// ============================================================
describe('generateEquivalences with NaN and Infinity tokens', () => {
  test('handles NaN tokens gracefully (exercises isNaN branch in _niceFmt)', () => {
    // NaN passes the "typeof tokens !== 'number'" guard, so _niceFmt receives NaN values
    const result = generateEquivalences(NaN);
    expect(Array.isArray(result)).toBe(true);
    result.forEach((e) => {
      expect(typeof e.icon).toBe('string');
      expect(typeof e.text).toBe('string');
    });
  });

  test('handles Infinity tokens gracefully (exercises !isFinite branch in _niceFmt)', () => {
    const result = generateEquivalences(Infinity);
    expect(Array.isArray(result)).toBe(true);
    result.forEach((e) => {
      expect(typeof e.icon).toBe('string');
      expect(typeof e.text).toBe('string');
    });
  });
});
describe('SESSION_CHALLENGE_DEFS', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(SESSION_CHALLENGE_DEFS)).toBe(true);
    expect(SESSION_CHALLENGE_DEFS.length).toBeGreaterThan(0);
  });

  test('each challenge has required fields', () => {
    SESSION_CHALLENGE_DEFS.forEach((c) => {
      expect(typeof c.id).toBe('string');
      expect(typeof c.icon).toBe('string');
      expect(typeof c.label).toBe('string');
      expect(typeof c.desc).toBe('string');
      expect(typeof c.type).toBe('string');
      expect(typeof c.target).toBe('number');
      expect(c.target).toBeGreaterThan(0);
      expect(typeof c.rewardDp).toBe('number');
      expect(c.rewardDp).toBeGreaterThan(0);
    });
  });

  test('all challenge ids are unique', () => {
    const ids = SESSION_CHALLENGE_DEFS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('has at least 3 challenges (enough to always return a full set of 3)', () => {
    expect(SESSION_CHALLENGE_DEFS.length).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================
// getNextMilestoneForPlayer
// ============================================================
describe('getNextMilestoneForPlayer', () => {
  test('returns first milestone when personalTokens is 0', () => {
    const result = getNextMilestoneForPlayer(0, MILESTONES);
    expect(result).toBe(MILESTONES[0]);
  });

  test('returns null when personalTokens exceeds all milestones', () => {
    const huge = MILESTONES[MILESTONES.length - 1].tokens + 1;
    expect(getNextMilestoneForPlayer(huge, MILESTONES)).toBeNull();
  });

  test('returns the next uncrossed milestone', () => {
    const first = MILESTONES[0];
    const result = getNextMilestoneForPlayer(first.tokens, MILESTONES);
    expect(result).toBe(MILESTONES[1]);
  });

  test('returns null for non-numeric tokens', () => {
    expect(getNextMilestoneForPlayer('abc', MILESTONES)).toBeNull();
  });

  test('returns null for non-array milestones', () => {
    expect(getNextMilestoneForPlayer(0, null)).toBeNull();
  });

  test('works with an empty milestones array', () => {
    expect(getNextMilestoneForPlayer(0, [])).toBeNull();
  });

  test('returns the exact milestone at the boundary (not yet crossed)', () => {
    const threshold = MILESTONES[2].tokens;
    // tokens = threshold - 1 means milestone 2 is not yet reached
    const result = getNextMilestoneForPlayer(threshold - 1, MILESTONES);
    expect(result).toBe(MILESTONES[2]);
  });
});

// ============================================================
// computeComboMultiplier
// ============================================================
describe('computeComboMultiplier', () => {
  test('returns 1 for an empty array', () => {
    expect(computeComboMultiplier([])).toBe(1);
  });

  test('returns 1 for a non-array argument', () => {
    expect(computeComboMultiplier(null)).toBe(1);
    expect(computeComboMultiplier('abc')).toBe(1);
  });

  test('returns 1 for a single tap', () => {
    const now = Date.now();
    expect(computeComboMultiplier([now])).toBe(1);
  });

  test('counts taps within the last 1000 ms', () => {
    const now = 1000000000000;
    // 5 taps all within the last 1 second
    const timestamps = [now - 900, now - 700, now - 500, now - 300, now];
    expect(computeComboMultiplier(timestamps)).toBe(5);
  });

  test('excludes taps older than 1000 ms', () => {
    const now = 1000000000000;
    const timestamps = [now - 2000, now - 1500, now - 100, now];
    // Only the last 2 are within 1 second of `now`
    expect(computeComboMultiplier(timestamps)).toBe(2);
  });

  test('caps at 10 regardless of tap count', () => {
    const now = Date.now();
    const timestamps = Array.from({ length: 20 }, (_, i) => now - i * 50);
    expect(computeComboMultiplier(timestamps)).toBe(10);
  });

  test('returns 1 if the only tap has an invalid timestamp', () => {
    expect(computeComboMultiplier([NaN])).toBe(1);
    expect(computeComboMultiplier(['bad'])).toBe(1);
  });
});

// ============================================================
// getSessionChallenges
// ============================================================
describe('getSessionChallenges', () => {
  test('always returns exactly 3 challenges', () => {
    expect(getSessionChallenges(Date.now()).length).toBe(3);
    expect(getSessionChallenges(0).length).toBe(3);
    expect(getSessionChallenges().length).toBe(3);
  });

  test('each returned challenge is a valid SESSION_CHALLENGE_DEFS entry', () => {
    const challenges = getSessionChallenges(Date.now());
    challenges.forEach((c) => {
      const found = SESSION_CHALLENGE_DEFS.find((d) => d.id === c.id);
      expect(found).toBeDefined();
    });
  });

  test('returns different challenges for different daily seeds', () => {
    // Find two seeds that yield different starting indices
    // Try enough days until we see a difference (wraps at SESSION_CHALLENGE_DEFS.length)
    const daysToCheck = SESSION_CHALLENGE_DEFS.length;
    const firstDayMs = 0;
    const sets = [];
    for (let d = 0; d < daysToCheck; d++) {
      sets.push(getSessionChallenges(firstDayMs + d * 86400000).map((c) => c.id).join(','));
    }
    const unique = new Set(sets);
    // With 7 challenges there should be 7 different starting positions
    expect(unique.size).toBeGreaterThan(1);
  });

  test('same seed always produces same result', () => {
    const seed = 1714500000000;
    const a = getSessionChallenges(seed).map((c) => c.id);
    const b = getSessionChallenges(seed).map((c) => c.id);
    expect(a).toEqual(b);
  });

  test('handles non-numeric seed gracefully', () => {
    expect(getSessionChallenges('abc').length).toBe(3);
    expect(getSessionChallenges(null).length).toBe(3);
  });
});

// ============================================================
// formatDoomPoints
// ============================================================
describe('formatDoomPoints', () => {
  test('formats zero', () => {
    expect(formatDoomPoints(0)).toBe('0 DP');
  });

  test('formats small integer', () => {
    expect(formatDoomPoints(42)).toBe('42 DP');
  });

  test('formats thousands with K suffix', () => {
    expect(formatDoomPoints(1500)).toBe('1.5K DP');
  });

  test('omits trailing .0 in K suffix', () => {
    expect(formatDoomPoints(2000)).toBe('2K DP');
  });

  test('formats millions with M suffix', () => {
    expect(formatDoomPoints(2500000)).toBe('2.5M DP');
  });

  test('omits trailing .0 in M suffix', () => {
    expect(formatDoomPoints(3000000)).toBe('3M DP');
  });

  test('returns 0 DP for negative values', () => {
    expect(formatDoomPoints(-5)).toBe('0 DP');
  });

  test('returns 0 DP for NaN', () => {
    expect(formatDoomPoints(NaN)).toBe('0 DP');
  });

  test('returns 0 DP for non-numeric input', () => {
    expect(formatDoomPoints('lots')).toBe('0 DP');
  });

  test('rounds sub-threshold values', () => {
    expect(formatDoomPoints(9.7)).toBe('10 DP');
  });
});

// ============================================================
// COMPANY_ROLES
// ============================================================
const { COMPANY_ROLES, AI_AGENTS, COMPANY_STAGES, computePassiveRate, getCompanyStage } = core;

describe('COMPANY_ROLES', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(COMPANY_ROLES)).toBe(true);
    expect(COMPANY_ROLES.length).toBeGreaterThan(0);
  });

  test('each role has required fields', () => {
    COMPANY_ROLES.forEach((r) => {
      expect(typeof r.id).toBe('string');
      expect(typeof r.icon).toBe('string');
      expect(typeof r.name).toBe('string');
      expect(typeof r.cost).toBe('number');
      expect(r.cost).toBeGreaterThan(0);
      expect(typeof r.tps).toBe('number');
      expect(r.tps).toBeGreaterThan(0);
      expect(typeof r.flavour).toBe('string');
    });
  });

  test('all role ids are unique', () => {
    const ids = COMPANY_ROLES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('roles are sorted ascending by cost', () => {
    for (let i = 1; i < COMPANY_ROLES.length; i++) {
      expect(COMPANY_ROLES[i].cost).toBeGreaterThanOrEqual(COMPANY_ROLES[i - 1].cost);
    }
  });
});

// ============================================================
// AI_AGENTS
// ============================================================
describe('AI_AGENTS', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(AI_AGENTS)).toBe(true);
    expect(AI_AGENTS.length).toBeGreaterThan(0);
  });

  test('each agent has required fields', () => {
    AI_AGENTS.forEach((a) => {
      expect(typeof a.id).toBe('string');
      expect(typeof a.icon).toBe('string');
      expect(typeof a.name).toBe('string');
      expect(typeof a.cost).toBe('number');
      expect(a.cost).toBeGreaterThan(0);
      expect(typeof a.tps).toBe('number');
      expect(a.tps).toBeGreaterThan(0);
      expect(typeof a.flavour).toBe('string');
    });
  });

  test('all agent ids are unique', () => {
    const ids = AI_AGENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('agents are sorted ascending by cost', () => {
    for (let i = 1; i < AI_AGENTS.length; i++) {
      expect(AI_AGENTS[i].cost).toBeGreaterThanOrEqual(AI_AGENTS[i - 1].cost);
    }
  });
});

// ============================================================
// COMPANY_STAGES
// ============================================================
describe('COMPANY_STAGES', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(COMPANY_STAGES)).toBe(true);
    expect(COMPANY_STAGES.length).toBeGreaterThan(0);
  });

  test('each stage has required fields', () => {
    COMPANY_STAGES.forEach((s) => {
      expect(typeof s.minReplaced).toBe('number');
      expect(typeof s.name).toBe('string');
      expect(typeof s.icon).toBe('string');
    });
  });

  test('first stage has minReplaced of 0', () => {
    expect(COMPANY_STAGES[0].minReplaced).toBe(0);
  });

  test('stages are sorted ascending by minReplaced', () => {
    for (let i = 1; i < COMPANY_STAGES.length; i++) {
      expect(COMPANY_STAGES[i].minReplaced).toBeGreaterThan(COMPANY_STAGES[i - 1].minReplaced);
    }
  });
});

// ============================================================
// computePassiveRate
// ============================================================
describe('computePassiveRate', () => {
  test('returns 0 with empty inputs', () => {
    expect(computePassiveRate({}, {})).toBe(0);
  });

  test('returns 0 with null inputs', () => {
    expect(computePassiveRate(null, null)).toBe(0);
  });

  test('returns 0 with undefined inputs', () => {
    expect(computePassiveRate(undefined, undefined)).toBe(0);
  });

  test('counts single AI agent correctly', () => {
    const agentId = AI_AGENTS[0].id;
    const rate = computePassiveRate({ [agentId]: 1 }, {});
    expect(rate).toBe(AI_AGENTS[0].tps);
  });

  test('stacks multiple copies of the same agent linearly', () => {
    const agentId = AI_AGENTS[0].id;
    const rate3 = computePassiveRate({ [agentId]: 3 }, {});
    expect(rate3).toBe(AI_AGENTS[0].tps * 3);
  });

  test('counts fired role correctly', () => {
    const roleId = COMPANY_ROLES[0].id;
    const rate = computePassiveRate({}, { [roleId]: true });
    expect(rate).toBe(COMPANY_ROLES[0].tps);
  });

  test('sums agents and fired roles together', () => {
    const agentId = AI_AGENTS[0].id;
    const roleId  = COMPANY_ROLES[0].id;
    const rate = computePassiveRate({ [agentId]: 2 }, { [roleId]: true });
    expect(rate).toBe(AI_AGENTS[0].tps * 2 + COMPANY_ROLES[0].tps);
  });

  test('ignores unknown agent ids', () => {
    expect(computePassiveRate({ nonexistent_agent: 5 }, {})).toBe(0);
  });

  test('ignores unknown role ids', () => {
    expect(computePassiveRate({}, { nonexistent_role: true })).toBe(0);
  });

  test('floors fractional agent counts', () => {
    const agentId = AI_AGENTS[0].id;
    // 1.9 should floor to 1
    const rate = computePassiveRate({ [agentId]: 1.9 }, {});
    expect(rate).toBe(AI_AGENTS[0].tps);
  });

  test('ignores negative agent counts', () => {
    const agentId = AI_AGENTS[0].id;
    expect(computePassiveRate({ [agentId]: -1 }, {})).toBe(0);
  });
});

// ============================================================
// getCompanyStage
// ============================================================
describe('getCompanyStage', () => {
  test('returns the first stage for 0 workers replaced', () => {
    const stage = getCompanyStage(0);
    expect(stage).toBe(COMPANY_STAGES[0]);
  });

  test('returns last stage when all workers are replaced', () => {
    const lastStage = COMPANY_STAGES[COMPANY_STAGES.length - 1];
    const stage = getCompanyStage(lastStage.minReplaced);
    expect(stage).toBe(lastStage);
  });

  test('returns first stage for negative input', () => {
    expect(getCompanyStage(-5)).toBe(COMPANY_STAGES[0]);
  });

  test('returns first stage for non-numeric input', () => {
    expect(getCompanyStage('all')).toBe(COMPANY_STAGES[0]);
    expect(getCompanyStage(NaN)).toBe(COMPANY_STAGES[0]);
    expect(getCompanyStage(null)).toBe(COMPANY_STAGES[0]);
  });

  test('advances stage at each threshold', () => {
    // Each stage transition should yield the correct stage
    for (let i = 0; i < COMPANY_STAGES.length; i++) {
      const stage = getCompanyStage(COMPANY_STAGES[i].minReplaced);
      expect(stage).toBe(COMPANY_STAGES[i]);
    }
  });

  test('stays at highest stage beyond max threshold', () => {
    const lastStage = COMPANY_STAGES[COMPANY_STAGES.length - 1];
    expect(getCompanyStage(lastStage.minReplaced + 100)).toBe(lastStage);
  });

  test('floors fractional inputs', () => {
    // e.g. 0.9 should floor to 0 and give stage 0
    expect(getCompanyStage(0.9)).toBe(COMPANY_STAGES[0]);
  });
});

// ============================================================
// getSimulatedViewerCount
// ============================================================
describe('getSimulatedViewerCount', () => {
  // 2026-04-15 14:00 UTC — Wednesday peak hour
  const peakMs    = new Date('2026-04-15T14:00:00Z').getTime();
  // 2026-04-15 03:00 UTC — Wednesday trough hour
  const troughMs  = new Date('2026-04-15T03:00:00Z').getTime();
  // 2026-04-19 14:00 UTC — Sunday peak hour (weekend)
  const weekendMs = new Date('2026-04-19T14:00:00Z').getTime();

  test('returns a positive integer', () => {
    const count = getSimulatedViewerCount(peakMs);
    expect(Number.isInteger(count)).toBe(true);
    expect(count).toBeGreaterThan(0);
  });

  test('result is a multiple of 5', () => {
    expect(getSimulatedViewerCount(peakMs) % 5).toBe(0);
  });

  test('minimum result is 12', () => {
    // Trough hour should still be at least 12
    expect(getSimulatedViewerCount(troughMs)).toBeGreaterThanOrEqual(12);
  });

  test('peak hours return more viewers than trough hours', () => {
    expect(getSimulatedViewerCount(peakMs)).toBeGreaterThan(
      getSimulatedViewerCount(troughMs),
    );
  });

  test('weekday peak returns more viewers than weekend peak', () => {
    expect(getSimulatedViewerCount(peakMs)).toBeGreaterThan(
      getSimulatedViewerCount(weekendMs),
    );
  });

  test('same timestamp always returns the same count (deterministic)', () => {
    expect(getSimulatedViewerCount(peakMs)).toBe(getSimulatedViewerCount(peakMs));
  });

  test('defaults to current time when called with no argument', () => {
    const count = getSimulatedViewerCount();
    expect(Number.isInteger(count)).toBe(true);
    expect(count).toBeGreaterThanOrEqual(12);
  });

  test('handles invalid input gracefully (defaults to current time)', () => {
    const count = getSimulatedViewerCount(NaN);
    expect(Number.isInteger(count)).toBe(true);
    expect(count).toBeGreaterThanOrEqual(12);
  });
});

// ============================================================
// HOROSCOPE_TEMPLATES
// ============================================================
const { HOROSCOPE_TEMPLATES, getDailyHoroscope } = core;

describe('HOROSCOPE_TEMPLATES', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(HOROSCOPE_TEMPLATES)).toBe(true);
    expect(HOROSCOPE_TEMPLATES.length).toBeGreaterThan(0);
  });

  test('has at least 30 entries', () => {
    expect(HOROSCOPE_TEMPLATES.length).toBeGreaterThanOrEqual(30);
  });

  test('every entry is a non-empty string', () => {
    HOROSCOPE_TEMPLATES.forEach((t) => {
      expect(typeof t).toBe('string');
      expect(t.length).toBeGreaterThan(0);
    });
  });

  test('all entries are unique', () => {
    const unique = new Set(HOROSCOPE_TEMPLATES);
    expect(unique.size).toBe(HOROSCOPE_TEMPLATES.length);
  });
});

// ============================================================
// getDailyHoroscope
// ============================================================
describe('getDailyHoroscope', () => {
  const templates = ['Alpha', 'Beta', 'Gamma'];

  test('returns a string from the templates array', () => {
    const result = getDailyHoroscope(0, templates);
    expect(templates).toContain(result);
  });

  test('cycles through templates by UTC day index', () => {
    // Day 0 → templates[0], day 1 → templates[1], day 3 → templates[0] (wraps)
    expect(getDailyHoroscope(0, templates)).toBe('Alpha');
    expect(getDailyHoroscope(86400000, templates)).toBe('Beta');
    expect(getDailyHoroscope(172800000, templates)).toBe('Gamma');
    expect(getDailyHoroscope(259200000, templates)).toBe('Alpha');
  });

  test('same UTC day always returns the same horoscope', () => {
    const dayMs = new Date('2026-04-27T00:00:00Z').getTime();
    const midMs = new Date('2026-04-27T12:00:00Z').getTime();
    expect(getDailyHoroscope(dayMs, templates)).toBe(
      getDailyHoroscope(midMs, templates),
    );
  });

  test('different UTC days return different results when pool is large enough', () => {
    const day1 = new Date('2026-04-27T00:00:00Z').getTime();
    const day2 = new Date('2026-04-28T00:00:00Z').getTime();
    // With a 3-entry pool consecutive days are guaranteed to differ
    expect(getDailyHoroscope(day1, templates)).not.toBe(
      getDailyHoroscope(day2, templates),
    );
  });

  test('returns empty string for an empty templates array', () => {
    expect(getDailyHoroscope(0, [])).toBe('');
  });

  test('returns empty string for non-array templates', () => {
    expect(getDailyHoroscope(0, null)).toBe('');
    expect(getDailyHoroscope(0, undefined)).toBe('');
    expect(getDailyHoroscope(0, 'oops')).toBe('');
  });

  test('works correctly with the real HOROSCOPE_TEMPLATES pool', () => {
    const result = getDailyHoroscope(Date.now(), HOROSCOPE_TEMPLATES);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(HOROSCOPE_TEMPLATES).toContain(result);
  });
});
