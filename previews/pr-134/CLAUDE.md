# AGENTS.md — AI Agent Context for token-deathclock

This file gives AI coding agents (GitHub Copilot, Claude, ChatGPT, etc.) the context
they need to work effectively on this repository.

**Companion documents — read these too:**

| File | Purpose |
|------|---------|
| [`docs/LEARNINGS.md`](docs/LEARNINGS.md) | Living log of lessons learned from past PRs, organised by category (mobile/CSS, build, testing, architecture, security, features). Add an entry after every merged PR. |
| [`.github/pull_request_template.md`](.github/pull_request_template.md) | Standard PR description template. Every PR (human or agent) must follow this structure: Summary, Changes checklist, Agent Checklist. |

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
├── styles.css              ← AUTO-GENERATED — not committed; built by `npm run build:css`
├── script.js               ← AUTO-GENERATED — not committed; built by `npm run build:js`
├── death-clock-core.js     ← Pure functions only — no DOM, safe to unit-test
├── changelog-data.js       ← AUTO-GENERATED — not committed; built by `npm run build:changelog`
├── milestones-data.js      ← AUTO-GENERATED — not committed; built by `npm run build:milestones`
├── project-stats-data.js   ← AUTO-GENERATED — not committed; built by `npm run build:project-stats`
├── project-stats.yaml      ← Edit this to update footer PR count + token total
├── CLAUDE.md               ← symlink → AGENTS.md (read by Claude AI agents)
├── package.json            ← version, Jest config & devDependencies (no runtime deps)
├── release-please-config.json      ← release-please release automation config
├── .release-please-manifest.json  ← release-please version manifest
├── src/
│   └── js/                 ← Source files that build into script.js (run npm run build:js)
│       ├── 00-state.js         ← Shared state, core unpacking, helpers
│       ├── 01-theme.js         ← Theme toggle (applyTheme, toggleTheme)
│       ├── 02-counter.js       ← Live counter updater (updateCounters, setStatText)
│       ├── 03-milestones.js    ← Milestone + predictions table rendering
│       ├── 04-chart.js         ← Chart.js integration
│       ├── 05-security.js      ← HTML escaping helper (escHtml)
│       ├── 06-life-blocks.js   ← Life Blocks drill-down view
│       ├── 07-stack-panel.js   ← Always-On Stack Panel
│       ├── 08-static-renders.js← Tips, Changelog, Footer stats, SITE_URL
│       ├── 09-ticker.js        ← "AI Is Currently Generating…" Ticker
│       ├── 10-equivalences.js  ← "What Could We Have Done Instead?" strip
│       ├── 11-share.js         ← Share Your Doom + Footer share row
│       ├── 12-receipt.js       ← Token Receipt Modal
│       ├── 13-calculator.js    ← Personal Footprint Calculator
│       ├── 14-badges.js        ← Doom Achievements / Badge System
│       ├── 15-accelerator.js   ← Accelerate the Doom game
│       ├── 16-social-ripple.js ← Social Ripple — "You're Not Alone"
│       ├── 17-witness-history.js ← Witness History — Live Session Event Log
│       ├── 18-scary-features.js  ← Scary & Satirical Features (PRDs 1–7)
│       ├── 19-milestone-alert.js ← "Wait for It" Milestone Countdown Alert
│       ├── 20-tabs.js          ← Tab navigation
│       └── 21-boot.js          ← Bootstrap / init
├── styles/                 ← Source files that build into styles.css (run npm run build:css)
│   ├── variables.css           ← CSS custom properties (colour tokens, themes)
│   ├── base.css                ← Reset, typography, layout, GitHub corner, theme toggle
│   ├── hero-tabs.css           ← Hero header, tab bar
│   ├── content-pages.css       ← News, About, FAQ, Changelog tabs
│   ├── counter-milestones.css  ← Counter, impact stats, milestones, chart, predictions
│   ├── life-blocks.css         ← Life Blocks + Always-On Stack Panel
│   ├── tips.css                ← Token-Saving Tips, milestone ref links
│   ├── footer.css              ← Footer element, footer-share buttons, utility classes, responsive overrides
│   ├── features.css            ← Equivalences, ticker, calculator, achievements, share, receipt
│   ├── accelerator.css         ← Accelerate the Doom game styles
│   ├── social.css              ← Social ripple, witness history, milestone countdown/flash
│   └── scary-features.css      ← Scary & satirical features (PRDs 1–7)
├── tests/
│   └── death-clock.test.js ← 75 Jest unit tests for death-clock-core.js
└── .github/
    └── workflows/
        ├── deploy.yml          ← Deploys site to gh-pages branch (production) on push to main
        ├── release-please.yml  ← Creates release PRs + GitHub Releases via release-please
        ├── preview.yml         ← Deploys PR preview to previews/pr-N/ and posts URL comment
        ├── preview-cleanup.yml ← Removes preview directory when a PR is closed
        ├── unit-tests.yml      ← Runs `npm run test:ci` + uploads coverage to Codecov
        └── e2e-tests.yml       ← Runs Playwright E2E tests
```

---

## Architecture Rules

| Rule | Detail |
|------|--------|
| **Core / DOM split** | `death-clock-core.js` must never import or reference the DOM. All DOM work belongs in `src/js/` (built into `script.js`). |
| **No runtime dependencies** | The live site loads only Chart.js from a CDN. There are no npm runtime packages. |
| **CommonJS + browser dual export** | `death-clock-core.js` exports via `module.exports` for Jest and via `window.DeathClockCore` for the browser. Do not change this pattern without updating both consumers. |
| **HTML escaping** | All dynamic strings rendered into `innerHTML` must pass through `escHtml()` in `src/js/05-security.js`. Never assign untrusted data directly to `innerHTML`. |
| **Counter anchor** | `getCurrentTokens()` in `src/js/00-state.js` computes elapsed time from `BASE_DATE_ISO` (exported by the core module), **not** from page-load time. `pageLoadTime` is reserved for the session counter only. |
| **Build before commit** | After editing any file in `src/js/`, run `npm run build:js`. After editing any file in `styles/`, run `npm run build:css`. The generated output files (`script.js`, `styles.css`, etc.) are **not committed** — CI rebuilds them automatically at deploy and preview time. Run `npm run build` locally before running E2E tests. |

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
2. Run `npm run build && npm run test:e2e` and confirm all E2E tests pass before finishing. (`npm run build` is required first because the generated files are not committed.)
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

### Documenting PR learnings
After merging a PR, add a brief entry to [`docs/LEARNINGS.md`](docs/LEARNINGS.md)
under the current release block using the template at the top of that file. If
the PR reveals a new recurring pattern (e.g., a mobile layout gotcha, a build
quirk), also add a row to the relevant table in the **Categorised Learnings**
section so future agents can find it by topic.

### Updating project token consumption stats (footer)
The footer shows how many tokens this project has consumed building itself.
After each agent session that merges one or more PRs, **update `project-stats.yaml`**:

```yaml
pr_count: 47        # ← increment by the number of PRs merged this session
total_tokens: 7000000  # ← add the tokens consumed this session
```

Then run `npm run build:project-stats` to regenerate `project-stats-data.js`.
The deploy workflow runs this automatically on every push to `main`, so the
generated file will always reflect the latest YAML values.

### Adding a new pure utility function
1. Add the function to `death-clock-core.js`.
2. Export it via the `DeathClockCore` object at the bottom of the file.
3. Add unit tests in `tests/death-clock.test.js`.
4. Import it in `src/js/00-state.js` via the destructuring at the top, then run `npm run build:js`.

### Adding or modifying DOM behaviour
Edit the relevant file in `src/js/` (see the repository layout for which file covers which feature), then run `npm run build:js` to regenerate `script.js` locally (needed for E2E tests). Do **not** commit `script.js` — it is in `.gitignore`.

### Changing the visual theme
Edit `styles/variables.css` for colour tokens, or the relevant component file in `styles/` for layout. CSS custom properties for colours live in `:root[data-theme="dark"]` and `:root[data-theme="light"]` inside `styles/variables.css`. The theme toggle is managed by `applyTheme()` in `src/js/01-theme.js`. After any CSS change, run `npm run build:css` to regenerate `styles.css` locally (needed for E2E tests). Do **not** commit `styles.css` — it is in `.gitignore`.

### Running a full build
The `npm run build` convenience script runs all five build steps in sequence:

```bash
npm run build   # equivalent to: build:milestones + build:changelog + build:project-stats + build:js + build:css
```

This is useful when multiple YAML/source changes need to be batched in one step.

### Deployment
Merging to `main` triggers the `deploy.yml` workflow automatically. It pushes the static site to the `gh-pages` branch (root).

**One-time repo setup required** (only needs to be done once by a maintainer):
> Settings → Pages → Source → **Deploy from a branch** → Branch: `gh-pages` / `(root)` → Save.

### Releasing a new version

This repo uses [release-please](https://github.com/googleapis/release-please) for automated semantic versioning and GitHub Releases.

**How it works:**
1. Merge PRs to `main` using [Conventional Commits](https://www.conventionalcommits.org/) in the commit/PR title:
   - `feat: …` → bumps **minor** version (e.g. `1.0.0` → `1.1.0`)
   - `fix: …` → bumps **patch** version (e.g. `1.0.0` → `1.0.1`)
   - `feat!: …` or `BREAKING CHANGE:` footer → bumps **major** version
2. `release-please.yml` automatically creates or updates a **Release PR** that:
   - bumps `"version"` in `package.json`
   - updates `CHANGELOG.md` with the new release section
3. When the Release PR is merged, release-please creates a **GitHub Release** + git tag (e.g. `v1.1.0`).
4. The `deploy.yml` workflow then re-deploys, regenerating `changelog-data.js` from the updated `CHANGELOG.md` so the site's **Changelog tab** reflects the new release.

**Key files:**
- `release-please-config.json` — maps commit types to CHANGELOG sections, sets `release-type: node`
- `.release-please-manifest.json` — tracks the current released version; updated automatically by release-please

### PR Preview URLs
Every pull request automatically gets a live preview URL:
- Triggered by `preview.yml` on `pull_request` (opened / synchronize / reopened)
- Deployed to: `https://nitrocode.github.io/token-deathclock/previews/pr-{number}/`
- A bot comment is posted (and updated) on the PR with the link
- Preview directory is removed automatically by `preview-cleanup.yml` when the PR is closed

---

## Build System & Bundler

The build pipeline uses **esbuild** (`devDependency`) to minify the concatenated JS and
CSS output.  The two-stage process is:

1. **Concatenate** — `scripts/build-js.js` (or `build-css.js`) assembles source files
   into a single string in memory.
2. **Minify** — esbuild's synchronous `transformSync()` API minifies the string and
   writes the final file.

Measured savings on the current codebase:

| File | Before | After | Saving |
|------|--------|-------|--------|
| `script.js` | ~140 KB | ~74 KB | ~47% |
| `styles.css` | ~86 KB | ~66 KB | ~23% |

**Why esbuild and not webpack/rollup/parcel/vite?**

- The site uses an IIFE/globals architecture (no ES modules), so true tree-shaking does
  not apply.
- esbuild handles both JS and CSS minification with a single devDependency.
- It requires zero configuration files.
- Build times are in the low-millisecond range.

**Why the root-level JS files stay at root:**

GitHub Pages publishes from `publish_dir: .` in the deploy workflow.  Moving the
generated runtime files (`script.js`, `death-clock-core.js`, `*-data.js`, etc.) to a
`dist/` subdirectory would require updating all `<script src="">` references in
`index.html` and the `exclude_assets` list in the deploy workflow.  This is a valid
future refactor, but the current layout keeps things simple.

**CLAUDE.md symlink:** `CLAUDE.md` is a symlink to `AGENTS.md`.  Both files are read
by Claude-family agents; keeping a single source avoids drift between the two.

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

## Commit and PR Title Convention

**All commits and PR titles MUST use [Conventional Commits](https://www.conventionalcommits.org/) format:**

```
<type>[optional scope]: <short description>
```

Common types and when to use them:

| Type | Use for |
|------|---------|
| `feat` | New feature or user-visible capability |
| `fix` | Bug fix |
| `docs` | Documentation-only changes |
| `style` | Formatting, whitespace — no logic change |
| `refactor` | Code restructure with no behaviour change |
| `test` | Adding or updating tests |
| `chore` | Build scripts, CI config, dependency bumps |
| `perf` | Performance improvement |

**Examples:**
```
feat: add URL hash anchoring for tabs and sections
fix: prevent counter from drifting on tab switch
docs: update AGENTS.md with semantic commit guidance
chore: bump actions/checkout SHA to v4.2.0
```

This is required (not optional) because:
- release-please reads commit types to determine the next semver bump automatically
- The CHANGELOG.md is generated entirely from commit messages
- PR titles become the squash-merge commit message on `main`

**Breaking changes** — append `!` after the type or add a `BREAKING CHANGE:` footer:
```
feat!: redesign anchor hash scheme (removes legacy ?tab= param)
```

---

## What NOT to Do

- Do **not** add runtime npm packages — the site must remain fully static.
- Do **not** introduce DOM references in `death-clock-core.js`.
- Do **not** remove or weaken the `escHtml()` guard on dynamic HTML.
- Do **not** skip tests when adding new pure functions to the core module.
- Do **not** change `BASE_TOKENS` / `TOKENS_PER_SECOND` / `BASE_DATE_ISO` independently — update all three as a set with a comment explaining the source.
- Do **not** use mutable tags (e.g. `@v6`) in `uses:` — always pin to a commit SHA with a full semver comment (e.g. `@abc1234... # v6.0.2`).
- Do **not** finish a session without adding a learning entry to `docs/LEARNINGS.md` for any PR merged in that session.
- Do **not** finish a session without running `npm run test:ci` and `npm run test:e2e` to confirm both suites pass.
- Do **not** let coverage decrease — a negative coverage delta on any PR fails the Codecov status check.
- Do **not** edit `changelog-data.js`, `milestones-data.js`, or `project-stats-data.js` directly — they are auto-generated and in `.gitignore`; edit `CHANGELOG.md` / `milestones.yaml` / `project-stats.yaml` and run the corresponding build script.
- Do **not** edit `script.js` directly — it is auto-generated from `src/js/` source files, is in `.gitignore`, and must not be committed; edit the relevant file in `src/js/` and run `npm run build:js` to regenerate it locally.
- Do **not** edit `styles.css` directly — it is auto-generated from `styles/` source files, is in `.gitignore`, and must not be committed; edit the relevant file in `styles/` and run `npm run build:css` to regenerate it locally.
- Do **not** commit `script.js`, `styles.css`, `changelog-data.js`, `milestones-data.js`, or `project-stats-data.js` — these are all in `.gitignore` and are rebuilt by CI automatically.
- Do **not** bump the version in `package.json` manually — let release-please handle it via Conventional Commits.
- Do **not** use free-form commit or PR title messages — always follow the Conventional Commits format described above.
