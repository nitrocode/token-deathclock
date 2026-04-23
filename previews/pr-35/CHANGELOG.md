# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `.nvmrc` to pin Node.js version to 20 LTS (matching CI)
- `.editorconfig` for consistent editor formatting across contributors
- `"homepage"` field in `package.json` pointing to the live GitHub Pages site
- `CHANGELOG.md` to track releases going forward

## [1.0.0] - 2025-04-14

### Added
- Live global AI token counter anchored to `BASE_DATE_ISO` (not page-load time)
- Session counter showing tokens consumed since the page was opened
- 7 environmental milestone cards (trees → bees → water → coral → glaciers → ocean → extinction)
- Chart.js growth chart with 18-month log-scale projection
- Predictions table with estimated dates for each milestone
- Dark / light theme toggle (dark default)
- Prompt & PR scoring section with collapsible rubric
- Jest test suite with 75 tests and ≥ 80 % coverage thresholds
- GitHub Actions CI workflow (`test.yml`) running on every push and PR
- GitHub Actions deploy workflow (`deploy.yml`) publishing to GitHub Pages on merge to `main`
- `AGENTS.md` with architecture rules and contributor guidance
