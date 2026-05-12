# PRD: The Token Confessional 🙏

## Overview

A modal "confessional booth" where visitors admit their most wasteful AI
prompt sin, either by typing a free-form confession or selecting from a
dropdown of pre-written sins. Upon confessing, the site calculates an estimate
of how many tokens that sin likely consumed, presents the environmental
equivalent, and grants a satirical "absolution" message. The absolution card
is shareable as text. Nothing is stored or transmitted — confessions are
completely ephemeral.

---

## Problem

The site quantifies global token waste in the abstract, but users do not
naturally connect the large numbers to their own individual behaviour. A
confession mechanic bridges that gap: it asks the user to name a specific
guilty behaviour, making the personal cost concrete and memorable. The
absurdist "absolution" creates an emotional release that is inherently
shareable.

---

## Goals

- Make the environmental cost of individual AI usage feel personal, not
  abstract
- Create a highly shareable "absolution card" moment
- Award a badge that rewards honest self-reflection (and encourages others to
  try it)

---

## Non-Goals

- Storing, transmitting, or aggregating confessions (privacy requirement:
  nothing leaves the browser)
- Penalising or shaming users — this is satirical and warm, not punitive
- Requiring a sign-in

---

## Feature Description

### Confession Modal

Triggered by a **"🙏 Enter the Confessional"** button in the Dashboard tab
(placed near the Personal Footprint Calculator).

The modal contains:

1. **Dropdown of preset sins** (with option to type a custom one):

   | # | Sin | Token estimate |
   |---|-----|----------------|
   | 1 | "Asked AI to write an email I could have written in 2 minutes" | ~400 tokens |
   | 2 | "Ran the same prompt 5+ times hoping for a different answer" | ~3,000 tokens |
   | 3 | "Used AI to name my WiFi network" | ~200 tokens |
   | 4 | "Generated 20+ images to find one I liked" | ~50,000 tokens |
   | 5 | "Asked AI to summarise a video I hadn't watched" | ~1,500 tokens |
   | 6 | "Let AI write a birthday card for someone I love" | ~300 tokens |
   | 7 | "Had a 2-hour philosophical debate with a chatbot" | ~120,000 tokens |
   | 8 | "Used AI to decide what to have for lunch" | ~250 tokens |
   | 9 | "Asked AI to 'make it pop'" | ~500 tokens |
   | 10 | "Generated code, didn't understand it, shipped it anyway" | ~2,000 tokens |
   | 11 | "I have sinned in ways I cannot name" | ~999,999 tokens |
   | (custom) | Free-text input (max 200 chars) | ~1,000 tokens (flat estimate) |

2. **"Confess 🙏"** button

### Absolution Card

After confessing, the modal transitions to an absolution screen:

```
┌─────────────────────────────────────────┐
│  🕯️  ABSOLUTION GRANTED  🕯️             │
│                                         │
│  Your sin: "[confession text]"          │
│                                         │
│  Estimated cost: ~[X] tokens            │
│  That's roughly: [equivalence]          │
│                                         │
│  "You are forgiven. For penance,        │
│   [satirical penance]."                 │
│                                         │
│  [Share My Absolution]  [Confess Again] │
└─────────────────────────────────────────┘
```

**Penance messages** (one randomly selected from a pool of 15):

- *"use a search engine once this week"*
- *"read the actual documentation"*
- *"write one email without AI assistance"*
- *"let a human summarise something for you"*
- *"sit with a question unanswered for five minutes"*
- *"close three browser tabs you opened with AI help"*
- *"use a dictionary"*
- *"think before you type"*
- *"drink a glass of water instead of running another prompt"*

**Equivalence** is drawn from the existing `sessionEquivalences()` helper in
`death-clock-core.js`, called with the sin's token estimate.

### Badge

| Badge ID | Icon | Name | Trigger |
|---|---|---|---|
| `confessed_sinner` | 🙏 | *Confessed Sinner* | First completed confession |
| `repeat_offender` | 😈 | *Repeat Offender* | 3 confessions in a single session |

### Share Button

Share text (assembled in JS, nothing from free-text user input is included
in the URL or share text for privacy):

> 🙏 I just confessed my AI sins at the Token Deathclock.
> My absolution: "[penance message]"
> What's YOUR worst AI sin? → [URL] #TokenDeathClock #AIConfessional

Note: The actual confession text is **never** included in the share text to
protect user privacy. Only the penance message is shared.

---

## Architecture Notes

| Layer | Change |
|-------|--------|
| `death-clock-core.js` | Add `CONFESSION_SINS` array (preset sins with token estimates); add `PENANCE_MESSAGES` array; add `getAbsolution(sinTokens, nowMs)` returning `{ equivalence, penance }` |
| `index.html` | Add `<div id="confessional-modal">` (hidden by default) with confession form and absolution card; add trigger button |
| `src/js/` | New `24-confessional.js`: `initConfessional()`, `openConfessional()`, `submitConfession()`, `showAbsolution()`, `closeConfessional()` |
| `styles/` | New rules in `features.css`: `.confessional-modal`, `.confessional-backdrop`, `.absolution-card`, `.penance-text` |

### Security / Privacy

- Free-text confession input is sanitised via `escHtml()` before any display
- Free-text is **never** included in share text or URLs
- No data leaves the browser; no `fetch()` or `beacon()` calls

---

## UX / Accessibility

- Modal follows ARIA modal pattern: `role="dialog"`, `aria-modal="true"`,
  `aria-labelledby` pointing to heading
- Focus is trapped inside the modal while open; `Escape` closes it
- On close, focus returns to the trigger button
- Absolution card text uses `textContent` throughout; the confession snippet
  shown inside the card is escaped via `escHtml()`
- `prefers-reduced-motion`: no fade/slide transitions, modal appears instantly
- Dark + light theme fully supported via CSS custom properties

---

## Success Metrics

- `confessed_sinner` badge earn rate
- Share button click rate on the absolution card
- `repeat_offender` badge earn rate (indicates high fun / replayability)

---

## Open Questions

- Should the absolution card be canvas-rendered for easier social-media
  screenshot sharing? (v2 — see Doom Postcard Generator PRD)
- Should there be a "global sin tally" shown in aggregate? (Requires a backend
  counter — deferred indefinitely given the no-backend constraint)
