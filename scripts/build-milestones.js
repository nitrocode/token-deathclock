#!/usr/bin/env node
'use strict';

/**
 * Build script: milestones.yaml → milestones-data.js
 *
 * Usage:  node scripts/build-milestones.js
 *   (also callable via `npm run build:milestones`)
 *
 * Reads milestones.yaml from the repo root, validates the data, and writes
 * milestones-data.js — a dual-export module consumed by both Node.js (tests)
 * and the browser (loaded via <script> before death-clock-core.js).
 */

const fs   = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT   = path.join(__dirname, '..');
const SRC    = path.join(ROOT, 'milestones.yaml');
const DEST   = path.join(ROOT, 'milestones-data.js');

const REQUIRED_FIELDS = [
  'id', 'name', 'icon', 'tokens', 'shortDesc',
  'description', 'consequence', 'followingEvent', 'color', 'darkColor',
];

// ── Load & parse ─────────────────────────────────────────────────────────────
const raw = fs.readFileSync(SRC, 'utf8');
const doc = yaml.load(raw);

if (!doc || !Array.isArray(doc.milestones) || doc.milestones.length === 0) {
  console.error('ERROR: milestones.yaml must contain a non-empty `milestones` array.');
  process.exit(1);
}

// ── Validate ──────────────────────────────────────────────────────────────────
const milestones = doc.milestones;

milestones.forEach((m, i) => {
  REQUIRED_FIELDS.forEach((f) => {
    if (m[f] === undefined || m[f] === null) {
      console.error(`ERROR: milestone[${i}] (id="${m.id}") is missing required field "${f}".`);
      process.exit(1);
    }
  });

  if (typeof m.tokens !== 'number' || m.tokens <= 0) {
    console.error(`ERROR: milestone[${i}] (id="${m.id}") has invalid tokens value: ${m.tokens}`);
    process.exit(1);
  }

  if (i > 0 && m.tokens <= milestones[i - 1].tokens) {
    console.error(
      `ERROR: milestones must be in ascending token order. ` +
      `milestone[${i}] (id="${m.id}", tokens=${m.tokens}) is not greater than ` +
      `milestone[${i - 1}] (id="${milestones[i - 1].id}", tokens=${milestones[i - 1].tokens}).`
    );
    process.exit(1);
  }

  if (m.reference !== undefined && typeof m.reference !== 'string') {
    console.error(`ERROR: milestone[${i}] (id="${m.id}") reference must be a string URL.`);
    process.exit(1);
  }
});

// ── Generate JS ───────────────────────────────────────────────────────────────
function jsString(s) {
  // Emit as a template-literal-safe single-quoted JS string.
  // We use JSON.stringify for reliable escaping.
  return JSON.stringify(String(s));
}

function renderMilestone(m) {
  const lines = [
    '  {',
    `    id: ${jsString(m.id)},`,
    `    name: ${jsString(m.name)},`,
    `    icon: ${jsString(m.icon)},`,
    `    tokens: ${m.tokens},`,
    `    shortDesc: ${jsString(m.shortDesc)},`,
    `    description: ${jsString(m.description)},`,
    `    consequence: ${jsString(m.consequence)},`,
    `    followingEvent: ${jsString(m.followingEvent)},`,
    `    color: ${jsString(m.color)},`,
    `    darkColor: ${jsString(m.darkColor)},`,
  ];
  if (m.reference) {
    lines.push(`    reference: ${jsString(m.reference)},`);
  }
  lines.push('  }');
  return lines.join('\n');
}

const body = milestones.map(renderMilestone).join(',\n');

const output = `'use strict';
// AUTO-GENERATED from milestones.yaml — do not edit directly.
// Run \`npm run build:milestones\` to regenerate from milestones.yaml.

const MILESTONES = [
${body},
];

/* istanbul ignore next */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MILESTONES };
} else if (typeof window !== 'undefined') {
  window.MilestonesData = { MILESTONES };
}
`;

fs.writeFileSync(DEST, output, 'utf8');
console.log(`✅  Written ${milestones.length} milestones to ${path.relative(ROOT, DEST)}`);
