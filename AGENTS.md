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
        ├── deploy.yml      ← Deploys index.html etc. to GitHub Pages on push to main
        └── test.yml        ← Runs `npm run test:ci` on every push / PR
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
npm ci            # install devDependencies
npm test          # jest --coverage (interactive)
npm run test:ci   # jest --ci --coverage (CI mode; fails on coverage drop)
```

**Coverage thresholds** (enforced in CI):

| Metric | Threshold |
|--------|-----------|
| Lines | 80 % |
| Functions | 80 % |
| Branches | 70 % |

The current measured coverage is ≈ 96 % statements / 88 % branches — do not let it drop below the thresholds.

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
Merging to `main` triggers the `deploy.yml` workflow automatically. No manual steps are required after the one-time GitHub Pages source has been set to **GitHub Actions** in repository settings.

---

## What NOT to Do

- Do **not** add runtime npm packages — the site must remain fully static.
- Do **not** introduce DOM references in `death-clock-core.js`.
- Do **not** remove or weaken the `escHtml()` guard on dynamic HTML.
- Do **not** skip tests when adding new pure functions to the core module.
- Do **not** change `BASE_TOKENS` / `TOKENS_PER_SECOND` / `BASE_DATE_ISO` independently — update all three as a set with a comment explaining the source.
