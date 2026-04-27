#!/usr/bin/env node
// filter.js — paths-filter composite action worker.
//
// Parses a dorny/paths-filter-compatible YAML filters string, computes or
// receives a git base SHA, diffs against HEAD, and writes per-filter boolean
// outputs to $GITHUB_OUTPUT.
//
// All GitHub context is read from environment variables set via the env: block
// in action.yml — never interpolated directly from ${{ }} expressions —
// so the script is immune to GitHub Actions expression injection.
//
// Environment variables:
//   INPUT_BASE         — explicit base SHA (optional; overrides auto-detection)
//   INPUT_EVENT_NAME   — GitHub event name for base auto-detection
//   GH_PR_BASE_SHA     — github.event.pull_request.base.sha
//   GH_PUSH_BEFORE     — github.event.before
//   GH_MERGE_BASE_SHA  — github.event.merge_group.base_sha
//   INPUT_SHA          — HEAD sha (default: HEAD)
//   INPUT_FILTERS      — YAML filter definitions (required)
//   INPUT_LIST_FILES   — file list format: none | json | csv | shell (default: none)
//   GITHUB_OUTPUT      — path to the runner output file (set by runner)

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Filter YAML parser
// Supports the dorny/paths-filter format:
//   filterName:
//     - 'glob/pattern/**'
//   anotherFilter:
//     - '**/*.ts'
// ---------------------------------------------------------------------------

/**
 * Parse a dorny/paths-filter-compatible YAML filters string.
 *
 * @param {string} yaml
 * @returns {Record<string, string[]>}
 */
function parseFilters(yaml) {
  const result = {};
  let current = null;
  for (const rawLine of (yaml || '').split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    // Filter name: starts at column 0 with a letter, no leading whitespace, ends with colon
    const nameMatch = line.match(/^([a-zA-Z][\w-]*):\s*$/);
    // List item: leading whitespace + '- ' + value
    const itemMatch = line.match(/^\s+-\s+(.+?)\s*$/);
    if (nameMatch) {
      current = nameMatch[1];
      result[current] = [];
    } else if (itemMatch && current !== null) {
      // Strip surrounding single or double quotes from the pattern value
      const pattern = itemMatch[1]
        .replace(/^'(.*)'$/, '$1')
        .replace(/^"(.*)"$/, '$1');
      result[current].push(pattern);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Glob-to-regex converter
// ---------------------------------------------------------------------------

/**
 * Convert a glob pattern to a regular expression string (without anchors).
 * Handles:
 *   foo/  — trailing slash means "all files inside directory foo/" (equiv. to foo/**)
 *   **   — matches any path including slashes
 *   *    — matches any characters within a single path segment
 *   ?    — matches a single non-slash character
 *   rest — literals, with regex-special chars escaped
 *
 * The trailing-slash convention lets filter lists unambiguously refer to
 * directories: 'src/' matches every file inside src/, while 'src' matches
 * only a file literally named 'src' (since git diff --name-only never
 * outputs bare directory names).
 *
 * @param {string} glob
 * @returns {string}
 */
function globToRegex(glob) {
  // A trailing '/' means "all files inside this directory" — treat as dir/**
  const pattern = (glob || '').endsWith('/') ? glob + '**' : (glob || '');
  const regexSpecial = new Set(['.', '+', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\']);
  let re = '';
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === '*' && i + 1 < pattern.length && pattern[i + 1] === '*') {
      re += '.*';
      i += 2;
      // Skip the optional trailing slash after ** (e.g. "tests/**/")
      if (i < pattern.length && pattern[i] === '/') i++;
    } else if (ch === '*') {
      re += '[^/]*';
      i++;
    } else if (ch === '?') {
      re += '[^/]';
      i++;
    } else if (regexSpecial.has(ch)) {
      re += '\\' + ch;
      i++;
    } else {
      re += ch;
      i++;
    }
  }
  return re;
}

// ---------------------------------------------------------------------------
// Base SHA computation
// Mirrors the same event-type logic as detect-changes.sh.
// ---------------------------------------------------------------------------

/**
 * Compute the git base SHA from event context.
 *
 * @param {string} eventName
 * @param {string} prBaseSha
 * @param {string} pushBefore
 * @param {string} mergeBaseSha
 * @returns {string}
 */
function computeBase(eventName, prBaseSha, pushBefore, mergeBaseSha) {
  switch (eventName) {
    case 'pull_request':
    case 'pull_request_target':
      return prBaseSha || '';
    case 'push':
      return pushBefore || '';
    default:
      return mergeBaseSha || '';
  }
}

// ---------------------------------------------------------------------------
// File matching
// ---------------------------------------------------------------------------

/**
 * Return all files in changedFiles that match at least one glob pattern.
 *
 * @param {string[]} changedFiles
 * @param {string[]} patterns
 * @returns {string[]}
 */
function matchFiles(changedFiles, patterns) {
  const regexes = patterns.map(p => new RegExp('^' + globToRegex(p) + '$'));
  return changedFiles.filter(f => regexes.some(r => r.test(f)));
}

// ---------------------------------------------------------------------------
// File list formatter
// ---------------------------------------------------------------------------

/**
 * Format a list of matched files for the <name>_files output.
 *
 * @param {string[]} files
 * @param {'none'|'json'|'csv'|'shell'|'escape'} format
 * @returns {string}
 */
function formatFileList(files, format) {
  switch (format) {
    case 'json':
      return JSON.stringify(files);
    case 'csv':
      return files.join(',');
    case 'shell':
    case 'escape':
      // Single-quoted, shell-safe (each ' within a path is escaped as '\'')
      return files.map(f => `'${f.replace(/'/g, "'\\''")}'`).join(' ');
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Filter runner (pure — no I/O)
// ---------------------------------------------------------------------------

/**
 * Apply all filters to the changed file list and build GITHUB_OUTPUT lines.
 *
 * @param {string[]} changedFiles
 * @param {Record<string, string[]>} filtersMap
 * @param {string} listFiles — output format for file lists
 * @returns {{ lines: string[], changes: Record<string, boolean> }}
 */
function runFilter(changedFiles, filtersMap, listFiles) {
  const lines = [];
  const changes = {};
  const lf = (listFiles || 'none').toLowerCase();

  for (const [name, patterns] of Object.entries(filtersMap)) {
    const matched = matchFiles(changedFiles, patterns);
    const hasMatch = matched.length > 0;
    changes[name] = hasMatch;
    lines.push(`${name}=${hasMatch}`);
    if (lf !== 'none' && hasMatch) {
      lines.push(`${name}_files=${formatFileList(matched, lf)}`);
    }
  }

  lines.push(`changes=${JSON.stringify(changes)}`);
  return { lines, changes };
}

// ---------------------------------------------------------------------------
// Git I/O
// ---------------------------------------------------------------------------

/**
 * Get the list of changed files between base and sha using git.
 * Falls back to all tracked files when base is empty or all-zeros.
 *
 * @param {string} base — base commit SHA (or empty)
 * @param {string} sha  — head commit SHA
 * @returns {{ files: string[], error: string|null }}
 */
function getChangedFiles(base, sha) {
  const isEmpty = !base || base === '0000000000000000000000000000000000000000';
  if (isEmpty) {
    const r = spawnSync('git', ['ls-files'], { encoding: 'utf8' });
    if (r.status !== 0) {
      return { files: [], error: `git ls-files failed: ${r.stderr || '(no stderr)'}` };
    }
    return { files: r.stdout.trim().split('\n').filter(Boolean), error: null };
  }
  const r = spawnSync('git', ['diff', '--name-only', base, sha], { encoding: 'utf8' });
  if (r.status !== 0) {
    return {
      files: [],
      error: `git diff failed for base '${base}': ${r.stderr || '(no stderr)'}`,
    };
  }
  return { files: r.stdout.trim().split('\n').filter(Boolean), error: null };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Read configuration from environment variables, run the filter, and write
 * results to $GITHUB_OUTPUT.
 *
 * On any git failure the script falls back to treating all filter groups as
 * changed (code=true equivalent) so CI is never silently skipped.
 */
function main() {
  const explicitBase  = process.env.INPUT_BASE         || '';
  const eventName     = process.env.INPUT_EVENT_NAME   || '';
  const prBaseSha     = process.env.GH_PR_BASE_SHA     || '';
  const pushBefore    = process.env.GH_PUSH_BEFORE     || '';
  const mergeBaseSha  = process.env.GH_MERGE_BASE_SHA  || '';
  const sha           = process.env.INPUT_SHA          || 'HEAD';
  const filtersYaml   = process.env.INPUT_FILTERS      || '';
  const listFiles     = process.env.INPUT_LIST_FILES   || 'none';
  const outputFile    = process.env.GITHUB_OUTPUT      || '';

  const base = explicitBase || computeBase(eventName, prBaseSha, pushBefore, mergeBaseSha);
  const { files, error } = getChangedFiles(base, sha);

  const filtersMap = parseFilters(filtersYaml);
  let outputLines;

  if (error) {
    // Safe fallback: treat all filters as matched so CI is never silently skipped
    process.stderr.write(`paths-filter: ${error} — treating all filters as changed\n`);
    const safeChanges = Object.fromEntries(Object.keys(filtersMap).map(n => [n, true]));
    outputLines = [
      ...Object.keys(filtersMap).map(n => `${n}=true`),
      `changes=${JSON.stringify(safeChanges)}`,
    ];
  } else {
    outputLines = runFilter(files, filtersMap, listFiles).lines;
  }

  const outputStr = outputLines.join('\n') + '\n';

  if (outputFile) {
    try {
      fs.appendFileSync(outputFile, outputStr);
    } catch (e) {
      process.stderr.write(`paths-filter: failed to write to GITHUB_OUTPUT: ${e.message}\n`);
    }
  }

  process.stdout.write(outputStr);
}

// Run main when executed directly; export everything for testing
// istanbul ignore next — standard Node.js direct-run guard; cannot be
// reached from inside Jest (require.main is the jest runner, not this file)
/* istanbul ignore next */
if (require.main === module) {
  main();
}

module.exports = {
  parseFilters,
  globToRegex,
  computeBase,
  matchFiles,
  formatFileList,
  runFilter,
  getChangedFiles,
  main,
};
