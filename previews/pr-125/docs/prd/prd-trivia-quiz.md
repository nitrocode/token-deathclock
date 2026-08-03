# PRD: AI Environmental Trivia Quiz 🎓

## Overview

A collapsible quiz section on the Dashboard tab presents 12 rotating
multiple-choice questions about AI's environmental impact. Correct answers
reveal a contextual fact tied to the live token counter (*"That's the same as
X tokens consumed while you answered"*). A score of ≥ 8/12 unlocks the
**Carbon-Aware Nerd 🎓** badge. Questions rotate daily so repeat visitors
encounter a fresh set.

---

## Problem

The site communicates its message through live numbers and milestone
descriptions, but this is a passive experience. Users who read quickly tend
to bounce — there is no mechanism that tests comprehension, triggers the
curiosity gap, or forces active engagement with the material. A short quiz
achieves all three while reinforcing the core facts.

---

## Goals

- Add 3–5 minutes of active, educational session time
- Improve recall of key environmental facts through active retrieval
- Reward learning with a badge (drives repeat play for score improvement)

---

## Non-Goals

- Server-side score storage or leaderboards
- Timed quiz mode (v2)
- User-submitted questions

---

## Feature Description

### Question Bank

12 questions embedded as a constant array in `death-clock-core.js`:

| # | Sample Question | Correct Answer |
|---|---|---|
| 1 | Which consumes more cumulative energy: training GPT-4 once, or running global AI inference for a week? | Inference (a week) |
| 2 | How much water does generating 1 million tokens consume (estimated)? | ~500 L |
| 3 | At 100 M tokens/sec, how many tokens are generated during a typical 3-minute shower? | ~18 billion |
| 4 | What percentage of global electricity consumption is projected to be used by data centres by 2030? | ~10% |
| 5 | Which action saves the most tokens per user session? | Caching repeated queries |
| (12 total in code) | | |

### Daily Rotation

- Questions are shuffled using a daily seed (same logic as `getSessionChallenges()`)
- Each quiz session presents 8 questions drawn from the pool of 12
- The set changes each UTC day, so returning visitors get a mostly fresh quiz

### Answer Reveal

- On answering, the correct option is highlighted green; incorrect options are
  dimmed
- A contextual fact appears below the question: *"While you answered this
  question, AI generated approximately [X tokens] globally."*

### Scoring & Badge

- After the 8th question, a results card shows the score (e.g. 6/8)
- Score ≥ 6/8 (75%) awards the **Carbon-Aware Nerd** badge:
  - ID: `carbon_nerd`
  - Icon: 🎓
  - Name: *Carbon-Aware Nerd*
  - Description: *"Aced the AI environmental impact quiz."*
- A "Retake Quiz" button lets users try for a better score (same daily set)
- A share button generates text: *"I scored [N]/8 on the AI environmental
  impact quiz. Can you beat it? → [URL]"*

---

## Architecture Notes

| Layer | Change |
|-------|--------|
| `death-clock-core.js` | Add `QUIZ_QUESTIONS` array constant; add `getQuizQuestions(seedMs)` function that returns 8 from pool using daily seed |
| `index.html` | New `<section id="quiz-section">` with toggle button and quiz container |
| `script.js` | `initQuiz()`, `renderQuiz()`, `handleAnswer()`, `showQuizResults()` |
| `styles.css` | `.quiz-question`, `.quiz-option`, `.quiz-option.correct`, `.quiz-option.wrong`, `.quiz-results` |

---

## UX / Accessibility

- Each question is a `<fieldset>` with `<legend>` and radio-button–style
  answer options (keyboard navigable)
- Correct/incorrect state indicated by colour and `aria-label` update
- Quiz is inside a `details`/`summary`-style collapsible section so it
  doesn't dominate the page for returning visitors who skip it
- `prefers-reduced-motion`: colour-change only, no slide animations
