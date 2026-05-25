/**
 * One-shot grant of age-appropriate resources to the 6 test accounts.
 *
 * The seed-test-accounts.ts script creates them but doesn't touch the
 * resources table (which lives under game-server but shares the same
 * Postgres). New players start with the entity defaults (500/200/250
 * post-v0.1.6 bump) which is fine for level 1 but leaves test4 (age 3,
 * level 27) and above unable to afford their tier-appropriate buildings.
 *
 * Grant table — picks numbers that comfortably cover one age's worth of
 * building constructions + a few unit trains, and bumps the cap if the
 * new amount would overflow.
 *
 *   ┌────────┬───────┬─────┬──────────────────────────────────────┐
 *   │ Account│ Level │ Age │ mineral / gas / energy │ cap bumps?  │
 *   ├────────┼───────┼─────┼──────────────────────────────────────┤
 *   │ test1  │   1   │  1  │     500 /    200 /    250 │ default  │
 *   │ test2  │   9   │  1  │   2,000 /    800 /  1,000 │ default  │
 *   │ test3  │  18   │  2  │   5,000 /  2,500 /  3,000 │ default  │
 *   │ test4  │  27   │  3  │  15,000 /  7,500 /  6,000 │ default  │
 *   │ test5  │  36   │  4  │  50,000 / 25,000 / 30,000 │ +5x      │
 *   │ test6  │  45   │  5  │ 150,000 / 75,000 / 90,000 │ +20x     │
 *   └────────┴───────┴─────┴──────────────────────────────────────┘
 *
 * Idempotent — re-running just sets each row to the target values; no
 * row duplication, no resource loss.
 *
 * Usage:
 *   DATABASE_URL=postgresql://nebula:nebula_dev_password@localhost:5433/nebula_dominion \
 *     pnpm --filter @nebula-dominion/api exec ts-node scripts/grant-test-resources.ts
 *
 * Connects to localhost:5433 by default (matches the docker-compose
 * host-mapped Postgres port).
 */

import { Client } from 'pg';

interface Grant {
  email: string;
  mineral: number;
  gas: number;
  energy: number;
  mineralCap?: number;
  gasCap?: number;
  energyCap?: number;
}

const GRANTS: Grant[] = [
  // test1 — defaults already cover (500/200/250)
  { email: 'test1@nebula.com', mineral:    500, gas:    200, energy:    250 },
  // test2 — age 1, mid-tier — enough for a barracks + science academy
  { email: 'test2@nebula.com', mineral:  2_000, gas:    800, energy:  1_000 },
  // test3 — age 2, ready for tier-2 builds
  { email: 'test3@nebula.com', mineral:  5_000, gas:  2_500, energy:  3_000 },
  // test4 — age 3, advanced economy
  { email: 'test4@nebula.com', mineral: 15_000, gas:  7_500, energy:  6_000 },
  // test5 — age 4, endgame. Caps need a bump to fit.
  { email: 'test5@nebula.com', mineral: 50_000, gas: 25_000, energy: 30_000,
    mineralCap: 120_000, gasCap: 72_000, energyCap: 42_000 },
  // test6 — age 5, max-tier prep. Big caps so all of it fits.
  { email: 'test6@nebula.com', mineral: 150_000, gas: 75_000, energy: 90_000,
    mineralCap: 480_000, gasCap: 288_000, energyCap: 168_000 },
];

async function main(): Promise<void> {
  const url =
    process.env.DATABASE_URL ||
    'postgresql://nebula:nebula_dev_password@localhost:5433/nebula_dominion';
  const client = new Client({ connectionString: url });
  await client.connect();

  console.log('▶ Granting test-account resources …');

  for (const g of GRANTS) {
    // 1. Find the user.
    const userRes = await client.query<{ id: string; username: string }>(
      `SELECT id, username FROM users WHERE email = $1`,
      [g.email],
    );
    if (userRes.rowCount === 0) {
      console.log(`  ⚠ ${g.email}: no such user — skip (run seed-test-accounts.ts first)`);
      continue;
    }
    const { id: userId, username } = userRes.rows[0];

    // 2. Upsert the resources row.
    const capCols =
      g.mineralCap !== undefined
        ? `, mineral_cap = $5, gas_cap = $6, energy_cap = $7`
        : ``;
    const capVals =
      g.mineralCap !== undefined
        ? [g.mineralCap, g.gasCap, g.energyCap]
        : [];

    const updateSql = `
      UPDATE player_resources
      SET mineral = $2, gas = $3, energy = $4 ${capCols}
      WHERE player_id = $1
    `;
    const updateResult = await client.query(updateSql, [
      userId,
      g.mineral,
      g.gas,
      g.energy,
      ...capVals,
    ]);

    if (updateResult.rowCount === 0) {
      // No resources row yet — create one with defaults + grant amounts.
      const insertCols = g.mineralCap !== undefined
        ? `(player_id, mineral, gas, energy, mineral_cap, gas_cap, energy_cap)`
        : `(player_id, mineral, gas, energy)`;
      const insertPlaceholders = g.mineralCap !== undefined
        ? `($1, $2, $3, $4, $5, $6, $7)`
        : `($1, $2, $3, $4)`;
      await client.query(
        `INSERT INTO player_resources ${insertCols} VALUES ${insertPlaceholders}`,
        [userId, g.mineral, g.gas, g.energy, ...capVals],
      );
      console.log(
        `  + ${username.padEnd(8)} (NEW row) ${g.mineral}/${g.gas}/${g.energy}` +
          (g.mineralCap ? ` cap ${g.mineralCap}/${g.gasCap}/${g.energyCap}` : ''),
      );
    } else {
      console.log(
        `  ✓ ${username.padEnd(8)} = ${g.mineral}/${g.gas}/${g.energy}` +
          (g.mineralCap ? ` cap ${g.mineralCap}/${g.gasCap}/${g.energyCap}` : ''),
      );
    }
  }

  await client.end();
  console.log('▶ Done.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Grant failed:', err);
  process.exit(1);
});
