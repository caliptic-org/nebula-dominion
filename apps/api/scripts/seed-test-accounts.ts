/**
 * Seed 6 test accounts at every age-transition boundary.
 *
 * Layout — same password for all six, varied races so the lore/asset
 * differences are testable per account without re-registering:
 *
 *   ┌────────────────────┬──────────┬───────┬─────┬──────────────────┐
 *   │ Account            │ Race     │ Level │ Age │ XP (ready for)   │
 *   ├────────────────────┼──────────┼───────┼─────┼──────────────────┤
 *   │ test1@nebula.com   │ —        │   1   │  1  │ 0   (first login)│
 *   │ test2@nebula.com   │ insan    │   9   │  1  │ Age 1 → 2 ready  │
 *   │ test3@nebula.com   │ zerg     │  18   │  2  │ Age 2 → 3 ready  │
 *   │ test4@nebula.com   │ otomat   │  27   │  3  │ Age 3 → 4 ready  │
 *   │ test5@nebula.com   │ canavar  │  36   │  4  │ Age 4 → 5 ready  │
 *   │ test6@nebula.com   │ seytan   │  45   │  5  │ Age 5 → 6 ready  │
 *   └────────────────────┴──────────┴───────┴─────┴──────────────────┘
 *
 * Password for every account: Test1234!
 *
 * "Ready for next age" means the user's `xp` field already meets the
 * `xpRequiredForLevel(currentLevel + 1)` threshold — clicking "Level Up"
 * in the UI fires immediately and crosses the age boundary.
 *
 * XP math (see apps/api/src/modules/tier/tier-table.ts):
 *   xpRequiredForLevel(L) = 100 * L^2
 *
 *   Level 10 (age 2 start)  → 10,000   XP
 *   Level 19 (age 3 start)  → 36,100   XP
 *   Level 28 (age 4 start)  → 78,400   XP
 *   Level 37 (age 5 start)  → 136,900  XP
 *   Level 46 (age 6 start)  → 211,600  XP
 *
 * Usage:
 *   # From repo root with API running locally OR via Docker:
 *   pnpm --filter @nebula-dominion/api exec ts-node scripts/seed-test-accounts.ts
 *
 *   # Or inside the api container:
 *   docker compose exec api node dist/scripts/seed-test-accounts.js
 *
 *   # Connection comes from these env vars (defaults match docker-compose):
 *   DATABASE_URL=postgresql://nebula:...@localhost:5433/nebula_dominion \
 *     pnpm ts-node scripts/seed-test-accounts.ts
 *
 * Re-running is safe: each insert uses ON CONFLICT to upsert by email/userId.
 */

import { Client } from 'pg';
import * as bcrypt from 'bcryptjs';

interface SeedAccount {
  email: string;
  username: string;
  race: 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan' | null;
  level: number;
  age: number;
  /** Set to xpRequiredForLevel(level + 1) so the next level-up succeeds. */
  xpReady: number;
  tierName: string;
  description: string;
}

const PASSWORD = 'Test1234!';

const ACCOUNTS: SeedAccount[] = [
  {
    email: 'test1@nebula.com',
    username: 'test1',
    race: null,
    level: 1,
    age: 1,
    xpReady: 0,
    tierName: 'Tohum',
    description: 'Brand-new account · first login · race not chosen',
  },
  {
    email: 'test2@nebula.com',
    username: 'test2',
    race: 'insan',
    level: 9,
    age: 1,
    xpReady: 100 * 10 * 10, // 10,000
    tierName: 'Metropol',
    description: 'End of Age 1 · ready to advance to Age 2 (Insan)',
  },
  {
    email: 'test3@nebula.com',
    username: 'test3',
    race: 'zerg',
    level: 18,
    age: 2,
    xpReady: 100 * 19 * 19, // 36,100
    tierName: 'Yıldız Hakimi',
    description: 'End of Age 2 · ready to advance to Age 3 (Zerg)',
  },
  {
    email: 'test4@nebula.com',
    username: 'test4',
    race: 'otomat',
    level: 27,
    age: 3,
    xpReady: 100 * 28 * 28, // 78,400
    tierName: 'Sektör Hakimi',
    description: 'End of Age 3 · ready to advance to Age 4 (Otomat)',
  },
  {
    email: 'test5@nebula.com',
    username: 'test5',
    race: 'canavar',
    level: 36,
    age: 4,
    xpReady: 100 * 37 * 37, // 136,900
    tierName: 'Galaktik İmparator',
    description: 'End of Age 4 · ready to advance to Age 5 (Canavar)',
  },
  {
    email: 'test6@nebula.com',
    username: 'test6',
    race: 'seytan',
    level: 45,
    age: 5,
    xpReady: 100 * 46 * 46, // 211,600
    tierName: 'Boyut Tanrısı',
    description: 'End of Age 5 · ready to advance to Age 6 (Seytan)',
  },
];

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  const host = process.env.DB_HOST ?? 'localhost';
  const port = process.env.DB_PORT ?? '5432';
  const user = process.env.DB_USER ?? 'nebula';
  const pass = process.env.DB_PASSWORD ?? '';
  const db = process.env.DB_NAME ?? 'nebula_dominion';
  return `postgresql://${user}:${pass}@${host}:${port}/${db}`;
}

async function main(): Promise<void> {
  const url = resolveDatabaseUrl();
  // Mask the password segment when logging — easy to leak otherwise.
  console.log(`[seed] target: ${url.replace(/:[^:@]*@/, ':***@')}`);

  const hashed = await bcrypt.hash(PASSWORD, 10);
  console.log(`[seed] generated bcrypt hash for password "${PASSWORD}"`);

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    for (const acc of ACCOUNTS) {
      // Upsert user (idempotent by email). ON CONFLICT updates the relevant
      // columns so re-running fixes drift if the script changed since last
      // run. Other columns (created_at, elo_rating) are preserved.
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
      const userId: string = upsertUser.rows[0].id;

      // For accounts past level 1, set tier_progress with XP at the boundary
      // so the very next levelUp() call succeeds. For account 1 the row will
      // be created lazily by tier.service on first request — but we also
      // seed it so the HUD shows the right values immediately.
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
        [
          userId,
          acc.level,
          acc.age,
          acc.tierName,
          acc.xpReady.toString(),
          xpToNextLevel,
        ],
      );

      console.log(
        `[seed] ✓ ${acc.email}  (lv ${acc.level} age ${acc.age}, xp=${acc.xpReady})  — ${acc.description}`,
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

main().catch((err) => {
  console.error('[seed] FAILED:', err.message);
  process.exit(1);
});
