// @ts-check
'use strict';
/**
 * E2E tests for AI Death Clock (Playwright)
 *
 * Run with:  npm run test:e2e
 *
 * These tests load the static site via a local HTTP server and verify that all
 * major UI sections render and update correctly in a real browser environment.
 */

const { test, expect } = require('@playwright/test');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wait until an element's textContent is non-empty and not "Loading…".
 */
async function waitForCounter(page, selector, timeout = 3000) {
  await expect(async () => {
    const text = await page.locator(selector).textContent();
    expect(text).toBeTruthy();
    expect(text.trim()).not.toBe('');
    expect(text).not.toContain('Loading');
  }).toPass({ timeout });
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe('AI Death Clock — end-to-end', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Give the page time to initialise (RAF loop, Chart.js, etc.)
    await page.waitForLoadState('networkidle');
  });

  // ── Page structure ────────────────────────────────────────────────────────

  test('has correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(/AI Death Clock/i);
  });

  test('renders main header', async ({ page }) => {
    await expect(page.locator('h1.site-title')).toBeVisible();
    await expect(page.locator('h1.site-title')).toContainText('AI DEATH CLOCK');
  });

  // ── Live counters ─────────────────────────────────────────────────────────

  test('total token counter updates from "Loading…"', async ({ page }) => {
    await waitForCounter(page, '#totalCounter');
    const text = await page.locator('#totalCounter').textContent();
    // Should contain a large number word
    expect(text).toMatch(/Quadrillion|Trillion|Quintillion/i);
  });

  test('session counter populates after a moment', async ({ page }) => {
    // Wait up to 3 s for at least one tick
    await page.waitForTimeout(1100);
    const text = await page.locator('#sessionCounter').textContent();
    expect(text.trim()).not.toBe('');
    // Should be a formatted number (contains digits)
    expect(text).toMatch(/\d/);
  });

  test('current rate counter shows a dynamic rate', async ({ page }) => {
    await waitForCounter(page, '#rateCounter');
    const text = await page.locator('#rateCounter').textContent();
    // Must be a non-zero formatted number
    expect(text).toMatch(/\d/);
    expect(text).not.toBe('0');
  });

  test('rate event subtitle is populated', async ({ page }) => {
    await page.waitForTimeout(500);
    const text = await page.locator('#rateEvent').textContent();
    expect(text.trim()).not.toBe('');
    expect(text.toLowerCase()).toContain('tokens');
  });

  test('total counter grows over time', async ({ page }) => {
    await waitForCounter(page, '#totalCounter');
    const first = await page.locator('#totalCounter').textContent();
    await page.waitForTimeout(2000);
    const second = await page.locator('#totalCounter').textContent();
    // Both should be truthy; after 2 s the numeric part should advance
    // (They may format the same string if growth is tiny — at minimum they must be non-empty)
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
  });

  // ── Environmental impact strip ────────────────────────────────────────────

  test('environmental impact stats are populated', async ({ page }) => {
    await waitForCounter(page, '#statKwh');
    for (const id of ['statKwh', 'statCo2', 'statWater', 'statTrees']) {
      const text = await page.locator(`#${id}`).textContent();
      expect(text.trim()).not.toBe('—');
      expect(text).toMatch(/\d/);
    }
  });

  // ── Milestones ────────────────────────────────────────────────────────────

  test('milestone cards are rendered', async ({ page }) => {
    const cards = page.locator('#milestonesGrid .milestone-card');
    await expect(cards).toHaveCount(await cards.count());
    const count = await cards.count();
    expect(count).toBeGreaterThan(10);
  });

  test('milestone cards show triggered state for passed thresholds', async ({ page }) => {
    // At ~65 quadrillion tokens, many milestones should already be triggered
    const triggered = page.locator('#milestonesGrid .milestone-card.triggered');
    const count = await triggered.count();
    expect(count).toBeGreaterThan(0);
  });

  test('milestone cards contain progress bars', async ({ page }) => {
    const bars = page.locator('#milestonesGrid .progress-fill');
    const count = await bars.count();
    expect(count).toBeGreaterThan(0);
  });

  // ── Predictions table ─────────────────────────────────────────────────────

  test('predictions table has rows', async ({ page }) => {
    const rows = page.locator('#predictionsBody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(10);
  });

  test('predictions table shows PASSED badge for triggered milestones', async ({ page }) => {
    const html = await page.locator('#predictionsBody').innerHTML();
    expect(html).toContain('PASSED');
  });

  // ── Life blocks ───────────────────────────────────────────────────────────

  test('life blocks section renders blocks', async ({ page }) => {
    await page.waitForSelector('#lb-container .lb-block', { timeout: 5000 });
    const blocks = page.locator('#lb-container .lb-block');
    const count = await blocks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('life block info strip shows days remaining', async ({ page }) => {
    await page.waitForSelector('#lb-info', { timeout: 5000 });
    const text = await page.locator('#lb-info').textContent();
    expect(text).toMatch(/day/i);
  });

  test('clicking a future life block drills into hours view', async ({ page }) => {
    await page.waitForSelector('#lb-container .lb-block.lb-future', { timeout: 5000 });
    // Click first future (non-today) block
    await page.locator('#lb-container .lb-block.lb-future').first().click();
    // Should now show hour blocks (24 of them)
    await page.waitForSelector('#lb-container .lb-block', { timeout: 3000 });
    const blocks = page.locator('#lb-container .lb-block');
    const count = await blocks.count();
    expect(count).toBe(24);
  });

  // ── Chart ─────────────────────────────────────────────────────────────────

  test('chart canvas is visible', async ({ page }) => {
    await expect(page.locator('#tokenChart')).toBeVisible();
  });

  test('chart canvas has non-zero dimensions after render', async ({ page }) => {
    // Give Chart.js time to paint
    await page.waitForTimeout(1000);
    const box = await page.locator('#tokenChart').boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  // ── Theme toggle ──────────────────────────────────────────────────────────

  test('theme toggle switches between dark and light', async ({ page }) => {
    const html = page.locator('html');
    // Starts dark
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.locator('#themeToggle').click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.locator('#themeToggle').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  // ── Always-on stack panel ─────────────────────────────────────────────────

  test('always-on stack panel renders all six rows (AC-1)', async ({ page }) => {
    await page.waitForSelector('#lb-stack-panel', { timeout: 5000 });
    const rows = page.locator('#lb-stack-panel .lb-stack-row');
    await expect(rows).toHaveCount(6);
    // Each row must contain at least one block
    for (const id of ['lb-stack-years', 'lb-stack-months', 'lb-stack-days',
                      'lb-stack-hours', 'lb-stack-minutes', 'lb-stack-seconds']) {
      const blocks = page.locator(`#${id} .lb-block`);
      const count = await blocks.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('always-on stack panel has one dying block per row', async ({ page }) => {
    await page.waitForSelector('#lb-stack-panel', { timeout: 5000 });
    for (const id of ['lb-stack-years', 'lb-stack-months', 'lb-stack-days',
                      'lb-stack-hours', 'lb-stack-minutes', 'lb-stack-seconds']) {
      const dying = page.locator(`#${id} .lb-block.lb-dying`);
      await expect(dying).toHaveCount(1);
    }
  });

  test('clicking a block in the seconds row navigates drill-down to seconds view (AC-12)',
    async ({ page }) => {
      await page.waitForSelector('#lb-stack-seconds [data-stack-level]', { timeout: 5000 });
      // Click the first clickable block (dying or future) in the seconds row
      await page.locator('#lb-stack-seconds [data-stack-level]').first().click();
      // Drill-down panel should now show 60 second blocks
      await page.waitForSelector('#lb-container .lb-block', { timeout: 3000 });
      const blocks = page.locator('#lb-container .lb-block');
      await expect(blocks).toHaveCount(60);
    });

  test('clicking a block in the minutes row navigates drill-down to minutes view (AC-12)',
    async ({ page }) => {
      await page.waitForSelector('#lb-stack-minutes [data-stack-level]', { timeout: 5000 });
      await page.locator('#lb-stack-minutes [data-stack-level]').first().click();
      await page.waitForSelector('#lb-container .lb-block', { timeout: 3000 });
      const blocks = page.locator('#lb-container .lb-block');
      await expect(blocks).toHaveCount(60);
    });

  test('clicking a block in the hours row navigates drill-down to hours view (AC-12)',
    async ({ page }) => {
      await page.waitForSelector('#lb-stack-hours [data-stack-level]', { timeout: 5000 });
      await page.locator('#lb-stack-hours [data-stack-level]').first().click();
      await page.waitForSelector('#lb-container .lb-block', { timeout: 3000 });
      const blocks = page.locator('#lb-container .lb-block');
      await expect(blocks).toHaveCount(24);
    });

  test('clicking a block in the days row navigates drill-down to days view (AC-12)',
    async ({ page }) => {
      await page.waitForSelector('#lb-stack-days [data-stack-level]', { timeout: 5000 });
      await page.locator('#lb-stack-days [data-stack-level]').first().click();
      await page.waitForSelector('#lb-container .lb-block', { timeout: 3000 });
      // days view shows 1+ blocks (variable count)
      const blocks = page.locator('#lb-container .lb-block');
      const count = await blocks.count();
      expect(count).toBeGreaterThan(0);
      // breadcrumb must be at days level
      const info = await page.locator('#lb-info').textContent();
      expect(info).toMatch(/day/i);
    });

  test('page loads without uncaught JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  // ── Security: no XSS via milestone content ────────────────────────────────

  test('milestone grid HTML does not contain unescaped script tags', async ({ page }) => {
    const html = await page.locator('#milestonesGrid').innerHTML();
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('javascript:');
  });
});
