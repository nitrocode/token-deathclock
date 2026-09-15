# PRD: Always-On Life Blocks — Automatic Multi-Scale Countdown

**Status:** Ready for implementation  
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
| Years | 1 row | dynamic — see §3.1 | 1 year each |
| Months | 1 row | 12 blocks | 1 month of the current year |
| Days | 1 row | 31 blocks | 1 day of the current month |
| Hours | 1 row | 24 blocks | 1 hour of today |
| Minutes | 1 row | 60 blocks | 1 minute of the current hour |
| Seconds | 1 row | 60 blocks | 1 second of the current minute |

### 3.1 Year row — dynamic extinction window (OQ-1 resolved)

The year row is computed from the extinction date rather than a fixed ±5-year window.  
This keeps the row thematically consistent with the rest of the page and makes the shrinking number of future blocks visually meaningful as extinction approaches.

**Algorithm:**
1. Compute `extinctionYear` from `lbExtinctionMs()`.
2. Show every year from `currentYear − 2` to `extinctionYear` (inclusive), capped at **30 blocks** to avoid an unmanageable row when extinction is still decades away.
3. If `extinctionYear − currentYear + 2 > 30`, append an overflow label (e.g. `+Ny`) exactly as the existing days grid does.
4. The dying block is the current calendar year; all years before it are dead; all years after are future.

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

### 4.3 Animations — staggered cascade (OQ-4 resolved)

- Reuse `lb-exploding` keyframe and `lb-pulse-dying` animation from existing CSS.
- At the seconds boundary: the dying second block explodes, the next becomes dying.
- At the minutes boundary (and every higher boundary), explosions **cascade upward with a 100 ms stagger per level**:
  - t = 0 ms → seconds row explodes  
  - t = 100 ms → minutes row explodes  
  - t = 200 ms → hours row explodes  
  - t = 300 ms → days row explodes  
  - t = 400 ms → months row explodes  
  - t = 500 ms → years row explodes  
- Each level only fires if its own boundary has actually been crossed (e.g. an hour boundary only triggers the hours/days/months/years levels).
- After each staggered explosion the affected row re-renders so the new dying block is correct.

### 4.4 Row labels
Each row has a short left-aligned label (`YEARS`, `MONTHS`, `DAYS`, `HOURS`, `MINS`, `SECS`) in the existing monospace font at subdued opacity, sized to match the existing `.lb-info` style.

### 4.5 Click-to-drill-down (OQ-2 resolved)

Clicking any block in the always-on stack panel navigates the **existing drill-down panel** to the corresponding time scale and smoothly scrolls it into view:

- Click a block in the **years row** → drill-down panel navigates to `days` level (highest supported level) and scrolls to the panel.
- Click a block in the **months or days row** → drill-down panel navigates to `days` level; the specific day block matching the clicked date is highlighted briefly (pulse animation).
- Click a block in the **hours row** → drill-down panel navigates to `hours` level for today (day offset 0).
- Click a block in the **minutes row** → drill-down panel navigates to `minutes` level for the current hour.
- Click a block in the **seconds row** → drill-down panel navigates to `seconds` level for the current minute.

The link is one-way (stack panel → drill-down panel only). The drill-down panel's own state (`lb` object) is updated directly; `lbFullRender()` and `lbRenderBreadcrumb()` are called after the state change.

Dead blocks (elapsed time units) in the always-on stack are **not** clickable (consistent with the existing drill-down panel).

### 4.6 Accessibility
- Each row is a `<div role="row" aria-label="…">` inside a `<div role="grid">`.
- Dying blocks carry a live `aria-label` updated each second (e.g., `"Second 42 of 60 — active"`).
- The entire always-on panel has `aria-live="polite"` with update throttling (update aria labels at most once per second).
- Future (clickable) blocks in the stack have `tabindex="0" role="button"` and an `aria-label` that describes the navigation action (e.g., `"Jump drill-down to minutes view"`).

---

## 5. Out of Scope

- No changes to the existing drill-down panel's logic or data model beyond the `lb` state updates needed for click-to-drill-down.
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
| `lbStackRenderRow(rowEl, units, currentIdx, progress)` | Idempotently render one row of blocks into `rowEl`. Accepts unit count, which index is "dying", and the dying block's fill progress (0–100). Future blocks get `tabindex="0" role="button"` and a `data-stack-level` attribute for click-to-drill-down routing. |
| `lbStackUpdateProgress(now)` | Called every RAF frame; updates `--progress` CSS custom property on the dying block in each row without full re-render. |
| `lbStackCheckBoundaries(now)` | Detects second/minute/hour/day/month/year crossings; schedules staggered explosions via `setTimeout` (100 ms per level) and re-renders affected rows after each explosion. |
| `lbStackHandleClick(e)` | Click handler attached to every non-dead stack block; reads `data-stack-level` and the block's positional index, sets `lb` state accordingly, calls `lbFullRender()` and `lbRenderBreadcrumb()`, then `scrollIntoView({behavior:'smooth'})` on `#lb-container`. |
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

### 6.3 Staggered cascade implementation detail

`lbStackCheckBoundaries` schedules each affected level with `setTimeout`:

```js
// Example: minute boundary crossed
const STAGGER_MS = 100;
scheduleExplosion('sec',   0 * STAGGER_MS);
scheduleExplosion('min',   1 * STAGGER_MS);
// hour / day / month / year only if those boundaries also crossed
```

`scheduleExplosion(level, delay)` sets `lbStack.exploding[level] = true`, waits `delay` ms, triggers the CSS class on the dying block, waits 560 ms for the animation, then re-renders the row and clears the flag.

### 6.4 New CSS classes (in `styles.css`)

```css
/* Always-On Stack Panel */
.lb-stack-panel { … }          /* flex column, gap between rows */
.lb-stack-row   { … }          /* flex row: label + block strip */
.lb-stack-label { … }          /* fixed-width label (e.g. "SECS") */
.lb-stack-grid  { … }          /* flex-wrap row of blocks — wraps on mobile */
/* Blocks in the stack reuse .lb-block, .lb-dead, .lb-dying, .lb-future, .lb-exploding */
/* Override block size to a smaller "compact" size for the stack */
.lb-stack-grid .lb-block { --lb-block-size: 9px; … }

/* Mobile: wrap blocks instead of scrolling (OQ-3) */
@media (max-width: 600px) {
  .lb-stack-grid { flex-wrap: wrap; }
  .lb-stack-grid .lb-block { --lb-block-size: 8px; }
}
```

`flex-wrap: wrap` (not `overflow-x: auto`) is the intentional choice for mobile. The seconds and minutes rows will reflow across multiple lines, keeping the content readable without horizontal scrolling.

### 6.5 Interaction with existing code
- `initLifeBlocks()` gains a single extra call: `lbStackInit()`.
- `lbStackHandleClick` calls `lbFullRender()` and `lbRenderBreadcrumb()` (already exported in scope) — no signature changes needed.
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
| AC-11 | The years row block count is derived from the extinction date; an overflow label appears when the window exceeds 30 blocks. |
| AC-12 | Clicking a non-dead block in the stack navigates the drill-down panel to the correct level and scrolls it into view. |
| AC-13 | On viewports ≤ 600 px, the seconds and minutes rows wrap across multiple lines instead of overflowing horizontally. |
| AC-14 | At a minute boundary, explosions fire in order: seconds (t=0 ms) → minutes (t=100 ms); at an hour boundary the cascade continues through hours (t=200 ms), etc. |

---

## 8. Resolved Design Decisions

| # | Question | Decision |
|---|----------|----------|
| OQ-1 | Should the year row show a fixed window or dynamically compute based on extinction date? | **Dynamic.** Show `currentYear − 2` through `extinctionYear`, capped at 30 blocks with an overflow label. Keeps the row thematically honest. |
| OQ-2 | Should clicking a row in the always-on panel jump the drill-down panel to that time scale? | **Yes.** Non-dead blocks are clickable; clicking navigates the `lb` state, calls `lbFullRender()`, and smooth-scrolls to `#lb-container`. |
| OQ-3 | On mobile, should the seconds and minutes rows wrap or scroll horizontally? | **Wrap.** `flex-wrap: wrap` on `.lb-stack-grid` — mobile-friendly, no horizontal scrolling. |
| OQ-4 | Should the explosion cascade be staggered by ~100 ms per level for dramatic effect? | **Yes.** `setTimeout` at 0 / 100 / 200 / 300 / 400 / 500 ms per level (seconds first, years last). |

---

## 9. Files Changed

| File | Change |
|------|--------|
| `index.html` | Add `#lb-stack-panel` HTML before the existing breadcrumb nav. |
| `script.js` | Add `lbStack` state object + `lbStackInit / lbStackRenderRow / lbStackUpdateProgress / lbStackCheckBoundaries / lbStackHandleClick / lbStackFrame`; call `lbStackInit()` from `initLifeBlocks()`. |
| `styles.css` | Add `.lb-stack-panel`, `.lb-stack-row`, `.lb-stack-label`, `.lb-stack-grid` rules; compact block-size override. |
| `tests/death-clock.test.js` | No changes required (new logic is DOM-only, in `script.js`). |
| `tests/e2e/death-clock.spec.js` | Add smoke tests for AC-1 and AC-2. |
