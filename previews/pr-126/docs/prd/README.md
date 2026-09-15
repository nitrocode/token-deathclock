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

## Phase 3 — Virality & Joy Features

| # | PRD | File | Summary | Shareability | Return-visit pull | Effort |
|---|-----|------|---------|-------------|-------------------|--------|
| 1 | Token Horoscope | `prd-token-horoscope.md` | Daily satirical AI horoscope seeded from UTC date; shareable + refreshes every 24 h | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ (daily) | Low |
| 2 | AI Guilt-O-Meter | `prd-guilt-o-meter.md` | Real-time guilt thermometer filling over 5 min; share your guilt level; unlocks Certified Hypocrite badge | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Low |
| 3 | Token Confessional | `prd-token-confessional.md` | Confess your worst AI sin; receive satirical absolution + shareable card; ephemeral (nothing leaves the browser) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Low |
| 4 | Token Exchange Rate Board | `prd-token-exchange-board.md` | Financial-terminal ticker showing live token-to-absurd-thing exchange rates reusing existing equivalences logic | ⭐⭐⭐⭐ | ⭐⭐ | Low |
| 5 | Doomscroll Bingo | `prd-doomscroll-bingo.md` | Weekly 5×5 bingo card of AI sins; confetti on BINGO; Full House of Doom badge; highly shareable card image | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ (weekly) | Medium |
| 6 | Name That Wasteful Prompt | `prd-name-that-prompt.md` | Daily slider game: guess how many tokens a silly fictional prompt used; Prompt Sommelier badge for 5 plays | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ (daily) | Medium |
| 7 | AI Autopsy Report | `prd-ai-autopsy-report.md` | On-unload satirical autopsy document for session tokens; printable HTML card; shareable as screenshot | ⭐⭐⭐⭐ | ⭐⭐ | Medium |
| 8 | Doom Postcard Generator | `prd-doom-postcard.md` | Canvas-rendered downloadable PNG postcard with chosen greeting, milestone, and live token count | ⭐⭐⭐⭐⭐ | ⭐⭐ | Medium |

### Phase 3 Implementation Order

1. **Token Horoscope** — low effort, strongest daily return-visit driver; daily seed + share button
2. **AI Guilt-O-Meter** — low effort, adds emotional persistence throughout the session; badge milestone
3. **Token Confessional** — low effort, highly relatable; shareable absolution card drives organic spread
4. **Token Exchange Rate Board** — low effort, reuses existing equivalences; visual punch for Dashboard
5. **Doomscroll Bingo** — medium effort, proven viral bingo format; weekly rotation drives D7 returns
6. **Name That Wasteful Prompt** — medium effort, daily curiosity-gap game; strong badge retention mechanic
7. **AI Autopsy Report** — medium effort, printable satirical artefact; complements Token Receipt
8. **Doom Postcard Generator** — medium effort, highest absolute shareability (downloadable image)

---

## Shared Design Principles

- **No new runtime npm packages** — the site must remain fully static
- **No DOM access in `death-clock-core.js`** — all pure logic there, all DOM in `script.js`
- **No `innerHTML` with dynamic data** — all user-facing dynamic strings via `textContent` or URL-encoded params
- **Accessibility first** — `aria-live` for live regions, focus traps for modals, `prefers-reduced-motion` respected
- **Dark + Light theme** — all new UI must respect the existing CSS custom property theme system
