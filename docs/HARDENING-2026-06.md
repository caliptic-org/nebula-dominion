# Nebula Dominion — Hardening & Feature Report (June 2026)

A record of an extended autonomous session: feature delivery followed by a
five-cycle, adversarially-verified audit campaign. Every change below was
typechecked, tested where feasible, and deployed green to production
(self-hosted GitHub Actions runner → LXC 204). Commit refs are in parentheses.

This is a reviewable summary; the live working notes are in the agent memory
(`cycle27-audit-backlog.md`). Newest work first.

---

## 1. Features shipped (the "1 2 3" priority)

| Area | What shipped | Commits |
|---|---|---|
| **Battle pass (FLOW-001)** | Free-season enrollment → XP (quick-battle + socket PvP) → real tier UI + claim → premium-track gate → UNIQUE active-enrollment | 4d9a4d2, 12b7031, 4dcc12d, 6818ee0 |
| **Endgame prestige (FLOW-004)** | Post-max-level (54) XP feeds a permanent +2%/level production track (cap +100%); idempotent atomic cascade; FE bar + immediate recalc + socket | ee6bcb0, 997da80 |
| **void_crystals sink (ECON-4)** | 3 cosmetic shop SKUs priced in void_crystals + 🕳 currency pill — the dead currency now has a spend path | 5341073 |
| **Population supply cap (ECON-6)** | Training enforces a roster-derived supply cap (fail-open) + a **disband valve** (`DELETE /units/:id`) so un-mergeable rosters can't lock out training; honest HUD sync | 8e38d75 |

Earlier in the session: real-time battles pay resources (a1ec0f5), persisted
ranked ELO + ELO-backed leaderboard (0d48f03, 3c55d18), TIER 2/3 commander
age-gating (55915b5), commander-boosted quick-battle odds (f3eba70).

---

## 2. Hardening — five verified audit cycles (27 fixes)

Each cycle: fan-out finders over a distinct surface → **adversarial
verification** of every finding (mounted + reachable + consumed + canonical) →
fix the confirmed-live ones, reject dead/undeployed/overstated ones.

**Cycle 27 — whole-game playability (19 findings):**
- Bot defense now scales by PvE difficulty like hp/attack (982e746)
- Gate evaluation loads the real `science` value (was hardcoded 0) (0364355)
- Battle-pass: reject tier claims from an expired season (a37f11e); season-scoped
  enrollment + reactivate-in-place (e810551)
- Chat: render only the live feed, drop phantom demo messages + DM stubs
  (5408dcc, 090a980); alliance: real DB-backed member roster (56ad436), removed
  fake war slots/join (ac2c725)
- Activated the real guild backend in prod (was serving stubs) (29687f8)
- Smoothed the rookie→veteran PvE difficulty cliff (b177eda)

**Cycle 28 — regression check of cycle-27 (3 findings):**
- **BATTLE_REWARD_XP**: the primary quick-battle granted *zero* level XP — the
  reward endpoint validated the `xp` field then dropped it. Now wired through the
  canonical progression path, idempotent, with real level-up socket events (1da844e)
- Chat new-message alert no longer false-fires on tab switch (50de320)
- Reconciled displayed battle rewards with what's actually granted (f418efa,
  b61f00a)

**Cycle 29 — secondary systems (7 findings):**
- Guild research/donation lost-update + TOCTOU races → pessimistic row locks
  (41f2020)
- Galaxy node capture now invalidates the resource cache (was stale 60s) (aa0b186)
- Subspace battle resolution made idempotent under concurrency (94119ed)

**Cycle 30 — last systems (9 findings):**
- Socket combat: reject replayed actions + double-finish (ranked_games
  double-increment) (b2618b8); matchmaking serialized per mode to stop duplicate
  matches (a50599d)
- Resource tick no longer overwrites the roster-derived population value (93c8c34)
- Constant-time internal-service secret comparison (0bf4fd5)

**Cycle 31 — dedicated security sweep (2 findings):**
- Guild raid `resolve-drops` IDOR closed (membership-gated); repaired a
  pre-existing broken test suite (aacfba5)
- *Deferred (design decision):* `GET /leaderboard` is intentionally public.

---

## 3. What's verified sound

- **Functional / playability** — 4 audits, all findings addressed.
- **Security** — dedicated authz/IDOR/injection/exposure sweep: only 2 issues
  across every endpoint (prior cycle-6/7 hardening held).
- **Concurrency** — lost-update/TOCTOU/replay/double-resolve closed with the
  codebase's pessimistic-lock + idempotency patterns.
- **Performance / indexing** — hot query paths (progression, units, buildings,
  guild membership, research, resource tick) are all composite-indexed.
- **Progression architecture** — the api↔game-server "split-brain" is a sound
  **pull-on-read mirror** (game-server `player_levels` is the single source of
  truth; `/tier/level-up` is a no-op refresh).

---

## 4. Tooling

- `scripts/autoplay-full.sh` — drives a fresh account through the **whole game**
  via API (level 1 → max 54/age 6 → prestige) and asserts the fixes hold
  end-to-end (battle XP granted, population cap + disband, prestige accrual).
  Run: `bash scripts/autoplay-full.sh` (logs in the seeded test account), or
  `TOKEN=… USER_ID=… bash scripts/autoplay-full.sh`. Set `API=`/`GAME=` for prod.
- `scripts/**` is now excluded from the deploy trigger (dev scripts don't rebuild
  prod images).
- `CLAUDE.md` operational notes corrected (the api *does* run migrations; CI/CD
  *is* automated).

---

## 5. Remaining work — needs a human decision

None of these can be done responsibly by guessing; each needs product direction,
play telemetry, an asset, or credentials:

| Item | What's needed |
|---|---|
| ELO season reset, daily guild content, alliance objectives, formations→battle wiring | **Product scope** — pick one to build |
| Commander-bonus consistency across battle surfaces; PvE defender power curve | **Balance telemetry** — don't tune blind |
| Zerg Tier-2 commander | **Portrait art** (then ~30 min to wire the catalog + FE) |
| Real iyzico payments | **API keys** (a prohibited action for an agent to handle) |
| Per-room lock for fully concurrent-safe combat | A larger refactor; the shipped guards cover the realistic cases |
| Run the live playthrough | A **token** (agents can't create accounts / enter passwords) |
| Prod LXC low disk (~5G) | `docker builder prune -af` on the host when convenient |
