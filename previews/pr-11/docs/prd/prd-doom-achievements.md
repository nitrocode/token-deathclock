# PRD: Doom Achievements & Visitor Badges 🏆

## Overview

Gamify the existential dread. Award visitors progressively more alarming achievement badges based on time spent on the page, milestones triggered during their visit, and total tokens consumed. Badges are fun to collect, fun to screenshot, and give people a reason to stay longer or come back.

---

## Problem

Most doom-and-gloom sites feel passive — you read, you feel bad, you leave. Achievements turn passive consumption into an active (if darkly absurd) game, increasing session time and return visits.

---

## Goals

- Increase average session duration
- Create a collection mechanic that rewards return visitors
- Generate screenshot-worthy moments people share unprompted

---

## Non-Goals

- Server-side persistence (no accounts, no backend)
- Competitive leaderboards (v2)

---

## Feature Description

### Badge Types

Badges are earned client-side and stored in `localStorage`. A badge toast notification pops up when earned.

#### ⏱ Time-on-Page Badges

| Badge | Name | Condition |
|-------|------|-----------|
| 👀 | Morbid Curious | 30 seconds on page |
| 🧲 | Doom Magnet | 3 minutes on page |
| 🛋️ | Chronic Doomscroller | 10 minutes on page |
| 💀 | Terminal Patient | 30 minutes on page |
| 🤖 | One of Us Now | 1 hour on page |

#### 📍 Milestone Witness Badges

Awarded when a new milestone is **triggered** (transitions from pending → passed) *during the visitor's session*. Since all current milestones have already passed, these will trigger for future milestones.

| Badge | Name | Condition |
|-------|------|-----------|
| 🌲 | Witnessed the Felling | Present when First Forest Felled triggers |
| ⚡ | Grid Watcher | Present when Power Grid Strain triggers |
| 🧊 | Arctic Observer | Present when First Ice-Free Arctic triggers |
| … | … | One per milestone |

#### 🔢 Token Count Badges (global counter crosses round numbers during visit)

| Badge | Name | Condition |
|-------|------|-----------|
| 💯 | Hundred-Million Witness | Counter crosses a new ×100M boundary |
| 🎰 | Quadrillion Club | Counter crosses a quadrillion boundary |
| ∞ | Heat Death Accelerant | 5+ sessions (localStorage visit counter) |

#### 🎲 Easter Egg Badges

| Badge | Name | Condition |
|-------|------|-----------|
| 🌓 | Nocturnal Doomer | Visiting between 00:00–04:00 local time |
| 🔁 | Glutton for Punishment | 3rd+ visit (localStorage) |
| 🧮 | Number Cruncher | Opened the Personal Footprint Calculator |
| 📤 | Spreading the Doom | Clicked a Share button |
| 🌞 | Optimist | Switched to Light Mode |

---

### Badge Display

A **"🏆 Your Badges"** panel (collapsible, bottom of page) shows all earned badges. Locked badges shown as greyed-out silhouettes with tooltip hints like *"Spend 10 minutes on the page to unlock"*.

### Toast Notification

On earning a badge, a non-blocking toast slides in from the bottom:

```
🏆 New Badge Unlocked!
  💀 Terminal Patient
  "You've been watching the apocalypse for 30 minutes."
  [View All Badges]
```

Toast auto-dismisses after 5 seconds. One toast queue (no stacking).

---

## Implementation Notes

- `localStorage` key: `tokenDeathclockBadges` → JSON array of earned badge IDs
- `localStorage` key: `tokenDeathclockVisits` → integer visit count
- Badge check logic in `script.js` — called from the RAF loop for time-based and counter-based badges, event callbacks for interaction badges
- Toast element in `index.html` (hidden `div`), shown/hidden via CSS class toggle
- No new dependencies
- Badge definitions (id, name, icon, description, condition type) live in `script.js` as a constant array (DOM-adjacent logic, not pure enough for core)
- All dynamic badge text inserted via `textContent`, not `innerHTML`

---

## Accessibility

- Toast has `role="status"` and `aria-live="polite"`
- Badge panel fully keyboard-navigable
- Greyed-out locked badges use `aria-label="Locked: [hint]"`

---

## Success Metrics

- Session duration increases
- Return visit rate increases (localStorage visit counter)
- Social posts showing badge collections

---

## Open Questions

- Should earned badges persist across browser clears? (Could offer export-as-URL hash — v2)
- Should there be a secret "I read the source code" badge triggered by opening DevTools? (`window.addEventListener('devtools')` heuristic — fun v2 easter egg)
- Should the Badge panel be promoted more prominently? (Test with a persistent badge count in the header — v2 experiment)
