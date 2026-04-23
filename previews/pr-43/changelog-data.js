'use strict';
// AUTO-GENERATED from CHANGELOG.md — do not edit directly.
// Run `npm run build:changelog` to regenerate from CHANGELOG.md.

const SITE_VERSION = "1.0.0";

const CHANGELOG_RELEASES = [
  {
    version: "Unreleased",
    date: null,
    sections: [
      { heading: "Added", items: [
        "`.nvmrc` to pin Node.js version to 20 LTS (matching CI)",
        "`.editorconfig` for consistent editor formatting across contributors",
        "`\"homepage\"` field in `package.json` pointing to the live GitHub Pages site",
        "`CHANGELOG.md` to track releases going forward",
      ] }
    ],
  },
  {
    version: "1.0.0",
    date: "2025-04-14",
    sections: [
      { heading: "Added", items: [
        "Live global AI token counter anchored to `BASE_DATE_ISO` (not page-load time)",
        "Session counter showing tokens consumed since the page was opened",
        "7 environmental milestone cards (trees → bees → water → coral → glaciers → ocean → extinction)",
        "Chart.js growth chart with 18-month log-scale projection",
        "Predictions table with estimated dates for each milestone",
        "Dark / light theme toggle (dark default)",
        "Prompt & PR scoring section with collapsible rubric",
        "Jest test suite with 75 tests and ≥ 80 % coverage thresholds",
        "GitHub Actions CI workflow (`test.yml`) running on every push and PR",
        "GitHub Actions deploy workflow (`deploy.yml`) publishing to GitHub Pages on merge to `main`",
        "`AGENTS.md` with architecture rules and contributor guidance",
      ] }
    ],
  },
];

/* istanbul ignore next */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SITE_VERSION, CHANGELOG_RELEASES };
} else if (typeof window !== 'undefined') {
  window.ChangelogData = { SITE_VERSION, CHANGELOG_RELEASES };
}
