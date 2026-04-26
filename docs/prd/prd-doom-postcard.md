# PRD: Doom Postcard Generator 🖼️

## Overview

A Canvas API-rendered "doom postcard" that the user can customise with a
satirical greeting, today's global token count, and a chosen milestone. The
postcard is rendered entirely client-side (no image libraries, no backend),
and the user can download it as a PNG or copy its share text. Downloadable
images are shared on social media at a significantly higher rate than text
links, making this the site's highest-reach potential feature.

---

## Problem

All current sharing mechanisms produce text. Text posts are lower-engagement
on social platforms than image posts. A Canvas-rendered image that can be
downloaded and posted directly to Instagram, X, LinkedIn, or Mastodon bypasses
the link-preview problem entirely and keeps the site's branding and message
visible even when the link is stripped.

---

## Goals

- Create the highest-shareability single feature on the site
- Produce a visually distinctive, screenshot-ready image with zero dependencies
- Keep all rendering entirely client-side (no upload, no cloud render)

---

## Non-Goals

- Server-side image generation
- GIF or animated export (v2)
- Fonts beyond system/Canvas defaults (v2 — font loading via FontFace API adds
  complexity)

---

## Feature Description

### Postcard Layout (800 × 500 px canvas)

```
┌─────────────────────────────────────┬──────────────────┐
│                                     │  TOKEN           │
│  [GREETING TEXT]                    │  DEATHCLOCK      │
│                                     │  🌍              │
│  [STAT LINE 1]                      │  [QR-like art]   │
│  [STAT LINE 2]                      │                  │
│                                     │  nitrocode.      │
│  [Milestone name] reached at:       │  github.io/      │
│  [Milestone token count]            │  token-          │
│                                     │  deathclock      │
│  token-deathclock                   │                  │
└─────────────────────────────────────┴──────────────────┘
```

- Left panel: dark background (`#0d1117` or theme equivalent), white/green text
- Right panel: slightly lighter dark background, site branding, URL
- A subtle noise/grain texture via `ctx.putImageData` for a vintage postcard
  feel
- A thin coloured border matching the chosen milestone's `color` property

### User Customisation Options

Presented in a panel above the canvas preview:

| Option | Type | Choices |
|---|---|---|
| **Greeting** | Dropdown | 10 preset satirical greetings (see below) |
| **Milestone** | Dropdown | All milestones from `MILESTONES` array |
| **Stat to highlight** | Dropdown | CO₂, water, electricity, "tokens today" |
| **Theme** | Toggle | Dark (default) / Light |

**Preset Greetings (10):**

1. *"Wish you were here — unfortunately the servers are on fire 🔥"*
2. *"Greetings from the age of automated mediocrity"*
3. *"Having a wonderful time. The data centres disagree."*
4. *"Wish you were here. The glaciers wish they were too."*
5. *"Sending you [N] tokens of love (uninvited)"*
6. *"The machines are thinking about you. Constantly."*
7. *"Don't worry, the AI is handling everything. That's the problem."*
8. *"Postcards from the algorithm: wish you'd typed less"*
9. *"The planet called. It said 'please stop.'"*
10. *"You are here. The tokens have already left."*

### Canvas Rendering

The `renderPostcard(ctx, options)` function (in `src/js/`) performs:

1. Fill backgrounds (left and right panels)
2. Draw border rectangle using `options.milestoneColor`
3. Fill greeting text using `ctx.fillText()` with word-wrap helper
4. Fill stat lines (token count, equivalence)
5. Fill milestone name and token threshold
6. Fill branding text (right panel)
7. Draw a simple ASCII-art decoration in the right panel (a 🌍 emoji rendered
   via `ctx.fillText` is sufficient)
8. Apply grain texture: loop over a small tile of `putImageData` with random
   ±5 RGB noise, tiled across the canvas

All text uses `ctx.font` with a system monospace font stack:
`'Courier New', Courier, monospace`.

### Download

*"Download Postcard 📥"* button calls:

```js
const link = document.createElement('a');
link.download = 'token-deathclock-postcard.png';
link.href = canvas.toDataURL('image/png');
link.click();
```

No libraries, no server round-trip.

### Share Button

Shown alongside the download button:

> 🖼️ I generated a doom postcard on the Token Deathclock.
> [Greeting text] → [URL] #TokenDeathClock #AIPostcard

---

## Architecture Notes

| Layer | Change |
|-------|--------|
| `death-clock-core.js` | No changes needed; postcard renderer uses already-exported `MILESTONES`, `getCurrentTokens()`, `calculateEnvironmentalImpact()` |
| `index.html` | Add `<section id="postcard-section">` with options panel, `<canvas id="postcard-canvas" width="800" height="500">`, download button, share button |
| `src/js/` | New `29-postcard.js`: `initPostcard()`, `renderPostcard(ctx, options)`, `downloadPostcard()`, word-wrap helper `wrapText(ctx, text, x, y, maxWidth, lineHeight)` |
| `styles/` | New rules in `features.css`: `.postcard-section`, `.postcard-options`, `.postcard-canvas-wrap` |

### Word Wrap Helper

```js
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line + (line ? ' ' : '') + word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}
```

---

## UX / Accessibility

- The `<canvas>` element has `role="img"` and `aria-label` updated dynamically
  to describe the current postcard content (e.g., *"Doom postcard: 'Wish you
  were here — unfortunately the servers are on fire' with [N] tokens milestone"*)
- Download button has a clear `aria-label`
- Options panel uses standard `<select>` and `<button>` elements, fully
  keyboard-navigable
- Canvas rendering does not depend on screen reader access — all meaningful
  content is also available as text in the options panel
- `prefers-reduced-motion`: no animated elements in the canvas rendering
- Dark / light theme toggle is a within-postcard setting; the page-level theme
  does not automatically override the postcard theme so users can create a
  light postcard on a dark-theme browser

---

## Success Metrics

- Download button click rate
- Share button click rate
- Social posts containing an image tagged with "#AIPostcard" or
  "#TokenDeathClock"

---

## Open Questions

- Should there be a QR code rendered on the right panel pointing to the site?
  (Canvas QR libraries add complexity; a short text URL is sufficient for v1)
- Should users be able to type a custom greeting? (v2 — requires input
  sanitisation in the canvas renderer)
- Should the postcard be exportable as SVG for higher resolution? (v2)
