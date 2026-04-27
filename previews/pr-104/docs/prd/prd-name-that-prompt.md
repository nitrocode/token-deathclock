# PRD: "Name That Wasteful Prompt" Game 🎮

## Overview

A daily mini-game that presents a real-sounding (but fictional) AI prompt —
such as *"Write me a poem about my cat Gary in the style of Shakespeare but
make Gary a pirate"* — and asks the player to guess how many tokens it
consumed by dragging a slider. After submitting, the site reveals the actual
estimate with a contextual environmental equivalence and a funny reaction. A
running lifetime total of "Tokens Wasted on Silly Prompts" accumulates in
`localStorage`. Playing 5 games earns the **Prompt Sommelier 🍷** badge.

---

## Problem

The site communicates token consumption as large abstract numbers. The game
makes those numbers personal and tangible by asking users to estimate the cost
of specific prompts they might recognise from their own usage. The curiosity
gap created by the slider guess — *"I wonder if I'm right"* — is one of the
most powerful low-friction engagement mechanics available.

---

## Goals

- Add 2–4 minutes of active, daily engagement
- Make individual token estimates feel concrete and relatable
- Create a reason to return each day (daily prompt rotation)
- Award a badge that rewards repeated engagement

---

## Non-Goals

- Tracking real user prompts
- Server-side scoring or leaderboards
- Real-time token counting (estimates are pre-computed)

---

## Feature Description

### Prompt Pool

A pool of **30 fictional prompts** with pre-computed token estimates embedded
in `death-clock-core.js` as a constant array. Each entry has:

- `prompt`: display text (the fictional prompt, ≤ 30 words)
- `tokens`: integer estimate
- `reaction`: a short funny comment revealed after guessing
- `equivalence`: a pre-written equivalence string

**Sample prompts:**

| Prompt | Tokens | Reaction | Equivalence |
|---|---|---|---|
| "Write me a poem about my cat Gary in the style of Shakespeare but make Gary a pirate" | 847 | "Gary would be ashamed. Shakespeare definitely would be." | "Enough energy to charge your phone 0.06 times." |
| "Explain quantum computing to me like I'm 5, then like I'm 10, then like I'm a PhD student" | 2,340 | "Three explanations. One remained unread." | "Water to brew 0.4 cups of coffee." |
| "Give me 50 synonyms for 'good' ranked by how fancy they sound" | 1,100 | "You used 'nice' anyway." | "CO₂ of driving 12 metres." |
| "Roast my LinkedIn bio but be nice about it" | 680 | "The bio was not improved." | "Electricity to power an LED for 8 minutes." |
| "Write a breakup text from the perspective of my sourdough starter" | 540 | "The starter had feelings. You ignored them." | "Energy to boil 2 mL of water." |
| "Plan my entire week but make it sound like a heist movie" | 1,800 | "You did not execute the heist." | "CO₂ of driving 20 metres." |
| *(24 additional in the constant array)* | | | |

### Daily Rotation

```js
// In death-clock-core.js
function getDailyPromptGame(nowMs, prompts) {
  const day = Math.floor(nowMs / 86400000); // UTC day index
  return prompts[day % prompts.length];
}
```

All visitors on the same UTC day play the same prompt, making it a shared
daily challenge. The prompt index changes at UTC midnight.

### Gameplay Flow

1. **Prompt card:** The fictional prompt is displayed on a card with the label
   *"How many tokens did this prompt consume?"*
2. **Slider:** Range `0 – 5,000` tokens, default position at 1,000.
   A live label shows the current guess formatted with commas.
3. **"Submit Guess"** button
4. **Reveal card:**
   - Shows actual token count in large type
   - Shows how close the guess was (e.g., *"You were 342 tokens off — pretty
     good 👍"* / *"You were 4,200 tokens off — spectacular miss 😬"*)
   - Shows the reaction text
   - Shows the equivalence
   - Shows the running lifetime total:
     *"Lifetime silly tokens guessed: [N] tokens"*
5. **"Share My Guess"** button + **"Come Back Tomorrow"** link

### Closeness Tiers

| Distance from correct | Label |
|---|---|
| ≤ 10 % | 🎯 Uncanny. You've done this before. |
| 11–30 % | 👍 Not bad. Do you work in AI? |
| 31–60 % | 🤷 Respectable ballpark. |
| 61–100 % | 😬 Interesting interpretation of 'tokens'. |
| > 100 % over | 🤣 Spectacular miss. The prompt is shocked. |

### Lifetime Token Tally

Every completed game adds the **actual** token count to a `localStorage`
accumulator:

```json
{ "totalSillyTokens": 47230, "gamesPlayed": 12 }
```

Key: `tokenDeathclockPromptGame`. Displayed as *"You've helped estimate
[N] silly tokens consumed — and counting."*

### Badges

| Badge ID | Icon | Name | Trigger |
|---|---|---|---|
| `prompt_sommelier` | 🍷 | *Prompt Sommelier* | 5 completed games (any days) |
| `perfect_palate` | 🎯 | *Perfect Palate* | Guess within 5 % of correct answer |

### Share Button

> 🎮 Today's Wasteful Prompt: "[prompt text]"
> I guessed [N] tokens. Actual: [M] tokens. [Closeness label]
> Can you do better? → [URL] #TokenDeathClock #NameThatPrompt

---

## Architecture Notes

| Layer | Change |
|-------|--------|
| `death-clock-core.js` | Add `PROMPT_GAME_POOL` array (30 items); add `getDailyPromptGame(nowMs, prompts)` pure function; add `scorePromptGuess(guess, actual)` returning closeness tier |
| `index.html` | Add `<section id="prompt-game-section">` with prompt card, slider, submit button, and reveal card (hidden initially) |
| `src/js/` | New `27-prompt-game.js`: `initPromptGame()`, `renderPromptCard()`, `handleGuessSubmit()`, `showPromptReveal()` |
| `styles/` | New rules in `features.css`: `.prompt-game-card`, `.prompt-slider`, `.prompt-reveal`, `.closeness-label` |

### localStorage Schema

```json
{
  "lastPlayedDay": 20926,
  "totalSillyTokens": 47230,
  "gamesPlayed": 12
}
```

Key: `tokenDeathclockPromptGame`. `lastPlayedDay` is the UTC day index. If it
matches the current day, the reveal card is shown immediately (already played
today) with a *"Come back tomorrow"* message.

---

## UX / Accessibility

- Slider is a native `<input type="range">` with `aria-label`, `aria-valuemin`,
  `aria-valuemax`, `aria-valuenow`, and an associated `<output>` element
- Reveal card uses `aria-live="assertive"` to announce the result to screen
  readers
- All dynamic text uses `textContent`, never `innerHTML`
- `prefers-reduced-motion`: reveal animation is instant (no flip/slide)
- Dark + light theme: prompt card uses existing CSS custom property colour
  tokens

---

## Success Metrics

- `prompt_sommelier` badge earn rate (indicates 5+ return visits)
- `perfect_palate` badge earn rate (indicates engagement quality)
- Share button click rate
- Social posts containing "#NameThatPrompt"

---

## Open Questions

- Should there be a "Hard Mode" with a wider slider range (0–100,000) and
  more complex prompts? (v2)
- Should there be a weekly challenge prompt that persists for 7 days instead
  of rotating daily? (v2)
