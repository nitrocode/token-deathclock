# PRD: AI Guilt-O-Meter 😬

## Overview

A real-time guilt thermometer that fills up the longer a visitor stays on the
page — a proxy for *"you've been here thinking about your AI usage instead of
actually cutting it."* The bar progresses through increasingly panicked labels
over five minutes. At 100% the visitor earns the **Certified Hypocrite 😬**
badge, and a share button lets them confess their guilt level to the world.

---

## Problem

Most users feel mild guilt when they see the live counter, but that feeling
fades quickly. A persistent, slowly-filling meter keeps the emotional hook
alive throughout the session and turns passive doom-reading into a participatory
joke about the human condition.

---

## Goals

- Keep visitors emotionally engaged for longer sessions (increases average
  session duration)
- Create a highly shareable "I'm a Certified Carbon Hypocrite" moment
- Add a comedic second layer to the badge system

---

## Non-Goals

- Actual carbon tracking or measurement
- Server-side persistence
- Guilt about anything other than AI usage

---

## Feature Description

### Thermometer Fill

The bar fills from 0 % → 100 % linearly over **300 seconds (5 minutes)** of
page time. Progress is tracked using `Date.now() - pageLoadTime`.

Label thresholds and copy:

| Fill % | Label |
|--------|-------|
| 0–19 % | 😐 Mildly Aware |
| 20–39 % | 😟 Mild Regret |
| 40–59 % | 😬 Full Doomscroller |
| 60–79 % | 😰 Carbon Hypocrite in Training |
| 80–99 % | 😱 Fully Complicit |
| 100 % | 💀 Certified Hypocrite |

### Placement

A horizontal progress bar + label appears at the bottom of the **Live Feed /
Dashboard** tab, below the "What Could We Have Done Instead?" strip. It is
labelled: *"Your Guilt Level"* with a small 😬 icon.

### Badge

| Badge ID | Icon | Name | Trigger |
|---|---|---|---|
| `certified_hypocrite` | 😬 | *Certified Hypocrite* | Guilt-O-Meter reaches 100 % |

The badge toast fires the moment the bar hits 100 %: *"🏆 You've been
watching the apocalypse for 5 minutes without doing anything about it.
Certified Hypocrite achieved."*

### Share Button

Visible at any fill level ≥ 20 %. Generates share text:

> 😬 I've been watching AI consume tokens for [N] minutes and done absolutely
> nothing about it. My guilt level: [LABEL]. Are you as bad as me?
> → [URL] #TokenDeathClock #CertifiedHypocrite

Uses the existing `openSharePopup()` helper.

---

## Architecture Notes

| Layer | Change |
|-------|--------|
| `death-clock-core.js` | No changes needed |
| `index.html` | Add `<div id="guilt-meter-section">` with bar, label, and share button |
| `src/js/` | New `22-guilt-meter.js`: `initGuiltMeter()`, `updateGuiltMeter()` called from RAF loop; new badge definition |
| `styles/` | New rules in `features.css`: `.guilt-meter-bar`, `.guilt-meter-fill`, `.guilt-meter-label` |

The RAF loop update is cheap: one `Date.now()` call + one style width assignment
per frame, skipped when the meter is already full.

---

## UX / Accessibility

- Progress bar is a native `<progress>` element with `aria-valuenow`,
  `aria-valuemin`, `aria-valuemax`, and a live `aria-label` that updates with
  the current label text
- `prefers-reduced-motion`: bar jumps to correct fill level without animation
- Share button is only visible at ≥ 20 % fill so first-time visitors do not
  immediately see a call-to-action for a feature that hasn't activated yet
- Label copy uses `textContent`, never `innerHTML`

---

## Success Metrics

- Badge earn rate for `certified_hypocrite` (indicates 5-min session rate)
- Share button click rate
- Social posts containing "Certified Hypocrite"

---

## Open Questions

- Should the meter reset if the user switches away from the tab (using
  `visibilitychange`)? Probably not — *being away is also a valid guilt level.*
- Should there be intermediate share prompts at 50 % and 75 %? (v2 experiment)
