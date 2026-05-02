#!/usr/bin/env bash
# deploy.sh — publishes a local directory to a GitHub Pages branch.
# Part of the gh-pages-deploy composite action.
#
# All configuration is read from environment variables (injection-safe).
# Never interpolate ${{ }} expressions directly into this script.
#
# Environment variables:
#   INPUT_GITHUB_TOKEN    — GitHub token for authenticating git push
#   INPUT_PUBLISH_BRANCH  — target branch (default: gh-pages)
#   INPUT_PUBLISH_DIR     — local source directory (default: public)
#   INPUT_DESTINATION_DIR — subdirectory within publish_branch (default: '')
#   INPUT_KEEP_FILES      — preserve existing files in destination (default: false)
#   INPUT_EXCLUDE_ASSETS  — newline/comma-separated paths to exclude via rsync
#   INPUT_USER_NAME       — git commit author name
#   INPUT_USER_EMAIL      — git commit author email
#   INPUT_COMMIT_MESSAGE  — commit message
#   INPUT_DISABLE_NOJEKYLL— if 'true', skip creating .nojekyll

set -euo pipefail

PUBLISH_BRANCH="${INPUT_PUBLISH_BRANCH:-gh-pages}"
PUBLISH_DIR="${INPUT_PUBLISH_DIR:-public}"
DESTINATION_DIR="${INPUT_DESTINATION_DIR:-}"
KEEP_FILES="${INPUT_KEEP_FILES:-false}"
USER_NAME="${INPUT_USER_NAME:-github-actions[bot]}"
USER_EMAIL="${INPUT_USER_EMAIL:-github-actions[bot]@users.noreply.github.com}"
COMMIT_MESSAGE="${INPUT_COMMIT_MESSAGE:-chore: deploy to ${PUBLISH_BRANCH}}"
DISABLE_NOJEKYLL="${INPUT_DISABLE_NOJEKYLL:-false}"
EXCLUDE_ASSETS="${INPUT_EXCLUDE_ASSETS:-.github}"

WORKTREE_DIR="$(mktemp -d)"

# Ensure the worktree is always removed on exit, even if the script fails midway.
cleanup() {
  git worktree remove --force "${WORKTREE_DIR}" 2>/dev/null || rm -rf "${WORKTREE_DIR}"
}
trap cleanup EXIT

git config user.name "${USER_NAME}"
git config user.email "${USER_EMAIL}"

# If a GitHub token is provided, configure the remote URL to use it so that
# git push works even when actions/checkout was not called with persist-credentials.
if [[ -n "${INPUT_GITHUB_TOKEN:-}" ]]; then
  REPO_URL=$(git remote get-url origin)
  # Convert SSH to HTTPS if needed (git@github.com:owner/repo.git → https://…)
  if [[ "${REPO_URL}" == git@github.com:* ]]; then
    REPO_URL="${REPO_URL/#git@github.com:/https://github.com/}"
  fi
  # Inject the token as credentials in the HTTPS URL
  AUTHED_URL="${REPO_URL/#https:\/\//https://x-access-token:${INPUT_GITHUB_TOKEN}@}"
  git remote set-url origin "${AUTHED_URL}"
  # Note: the SSH-to-HTTPS conversion above assumes the standard github.com SSH
  # URL format (git@github.com:owner/repo.git).  GitHub Enterprise instances with
  # custom hostnames will need to set an HTTPS origin URL before calling this action.
fi

# Fetch the existing publish branch (silently skip if it doesn't exist yet)
git fetch origin "${PUBLISH_BRANCH}:refs/remotes/origin/${PUBLISH_BRANCH}" 2>/dev/null || true

# Check out the publish branch into a separate worktree so we can update it
# without leaving the main checkout in a detached-HEAD state.
if git rev-parse --verify "refs/remotes/origin/${PUBLISH_BRANCH}" >/dev/null 2>&1; then
  git branch --force "${PUBLISH_BRANCH}" "refs/remotes/origin/${PUBLISH_BRANCH}"
  git worktree add "${WORKTREE_DIR}" "${PUBLISH_BRANCH}"
else
  # First-ever deploy: create an orphan branch
  git worktree add --orphan -b "${PUBLISH_BRANCH}" "${WORKTREE_DIR}"
fi

# Determine the destination path within the worktree
if [[ -n "${DESTINATION_DIR}" ]]; then
  DEST="${WORKTREE_DIR}/${DESTINATION_DIR}"
else
  DEST="${WORKTREE_DIR}"
fi

mkdir -p "${DEST}"

# When keep_files is false and deploying to a subdirectory, pre-clear the
# destination so deleted files don't linger before rsync runs.
if [[ "${KEEP_FILES}" != "true" && -n "${DESTINATION_DIR}" ]]; then
  # Suppress errors (|| true): a non-zero exit here means DEST is already empty
  # or a file is already gone — both are harmless.  Genuine failures (e.g.
  # permission errors on the runner) will surface at the rsync or git-add step.
  find "${DEST}" -mindepth 1 -delete 2>/dev/null || true
fi

# Build rsync --exclude flags from EXCLUDE_ASSETS.
# Supports both newline-separated and comma-separated values.
RSYNC_EXCLUDES=()
# Always protect the .git worktree reference file so rsync --delete never
# removes it (it only exists in DEST, not in PUBLISH_DIR, so without this
# exclude the --delete flag would wipe it and break subsequent git commands).
RSYNC_EXCLUDES+=("--exclude=.git")
# For root deploys with keep_files=false, protect previews/ so rsync --delete
# doesn't remove preview directories that live alongside the production content.
if [[ -z "${DESTINATION_DIR}" && "${KEEP_FILES}" != "true" ]]; then
  RSYNC_EXCLUDES+=("--exclude=previews/")
fi
while IFS= read -r item; do
  # Trim leading and trailing whitespace
  item="${item#"${item%%[![:space:]]*}"}"
  item="${item%"${item##*[![:space:]]}"}"
  [[ -n "${item}" ]] && RSYNC_EXCLUDES+=("--exclude=${item}")
done < <(printf '%s\n' "${EXCLUDE_ASSETS}" | tr ',' '\n')

# Sync source into destination.
# Pass --delete when keep_files is false so stale files are removed — for root
# deploys this is the only mechanism (the find-based clear above is skipped).
DELETE_FLAG=()
[[ "${KEEP_FILES}" != "true" ]] && DELETE_FLAG=("--delete")
rsync -a "${DELETE_FLAG[@]}" ${RSYNC_EXCLUDES[@]+"${RSYNC_EXCLUDES[@]}"} "${PUBLISH_DIR%/}/" "${DEST}/"

# Ensure Jekyll processing is disabled after rsync (so rsync --delete cannot
# remove it — we create it after the sync, not before).
if [[ "${DISABLE_NOJEKYLL}" != "true" ]]; then
  touch "${WORKTREE_DIR}/.nojekyll"
fi

cd "${WORKTREE_DIR}"
git add -A
if git diff --cached --quiet; then
  echo "Nothing to deploy — ${PUBLISH_BRANCH}${DESTINATION_DIR:+/${DESTINATION_DIR}} is already up to date"
else
  git commit -m "${COMMIT_MESSAGE}"
  git push origin "${PUBLISH_BRANCH}"
  echo "Deployed to ${PUBLISH_BRANCH}${DESTINATION_DIR:+/${DESTINATION_DIR}}"
fi

# Return to the main working directory so the EXIT trap's `git worktree remove`
# does not fail with "is the current directory" when the script exits.
cd -
