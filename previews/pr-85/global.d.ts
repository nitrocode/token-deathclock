// ============================================================
// Global type extensions for the browser dual-export pattern.
//
// death-clock-core.js, milestones-data.js, changelog-data.js,
// and project-stats-data.js each assign a property on `window`
// when loaded as classic <script> tags.  TypeScript needs these
// declarations to type-check the window-branch of the dual-export
// pattern in death-clock-core.js without errors.
// ============================================================

/** A single environmental-milestone entry from milestones.yaml */
interface Milestone {
  id: string;
  name: string;
  icon: string;
  tokens: number;
  shortDesc: string;
  description: string;
  consequence: string;
  followingEvent: string;
  color: string;
  darkColor: string;
  reference?: string;
  extinctionMarker?: boolean;
}

interface ChangelogSection {
  heading: string;
  items: string[];
}

interface ChangelogRelease {
  version: string;
  date: string | null;
  sections: ChangelogSection[];
}

// Extend the standard Window interface with the properties set by the
// auto-generated data modules and the core module itself.
interface Window {
  MilestonesData?: { MILESTONES: Milestone[] };
  /** The core module's exported API surface (plain-object namespace). */
  DeathClockCore?: Record<string, unknown>;
  ChangelogData?: { SITE_VERSION: string; CHANGELOG_RELEASES: ChangelogRelease[] };
  ProjectStatsData?: { PROJECT_PR_COUNT: number; PROJECT_TOTAL_TOKENS: number };
}
