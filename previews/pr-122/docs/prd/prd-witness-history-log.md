# PRD: "Witness History" — Live Session Event Log 📜

## Overview

A scrolling terminal-style log panel appends a new entry every 15 seconds
while the visitor is on the page. Each entry timestamps the moment and
describes what has happened globally since the visitor arrived — phrased as a
visceral environmental equivalence. The log is exportable as plain text and
forms a shareable record of the visitor's session.

---

## Problem

Every second the user sits on the page, enormous numbers of tokens are
consumed globally — but once you've read the counter, nothing new accumulates
visually to make the passing time feel meaningful. The Witness History Log
turns passive time into a growing document, creating a narrative of the
session and a concrete reason not to close the tab ("one more entry and I'll
see how many MRI scans that is").

---

## Goals

- Increase average session time by making every 15 seconds produce something
  new and readable
- Give the "Share Your Doom" flow an additional textual artefact to share
- Reinforce environmental equivalences through repeated, time-indexed exposure

---

## Non-Goals

- Server-side persistence (localStorage is optional, v2)
- Real-time streaming from a backend
- Modifying the global counter

---

## Feature Description

### Log Panel

- **Placement:** New section `#event-log-section` on the Dashboard tab,
  positioned after the "AI Is Currently Generating…" ticker section
- **First entry:** appears 5 seconds after page load
- **Subsequent entries:** every 15 seconds
- **Max entries displayed:** 50 (oldest entries are removed from the DOM to
  avoid memory growth; the export button captures all entries that exist at
  the time of export)
- **Entry format:**
  ```
  [HH:MM:SS]  🏠  +X.XX Billion tokens since you arrived · powered N homes for a year
  ```
- Each entry cycles through a different equivalence category (energy, water,
  CO₂, novels, etc.) using the existing `generateEquivalences()` output

### Export Button

- Copies the full log as plain text to the clipboard
- Header includes session start time; footer includes site URL
- Button label: *📋 Copy Log* / *✅ Copied!* (2-second feedback)

### Auto-Scroll

- The panel auto-scrolls to the most recent entry when a new one is added
- User can manually scroll up to read earlier entries without interruption
  (autoscroll resumes on the next new entry unless the user is already at
  the bottom)

---

## Architecture Notes

| Layer | Change |
|-------|--------|
| `death-clock-core.js` | No changes needed — `generateEquivalences()` and `formatTokenCount()` already exported |
| `index.html` | Add `<section id="event-log-section">` with `<div id="event-log">` and export button |
| `script.js` | `initEventLog()` with `setTimeout` (first entry) + `setInterval` (recurring); `buildLogExportText()` |
| `styles.css` | `.event-log`, `.event-log-entry`, `.log-time`, `.log-icon`, `.log-text`, `.event-log-actions` |

---

## UX / Accessibility

- The log panel uses `aria-live="polite"` so screen readers announce new
  entries without interrupting other content
- Max-height + `overflow-y: auto` keeps the section compact
- Monospace font matches the terminal aesthetic of the rest of the page
- `prefers-reduced-motion`: entry slide-in animation is disabled; entries
  appear instantly
