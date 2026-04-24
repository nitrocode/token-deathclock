#!/usr/bin/env node
/**
 * build-css.js
 *
 * Concatenates the component stylesheet source files from styles/ into the
 * single styles.css file served by the site.  The concatenated output is then
 * minified with esbuild.
 *
 * Source files are loaded in the order defined in PARTS below, which mirrors
 * the original top-to-bottom section order of styles.css.
 *
 * Usage:  node scripts/build-css.js
 */

'use strict';

const fs      = require('fs');
const path    = require('path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');

/** Ordered list of component CSS files that make up styles.css. */
const PARTS = [
  'variables.css',
  'base.css',
  'hero-tabs.css',
  'content-pages.css',
  'counter-milestones.css',
  'life-blocks.css',
  'tips.css',
  'footer.css',
  'features.css',
  'accelerator.css',
  'social.css',
  'scary-features.css',
];

const chunks = PARTS.map((file) => {
  const fullPath = path.join(ROOT, 'styles', file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing source file: styles/${file}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
});

// Concatenate directly — each source file preserves its own trailing blank lines
// so no additional separator is needed.
const unminified = chunks.join('');

const outPath = path.join(ROOT, 'styles.css');

// Minify with esbuild (synchronous transform API — no temp files needed).
const result = esbuild.transformSync(unminified, {
  minify: true,
  loader: 'css',
});

fs.writeFileSync(outPath, result.code);

const ratio = ((1 - result.code.length / unminified.length) * 100).toFixed(1);
console.log(
  `styles.css rebuilt from ${PARTS.length} source files ` +
  `(${unminified.split('\n').length - 1} lines → ${result.code.length} bytes, −${ratio}% via esbuild minification)`,
);
