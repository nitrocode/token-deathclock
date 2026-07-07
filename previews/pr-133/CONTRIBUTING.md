# Contributing to AI Death Clock

Thank you for your interest in contributing! Please read this guide before opening a pull request.

---

## Getting Started

1. Fork the repository and create a feature branch from `main`.
2. Install dev dependencies: `npm ci`
3. Run tests before making changes to establish a baseline: `npm test`

---

## Coding Conventions

| Rule | Detail |
|------|--------|
| **Core / DOM split** | `death-clock-core.js` must never reference the DOM. All DOM work goes in `script.js`. |
| **No runtime dependencies** | Do not add npm runtime packages. The site must remain fully static. |
| **CommonJS + browser export** | `death-clock-core.js` exports via `module.exports` for Jest and `window.DeathClockCore` for the browser. Keep both in sync. |
| **HTML escaping** | All dynamic strings rendered into `innerHTML` must pass through `escHtml()`. Never assign untrusted data directly to `innerHTML`. |
| **Constants consistency** | When updating `BASE_TOKENS`, `TOKENS_PER_SECOND`, or `BASE_DATE_ISO`, always update all three together with a comment citing the source. |
| **Tests for new functions** | Every new pure function added to `death-clock-core.js` must have corresponding unit tests in `tests/death-clock.test.js`. |

---

## Pull Request Checklist

Before requesting a review, confirm all of the following:

- [ ] Tests pass locally: `npm run test:ci`
- [ ] Coverage has not dropped below the thresholds (80 % lines/functions, 70 % branches)
- [ ] No DOM references introduced in `death-clock-core.js`
- [ ] No new runtime npm packages added
- [ ] All dynamic `innerHTML` values are escaped through `escHtml()`
- [ ] If data constants were changed, all three (`BASE_TOKENS`, `TOKENS_PER_SECOND`, `BASE_DATE_ISO`) were updated together with a source comment
- [ ] New pure functions are exported from `DeathClockCore` and imported in `script.js`
- [ ] Commit messages are concise and descriptive

---

## Running Tests

```bash
npm ci               # install dev dependencies
npm test             # jest --coverage (interactive)
npm run test:ci      # jest --ci --coverage (strict; fails on coverage drop)
```

---

## Reporting Bugs

Open a GitHub Issue with:
- A clear title and description
- Steps to reproduce
- Expected vs. actual behaviour
- Browser and OS version if relevant

---

## Questions

Open a GitHub Discussion or an Issue tagged `question`.
