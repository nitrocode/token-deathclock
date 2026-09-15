# PRD: Accelerate the Doom 🚀💀

## Overview

Turn passive dread into active participation. Give visitors a one-tap "Feed the Machine" clicker
mechanic where every tap represents them personally contributing tokens to the global AI inference
flood. The darker irony: you *know* it's bad and you keep tapping anyway. Built to be fast,
frictionless, and finger-friendly on mobile.

---

## Problem

The site currently shows what AI is doing *to* the world, but the visitor is a bystander. Adding
an interactive clicker that lets visitors voluntarily accelerate the countdown makes the
complicity visceral — and makes the site dramatically more fun and shareable. Cookie Clicker
proved that people will enthusiastically click a button to destroy things if the numbers go up.

---

## Goals

- Give visitors a direct, tactile way to interact with the token counter
- Surface the dark irony: the visitor is choosing to accelerate environmental milestones
- Make the experience finger-friendly on mobile (large tap targets, haptic-style feedback)
- Integrate with the existing Doom Achievements badge system
- Keep the feature entirely client-side with no new runtime dependencies

---

## Non-Goals

- Modifying the real global counter — the clicker runs a separate "personal acceleration" track
- Persistent server-side leaderboards (localStorage best-score only, v2 for cloud board)
- Complex idle-game mechanics (cookie clicker auto-generators, prestige resets — v2)
- Actual AI inference (the tokens are fictional within the game layer)

---

## Feature Description

### Core Mechanic — "Feed the Machine" 🤖

A new collapsible section **(or modal, TBD in design)** titled **"🚀 Accelerate the Doom"** contains
a large circular tap target — the **Big Red Button** — styled as a glowing reactor core or CPU chip.

Every tap/click:
1. Adds tokens to a **personal acceleration counter** (`personalTokens`)
2. Applies a **tap multiplier** (starts at 1×, upgrades increase it)
3. Triggers a brief CSS pulse animation on the button (visual feedback)
4. On mobile: fires a `navigator.vibrate(30)` haptic pulse (gracefully ignored if unsupported)
5. Increments a **Tap Combo** counter — rapid taps within 1 second build a combo multiplier up
   to 10× (combo resets if the user pauses > 1.5 s)

The button label changes with the combo level:
- 1× — "Feed the Machine"
- 2×–4× — "Keep Going…"
- 5×–9× — "FASTER! 🔥"
- 10× — "MAXIMUM DOOM ☢️"

### Personal Acceleration Counter

A stats strip below the button shows the player's running personal total:

```
🤖 You've personally contributed:
   1,240,000 tokens  (≈ 0.0004 kWh · 0.17 g CO₂ · 0.62 mL water)
   Tap rate: 3.2/sec
```

These stats reuse `calculateEnvironmentalImpact()` from `death-clock-core.js`.

### Upgrade Shop 🛒

Earn **Doom Points** (DP) equal to tokens contributed ÷ 1,000. Spend DP to buy
one-time multiplier upgrades, displayed as a mini "shop" of unlockable cards:

| Upgrade | Cost (DP) | Effect | Flavour Text |
|---------|-----------|--------|--------------|
| 🖥️ Extra GPU Rack | 10 | 2× tokens per tap | "More cores, more chaos" |
| ⚡ Liquid Cooling Override | 50 | 5× tokens per tap | "Ignore the thermal warnings" |
| 🌍 Global Data Centre | 200 | 10× tokens per tap | "Every continent contributing" |
| 🛰️ Orbital Inference Array | 1,000 | 25× tokens per tap | "Space itself regrets this" |
| 🧬 AGI Mode | 5,000 | 100× tokens per tap | "It's writing its own prompts now" |

Upgrades are stored in `localStorage` key `tokenDeathclockUpgrades` (JSON object of upgrade IDs
→ boolean). Shop cards use a disabled/greyed state when unaffordable.

### Milestone Racing 🏁

The section header shows a **"Next milestone you could trigger"** target — the next upcoming
environmental milestone that the player's personal counter is approaching. A progress bar fills
as `personalTokens` approaches that threshold.

When the player's personal counter crosses a milestone threshold:
- The milestone card in the Milestones section flashes with a special **"Accelerated by You"**
  red pulse border for 5 seconds
- A distinct achievement toast fires: *"🚀 You personally triggered [Milestone Name]! Catastrophe achieved."*
- A new milestone-accelerator badge is earned (see Achievements integration below)

Milestones are ordered ascending by `tokens` from the existing `MILESTONES` array in `death-clock-core.js`.
The player's first reachable milestone is the one with the smallest `tokens` value greater than
`personalTokens`.

### Challenges ⚡

Three rotating daily/session challenges (seeded by `Date.now()` divided into 24-hour buckets)
give the player short-term goals. Examples:

| Challenge | Goal | Reward |
|-----------|------|--------|
| Speed Demon | Reach 10 tap/sec for 3 consecutive seconds | 2× DP bonus for 60 s |
| Trillion Touched | Contribute 1 trillion personal tokens | Unlock "Trillion Villain" badge |
| Combo King | Hit 10× combo 3 times | +500 DP bonus |
| Carbon Sprint | Generate 1 kg CO₂-equivalent in under 60 seconds | Special toast |
| Nocturnal Accelerator | Complete any challenge between 00:00–04:00 local time | Easter-egg badge |

Challenges are rendered as a horizontal scrollable row of cards on mobile, visible above the
upgrade shop. A completed challenge card shows a green ✔ checkmark. Challenges reset per session
(no localStorage persistence, keeping the UX frictionless).

### Best Score / Hall of Shame

A single row below the button shows:
```
🏆 Your best session:  42,000,000,000 tokens   (vs. today: 1,240,000)
```

Stored in `localStorage` key `tokenDeathclockBestScore`. Resets if the user clears localStorage.
A subtle **"😱 New Record!"** pulse animation triggers when the current session beats the stored best.

---

## Mobile UX Requirements

| Requirement | Detail |
|-------------|--------|
| **Touch target size** | Big Red Button minimum 96 × 96 px (WCAG 2.5.5 Target Size) |
| **Tap responsiveness** | CSS `:active` state responds within 16 ms (no `touchstart` delay) |
| **Haptic feedback** | `navigator.vibrate(30)` on each tap; 80ms on milestone trigger |
| **No hover-only affordances** | All tooltips/shop descriptions accessible via tap-to-expand |
| **Combo counter** | Positioned above button, large font — readable at arm's length |
| **Horizontal challenge row** | `-webkit-overflow-scrolling: touch` + `scroll-snap` for snap-card UX |
| **Upgrade shop** | 2-column grid on mobile (<480 px), 3–4 columns on desktop |
| **No layout shift** | Section collapses/expands with `max-height` transition, not `hidden` toggle |

---

## New Doom Achievements (extend existing badge system)

The following badges integrate with the existing `tokenDeathclockBadges` localStorage key:

| Badge | Name | Condition |
|-------|------|-----------|
| 🚀 | Accelerant | First tap on the Big Red Button |
| 🔥 | Arsonist | Reach 10× combo for the first time |
| ⚡ | Trillion Villain | Personally contribute 1 trillion tokens |
| 🌍 | Continental Threat | Purchase the Global Data Centre upgrade |
| 🛰️ | Space Criminal | Purchase the Orbital Inference Array upgrade |
| 🧬 | Godlike | Purchase the AGI Mode upgrade |
| 🏁 | First Blood | Personally trigger your first milestone |
| ☠️ | Apex Accelerant | Personally trigger 5 milestones |
| 🌙 | Nocturnal Accelerator | Complete a challenge between 00:00–04:00 |
| 📤 | Bragging Rights | Share your personal acceleration total |

---

## Shareable Outcome

A **"📤 Share My Destruction"** button (shown once `personalTokens > 0`) generates:

> 🚀 I personally accelerated AI's environmental doom by contributing **1.24 billion tokens**
> in one sitting. That's **0.37 g of CO₂**, **0.62 mL of water**, and one step closer to
> [Next Milestone Name]. Come join me in accelerating the apocalypse.
> → [link] #AccelerateTheDoom #TokenDeathClock

Share flow reuses the existing `renderSharePanel()` / Twitter-X deep-link pattern already
established in `script.js`.

---

## Implementation Notes

### Pure Functions (death-clock-core.js)

- `calculatePersonalImpact(personalTokens, tapMultiplier)` → `{ tokens, kWh, co2Kg, waterL }` — thin wrapper around existing `calculateEnvironmentalImpact()`
- `getNextMilestoneForPlayer(personalTokens, milestones)` → milestone object or `null`
- `computeComboMultiplier(tapTimestamps)` → integer 1–10 (input: array of recent tap epoch-ms values)
- `getSessionChallenge(seedMs)` → array of 3 challenge objects `{ id, label, goal, rewardDesc }`
- `formatDoomPoints(dp)` → string (e.g. `"1,240 DP"`)

### DOM / Script (script.js)

- `initAcceleratorSection()` — sets up button listeners, combo timer, RAF-driven stat strip updates
- `handleTap()` — called on `pointerdown` (covers mouse + touch in one event); updates `personalTokens`, combo state, DP balance, checks challenges and milestone crossings
- `renderUpgradeShop()` — renders upgrade cards, wires purchase buttons, reads/writes `localStorage`
- `checkAcceleratorAchievements()` — called from `handleTap()` and on milestone cross; delegates to existing badge unlock flow
- Combo timer: `setInterval` at 100 ms checking last-tap timestamp to reset combo

### HTML (index.html)

New `<section id="accelerator-section">` inserted between `#achievements-section` and `<footer>`.
Contains:
- `.accelerator-header` (`<h2>`, description text)
- `#bigRedButton` (`<button>` with `aria-label`, large CSS-styled tap zone)
- `#comboDisplay` (combo multiplier indicator)
- `#personalStatsStrip` (tokens / kWh / CO₂ / water)
- `#milestoneRaceBar` (next milestone progress bar)
- `#challengeRow` (horizontal scroll container)
- `#upgradeShop` (upgrade card grid)
- `#bestScoreRow`
- `#shareAccelerationBtn`

### CSS (styles.css)

- `.big-red-button` — large circular button, `box-shadow` pulsing animation on `:active`
- `.big-red-button.combo-max` — extra glow class applied at 10× combo
- `.upgrade-card` — grid card with `opacity: 0.4` + `pointer-events: none` when unaffordable
- `.challenge-card` — horizontal scroll snap card, `.completed` variant with ✔ overlay
- `.milestone-race-bar` — CSS `transition: width` progress bar
- All new colours pull from existing CSS custom properties (`--accent`, `--text-dim`, etc.)

### No New Runtime Dependencies

Everything runs in vanilla JS + existing Chart.js CDN. `navigator.vibrate()` is optional/graceful.
No canvas screenshot library, no game engine, no animation library.

---

## Accessibility

| Concern | Approach |
|---------|----------|
| Button label | `aria-label` updates with current combo: *"Feed the Machine — 3× combo"* |
| Combo display | `aria-live="polite"` region announces combo changes at natural reading speed |
| Upgrade shop | Each card is a `<button>` with descriptive `aria-label`; disabled cards carry `aria-disabled="true"` |
| Progress bar | `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| Challenges | `role="list"` + `role="listitem"` on challenge row |
| Haptics | Never the sole indicator of an event — all haptic moments have visual counterparts |
| Reduced motion | All pulse/shake animations wrapped in `@media (prefers-reduced-motion: no-preference)` |

---

## Success Metrics

- Average session duration increases (accelerator gives a reason to stay)
- Return visit rate increases (upgrades persist in localStorage — the shop is always there)
- Social shares containing personal token count or milestone trigger message
- Badge earn rate for accelerator-specific badges

---

## Open Questions

- Should the Big Red Button have a "cool-down" between taps to encourage rhythm over mashing? (Might be more fun with no cap — test both)
- Should we add an **Auto-Clicker** upgrade (idle-game style) that generates tokens while you're away? (Strong v2 feature — keep v1 manual-only to preserve intentionality of "you're choosing to do this")
- Should `personalTokens` persist across sessions in `localStorage`? (Would make the progression feel more meaningful — risk: the upgrade shop becomes trivially unlocked quickly; consider resetting DP but not upgrading the multipliers)
- Should the section be fully open by default on first visit, or collapsed like the calculator? (Mobile first-visit UX — probably collapsed but with a teaser animation)
- Leaderboard via GitHub Issues / Gist API for a lightweight social scoreboard? (Fun v2 experiment — adds server interaction, out of scope for v1)
- Should milestone triggers from the player's personal counter be visually distinguished from the global counter crossing milestones? (Yes — different border colour and badge labelling)
