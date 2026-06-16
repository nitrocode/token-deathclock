# PRD: Token Horoscope 🔮

## Overview

Each day a new satirical "AI horoscope" is generated deterministically from
the current UTC date and served to all visitors. The horoscope tells the
visitor which AI "sin" they are astrologically destined to commit today —
complete with a dramatic warning about data-centre consequences. It refreshes
every 24 hours, creating a strong daily return-visit pull with zero backend
infrastructure.

---

## Problem

The site's existing content is largely static between visits — the counter
changes, but the editorial content does not. Without a reason to come back
*today specifically*, many users visit once and never return. A daily rotating
item that feels personal is one of the cheapest possible levers for driving
consecutive daily visits.

---

## Goals

- Drive daily return visits (D1, D3, D7 retention)
- Create a highly shareable satirical artefact that changes every day
- Add levity and personality to the top of the Dashboard section

---

## Non-Goals

- Real astrology or personalisation by birthdate
- Server-generated content
- Localisation by timezone (all horoscopes use UTC date)

---

## Feature Description

### Horoscope Generation

A pool of **30 horoscope templates** is embedded in `death-clock-core.js` as a
constant array. Each template is a short satirical paragraph (2–3 sentences)
following the pattern:

> *"[Astrological sign-like opener]. Today you will [AI sin]. The stars
> (and several thousand GPU cores) [dramatic consequence]. [Satirical advice]."*

**Sample templates:**

1. *"Mercury is in retrograde and so is your judgment. Today you will ask AI to
   rewrite a perfectly good email four times. The data centres hum approvingly.
   Consider a typewriter."*

2. *"The alignment of Jupiter and your idle fingers portends a reckless
   afternoon. You will use AI to summarise a Wikipedia article you could have
   read in 90 seconds. Three cooling towers exhale in unison."*

3. *"Venus rises in your browser history. You will prompt an image generator
   for 45 variations of 'a cat wearing sunglasses' before choosing the first
   one. The oceans do not forget."*

4. *"Your lunar node suggests creative avoidance. You will ask AI to write a
   birthday card for your own parent. The glaciers note this."*

5. *"Saturn's gaze falls upon your clipboard. You will run the same prompt
   five times with minor wording changes to see if the answer improves. It
   will not. The servers will not forget."*

*(25 additional templates in the constant array — full list in implementation.)*

### Daily Seed Selection

```js
// In death-clock-core.js
function getDailyHoroscope(nowMs, templates) {
  const day = Math.floor(nowMs / 86400000); // UTC day index
  return templates[day % templates.length];
}
```

All visitors on the same UTC day see the same horoscope — which is intentional
(it creates a shared cultural moment and a reason to compare notes).

### Display

- A collapsible card near the top of the **Dashboard** tab, labelled
  **"🔮 Your Daily AI Horoscope"** with today's UTC date shown as a subtitle
- Default state: expanded on first daily load; collapsed if already viewed
  today (tracked via `localStorage` key `tokenDeathclockHoroscopeDate`)
- The card includes the horoscope text and a **"Share My Fate 🔮"** button

### Share Button

Share text:

> 🔮 Today's AI Horoscope: "[horoscope text]"
> Will this be you today? → [URL] #TokenDeathClock #AIHoroscope

---

## Architecture Notes

| Layer | Change |
|-------|--------|
| `death-clock-core.js` | Add `HOROSCOPE_TEMPLATES` array (30 items); add `getDailyHoroscope(nowMs, templates)` pure function |
| `index.html` | Add `<section id="horoscope-section">` with card, text container, and share button |
| `src/js/` | New `23-horoscope.js`: `initHoroscope()` reads date, calls core, renders text via `textContent`, handles collapse state |
| `styles/` | New rules in `features.css`: `.horoscope-card`, `.horoscope-date`, `.horoscope-text` |

### localStorage Schema

```json
{ "date": "2026-04-26" }
```

Key: `tokenDeathclockHoroscopeDate`. If the stored date matches today's UTC
date, the card starts collapsed. Otherwise it starts expanded and the date is
updated.

---

## UX / Accessibility

- The horoscope text is set via `textContent`, never `innerHTML`
- The collapsible uses a `<details>` / `<summary>` pattern for native keyboard
  and screen-reader support
- `aria-live="polite"` on the text container so screen readers announce the
  content on expansion
- Dark + light theme: card uses existing CSS custom property colour tokens

---

## Success Metrics

- D1 and D7 return-visit rate increase
- Share button click rate
- Social posts containing "#AIHoroscope"

---

## Open Questions

- Should the horoscope vary by "sign" selected by the user? (v2 — adds 12×
  personalisation for minimal extra cost)
- Should there be a "horoscope archive" tab showing the past 7 days? (v2)
