# PRD Index — Token Deathclock Fun Features

This document indexes all product requirement documents for new visitor-facing features
aimed at increasing amusement, engagement, and social sharing.

| # | PRD | File | Summary | Shareability | Effort |
|---|-----|------|---------|-------------|--------|
| 0001 | "AI Is Currently Writing…" Ticker | `0001-ai-is-currently-writing.md` | Live absurdist ticker of what AI is probably generating right now | ⭐⭐⭐⭐⭐ | Low |
| 0002 | Share Your Doom | `0002-share-your-doom.md` | One-click personalised social sharing with scary session stats | ⭐⭐⭐⭐⭐ | Low |
| 0003 | Token Receipt | `0003-token-receipt.md` | Before-unload thermal receipt summarising your session's environmental cost | ⭐⭐⭐⭐⭐ | Medium |
| 0004 | "What Could We Have Done Instead?" | `0004-what-could-we-have-done.md` | Real-time rotating equivalences (homes powered, pizzas baked…) with optional snarky mode | ⭐⭐⭐⭐ | Low |
| 0005 | Personal AI Carbon Footprint Calculator | `0005-personal-footprint-calculator.md` | Input your prompt habits, get a personalised doom tally | ⭐⭐⭐⭐ | Medium |
| 0006 | Doom Achievements & Visitor Badges | `0006-doom-achievements.md` | Gamified badges earned by time on page, milestones witnessed, and easter eggs | ⭐⭐⭐⭐ | Medium |
| 0007 | Accelerate the Doom | `0007-accelerate-the-doom.md` | Let visitors intentionally boost the token counter for dark comedy effect | ⭐⭐⭐ | Low |
| 0008 | Life Blocks Always On | `0008-life-blocks-always-on.md` | Persistent life-block widget that follows the user as they scroll | ⭐⭐⭐ | Medium |

## Recommended Implementation Order

1. **0001 — "AI Is Currently Writing…" Ticker** — lowest effort, highest comedy, immediate shareability
2. **0002 — Share Your Doom** — low effort, highest direct sharing impact
3. **0003 — Token Receipt** — medium effort, extremely memorable, triggers before-unload for passive sharing
4. **0004 — "What Could We Have Done Instead?"** — enriches existing impact strip, low effort
5. **0005 — Personal Footprint Calculator** — medium effort, personal stake mechanic, good for repeat sharing
6. **0006 — Doom Achievements** — medium effort, drives return visits and longer sessions

## Shared Design Principles

- **No new runtime npm packages** — the site must remain fully static
- **No DOM access in `death-clock-core.js`** — all pure logic there, all DOM in `script.js`
- **No `innerHTML` with dynamic data** — all user-facing dynamic strings via `textContent` or URL-encoded params
- **Accessibility first** — `aria-live` for live regions, focus traps for modals, `prefers-reduced-motion` respected
- **Dark + Light theme** — all new UI must respect the existing CSS custom property theme system
