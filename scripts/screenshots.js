#!/usr/bin/env node
// scripts/screenshots.js
// Headlessly capture desktop and mobile screenshots of the site.
//
// Usage:
//   npm run screenshots
//
// Screenshots are saved to the `screenshots/` directory (gitignored).
// The script spins up a local static server on port 3001 automatically,
// so it can be run without a pre-existing server.  To target a running
// server instead, set the SCREENSHOT_URL environment variable:
//   SCREENSHOT_URL=https://nitrocode.github.io/token-deathclock/ npm run screenshots

'use strict';

const { chromium } = require('@playwright/test');
const { spawn }    = require('child_process');
const path         = require('path');
const fs           = require('fs');

const OUT_DIR      = path.join(process.cwd(), 'screenshots');
const PORT         = 3001;
const BASE_URL     = process.env.SCREENSHOT_URL || `http://localhost:${PORT}`;

/** Viewport + context configs to capture */
const CONFIGS = [
  {
    name:    'desktop',
    viewport: { width: 1280, height: 800 },
    isMobile: false,
    deviceScaleFactor: 1,
  },
  {
    name:    'mobile',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 3,
  },
];

/** Milliseconds to wait for the local server to start */
const SERVER_STARTUP_MS = 2000;

async function waitMs(/** @type {number} */ ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Only start a local server when using the default localhost URL
  let serverProcess = null;
  if (!process.env.SCREENSHOT_URL) {
    serverProcess = spawn(
      'npx', ['serve', '.', '-p', String(PORT), '-s'],
      { stdio: 'ignore', detached: false }
    );
    // Give the server time to start
    await waitMs(SERVER_STARTUP_MS);
  }

  let exitCode = 0;

  try {
    const browser = await chromium.launch();

    for (const cfg of CONFIGS) {
      const context = await browser.newContext({
        viewport:          cfg.viewport,
        isMobile:          cfg.isMobile,
        deviceScaleFactor: cfg.deviceScaleFactor,
      });

      const page = await context.newPage();
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      const outFile = path.join(OUT_DIR, `${cfg.name}.png`);
      await page.screenshot({ path: outFile, fullPage: false });
      console.log(`[screenshots] Saved ${outFile}`);

      await context.close();
    }

    await browser.close();
    console.log(`[screenshots] Done. Files are in: ${OUT_DIR}`);
  } catch (err) {
    console.error('[screenshots] Error:', err instanceof Error ? err.message : String(err));
    exitCode = 1;
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }

  process.exit(exitCode);
}

main();
