#!/usr/bin/env node
/**
 * build-bundle.js
 *
 * Shared helper used by build-js.js and build-css.js.
 * Concatenates an ordered list of source files, optionally wraps them with a
 * header and footer string, then minifies the result with esbuild.
 *
 * This module is not a standalone script — import it via require().
 *
 * @example
 *   const { buildBundle } = require('./build-bundle');
 *   buildBundle({ parts, srcDir, outPath, loader: 'css' });
 */

'use strict';

const fs      = require('fs');
const path    = require('path');
const esbuild = require('esbuild');

/**
 * Build a minified bundle from an ordered list of source files.
 *
 * @param {object}          opts
 * @param {string[]}        opts.parts           - Ordered source file names
 * @param {string}          opts.srcDir          - Directory that contains the source files
 * @param {string}          opts.outPath         - Absolute path for the output file
 * @param {'js'|'css'}      opts.loader          - esbuild loader type
 * @param {string}          [opts.header]        - Text prepended before minification
 * @param {string}          [opts.footer]        - Text appended before minification
 * @param {object}          [opts.esbuildOptions]- Extra options merged into the esbuild call
 */
function buildBundle(opts) {
  const chunks = opts.parts.map((file) => {
    const fullPath = path.join(opts.srcDir, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing source file: ${file}`);
    }
    return fs.readFileSync(fullPath, 'utf8');
  });

  // Concatenate with explicit newline separators so files without trailing
  // newlines don't accidentally merge tokens across boundaries.
  let unminified = chunks.join('\n');
  if (opts.header) unminified = opts.header + '\n' + unminified;
  if (opts.footer) unminified = unminified + '\n' + opts.footer;

  const esbuildOpts = Object.assign(
    { minify: true, loader: opts.loader },
    opts.esbuildOptions || {},
  );

  const result = esbuild.transformSync(unminified, esbuildOpts);
  fs.writeFileSync(opts.outPath, result.code);

  const outName = path.basename(opts.outPath);
  const ratio   = unminified.length === 0
    ? '0.0'
    : ((1 - result.code.length / unminified.length) * 100).toFixed(1);
  console.log(
    `${outName} rebuilt from ${opts.parts.length} source files ` +
    `(${unminified.split('\n').length - 1} lines → ${result.code.length} bytes, −${ratio}% via esbuild minification)`,
  );
}

module.exports = { buildBundle };
