#!/usr/bin/env bash
# gitea-branch-protection.sh — Configure branch protection rules via Gitea API
# Usage: GITEA_TOKEN=<token> ORG=<org> REPO=nebula-dominion ./gitea-branch-protection.sh
set -euo pipefail

GITEA_URL="${GITEA_URL:-http://gitea.local:3000}"
GITEA_TOKEN="${GITEA_TOKEN:?Set GITEA_TOKEN}"
ORG="${ORG:?Set ORG}"
REPO="${REPO:-nebula-dominion}"

BASE="$GITEA_URL/api/v1"
AUTH="Authorization: token $GITEA_TOKEN"
CT="Content-Type: application/json"

api() {
  local method=$1 path=$2; shift 2
  curl -sS -X "$method" -H "$AUTH" -H "$CT" "${BASE}${path}" "$@"
}

protect() {
  local branch=$1 rule=$2
  echo "→ Protecting branch: $branch"
  api POST "/repos/${ORG}/${REPO}/branch_protections" -d "$rule"
  echo ""
}

# main — require 1 PR approval, block direct push, require CI to pass
protect "main" '{
  "branch_name": "main",
  "enable_push": false,
  "enable_push_whitelist": true,
  "push_whitelist_usernames": [],
  "push_whitelist_teams": [],
  "enable_merge_whitelist": false,
  "required_approvals": 1,
  "enable_approvals_whitelist": false,
  "block_on_rejected_reviews": true,
  "block_on_official_review_requests": true,
  "dismiss_stale_approvals": true,
  "require_signed_commits": false,
  "protected_file_patterns": "",
  "unprotected_file_patterns": "",
  "status_check_contexts": ["continuous-integration/drone"]
}'

# develop — 1 approval required, CI must pass
protect "develop" '{
  "branch_name": "develop",
  "enable_push": false,
  "enable_push_whitelist": true,
  "push_whitelist_usernames": [],
  "required_approvals": 1,
  "block_on_rejected_reviews": true,
  "dismiss_stale_approvals": true,
  "status_check_contexts": ["continuous-integration/drone"]
}'

echo "Branch protection rules applied."

# ── Webhook for Drone CI ───────────────────────────────────────────────────────
DRONE_URL="${DRONE_URL:-http://drone.local:8080}"
echo "→ Creating Gitea webhook → Drone CI ..."
api POST "/repos/${ORG}/${REPO}/hooks" -d "{
  \"type\": \"gitea\",
  \"active\": true,
  \"branch_filter\": \"*\",
  \"config\": {
    \"url\": \"${DRONE_URL}/hook\",
    \"content_type\": \"json\"
  },
  \"events\": [\"push\", \"pull_request\", \"create\", \"delete\"]
}"
echo ""
echo "Webhook created."
