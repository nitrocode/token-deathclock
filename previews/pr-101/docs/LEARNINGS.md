# LEARNINGS.md — AI Agent PR Learnings Log

This is a living document for AI coding agents. It records recurring patterns,
gotchas, and lessons extracted from merged pull requests so agents can avoid
repeating past mistakes and build on what already works.

**Before opening a PR:** Scan the [Categorised Learnings](#categorised-learnings)
section for pitfalls relevant to your change area.

**After merging a PR:** Add a brief entry under [PR Log](#pr-log) using the
[template below](#pr-entry-template).

---

## PR Entry Template

Use this structure for every entry in the [PR Log](#pr-log):

```markdown
### PR #N — <Conventional Commit title>

- **Problem:** One-sentence description of what was broken or missing.
- **Approach:** What was changed and why that approach was chosen.
- **Learning:** The rule or pattern to carry forward (or avoid next time).
- **Key files:** Comma-separated list of the most important files touched.
```

---

## PR Description Template

Every PR description (written by a human or agent) must follow this structure:

```markdown
<One-paragraph explanation of the problem being solved and the chosen solution.>

## Changes

- [x] <Specific change 1>
- [x] <Specific change 2>
- [x] <Add more items as needed>

## Agent Checklist

- [ ] `npm run test:ci` passes (all unit tests green, coverage not decreased)
- [ ] `npm run build && npm run test:e2e` passes (all E2E tests green)
- [ ] No generated files committed (`script.js`, `styles.css`, `*-data.js`)
- [ ] All dynamic `innerHTML` values pass through `escHtml()`
- [ ] No DOM references in `death-clock-core.js`
- [ ] No new runtime npm packages
- [ ] GitHub Actions `uses:` pins use full commit SHA + semver comment
- [ ] PR title follows Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)
- [ ] `project-stats.yaml` updated if this session merges one or more PRs
```

---

## Categorised Learnings

### Mobile & CSS Layout

| # | Learning | Source PR |
|---|----------|-----------|
| M1 | `overflow-x: hidden` on `<html>` creates a scroll container that clips `position: fixed` children (GitHub corner, theme toggle). Use `overflow-x: clip` instead — it prevents scroll without creating a containing block. | #88 |
| M2 | On iOS Safari, `position: fixed` elements near the right viewport edge can still expose a horizontal scroll even with `overflow-x: hidden` on both `<html>` and `<body>`. Add `max-width: 100vw` and audit `right`/`transform` values. | #87 |
| M3 | `transform: translateX(-Npx)` on a fixed/absolute element combined with `overflow-x: hidden` clips the element on mobile. Remove the transform or switch to `overflow-x: clip`. | #75 |
| M4 | The tab bar must be `overflow-x: auto; white-space: nowrap` on mobile so tabs don't wrap or overflow. | #66 |
| M5 | Reduce the GitHub corner SVG from 80×80 px to 60×60 px to avoid overlapping content on small screens. | #74 |
| M6 | Always test layout changes at 375 px wide (iPhone SE) and 768 px (tablet) before marking a CSS PR complete. | #67 |

---

### Build System & Generated Files

| # | Learning | Source PR |
|---|----------|-----------|
| B1 | `script.js`, `styles.css`, `changelog-data.js`, `milestones-data.js`, and `project-stats-data.js` are auto-generated and **must never be committed**. They are in `.gitignore`; CI rebuilds them. Committing them causes merge conflicts when two branches exist simultaneously. | #80 |
| B2 | Add a `pretest` / `pretest:ci` npm lifecycle script that runs `npm run build` so tests always operate on fresh generated files, even in CI. | #80 |
| B3 | The esbuild minifier is invoked via `transformSync()` in memory — no config file is needed. The two-step pipeline (concatenate → minify) saves ~47% on JS and ~23% on CSS. | #61 |
| B4 | When the `peaceiris/actions-gh-pages` deploy step runs, it clones the target branch into a temp directory and does `git add --all`. Any file not in `exclude_assets` will be committed, including `.gitignore`. Add `.gitignore` to `exclude_assets` in both `deploy.yml` and `preview.yml` to prevent this. | #90 |
| B5 | In the preview workflow, upload screenshot assets to GitHub *after* the peaceiris deploy step, not before — otherwise the deploy overwrites them. | #90 |

---

### Testing

| # | Learning | Source PR |
|---|----------|-----------|
| T1 | E2E tests that assert on animations (e.g., reaper auto-hide) are flaky with tight timeouts on CI runners. Add 1–2 s of headroom beyond the animation duration (e.g., 4200 ms → 6000 ms). | #93 |
| T2 | Replace `page.waitForTimeout(N)` with polling-based assertions (`expect.poll()` or `waitFor`) whenever waiting for dynamic content. Polling is both faster and more reliable. | #93 |
| T3 | Tests that assert a counter "grows over time" are fragile if the test runs faster than the update interval. Assert liveness (`toBeTruthy()`) and non-emptiness instead of monotonic growth. | #93 |
| T4 | Always add a `toBeTruthy()` / null-guard before calling `.trim()` or `.toLowerCase()` on text extracted from the page — the element may not yet exist. | #93 |
| T5 | New pure functions in `death-clock-core.js` must have unit tests in `tests/death-clock.test.js`. Do not let coverage drop below 80% lines/functions, 70% branches. | AGENTS.md |

---

### Architecture & Code Organisation

| # | Learning | Source PR |
|---|----------|-----------|
| A1 | Split large monolithic JS files into numbered source files under `src/js/` (e.g., `00-state.js`, `01-theme.js`). The build script concatenates them in numeric order. | #56 |
| A2 | Enable TypeScript type-checking via `checkJs: true` in `tsconfig.json` with JSDoc annotations. This catches type errors in plain `.js` files without requiring a full TS migration. | #54 |
| A3 | `death-clock-core.js` must never reference the DOM (`document`, `window`, `getElementById`, etc.). All DOM wiring belongs in `src/js/`. This boundary keeps the core unit-testable. | AGENTS.md |
| A4 | The CommonJS + browser dual-export pattern (`module.exports` for Jest, `window.DeathClockCore` for the browser) must be maintained. Do not convert to ES modules without updating all consumers. | AGENTS.md |

---

### Security & Supply Chain

| # | Learning | Source PR |
|---|----------|-----------|
| S1 | All dynamic strings inserted via `innerHTML` must be escaped with `escHtml()` in `src/js/05-security.js`. Never assign untrusted data directly to `innerHTML`. | AGENTS.md |
| S2 | GitHub Actions `uses:` references must be pinned to a full commit SHA with the semver tag as an inline comment (`@abc1234 # v3.1.0`). Mutable tags (`@v3`) can be silently redirected, creating a supply-chain risk. | AGENTS.md |
| S3 | Dependabot is configured to open weekly PRs for GitHub Actions SHA bumps. Do not skip or dismiss those PRs. | AGENTS.md |

---

### Feature Design

| # | Learning | Source PR |
|---|----------|-----------|
| F1 | Fixed-position banners (milestone countdown, doomsday strip) that appear automatically are intrusive and confusing. Prefer in-context indicators (progress bar, card flash) over persistent overlays. | #78, #81, #86 |
| F2 | When removing a feature, delete all related HTML, JS functions, constants, and CSS together in the same PR. Partial removals leave dead code and confuse future agents. | #86 |
| F3 | Reuse existing data structures before creating new ones (e.g., new equivalences display reused the existing `EQUIVALENCES` array rather than duplicating data). | #84 |

---

### Conventional Commits & Release Flow

| # | Learning | Source PR |
|---|----------|-----------|
| C1 | All PR titles and squash-merge commit messages must follow Conventional Commits. release-please reads commit types to determine the version bump — a free-form title breaks the release automation. | AGENTS.md |
| C2 | `project-stats.yaml` (`pr_count` + `total_tokens`) must be updated at the end of every agent session that merges one or more PRs. Run `npm run build:project-stats` to regenerate the data file. | AGENTS.md |
| C3 | Do not manually bump the version in `package.json`. release-please handles versioning automatically when PRs are merged with Conventional Commit titles. | AGENTS.md |

---

## PR Log

Entries are grouped by release. Add new entries at the top of the appropriate release block. Start a new release block when a new version ships.

---

### v1.7.x

#### PR #94 — docs: add Phase 3 PRDs — 8 satirical engagement features

- **Problem:** No PRDs existed for the planned Phase 3 virality features.
- **Approach:** Added 8 PRD files under `docs/prd/` and updated `docs/prd/README.md` with a Phase 3 table and implementation order.
- **Learning:** PRDs should be written before implementation begins so agents have a clear spec to work from. Index them in `docs/prd/README.md`.
- **Key files:** `docs/prd/README.md`, `docs/prd/prd-*.md` (×8)

---

#### PR #93 — perf(tests): speed up E2E test suite

- **Problem:** E2E tests were slow and flaky on CI due to fixed `waitForTimeout` delays and tight animation timeouts.
- **Approach:** Switched to polling-based assertions, increased animation timeout headroom (4200 ms → 6000 ms), and enabled full parallel mode.
- **Learning:** Prefer `expect.poll()` / `waitFor` over `waitForTimeout`. Add 1–2 s headroom on animation-dependent assertions. Always null-guard text before `.trim()`. (→ T1–T4)
- **Key files:** `tests/e2e/death-clock.spec.js`, `playwright.config.js`

---

#### PR #92 — feat: replace header title/subtitle with live human extinction countdown

- **Problem:** The static "AI DEATH CLOCK" header lacked immediate emotional impact.
- **Approach:** Replaced the static headline with a live ticking countdown to the human extinction milestone, updated every second.
- **Learning:** Live counters anchored to `BASE_DATE_ISO` (not page-load time) stay synchronised across tabs and refreshes. Use the same anchor pattern as `getCurrentTokens()`.
- **Key files:** `src/js/00-state.js`, `src/js/21-boot.js`, `index.html`

---

#### PR #91 — chore: simplify CI workflows and build scripts

- **Problem:** Off-by-one in the logged line count and redundant CI steps added noise.
- **Approach:** Fixed the `split('\n').length - 1` off-by-one; merged redundant workflow steps.
- **Learning:** Log counts derived from `split('\n')` should guard against an empty string producing `['']` — use `str ? str.split('\n').length : 0`.
- **Key files:** `scripts/build-bundle.js`, `.github/workflows/ci.yml`

---

#### PR #90 — feat: show mobile and desktop screenshots in PR preview comment

- **Problem:** PR preview comments showed only a URL; reviewers had to open the link manually to check visual changes.
- **Approach:** Added a Playwright screenshot step in `preview.yml` that captures desktop (1280×800) and mobile (390×844) views, uploads them via the GitHub Content API, and embeds them in the preview comment.
- **Learning:** Upload screenshot assets *after* the peaceiris deploy step (→ B5). Add `.gitignore` to `exclude_assets` in both `deploy.yml` and `preview.yml` (→ B4).
- **Key files:** `.github/workflows/preview.yml`, `.github/workflows/deploy.yml`

---

#### PR #88 — fix: stop GitHub corner and theme toggle from being clipped on scroll

- **Problem:** `overflow-x: hidden` on `<html>` created a new scroll container, causing `position: fixed` descendants to be clipped as the page scrolled.
- **Approach:** Replaced `overflow-x: hidden` on `html` with `overflow-x: clip`, which suppresses overflow scrolling without establishing a containing block.
- **Learning:** Use `overflow-x: clip` (not `hidden`) when you need to suppress horizontal scroll but also have `position: fixed` children. (→ M1)
- **Key files:** `styles/base.css`

---

#### PR #87 — fix: remove horizontal scroll on mobile

- **Problem:** iOS Safari exposed a horizontal scroll bar on mobile despite `overflow-x: hidden` on both `<html>` and `<body>`.
- **Approach:** Identified fixed elements near the right edge and added `max-width: 100vw` / adjusted `right` values.
- **Learning:** On iOS Safari, `position: fixed` elements near the viewport edge can break `overflow-x: hidden`. Audit every fixed/absolute element at 375 px viewport width. (→ M2)
- **Key files:** `styles/base.css`, `styles/footer.css`

---

### v1.6.x

#### PR #86 — fix: remove doomsday clock strip banner

- **Problem:** A previously added doomsday strip banner was visually cluttered and confusing.
- **Approach:** Removed the entire strip: HTML block, JS function, constants, and CSS together.
- **Learning:** Remove all artefacts of a feature (HTML + JS + CSS + constants) in one PR. Partial removals leave dead code. (→ F2)
- **Key files:** `index.html`, `src/js/18-scary-features.js`, `styles/scary-features.css`

---

#### PR #85 — feat: float-up +N pops on all counters + ×10ⁿ scientific notation

- **Problem:** The float-up animation only existed on the total token counter; all other counters were unanimated. Large numbers had no scale indicator.
- **Approach:** Refactored `spawnTokenPop` into a generic `spawnPop(container, text, cssClass)` reused across all counters. Added `appendExp()` helper for scientific notation suffixes.
- **Learning:** Extract shared visual behaviour into a generic helper early. Suppress `+0` pops with a `MIN_STAT_POP_THRESHOLD` constant to avoid visual noise.
- **Key files:** `src/js/02-counter.js`, `src/js/00-state.js`, `styles/features.css`

---

#### PR #84 — feat: grim reaper scythe swing, speech bubbles, and proximity reactions

- **Problem:** The grim reaper was a static decoration with no interactivity.
- **Approach:** Added periodic scythe swing animation, themed speech bubbles, and mouse-proximity + click reactions via CSS classes toggled by JS.
- **Learning:** Reuse existing data arrays (e.g., `EQUIVALENCES`) for new content rather than duplicating data. (→ F3)
- **Key files:** `src/js/18-scary-features.js`, `styles/scary-features.css`, `index.html`

---

#### PR #83 — feat: changelog — render markdown links, collapse older releases

- **Problem:** Changelog rendered raw markdown syntax (`[#79](url)`) as literal text; all releases were expanded at once.
- **Approach:** Added a simple markdown-link regex pass before inserting into the DOM; wrapped older releases in a `<details>` element.
- **Learning:** Always apply `escHtml()` first, then do the markdown-link substitution on the escaped string to avoid XSS from crafted link text or URLs.
- **Key files:** `src/js/08-static-renders.js`

---

#### PR #81 — fix: remove "5 min to midnight" text from doomsday strip

- **Problem:** The "X.X MIN TO MIDNIGHT" text label was redundant and confusing since the visual clock already conveyed the same information.
- **Approach:** Removed the text node from the strip HTML and the associated JS update call.
- **Learning:** Redundant labels add noise. If a visual element already communicates a value, remove any duplicate text equivalent. (→ F1)
- **Key files:** `index.html`, `src/js/18-scary-features.js`

---

### v1.5.x

#### PR #80 — chore: exclude generated files from git

- **Problem:** Generated files (`script.js`, `milestones-data.js`, etc.) were committed, causing merge conflicts when two branches were open simultaneously.
- **Approach:** Added them to `.gitignore`; added `pretest` / `pretest:ci` lifecycle scripts to ensure they are built before tests run.
- **Learning:** Auto-generated files must never be in git. Always add a `pretest` lifecycle script that runs the build. (→ B1, B2)
- **Key files:** `.gitignore`, `package.json`

---

#### PR #79 — feat: add anchor links to section headings

- **Problem:** No deep-link anchors existed for individual sections, making sharing a specific section impossible.
- **Approach:** Added `#section-id` anchors to every `<h2>` with a hover/focus reveal pattern using CSS `:focus-within` and `@media (hover: none)`.
- **Learning:** Section anchors need both `:hover` and `:focus-within` selectors, plus `@media (hover: none)` for touch devices that can't hover.
- **Key files:** `styles/base.css`, `index.html`

---

#### PR #78 — feat: remove milestone countdown alert banner

- **Problem:** The fixed-position top banner that appeared ~2 minutes before a milestone was intrusive and blocked content.
- **Approach:** Removed the countdown banner; retained the in-card flash animation on the milestone card itself.
- **Learning:** Prefer in-context micro-animations (card flash) over fixed-position overlay banners. (→ F1)
- **Key files:** `src/js/19-milestone-alert.js`, `styles/social.css`, `index.html`

---

#### PR #77 — fix: redesign grim reaper scythe and arm colours

- **Problem:** The scythe blade looked like a golf club head; bony arm strokes used hardcoded grey that was invisible in dark mode.
- **Approach:** Redesigned the SVG blade path; replaced hardcoded colour values with CSS custom properties tied to the theme system.
- **Learning:** Never use hardcoded colour values in SVG or inline styles for elements that must respect the dark/light theme. Always use CSS custom properties.
- **Key files:** `index.html`, `styles/scary-features.css`

---

#### PR #75 — fix: remove mobile peek offset that clips grim reaper

- **Problem:** `transform: translateX(-8px)` combined with `overflow-x: hidden` on `<html>` clipped the left edge of the grim reaper on small screens.
- **Approach:** Removed the peek transform.
- **Learning:** `transform` on a positioned element inside an `overflow: hidden` ancestor clips the element. (→ M3)
- **Key files:** `styles/scary-features.css`

---

#### PR #74 — fix: reduce GitHub corner icon size on mobile

- **Problem:** The 80×80 px GitHub corner SVG overlapped the tab bar on mobile.
- **Approach:** Reduced to 60×60 px via a CSS media query.
- **Learning:** Fixed-position decorative elements need a `@media (max-width: 480px)` size reduction when they share screen space with navigation. (→ M5)
- **Key files:** `styles/base.css`

---

#### PR #73 — fix: update Node.js to v22

- **Problem:** CI was pinned to an older Node.js version.
- **Approach:** Updated `.nvmrc` to `22`.
- **Learning:** Keep `.nvmrc` in sync with the version matrix in CI workflows.
- **Key files:** `.nvmrc`

---

#### PR #66 — fix: make tab bar horizontally scrollable on mobile

- **Problem:** The tab bar wrapped onto multiple lines on narrow viewports.
- **Approach:** Added `overflow-x: auto; white-space: nowrap` to the tab container.
- **Learning:** Tab bars must scroll horizontally on mobile rather than wrapping. (→ M4)
- **Key files:** `styles/hero-tabs.css`

---

### v1.4.x

#### PR #61 — feat: esbuild minification, bundler PRD, and CLAUDE.md symlink

- **Problem:** `script.js` and `styles.css` were served unminified (~140 KB JS, ~86 KB CSS).
- **Approach:** Added esbuild as a devDependency; built a two-stage pipeline (concatenate in memory → `transformSync()` minify). Created `CLAUDE.md` as a symlink to `AGENTS.md` so Claude agents auto-discover the same instructions.
- **Learning:** `CLAUDE.md` must remain a symlink to `AGENTS.md` — never diverge the two files. (→ B3)
- **Key files:** `scripts/build-js.js`, `scripts/build-css.js`, `CLAUDE.md`, `docs/prd/bundler.md`

---

#### PR #56 — refactor: split large files into organised source structure

- **Problem:** `script.js` was a single 3000-line file that was difficult to navigate and caused merge conflicts.
- **Approach:** Split into 22 numbered source files under `src/js/` concatenated by the build script.
- **Learning:** Large monolithic files should be split early. Numbering source files (00–21) makes concatenation order explicit. (→ A1)
- **Key files:** `src/js/*.js`, `scripts/build-js.js`

---

#### PR #54 — feat: implement checkJs TypeScript type checking

- **Problem:** No static type checking existed; type errors were only caught at runtime.
- **Approach:** Enabled `"checkJs": true` and `"strict": true` in `tsconfig.json`; added JSDoc `@type` annotations to key functions.
- **Learning:** `checkJs` + JSDoc catches the most impactful type errors without requiring a full TS migration. (→ A2)
- **Key files:** `tsconfig.json`, `death-clock-core.js`, `global.d.ts`
