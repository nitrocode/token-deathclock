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

const path = require('path');
const { buildBundle } = require('./build-bundle');

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

buildBundle({
  parts:  PARTS,
  srcDir: path.join(ROOT, 'styles'),
  outPath: path.join(ROOT, 'styles.css'),
  loader: 'css',
});
