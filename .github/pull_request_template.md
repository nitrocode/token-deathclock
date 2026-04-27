<!--
  Pull request template for token-deathclock.
  AI agents: fill in every section. Do not delete headings.
  See docs/LEARNINGS.md for the full agent checklist and categorised learnings.
-->

## Summary

<!-- One paragraph: what problem does this PR solve and how? -->

## Changes

<!-- A checked-off list of every discrete change made. Add items as needed. -->

- [ ] <!-- change 1 -->
- [ ] <!-- change 2 -->

## Agent Checklist

<!-- Agents must verify every item before requesting review. -->

- [ ] `npm run test:ci` passes (all unit tests green, coverage not decreased)
- [ ] `npm run build && npm run test:e2e` passes (all E2E tests green)
- [ ] No generated files committed (`script.js`, `styles.css`, `*-data.js`)
- [ ] All dynamic `innerHTML` values pass through `escHtml()`
- [ ] No DOM references introduced in `death-clock-core.js`
- [ ] No new runtime npm packages added
- [ ] GitHub Actions `uses:` pins use a full commit SHA + inline semver comment
- [ ] PR title follows Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, etc.)
- [ ] `project-stats.yaml` updated if this session merges one or more PRs
- [ ] Relevant entry added to `docs/LEARNINGS.md` (new pattern or lesson learned)
