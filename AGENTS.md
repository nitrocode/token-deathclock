# AGENTS.md — AI Agent Context for token-deathclock

This file gives AI coding agents (GitHub Copilot, Claude, ChatGPT, etc.) the context
they need to work effectively on this repository.

---

## Project Purpose

**Token Deathclock** is a static GitHub Pages site that visualises the environmental cost
of global AI token consumption. It shows live counters, environmental milestone cards,
a Chart.js growth chart with projections, and a prompt/PR quality scoring section.

**Live site:** `https://nitrocode.github.io/token-deathclock/`

---

## Repository Layout

```
.
├── index.html              ← GitHub Pages entry point (static HTML shell)
├── styles.css              ← Dark/light theme, animations, responsive layout
├── death-clock-core.js     ← Pure functions only — no DOM, safe to unit-test
├── script.js               ← All DOM manipulation, Chart.js wiring, RAF loop
├── package.json            ← Jest config & devDependencies (no runtime deps)
├── tests/
│   └── death-clock.test.js ← 75 Jest unit tests for death-clock-core.js
└── .github/
    └── workflows/
        ├── deploy.yml          ← Deploys site to gh-pages branch (production) on push to main
        ├── preview.yml         ← Deploys PR preview to previews/pr-N/ and posts URL comment
        ├── preview-cleanup.yml ← Removes preview directory when a PR is closed
        ├── unit-tests.yml      ← Runs `npm run test:ci` + uploads coverage to Codecov
        └── e2e-tests.yml       ← Runs Playwright E2E tests
```

---

## Architecture Rules

| Rule | Detail |
|------|--------|
| **Core / DOM split** | `death-clock-core.js` must never import or reference the DOM. All DOM work belongs in `script.js`. |
| **No runtime dependencies** | The live site loads only Chart.js from a CDN. There are no npm runtime packages. |
| **CommonJS + browser dual export** | `death-clock-core.js` exports via `module.exports` for Jest and via `window.DeathClockCore` for the browser. Do not change this pattern without updating both consumers. |
| **HTML escaping** | All dynamic strings rendered into `innerHTML` must pass through `escHtml()` in `script.js`. Never assign untrusted data directly to `innerHTML`. |
| **Counter anchor** | `getCurrentTokens()` in `script.js` computes elapsed time from `BASE_DATE_ISO` (exported by the core module), **not** from page-load time. `pageLoadTime` is reserved for the session counter only. |

---

## Key Constants (death-clock-core.js)

| Constant | Value | Meaning |
|----------|-------|---------|
| `BASE_TOKENS` | 65 × 10¹⁵ | Estimated cumulative tokens as of `BASE_DATE_ISO` |
| `TOKENS_PER_SECOND` | 100 000 000 | Estimated global AI inference rate |
| `BASE_DATE_ISO` | `'2026-04-14T07:09:04Z'` | Anchor timestamp for the counter |

When updating data, change **all three** together so they stay consistent.

---

## Running Tests

```bash
npm ci                # install devDependencies
npm test              # jest --coverage (interactive)
npm run test:ci       # jest --ci --coverage (CI mode; fails on coverage drop)
npm run test:e2e      # Playwright E2E tests (requires a local static server — auto-started by config)
```

**Coverage thresholds** (enforced in CI):

| Metric | Threshold |
|--------|-----------|
| Lines | 80 % |
| Functions | 80 % |
| Branches | 70 % |

The current measured coverage is ≈ 96 % statements / 88 % branches — do not let it drop below the thresholds.

### Agent testing requirements

Every time an agent makes changes to this repository it **must**:

1. Run `npm run test:ci` and confirm all unit tests pass before finishing.
2. Run `npm run test:e2e` and confirm all E2E tests pass before finishing.
3. Ensure coverage does **not** decrease — the Codecov status check enforces this on PRs (any negative delta fails the check).

When adding or modifying code, agents **must** write matching tests:

- **Pure functions in `death-clock-core.js`** → add/update unit tests in `tests/death-clock.test.js`. Aim to keep coverage at or above current levels; do not let it drop.
- **DOM behaviour or visual flows in `script.js` / `index.html`** → add/update E2E assertions in `tests/e2e/death-clock.spec.js` where practical.
- Do not write tests purely for the sake of coverage numbers. Every test must assert real, meaningful behaviour that would catch a regression if the code broke.

---

## Making Changes

### Changing milestone data
Edit the `MILESTONES` array in `death-clock-core.js`. Each object requires:
`id`, `name`, `icon`, `tokens`, `shortDesc`, `description`, `consequence`, `followingEvent`, `color`, `darkColor`.
Keep the array sorted in ascending `tokens` order — the constants test enforces this.

### Adding a new pure utility function
1. Add the function to `death-clock-core.js`.
2. Export it via the `DeathClockCore` object at the bottom of the file.
3. Add unit tests in `tests/death-clock.test.js`.
4. Import it in `script.js` via the destructuring at the top of the IIFE.

### Changing the visual theme
Edit `styles.css`. CSS custom properties for colours live in `:root[data-theme="dark"]` and `:root[data-theme="light"]`. The theme toggle is managed by `applyTheme()` in `script.js`.

### Deployment
Merging to `main` triggers the `deploy.yml` workflow automatically. It pushes the static site to the `gh-pages` branch (root).

**One-time repo setup required** (only needs to be done once by a maintainer):
> Settings → Pages → Source → **Deploy from a branch** → Branch: `gh-pages` / `(root)` → Save.

### PR Preview URLs
Every pull request automatically gets a live preview URL:
- Triggered by `preview.yml` on `pull_request` (opened / synchronize / reopened)
- Deployed to: `https://nitrocode.github.io/token-deathclock/previews/pr-{number}/`
- A bot comment is posted (and updated) on the PR with the link
- Preview directory is removed automatically by `preview-cleanup.yml` when the PR is closed

---

## GitHub Actions Pinning

All `uses:` references in `.github/workflows/` **must** be pinned to a full commit SHA, with the exact semver tag as an inline comment:

```yaml
# Correct — SHA-pinned with full semver comment
uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

# Wrong — mutable tag, vulnerable to supply-chain attacks
uses: actions/checkout@v6
```

**Why:** Mutable tags (e.g. `v6`) can be silently redirected to a different commit, creating a supply-chain risk. Pinning to a SHA guarantees immutability.

**Keeping pins up-to-date:** Dependabot is configured in `.github/dependabot.yml` to open weekly PRs that bump pinned SHAs when new versions are released (ecosystem: `github-actions`). Do not disable or skip those PRs — they are the intended update mechanism.

**When adding a new action:**
1. Find the full semver tag for the version you want (e.g. `v3.1.0`).
2. Resolve its commit SHA (`git ls-remote https://github.com/<owner>/<repo>.git refs/tags/<tag>`).
3. Write `uses: <owner>/<action>@<sha> # <semver>`.

---

## What NOT to Do

- Do **not** add runtime npm packages — the site must remain fully static.
- Do **not** introduce DOM references in `death-clock-core.js`.
- Do **not** remove or weaken the `escHtml()` guard on dynamic HTML.
- Do **not** skip tests when adding new pure functions to the core module.
- Do **not** change `BASE_TOKENS` / `TOKENS_PER_SECOND` / `BASE_DATE_ISO` independently — update all three as a set with a comment explaining the source.
- Do **not** use mutable tags (e.g. `@v6`) in `uses:` — always pin to a commit SHA with a full semver comment (e.g. `@abc1234... # v6.0.2`).
- Do **not** finish a session without running `npm run test:ci` and `npm run test:e2e` to confirm both suites pass.
- Do **not** let coverage decrease — a negative coverage delta on any PR fails the Codecov status check.
