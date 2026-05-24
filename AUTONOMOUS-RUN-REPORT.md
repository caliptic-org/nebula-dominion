# Autonomous QA Run — Report

> Generated during the 4-hour autonomous loop you kicked off. Three
> commits landed on `main`:
> `e24f562`, `90ee7c9`, `32de76b`.

## TL;DR

**All 40 routes return HTTP 200.** Verified by a new Playwright crawler
(`apps/web/e2e/route-crawl.spec.ts`) that visits every page as `test2@nebula.com`
and reports per-route HTTP status, console errors, network 4xx/5xx, and
JS exceptions.

| Before | After |
|---|---|
| 5+ visibly dead CTAs on `/base/build`, `/missions`, `/map`, `/commanders`, `/shop` | All wired to either real API or visible toast feedback |
| HUD numbers hardcoded `12,480 / 3,210 / 42` everywhere | Live `useGameResources` polling every 5s on `/base`, `/base/build`, `/base/production`, `/map`, `/research` |
| 6 test accounts had 0 buildings (`/buildings` returned `[]`) | All accounts now seeded with race-appropriate starter buildings |
| `/base/build` showed synthesised levels (5,4,3,2,1) | Capital slot shows real tier level; other slots show "YENİ" chip |
| No toast/feedback infrastructure | Global `toast.success/error/info` bus; 40+ callsites wired |
| `/base/build` BAŞLAT was a no-op | Now POSTs `/api/buildings` with slug→type mapping |
| `/customization` 404'd on cosmetics + balance | `/api/v1/` prefix fixed |
| `/base/production` hydration error (nested buttons) | Cleaned up; 0 exceptions |
| `/formation` 404 on hardcoded DEMO_PLAYER_ID | Reads `sub` from live JWT |

## How to verify

```bash
# 1. Make sure stack is up
docker compose ps                                  # api/game-server/db all healthy

# 2. Make sure local web dev is running on :3000
pnpm --filter @nebula-dominion/web dev             # already running in background

# 3. Re-run the crawler (~2.2 min)
pnpm --filter @nebula-dominion/web exec playwright test --project=crawl

# 4. Test login + click around manually
#    URL:      http://localhost:3000
#    Account:  test2@nebula.com / Test1234!  (Insan, level 9, ready to advance)
#    Try:      /base → tap building → DETAY → /base/build → tap BAŞLAT
#              /map → tap any node → KEŞFET/SAVUN/GELİŞTİR (toast)
#              /shop → tap Satın Al on any item (toast + API call)
#              /missions → Ödülü Al / Devam buttons (toast/nav)
#              /chat → type + send (message appears in stream)
```

The crawler summary is at `apps/web/route-crawl-summary.json` — diff it
against the next run to spot regressions.

## What was wired this run

### Critical CTAs (no-op → real action)

| Screen | Button | What it does now |
|---|---|---|
| `/base/build` | **BAŞLAT** | POST `/api/buildings` with `{type, positionX, positionY}` |
| `/base/build` | FİLTRE | Toast info (filter UI is future work) |
| `/base` | DETAY | Routes to `/base/build?focus=<slug>` |
| `/missions` | Ödülü Al | Toast with reward amount |
| `/missions` | Devam | Routes to mission-appropriate screen (`/story`, `/base/build`, etc.) |
| `/map` | KEŞFET (×2 variants) | Toast info (scan UI placeholder) |
| `/map` | SAVUN | Toast success |
| `/map` | GELİŞTİR | Routes to `/base/build` |
| `/commanders` | ⚔ Komutan Seç | Toast success (no active-commander endpoint yet) |
| `/commanders/:id` | Equipment slots (×6) | Toast info per slot |
| `/merge` | İPTAL / Birleştir | POST `/units/merge` with selected unit ids |
| `/shop` | Satın Al (per product) | POST `/shop/purchase` |
| `/shop` | Bugün Al (VIP) | POST `/vip/claim-daily` |
| `/shop` | Yükselt (VIP plans) | POST `/shop/purchase` with vip sku |
| `/shop` | Premium Geçiş Satın Al | POST `/shop/purchase` battle pass |
| `/alliance` | İttifak Savaşı Bildir | Toast info |
| `/alliance` | Katıl (per war) | Toast success |
| `/alliance` | Strateji | Toast info |
| `/chat` | Send button | Optimistic append to tab-scoped draft list |
| `/events/:id` | Linki Kopyala | `navigator.clipboard.writeText` + toast |
| `/events/:id` | Tüm sıralamayı gör → | Real anchor to `/leaderboard?event=:id` |
| `/inventory` | FİLO YAP | Routes to `/formation` |
| `/inventory` | Savaşa Gönder | Routes to `/battle-prep?unit=:id` |
| `/inventory` | Yükselt | Toast preview (no unit-upgrade endpoint yet) |
| `/battle-result` | ANA ÜS | Routes to `/base` (was `/`) |

### Live data wired

- **`useGameResources` hook**: polls `/api/buildings/resources` every 5s.
  HUD on `/base`, `/base/build`, `/base/production`, `/map`, `/research`
  now shows real mineral/gas/energy. Falls back to `12,480 / 3,210 / 42`
  for guest mode.
- **`useBaseState`** propagated to `/base/build` and `/base/production`.
  HUD level + tier name now reflect the real player.
- **`apps/api/scripts/seed-test-accounts.js`** extended to insert
  4 starter buildings per non-account-1 player. After re-running, the
  6 test accounts have `command_center` + race-appropriate set, so
  `/buildings` returns live data and the resource ticker accumulates.

### Infrastructure

- **`Toaster` component** (`apps/web/src/components/handoff/Toaster.tsx`):
  global window-event bus + CSS-only stack. Call `toast.success(...)` /
  `toast.error(...)` / `toast.info(...)` from anywhere; auto-dismisses
  after 3.5s. Mounted in root layout.
- **`ComfyUI ground tile sprites`**: 5 race PNGs generated via
  `node scripts/comfy-gen.js --all-tiles` (insan/zerg/otomat/canavar/seytan).
  BaseField loads each one via SVG `<image>` per tile with a HEAD probe
  fallback to flat palette colours.
- **Game-server CORS fix** (already landed earlier in the day):
  `app.enableCors()` added so browser fetches from `:3000` succeed.

### Back-link normalization

Previously many screens linked back to `/dashboard` (which exists but
isn't the canonical home for the base loop). Mass-normalized to `/base`:
`/profile`, `/settings`, `/alliance`, `/shop`, `/leaderboard`.
`/alliance` guild icon also moved from `/dashboard/guild` to
`/chat?tab=guild`. `/battle-result` ANA ÜS moved from `/` to `/base`.

## Known remaining issues (logged for follow-up)

Crawler caught these on the final run — all routes still return 200, but
they show errors in the browser console:

| Route | Issue | Why |
|---|---|---|
| `/events` | 2 console + 8 JS exceptions | `Date.now()` time-string rendered SSR + client → hydration mismatch |
| `/mail` | 2 console + 8 exceptions | Same time-formatting pattern |
| `/formation` | 7 console + 4 req4xx + 8 exceptions | Time formatting + the live JWT user isn't yet provisioned in the formation tables backend-side |

Fixes for all three: wrap the time strings in `suppressHydrationWarning`
or move them client-only via `useEffect`. Backend gap for `/formation`:
need to either auto-create a default formation for new players, or
short-circuit the 404 with a friendly empty-state.

## Backend gaps that became visible

These aren't web bugs — they're missing endpoints that would let us drop
the toast stubs for real persistence:

1. **Per-building level summary** (`GET /buildings/summary`): would let
   `/base/build` show real per-slot levels instead of "YENİ" everywhere.
2. **Mission claim** (`POST /quests/:id/claim`): would let `Ödülü Al`
   actually credit the reward.
3. **Active-commander select** (`POST /commanders/:id/activate`): would
   let `⚔ Komutan Seç` persist.
4. **Per-unit upgrade** (`POST /units/:id/upgrade`): for the
   `/inventory` drawer Yükselt button.
5. **Equipment inventory + equip/unequip** (`GET /equipment`,
   `POST /equipment/:id/equip`): for the `/commanders/:id` 6 slots.
6. **Galaxy node scan/explore** (`POST /map/nodes/:id/scan`): for the
   `/map` KEŞFET buttons.
7. **Chat send** (`POST /chat/{tab}`): for real persistence; right now
   sent messages are local-only.

Each of these is logged with a TODO comment at the relevant callsite.

## Files added

- `apps/web/src/components/handoff/Toaster.tsx` — global toast bus
- `apps/web/src/components/handoff/base-iso.ts` — iso tile math + palette
  (from the earlier `/base` tilemap work, included here for completeness)
- `apps/web/src/hooks/useGameResources.ts` — live wallet polling
- `apps/web/e2e/route-crawl.spec.ts` — autonomous crawler
- `apps/web/route-crawl-summary.json` — latest crawler snapshot
- `apps/web/public/assets/tiles/<race>/ground.png` — 5 ComfyUI tile sprites
- `AUTONOMOUS-RUN-REPORT.md` — this file
