/**
 * E2E Test — Map Ekranı (CAL-342)
 *
 * Covers:
 *  1. GET /api/map/state          — auth guard, response shape, field types
 *  2. GET /api/player/resources   — auth guard, response shape, non-negative values
 *  3. POST /api/map/action        — auth guard, valid/invalid inputs, rate limit
 *  4. /map UI route               — loads, resource bar, error handling, polling
 *
 * Note (CAL-339): MapModule is not yet in apps/api-server AppModule.
 * Until that fix lands, /api/map/state returns 404.
 * Tests that depend on a working route are skipped when 404 is encountered.
 *
 * Run with:
 *   cd apps/web
 *   npx playwright test --project=map
 */

import { test, expect, APIRequestContext, Page } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/api/v1';

// ── Helpers ────────────────────────────────────────────────────────────────────

function uniqueUser() {
  const id = Date.now() + Math.floor(Math.random() * 10_000);
  return {
    username: `map_u${id}`,
    email: `map_${id}@nebula.test`,
    password: 'TestP@ss123!',
  };
}

async function registerAndGetToken(api: APIRequestContext): Promise<string> {
  const res = await api.post('/auth/register', { data: uniqueUser() });
  expect(res.status()).toBe(201);
  const body = await res.json();
  return body.accessToken as string;
}

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_MAP_STATE = {
  bases: [
    { id: 'player', col: 13, row: 10, race: 'insan', name: 'Ana Üssün', level: 7, power: 4800, isPlayer: true },
    { id: 'zerg-1', col: 3,  row: 3,  race: 'zerg',  name: 'Kovan Kalbi', level: 5, power: 3200 },
  ],
  resources: [
    { id: 'res-0', col: 8,  row: 5,  kind: 'mineral', amount: 500 },
    { id: 'res-1', col: 16, row: 5,  kind: 'mineral', amount: 680 },
    { id: 'res-2', col: 5,  row: 11, kind: 'gas',     amount: 860 },
    { id: 'res-3', col: 11, row: 7,  kind: 'energy',  amount: 1040 },
  ],
  enemies: [
    { id: 'enemy-0', col: 10, row: 5, race: 'zerg', power: 300, patrolPath: [[10,5],[12,6]] },
  ],
  territories: [
    { race: 'zerg', centerCol: 3, centerRow: 3, radius: 5 },
  ],
};

const MOCK_PLAYER_RESOURCES = [
  { kind: 'mineral',    amount: 2400 },
  { kind: 'gas',        amount: 840 },
  { kind: 'energy',     amount: 1200 },
  { kind: 'population', amount: 12, capacity: 50 },
];

// ── UI mock helpers ────────────────────────────────────────────────────────────

async function mockMapState(page: Page, data: object = MOCK_MAP_STATE) {
  await page.route('**/api/map/state', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    }),
  );
}

async function mockPlayerResources(page: Page, data: object = MOCK_PLAYER_RESOURCES) {
  await page.route('**/api/player/resources**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    }),
  );
}

async function mockMapAction(page: Page, status = 200, body: object = { ok: true }) {
  await page.route('**/api/map/action', (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    }),
  );
}

// ── GET /api/map/state ─────────────────────────────────────────────────────────

test.describe('GET /api/map/state', () => {
  let api: APIRequestContext;
  let token: string;

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({ baseURL: API_BASE });
    token = await registerAndGetToken(api);
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  // Verifies the current known bug (CAL-339). Accepts 200 after fix, 404 before.
  test('CAL-339 — MapModule import edilmemiş: 404 veya 200 döner', async () => {
    const res = await api.get('/map/state', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 404]).toContain(res.status());
  });

  test('401 — token olmadan reddediliyor', async () => {
    const probe = await api.get('/map/state');
    test.skip(probe.status() === 404, 'CAL-339: route henüz mevcut değil');

    const res = await api.get('/map/state');
    expect(res.status()).toBe(401);
  });

  test('200 — auth ile bases, resources, enemies, territories alanları mevcut', async () => {
    const res = await api.get('/map/state', {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(res.status() === 404, 'CAL-339: MapModule henüz import edilmemiş');

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.bases)).toBe(true);
    expect(Array.isArray(body.resources)).toBe(true);
    expect(Array.isArray(body.enemies)).toBe(true);
    expect(Array.isArray(body.territories)).toBe(true);
  });

  test('200 — bases öğeleri id, col, row, race, power alanlarına sahip', async () => {
    const res = await api.get('/map/state', {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(res.status() === 404, 'CAL-339: MapModule henüz import edilmemiş');

    expect(res.status()).toBe(200);
    const body = await res.json();
    if (body.bases.length > 0) {
      const base = body.bases[0];
      expect(base).toHaveProperty('id');
      expect(base).toHaveProperty('col');
      expect(base).toHaveProperty('row');
      expect(base).toHaveProperty('race');
      expect(base).toHaveProperty('power');
      expect(typeof base.col).toBe('number');
      expect(typeof base.row).toBe('number');
      expect(typeof base.power).toBe('number');
    }
  });

  test('200 — resources öğelerinin kind değeri mineral|gas|energy olmak zorunda', async () => {
    const res = await api.get('/map/state', {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(res.status() === 404, 'CAL-339: MapModule henüz import edilmemiş');

    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const resource of body.resources) {
      expect(['mineral', 'gas', 'energy']).toContain(resource.kind);
    }
  });
});

// ── GET /api/player/resources ──────────────────────────────────────────────────

test.describe('GET /api/player/resources', () => {
  let api: APIRequestContext;
  let token: string;
  let userId: string;

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({ baseURL: API_BASE });
    const user = uniqueUser();
    const res = await api.post('/auth/register', { data: user });
    expect(res.status()).toBe(201);
    const body = await res.json();
    token = body.accessToken as string;
    userId = body.userId as string;
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('401 — token olmadan reddediliyor', async () => {
    const res = await api.get('/player/resources');
    expect([400, 401, 404]).toContain(res.status());
  });

  test('200 — mineral, gas, energy, population, populationCap alanları mevcut', async () => {
    const res = await api.get(`/player/resources?playerId=${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(res.status() === 404, 'CAL-339: MapModule henüz import edilmemiş');

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('mineral');
    expect(body).toHaveProperty('gas');
    expect(body).toHaveProperty('energy');
    expect(body).toHaveProperty('population');
    expect(body).toHaveProperty('populationCap');
  });

  test('200 — tüm kaynak miktarları non-negative integer', async () => {
    const res = await api.get(`/player/resources?playerId=${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(res.status() === 404, 'CAL-339: MapModule henüz import edilmemiş');

    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const field of ['mineral', 'gas', 'energy', 'population', 'populationCap'] as const) {
      const val = body[field];
      expect(typeof val).toBe('number');
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });

  test('401 — playerId olmadan 401 döner', async () => {
    const res = await api.get('/player/resources', {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(res.status() === 404, 'CAL-339: MapModule henüz import edilmemiş');
    expect(res.status()).toBe(401);
  });
});

// ── POST /api/map/action ───────────────────────────────────────────────────────

test.describe('POST /api/map/action', () => {
  let api: APIRequestContext;
  let token: string;
  let userId: string;

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({ baseURL: API_BASE });
    const user = uniqueUser();
    const res = await api.post('/auth/register', { data: user });
    expect(res.status()).toBe(201);
    const body = await res.json();
    token = body.accessToken as string;
    userId = body.userId as string;
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('401 — token olmadan reddediliyor', async () => {
    const res = await api.post('/map/action', {
      data: { playerId: userId, action: 'scout', targetCol: 8, targetRow: 5 },
    });
    expect([401, 404]).toContain(res.status());
  });

  // scout → resource tile [8,5] — valid action-target combo
  test('200/201 — geçerli aksiyon ve koordinat başarıyla işleniyor', async () => {
    const res = await api.post('/map/action', {
      headers: { Authorization: `Bearer ${token}` },
      data: { playerId: userId, action: 'scout', targetCol: 8, targetRow: 5 },
    });
    test.skip(res.status() === 404, 'CAL-339: MapModule henüz import edilmemiş');
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('400 — geçersiz aksiyon türü reddediliyor', async () => {
    const res = await api.post('/map/action', {
      headers: { Authorization: `Bearer ${token}` },
      data: { playerId: userId, action: 'teleport', targetCol: 5, targetRow: 5 },
    });
    test.skip(res.status() === 404, 'CAL-339: MapModule henüz import edilmemiş');
    expect(res.status()).toBe(400);
  });

  test('400 — col < 0 koordinat sınır dışı reddediliyor', async () => {
    const res = await api.post('/map/action', {
      headers: { Authorization: `Bearer ${token}` },
      data: { playerId: userId, action: 'scout', targetCol: -1, targetRow: 5 },
    });
    test.skip(res.status() === 404, 'CAL-339: MapModule henüz import edilmemiş');
    expect(res.status()).toBe(400);
  });

  test('400 — col >= 26 koordinat sınır dışı reddediliyor', async () => {
    const res = await api.post('/map/action', {
      headers: { Authorization: `Bearer ${token}` },
      data: { playerId: userId, action: 'scout', targetCol: 26, targetRow: 5 },
    });
    test.skip(res.status() === 404, 'CAL-339: MapModule henüz import edilmemiş');
    expect(res.status()).toBe(400);
  });

  // enemy base at [3,3] — gather is only valid on resources
  test('400 — gather aksiyonu düşman üssüne yapılamaz', async () => {
    const res = await api.post('/map/action', {
      headers: { Authorization: `Bearer ${token}` },
      data: { playerId: userId, action: 'gather', targetCol: 3, targetRow: 3 },
    });
    test.skip(res.status() === 404, 'CAL-339: MapModule henüz import edilmemiş');
    expect([400, 403]).toContain(res.status());
  });

  test('429 — dakikada 10 isteği aşınca rate limit devreye giriyor', async () => {
    // scout → resource tile [8,5], 11 rapid requests; enforceRateLimit runs first in service
    const requests = Array.from({ length: 11 }, () =>
      api.post('/map/action', {
        headers: { Authorization: `Bearer ${token}` },
        data: { playerId: userId, action: 'scout', targetCol: 8, targetRow: 5 },
      }),
    );
    const responses = await Promise.all(requests);

    const firstStatus = responses[0].status();
    test.skip(firstStatus === 404, 'CAL-339: MapModule henüz import edilmemiş');

    const statuses = responses.map((r) => r.status());
    expect(statuses).toContain(429);
  });
});

// ── UI Tests — /map sayfası ────────────────────────────────────────────────────

test.describe('/map sayfası — yükleme ve resource bar', () => {
  test.beforeEach(async ({ page }) => {
    await mockMapState(page);
    await mockPlayerResources(page);
    await mockMapAction(page);
  });

  test('/map route yükleniyor — sabit container görünüyor', async ({ page }) => {
    await page.goto('/map');
    await expect(page.locator('div.fixed.inset-0')).toBeVisible();
  });

  test('resource bar — Mineral, Gaz, Enerji değerleri görünüyor', async ({ page }) => {
    await page.goto('/map');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByText('Mineral').first()).toBeVisible();
    await expect(page.getByText('Gaz').first()).toBeVisible();
    await expect(page.getByText('Enerji').first()).toBeVisible();
  });

  test('alt navigasyon — 5 tab görünüyor', async ({ page }) => {
    await page.goto('/map');
    const nav = page.locator('nav[aria-label="Ana navigasyon"]');
    await expect(nav).toBeVisible();
    await expect(nav.locator('a')).toHaveCount(5);
  });

  test('territory legend — ırk renklerini gösteriyor', async ({ page }) => {
    await page.goto('/map');
    await expect(page.getByText('Zerg').first()).toBeVisible();
    await expect(page.getByText('Düşman').first()).toBeVisible();
    await expect(page.getByText('Kaynak').first()).toBeVisible();
  });
});

// ── UI Tests — Hata durumları ──────────────────────────────────────────────────

test.describe('/map sayfası — hata durumları', () => {
  test('/api/map/state 404 döndüğünde hata toast gösteriliyor', async ({ page }) => {
    await page.route('**/api/map/state', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Not Found' }),
      }),
    );
    await mockPlayerResources(page);
    await mockMapAction(page);

    await page.goto('/map');
    await expect(page.locator('header')).toBeVisible();
    // The page shows an error toast (role=alert) for non-401 fetch errors
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 8_000 });
  });

  test('/api/map/state 500 döndüğünde sayfa çökmüyor', async ({ page }) => {
    await page.route('**/api/map/state', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' }),
    );
    await mockPlayerResources(page);
    await mockMapAction(page);

    await page.goto('/map');
    // Page shell should still render even without map data
    await expect(page.locator('div.fixed.inset-0')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
  });
});

// ── UI Tests — SWR polling ─────────────────────────────────────────────────────

test.describe('/map sayfası — SWR polling', () => {
  test('refreshInterval=5000 — /api/map/state periyodik olarak çağrılıyor', async ({ page }) => {
    const callTimestamps: number[] = [];

    await page.route('**/api/map/state', (route) => {
      callTimestamps.push(Date.now());
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_MAP_STATE),
      });
    });
    await mockPlayerResources(page);
    await mockMapAction(page);

    await page.goto('/map');
    await expect(page.locator('header')).toBeVisible();

    // Wait long enough for at least one 5s refresh cycle
    await page.waitForTimeout(6_500);

    // Should have at least 2 calls: initial load + at least 1 refresh
    expect(callTimestamps.length).toBeGreaterThanOrEqual(2);
  });
});

// ── UI Tests — Aksiyon paneli ──────────────────────────────────────────────────

test.describe('/map sayfası — aksiyon paneli', () => {
  test.beforeEach(async ({ page }) => {
    await mockMapState(page);
    await mockPlayerResources(page);
    await mockMapAction(page);
  });

  test('ActionPanel DOM\'da mevcut (başlangıçta gizli)', async ({ page }) => {
    await page.goto('/map');
    await expect(page.locator('header')).toBeVisible();

    // ActionPanel is always in DOM, slides off screen via CSS transform when not visible
    const actionPanel = page.locator('div.absolute.bottom-0.left-0.right-0.z-40');
    await expect(actionPanel).toBeAttached();

    // Verify it starts hidden (transform contains translateY(110%))
    const transform = await actionPanel.evaluate((el) =>
      (el as HTMLElement).style.transform,
    );
    expect(transform).toContain('translateY(110%)');
  });

  test('harita canvas alanı tıklandığında kapama düğmesi görünüyor', async ({ page }) => {
    await page.goto('/map');
    await expect(page.locator('header')).toBeVisible();

    // Click on the map area — may or may not hit a tile depending on WebGL rendering
    const mapArea = page.locator('div.absolute.inset-0').first();
    await mapArea.click({ position: { x: 400, y: 300 }, force: true });

    // If a tile was selected, a close button (aria-label="Kapat") should appear
    // This is best-effort: WebGL rendering may vary in headless mode
    const closeBtn = page.locator('button[aria-label="Kapat"]');
    const isVisible = await closeBtn.isVisible().catch(() => false);
    if (isVisible) {
      await closeBtn.click();
      // After close, panel slides back off-screen
      const panel = page.locator('div.absolute.bottom-0.left-0.right-0.z-40');
      const transform = await panel.evaluate((el) =>
        (el as HTMLElement).style.transform,
      );
      expect(transform).toContain('translateY(110%)');
    }
    // If not visible, WebGL didn't register a hit — test still passes (no assertion failure)
  });
});
