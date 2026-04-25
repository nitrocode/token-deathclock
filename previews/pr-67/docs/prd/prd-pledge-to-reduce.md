# PRD: "Pledge to Reduce" — Personal Token Budget Commitment 🌱

## Overview

After the Personal Footprint Calculator, a *"Set My Weekly Token Budget"*
button lets visitors commit to a usage reduction goal. The pledge (goal
percentage, baseline, and date) is stored in `localStorage`. On subsequent
visits, a persistent banner shows progress: *"You pledged 6 days ago. If
you've kept it up, you've saved ~X tokens so far. 💪"* The pledge can be
shared via the existing share flow.

---

## Problem

The Tips section tells users what to change, and the Calculator quantifies
their current impact, but neither creates a commitment device. Commitment-and-
consistency bias (Cialdini, 1984) shows that people who publicly state an
intention are significantly more likely to follow through — and are more
likely to return to the site to check their progress.

---

## Goals

- Drive day-7 and day-30 return visit rate (visitor returns to see progress)
- Create a second type of social sharing beyond pure doom ("I pledged to cut
  my AI usage — challenge your friends")
- Reinforce the Tips section as actionable, not just informational

---

## Non-Goals

- Tracking actual AI usage (no browser extension or API integration)
- Verifying compliance (honour system only — the estimate is illustrative)
- Backend storage

---

## Feature Description

### Pledge Form

Shown below the Calculator results when the Calculator is open:

1. **Reduction slider:** *"I will reduce my weekly AI prompts by [30]%"*
   (range 5–80%, default 30%)
2. *"Take the Pledge 🌱"* button
3. On submission: a confirmation toast *"Pledge saved. Come back tomorrow to
   see your projected savings grow."* + the `pledge_taker` badge is awarded

### Return Visit Progress Banner

On subsequent visits where a pledge exists:

```
🌱 You pledged [N days] ago to cut your AI usage by [X]%.
   Estimated savings so far: ~[Y tokens] · ~[Z g CO₂]
   [Update Pledge]  [Share My Progress]
```

- Placed at the top of the Tips section (where it's relevant)
- Token/CO₂ savings are estimated as `baseWeeklyTokens × reductionPct × daysElapsed / 7`
- *"Update Pledge"* opens the pledge form again (can increase or decrease goal)

### Sharing

- *"Share My Progress"* generates text:
  *"I pledged to reduce my AI usage by [X]% on the AI Death Clock.
  [N] days in — that's an estimated [Y tokens] saved.
  → [URL] #AIFootprint #TokenDeathClock"*
- Uses the existing `openSharePopup()` helper

### Badges

| Badge ID | Icon | Name | Trigger |
|---|---|---|---|
| `pledge_taker` | 🌱 | *Pledge Taker* | First time a pledge is saved |
| `pledge_keeper` | 💚 | *Pledge Keeper* | Return visit ≥ 7 days after pledging |

---

## Architecture Notes

| Layer | Change |
|-------|--------|
| `death-clock-core.js` | No changes needed |
| `index.html` | Add pledge form below `#calc-content`; add progress banner in tips section |
| `script.js` | `savePledge()`, `loadPledge()`, `renderPledgeBanner()`, `buildPledgeShareText()`; new badge IDs |
| `styles.css` | `.pledge-form`, `.pledge-banner`, `.pledge-progress` |

---

## UX / Accessibility

- The pledge form is inside the already-collapsible Calculator section, so it
  doesn't add visual clutter for users who skip the Calculator
- The progress banner uses `aria-live="polite"` to announce on first render
- All dynamic strings are set via `textContent`, not `innerHTML`
- localStorage errors are caught and silently ignored
