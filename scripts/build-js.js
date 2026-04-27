#!/usr/bin/env node
/**
 * build-js.js
 *
 * Concatenates the JS source files from src/js/ into the single script.js
 * file served by the site.  The source files contain the inner body of the
 * IIFE; this script wraps them with the standard header and footer.
 * The concatenated output is then minified with esbuild.
 *
 * Source files are loaded in the order defined by PARTS (alphabetical order
 * matches the numeric prefixes on the filenames).
 *
 * Usage:  node scripts/build-js.js
 */

'use strict';

const path = require('path');
const { buildBundle } = require('./build-bundle');

const ROOT = path.resolve(__dirname, '..');

/** Ordered list of JS source files that make up the IIFE body of script.js. */
const PARTS = [
  '00-state.js',
  '01-theme.js',
  '02-counter.js',
  '03-milestones.js',
  '04-chart.js',
  '05-security.js',
  '06-life-blocks.js',
  '07-stack-panel.js',
  '08-static-renders.js',
  '09-ticker.js',
  '10-equivalences.js',
  '11-share.js',
  '12-receipt.js',
  '13-calculator.js',
  '14-badges.js',
  '15-accelerator.js',
  '16-social-ripple.js',
  '17-witness-history.js',
  '18-scary-features.js',
  '19-milestone-alert.js',
  '20-tabs.js',
  '21-horoscope.js',
  '22-boot.js',
];

const HEADER = [
  '/* global Chart, DeathClockCore, ChangelogData, ProjectStatsData */',
  "'use strict';",
  '',
  '// ============================================================',
  '// AI DEATH CLOCK — Browser / DOM layer',
  '// Depends on death-clock-core.js being loaded first',
  '// ============================================================',
  '',
  '(function () {',
].join('\n');

buildBundle({
  parts:  PARTS,
  srcDir: path.join(ROOT, 'src', 'js'),
  outPath: path.join(ROOT, 'script.js'),
  loader: 'js',
  header: HEADER,
  footer: '})();',
  esbuildOptions: {
    // Preserve the leading banner comment so tools can still identify the file.
    banner: '/* AI DEATH CLOCK — browser/DOM layer (minified) */',
    // Target all modern browsers; no transpilation needed.
    target: ['es2018'],
  },
});
