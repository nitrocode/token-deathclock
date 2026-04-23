#!/usr/bin/env node
'use strict';

/**
 * Build script: project-stats.yaml → project-stats-data.js
 *
 * Usage:  node scripts/build-project-stats.js
 *   (also callable via `npm run build:project-stats`)
 *
 * Reads project-stats.yaml from the repo root, validates the data, and writes
 * project-stats-data.js — a dual-export module consumed by both Node.js (tests)
 * and the browser (loaded via <script> before script.js).
 */

const fs   = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'project-stats.yaml');
const DEST = path.join(ROOT, 'project-stats-data.js');

// ── Load & parse ─────────────────────────────────────────────────────────────
const raw = fs.readFileSync(SRC, 'utf8');
const doc = yaml.load(raw);

if (!doc || typeof doc !== 'object') {
  console.error('ERROR: project-stats.yaml must be a valid YAML mapping.');
  process.exit(1);
}

// ── Validate ──────────────────────────────────────────────────────────────────
const prCount     = doc.pr_count;
const totalTokens = doc.total_tokens;

if (typeof prCount !== 'number' || !Number.isInteger(prCount) || prCount < 0) {
  console.error(`ERROR: project-stats.yaml — pr_count must be a non-negative integer, got: ${prCount}`);
  process.exit(1);
}

if (typeof totalTokens !== 'number' || !Number.isInteger(totalTokens) || totalTokens < 0) {
  console.error(`ERROR: project-stats.yaml — total_tokens must be a non-negative integer, got: ${totalTokens}`);
  process.exit(1);
}

// ── Generate JS ───────────────────────────────────────────────────────────────
const output = `'use strict';
// AUTO-GENERATED from project-stats.yaml — do not edit directly.
// Run \`npm run build:project-stats\` to regenerate from project-stats.yaml.

const PROJECT_PR_COUNT     = ${prCount};
const PROJECT_TOTAL_TOKENS = ${totalTokens};

/* istanbul ignore next */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PROJECT_PR_COUNT, PROJECT_TOTAL_TOKENS };
} else if (typeof window !== 'undefined') {
  window.ProjectStatsData = { PROJECT_PR_COUNT, PROJECT_TOTAL_TOKENS };
}
`;

fs.writeFileSync(DEST, output, 'utf8');
console.log(`✅  Written project stats to ${path.relative(ROOT, DEST)} (pr_count=${prCount}, total_tokens=${totalTokens})`);
