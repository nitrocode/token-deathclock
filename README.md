# AI Death Clock 💀

> **Live site:** `https://nitrocode.github.io/game/`

A GitHub Pages visualisation that shows the environmental cost of global AI token consumption — featuring live counters, milestone tracker, token-growth chart with projections, and a prompt/PR scoring section.

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
| **Prompt & PR scoring** | Collapsible section showing the rubric, recommendations, and score improvement |

---

## Running Locally

```bash
# Clone and open
git clone https://github.com/nitrocode/game.git
cd game
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
4. The site will be live at `https://nitrocode.github.io/game/`.

> ⚠️ The workflow file (`.github/workflows/deploy.yml`) is already included.
> Only step 2 (enabling GitHub Actions as the Pages source) needs to be done manually once in the repository settings.

---

## Prompt & PR Score

| | Score |
|---|---|
| **Prompt (initial)** | 74 / 100 |
| **Prompt (after recommendations)** | 94 / 100 |

### Recommendations addressed

| Recommendation | Impact | Status |
|---|---|---|
| Define "life essential" categories explicitly | +2 pts | ✅ Done |
| Specify exact token thresholds for each milestone | +4 pts | ✅ Done |
| Define preferred charting library (Chart.js) | +2 pts | ✅ Done |
| Cite data sources for environmental correlations | +2 pts | ✅ Done |
| Specify test framework (Jest) | +3 pts | ✅ Done |
| Include GitHub Pages deployment configuration | +4 pts | ✅ Done |
| Specify responsive-design requirements | +3 pts | ✅ Done |
| Define visual style | +1 pt | ✅ Done |

### Recommendations not yet addressed

| Recommendation | Impact |
|---|---|
| Specify minimum test-coverage percentage | +3 pts |
| List specific test scenarios in prompt | +2 pts |

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