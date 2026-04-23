# PRD: "What Could We Have Done Instead?" Equivalents Panel 🌱

## Overview

Every time AI consumes another chunk of tokens, show a rotating real-time panel of darkly funny (and occasionally hopeful) **alternative uses** for the same energy and water. Make humans feel the trade-off viscerally — and laugh uncomfortably.

---

## Problem

Abstract numbers (kWh, kg CO₂) don't land emotionally. Humans understand "that's enough electricity to run a refrigerator for 3 years" much better than "0.003 kWh per token." We need relatable, shareable equivalences baked into the live counter UI.

---

## Goals

- Make environmental stats emotionally resonant without adding doom fatigue
- Give visitors a "wait, really?!" moment they want to screenshot
- Require zero new dependencies

---

## Feature Description

### Rotating Equivalence Ticker

Below the existing **Environmental Impact Strip** (kWh / CO₂ / Water / Trees), add a **"What we could have done instead"** ticker that rotates every 5 seconds through a list of equivalences calculated in real time from the current `getCurrentTokens()` value.

Examples (based on tokens consumed since 2020):

| Category | Example |
|----------|---------|
| 🏠 Housing | "Powered **X homes** for a year" |
| 🚗 Transport | "Charged **X electric cars** end-to-end" |
| 🏥 Medicine | "Run **X hospital MRI machines** for an hour" |
| 📚 Education | "Printed **X copies** of every book ever written" |
| 🌊 Water | "Filled **X Olympic swimming pools**" |
| ☕ Coffee | "Brewed **X billion cups** of coffee" |
| 🌳 Trees | "Planted and grown **X forests** the size of Central Park" |
| 🍕 Food | "Baked **X million pizzas**" (oven energy) |
| 🕯️ Candles | "Burned **X candles** for a year" |
| 🚀 Space | "Launched **X SpaceX Falcon 9 rockets**" |

The comparison values update live as the total token counter ticks up.

### Snarky Mode Toggle

A small button labelled **"😤 Snarky Mode"** / **"🌱 Hopeful Mode"** flips the framing:

- **Hopeful mode** (default): "With that energy we could have powered X homes"
- **Snarky mode**: "Instead of that, AI generated X haiku about cats"

Snarky alternates include:
- "AI used enough water to make X glasses of water for a parched philosopher to ponder the meaning of consciousness"
- "Enough electricity to power X doorbells that will never ring because the last human moved away"
- "Sufficient CO₂ to slightly accelerate the heat death of the universe by approximately 0.0000001 seconds"

---

## Implementation Notes

- New pure function `generateEquivalences(tokens, mode)` → `Array<{icon, text}>` in `death-clock-core.js`
- Conversion constants (home kWh/year, car charge kWh, pool litres, etc.) declared alongside existing environmental constants
- Rotating display uses `setInterval` in `script.js` — no new dependencies
- Snarky strings are a static array in `death-clock-core.js` (pure, no DOM)
- The ticker element uses `aria-live="polite"` for accessibility

---

## Conversion Constants (draft)

| Equivalence | Conversion basis |
|------------|-----------------|
| Home electricity/year | 10,500 kWh/year (US average, EIA 2023) |
| EV full charge | 75 kWh (Tesla Model 3 LR) |
| Olympic pool volume | 2,500,000 L |
| Cup of coffee | 200 mL water + 0.042 kWh energy |
| Falcon 9 launch | ~4.9 GJ (~1,361 kWh) RP-1 + LOX |
| MRI machine (1 hr) | 20 kWh |

---

## Success Metrics

- Visitors spend longer on page (session time ↑)
- Social shares include the equivalence text (anecdotal)

---

## Open Questions

- Which 5–6 equivalences make the final rotating set? (User research / gut feel)
- Should we show both "what it cost" and "what it could have powered" side by side? (Clutters UI — defer to v2)
