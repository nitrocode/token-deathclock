#!/usr/bin/env bash
# tests/detect-changes.test.sh
#
# Unit tests for .github/scripts/detect-changes.sh
#
# Run with:  bash tests/detect-changes.test.sh
#
# Tests are self-contained: git-based cases create an isolated temporary
# repository in /tmp so they never depend on the real repo's history.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="${REPO_ROOT}/.github/scripts/detect-changes.sh"

PASS=0
FAIL=0
TMPGIT=""

# Ensure the temp git repo is always cleaned up, even on unexpected exit.
trap 'rm -rf "${TMPGIT:-}"' EXIT

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# assert_output <description> <expected> <tmpout-path>
assert_output() {
  local desc="$1" expected="$2" tmpout="$3"
  local actual
  actual=$(grep '^code=' "${tmpout}" 2>/dev/null | tail -1 | cut -d= -f2 || true)
  if [[ "${actual}" == "${expected}" ]]; then
    echo "  ✅  ${desc}"
    PASS=$((PASS + 1))
  else
    echo "  ❌  ${desc}"
    echo "       expected : '${expected}'"
    echo "       got      : '${actual}'"
    FAIL=$((FAIL + 1))
  fi
}

# run_script <tmpout-path> <dir> [KEY=VAL …]
# Runs detect-changes.sh in <dir> with the given env vars plus GITHUB_OUTPUT.
run_script() {
  local tmpout="$1" dir="$2"
  shift 2
  (cd "${dir}" && env "$@" GITHUB_OUTPUT="${tmpout}" bash "${SCRIPT}") 2>/dev/null || true
}

# make_git_repo — creates a temp git repo and sets TMPGIT to its path
make_git_repo() {
  TMPGIT=$(mktemp -d)
  git -C "${TMPGIT}" init -q
  git -C "${TMPGIT}" config user.email "test@example.com"
  git -C "${TMPGIT}" config user.name "Test"
}

# git_commit <repo-path> <message> [file content pairs …]
# Creates or updates files then commits.  Pairs: path content
git_commit() {
  local repo="$1" msg="$2"
  shift 2
  while [[ $# -ge 2 ]]; do
    local path="$1" content="$2"
    shift 2
    mkdir -p "${repo}/$(dirname "${path}")"
    printf '%s\n' "${content}" > "${repo}/${path}"
  done
  git -C "${repo}" add -A
  git -C "${repo}" commit -qm "${msg}"
}

# ---------------------------------------------------------------------------
# Early-exit tests (no git diff needed)
# ---------------------------------------------------------------------------

echo ""
echo "=== detect-changes.sh — early-exit (no diff) ==="
echo ""

tmpout=$(mktemp)

# 1. Empty BASE — push event with missing GH_PUSH_BEFORE
run_script "${tmpout}" "${REPO_ROOT}" \
  GH_EVENT_NAME="push" GH_PUSH_BEFORE="" \
  GH_SHA="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" \
  GH_PR_BASE_SHA="" GH_MERGE_BASE_SHA=""
assert_output "push: empty BASE → code=true" "true" "${tmpout}"
: > "${tmpout}"

# 2. All-zeros BASE — first push on a new branch
run_script "${tmpout}" "${REPO_ROOT}" \
  GH_EVENT_NAME="push" \
  GH_PUSH_BEFORE="0000000000000000000000000000000000000000" \
  GH_SHA="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" \
  GH_PR_BASE_SHA="" GH_MERGE_BASE_SHA=""
assert_output "push: all-zeros BASE (new branch) → code=true" "true" "${tmpout}"
: > "${tmpout}"

# 3. Unexpected event_name with no resolvable SHAs → safe fallback
run_script "${tmpout}" "${REPO_ROOT}" \
  GH_EVENT_NAME="workflow_dispatch" \
  GH_PR_BASE_SHA="" GH_PUSH_BEFORE="" GH_MERGE_BASE_SHA="" \
  GH_SHA="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
assert_output "unknown event + empty SHA → code=true" "true" "${tmpout}"
: > "${tmpout}"

rm -f "${tmpout}"

# ---------------------------------------------------------------------------
# Git diff tests — pull_request event
# ---------------------------------------------------------------------------

echo ""
echo "=== detect-changes.sh — pull_request events ==="
echo ""

make_git_repo

# BASE commit — only a README
git_commit "${TMPGIT}" "init" "README.md" "initial"
BASE_SHA=$(git -C "${TMPGIT}" rev-parse HEAD)

# HEAD A — adds a .js file
git_commit "${TMPGIT}" "add js" "app.js" "console.log('hi')"
HEAD_JS=$(git -C "${TMPGIT}" rev-parse HEAD)

# HEAD B — adds a .ts file (built on HEAD_JS)
git_commit "${TMPGIT}" "add ts" "lib.ts" "export const x = 1"
HEAD_TS=$(git -C "${TMPGIT}" rev-parse HEAD)

# HEAD C — adds a .css file
git_commit "${TMPGIT}" "add css" "style.css" "body{}"
HEAD_CSS=$(git -C "${TMPGIT}" rev-parse HEAD)

# HEAD D — changes tests/
git_commit "${TMPGIT}" "add test" "tests/foo.test.js" "test('x',()=>{})"
HEAD_TESTS=$(git -C "${TMPGIT}" rev-parse HEAD)

# HEAD E — changes package.json
git_commit "${TMPGIT}" "pkg" "package.json" '{"name":"x"}'
HEAD_PKG=$(git -C "${TMPGIT}" rev-parse HEAD)

# HEAD F — changes package-lock.json
git_commit "${TMPGIT}" "lock" "package-lock.json" '{"lockfileVersion":3}'
HEAD_LOCK=$(git -C "${TMPGIT}" rev-parse HEAD)

# HEAD G — only a docs change (irrelevant)
git_commit "${TMPGIT}" "docs" "README.md" "updated"
HEAD_DOCS=$(git -C "${TMPGIT}" rev-parse HEAD)

# HEAD H — only a YAML change (irrelevant)
git_commit "${TMPGIT}" "yaml" "config.yaml" "key: value"
HEAD_YAML=$(git -C "${TMPGIT}" rev-parse HEAD)

tmpout=$(mktemp)

run_script "${tmpout}" "${TMPGIT}" \
  GH_EVENT_NAME="pull_request" GH_PR_BASE_SHA="${BASE_SHA}" GH_SHA="${HEAD_JS}" \
  GH_PUSH_BEFORE="" GH_MERGE_BASE_SHA=""
assert_output "pull_request: .js change → code=true" "true" "${tmpout}"; : > "${tmpout}"

run_script "${tmpout}" "${TMPGIT}" \
  GH_EVENT_NAME="pull_request" GH_PR_BASE_SHA="${HEAD_JS}" GH_SHA="${HEAD_TS}" \
  GH_PUSH_BEFORE="" GH_MERGE_BASE_SHA=""
assert_output "pull_request: .ts change → code=true" "true" "${tmpout}"; : > "${tmpout}"

run_script "${tmpout}" "${TMPGIT}" \
  GH_EVENT_NAME="pull_request" GH_PR_BASE_SHA="${HEAD_TS}" GH_SHA="${HEAD_CSS}" \
  GH_PUSH_BEFORE="" GH_MERGE_BASE_SHA=""
assert_output "pull_request: .css change → code=true" "true" "${tmpout}"; : > "${tmpout}"

run_script "${tmpout}" "${TMPGIT}" \
  GH_EVENT_NAME="pull_request" GH_PR_BASE_SHA="${HEAD_CSS}" GH_SHA="${HEAD_TESTS}" \
  GH_PUSH_BEFORE="" GH_MERGE_BASE_SHA=""
assert_output "pull_request: tests/ change → code=true" "true" "${tmpout}"; : > "${tmpout}"

run_script "${tmpout}" "${TMPGIT}" \
  GH_EVENT_NAME="pull_request" GH_PR_BASE_SHA="${HEAD_TESTS}" GH_SHA="${HEAD_PKG}" \
  GH_PUSH_BEFORE="" GH_MERGE_BASE_SHA=""
assert_output "pull_request: package.json change → code=true" "true" "${tmpout}"; : > "${tmpout}"

run_script "${tmpout}" "${TMPGIT}" \
  GH_EVENT_NAME="pull_request" GH_PR_BASE_SHA="${HEAD_PKG}" GH_SHA="${HEAD_LOCK}" \
  GH_PUSH_BEFORE="" GH_MERGE_BASE_SHA=""
assert_output "pull_request: package-lock.json change → code=true" "true" "${tmpout}"; : > "${tmpout}"

run_script "${tmpout}" "${TMPGIT}" \
  GH_EVENT_NAME="pull_request" GH_PR_BASE_SHA="${HEAD_LOCK}" GH_SHA="${HEAD_DOCS}" \
  GH_PUSH_BEFORE="" GH_MERGE_BASE_SHA=""
assert_output "pull_request: only README change → code=false" "false" "${tmpout}"; : > "${tmpout}"

run_script "${tmpout}" "${TMPGIT}" \
  GH_EVENT_NAME="pull_request" GH_PR_BASE_SHA="${HEAD_DOCS}" GH_SHA="${HEAD_YAML}" \
  GH_PUSH_BEFORE="" GH_MERGE_BASE_SHA=""
assert_output "pull_request: only .yaml change → code=false" "false" "${tmpout}"; : > "${tmpout}"

# ---------------------------------------------------------------------------
# Push event — uses GH_PUSH_BEFORE (not GH_PR_BASE_SHA)
# ---------------------------------------------------------------------------

echo ""
echo "=== detect-changes.sh — push events ==="
echo ""

run_script "${tmpout}" "${TMPGIT}" \
  GH_EVENT_NAME="push" GH_PUSH_BEFORE="${BASE_SHA}" GH_SHA="${HEAD_JS}" \
  GH_PR_BASE_SHA="" GH_MERGE_BASE_SHA=""
assert_output "push: .js change via GH_PUSH_BEFORE → code=true" "true" "${tmpout}"; : > "${tmpout}"

run_script "${tmpout}" "${TMPGIT}" \
  GH_EVENT_NAME="push" GH_PUSH_BEFORE="${HEAD_DOCS}" GH_SHA="${HEAD_YAML}" \
  GH_PR_BASE_SHA="" GH_MERGE_BASE_SHA=""
assert_output "push: only .yaml change via GH_PUSH_BEFORE → code=false" "false" "${tmpout}"; : > "${tmpout}"

# GH_PR_BASE_SHA is ignored for push events — if we set it to something that
# WOULD trigger code=true, but it should NOT because the event is "push".
git_commit "${TMPGIT}" "another readme" "README.md" "again"
HEAD_EXTRA=$(git -C "${TMPGIT}" rev-parse HEAD)

run_script "${tmpout}" "${TMPGIT}" \
  GH_EVENT_NAME="push" \
  GH_PUSH_BEFORE="${HEAD_YAML}" GH_SHA="${HEAD_EXTRA}" \
  GH_PR_BASE_SHA="${BASE_SHA}" GH_MERGE_BASE_SHA=""
assert_output "push: ignores GH_PR_BASE_SHA (only README changed) → code=false" "false" "${tmpout}"; : > "${tmpout}"

# ---------------------------------------------------------------------------
# merge_group event — uses GH_MERGE_BASE_SHA
# ---------------------------------------------------------------------------

echo ""
echo "=== detect-changes.sh — merge_group events ==="
echo ""

run_script "${tmpout}" "${TMPGIT}" \
  GH_EVENT_NAME="merge_group" GH_MERGE_BASE_SHA="${BASE_SHA}" GH_SHA="${HEAD_JS}" \
  GH_PR_BASE_SHA="" GH_PUSH_BEFORE=""
assert_output "merge_group: .js change → code=true" "true" "${tmpout}"; : > "${tmpout}"

run_script "${tmpout}" "${TMPGIT}" \
  GH_EVENT_NAME="merge_group" GH_MERGE_BASE_SHA="${HEAD_DOCS}" GH_SHA="${HEAD_YAML}" \
  GH_PR_BASE_SHA="" GH_PUSH_BEFORE=""
assert_output "merge_group: only .yaml change → code=false" "false" "${tmpout}"; : > "${tmpout}"

# merge_group ignores GH_PR_BASE_SHA and GH_PUSH_BEFORE
run_script "${tmpout}" "${TMPGIT}" \
  GH_EVENT_NAME="merge_group" \
  GH_MERGE_BASE_SHA="${HEAD_EXTRA}" GH_SHA="${HEAD_EXTRA}" \
  GH_PR_BASE_SHA="${BASE_SHA}" GH_PUSH_BEFORE="${BASE_SHA}"
assert_output "merge_group: ignores PR/push SHAs (no diff HEAD..HEAD) → code=false" "false" "${tmpout}"; : > "${tmpout}"

# ---------------------------------------------------------------------------
# Injection safety test — malformed BASE does not execute arbitrary code
# ---------------------------------------------------------------------------

echo ""
echo "=== detect-changes.sh — injection safety ==="
echo ""

INJECTION_MARKER_FILE="/tmp/detect-changes-injection-$$"
rm -f "${INJECTION_MARKER_FILE}"

# Craft a value that contains an unescaped command substitution pattern.
# The \$ below prevents the TEST SCRIPT from expanding the $(…) — it is NOT
# a backslash that ends up in the payload.  The actual value stored in
# INJECTION_PAYLOAD is the literal string "$(touch /tmp/...)" (no backslash),
# which is a real command substitution pattern.  When passed to the script via
# an env var, bash uses it as a literal argument to git ("${BASE}" is properly
# quoted) so the command substitution is never evaluated.
INJECTION_PAYLOAD="\$(touch ${INJECTION_MARKER_FILE})"

# Run the script; it is expected to exit non-zero (invalid git ref) — || true so
# the test script itself doesn't abort.
run_script "${tmpout}" "${TMPGIT}" \
  GH_EVENT_NAME="push" \
  GH_PUSH_BEFORE="${INJECTION_PAYLOAD}" \
  GH_SHA="${HEAD_JS}" \
  GH_PR_BASE_SHA="" GH_MERGE_BASE_SHA=""

# 1. The injected command must NOT have run.
if [[ ! -f "${INJECTION_MARKER_FILE}" ]]; then
  echo "  ✅  injection: command was not executed"
  PASS=$((PASS + 1))
else
  echo "  ❌  injection: marker file was created — injection succeeded!"
  FAIL=$((FAIL + 1))
  rm -f "${INJECTION_MARKER_FILE}"
fi

# 2. The output file must contain code=true (safe fallback when git ref is unresolvable).
actual_code=$(grep '^code=' "${tmpout}" 2>/dev/null | tail -1 | cut -d= -f2 || true)
if [[ "${actual_code}" == "true" ]]; then
  echo "  ✅  injection: safe fallback code=true written (CI not silently skipped)"
  PASS=$((PASS + 1))
else
  echo "  ❌  injection: expected code=true safe fallback, got '${actual_code}'"
  FAIL=$((FAIL + 1))
fi
: > "${tmpout}"

rm -f "${tmpout}"
rm -rf "${TMPGIT}"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo ""
echo "======================================="
echo "Results: ${PASS} passed, ${FAIL} failed"
echo "======================================="
echo ""

if [[ ${FAIL} -gt 0 ]]; then
  exit 1
fi
