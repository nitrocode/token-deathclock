# PRD: Share Your Doom 📣

## Overview

Add a one-click social sharing section that generates a personalised, darkly funny snapshot of the environmental carnage that occurred while the human was on the page. The goal is virality — give people a screenshot-worthy stat they *have* to show their friends.

---

## Problem

The site has excellent data but no low-friction way for a visitor to share it. Sharing = free distribution. Humans love sharing things that make other humans feel vague existential dread.

---

## Goals

- Let visitors share a personalised "doom receipt" in ≤ 2 taps
- Increase organic social sharing (Twitter/X, Reddit, LinkedIn, WhatsApp)
- Keep the UI lightweight (no new runtime npm packages, no canvas screenshot library)

---

## Non-Goals

- Actual server-side analytics or tracking
- OAuth / social login
- Canvas-rendered image cards (complex, out of scope for v1)

---

## Feature Description

### Session Doom Receipt

When the user has been on the page for at least 10 seconds, a **"Share Your Doom"** button floats up in the lower-right corner (or appears as a fixed panel at the bottom of the counter section).

Clicking it generates a pre-filled share text such as:

> 💀 I just watched AI consume **4,312,000 tokens** in the 43 seconds I spent on this site.
> That's the CO₂ of driving **12 km**, the water to brew **86 cups of coffee**, and the electricity to charge my phone **52 times**.
> And it never stops.
> → [link] #AIDeathClock #TokenDeathClock

The numbers come from the already-calculated session stats (`sessionTokens`, `calculateEnvironmentalImpact`).

### Share Targets (v1)

| Target | Method |
|--------|--------|
| Twitter/X | `https://twitter.com/intent/tweet?text=…` deep link |
| Reddit | `https://www.reddit.com/submit?url=…&title=…` deep link |
| Copy to clipboard | `navigator.clipboard.writeText(…)` |

All three are plain URL deep links — zero new dependencies.

### Fun Equivalence Phrases

The share text picks **one random comparison** from a list (client-side, seeded by session token count for reproducibility). Examples:

- "the CO₂ of driving X km"
- "water to brew X cups of coffee" (1 cup ≈ 200 mL)
- "electricity to charge an iPhone X times" (1 charge ≈ 15 Wh)
- "the annual CO₂ absorption of X trees"
- "enough text to fill X novels" (avg novel ≈ 90k tokens)

These comparisons live in `death-clock-core.js` as a pure helper function `sessionEquivalences(sessionTokens)` → `string[]`.

---

## Implementation Notes

- New pure function `sessionEquivalences(tokens)` → `string[]` in `death-clock-core.js`
- New `renderSharePanel()` function in `script.js`
- Share panel HTML added to `index.html` (hidden initially, shown after 10s)
- Share text assembled in `script.js` using `escHtml`-safe template
- No `innerHTML` with dynamic share text — use `textContent` or encode in URL params only

---

## Success Metrics

- Qualitative: people are posting the share text on social media
- Quantitative (GitHub Analytics / referral headers): inbound traffic from Twitter, Reddit

---

## Open Questions

- Should the share panel also include a "download as image" option using the Canvas API? (Deferred to v2 — adds complexity)
- Should the equivalences be localised (e.g., miles vs km)? (v2 — detect locale)
