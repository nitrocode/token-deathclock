# PRD: Always-On Life Blocks — Automatic Multi-Scale Countdown

**Status:** Draft  
**Section affected:** Life Blocks (`#life-blocks-section`, `script.js`, `styles.css`)

---

## 1. Problem

The current Life Blocks section requires the user to click through four drill-down levels (days → hours → minutes → seconds) to see the real-time granular destruction of time.  
Most users never reach the seconds view — the most viscerally compelling level — because the interaction model is hidden behind clicks and a breadcrumb they may not notice.

---

## 2. Goal

Deliver the full emotional impact of time being consumed **without any user interaction**, while keeping the existing drill-down view intact for users who want to explore manually.

---

## 3. Proposed Solution: Always-On Temporal Stack

Add a new **"Now" panel** directly below the existing Life Blocks heading.  
The panel renders six compact, labelled rows of blocks — one row per time scale — all visible simultaneously, all animating in real time as soon as the section enters the viewport.

| Row | Unit | Blocks | Block = |
|-----|------|--------|---------|
| Years | 1 row | 10 blocks | 1 year each (past decade, current, future) |
| Months | 1 row | 12 blocks | 1 month of the current year |
| Days | 1 row | 31 blocks | 1 day of the current month |
| Hours | 1 row | 24 blocks | 1 hour of today |
| Minutes | 1 row | 60 blocks | 1 minute of the current hour |
| Seconds | 1 row | 60 blocks | 1 second of the current minute |

Each row always shows **dead** (elapsed), **dying** (current), and **future** blocks using the existing visual vocabulary (`lb-dead`, `lb-dying`, `lb-future`, `lb-exploding`).  
The dying block in every row fills progressively and explodes at its natural boundary (second, minute, hour, day, month, year).

The existing click-through drill-down panel is **preserved unchanged** below the new panel, with its own heading and breadcrumb.

---

## 4. User Experience

### 4.1 Scroll-to-activate
- Activate on IntersectionObserver (threshold ≈ 20 % visible) — no click required.
- RAF loop for the new panel starts on first intersection, pauses when the section leaves the viewport (performance).

### 4.2 Visual hierarchy
- New panel sits inside `#life-blocks-section`, before the existing `#lb-container`.
- A single shared section heading and intro paragraph describe both panels.
- The new panel uses a slightly subdued palette (reduced opacity on future blocks, narrower block size) so it reads as a quick overview rather than the full interactive grid.

### 4.3 Animations
- Reuse `lb-exploding` keyframe and `lb-pulse-dying` animation from existing CSS.
- At the seconds boundary: the dying second block explodes, the next becomes dying.
- At the minutes boundary: the dying minute AND second rows both refresh simultaneously (explosion on the minute's dying block, new second row redraws).
- Same cascade applies up the chain at hour, day, month, year boundaries.

### 4.4 Row labels
Each row has a short left-aligned label (`YEARS`, `MONTHS`, `DAYS`, `HOURS`, `MINS`, `SECS`) in the existing monospace font at subdued opacity, sized to match the existing `.lb-info` style.

### 4.5 Accessibility
- Each row is a `<div role="row" aria-label="…">` inside a `<div role="grid">`.
- Dying blocks carry a live `aria-label` updated each second (e.g., `"Second 42 of 60 — active"`).
- The entire always-on panel has `aria-live="polite"` with update throttling (update aria labels at most once per second).

---

## 5. Out of Scope

- No click/drill-down behaviour on the new panel's blocks.
- No changes to the existing drill-down panel's logic or data model.
- No new npm dependencies.
- No changes to `death-clock-core.js` (pure functions are already sufficient).

---

## 6. Technical Design

### 6.1 New DOM structure (in `index.html`)

```html
<!-- Always-On Temporal Stack -->
<div id="lb-stack-panel" class="lb-stack-panel" role="grid" aria-label="Time passing now" aria-live="polite">
  <div class="lb-stack-row" id="lb-stack-years"   role="row" aria-label="Years"></div>
  <div class="lb-stack-row" id="lb-stack-months"  role="row" aria-label="Months"></div>
  <div class="lb-stack-row" id="lb-stack-days"    role="row" aria-label="Days"></div>
  <div class="lb-stack-row" id="lb-stack-hours"   role="row" aria-label="Hours"></div>
  <div class="lb-stack-row" id="lb-stack-minutes" role="row" aria-label="Minutes"></div>
  <div class="lb-stack-row" id="lb-stack-seconds" role="row" aria-label="Seconds"></div>
</div>
```

Placed in `index.html` immediately before `<nav id="lb-breadcrumb">`.

### 6.2 New functions in `script.js`

All new code lives inside the existing IIFE, grouped after the existing `lb.*` helpers.

| Function | Responsibility |
|----------|---------------|
| `lbStackInit()` | Register IntersectionObserver on `#life-blocks-section`; on intersection start RAF via `lbStackFrame()`. |
| `lbStackRenderRow(rowEl, units, currentIdx, progress)` | Idempotently render one row of blocks into `rowEl`. Accepts unit count, which index is "dying", and the dying block's fill progress (0–100). |
| `lbStackUpdateProgress(now)` | Called every RAF frame; updates `--progress` CSS custom property on the dying block in each row without full re-render. |
| `lbStackCheckBoundaries(now)` | Detects second/minute/hour/day/month/year crossings; triggers explosions and row re-renders at the appropriate granularity. |
| `lbStackFrame()` | RAF loop: calls `lbStackUpdateProgress`, then `lbStackCheckBoundaries`, then re-queues itself. |

State for the new panel is kept in a separate `lbStack` object (mirroring the existing `lb` object) to avoid coupling:

```js
const lbStack = {
  rafId: null,
  active: false,           // true once the section is in view
  lastSec: -1, lastMin: -1, lastHr: -1,
  lastDay: -1, lastMonth: -1, lastYear: -1,
  exploding: { sec: false, min: false, hr: false,
               day: false, month: false, year: false },
};
```

### 6.3 New CSS classes (in `styles.css`)

```css
/* Always-On Stack Panel */
.lb-stack-panel { … }          /* flex column, gap between rows */
.lb-stack-row   { … }          /* flex row: label + block strip */
.lb-stack-label { … }          /* fixed-width label (e.g. "SECS") */
.lb-stack-grid  { … }          /* flex row of blocks, no overflow scroll */
/* Blocks in the stack reuse .lb-block, .lb-dead, .lb-dying, .lb-future, .lb-exploding */
/* Override block size to a smaller "compact" size for the stack */
.lb-stack-grid .lb-block { --lb-block-size: 9px; … }
```

### 6.4 Interaction with existing code
- `initLifeBlocks()` gains a single extra call: `lbStackInit()`.
- No existing functions are modified; the new panel is entirely additive.
- The IntersectionObserver callback starts/stops `lbStack.rafId` to avoid wasted RAF frames when the section is off-screen.

---

## 7. Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-1 | Six labelled rows are visible as soon as the Life Blocks section scrolls 20 % into view, with no user interaction. |
| AC-2 | The seconds row's dying block explodes and the next block becomes dying every second. |
| AC-3 | All higher-granularity rows update at their natural boundary (minutes, hours, …). |
| AC-4 | The existing drill-down panel (days grid + breadcrumb) is unchanged and fully functional. |
| AC-5 | The RAF loop is paused when the section is fully off-screen and resumed when it re-enters. |
| AC-6 | All existing Jest unit tests pass; coverage thresholds are maintained. |
| AC-7 | All existing E2E tests pass. |
| AC-8 | No new runtime npm packages are added. |
| AC-9 | `death-clock-core.js` has zero new DOM references. |
| AC-10 | Each row has correct ARIA roles and labels; screen-reader announcements are throttled to ≤ 1/sec. |

---

## 8. Open Questions

| # | Question | Owner |
|---|----------|-------|
| OQ-1 | Should the year row show a fixed window (past 5 y + current + future 4 y) or dynamically compute based on extinction date? | Design |
| OQ-2 | Should clicking a row in the always-on panel jump the drill-down panel to that time scale? (Nice-to-have, not in v1.) | Product |
| OQ-3 | On mobile (<600 px), 60 second blocks at 9 px each = 540 px + gaps — should the seconds and minutes rows wrap or scroll horizontally? | Design |
| OQ-4 | Should the explosion cascade (second → minute → hour …) be staggered by ~100 ms per level for dramatic effect? | Design |

---

## 9. Files Changed

| File | Change |
|------|--------|
| `index.html` | Add `#lb-stack-panel` HTML before the existing breadcrumb nav. |
| `script.js` | Add `lbStack` state object + `lbStackInit / lbStackRenderRow / lbStackUpdateProgress / lbStackCheckBoundaries / lbStackFrame`; call `lbStackInit()` from `initLifeBlocks()`. |
| `styles.css` | Add `.lb-stack-panel`, `.lb-stack-row`, `.lb-stack-label`, `.lb-stack-grid` rules; compact block-size override. |
| `tests/death-clock.test.js` | No changes required (new logic is DOM-only, in `script.js`). |
| `tests/e2e/death-clock.spec.js` | Add smoke tests for AC-1 and AC-2. |
