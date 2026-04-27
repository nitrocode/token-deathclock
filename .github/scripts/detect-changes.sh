#!/usr/bin/env bash
# detect-changes.sh — determines whether relevant source files changed between BASE and HEAD.
#
# All GitHub context is read from environment variables (never interpolated from
# ${{ }} expressions inside a run: block) so the script is immune to
# GitHub Actions expression injection.
#
# Inputs via environment variables:
#   GH_EVENT_NAME     — github.event_name from the calling workflow
#   GH_PR_BASE_SHA    — github.event.pull_request.base.sha  (for pull_request events)
#   GH_PUSH_BEFORE    — github.event.before                 (for push events)
#   GH_MERGE_BASE_SHA — github.event.merge_group.base_sha   (for merge_group events)
#   GH_SHA            — github.sha (HEAD commit)
#   GITHUB_OUTPUT     — output file path (set automatically by the GitHub Actions runner)
#
# Output written to $GITHUB_OUTPUT:
#   code=true   relevant source files changed — proceed with tests / CI
#   code=false  no relevant changes detected — skip tests / CI

set -euo pipefail

case "${GH_EVENT_NAME}" in
  pull_request) BASE="${GH_PR_BASE_SHA}" ;;
  push)         BASE="${GH_PUSH_BEFORE}" ;;
  *)            BASE="${GH_MERGE_BASE_SHA:-}" ;;
esac

# An empty or all-zeros SHA means there is no prior commit to compare against
# (e.g. first push on a brand-new branch).  Treat as "changed" so CI always runs.
if [[ -z "${BASE}" || "${BASE}" == "0000000000000000000000000000000000000000" ]]; then
  echo "code=true" >> "${GITHUB_OUTPUT}"
  exit 0
fi

# Capture the changed file list.  If git fails (e.g. the ref is unknown or was
# tampered with) log the error and fall back to code=true so CI is never silently
# skipped.
diff_files=$(git diff --name-only "${BASE}" "${GH_SHA}") || {
  echo "detect-changes: git diff failed for BASE '${BASE}' — defaulting to code=true" >&2
  echo "code=true" >> "${GITHUB_OUTPUT}"
  exit 0
}

if echo "${diff_files}" | grep -qE '\.(js|ts|css)$|^tests/|^package[^/]*\.json$'; then
  echo "code=true" >> "${GITHUB_OUTPUT}"
else
  echo "code=false" >> "${GITHUB_OUTPUT}"
fi

