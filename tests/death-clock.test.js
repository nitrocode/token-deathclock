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
  MILESTONES,
  HISTORICAL_DATA,
  RATE_SCHEDULE,
  BASE_TOKENS,
  TOKENS_PER_SECOND,
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
