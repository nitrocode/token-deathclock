# PRD: Token Exchange Rate Board 💹

## Overview

A "stock ticker"-style scrolling board displays live "exchange rates" between
AI tokens and absurd real-world things, updating every few seconds. Formatted
like a financial terminal with green-on-black aesthetic, it shows satirical
equivalences such as *"1 Haiku = 🌮 0.0003 Tacos"* and *"Right now AI is
generating 🥚 [N] eggs-worth of energy every second."* All data is calculated
client-side using the existing equivalences logic; no backend is required.

---

## Problem

The site already shows environmental equivalences in the "What Could We Have
Done Instead?" strip, but that section presents one item at a time and blends
into the page. The token economy data is genuinely interesting and could be
presented in a much more visually engaging and repeatable way. A financial
terminal aesthetic creates a fun, ironic contrast between the sterile language
of finance and the environmental absurdity of AI token consumption.

---

## Goals

- Increase time spent on the Dashboard tab through an entertaining live
  visual element
- Reuse existing equivalences logic without duplicating logic or adding
  dependencies
- Create another "ticker" style visual element that rewards re-reads as the
  numbers change in real time

---

## Non-Goals

- Actual financial data or real market prices
- Backend APIs or WebSocket connections
- User-customisable exchange items

---

## Feature Description

### Board Layout

A horizontally scrolling marquee-style strip (or a vertically updating table —
both are acceptable; the scrolling marquee is preferred for visual dynamism).
It cycles through a list of "exchange rate" items, each on a line:

```
💹 TOKEN EXCHANGE BOARD — LIVE RATES

  GPT-4 haiku (100 tok)   = 🌮  0.0003 tacos
  Average ChatGPT reply   = ☕  0.008 cups of coffee
  One full novel (90K tok) = 🌍  23 g CO₂
  Right now (this second)  = 🥚  [N] eggs-worth of energy
  Since you loaded this page = 🚗  [X] metres driven
  Tokens since midnight    = 💡  [Y] LED-hours
```

Numbers that include session or real-time data (eggs, metres, LED-hours) are
recomputed every **5 seconds** using `getCurrentTokens()` and
`calculateEnvironmentalImpact()` from the existing core module.

### Exchange Rate Items

| Label | Calculation | Update frequency |
|-------|-------------|-----------------|
| GPT-4 haiku (100 tok) | Static: 100 tokens ≈ energy to heat 3 mL water | Static |
| Average ChatGPT reply (~800 tok) | Static: 800 tok ≈ 0.0008 kWh | Static |
| Full novel (90K tok) | Static: 90K tok ≈ 23 g CO₂ | Static |
| Tokens this second | `TOKENS_PER_SECOND` static | Static |
| Tokens since you arrived | `sessionTokens` | Every 5 s |
| Global tokens today | `getCurrentTokens() - tokensAtUTCMidnight` | Every 5 s |
| Session CO₂ (mg) | `calculateEnvironmentalImpact(sessionTokens).co2Grams * 1000` | Every 5 s |

### Visual Style

- Black background panel (dark-mode aware: `var(--bg-terminal)` custom
  property, fallback `#0a0a0a`)
- Green monospace text (`var(--color-terminal-green)`, fallback `#00ff41`)
- Amber for the live-updating numbers (`var(--color-terminal-amber)`,
  fallback `#ffb300`)
- Header row: *"💹 TOKEN EXCHANGE BOARD — LIVE RATES"* in uppercase
- Each row: left-aligned label, right-aligned value with icon
- Subtle scanline CSS overlay using a `::before` pseudo-element repeating
  gradient for the retro terminal look

---

## Architecture Notes

| Layer | Change |
|-------|--------|
| `death-clock-core.js` | No new functions needed; uses existing `getCurrentTokens()`, `calculateEnvironmentalImpact()`, `TOKENS_PER_SECOND` |
| `index.html` | Add `<section id="exchange-board-section">` with the board container |
| `src/js/` | New `25-exchange-board.js`: `initExchangeBoard()`, `updateExchangeBoard()` (called every 5 s via `setInterval`); static rates computed once at init, live rates updated on interval |
| `styles/` | New rules in `features.css`: `.exchange-board`, `.exchange-board-header`, `.exchange-row`, `.exchange-value-live`, scanline pseudo-element |

---

## UX / Accessibility

- The board is a `<table>` with `<caption>` for screen readers
- Live cells have `aria-live="polite"` and `aria-atomic="true"` so screen
  readers announce updates without spamming
- The terminal colour scheme meets WCAG AA contrast on its dedicated dark
  background
- `prefers-reduced-motion`: horizontal marquee scroll (if used) is replaced
  with a static list
- Dark / light theme: light mode shows a soft dark panel to keep the terminal
  aesthetic without a jarring full-page brightness shift

---

## Success Metrics

- Scroll depth into the Dashboard section (proxy: time before scroll-past)
- Return visit rate (secondary — this feature alone is not expected to drive
  returns, but reinforces daily check-in habit when combined with Horoscope)

---

## Open Questions

- Should there be a *"Copy Exchange Rate"* button so users can paste a single
  stat into social posts? (Low effort v2 addition)
- Should the board have a fullscreen/expand mode for live events / talks?
  (v2)
