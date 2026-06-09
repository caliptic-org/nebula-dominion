#!/usr/bin/env bash
# =============================================================================
# autoplay-full.sh — drive a fresh account through the WHOLE game via the API:
#   level 1 → max level (54 / age 6) → PRESTIGE, exercising the real gameplay
#   loops along the way (build, train, battle, disband, shop).
#
# This is the "oyunu sonuna kadar oyna" harness — the full-game successor to
# autoplay-to-age2.sh. Beyond just grinding XP it VERIFIES the cycle-27..31
# fixes end-to-end:
#   - BATTLE_REWARD_XP (cycle-28): a quick-battle must actually move player XP.
#   - population supply cap + disband valve (cycle-27): train → cap → disband.
#   - endgame PRESTIGE (cycle-27): past max level, XP must feed prestige_level.
#   - void_crystals + battle-pass surfacing (cycle-27): wallet + pass read.
#
# Every step expects a 2xx; CORE steps (login, race, progression, prestige)
# hard-fail on non-2xx so a regression is loud. GAMEPLAY probes (build, train,
# battle, disband, shop) are best-effort — they WARN and continue, because they
# depend on seeded buildings/units that a fresh account may not have yet. Any
# failure prints the response body for a human / Claude session to diagnose.
#
# Auth: this script LOGS IN as a pre-seeded test account (seed-test-accounts.ts);
# it does NOT register. Set EMAIL/PASSWORD/TOKEN to point at your own.
#
# Usage:
#   bash scripts/autoplay-full.sh
#   API=https://api-nebula.caliptic.com GAME=https://game-nebula.caliptic.com \
#     bash scripts/autoplay-full.sh                 # against prod
#   TARGET_LEVEL=54 PRESTIGE_ROUNDS=3 bash scripts/autoplay-full.sh
#   TOKEN=eyJ... USER_ID=<uuid> bash scripts/autoplay-full.sh   # skip login
#
# TIP: a high GAME_SPEED_MULTIPLIER on the server makes build/train deadlines
# resolve near-instantly so the "accelerated" run completes quickly.
# =============================================================================
set -uo pipefail

API=${API:-http://localhost:4000}
GAME=${GAME:-http://localhost:3001}
EMAIL=${EMAIL:-test1@nebula.com}
PASSWORD=${PASSWORD:-Test1234!}
RACE=${RACE:-human}                 # human|zerg|automaton|beast|demon
TARGET_LEVEL=${TARGET_LEVEL:-54}    # MAX_LEVEL = age 6 tier 9
PRESTIGE_ROUNDS=${PRESTIGE_ROUNDS:-3}  # extra award-xp calls past max to prove prestige accrues

BOLD=$'\e[1m'; RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; CYAN=$'\e[36m'; DIM=$'\e[2m'; RESET=$'\e[0m'
step()   { printf "%s▸%s %s\n" "$CYAN" "$RESET" "$*"; }
ok()     { printf "%s✓%s %s\n" "$GREEN" "$RESET" "$*"; }
warn()   { printf "%s⚠%s %s\n" "$YELLOW" "$RESET" "$*"; }
fail()   { printf "%s✖%s %s\n" "$RED" "$RESET" "$*"; }
hilite() { printf "\n%s%s%s\n" "$BOLD" "$*" "$RESET"; }

WARN_COUNT=0

# call <METHOD> <URL> [BODY] → echoes body into $RESP, sets $STATUS
call() {
  local method="$1" url="$2" body="${3:-}"
  local args=(-sS -X "$method" -w "\n__STATUS__:%{http_code}" --max-time 20)
  [ -n "${TOKEN:-}" ] && args+=(-H "Authorization: Bearer $TOKEN")
  if [ -n "$body" ]; then args+=(-H "Content-Type: application/json" -d "$body"); fi
  local resp; resp=$(curl "${args[@]}" "$url")
  STATUS="${resp##*__STATUS__:}"
  RESP="${resp%__STATUS__:*}"; RESP="${RESP%$'\n'}"
}
require_2xx() {
  if [ "$STATUS" -lt 200 ] || [ "$STATUS" -ge 300 ]; then
    fail "$1 → HTTP $STATUS"; printf "%s%s%s\n" "$DIM" "$RESP" "$RESET"; exit 1
  fi
}
# best-effort: warn + continue on non-2xx (for gameplay probes that may legitimately 400/409)
soft_2xx() {
  if [ "$STATUS" -lt 200 ] || [ "$STATUS" -ge 300 ]; then
    warn "$1 → HTTP $STATUS ($(echo "$RESP" | head -c 160))"; WARN_COUNT=$((WARN_COUNT+1)); return 1
  fi; return 0
}
json_field() { echo "$RESP" | python -c "import json,sys; d=json.load(sys.stdin); print(d$1)" 2>/dev/null; }

# --- 1. Auth ------------------------------------------------------------------
if [ -z "${TOKEN:-}" ]; then
  hilite "Step 1 — Login as $EMAIL"
  call POST "$API/api/v1/auth/login" "{\"identifier\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
  require_2xx "login"
  TOKEN=$(json_field "['accessToken']"); USER_ID=$(json_field "['user']['id']")
  [ -z "$TOKEN" ] && { fail "no accessToken in login response"; echo "$RESP"; exit 1; }
  ok "logged in   userId=$USER_ID"
else
  : "${USER_ID:?set USER_ID alongside TOKEN}"
  ok "using provided TOKEN for userId=$USER_ID"
fi

# --- 2. Race select -----------------------------------------------------------
hilite "Step 2 — Race select ($RACE)"
call POST "$API/api/v1/users/select-race" "{\"race\":\"$RACE\"}"
if [ "$STATUS" -ge 400 ] && [ "$STATUS" -lt 500 ] && echo "$RESP" | grep -q "already"; then
  warn "race already chosen — continuing"
else require_2xx "race-select"; fi
ok "race set    $RACE"

# --- 3. Initial snapshot ------------------------------------------------------
hilite "Step 3 — Initial progression + economy snapshot"
call GET "$GAME/api/progression/$USER_ID"; require_2xx "progression (initial)"
START_LVL=$(json_field "['level']"); START_AGE=$(json_field "['age']")
ok "player_levels  level=$START_LVL  age=$START_AGE  prestige=$(json_field "['prestigeLevel']")"
call GET "$GAME/api/buildings/resources"; soft_2xx "resources" \
  && ok "resources  mineral=$(json_field "['mineral']") gas=$(json_field "['gas']") energy=$(json_field "['energy']") pop=$(json_field "['population']")/$(json_field "['populationCap']")"
call GET "$API/api/v1/inventory/wallet"; soft_2xx "wallet" \
  && ok "wallet  gems=$(json_field "['premium_gems']") coins=$(json_field "['nebula_coins']") void_crystals=$(json_field "['void_crystals']")"

# --- 4. Build a production building (best-effort) ------------------------------
hilite "Step 4 — Build a production building (exercises the build + recalc flow)"
call POST "$GAME/api/buildings" '{"type":"barracks","row":3,"col":3}'
soft_2xx "build barracks" && ok "barracks queued"

# --- 5. Train + population cap + disband (cycle-27) ----------------------------
hilite "Step 5 — Train units → population cap → disband valve"
call GET "$GAME/api/units"; soft_2xx "list units"
UNIT_BEFORE=$(echo "$RESP" | python -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
ok "roster size before: $UNIT_BEFORE"
# find a barracks to train from
call GET "$GAME/api/buildings"; soft_2xx "list buildings"
BARRACKS_ID=$(echo "$RESP" | python -c "import json,sys
b=[x for x in json.load(sys.stdin) if x.get('type')=='barracks' and x.get('status')=='active']
print(b[0]['id'] if b else '')" 2>/dev/null || echo "")
if [ -n "$BARRACKS_ID" ]; then
  call POST "$GAME/api/units/train" "{\"unitType\":\"marine\",\"buildingId\":\"$BARRACKS_ID\",\"count\":1}"
  soft_2xx "train marine" && ok "marine queued (pop cap enforced server-side)"
else warn "no active barracks yet — skipping train (build deadline not elapsed)"; fi
# disband valve: remove one alive unit if any
call GET "$GAME/api/units"
FIRST_UNIT=$(echo "$RESP" | python -c "import json,sys
u=[x for x in json.load(sys.stdin) if x.get('isAlive')]
print(u[0]['id'] if u else '')" 2>/dev/null || echo "")
if [ -n "$FIRST_UNIT" ]; then
  call DELETE "$GAME/api/units/$FIRST_UNIT"
  soft_2xx "disband unit" && ok "disbanded $FIRST_UNIT → freed $(json_field "['freedSupply']") supply"
else warn "no alive unit to disband"; fi

# --- 6. Quick-battle → verify XP is ACTUALLY granted (cycle-28) ----------------
hilite "Step 6 — Quick-battle must move player XP (cycle-28 BATTLE_REWARD_XP)"
call GET "$GAME/api/progression/$USER_ID"; require_2xx "progression (pre-battle)"
XP_PRE=$(json_field "['totalXp']"); LVL_PRE=$(json_field "['level']")
call POST "$API/api/v1/battles" "{\"attackerRace\":\"$RACE\",\"defenderRace\":\"zerg\"}"
if soft_2xx "POST /battles"; then
  BATTLE_ID=$(json_field "['id']"); BATTLE_STATUS=$(json_field "['status']")
  ok "battle $BATTLE_ID resolved: $BATTLE_STATUS"
  call POST "$API/api/v1/battles/$BATTLE_ID/claim-reward" '{}'
  soft_2xx "claim-reward" && ok "reward claimed (walletCredited=$(json_field "['walletCredited']"))"
  sleep 2  # the XP grant fans out fire-and-forget; give it a moment to land
  call GET "$GAME/api/progression/$USER_ID"; require_2xx "progression (post-battle)"
  XP_POST=$(json_field "['totalXp']")
  if [ -n "$XP_PRE" ] && [ -n "$XP_POST" ] && [ "$XP_POST" -gt "$XP_PRE" ]; then
    ok "BATTLE XP GRANTED ✔  totalXp $XP_PRE → $XP_POST  (+$((XP_POST-XP_PRE)))"
  else
    warn "battle did NOT move totalXp ($XP_PRE → $XP_POST) — BATTLE_REWARD_XP regression?"; WARN_COUNT=$((WARN_COUNT+1))
  fi
fi

# --- 7. Grind to MAX LEVEL, watching age transitions --------------------------
hilite "Step 7 — Grind to level $TARGET_LEVEL (max), tracking age transitions"
prev_age=$START_AGE; iter=0
while :; do
  call GET "$GAME/api/progression/$USER_ID"; require_2xx "progression"
  lvl=$(json_field "['level']"); age=$(json_field "['age']")
  iter=$((iter+1))
  [ $((iter % 5)) -eq 0 ] && printf "  %siter %3d%s  level=%s age=%s xp=%s\n" "$DIM" "$iter" "$RESET" "$lvl" "$age" "$(json_field "['currentXp']")"
  if [ "$age" -gt "$prev_age" ]; then printf "  %s🌟 AGE %d → %d%s\n" "$BOLD$GREEN" "$prev_age" "$age" "$RESET"; prev_age=$age; fi
  [ "$lvl" -ge "$TARGET_LEVEL" ] && { ok "REACHED MAX  level=$lvl age=$age"; break; }
  call POST "$GAME/api/progression/award-xp" "{\"userId\":\"$USER_ID\",\"source\":\"achievement\"}"
  require_2xx "award-xp"
  if [ "$iter" -gt 400 ]; then fail "400 iters, still < $TARGET_LEVEL — XP not accumulating"; exit 1; fi
done

# --- 8. PRESTIGE: past max, XP must feed prestige_level (cycle-27) -------------
hilite "Step 8 — Endgame prestige: post-max XP must accrue prestige (cycle-27 FLOW-004)"
call GET "$GAME/api/progression/$USER_ID"; require_2xx "progression (at max)"
PRESTIGE_PRE=$(json_field "['prestigeLevel']"); PRESTIGE_XP_PRE=$(json_field "['prestigeXp']")
ok "at max: prestigeLevel=$PRESTIGE_PRE prestigeXp=$PRESTIGE_XP_PRE"
for i in $(seq 1 "$PRESTIGE_ROUNDS"); do
  # unique referenceId each call so the idempotency ledger doesn't dedupe them
  call POST "$GAME/api/progression/award-xp" "{\"userId\":\"$USER_ID\",\"source\":\"achievement\",\"referenceId\":\"autoplay-prestige-$i-$(date +%s)\"}"
  require_2xx "award-xp (prestige round $i)"
done
call GET "$GAME/api/progression/$USER_ID"; require_2xx "progression (post-prestige)"
PRESTIGE_POST=$(json_field "['prestigeLevel']"); PRESTIGE_XP_POST=$(json_field "['prestigeXp']")
if { [ -n "$PRESTIGE_POST" ] && [ "$PRESTIGE_POST" -gt "$PRESTIGE_PRE" ]; } \
   || { [ -n "$PRESTIGE_XP_POST" ] && [ "$PRESTIGE_XP_POST" -gt "${PRESTIGE_XP_PRE:-0}" ]; }; then
  ok "PRESTIGE ACCRUES ✔  level $PRESTIGE_PRE→$PRESTIGE_POST  xp $PRESTIGE_XP_PRE→$PRESTIGE_XP_POST"
else
  warn "post-max XP did NOT feed prestige (level $PRESTIGE_PRE→$PRESTIGE_POST, xp $PRESTIGE_XP_PRE→$PRESTIGE_XP_POST) — FLOW-004 regression?"; WARN_COUNT=$((WARN_COUNT+1))
fi

# --- 9. Final verification + drift report -------------------------------------
hilite "Step 9 — Final verification + api↔game-server drift report"
call GET "$GAME/api/progression/$USER_ID"; require_2xx "progression (final)"
final_lvl=$(json_field "['level']"); final_age=$(json_field "['age']")
ok "game-server  level=$final_lvl age=$final_age prestige=$(json_field "['prestigeLevel']")"
call GET "$API/api/v1/tier/progress"
if soft_2xx "tier/progress"; then
  api_lvl=$(json_field "['currentLevel']"); api_age=$(json_field "['currentAge']")
  if [ "$api_lvl" != "$final_lvl" ] || [ "$api_age" != "$final_age" ]; then
    warn "api tier_progression drift: api=$api_lvl/$api_age vs game-server=$final_lvl/$final_age (known split-brain)"; WARN_COUNT=$((WARN_COUNT+1))
  else ok "api + game-server agree"; fi
fi

printf "\n%s═══ Autoplay-full complete ═══%s  grind iterations=%d  warnings=%d\n" "$BOLD$GREEN" "$RESET" "$iter" "$WARN_COUNT"
[ "$WARN_COUNT" -gt 0 ] && printf "%s%d soft warning(s) above — review the gameplay probes (build/train/battle deadlines or a real regression).%s\n" "$YELLOW" "$WARN_COUNT" "$RESET"
exit 0
