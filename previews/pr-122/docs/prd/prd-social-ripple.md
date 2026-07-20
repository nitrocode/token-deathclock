# PRD: Social Ripple — "You're Not Alone" Live Presence Feed 🌍

## Overview

A small strip in the Live Counter section displays a simulated real-time
viewer count: *"🌍 247 people watching right now."* The number is a
deterministic function of time-of-day and day-of-week, so it feels live
without any backend infrastructure. A rotating feed of anonymised
one-liner reactions updates every 25 seconds to reinforce social proof.

---

## Problem

Doom-and-gloom pages feel solitary. A visitor staring at the counter alone
is easier to dismiss than one who perceives hundreds of others doing the same
thing. Social proof is one of the strongest retention signals available
without requiring accounts or real-time infrastructure.

---

## Goals

- Reduce bounce rate by making visitors feel part of a community
- Increase time-on-page through social validation ("others are staying, so
  should I")
- Zero infrastructure cost — entirely client-side, no requests

---

## Non-Goals

- Actual real-time visitor tracking (GDPR / privacy concerns, not needed)
- User accounts or persistent identity
- Chat or comments section (v2)

---

## Feature Description

### Viewer Count

- Displayed as: *"🌍 [N] people watching right now"*
- **Formula:** `getSimulatedViewerCount(dateMs)` — pure function in
  `death-clock-core.js`:
  - Base of ~160 viewers
  - Hour multiplier: peaks around 14:00 UTC (EU afternoon / NA morning),
    troughs around 03:00 UTC
  - Weekday vs weekend multiplier (weekdays ~1.25×)
  - Low-frequency sine variation (~1.8-hour period) for organic jitter
  - Result is snapped to nearest 5, minimum 12
- Updates every 25 seconds with a brief CSS number transition
- Count is shown in `var(--accent-3)` (green) using Orbitron font for
  visual weight

### Reactions Feed

- A single rotating one-liner below the viewer count, updated every 25
  seconds (offset so count and reaction don't change simultaneously)
- Reactions are a static hardcoded array in `script.js`:
  - *"I showed this to my manager. They said it was fine." — Anonymous*
  - *"The counter went up while I was typing this." — Anonymous*
  - *"We did this. We're still doing this." — Anonymous*
  - (8 total, cycling)
- Fade-in animation on change; immediate on `prefers-reduced-motion`

### Pulsing Dot

- A small pulsing green dot (●) precedes the count for a "live indicator"
  feel
- Animated with CSS `@keyframes`, disabled with `prefers-reduced-motion`

---

## Architecture Notes

| Layer | Change |
|-------|--------|
| `death-clock-core.js` | Add `getSimulatedViewerCount(dateMs)` pure function + export |
| `index.html` | Add `<div class="presence-strip">` inside `#counter-section`, after the counter-grid |
| `script.js` | `initPresenceStrip()` — `setInterval` at 25s; imports `getSimulatedViewerCount` |
| `styles.css` | `.presence-strip`, `.presence-dot`, `.presence-count`, `.presence-reaction` |

---

## UX / Accessibility

- The strip uses `aria-live="polite"` and `role="status"` so screen readers
  announce updates without urgency
- The pulsing dot is `aria-hidden="true"` — decorative
- Viewer count is updated via `textContent`, not `innerHTML`
- Light and dark themes: green `var(--accent-3)` is legible on both
