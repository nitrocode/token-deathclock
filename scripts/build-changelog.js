#!/usr/bin/env node
'use strict';

/**
 * Build script: CHANGELOG.md + package.json → changelog-data.js
 *
 * Usage:  node scripts/build-changelog.js
 *   (also callable via `npm run build:changelog`)
 *
 * Reads CHANGELOG.md and package.json from the repo root, parses the
 * Keep-a-Changelog–style release entries, and writes changelog-data.js —
 * a dual-export module consumed by both Node.js (tests) and the browser
 * (loaded via <script> before script.js).
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'CHANGELOG.md');
const PKG  = path.join(ROOT, 'package.json');
const DEST = path.join(ROOT, 'changelog-data.js');

// ── Read version from package.json ───────────────────────────────────────────
const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
const SITE_VERSION = pkg.version || '0.0.0';

// ── Read and parse CHANGELOG.md ──────────────────────────────────────────────
const raw = fs.readFileSync(SRC, 'utf8');

/** @typedef {{ heading: string, items: string[] }} Section */
/** @typedef {{ version: string, date: string|null, sections: Section[] }} Release */

/** @type {Release[]} */
const releases = [];
/** @type {Release|null} */
let currentRelease = null;
/** @type {Section|null} */
let currentSection = null;

for (const line of raw.split('\n')) {
  // Release header: ## [Unreleased] or ## [1.0.0] - 2025-04-14 (Keep a Changelog)
  // Also handles release-please format: ## [1.0.0](url) (2025-04-14)
  const releaseMatch = line.match(/^## \[([^\]]+)\](?:\([^)]*\))?(?:\s+-\s+(\d{4}-\d{2}-\d{2})|\s+\((\d{4}-\d{2}-\d{2})\))?/);
  if (releaseMatch) {
    if (currentRelease) releases.push(currentRelease);
    currentRelease = {
      version:  releaseMatch[1],
      date:     releaseMatch[2] || releaseMatch[3] || null,
      sections: [],
    };
    currentSection = null;
    continue;
  }

  if (!currentRelease) continue;

  // Section header: ### Added / ### Fixed / etc.
  const sectionMatch = line.match(/^### (.+)/);
  if (sectionMatch) {
    currentSection = { heading: sectionMatch[1].trim(), items: [] };
    currentRelease.sections.push(currentSection);
    continue;
  }

  // List item: - text  or  * text
  const itemMatch = line.match(/^[-*] (.+)/);
  if (itemMatch && currentSection) {
    currentSection.items.push(itemMatch[1].trim());
  }
}

if (currentRelease) releases.push(currentRelease);

if (releases.length === 0) {
  console.error('ERROR: no release entries found in CHANGELOG.md');
  process.exit(1);
}

// ── Generate JS ───────────────────────────────────────────────────────────────
/** @param {string} s */
function jsStr(s) {
  return JSON.stringify(String(s));
}

/** @param {Section} sec */
function renderSection(sec) {
  const itemLines = sec.items.map((item) => `        ${jsStr(item)},`).join('\n');
  return `      { heading: ${jsStr(sec.heading)}, items: [\n${itemLines}\n      ] }`;
}

/** @param {Release} r */
function renderRelease(r) {
  const secLines = r.sections.map(renderSection).join(',\n');
  const datePart = r.date ? jsStr(r.date) : 'null';
  return (
    `  {\n` +
    `    version: ${jsStr(r.version)},\n` +
    `    date: ${datePart},\n` +
    `    sections: [\n${secLines}\n    ],\n` +
    `  }`
  );
}

const body = releases.map(renderRelease).join(',\n');

const output =
`'use strict';
// AUTO-GENERATED from CHANGELOG.md — do not edit directly.
// Run \`npm run build:changelog\` to regenerate from CHANGELOG.md.

const SITE_VERSION = ${jsStr(SITE_VERSION)};

const CHANGELOG_RELEASES = [
${body},
];

/* istanbul ignore next */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SITE_VERSION, CHANGELOG_RELEASES };
} else if (typeof window !== 'undefined') {
  window.ChangelogData = { SITE_VERSION, CHANGELOG_RELEASES };
}
`;

fs.writeFileSync(DEST, output, 'utf8');
console.log(
  `✅  Written ${releases.length} release(s) to ${path.relative(ROOT, DEST)} ` +
  `(version: v${SITE_VERSION})`
);
