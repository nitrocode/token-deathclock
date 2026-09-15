# PRD: "Come Back Tomorrow" — Daily Snapshot & Streak 🔥

## Overview

On every page load, `localStorage` is checked for a last-visit timestamp.
After the first visit, a persistent widget shows the visitor's consecutive
daily visit streak: *"Day 3 of watching the world burn 🔥."* A new badge
("Loyal Doomscroller 📅") is awarded for reaching a 3-day and 7-day streak.
A "Bookmark for Tomorrow" button generates a shareable daily-snapshot URL
the user can save or send — no email backend required.

---

## Problem

The site has no explicit mechanism to pull visitors back after their first
session. The existing `return_visitor` badge awards a single return visit, but
there is no streak mechanic that rewards *consecutive* return visits. Streak
anxiety is one of the most effective low-friction engagement mechanics (see
Duolingo, Wordle, GitHub contribution graph).

---

## Goals

- Drive day-2 (D2) and day-7 (D7) return visit rate
- Give repeat visitors a progression to chase
- Create a shareable artefact ("Day 7 doomscroller 🔥") for social sharing

---

## Non-Goals

- Server-side streak persistence (client-side localStorage only)
- Email or push notifications
- Leaderboards

---

## Feature Description

### Streak Tracking

- On page load, read `tokenDeathclockStreak` from localStorage:
  ```json
  { "lastVisit": "2026-04-22", "streak": 4, "longestStreak": 7 }
  ```
- Today's UTC date is compared to `lastVisit`:
  - Same day → no change (already visited today)
  - Previous day → `streak += 1`; `longestStreak = max(longestStreak, streak)`
  - Gap > 1 day → streak resets to 1
- Updated value written back to localStorage

### Streak Widget

- Displayed as a small pill in the top-right corner of the **Live Feed**
  section header (visible on all visits after the first)
- Contents: `🔥 Day [N]` (compact) with full tooltip: *"Day N of consecutive
  visits"*
- On click/hover: expands to show streak, longest streak, and the Bookmark
  button

### Badges

| Badge ID | Icon | Name | Trigger |
|---|---|---|---|
| `streak_3` | 📅 | *3-Day Witness* | 3 consecutive daily visits |
| `streak_7` | 🗓️ | *Loyal Doomscroller* | 7 consecutive daily visits |

### Bookmark Button

- Label: *"📌 Bookmark for Tomorrow"*
- Action: opens `window.location.href` (the site URL) via the Web Share
  API if available, otherwise copies to clipboard with a message:
  *"Day [N+1] starts tomorrow — come back: [URL]"*

---

## Architecture Notes

| Layer | Change |
|-------|--------|
| `death-clock-core.js` | No changes needed |
| `index.html` | Add streak pill element in `#counter-section` header; add 2 badge definitions |
| `script.js` | `loadStreak()`, `updateStreak()`, `renderStreakWidget()` called from `initBadges()`; new badge IDs |
| `styles.css` | `.streak-pill`, `.streak-pill-expanded` |

---

## UX / Accessibility

- The streak pill is small enough not to distract first-time visitors (streak
  is 0 on first visit, so the pill is not shown)
- `aria-label` on the pill describes current streak and longest streak
- Badge toast fires as normal (existing toast system)
- localStorage errors are caught and silently ignored
