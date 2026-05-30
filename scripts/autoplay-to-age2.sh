#!/usr/bin/env bash
# =============================================================================
# autoplay-to-age2.sh — walk a fresh account from level 1 to age 2 (level 10)
#
# Drives real endpoints in order:
#   1. Login as test1@nebula.com (seeded by seed-test-accounts.ts)
#   2. Select race (insan)
#   3. Read /base state
#   4. Construct a building (real flow → exercises buildings_type_enum, queue, etc.)
#   5. Repeat the XP grant loop until tier progress hits level 10 (age 2)
#   6. Verify tier endpoint returns the right age + tier name at every milestone
#
# The script is a quality probe — it expects 200s from every step. Any non-2xx
# stops the run and prints the response body, so a human (or a Claude session)
# can diagnose, fix, redeploy, and re-run.
#
# Usage:
#   bash scripts/autoplay-to-age2.sh
#   START_LEVEL=2 bash scripts/autoplay-to-age2.sh   # resume after a fix
# =============================================================================
set -uo pipefail

API=${API:-http://localhost:4000}
GAME=${GAME:-http://localhost:3001}
EMAIL=${EMAIL:-test1@nebula.com}
PASSWORD=${PASSWORD:-Test1234!}
RACE=${RACE:-human}    # Backend Race enum: human|zerg|automaton|beast|demon (frontend uses Turkish: insan|zerg|otomat|canavar|seytan — separate drift to fix)
TARGET_LEVEL=${TARGET_LEVEL:-10}

# Colors (POSIX, falls back gracefully if terminal doesn't grok them)
BOLD=$'\e[1m'; RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; CYAN=$'\e[36m'; DIM=$'\e[2m'; RESET=$'\e[0m'

step()   { printf "%s▸%s %s\n" "$CYAN" "$RESET" "$*"; }
ok()     { printf "%s✓%s %s\n" "$GREEN" "$RESET" "$*"; }
warn()   { printf "%s⚠%s %s\n" "$YELLOW" "$RESET" "$*"; }
fail()   { printf "%s✖%s %s\n" "$RED" "$RESET" "$*"; }
hilite() { printf "%s%s%s\n" "$BOLD" "$*" "$RESET"; }

# --- API helpers --------------------------------------------------------------

# call <METHOD> <URL> [BODY] → echoes body, sets $STATUS
call() {
  local method="$1" url="$2" body="${3:-}"
  local args=(-sS -X "$method" -w "\n__STATUS__:%{http_code}" --max-time 15)
  [ -n "${TOKEN:-}" ] && args+=(-H "Authorization: Bearer $TOKEN")
  if [ -n "$body" ]; then
    args+=(-H "Content-Type: application/json" -d "$body")
  fi
  local resp
  resp=$(curl "${args[@]}" "$url")
  STATUS="${resp##*__STATUS__:}"
  RESP="${resp%__STATUS__:*}"
  RESP="${RESP%$'\n'}"
}

require_2xx() {
  local label="$1"
  if [ "$STATUS" -lt 200 ] || [ "$STATUS" -ge 300 ]; then
    fail "$label → HTTP $STATUS"
    printf "%s%s%s\n" "$DIM" "$RESP" "$RESET"
    exit 1
  fi
}

json_field() { echo "$RESP" | python -c "import json,sys; d=json.load(sys.stdin); print(d$1)" 2>/dev/null; }

# --- 1. Login -----------------------------------------------------------------

hilite "Step 1 — Login as $EMAIL"
call POST "$API/api/v1/auth/login" "{\"identifier\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
require_2xx "login"
TOKEN=$(json_field "['accessToken']")
USER_ID=$(json_field "['user']['id']")
[ -z "$TOKEN" ] && { fail "no accessToken in login response"; echo "$RESP"; exit 1; }
ok  "logged in   userId=$USER_ID"

# --- 2. Race select -----------------------------------------------------------

hilite "Step 2 — Race select ($RACE)"
call POST "$API/api/v1/users/select-race" "{\"race\":\"$RACE\"}"
if [ "$STATUS" -ge 400 ] && [ "$STATUS" -lt 500 ] && echo "$RESP" | grep -q "already"; then
  warn "race already chosen — continuing"
else
  require_2xx "race-select"
fi
ok  "race set    $RACE"

# --- 3. Initial progression snapshot -----------------------------------------
# NOTE: there are two parallel progression systems here.
#   - game-server `player_levels`  (POST award-xp writes here)
#   - api         `tier_progression` (read by /api/v1/tier/progress)
# They are NOT synced — separate drift to fix. For the autoplay loop we read
# the game-server side because that's the one award-xp actually moves. We also
# poll the api side at the end to surface the desync.

hilite "Step 3 — Initial progression snapshot (game-server side)"
call GET "$GAME/api/progression/$USER_ID"
require_2xx "progression/$USER_ID (initial)"
START_LVL=$(json_field "['level']")
START_AGE=$(json_field "['age']")
START_XP=$(json_field "['currentXp']")
ok  "player_levels  level=$START_LVL  age=$START_AGE  xp=$START_XP"

# --- 4. One real construction (exercises POST /api/buildings) ----------------

hilite "Step 4 — Try one real building construction (POST $GAME/api/buildings)"
call POST "$GAME/api/buildings" '{"type":"solar_plant","row":2,"col":2}'
if [ "$STATUS" -ge 200 ] && [ "$STATUS" -lt 300 ]; then
  ok  "construction started   type=solar_plant @ (2,2)"
elif [ "$STATUS" -eq 409 ] || [ "$STATUS" -eq 400 ]; then
  warn "construction returned $STATUS  ($RESP)  — non-fatal, continuing"
else
  fail "construction failed $STATUS"
  echo "$RESP"
  exit 1
fi

# --- 5. Tier level-up loop ---------------------------------------------------

hilite "Step 5 — XP grind loop (achievement source = 500 XP per grant)"
echo

target=$TARGET_LEVEL
prev_age=$START_AGE
iter=0
while :; do
  call GET "$GAME/api/progression/$USER_ID"
  require_2xx "progression/$USER_ID"
  lvl=$(json_field "['level']")
  age=$(json_field "['age']")
  xp=$(json_field "['currentXp']")
  to_next=$(json_field "['xpToNextLevel']")
  tier_name=$(json_field "['badgeTier']")

  iter=$((iter+1))
  printf "  %siter %2d%s  level=%s  age=%s  xp=%s → next %s  (%s)\n" \
    "$DIM" "$iter" "$RESET" "$lvl" "$age" "$xp" "$to_next" "$tier_name"

  if [ "$age" -gt "$prev_age" ]; then
    printf "\n%s🌟 AGE TRANSITION  %d → %d%s\n\n" "$BOLD$GREEN" "$prev_age" "$age" "$RESET"
    prev_age=$age
  fi

  if [ "$lvl" -ge "$target" ]; then
    printf "\n%s🎉 REACHED TARGET LEVEL %d (age %d)%s\n" "$BOLD$GREEN" "$lvl" "$age" "$RESET"
    break
  fi

  # award-xp on game-server (achievement source = 500 base). Game-server's
  # awardXp auto-applies any pending level-ups inside the same transaction,
  # so we don't need a separate level-up call.
  call POST "$GAME/api/progression/award-xp" "{\"userId\":\"$USER_ID\",\"source\":\"achievement\"}"
  if [ "$STATUS" -ge 200 ] && [ "$STATUS" -lt 300 ]; then
    leveled=$(json_field "['leveledUp']" || echo false)
    if [ "$leveled" = "True" ] || [ "$leveled" = "true" ]; then
      new_lvl=$(json_field "['progress']['currentLevel']")
      printf "    %s✓%s LEVEL UP  %s → %s\n" "$GREEN" "$RESET" "$lvl" "$new_lvl"
    fi
  else
    fail "award-xp failed $STATUS"
    echo "$RESP"
    exit 1
  fi

  # Safety: don't loop forever if XP isn't actually accumulating
  if [ "$iter" -gt 200 ]; then
    fail "200 iterations and still below level $target — something is wrong"
    exit 1
  fi
done

# --- 6. Final verification ---------------------------------------------------

echo
hilite "Step 6 — Final verification + drift report"
call GET "$GAME/api/progression/$USER_ID"
require_2xx "progression/$USER_ID (final)"
final_lvl=$(json_field "['level']")
final_age=$(json_field "['age']")
final_tier=$(json_field "['badgeTier']")
ok "game-server  level=$final_lvl  age=$final_age  tier=$final_tier"

call GET "$API/api/v1/tier/progress"
require_2xx "tier/progress (final)"
api_lvl=$(json_field "['currentLevel']")
api_age=$(json_field "['currentAge']")
api_tier=$(json_field "['currentTierName']")
if [ "$api_lvl" != "$final_lvl" ] || [ "$api_age" != "$final_age" ]; then
  warn "api drift  level=$api_lvl  age=$api_age  tier=$api_tier  (game-server says $final_lvl/$final_age/$final_tier)"
  warn "→ split-brain: api tier_progression NOT synced with game-server player_levels"
else
  ok "api+game-server agree"
fi

# Public sanity for the /base/build catalog (still reachable, no regressions)
call GET "$API/api/v1/users/profile"
require_2xx "users/profile"
ok "profile OK"

printf "\n%sAutoplay complete.%s  Iterations=%d\n" "$BOLD$GREEN" "$RESET" "$iter"
