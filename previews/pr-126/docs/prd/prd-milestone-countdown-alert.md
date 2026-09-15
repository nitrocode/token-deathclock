# PRD: "Wait for It" — Milestone Countdown Alert 🚨

## Overview

When the next global milestone is 120 seconds or less away, a persistent
warning banner slides in from the top of the page: *"⚠️ [Milestone name]
threshold crossing imminent — stay to witness it."* A live countdown ticks
down in large numerals. The moment the threshold is crossed, a full-screen
flash overlay fires with the milestone icon, name, and description, and the
visitor earns the **Witness** 👁️ badge.

---

## Problem

The Predictions Table already tells users *when* the next milestone will be
crossed. However, there is no reason for someone who has just read that table
to stay on the page until the moment arrives. They close the tab, and the
event is wasted. Urgent, time-bound moments are one of the strongest proven
mechanisms for keeping people on a page.

---

## Goals

- Increase average session duration by creating "appointment viewing" moments
- Reward visitors who stay through a milestone crossing
- Make milestone events feel dramatic and significant

---

## Non-Goals

- Modifying the real global counter
- Showing alerts for milestones more than 2 minutes away (too early = spam)
- Sound notifications (no autoplay audio)

---

## Feature Description

### Alert Banner

- **Trigger condition:** next global milestone is ≤ 120 seconds away
- **Placement:** fixed top banner (z-index above all content, below CSP
  inline-script hash requirement)
- **Contents:**
  - Milestone icon + name
  - Short warning message: *"⚠️ [Name] threshold crossing imminent — stay to
    witness it!"*
  - Live countdown (`120s → 119s → … → 1s`)
  - Hides automatically once the countdown reaches 0
- **Accessibility:** `role="alert"` `aria-live="assertive"` so screen
  readers announce the approaching event
- **Animation:** slides down from above; only appears once per milestone per
  page session

### Full-Screen Flash Overlay

- Triggered the moment the threshold is crossed
- Semi-transparent red-tinted background (respects `prefers-reduced-motion`)
- Centred card showing milestone icon (large), milestone name, short
  description
- Dismiss button + auto-dismiss after 5 seconds
- `role="status"` `aria-live="polite"` so screen readers announce crossing

### Witness Badge

- ID: `witness`
- Icon: 👁️
- Name: *Witness*
- Description: *"You stayed to watch a milestone get crossed in real time."*
- Awarded once per session the first time any milestone crossing is triggered
  via the alert system (not retroactively for already-passed milestones)

---

## Architecture Notes

| Layer | Change |
|-------|--------|
| `death-clock-core.js` | No changes needed — `getNextMilestone()` and `TOKENS_PER_SECOND` already exported |
| `index.html` | Add `#milestone-alert-banner` (fixed) and `#milestone-flash-overlay` (modal) |
| `script.js` | `checkMilestoneAlert()` called from the 1-second badge/timer interval; `showMilestoneFlash()` fires on crossing |
| `styles.css` | `.milestone-alert-banner`, `.milestone-alert-countdown`, `.milestone-flash-overlay`, `.milestone-flash-content` |

---

## UX / Accessibility

- Banner background is dark-red to maintain contrast on both themes
- Countdown digits use `font-family: Orbitron` for visual weight
- `aria-live="assertive"` ensures the banner is announced to screen readers
  immediately
- Flash overlay is `pointer-events: none` on the backdrop; dismiss button
  has `pointer-events: auto`
- `prefers-reduced-motion`: banner appears without animation; overlay skips
  flash and jumps to final state
