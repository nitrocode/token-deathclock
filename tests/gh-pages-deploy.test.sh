#!/usr/bin/env bash
# tests/gh-pages-deploy.test.sh
#
# Unit tests for .github/actions/gh-pages-deploy/deploy.sh
#
# Tests create isolated temporary git repositories in /tmp so they never
# depend on the real repo's history and leave no side effects.
#
# Run with:  bash tests/gh-pages-deploy.test.sh

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="${REPO_ROOT}/.github/actions/gh-pages-deploy/deploy.sh"

PASS=0
FAIL=0

# Temporary directories created during a test — cleaned up by EXIT trap
TMPREMOTE=""
TMPWORK=""
TMPSRC=""

cleanup() {
  rm -rf "${TMPREMOTE:-}" "${TMPWORK:-}" "${TMPSRC:-}"
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

assert() {
  local desc="$1" expected="$2" actual="$3"
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

assert_contains() {
  local desc="$1" needle="$2" haystack="$3"
  if [[ "${haystack}" == *"${needle}"* ]]; then
    echo "  ✅  ${desc}"
    PASS=$((PASS + 1))
  else
    echo "  ❌  ${desc}"
    echo "       expected to contain : '${needle}'"
    echo "       in                  : '${haystack}'"
    FAIL=$((FAIL + 1))
  fi
}

assert_file_exists() {
  local desc="$1" path="$2"
  if [[ -f "${path}" ]]; then
    echo "  ✅  ${desc}"
    PASS=$((PASS + 1))
  else
    echo "  ❌  ${desc}: file not found: ${path}"
    FAIL=$((FAIL + 1))
  fi
}

assert_file_missing() {
  local desc="$1" path="$2"
  if [[ ! -f "${path}" ]]; then
    echo "  ✅  ${desc}"
    PASS=$((PASS + 1))
  else
    echo "  ❌  ${desc}: file unexpectedly exists: ${path}"
    FAIL=$((FAIL + 1))
  fi
}

# setup_repos — creates TMPREMOTE (bare), TMPWORK (working copy), TMPSRC (source dir).
# Adds a commit on main so the remote has a HEAD.
setup_repos() {
  TMPREMOTE=$(mktemp -d)
  TMPWORK=$(mktemp -d)
  TMPSRC=$(mktemp -d)

  git -C "${TMPREMOTE}" init --bare -q

  git -C "${TMPWORK}" init -q
  git -C "${TMPWORK}" remote add origin "${TMPREMOTE}"
  git -C "${TMPWORK}" config user.email "test@example.com"
  git -C "${TMPWORK}" config user.name "Test Bot"

  # Initial commit on main
  echo "source" > "${TMPWORK}/README.md"
  git -C "${TMPWORK}" add -A
  git -C "${TMPWORK}" commit -q -m "init"
  git -C "${TMPWORK}" push -q origin HEAD:main
}

# run_deploy [KEY=VAL ...] — runs deploy.sh inside TMPWORK with given env vars
run_deploy() {
  (
    cd "${TMPWORK}" || exit 1
    env \
      INPUT_GITHUB_TOKEN="" \
      INPUT_PUBLISH_BRANCH="gh-pages" \
      INPUT_PUBLISH_DIR="${TMPSRC}" \
      INPUT_DESTINATION_DIR="" \
      INPUT_KEEP_FILES="false" \
      INPUT_EXCLUDE_ASSETS=".github" \
      INPUT_USER_NAME="test-bot" \
      INPUT_USER_EMAIL="bot@test.com" \
      INPUT_COMMIT_MESSAGE="chore: deploy" \
      INPUT_DISABLE_NOJEKYLL="false" \
      "$@" \
      bash "${SCRIPT}"
  ) 2>/dev/null
}

# file_in_branch <branch> <path> — reads a file from the given branch via git show
file_in_branch() {
  local branch="$1" path="$2"
  git -C "${TMPWORK}" fetch -q origin "${branch}:${branch}" 2>/dev/null || true
  git -C "${TMPWORK}" show "${branch}:${path}" 2>/dev/null || echo "__MISSING__"
}

# list_branch_root <branch> — lists files at the root of the given branch
list_branch_root() {
  local branch="$1"
  git -C "${TMPWORK}" fetch -q origin "${branch}:${branch}" 2>/dev/null || true
  git -C "${TMPWORK}" ls-tree --name-only "${branch}" 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# Test: creates gh-pages branch and deploys files
# ---------------------------------------------------------------------------
echo ""
echo "=== gh-pages-deploy — new branch creation ==="
echo ""

setup_repos
echo "built index" > "${TMPSRC}/index.html"
echo "app code"    > "${TMPSRC}/app.js"

run_deploy

# Check that index.html landed in gh-pages
actual=$(file_in_branch "gh-pages" "index.html")
assert "index.html content is correct" "built index" "${actual}"

actual=$(file_in_branch "gh-pages" "app.js")
assert "app.js content is correct" "app code" "${actual}"

# ---------------------------------------------------------------------------
# Test: .nojekyll is created by default
# ---------------------------------------------------------------------------
echo ""
echo "=== gh-pages-deploy — .nojekyll ==="
echo ""

actual=$(file_in_branch "gh-pages" ".nojekyll")
assert "nojekyll: .nojekyll exists by default" "" "${actual}"

cleanup; setup_repos
echo "page" > "${TMPSRC}/index.html"
run_deploy INPUT_DISABLE_NOJEKYLL="true"

actual=$(list_branch_root "gh-pages")
if echo "${actual}" | grep -q "\.nojekyll"; then
  echo "  ❌  nojekyll: .nojekyll should not exist when disable_nojekyll=true"
  FAIL=$((FAIL + 1))
else
  echo "  ✅  nojekyll: .nojekyll absent when disable_nojekyll=true"
  PASS=$((PASS + 1))
fi

# ---------------------------------------------------------------------------
# Test: destination_dir deploys to subdirectory
# ---------------------------------------------------------------------------
echo ""
echo "=== gh-pages-deploy — destination_dir ==="
echo ""

cleanup; setup_repos

# First deploy to root so gh-pages branch exists
echo "root page" > "${TMPSRC}/root.html"
run_deploy

# Now deploy to a subdirectory
echo "preview page" > "${TMPSRC}/index.html"
run_deploy INPUT_DESTINATION_DIR="previews/pr-42"

actual=$(file_in_branch "gh-pages" "previews/pr-42/index.html")
assert "destination_dir: file in subdirectory" "preview page" "${actual}"

# Root file should still be present (worktree preserves other content)
actual=$(file_in_branch "gh-pages" "root.html")
assert "destination_dir: root files preserved" "root page" "${actual}"

# ---------------------------------------------------------------------------
# Test: keep_files=false with destination_dir clears stale files
# ---------------------------------------------------------------------------
echo ""
echo "=== gh-pages-deploy — keep_files=false clears destination_dir ==="
echo ""

# The previous test already deployed index.html to previews/pr-42.
# Now deploy ONLY new.html (no index.html) with keep_files=false.
cleanup; setup_repos

# Initial deploy to create gh-pages
echo "old file"  > "${TMPSRC}/stale.html"
echo "keep file" > "${TMPSRC}/keep.html"
run_deploy INPUT_DESTINATION_DIR="previews/pr-1"

# Second deploy with different source (stale.html gone, new.html added)
rm "${TMPSRC}/stale.html"
echo "new content" > "${TMPSRC}/new.html"
run_deploy INPUT_DESTINATION_DIR="previews/pr-1" INPUT_KEEP_FILES="false"

actual=$(file_in_branch "gh-pages" "previews/pr-1/new.html")
assert "keep_files=false: new file deployed" "new content" "${actual}"

actual=$(file_in_branch "gh-pages" "previews/pr-1/stale.html")
assert "keep_files=false: stale file removed" "__MISSING__" "${actual}"

# ---------------------------------------------------------------------------
# Test: keep_files=true with destination_dir preserves stale files
# ---------------------------------------------------------------------------
echo ""
echo "=== gh-pages-deploy — keep_files=true preserves destination_dir ==="
echo ""

cleanup; setup_repos

echo "existing file" > "${TMPSRC}/existing.html"
run_deploy INPUT_DESTINATION_DIR="previews/pr-2"

# Deploy new file without removing existing.html from source
echo "second file" > "${TMPSRC}/second.html"
run_deploy INPUT_DESTINATION_DIR="previews/pr-2" INPUT_KEEP_FILES="true"

actual=$(file_in_branch "gh-pages" "previews/pr-2/existing.html")
assert "keep_files=true: existing file preserved" "existing file" "${actual}"

actual=$(file_in_branch "gh-pages" "previews/pr-2/second.html")
assert "keep_files=true: new file added" "second file" "${actual}"

# ---------------------------------------------------------------------------
# Test: exclude_assets are not deployed
# ---------------------------------------------------------------------------
echo ""
echo "=== gh-pages-deploy — exclude_assets ==="
echo ""

cleanup; setup_repos

echo "site content"  > "${TMPSRC}/index.html"
mkdir -p "${TMPSRC}/node_modules"
echo "dep"           > "${TMPSRC}/node_modules/dep.js"
echo "secret"        > "${TMPSRC}/.env"

run_deploy INPUT_EXCLUDE_ASSETS="node_modules,.env"

actual=$(file_in_branch "gh-pages" "index.html")
assert "exclude_assets: index.html is deployed" "site content" "${actual}"

actual=$(file_in_branch "gh-pages" "node_modules/dep.js")
assert "exclude_assets: node_modules excluded" "__MISSING__" "${actual}"

actual=$(file_in_branch "gh-pages" ".env")
assert "exclude_assets: .env excluded" "__MISSING__" "${actual}"

# ---------------------------------------------------------------------------
# Test: newline-separated exclude_assets
# ---------------------------------------------------------------------------
echo ""
echo "=== gh-pages-deploy — exclude_assets (newline-separated) ==="
echo ""

cleanup; setup_repos

echo "page"   > "${TMPSRC}/page.html"
echo "secret" > "${TMPSRC}/secret.txt"

run_deploy INPUT_EXCLUDE_ASSETS="$(printf 'secret.txt\n.github')"

actual=$(file_in_branch "gh-pages" "page.html")
assert "newline excludes: page.html deployed" "page" "${actual}"

actual=$(file_in_branch "gh-pages" "secret.txt")
assert "newline excludes: secret.txt excluded" "__MISSING__" "${actual}"

# ---------------------------------------------------------------------------
# Test: no-op deploy when nothing changed
# ---------------------------------------------------------------------------
echo ""
echo "=== gh-pages-deploy — no-op when nothing changed ==="
echo ""

cleanup; setup_repos

echo "stable" > "${TMPSRC}/index.html"
run_deploy

# Get the commit count before second deploy
commit_count_before=$(git -C "${TMPWORK}" fetch -q origin gh-pages:gh-pages 2>/dev/null; \
  git -C "${TMPWORK}" rev-list --count gh-pages 2>/dev/null || echo "0")

# Deploy again with identical content
output=$(run_deploy 2>&1 || true)
commit_count_after=$(git -C "${TMPWORK}" fetch -q origin gh-pages:gh-pages 2>/dev/null; \
  git -C "${TMPWORK}" rev-list --count gh-pages 2>/dev/null || echo "0")

assert "no-op: commit count unchanged" "${commit_count_before}" "${commit_count_after}"
assert_contains "no-op: reports nothing to deploy" "Nothing to deploy" "${output}"

# ---------------------------------------------------------------------------
# Test: custom commit_message is used
# ---------------------------------------------------------------------------
echo ""
echo "=== gh-pages-deploy — custom commit_message ==="
echo ""

cleanup; setup_repos

echo "content" > "${TMPSRC}/index.html"
run_deploy INPUT_COMMIT_MESSAGE="feat: custom deploy message"

git -C "${TMPWORK}" fetch -q origin gh-pages:gh-pages 2>/dev/null
actual_msg=$(git -C "${TMPWORK}" log -1 --format="%s" gh-pages 2>/dev/null || echo "")
assert "commit_message: custom message used" "feat: custom deploy message" "${actual_msg}"

# ---------------------------------------------------------------------------
# Test: second deploy to existing branch (update path)
# ---------------------------------------------------------------------------
echo ""
echo "=== gh-pages-deploy — update existing branch ==="
echo ""

cleanup; setup_repos

echo "version one content" > "${TMPSRC}/index.html"
run_deploy

# Use content with a different size so rsync's quick-check (mtime+size) always
# detects the change, even when both writes happen within the same second.
echo "version two content — updated" > "${TMPSRC}/index.html"
run_deploy

actual=$(file_in_branch "gh-pages" "index.html")
assert "update: second deploy updates file" "version two content — updated" "${actual}"

# ---------------------------------------------------------------------------
# Test: root deploy with keep_files=false removes stale files
# ---------------------------------------------------------------------------
echo ""
echo "=== gh-pages-deploy — root deploy removes stale files ==="
echo ""

cleanup; setup_repos

# Initial root deploy with a file that will become stale
echo "stale content" > "${TMPSRC}/stale.html"
echo "keep content"  > "${TMPSRC}/keep.html"
run_deploy

# Second deploy without stale.html (keep_files defaults to false)
rm "${TMPSRC}/stale.html"
echo "new content" > "${TMPSRC}/new.html"
run_deploy

actual=$(file_in_branch "gh-pages" "new.html")
assert "root deploy keep_files=false: new file deployed" "new content" "${actual}"

actual=$(file_in_branch "gh-pages" "keep.html")
assert "root deploy keep_files=false: unchanged file kept" "keep content" "${actual}"

actual=$(file_in_branch "gh-pages" "stale.html")
assert "root deploy keep_files=false: stale file removed" "__MISSING__" "${actual}"

# ---------------------------------------------------------------------------
# Test: root deploy with keep_files=false preserves previews/ directory
# ---------------------------------------------------------------------------
echo ""
echo "=== gh-pages-deploy — root deploy preserves previews/ ==="
echo ""

# previews/ was created in the previous test setup via a subdirectory deploy
cleanup; setup_repos

# Step 1: root deploy to create the branch
echo "site version one" > "${TMPSRC}/index.html"
run_deploy

# Step 2: subdirectory deploy to simulate a preview
echo "preview content" > "${TMPSRC}/preview.html"
run_deploy INPUT_DESTINATION_DIR="previews/pr-99"

# Step 3: new root deploy — previews/ must NOT be wiped
rm "${TMPSRC}/preview.html"
# Use a different-length string so rsync's mtime+size quick-check detects the change
# even when both writes happen within the same second.
echo "site version two — updated" > "${TMPSRC}/index.html"
run_deploy

actual=$(file_in_branch "gh-pages" "index.html")
assert "root deploy preserves previews/: root file updated" "site version two — updated" "${actual}"

actual=$(file_in_branch "gh-pages" "previews/pr-99/preview.html")
assert "root deploy preserves previews/: previews/ directory preserved" "preview content" "${actual}"

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
