# PRD: "What If?" Scenario Simulator 🔬

## Overview

An interactive panel lets visitors adjust global assumptions with sliders —
e.g. *"What if 30% of AI inference moved to smaller models?"* or *"What if
data centres went 100% renewable?"* — and watch the CO₂, water, and milestone
prediction table update in real time. Up to three named preset scenarios can
be applied with one click. The resulting assumptions can be encoded into the
URL hash for sharing.

---

## Problem

The site's existing projections show only one trajectory: the worst case. This
is effective for shock value but provides no emotional hook of *hope*, and
gives the user no sense of agency. Interactivity with sliders and visible
real-time updates is one of the highest-engagement patterns in data
journalism, and the scenario sharing mechanism drives return traffic when
others receive the URL.

---

## Goals

- Increase average session duration by giving visitors sliders to explore
- Balance the doom with a *hope* mechanic: seeing the counter slow under a
  "Efficient Future" scenario provides genuine emotional contrast
- Create shareable URLs that encode custom scenarios (drives referral traffic)

---

## Non-Goals

- Changing the authoritative global counter (all simulation is overlay-only)
- Running actual AI model inference
- Requiring a backend

---

## Feature Description

### Adjustable Parameters

| Parameter | Slider Range | Default | Effect |
|---|---|---|---|
| Smaller model adoption | 0–80% | 0% | Reduces effective `tokensPerSec` by up to 50% (smaller models use ~0.1× energy) |
| Renewable energy share | 0–100% | 30% | Reduces CO₂ multiplier proportionally |
| Prompt efficiency gain | 0–60% | 0% | Reduces tokens per equivalent workload |

### Preset Scenarios

- **Status Quo** (defaults as above)
- **Efficient Future** (60% smaller models, 80% renewables, 30% efficiency)
- **Hypergrowth** (0% smaller models, 30% renewables, −20% efficiency from
  more complex use cases)

### Real-Time Update

- As sliders move, the scenario computes adjusted:
  - Effective `tokensPerSec`
  - CO₂ factor (kWh → CO₂)
  - A re-projected milestone prediction table (re-renders in place)
  - Updated environmental impact strip numbers (kWh, CO₂, water)
- The main global counter is **not** affected — a separate "Scenario Counter"
  is shown in the simulator panel to avoid confusion

### URL Sharing

- *Share This Scenario* button encodes parameters as URL hash:
  `#scenario=smaller:40,renewable:70,efficiency:20`
- On load, if a `#scenario` hash is present, the simulator opens
  automatically with those values pre-set

---

## Architecture Notes

| Layer | Change |
|-------|--------|
| `death-clock-core.js` | Add `applyScenario(baseRate, baseCo2Factor, params)` pure function that returns adjusted rate and CO₂ factor |
| `index.html` | New `<section id="simulator-section">` with 3 range sliders, preset buttons, and adjusted stats grid |
| `script.js` | `initSimulator()`, `updateSimulator()`, `buildScenarioUrl()`, `parseScenarioFromUrl()` |
| `styles.css` | `.simulator-sliders`, `.scenario-presets`, `.scenario-stats` |

---

## UX / Accessibility

- Each slider is a native `<input type="range">` with labelled `<output>`
  element showing current value
- Range inputs have `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
- The scenario counter is visually distinct from the main counter (different
  colour, labelled "Scenario Projection")
- `prefers-reduced-motion`: transition on stat numbers is disabled
