'use strict';

/**
 * Unit tests for death-clock-core.js
 *
 * Run with:  npm test
 */

const core = require('../death-clock-core');

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
  MILESTONES,
  HISTORICAL_DATA,
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
    const code = fs.readFileSync(path.join(__dirname, '../death-clock-core.js'), 'utf8');
    // Run in a sandbox where `module` is undefined and `window` is available.
    // This exercises the `else if (typeof window !== 'undefined')` branch (lines 443-444).
    const sandboxWindow = {};
    vm.runInNewContext(code, { window: sandboxWindow });
    expect(typeof sandboxWindow.DeathClockCore).toBe('object');
    expect(typeof sandboxWindow.DeathClockCore.formatTokenCount).toBe('function');
  });
});
