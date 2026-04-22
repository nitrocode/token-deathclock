# PRD Index — Token Deathclock Fun Features

This document indexes all product requirement documents for new visitor-facing features
aimed at increasing amusement, engagement, and social sharing.

| PRD | File | Summary | Shareability | Effort |
|-----|------|---------|-------------|--------|
| Share Your Doom | `prd-share-your-doom.md` | One-click personalised social sharing with scary session stats | ⭐⭐⭐⭐⭐ | Low |
| "What Could We Have Done Instead?" | `prd-what-could-we-have-done.md` | Real-time rotating equivalences (homes powered, pizzas baked…) with optional snarky mode | ⭐⭐⭐⭐ | Low |
| Personal AI Carbon Footprint Calculator | `prd-personal-footprint-calculator.md` | Input your prompt habits, get a personalised doom tally | ⭐⭐⭐⭐ | Medium |
| Doom Achievements & Visitor Badges | `prd-doom-achievements.md` | Gamified badges earned by time on page, milestones witnessed, and easter eggs | ⭐⭐⭐⭐ | Medium |
| "AI Is Currently Writing…" Ticker | `prd-ai-is-currently-writing.md` | Live absurdist ticker of what AI is probably generating right now | ⭐⭐⭐⭐⭐ | Low |
| Token Receipt | `prd-token-receipt.md` | Before-unload thermal receipt summarising your session's environmental cost | ⭐⭐⭐⭐⭐ | Medium |

## Recommended Implementation Order

1. **"AI Is Currently Writing…" Ticker** — lowest effort, highest comedy, immediate shareability
2. **Share Your Doom** — low effort, highest direct sharing impact
3. **Token Receipt** — medium effort, extremely memorable, triggers before-unload for passive sharing
4. **"What Could We Have Done Instead?"** — enriches existing impact strip, low effort
5. **Personal Footprint Calculator** — medium effort, personal stake mechanic, good for repeat sharing
6. **Doom Achievements** — medium effort, drives return visits and longer sessions

## Shared Design Principles

- **No new runtime npm packages** — the site must remain fully static
- **No DOM access in `death-clock-core.js`** — all pure logic there, all DOM in `script.js`
- **No `innerHTML` with dynamic data** — all user-facing dynamic strings via `textContent` or URL-encoded params
- **Accessibility first** — `aria-live` for live regions, focus traps for modals, `prefers-reduced-motion` respected
- **Dark + Light theme** — all new UI must respect the existing CSS custom property theme system
