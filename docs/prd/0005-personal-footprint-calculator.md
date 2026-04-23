# PRD: Personal AI Carbon Footprint Calculator 🧮

## Overview

Let visitors enter how many AI prompts they've sent this week/month and instantly receive a personalised (and guilt-inducing) environmental tally — complete with shareable results. Humans love discovering that *they* are part of the problem.

---

## Problem

The site currently shows aggregate global stats, which can feel abstract and distant ("not my fault"). A personalised calculator makes the visitor complicit, emotionally invested, and much more likely to share the result with a mix of pride and horror.

---

## Goals

- Give visitors a personal stake in the data
- Generate a highly shareable personalised "doom receipt"
- Remain entirely client-side with no new runtime dependencies

---

## Feature Description

### Calculator UI

A collapsible card (initially collapsed, labelled **"💻 How much did *you* destroy?"**) containing:

**Step 1 — Usage inputs**

| Input | Label | Default |
|-------|-------|---------|
| Number slider (1–500) | "Prompts sent this week" | 20 |
| Dropdown | "Typical prompt length" | Medium (~500 tokens) |
| Dropdown | "Which AI do you use most?" | GPT-4 class model |
| Checkbox | "I also run local models (e.g. Ollama, LM Studio)" | unchecked |

Prompt-length options map to token estimates:
- Short tweet-style (~100 tokens)
- Medium paragraph (~500 tokens)
- Long essay / code review (~2,000 tokens)
- Deep research / long doc (~8,000 tokens)

Model multipliers (energy cost per token, relative to GPT-3.5 baseline = 1×):
- GPT-3.5 / smaller models: 1×
- GPT-4 class: 4×
- GPT-4o / Claude 3: 3×
- o1 / reasoning models: 8×
- Local CPU model: 0.1×

**Step 2 — Results panel**

After any input change (reactive, no submit button), show:

```
🧾 YOUR WEEKLY AI FOOTPRINT

Tokens generated:        ~40,000
Energy consumed:         ~0.012 kWh
CO₂ emitted:             ~4.8 g
Water used:              ~20 mL
Trees needed to offset:  0.00016 trees/year

Annualised:
CO₂/year:                ~250 g  (≈ driving 1.5 km)
Water/year:              ~1,040 mL  (≈ 5 glasses)

Scale to everyone like you (est. 500M AI users):
Global weekly CO₂:       ~2,400 tonnes
= 🚗 10,000 cars driving for a week
```

**Step 3 — Share button**

Pre-fills a tweet:
> 🧮 I sent 20 AI prompts this week. That's ~40k tokens, ~5g of CO₂, and 20mL of water. Multiply me by 500 million and 👀
> → [link] #AICarbonFootprint #TokenDeathClock

---

## Implementation Notes

- New pure function `calculatePersonalFootprint(prompts, tokensEach, modelMultiplier)` in `death-clock-core.js`
- Returns `{ tokens, kWh, co2Kg, waterL, treesEquivalent }` — reuses `calculateEnvironmentalImpact` logic
- All UI in `index.html` (new collapsible section), logic in `script.js`
- Inputs use `<input type="range">`, `<select>` — no new dependencies
- Results update via `input` event listeners (reactive, no debounce needed for simple math)
- Share text assembled safely using `textContent` / URL-encoded params

---

## Privacy

- Zero data leaves the browser — all calculations are pure client-side JS
- No cookies, no analytics on inputs

---

## Success Metrics

- Engagement: visitors interact with the calculator (time-on-section proxy)
- Shares: social posts tagged #AICarbonFootprint

---

## Open Questions

- Should we show a "vs. the average person" comparison bar? (Nice to have, v2)
- Should "local model" toggle show a *lower* CO₂ number but higher notes about hardware manufacturing? (Interesting nuance, v2)
- Monthly vs weekly framing? (Weekly feels more tangible — keep for v1)
