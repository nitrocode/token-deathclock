# PRD: "AI Is Currently Writing…" Live Absurdity Ticker 🎭

## Overview

Show a continuously scrolling live ticker of hilariously mundane (and occasionally profound) things that AI is *probably* generating right now, in real time, while the token counter ticks up. Pure comedy. Pure horror.

---

## Problem

Numbers are abstract. 100 million tokens per second is hard to picture. "Right now, somewhere, AI is writing a strongly worded letter about a neighbour's leaf blower" is extremely easy to picture.

---

## Goals

- Make the token rate viscerally funny and relatable
- Create the most screenshot-able section of the page
- Drive sharing with zero UI friction (the content *is* the share)

---

## Feature Description

### The Ticker

A horizontally scrolling (or vertically flipping) ticker strip placed just below the live rate counter, labelled:

**"🤖 AI is currently generating…"**

It rotates through a curated list of absurd real-time "facts" every 3–4 seconds. Each entry is tied loosely to the current token rate or session stats:

#### Category: The Mundane

- "…**{X} apology emails** for replying 'per my last email'"
- "…**{X} LinkedIn posts** about disruption, transformation, and journeys"
- "…**{X} cover letters** for a job that was already filled by AI"
- "…**{X} README files** for projects that will never be committed"
- "…**{X} passive-aggressive Slack messages** softened by three rewrites"
- "…**{X} horoscopes** for zodiac signs that don't exist yet"

#### Category: The Profound

- "…**{X} attempts** to explain consciousness to a language model"
- "…**{X} recursive prompts** asking AI if it's sentient"
- "…**{X} love poems** for someone who asked for 'something quick'"
- "…**{X} philosophical debates** between two instances of the same model"

#### Category: The Alarming

- "…**{X} security advisories** for vulnerabilities AI introduced last week"
- "…**{X} slide decks** titled 'AI Strategy 2026'"
- "…**{X} meeting summaries** for meetings that could have been emails"
- "…**{X} terms of service** that no human will ever read"

#### Category: The Delightful

- "…**{X} bedtime stories** featuring a dragon named Gerald"
- "…**{X} recipes** that add cheese to things that should not have cheese"
- "…**{X} cat pictures** described in 800 words"
- "…**{X} arguments** about whether a hot dog is a sandwich"
- "…**{X} variations** of 'hello world' in Rust"

The `{X}` values are computed from `sessionTokens / estimatedTokensPerUnit`, e.g.:
- LinkedIn post ≈ 400 tokens → X = Math.floor(sessionTokens / 400)
- Cover letter ≈ 800 tokens → X = Math.floor(sessionTokens / 800)

This makes the numbers update live and feel surprisingly plausible.

### "Freeze Frame" Interaction

Clicking any ticker item pauses the rotation and shows an expanded card:

```
🤖 Since you arrived, AI has probably written…

    📄 47 LinkedIn posts about disruption

Each LinkedIn post uses ≈ 400 tokens.
You've been here 18 seconds.
18s × 100,000,000 tokens/sec = 1,800,000,000 tokens
1,800,000,000 / 400 = 4,500,000 posts globally

(Just on LinkedIn. Probably.)

[▶ Resume] [📤 Share this fact]
```

The share text is pre-filled with the expanded fact.

---

## Content Guidelines

- Tone: darkly funny, never mean-spirited
- Avoid: political targets, named real people, anything that could read as harassment
- Include: at least 40 entries across the four categories to prevent repetition fatigue
- The list lives in `script.js` as a constant array (UI layer, not pure logic)

---

## Implementation Notes

- Ticker element in `index.html`, styled in `styles.css` (CSS `@keyframes` scroll or JS flip)
- Pure JS rotation using `setInterval` in `script.js`
- `{X}` substitution done with `textContent` substitution, never `innerHTML` with user data
- All ticker strings are hard-coded static strings — no dynamic injection risk
- Pause/expand on click uses a simple toggle state variable
- Share uses same URL deep-link pattern as the Share Your Doom PRD

---

## Accessibility

- Ticker has `role="marquee"` (or `role="status"` with slower rotation)
- **Pause on hover** (CSS `animation-play-state: paused`) — required for WCAG 2.2 AA (moving content)
- **Reduced motion**: when `prefers-reduced-motion: reduce` is set, show static text (no rotation) — just display one random entry

---

## Success Metrics

- Qualitative: screenshots of specific ticker entries appear on social media
- Engagement: expanded card interactions (clicks on items)

---

## Open Questions

- Should users be able to submit their own entries? (Fun but needs moderation — v3)
- Vertical flip (like a departure board) or horizontal scroll? (Flip is classier and more legible — recommend flip)
- Should the numbers be rounded to the nearest "nice" number to feel less raw? (Yes — round to nearest 10/100/1000 for readability)
