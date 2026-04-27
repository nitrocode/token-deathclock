// tests/paths-filter.test.js
//
// Unit tests for .github/actions/paths-filter/filter.js
//
// Pure-function tests run without any mocking.
// I/O tests (getChangedFiles, main) mock child_process and fs so they
// exercise all code paths without requiring a real git repository.

'use strict';

// ---------------------------------------------------------------------------
// Mock child_process and fs BEFORE requiring the module under test
// ---------------------------------------------------------------------------
jest.mock('child_process', () => ({ spawnSync: jest.fn() }));
jest.mock('fs', () => ({ appendFileSync: jest.fn() }));

const { spawnSync } = require('child_process');
const fs = require('fs');

const {
  parseFilters,
  globToRegex,
  computeBase,
  matchFiles,
  formatFileList,
  runFilter,
  getChangedFiles,
  main,
} = require('../.github/actions/paths-filter/filter');

// ---------------------------------------------------------------------------
// Helper: reset env vars before each test
// ---------------------------------------------------------------------------
const ENV_KEYS = [
  'INPUT_BASE', 'INPUT_EVENT_NAME', 'GH_PR_BASE_SHA', 'GH_PUSH_BEFORE',
  'GH_MERGE_BASE_SHA', 'INPUT_SHA', 'INPUT_FILTERS', 'INPUT_LIST_FILES',
  'GITHUB_OUTPUT',
];

beforeEach(() => {
  ENV_KEYS.forEach(k => delete process.env[k]);
  jest.clearAllMocks();
});

// ============================================================================
// parseFilters
// ============================================================================

describe('parseFilters', () => {
  test('returns empty object for empty string', () => {
    expect(parseFilters('')).toEqual({});
  });

  test('returns empty object for null/undefined', () => {
    expect(parseFilters(null)).toEqual({});
    expect(parseFilters(undefined)).toEqual({});
  });

  test('parses a single filter with one pattern', () => {
    const yaml = `code:\n  - '**/*.js'`;
    expect(parseFilters(yaml)).toEqual({ code: ['**/*.js'] });
  });

  test('parses a single filter with multiple patterns', () => {
    const yaml = [
      'code:',
      "  - '**/*.js'",
      "  - '**/*.ts'",
      "  - '**/*.css'",
      "  - 'tests/**'",
      "  - 'package*.json'",
    ].join('\n');
    expect(parseFilters(yaml)).toEqual({
      code: ['**/*.js', '**/*.ts', '**/*.css', 'tests/**', 'package*.json'],
    });
  });

  test('parses multiple filter groups', () => {
    const yaml = [
      'frontend:',
      "  - 'src/**/*.js'",
      'backend:',
      "  - 'api/**/*.py'",
    ].join('\n');
    expect(parseFilters(yaml)).toEqual({
      frontend: ['src/**/*.js'],
      backend: ['api/**/*.py'],
    });
  });

  test('strips single quotes from pattern values', () => {
    expect(parseFilters("code:\n  - '**/*.js'")).toEqual({ code: ['**/*.js'] });
  });

  test('strips double quotes from pattern values', () => {
    expect(parseFilters('code:\n  - "**/*.js"')).toEqual({ code: ['**/*.js'] });
  });

  test('handles patterns without quotes', () => {
    expect(parseFilters('code:\n  - **/*.js')).toEqual({ code: ['**/*.js'] });
  });

  test('ignores indented content before first filter name', () => {
    const yaml = '  - orphan pattern\ncode:\n  - src/**';
    expect(parseFilters(yaml)).toEqual({ code: ['src/**'] });
  });

  test('handles filter names with hyphens', () => {
    const yaml = 'my-filter:\n  - src/**';
    expect(parseFilters(yaml)).toEqual({ 'my-filter': ['src/**'] });
  });

  test('handles Windows-style CRLF line endings', () => {
    const yaml = 'code:\r\n  - src/**\r\n';
    expect(parseFilters(yaml)).toEqual({ code: ['src/**'] });
  });

  test('handles trailing whitespace on items', () => {
    const yaml = "code:\n  - '**/*.js'   ";
    expect(parseFilters(yaml)).toEqual({ code: ['**/*.js'] });
  });
});

// ============================================================================
// globToRegex
// ============================================================================

describe('globToRegex', () => {
  function match(pattern, filePath) {
    return new RegExp('^' + globToRegex(pattern) + '$').test(filePath);
  }

  // ** patterns
  test('**/*.js matches any .js file at any depth', () => {
    expect(match('**/*.js', 'app.js')).toBe(true);
    expect(match('**/*.js', 'src/app.js')).toBe(true);
    expect(match('**/*.js', 'src/lib/util.js')).toBe(true);
    expect(match('**/*.js', 'app.ts')).toBe(false);
  });

  test('tests/** matches any file under tests/', () => {
    expect(match('tests/**', 'tests/foo.test.js')).toBe(true);
    expect(match('tests/**', 'tests/e2e/spec.js')).toBe(true);
    expect(match('tests/**', 'src/tests/foo.js')).toBe(false);
  });

  test('**/tests/** matches tests/ anywhere in path', () => {
    expect(match('**/tests/**', 'tests/foo.js')).toBe(true);
    expect(match('**/tests/**', 'src/tests/foo.js')).toBe(true);
  });

  // * patterns (single segment)
  test('*.js matches a top-level .js file only', () => {
    expect(match('*.js', 'app.js')).toBe(true);
    expect(match('*.js', 'src/app.js')).toBe(false);
  });

  test('package*.json matches package.json and package-lock.json', () => {
    expect(match('package*.json', 'package.json')).toBe(true);
    expect(match('package*.json', 'package-lock.json')).toBe(true);
    expect(match('package*.json', 'my-package.json')).toBe(false);
  });

  // ? patterns
  test('? matches exactly one non-slash character', () => {
    expect(match('src/?.js', 'src/a.js')).toBe(true);
    expect(match('src/?.js', 'src/ab.js')).toBe(false);
    expect(match('src/?.js', 'src/a/b.js')).toBe(false);
  });

  // Regex-special characters in literal parts
  test('dots in literal patterns are treated as literal dots', () => {
    expect(match('README.md', 'README.md')).toBe(true);
    expect(match('README.md', 'READMEXmd')).toBe(false);
  });

  test('brackets and parens are escaped', () => {
    expect(match('a[b].js', 'a[b].js')).toBe(true);
    expect(match('a(b).js', 'a(b).js')).toBe(true);
  });

  test('backslash is escaped', () => {
    const regex = globToRegex('a\\b');
    expect(regex).toContain('\\\\');
  });

  // Edge cases
  test('empty pattern produces empty regex (matches empty string only)', () => {
    expect(match('', '')).toBe(true);
    expect(match('', 'a')).toBe(false);
  });

  test('** alone matches any path', () => {
    expect(match('**', 'anything/deep/path.js')).toBe(true);
  });
});

// ============================================================================
// computeBase
// ============================================================================

describe('computeBase', () => {
  test('pull_request uses prBaseSha', () => {
    expect(computeBase('pull_request', 'abc123', 'before456', 'merge789')).toBe('abc123');
  });

  test('pull_request_target uses prBaseSha', () => {
    expect(computeBase('pull_request_target', 'abc123', 'before456', '')).toBe('abc123');
  });

  test('push uses pushBefore', () => {
    expect(computeBase('push', 'prBase', 'before456', 'mergeBase')).toBe('before456');
  });

  test('merge_group uses mergeBaseSha', () => {
    expect(computeBase('merge_group', '', '', 'merge789')).toBe('merge789');
  });

  test('unknown event falls back to mergeBaseSha', () => {
    expect(computeBase('workflow_dispatch', 'pr', 'push', 'fallback')).toBe('fallback');
  });

  test('returns empty string when sha is not available', () => {
    expect(computeBase('push', '', '', '')).toBe('');
  });

  test('returns empty string for pull_request with empty sha', () => {
    expect(computeBase('pull_request', '', 'before', 'merge')).toBe('');
  });
});

// ============================================================================
// matchFiles
// ============================================================================

describe('matchFiles', () => {
  const files = [
    'src/app.js',
    'src/lib.ts',
    'styles/main.css',
    'tests/foo.test.js',
    'package.json',
    'package-lock.json',
    'README.md',
    'config.yaml',
  ];

  test('matches .js files with **/*.js', () => {
    const result = matchFiles(files, ['**/*.js']);
    expect(result).toContain('src/app.js');
    expect(result).toContain('tests/foo.test.js');
    expect(result).not.toContain('src/lib.ts');
  });

  test('matches tests/ directory with tests/**', () => {
    expect(matchFiles(files, ['tests/**'])).toEqual(['tests/foo.test.js']);
  });

  test('matches package.json files with package*.json', () => {
    const result = matchFiles(files, ['package*.json']);
    expect(result).toContain('package.json');
    expect(result).toContain('package-lock.json');
  });

  test('multiple patterns: file matched by any one pattern is included', () => {
    const result = matchFiles(files, ['**/*.ts', '**/*.css']);
    expect(result).toContain('src/lib.ts');
    expect(result).toContain('styles/main.css');
    expect(result).not.toContain('src/app.js');
  });

  test('returns empty array when no files match', () => {
    expect(matchFiles(files, ['**/*.go'])).toEqual([]);
  });

  test('returns empty array for empty patterns list', () => {
    expect(matchFiles(files, [])).toEqual([]);
  });

  test('returns empty array for empty file list', () => {
    expect(matchFiles([], ['**/*.js'])).toEqual([]);
  });
});

// ============================================================================
// formatFileList
// ============================================================================

describe('formatFileList', () => {
  const files = ['src/app.js', 'src/lib.ts'];

  test('none returns empty string', () => {
    expect(formatFileList(files, 'none')).toBe('');
  });

  test('unknown format returns empty string', () => {
    expect(formatFileList(files, 'unknown')).toBe('');
  });

  test('json returns a JSON array string', () => {
    expect(formatFileList(files, 'json')).toBe('["src/app.js","src/lib.ts"]');
  });

  test('csv returns comma-joined list', () => {
    expect(formatFileList(files, 'csv')).toBe('src/app.js,src/lib.ts');
  });

  test('shell returns single-quoted space-separated list', () => {
    expect(formatFileList(files, 'shell')).toBe("'src/app.js' 'src/lib.ts'");
  });

  test('escape is an alias for shell', () => {
    expect(formatFileList(files, 'escape')).toBe("'src/app.js' 'src/lib.ts'");
  });

  test('shell escapes embedded single quotes', () => {
    const result = formatFileList(["it's a file.js"], 'shell');
    expect(result).toBe("'it'\\''s a file.js'");
  });

  test('handles empty file list', () => {
    expect(formatFileList([], 'json')).toBe('[]');
    expect(formatFileList([], 'csv')).toBe('');
    expect(formatFileList([], 'shell')).toBe('');
  });
});

// ============================================================================
// runFilter
// ============================================================================

describe('runFilter', () => {
  const files = ['src/app.js', 'src/lib.ts', 'README.md'];
  const filters = {
    code: ['**/*.js', '**/*.ts'],
    docs: ['README.md', '**/*.md'],
  };

  test('outputs <name>=true for each matched filter', () => {
    const { lines } = runFilter(files, filters, 'none');
    expect(lines).toContain('code=true');
    expect(lines).toContain('docs=true');
  });

  test('outputs <name>=false when no files match', () => {
    const { lines } = runFilter(['README.md'], { code: ['**/*.js'] }, 'none');
    expect(lines).toContain('code=false');
  });

  test('includes changes JSON as last line', () => {
    const { lines, changes } = runFilter(files, filters, 'none');
    expect(lines[lines.length - 1]).toBe(`changes=${JSON.stringify(changes)}`);
    expect(changes).toEqual({ code: true, docs: true });
  });

  test('adds <name>_files when list-files=json and filter matched', () => {
    const { lines } = runFilter(['src/app.js'], { code: ['**/*.js'] }, 'json');
    expect(lines).toContain('code_files=["src/app.js"]');
  });

  test('adds <name>_files when list-files=csv', () => {
    const { lines } = runFilter(
      ['src/app.js', 'src/lib.ts'],
      { code: ['**/*.js', '**/*.ts'] },
      'csv',
    );
    expect(lines).toContain('code_files=src/app.js,src/lib.ts');
  });

  test('adds <name>_files when list-files=shell', () => {
    const { lines } = runFilter(['src/app.js'], { code: ['**/*.js'] }, 'shell');
    expect(lines).toContain("code_files='src/app.js'");
  });

  test('does not add <name>_files when filter did not match', () => {
    const { lines } = runFilter([], { code: ['**/*.js'] }, 'json');
    expect(lines.some(l => l.startsWith('code_files='))).toBe(false);
  });

  test('handles empty changedFiles (no matches)', () => {
    const { changes } = runFilter([], filters, 'none');
    expect(changes).toEqual({ code: false, docs: false });
  });

  test('handles empty filtersMap', () => {
    const { lines, changes } = runFilter(files, {}, 'none');
    expect(changes).toEqual({});
    expect(lines).toEqual(['changes={}']);
  });
});

// ============================================================================
// getChangedFiles
// ============================================================================

describe('getChangedFiles', () => {
  test('uses git ls-files when base is empty', () => {
    spawnSync.mockReturnValue({ status: 0, stdout: 'a.js\nb.js\n', stderr: '' });
    const { files, error } = getChangedFiles('', 'HEAD');
    expect(spawnSync).toHaveBeenCalledWith('git', ['ls-files'], { encoding: 'utf8' });
    expect(files).toEqual(['a.js', 'b.js']);
    expect(error).toBeNull();
  });

  test('uses git ls-files when base is all-zeros', () => {
    spawnSync.mockReturnValue({ status: 0, stdout: 'a.js\n', stderr: '' });
    getChangedFiles('0000000000000000000000000000000000000000', 'HEAD');
    expect(spawnSync).toHaveBeenCalledWith('git', ['ls-files'], { encoding: 'utf8' });
  });

  test('uses git diff when base is a real SHA', () => {
    spawnSync.mockReturnValue({ status: 0, stdout: 'changed.js\n', stderr: '' });
    const { files, error } = getChangedFiles('abc123', 'def456');
    expect(spawnSync).toHaveBeenCalledWith(
      'git', ['diff', '--name-only', 'abc123', 'def456'], { encoding: 'utf8' },
    );
    expect(files).toEqual(['changed.js']);
    expect(error).toBeNull();
  });

  test('returns error when git ls-files fails', () => {
    spawnSync.mockReturnValue({ status: 1, stdout: '', stderr: 'fatal error' });
    const { files, error } = getChangedFiles('', 'HEAD');
    expect(files).toEqual([]);
    expect(error).toContain('git ls-files failed');
  });

  test('returns error when git diff fails (bad base SHA)', () => {
    spawnSync.mockReturnValue({ status: 128, stdout: '', stderr: 'unknown revision' });
    const { files, error } = getChangedFiles('badref', 'HEAD');
    expect(files).toEqual([]);
    expect(error).toContain("git diff failed for base 'badref'");
  });

  test('filters out empty lines from output', () => {
    spawnSync.mockReturnValue({ status: 0, stdout: 'a.js\n\nb.js\n', stderr: '' });
    const { files } = getChangedFiles('abc', 'def');
    expect(files).toEqual(['a.js', 'b.js']);
  });

  test('returns empty files array when git output is empty', () => {
    spawnSync.mockReturnValue({ status: 0, stdout: '', stderr: '' });
    const { files } = getChangedFiles('abc', 'def');
    expect(files).toEqual([]);
  });
});

// ============================================================================
// main
// ============================================================================

describe('main', () => {
  function setEnv(vars) {
    Object.entries(vars).forEach(([k, v]) => { process.env[k] = v; });
  }

  const FILTERS_YAML = 'code:\n  - "**/*.js"\n  - "**/*.ts"';

  test('writes code=true when matching files found (pull_request)', () => {
    setEnv({
      INPUT_FILTERS: FILTERS_YAML,
      INPUT_EVENT_NAME: 'pull_request',
      GH_PR_BASE_SHA: 'base-sha',
      GH_PUSH_BEFORE: '',
      GH_MERGE_BASE_SHA: '',
      INPUT_SHA: 'head-sha',
      GITHUB_OUTPUT: '/tmp/test-output',
    });
    spawnSync.mockReturnValue({ status: 0, stdout: 'src/app.js\n', stderr: '' });

    main();

    const written = process.stdout.write.mock
      ? process.stdout.write.mock.calls.map(c => c[0]).join('')
      : '';
    // Verify GITHUB_OUTPUT was written
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      '/tmp/test-output',
      expect.stringContaining('code=true'),
    );
  });

  test('writes code=false when no matching files found', () => {
    setEnv({
      INPUT_FILTERS: FILTERS_YAML,
      INPUT_EVENT_NAME: 'push',
      GH_PUSH_BEFORE: 'before-sha',
      GH_PR_BASE_SHA: '',
      GH_MERGE_BASE_SHA: '',
      INPUT_SHA: 'head-sha',
      GITHUB_OUTPUT: '/tmp/test-output',
    });
    spawnSync.mockReturnValue({ status: 0, stdout: 'README.md\n', stderr: '' });

    main();

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      '/tmp/test-output',
      expect.stringContaining('code=false'),
    );
  });

  test('uses explicit INPUT_BASE when provided (overrides event auto-detect)', () => {
    setEnv({
      INPUT_FILTERS: FILTERS_YAML,
      INPUT_BASE: 'explicit-base',
      INPUT_EVENT_NAME: 'push',
      GH_PUSH_BEFORE: 'wrong-before-sha',
      GH_PR_BASE_SHA: '',
      GH_MERGE_BASE_SHA: '',
      INPUT_SHA: 'head-sha',
      GITHUB_OUTPUT: '/tmp/test-output',
    });
    spawnSync.mockReturnValue({ status: 0, stdout: 'app.ts\n', stderr: '' });

    main();

    expect(spawnSync).toHaveBeenCalledWith(
      'git', ['diff', '--name-only', 'explicit-base', 'head-sha'], { encoding: 'utf8' },
    );
  });

  test('falls back to all-changed on git diff failure', () => {
    setEnv({
      INPUT_FILTERS: FILTERS_YAML,
      INPUT_EVENT_NAME: 'push',
      GH_PUSH_BEFORE: 'bad-sha',
      GH_PR_BASE_SHA: '',
      GH_MERGE_BASE_SHA: '',
      INPUT_SHA: 'head-sha',
      GITHUB_OUTPUT: '/tmp/test-output',
    });
    spawnSync.mockReturnValue({ status: 128, stdout: '', stderr: 'fatal: bad SHA' });

    main();

    // On failure, all filters should be forced true
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      '/tmp/test-output',
      expect.stringContaining('code=true'),
    );
  });

  test('skips GITHUB_OUTPUT write when env var is not set', () => {
    setEnv({
      INPUT_FILTERS: FILTERS_YAML,
      INPUT_EVENT_NAME: 'push',
      GH_PUSH_BEFORE: '',
      GH_PR_BASE_SHA: '',
      GH_MERGE_BASE_SHA: '',
      INPUT_SHA: 'HEAD',
    });
    spawnSync.mockReturnValue({ status: 0, stdout: 'app.js\n', stderr: '' });

    main();

    expect(fs.appendFileSync).not.toHaveBeenCalled();
  });

  test('handles fs.appendFileSync error gracefully', () => {
    setEnv({
      INPUT_FILTERS: FILTERS_YAML,
      INPUT_EVENT_NAME: 'push',
      GH_PUSH_BEFORE: '',
      GH_PR_BASE_SHA: '',
      GH_MERGE_BASE_SHA: '',
      INPUT_SHA: 'HEAD',
      GITHUB_OUTPUT: '/tmp/test-output',
    });
    spawnSync.mockReturnValue({ status: 0, stdout: 'app.js\n', stderr: '' });
    fs.appendFileSync.mockImplementation(() => { throw new Error('disk full'); });

    // Should not throw
    expect(() => main()).not.toThrow();
  });
});
