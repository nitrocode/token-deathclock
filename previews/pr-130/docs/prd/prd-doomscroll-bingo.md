# PRD: Doomscroll Bingo 🎱

## Overview

A 5×5 bingo card populated with AI over-usage sins. Visitors tick off squares
for behaviours they recognise in themselves. Completing a row fires a confetti
flash and a share prompt. Filling the entire card awards the **Full House of
Doom 🏆** badge. The card rotates weekly (same card for all visitors in a given
UTC week) so returning visitors face a fresh challenge every 7 days.

---

## Problem

The site conveys the *scale* of global AI token consumption, but it doesn't
connect that scale to individual behaviour patterns. Bingo cards are a
well-tested viral format — the combination of self-recognition humour,
competitive instinct ("how many did you get?"), and social sharing of filled
cards has driven multiple viral moments across the internet. This feature
adapts that proven format to the token-waste theme.

---

## Goals

- Create the site's most shareable single artefact: a filled bingo card is
  an image-ready social media post
- Drive weekly return visits (the card changes every 7 days)
- Deepen user connection to the mindfulness message by making specific
  behaviours visible and relatable

---

## Non-Goals

- Server-side score tracking or leaderboards
- Multiplayer bingo
- Personalisation by user history

---

## Feature Description

### Card Generation

**Card pool:** 50 bingo squares (behaviours) embedded in `death-clock-core.js`
as a constant array. Each square has short display text (≤ 8 words) and a
longer tooltip.

**Sample squares:**

| Display text | Tooltip |
|---|---|
| "Asked AI to name my pet" | You typed a prompt. The data centres hummed. |
| "Rewrote a perfectly good email" | It was fine. It was always fine. |
| "Generated 10+ images for one post" | Variation 7 was always going to win. |
| "Summarised something you hadn't read" | The article was 400 words. |
| "Debated ethics with a chatbot" | The chatbot won. The planet lost. |
| "Used AI for a one-word answer" | You could have Googled it in 4 seconds. |
| "Let AI pick your dinner" | It said 'pasta'. You ate pasta. |
| "Asked AI to 'make it more professional'" | It added 'synergize'. |
| "Ran 5 prompts to fix a typo" | The typo still exists. |
| "Asked for 'a poem about Mondays'" | Every data centre groaned. |
| "Used AI to reply to a meme" | Sarcasm costs tokens too. |
| "Had AI explain a meme to you" | Some things should stay mysterious. |
| "Generated a recipe for 3 ingredients" | A cookbook existed. |
| "Let AI write your apology text" | It was sincere. That's the problem. |
| "Asked for synonyms for 'good'" | A thesaurus is free. |
| "Used AI to make small talk" | The loneliness continues. |
| "Asked AI to summarise AI safety" | Irony costs tokens too. |
| "Re-prompted 'be more creative'" | Creativity cannot be commanded. |
| "Used AI to write a to-do list" | You then ignored the list. |
| "Asked AI if you should take a break" | You're still here. |
| "Used AI to translate one word" | Google Translate wept. |
| "Asked for 'fun facts' about water" | Water: still wet. |
| "Generated a logo then used the default" | The first draft was fine. |
| "Asked AI to proofread a text message" | lol was spelled correctly. |
| *(25 additional in the constant array)* | |

**Weekly selection:**

```js
// In death-clock-core.js
function getBingoCard(nowMs, squares) {
  const week = Math.floor(nowMs / (7 * 86400000)); // UTC week index
  const seeded = seededShuffle(squares, week);
  return seeded.slice(0, 25); // 5×5 = 25 squares
}
```

`seededShuffle` is a simple Fisher-Yates shuffle using a linear congruential
generator seeded by the week index — already used for similar purposes in the
quiz and horoscope features.

### Tick-off Mechanics

- Each square is a `<button>` toggled between ticked (✅ with strikethrough
  text) and unticked state
- State is stored in `localStorage` as a bitmask or array:
  `tokenDeathclockBingo` → `{ week: 3210, ticked: [0, 3, 7, 12, ...] }`
- On page load, if stored week matches current week, previously ticked squares
  are restored

### Bingo Detection

- After every tick, the 5×5 grid is checked for completed rows, columns, and
  diagonals (standard bingo rules)
- On first bingo (any line): confetti burst animation (CSS keyframes only,
  no library) + toast: *"🎱 BINGO! You are statistically average at wasting
  AI tokens. Share your card!"* + share button appears
- On full card (25/25): **Full House of Doom 🏆** badge awarded + extra
  confetti

### Badges

| Badge ID | Icon | Name | Trigger |
|---|---|---|---|
| `bingo_line` | 🎱 | *Bingo Caller* | Complete any row, column, or diagonal |
| `bingo_full_house` | 🏆 | *Full House of Doom* | All 25 squares ticked |

### Share Button (appears after first bingo)

Share text:

> 🎱 I just got BINGO on the AI Waste Bingo card.
> Squares I've done this week: [N]/25
> Are you as guilty as me? → [URL] #TokenDeathClock #AIBingo #DoomBingo

---

## Architecture Notes

| Layer | Change |
|-------|--------|
| `death-clock-core.js` | Add `BINGO_SQUARES` array (50 items with `text` and `tooltip`); add `getBingoCard(nowMs, squares)` using seeded weekly shuffle |
| `index.html` | Add `<section id="bingo-section">` with `<div class="bingo-grid">` (5×5 button grid) and share button |
| `src/js/` | New `26-bingo.js`: `initBingo()`, `renderBingoCard()`, `handleBingoTick(index)`, `checkBingo()`, `triggerBingoAnimation()` |
| `styles/` | New rules in `features.css`: `.bingo-grid`, `.bingo-square`, `.bingo-square.ticked`, `.bingo-confetti`, keyframe animation |

### localStorage Schema

```json
{
  "week": 3210,
  "ticked": [0, 3, 7, 12, 18]
}
```

Key: `tokenDeathclockBingo`. If `week` doesn't match current week, state is
reset and the new week's card is generated.

---

## UX / Accessibility

- Each bingo square is a `<button>` with `aria-pressed` reflecting ticked
  state and `aria-label` including both the display text and tooltip
- The 5×5 grid uses CSS Grid; readable at all viewport widths (squares
  shrink gracefully on mobile)
- Confetti animation respects `prefers-reduced-motion` (no animation, just a
  colour flash)
- Ticked state is indicated by both colour change and ✅ prefix — not colour
  alone
- Dark + light theme: ticked squares use CSS custom properties

---

## Success Metrics

- `bingo_line` badge earn rate
- `bingo_full_house` badge earn rate
- Week-over-week return visit rate increase
- Social posts containing "#AIBingo"

---

## Open Questions

- Should there be a "free space" in the centre (pre-ticked: *"You used AI
  today"*)? Probably yes — adds authenticity to the bingo format.
- Should the share button generate an actual image of the filled card? (v2 —
  see Doom Postcard Generator PRD for Canvas rendering approach)
