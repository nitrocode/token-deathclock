# AI Death Clock 💀

[![Unit Tests](https://github.com/nitrocode/token-deathclock/actions/workflows/unit-tests.yml/badge.svg)](https://github.com/nitrocode/token-deathclock/actions/workflows/unit-tests.yml)
[![E2E Tests](https://github.com/nitrocode/token-deathclock/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/nitrocode/token-deathclock/actions/workflows/e2e-tests.yml)
[![Deploy](https://github.com/nitrocode/token-deathclock/actions/workflows/deploy.yml/badge.svg)](https://github.com/nitrocode/token-deathclock/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/nitrocode/token-deathclock/branch/main/graph/badge.svg)](https://codecov.io/gh/nitrocode/token-deathclock)

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

The site is automatically deployed on every push to `main` via the `deploy.yml` workflow.
It is live at `https://nitrocode.github.io/token-deathclock/`.

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
        ├── deploy.yml         ← GitHub Pages deployment
        ├── unit-tests.yml     ← Jest unit tests + Codecov upload
        └── e2e-tests.yml      ← Playwright E2E tests
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

