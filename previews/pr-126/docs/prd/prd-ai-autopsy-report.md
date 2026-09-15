# PRD: The AI Autopsy Report 🔬

## Overview

At the end of a session — triggered by the `beforeunload` / `pagehide` event,
like the existing Token Receipt modal — the site generates a satirical
"autopsy report" for the tokens consumed during the visit. Styled as a mock
medical-examiner document, it includes absurdist fields like *"Cause of
Death," "Time of Death," "Surviving Dependents,"* and *"Forensic Notes."*
The report is rendered as a printable HTML card and can be saved as a
screenshot or printed by the user.

---

## Problem

The existing Token Receipt modal shows session stats in a thermal-receipt
format. That feature works well, but it is informational rather than
satirical. The Autopsy Report takes the same session data and re-frames it
through the lens of absurdist medical bureaucracy — a format that is
inherently funnier, more screenshot-worthy, and more socially shareable than
a receipt.

---

## Goals

- Create the site's most screenshot-ready artefact for social media sharing
- Add a printable leave-behind that users keep and share offline
- Complement (not replace) the existing Token Receipt with a parallel
  satirical framing

---

## Non-Goals

- Replacing the Token Receipt (both can coexist — the Autopsy is an optional
  alternative view)
- Accurate medical terminology (the absurdity is the point)
- Canvas/image rendering (HTML + CSS print stylesheet is sufficient)

---

## Feature Description

### Report Fields

The report is formatted as a mock official document with the header:

```
OFFICE OF THE DIGITAL MEDICAL EXAMINER
AUTOPSY REPORT — DECEASED AI SESSION
CERTIFICATE No. [6-digit random number]
```

| Field | Value / Logic |
|---|---|
| **Decedent** | *"Global AI Token Pool (Session Portion)"* |
| **Date of Death** | Current date/time formatted as `DD MMM YYYY HH:MM UTC` |
| **Cause of Death** | Randomly selected from a pool of 20 causes (see below) |
| **Time of Death** | Session end timestamp |
| **Duration of Illness** | `[sessionDurationSeconds]` formatted as *"X minutes, Y seconds"* |
| **Tokens Consumed** | `sessionTokens` formatted with commas |
| **CO₂ Emitted** | `calculateEnvironmentalImpact(sessionTokens).co2Grams` + units |
| **Water Used** | Water equivalence in mL |
| **Energy Consumed** | kWh equivalence, formatted to 4 decimal places |
| **Surviving Dependents** | Randomly selected satirical line (see below) |
| **Forensic Notes** | Randomly selected note from pool of 15 |
| **Pathologist** | *"Dr. A.I. Burnout, MBBS (Digital), FRCGPU"* |
| **Signature** | ASCII-art signature line |

**Cause of Death pool (20 items):**

- *"Unnecessary synonym generation (acute)"*
- *"Chronic re-prompting with minor wording changes"*
- *"Compulsive birthday card outsourcing"*
- *"Acute image generation with no clear purpose"*
- *"Self-inflicted philosophical debate at 02:00"*
- *"Repeated 'make it more professional' injections"*
- *"Wikipedia summary avoidance disorder (terminal)"*
- *"Elective lunch decision paralysis"*
- *"Third-party apology text composition"*
- *"Experimental 'explain like I'm 5' overdose"*
- *(10 additional)*

**Surviving Dependents pool (15 items):**

- *"3 cached responses that were never read"*
- *"1 email draft that was deleted without sending"*
- *"47 GPU cycles, mourned by their families"*
- *"2 synonyms for 'utilise' that were not utilised"*
- *"The original, un-AI'd version of your text"*
- *(10 additional)*

**Forensic Notes pool (15 items):**

- *"No foul play suspected. Victim was a willing participant."*
- *"Deceased showed no signs of having used a search engine."*
- *"Evidence of repeated 'regenerate' button activation."*
- *"Time of arrival on site inconsistent with stated 'quick look'."*
- *(11 additional)*

### Trigger Mechanism

Two complementary triggers (same pattern as Token Receipt):

1. **Passive:** `pagehide` event after ≥ 30 seconds on page — the report modal
   opens automatically, giving the user a chance to screenshot before leaving
2. **Active:** A **"🔬 Generate Autopsy Report"** button is always visible in
   the Dashboard tab footer (visible after 60 seconds)

The modal has a **"Print / Save as PDF"** button that calls `window.print()`.
A `@media print` CSS block hides everything except the report card, so the
browser's print-to-PDF produces a clean document.

### Visual Design

- White card on a dark overlay (modal backdrop)
- Header in a serif font (or `font-family: Georgia, serif` fallback)
- Field labels in uppercase, values in normal case
- A horizontal divider line between sections
- Faint watermark text: *"CONFIDENTIAL — FOR SATIRICAL PURPOSES ONLY"*
- Certificate number in monospace font, top-right corner

### Share Button

> 🔬 I just received my AI Autopsy Report.
> Cause of death: "[cause]"
> Tokens consumed: [N] | Session: [duration]
> Get yours: → [URL] #TokenDeathClock #AIAutopsy

---

## Architecture Notes

| Layer | Change |
|-------|--------|
| `death-clock-core.js` | Add `AUTOPSY_CAUSES`, `AUTOPSY_DEPENDENTS`, `AUTOPSY_NOTES` constant arrays; add `generateAutopsyReport(sessionData, nowMs)` returning a plain object with all report fields |
| `index.html` | Add `<div id="autopsy-modal">` (hidden); add trigger button in dashboard footer |
| `src/js/` | New `28-autopsy.js`: `initAutopsy()`, `openAutopsyReport()`, `renderAutopsyReport(data)`, print button handler |
| `styles/` | New rules in `features.css`: `.autopsy-modal`, `.autopsy-card`, `.autopsy-header`, `.autopsy-field`, `@media print` rules |

All dynamic report fields use `textContent` — the `generateAutopsyReport`
function returns a plain object, and the renderer maps fields to DOM nodes via
`textContent` assignments.

---

## UX / Accessibility

- Modal follows ARIA modal pattern: `role="dialog"`, `aria-modal="true"`,
  `aria-labelledby` pointing to the "AUTOPSY REPORT" heading
- Focus trapped inside modal; `Escape` closes it
- Print button has `aria-label="Print or save the autopsy report as PDF"`
- `prefers-reduced-motion`: modal appears without fade animation
- The `@media print` stylesheet hides the modal overlay/backdrop and renders
  only the card for clean PDF output

---

## Success Metrics

- Autopsy modal open rate
- Print/PDF button click rate
- Share button click rate
- Social posts containing "#AIAutopsy"

---

## Open Questions

- Should the Autopsy Report and Token Receipt coexist as separate modals, or
  should one be a "style" toggle of the other? (Separate modals preferred —
  each serves a different tone)
- Should a unique "Certificate Number" be shareable as a URL hash to let users
  retrieve "their" report later? (v2 — would require deterministic seeding from
  session data)
