# PRD Index — Token Deathclock Fun Features

This document indexes all product requirement documents for new visitor-facing features
aimed at increasing amusement, engagement, and social sharing.

## Infrastructure PRDs

| PRD | File | Summary | Status |
|-----|------|---------|--------|
| Bundler & Build Optimisation | `bundler.md` | Minify JS/CSS with esbuild; ~47% JS / ~23% CSS savings | ✅ Implemented |

## Phase 1 — Completed Features

| PRD | File | Summary | Shareability | Effort |
|-----|------|---------|-------------|--------|
| Share Your Doom | `prd-share-your-doom.md` | One-click personalised social sharing with scary session stats | ⭐⭐⭐⭐⭐ | Low |
| "What Could We Have Done Instead?" | `prd-what-could-we-have-done.md` | Real-time rotating equivalences (homes powered, pizzas baked…) with optional snarky mode | ⭐⭐⭐⭐ | Low |
| Personal AI Carbon Footprint Calculator | `prd-personal-footprint-calculator.md` | Input your prompt habits, get a personalised doom tally | ⭐⭐⭐⭐ | Medium |
| Doom Achievements & Visitor Badges | `prd-doom-achievements.md` | Gamified badges earned by time on page, milestones witnessed, and easter eggs | ⭐⭐⭐⭐ | Medium |
| "AI Is Currently Writing…" Ticker | `prd-ai-is-currently-writing.md` | Live absurdist ticker of what AI is probably generating right now | ⭐⭐⭐⭐⭐ | Low |
| Token Receipt | `prd-token-receipt.md` | Before-unload thermal receipt summarising your session's environmental cost | ⭐⭐⭐⭐⭐ | Medium |

## Phase 2 — Engagement & Retention Features

| # | PRD | File | Summary | Session impact | Return-visit impact | Effort |
|---|-----|------|---------|---------------|--------------------|----|
| 1 | Milestone Countdown Alert | `prd-milestone-countdown-alert.md` | Fixed banner + flash when a global milestone is ≤120 s away | ★★★★★ | ★★ | Low |
| 7 | Witness History Log | `prd-witness-history-log.md` | Terminal-style session log that appends an environmental equivalence every 15 s | ★★★★ | ★★ | Low |
| 5 | Social Ripple | `prd-social-ripple.md` | Simulated live viewer count + rotating reactions (deterministic, no backend) | ★★★ | ★★ | Low |
| 3 | Daily Streak | `prd-daily-streak.md` | localStorage streak counter + badges for 3-day and 7-day consecutive visits | ★★★ | ★★★★★ | Medium |
| 4 | Trivia Quiz | `prd-trivia-quiz.md` | 8-question rotating quiz about AI environmental impact; badge for high score | ★★★★ | ★★★ | Medium |
| 2 | What-If Simulator | `prd-what-if-simulator.md` | Sliders for model efficiency / renewable energy; real-time projection updates; shareable URL | ★★★★★ | ★★★★ | Medium |
| 6 | Pledge to Reduce | `prd-pledge-to-reduce.md` | Commitment device after the Calculator; progress banner on return visits | ★★★ | ★★★★ | Medium |

### Phase 2 Implementation Order

1. **Milestone Countdown Alert** — low effort, highest immediate session-time impact
2. **Witness History Log** — low effort, makes passive time feel meaningful
3. **Social Ripple** — low effort, zero infrastructure, instant social proof
4. **Daily Streak** — medium effort, strongest D7 return-visit driver
5. **Trivia Quiz** — medium effort, 3–5 min active engagement
6. **What-If Simulator** — medium effort, highest shareability + return traffic
7. **Pledge to Reduce** — medium effort, longest return-visit tail

## Shared Design Principles

- **No new runtime npm packages** — the site must remain fully static
- **No DOM access in `death-clock-core.js`** — all pure logic there, all DOM in `script.js`
- **No `innerHTML` with dynamic data** — all user-facing dynamic strings via `textContent` or URL-encoded params
- **Accessibility first** — `aria-live` for live regions, focus traps for modals, `prefers-reduced-motion` respected
- **Dark + Light theme** — all new UI must respect the existing CSS custom property theme system
