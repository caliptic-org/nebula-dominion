/* eslint-disable */
/**
 * Seed 6 test accounts at every age-transition boundary.
 * Plain-JS version of seed-test-accounts.ts for direct `node` execution
 * (avoids ts-node module resolution issues in pnpm workspaces).
 *
 * Run from apps/api:
 *   DATABASE_URL=postgresql://nebula:PASS@localhost:5433/nebula_dominion \
 *     node scripts/seed-test-accounts.js
 *
 * See seed-test-accounts.ts for the layout table + XP math rationale.
 */
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const PASSWORD = 'Test1234!';

const ACCOUNTS = [
  { email: 'test1@nebula.com', username: 'test1', race: null,      level: 1,  age: 1, xpReady: 0,      tierName: 'Tohum',              description: 'Brand-new account · first login · race not chosen' },
  { email: 'test2@nebula.com', username: 'test2', race: 'insan',   level: 9,  age: 1, xpReady: 10000,  tierName: 'Metropol',           description: 'End of Age 1 · ready to advance to Age 2 (Insan)' },
  { email: 'test3@nebula.com', username: 'test3', race: 'zerg',    level: 18, age: 2, xpReady: 36100,  tierName: 'Yıldız Hakimi',      description: 'End of Age 2 · ready to advance to Age 3 (Zerg)' },
  { email: 'test4@nebula.com', username: 'test4', race: 'otomat',  level: 27, age: 3, xpReady: 78400,  tierName: 'Sektör Hakimi',      description: 'End of Age 3 · ready to advance to Age 4 (Otomat)' },
  { email: 'test5@nebula.com', username: 'test5', race: 'canavar', level: 36, age: 4, xpReady: 136900, tierName: 'Galaktik İmparator', description: 'End of Age 4 · ready to advance to Age 5 (Canavar)' },
  { email: 'test6@nebula.com', username: 'test6', race: 'seytan',  level: 45, age: 5, xpReady: 211600, tierName: 'Boyut Tanrısı',      description: 'End of Age 5 · ready to advance to Age 6 (Seytan)' },
];

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER || 'nebula';
  const pass = process.env.DB_PASSWORD || '';
  const db = process.env.DB_NAME || 'nebula_dominion';
  return `postgresql://${user}:${pass}@${host}:${port}/${db}`;
}

async function main() {
  const url = resolveDatabaseUrl();
  console.log(`[seed] target: ${url.replace(/:[^:@]*@/, ':***@')}`);

  const hashed = await bcrypt.hash(PASSWORD, 10);
  console.log(`[seed] generated bcrypt hash for password "${PASSWORD}"`);

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    for (const acc of ACCOUNTS) {
      const upsertUser = await client.query(
        `INSERT INTO users
           (email, username, password_hash, race, current_age, current_level, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT (email) DO UPDATE
         SET username      = EXCLUDED.username,
             password_hash = EXCLUDED.password_hash,
             race          = EXCLUDED.race,
             current_age   = EXCLUDED.current_age,
             current_level = EXCLUDED.current_level,
             is_active     = true,
             updated_at    = now()
         RETURNING id;`,
        [acc.email, acc.username, hashed, acc.race, acc.age, acc.level],
      );
      const userId = upsertUser.rows[0].id;

      const xpToNextLevel =
        acc.level >= 54 ? '0' : (100 * (acc.level + 1) * (acc.level + 1)).toString();

      await client.query(
        `INSERT INTO tier_progression
           (user_id, current_level, current_age, current_tier_name, xp, xp_to_next_level, achievements)
         VALUES ($1, $2, $3, $4, $5, $6, NULL)
         ON CONFLICT (user_id) DO UPDATE
         SET current_level     = EXCLUDED.current_level,
             current_age       = EXCLUDED.current_age,
             current_tier_name = EXCLUDED.current_tier_name,
             xp                = EXCLUDED.xp,
             xp_to_next_level  = EXCLUDED.xp_to_next_level,
             updated_at        = now();`,
        [userId, acc.level, acc.age, acc.tierName, acc.xpReady.toString(), xpToNextLevel],
      );

      // Starter buildings — give every non-account-1 player a Command Center
      // plus 2-3 race-relevant active buildings so /base/build doesn't show
      // an empty roster and /buildings/resources accumulates real production.
      // Account 1 (no race) intentionally starts empty.
      if (acc.race) {
        const starterBuildings = starterBuildingsFor(acc.race);
        for (const b of starterBuildings) {
          await client.query(
            `INSERT INTO player_buildings
               (player_id, type, level, status, position_x, position_y,
                construction_started_at, construction_complete_at, created_at, updated_at)
             VALUES ($1, $2, $3, 'active', $4, $5, now(), now(), now(), now())
             ON CONFLICT DO NOTHING;`,
            [userId, b.type, b.level, b.positionX, b.positionY],
          );
        }

        // Starter units — gives /inventory non-empty roster + something for
        // /battle-prep to draft. The player_units enum only covers Terran
        // + Zerg unit types right now; insan / zerg get real spawns and
        // otomat / canavar / seytan re-use the closest analogue (a future
        // migration should expand `player_units_race_enum`).
        const starterUnits = starterUnitsFor(acc.race);
        for (const u of starterUnits) {
          // Spawn count units of each type.
          for (let i = 0; i < u.count; i++) {
            await client.query(
              `INSERT INTO player_units
                 (player_id, type, race, hp, max_hp, attack, defense, speed,
                  position_x, position_y, abilities, is_alive, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, '[]'::jsonb, true, now(), now())
               ON CONFLICT DO NOTHING;`,
              [
                userId, u.type, u.race, u.hp, u.attack, u.defense, u.speed,
                Math.floor(Math.random() * 8), Math.floor(Math.random() * 8),
              ],
            );
          }
        }
      }

      console.log(
        `[seed] ok ${acc.email}  (lv ${acc.level} age ${acc.age}, xp=${acc.xpReady})  — ${acc.description}`,
      );
    }

    console.log('');
    console.log('[seed] DONE. Login credentials:');
    console.log('');
    for (const acc of ACCOUNTS) {
      console.log(`  ${acc.email}  /  ${PASSWORD}   →  ${acc.description}`);
    }
  } finally {
    await client.end();
  }
}

/** Race-appropriate starter base — 4 active buildings per race so the
 *  player's wallet ticks even without manual construction. Positions are
 *  picked on the 8×8 grid so they don't overlap with each other or the
 *  random spots the BAŞLAT button may write to. */
/** DB enum `buildings_type_enum` currently exposes only 8 types
 *  (command_center, mine, refinery, barracks, hangar, research_lab,
 *  shield_generator, turret). The TS BuildingType has 16 — that drift will
 *  be reconciled in a future migration; for now the seed sticks to the
 *  Postgres-side set so INSERTs don't reject. */
function starterBuildingsFor(race) {
  const common = [
    { type: 'command_center',   level: 2, positionX: 4, positionY: 4 },
    { type: 'mine',             level: 2, positionX: 2, positionY: 3 },
    { type: 'refinery',         level: 1, positionX: 6, positionY: 3 },
  ];
  if (race === 'insan')   return [...common, { type: 'barracks',         level: 1, positionX: 3, positionY: 6 }];
  if (race === 'zerg')    return [...common, { type: 'research_lab',     level: 1, positionX: 3, positionY: 6 }];
  if (race === 'otomat')  return [...common, { type: 'shield_generator', level: 1, positionX: 3, positionY: 6 }];
  if (race === 'canavar') return [...common, { type: 'hangar',           level: 1, positionX: 3, positionY: 6 }];
  if (race === 'seytan')  return [...common, { type: 'turret',           level: 1, positionX: 3, positionY: 6 }];
  return common;
}

/** Starter unit roster per race. The DB enum currently only knows
 *  {marine,medic,siege_tank,ghost,zergling,hydralisk,ultralisk,queen}
 *  and races {human,zerg,automaton}. Non-Terran/Zerg races re-use a
 *  closest analogue until the enum is expanded.
 *
 *  Each entry spawns `count` rows of `type`, all alive, with race-typical
 *  stats. The randomized position_x/y inside starterBuildingsFor caller
 *  ensures units don't overlap on the 8×8 grid. */
function starterUnitsFor(race) {
  if (race === 'insan') {
    return [
      { type: 'marine',  race: 'human', count: 8, hp: 100, attack: 12, defense: 5, speed: 8 },
      { type: 'medic',   race: 'human', count: 2, hp: 80,  attack: 0,  defense: 4, speed: 9 },
    ];
  }
  if (race === 'zerg') {
    return [
      { type: 'zergling', race: 'zerg', count: 12, hp: 50,  attack: 8,  defense: 2, speed: 14 },
      { type: 'hydralisk',race: 'zerg', count: 4,  hp: 140, attack: 18, defense: 6, speed: 7  },
    ];
  }
  if (race === 'otomat') {
    return [
      { type: 'siege_tank', race: 'automaton', count: 3, hp: 250, attack: 35, defense: 12, speed: 4 },
      { type: 'ghost',      race: 'automaton', count: 2, hp: 90,  attack: 22, defense: 5,  speed: 11 },
    ];
  }
  if (race === 'canavar') {
    // No "creature" enum value — borrow Zerg units as visual placeholder.
    return [
      { type: 'ultralisk', race: 'zerg', count: 2, hp: 400, attack: 40, defense: 18, speed: 5 },
    ];
  }
  if (race === 'seytan') {
    // No "demon" enum value — borrow Queen as the closest "caster" placeholder.
    return [
      { type: 'queen', race: 'zerg', count: 3, hp: 200, attack: 16, defense: 9, speed: 7 },
    ];
  }
  return [];
}

main().catch((err) => {
  console.error('[seed] FAILED:', err.message);
  process.exit(1);
});
