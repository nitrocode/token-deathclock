# AI Death Clock 💀

> **Live site:** `https://nitrocode.github.io/token-deathclock/`

A GitHub Pages visualisation that shows the environmental cost of global AI token consumption — featuring live counters, milestone tracker, and a token-growth chart with projections.

Created by **RB**.

---

## Features

| Feature | Details |
|---------|---------|
| **Live counter** | Estimated global AI tokens consumed since Jan 2020, ticking in real-time |
| **Session counter** | Tokens consumed globally since *you* opened the page |
| **Environmental milestones** | 7 thresholds (trees → bees → water → coral → glaciers → ocean → extinction) with triggered status, progress bars, and consequence descriptions |
| **Growth chart** | Historical data + 18-month projection on a log scale (Chart.js) |
| **Predictions table** | Predicted calendar dates for each milestone |
| **Dark / Light mode** | Toggle button; dark mode is the default |

---

## Running Locally

```bash
# Clone and open
git clone https://github.com/nitrocode/token-deathclock.git
cd token-deathclock
# Serve with any static server, e.g.:
npx serve .
# Then open http://localhost:3000
```

---

## Running Tests

```bash
npm install
npm test          # runs Jest with coverage
npm run test:ci   # CI mode (fails on coverage drop)
```

Tests are in `tests/death-clock.test.js` and cover all pure functions in `death-clock-core.js`.

---

## Deployment (GitHub Pages)

### One-time setup required after merging to `main`

1. Go to **Settings → Pages** in this repository.
2. Under **Source**, select **GitHub Actions**.
3. Push or re-run the `Deploy to GitHub Pages` workflow.
4. The site will be live at `https://nitrocode.github.io/token-deathclock/`.

> ⚠️ The workflow file (`.github/workflows/deploy.yml`) is already included.
> Only step 2 (enabling GitHub Actions as the Pages source) needs to be done manually once in the repository settings.

---

## Architecture

```
.
├── index.html            ← Main GitHub Pages entry point
├── styles.css            ← Dark/light theme, animations, layout
├── death-clock-core.js   ← Pure functions (no DOM deps; testable)
├── script.js             ← DOM manipulation, Chart.js, RAF loop
├── package.json          ← Jest config & dev deps
├── tests/
│   └── death-clock.test.js
└── .github/
    └── workflows/
        ├── deploy.yml    ← GitHub Pages deployment
        └── test.yml      ← CI test runner
```

---

## Environmental Data Sources

| Metric | Source |
|--------|--------|
| Energy per token (~0.0003 kWh / 1K tokens) | Google/DeepMind inference benchmarks, MLPerf |
| CO₂ per kWh (0.4 kg) | IEA global average grid intensity 2024 |
| Water per token (~0.5 L / 1K tokens) | Microsoft sustainability report 2023 |
| CO₂ per tree (~21 kg/year) | US Forest Service estimates |
| Historical token growth | OpenAI usage blog, Epoch AI, AI Index 2024 |

> All figures are illustrative estimates intended to communicate scale, not precise measurements.

---

## Repo Score & Roadmap

### Score: 72 / 100 — Grade: C+

| Category | Score | Notes |
|---|---|---|
| **Code quality** | 17/20 | Clean separation of concerns; pure-function core; consistent style |
| **Test coverage** | 18/20 | 96 % statement coverage on the tested module; 75 passing tests |
| **Documentation** | 12/20 | Good README; AGENTS.md added; missing CONTRIBUTING.md, LICENSE |
| **CI / CD** | 9/10 | Test + deploy workflows both present and functional |
| **Accessibility** | 7/10 | ARIA live regions, roles, and values; dark/light toggle |
| **Security** | 9/10 | `escHtml` guards all dynamic content; CSP meta tag restricts scripts/fonts/styles; Chart.js pinned with SRI hash |
| **Bug count** | 3/10 | `getCurrentTokens()` used `pageLoadTime` instead of `BASE_DATE_ISO`, causing the total counter to restart at `BASE_TOKENS` on every page load |
| **Community files** | 0/10 | No LICENSE, no CONTRIBUTING.md, no SECURITY.md |

### Roadmap

#### Priority 1 — Correctness (immediate)
- [x] **Fix total-counter anchor** — `getCurrentTokens()` now uses `BASE_DATE_ISO` so the counter reflects true elapsed time since the data anchor, not since the page was loaded.

#### Priority 2 — Community & compliance
- [x] Add a `LICENSE` file (MIT or Apache-2.0 recommended).
- [x] Add `CONTRIBUTING.md` with a pull-request checklist and coding conventions.
- [x] Add `SECURITY.md` with a vulnerability-disclosure policy.
- [x] Add a `CODEOWNERS` file to set review requirements.

#### Priority 3 — Security hardening
- [x] Add a `Content-Security-Policy` meta tag in `index.html` to restrict inline scripts and limit allowed CDN origins (Chart.js, Google Fonts).
- [x] Pin the Chart.js CDN URL to a known-good SRI hash.
- [x] Add Dependabot config (`.github/dependabot.yml`) for automatic npm and GitHub Actions version bumps.

#### Priority 4 — Test completeness
- [x] Add integration / smoke tests for `script.js` DOM logic using `jest-environment-jsdom`.
- [x] Cover the two uncovered lines in `death-clock-core.js` (line 251 now covered; lines 443-444 are the browser-only `window` export path that is unreachable in Jest's Node module environment — behaviour is verified via `vm.runInNewContext`).
- [x] Add a test that asserts `getCurrentTokens()` grows with time rather than resetting on reload.

#### Priority 5 — Developer experience
- [ ] Add `.nvmrc` to pin the Node.js version.
- [ ] Add `.editorconfig` or a Prettier config for consistent formatting.
- [ ] Add a `"homepage"` field in `package.json` matching the GitHub Pages URL.
- [ ] Add a `CHANGELOG.md` to track releases.