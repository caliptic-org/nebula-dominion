/**
 * API Smoke Tests — CAL-313
 *
 * Tests all critical backend endpoints.
 * Requires a running API stack. Configure via env:
 *   API_BASE_URL    (default: http://localhost:4000)
 *   GAME_SERVER_URL (default: http://localhost:5000)
 *
 * Run in CI after docker-compose.test.yml is healthy:
 *   jest --testPathPattern smoke
 */

import * as http from 'http';
import * as https from 'https';

const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const GAME_SERVER_URL = (process.env.GAME_SERVER_URL ?? 'http://localhost:5000').replace(/\/$/, '');

const SMOKE_USER = {
  email: `smoke.test.${Date.now()}@nebula.test`,
  username: `smokebot${Date.now()}`.slice(0, 20),
  password: 'SmokeT3st!Pass',
};

const SUITE_TIMEOUT = 15_000;

// ── HTTP helper ────────────────────────────────────────────────────────────────

interface RequestOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

interface HttpResult {
  status: number;
  body: unknown;
}

function request(opts: RequestOptions): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const url = new URL(opts.url);
    const mod = url.protocol === 'https:' ? https : http;
    const bodyStr = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;

    const req = mod.request(
      {
        hostname: url.hostname,
        port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: opts.method ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr).toString() } : {}),
          ...opts.headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk: Buffer) => (raw += chunk));
        res.on('end', () => {
          let body: unknown = raw;
          try {
            body = JSON.parse(raw);
          } catch {}
          resolve({ status: res.statusCode ?? 0, body });
        });
      },
    );

    req.setTimeout(SUITE_TIMEOUT - 2000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const api = (path: string) => `${API_BASE_URL}${path}`;
const game = (path: string) => `${GAME_SERVER_URL}${path}`;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// ── Shared state ───────────────────────────────────────────────────────────────

let accessToken = '';

// ── Auth ───────────────────────────────────────────────────────────────────────

describe('Auth: POST /auth/register, POST /auth/login, GET /auth/me', () => {
  it('POST /auth/register → 201 with accessToken + user', async () => {
    const res = await request({
      url: api('/auth/register'),
      method: 'POST',
      body: SMOKE_USER,
    });

    // 409 is acceptable if a leftover test user exists from a previous run
    expect([201, 409]).toContain(res.status);

    if (res.status === 201) {
      const body = res.body as Record<string, unknown>;
      expect(typeof body.accessToken).toBe('string');
      expect(body).toHaveProperty('user');
      accessToken = body.accessToken as string;
    }
  }, SUITE_TIMEOUT);

  it('POST /auth/login → 200 with accessToken', async () => {
    const res = await request({
      url: api('/auth/login'),
      method: 'POST',
      body: { email: SMOKE_USER.email, password: SMOKE_USER.password },
    });

    // If register returned 409 the user still exists — login must succeed
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(typeof body.accessToken).toBe('string');
    expect(body).toHaveProperty('user');

    accessToken = body.accessToken as string; // always refresh token
  }, SUITE_TIMEOUT);

  it('POST /auth/login invalid credentials → 401', async () => {
    const res = await request({
      url: api('/auth/login'),
      method: 'POST',
      body: { email: 'nobody@nowhere.test', password: 'wrongpassword' },
    });
    expect(res.status).toBe(401);
  }, SUITE_TIMEOUT);

  it('GET /auth/me without token → 401', async () => {
    const res = await request({ url: api('/auth/me') });
    expect(res.status).toBe(401);
  }, SUITE_TIMEOUT);

  it('GET /auth/me with valid token → 200 with user object', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({ url: api('/auth/me'), headers: auth(accessToken) });
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('email');
  }, SUITE_TIMEOUT);
});

// ── VIP ────────────────────────────────────────────────────────────────────────

describe('VIP: GET /api/v1/vip/status, GET /api/v1/vip/tiers', () => {
  it('GET /api/v1/vip/status without token → 401', async () => {
    const res = await request({ url: api('/api/v1/vip/status') });
    expect(res.status).toBe(401);
  }, SUITE_TIMEOUT);

  it('GET /api/v1/vip/status with valid token → 200 with vipLevel', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({ url: api('/api/v1/vip/status'), headers: auth(accessToken) });
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty('vipLevel');
  }, SUITE_TIMEOUT);

  it('GET /api/v1/vip/tiers → 200 array (public endpoint)', async () => {
    const res = await request({ url: api('/api/v1/vip/tiers') });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  }, SUITE_TIMEOUT);
});

// ── Stats ──────────────────────────────────────────────────────────────────────

describe('Stats: GET /api/v1/stats/{power-breakdown,buffs/active,battle}', () => {
  it('GET /api/v1/stats/power-breakdown without token → 401', async () => {
    const res = await request({ url: api('/api/v1/stats/power-breakdown') });
    expect(res.status).toBe(401);
  }, SUITE_TIMEOUT);

  it('GET /api/v1/stats/power-breakdown with token → 200', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({ url: api('/api/v1/stats/power-breakdown'), headers: auth(accessToken) });
    expect(res.status).toBe(200);
  }, SUITE_TIMEOUT);

  it('GET /api/v1/stats/buffs/active without token → 401', async () => {
    const res = await request({ url: api('/api/v1/stats/buffs/active') });
    expect(res.status).toBe(401);
  }, SUITE_TIMEOUT);

  it('GET /api/v1/stats/buffs/active with token → 200', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({ url: api('/api/v1/stats/buffs/active'), headers: auth(accessToken) });
    expect(res.status).toBe(200);
  }, SUITE_TIMEOUT);

  it('GET /api/v1/stats/battle without token → 401', async () => {
    const res = await request({ url: api('/api/v1/stats/battle') });
    expect(res.status).toBe(401);
  }, SUITE_TIMEOUT);

  it('GET /api/v1/stats/battle with token → 200', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({ url: api('/api/v1/stats/battle'), headers: auth(accessToken) });
    expect(res.status).toBe(200);
  }, SUITE_TIMEOUT);
});

// ── Leaderboard ────────────────────────────────────────────────────────────────

describe('Leaderboard: GET /api/v1/leaderboard, /api/v1/leaderboard/me', () => {
  it('GET /api/v1/leaderboard without token → 401', async () => {
    const res = await request({ url: api('/api/v1/leaderboard') });
    expect(res.status).toBe(401);
  }, SUITE_TIMEOUT);

  it('GET /api/v1/leaderboard with token → 200', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({ url: api('/api/v1/leaderboard'), headers: auth(accessToken) });
    expect(res.status).toBe(200);
  }, SUITE_TIMEOUT);

  it('GET /api/v1/leaderboard/me without token → 401', async () => {
    const res = await request({ url: api('/api/v1/leaderboard/me') });
    expect(res.status).toBe(401);
  }, SUITE_TIMEOUT);

  it('GET /api/v1/leaderboard/me with token → 200', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({ url: api('/api/v1/leaderboard/me'), headers: auth(accessToken) });
    expect(res.status).toBe(200);
  }, SUITE_TIMEOUT);
});

// ── Events ─────────────────────────────────────────────────────────────────────

describe('Events: GET /api/events, GET /api/events/:id', () => {
  it('GET /api/events → 200 with array (public)', async () => {
    const res = await request({ url: api('/api/events') });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  }, SUITE_TIMEOUT);

  it('GET /api/events/:id → 400 for non-UUID param', async () => {
    const res = await request({ url: api('/api/events/not-a-uuid') });
    expect(res.status).toBe(400);
  }, SUITE_TIMEOUT);

  it('GET /api/events/:id → 404 for unknown UUID', async () => {
    const res = await request({ url: api('/api/events/00000000-0000-0000-0000-000000000000') });
    expect(res.status).toBe(404);
  }, SUITE_TIMEOUT);
});

// ── Mail ───────────────────────────────────────────────────────────────────────

describe('Mail: GET /api/v1/mail, POST /api/v1/mail/:id/claim', () => {
  it('GET /api/v1/mail without token → 401', async () => {
    const res = await request({ url: api('/api/v1/mail') });
    expect(res.status).toBe(401);
  }, SUITE_TIMEOUT);

  it('GET /api/v1/mail with token → 200 with items array', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({ url: api('/api/v1/mail'), headers: auth(accessToken) });
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty('items');
  }, SUITE_TIMEOUT);

  it('POST /api/v1/mail/:id/claim without token → 401', async () => {
    const res = await request({
      url: api('/api/v1/mail/00000000-0000-0000-0000-000000000000/claim'),
      method: 'POST',
    });
    expect(res.status).toBe(401);
  }, SUITE_TIMEOUT);

  it('POST /api/v1/mail/:id/claim for non-existent mail → 404', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({
      url: api('/api/v1/mail/00000000-0000-0000-0000-000000000000/claim'),
      method: 'POST',
      headers: auth(accessToken),
    });
    expect([404, 422]).toContain(res.status);
  }, SUITE_TIMEOUT);
});

// ── Inventory ─────────────────────────────────────────────────────────────────

describe('Inventory: GET /api/inventory', () => {
  it('GET /api/inventory without token → 401', async () => {
    const res = await request({ url: api('/api/inventory') });
    expect(res.status).toBe(401);
  }, SUITE_TIMEOUT);

  it('GET /api/inventory with token → 200 with items array', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({ url: api('/api/inventory'), headers: auth(accessToken) });
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty('items');
  }, SUITE_TIMEOUT);
});

// ── Equipment ─────────────────────────────────────────────────────────────────

describe('Equipment: GET /api/commanders/:id/equipment', () => {
  it('GET /api/v1/commanders/:id/equipment without token → 401', async () => {
    const res = await request({
      url: api('/api/v1/commanders/00000000-0000-0000-0000-000000000000/equipment'),
    });
    expect(res.status).toBe(401);
  }, SUITE_TIMEOUT);

  it('GET /api/v1/commanders/:id/equipment with token → 200 or 404', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({
      url: api('/api/v1/commanders/00000000-0000-0000-0000-000000000000/equipment'),
      headers: auth(accessToken),
    });
    // 404 is acceptable — the commander does not exist for test user
    expect([200, 404]).toContain(res.status);
  }, SUITE_TIMEOUT);
});

// ── Cosmetics ─────────────────────────────────────────────────────────────────

describe('Cosmetics: GET /api/cosmetics, GET /api/user/balance', () => {
  it('GET /api/cosmetics without token → 401', async () => {
    const res = await request({ url: api('/api/cosmetics') });
    expect(res.status).toBe(401);
  }, SUITE_TIMEOUT);

  it('GET /api/cosmetics with token → 200 with array', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({ url: api('/api/cosmetics'), headers: auth(accessToken) });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  }, SUITE_TIMEOUT);

  it('GET /api/user/balance without token → 401', async () => {
    const res = await request({ url: api('/api/user/balance') });
    expect(res.status).toBe(401);
  }, SUITE_TIMEOUT);

  it('GET /api/user/balance with token → 200 with gems field', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({ url: api('/api/user/balance'), headers: auth(accessToken) });
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(typeof body.gems).toBe('number');
  }, SUITE_TIMEOUT);
});

// ── Map ────────────────────────────────────────────────────────────────────────

describe('Map: GET /api/map/state, GET /api/player/resources', () => {
  it('GET /api/map/state without token → 401', async () => {
    const res = await request({ url: api('/api/map/state') });
    expect([401, 403]).toContain(res.status);
  }, SUITE_TIMEOUT);

  it('GET /api/map/state with token → 200', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({ url: api('/api/map/state'), headers: auth(accessToken) });
    expect(res.status).toBe(200);
  }, SUITE_TIMEOUT);

  it('GET /api/player/resources without token → 401', async () => {
    const res = await request({ url: api('/api/player/resources') });
    expect([400, 401, 403]).toContain(res.status);
  }, SUITE_TIMEOUT);

  it('GET /api/player/resources with token → 200', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({ url: api('/api/player/resources'), headers: auth(accessToken) });
    expect(res.status).toBe(200);
  }, SUITE_TIMEOUT);
});

// ── Chat (REST fallback) ───────────────────────────────────────────────────────

describe('Chat: GET /api/chat/messages', () => {
  it('GET /api/chat/messages without token → 401', async () => {
    const res = await request({ url: api('/api/chat/messages') });
    expect(res.status).toBe(401);
  }, SUITE_TIMEOUT);

  it('GET /api/chat/messages with token → 200', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({ url: api('/api/chat/messages'), headers: auth(accessToken) });
    expect(res.status).toBe(200);
  }, SUITE_TIMEOUT);
});

// ── Guild ─────────────────────────────────────────────────────────────────────

describe('Guild: GET /api/guilds/:id, GET /api/guilds/:id/research/buffs', () => {
  const UNKNOWN_GUILD = '00000000-0000-0000-0000-000000000000';

  it('GET /api/guilds/:id without token → 401', async () => {
    const res = await request({ url: api(`/api/guilds/${UNKNOWN_GUILD}`) });
    expect([401, 403]).toContain(res.status);
  }, SUITE_TIMEOUT);

  it('GET /api/guilds/:id with token → 200 or 404', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({
      url: api(`/api/guilds/${UNKNOWN_GUILD}`),
      headers: auth(accessToken),
    });
    expect([200, 404]).toContain(res.status);
  }, SUITE_TIMEOUT);

  it('GET /api/guilds/:id/research/buffs without token → 401', async () => {
    const res = await request({ url: api(`/api/guilds/${UNKNOWN_GUILD}/research/buffs`) });
    expect([401, 403]).toContain(res.status);
  }, SUITE_TIMEOUT);

  it('GET /api/guilds/:id/research/buffs with token → 200 or 404', async () => {
    expect(accessToken).toBeTruthy();
    const res = await request({
      url: api(`/api/guilds/${UNKNOWN_GUILD}/research/buffs`),
      headers: auth(accessToken),
    });
    expect([200, 404]).toContain(res.status);
  }, SUITE_TIMEOUT);
});

// ── Arena / Guild Rank ─────────────────────────────────────────────────────────

describe('Arena: GET /api/v1/guild-rank/leaderboard', () => {
  it('GET /api/v1/guild-rank/leaderboard → 200 (public weekly rankings)', async () => {
    const res = await request({ url: api('/api/v1/guild-rank/leaderboard') });
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty('data');
  }, SUITE_TIMEOUT);
});

// ── Telemetry ──────────────────────────────────────────────────────────────────

describe('Telemetry: POST /api/v1/events', () => {
  it('POST /api/v1/events without API key → 401 or 403', async () => {
    const res = await request({
      url: api('/api/v1/events'),
      method: 'POST',
      body: { events: [{ name: 'smoke_test', timestamp: new Date().toISOString() }] },
    });
    expect([401, 403]).toContain(res.status);
  }, SUITE_TIMEOUT);

  it('POST /api/v1/events with valid API key → 202 or 200', async () => {
    const apiKey = process.env.TELEMETRY_API_KEY;
    if (!apiKey) {
      console.warn('TELEMETRY_API_KEY not set — skipping authenticated telemetry test');
      return;
    }
    const res = await request({
      url: api('/api/v1/events'),
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: { events: [{ name: 'smoke_test', timestamp: new Date().toISOString() }] },
    });
    expect([200, 202]).toContain(res.status);
  }, SUITE_TIMEOUT);
});

// ── Game Server health (secondary sanity) ─────────────────────────────────────

describe('Game Server: GET /api/health/live', () => {
  it('GET /api/health/live → 200 ok', async () => {
    const res = await request({ url: game('/api/health/live') });
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.status).toBe('ok');
  }, SUITE_TIMEOUT);
});

// ── Main API health ────────────────────────────────────────────────────────────

describe('Health: GET /health/live', () => {
  it('GET /health/live → 200 ok', async () => {
    const res = await request({ url: api('/health/live') });
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.status).toBe('ok');
  }, SUITE_TIMEOUT);

  it('GET /health/ready → 200 ok (DB + Redis reachable)', async () => {
    const res = await request({ url: api('/health/ready') });
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.status).toBe('ok');
  }, SUITE_TIMEOUT);
});
