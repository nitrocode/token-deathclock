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

const fs      = require('fs');
const path    = require('path');
const esbuild = require('esbuild');

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
  '21-boot.js',
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

const FOOTER = '})();';

const chunks = PARTS.map((file) => {
  const fullPath = path.join(ROOT, 'src', 'js', file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing source file: src/js/${file}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
});

// Concatenate inner body directly — each source file preserves its own
// trailing blank lines so no additional separator is needed.
const innerBody = chunks.join('');

const unminified = HEADER + '\n' + innerBody + FOOTER + '\n';

const outPath = path.join(ROOT, 'script.js');

// Minify with esbuild (synchronous transform API — no temp files needed).
const result = esbuild.transformSync(unminified, {
  minify:       true,
  // Preserve the leading banner comment so tools can still identify the file.
  banner:       '/* AI DEATH CLOCK — browser/DOM layer (minified) */',
  // Target all modern browsers; no transpilation needed.
  target:       ['es2018'],
  loader:       'js',
});

fs.writeFileSync(outPath, result.code);

const ratio = ((1 - result.code.length / unminified.length) * 100).toFixed(1);
console.log(
  `script.js rebuilt from ${PARTS.length} source files ` +
  `(${unminified.split('\n').length - 1} lines → ${result.code.length} bytes, −${ratio}% via esbuild minification)`,
);
