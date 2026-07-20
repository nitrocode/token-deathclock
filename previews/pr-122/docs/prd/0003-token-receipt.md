# PRD: Token Receipt — Your AI Usage Bill 🧾

## Overview

When a visitor is about to leave the page (or on request), show a beautifully styled "receipt" summarising the environmental cost of their session — formatted exactly like a thermal printer receipt. It is funny, tactile, and extremely shareable.

---

## Problem

People leave the site and immediately forget how much AI consumed while they were there. A receipt is a concrete, tangible artefact they can screenshot. The receipt format triggers a visceral recognition: *"I got charged for this."*

---

## Goals

- Create a highly shareable, screenshot-optimised summary
- Reinforce the "cost" framing through receipt aesthetics
- Trigger before-unload so visitors see it naturally

---

## Non-Goals

- Actual billing or payments (obviously)
- Canvas image generation (v2 — adds complexity)

---

## Feature Description

### Receipt Design

A full-width, centred receipt card with monospace font, dashed borders, and a slightly off-white / thermal paper look (in light mode) or dark-terminal look (in dark mode):

```
╔══════════════════════════════╗
║   🧾  AI DEATH CLOCK         ║
║   SESSION RECEIPT            ║
╚══════════════════════════════╝

Date:     Wed 22 Apr 2026
Time:     08:14:52 UTC
Duration: 3 min 47 sec

──────────────────────────────
ITEM                    QTY
──────────────────────────────
AI tokens consumed   22,700,000
Energy used (kWh)         0.006
CO₂ emitted (g)             2.4
Water consumed (mL)          11
Trees' annual capacity   0.0001
──────────────────────────────
SUBTOTAL (your session)   above

Global rate this second:
  100,000,000 tokens/sec
  You were here for 227 sec
  = 22.7B tokens globally

You personally prompted:
  [N/A — we can't know, honestly]
──────────────────────────────

THANK YOU FOR YOUR VISIT
Your session cost the planet:

  🌡️ Approx 2.4 grams of CO₂
     (≈ driving 14 metres)

  🌊 Approx 11 mL of water
     (≈ half a sip of tea)

  ⚡ Approx 0.006 kWh
     (≈ your phone for 24 min)

──────────────────────────────
* * * NO REFUNDS * * *
* THE PLANET CANNOT ISSUE *
*    CARBON CREDITS FOR   *
*    AI-GENERATED HAIKU   *
──────────────────────────────
     Please come again.
     (We'll still be here.)
         💀
```

### Trigger Mechanisms

1. **Before Unload**: show receipt modal when `beforeunload` fires (with > 15 s session time, to avoid noise)
2. **Manual**: a **"🧾 Get My Receipt"** button at the bottom of the counter section — always available

### Receipt Modal

- Full-screen overlay, centred receipt card
- **"📤 Share Receipt"** button → pre-fills tweet/copy
- **"📋 Copy Text"** button → plain text to clipboard
- **"✕ Close"** button → dismisses; `beforeunload` version has "Leave anyway" + "Stay and watch"

### Share Text (pre-filled)

> 🧾 My AI Death Clock receipt: I watched the planet spend 22.7B tokens in 3 min 47 sec.
> That's 2.4g CO₂, 11mL water, enough electricity to charge my phone for 24 minutes.
> And I didn't even prompt anything.
> → [link] #TokenDeathClock #AIReceipt

---

## Implementation Notes

- Receipt content generated in `script.js` using session data already computed
- `beforeunload` listener added in `script.js` — skipped if session < 15 s (avoid rage-quit receipts)
- Receipt card styled in `styles.css` — monospace font (`Share Tech Mono` already loaded)
- Modal overlay uses existing CSS patterns; no new JS framework
- All dynamic values inserted via `textContent` — no `innerHTML` with computed values
- "Stay and watch" button on the `beforeunload` modal simply calls `e.preventDefault()` on the unload event

---

## Accessibility

- Modal traps focus when open (standard focus-trap pattern, ~20 lines of JS)
- `role="dialog"` with `aria-modal="true"` and `aria-labelledby` pointing to receipt heading
- Dismissible with `Escape` key

---

## Design Notes

- The receipt *must* look like a real thermal receipt — this is the entire joke
- Use `font-family: 'Share Tech Mono'` (already loaded via Google Fonts)
- Dashed `border-top` / `border-bottom` for the separator lines
- Slight `transform: rotate(-0.3deg)` on the card for a crumpled-paper feel
- In dark mode: dark green terminal aesthetic (green text on near-black)
- In light mode: slightly warm off-white (`#faf8f0`), `#333` text

---

## Success Metrics

- Social media posts with receipt screenshots
- "Stay and watch" click rate (indicates engaged visitors)

---

## Open Questions

- Should the receipt include a QR code pointing back to the site? (Pure CSS/JS QR generation is 3KB — worth exploring in v2)
- Should frequent visitors get a "loyalty card" style receipt variation? (Fun, pairs well with Doom Achievements PRD)
