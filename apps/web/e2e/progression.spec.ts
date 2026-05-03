/**
 * E2E — İlerleme & Çağ Geçişi (CAL-310)
 *
 * Covers:
 *  1. /progression route loads
 *  2. XP bar shows correct percentage
 *  3. Tier badge (Acemi / Deneyimli / Şampiyon)
 *  4. Age timeline shows 6 ages
 *  5. Completed ages marked with ✓
 *  6. Unlocked content list correct
 *  7. Progression updates after xp_gained socket event
 */

import { test, expect, Page } from '@playwright/test';

/* ── Mock data ─────────────────────────────────────────────────────────────── */

const BASE = {
  userId: 'demo-player-001',
  tierBonusMultiplier: 1.0,
  isMaxLevel: false,
};

const MOCK_TIER1 = {
  ...BASE,
  age: 2,
  level: 5,
  tier: 1,
  currentXp: 3000,
  totalXp: 11500,
  xpToNextLevel: 5000,
  xpProgressPercent: 60,
  unlockedContent: ['race_zerg', 'construction_basics'],
};

const MOCK_TIER2 = {
  ...BASE,
  age: 3,
  level: 2,
  tier: 2,
  currentXp: 1200,
  totalXp: 53200,
  xpToNextLevel: 2000,
  xpProgressPercent: 60,
  unlockedContent: ['race_zerg', 'construction_basics', 'mode_ranked'],
  tierBonusMultiplier: 1.25,
};

const MOCK_TIER3 = {
  ...BASE,
  age: 5,
  level: 3,
  tier: 3,
  currentXp: 5000,
  totalXp: 400000,
  xpToNextLevel: 8000,
  xpProgressPercent: 62,
  unlockedContent: ['race_zerg', 'construction_basics', 'mode_ranked', 'advanced_abilities', 'special_maps'],
  tierBonusMultiplier: 1.5,
};

// Player at age 3 with ages 1 and 2 completed
const MOCK_TWO_COMPLETED = {
  ...BASE,
  age: 3,
  level: 1,
  tier: 2,
  currentXp: 0,
  totalXp: 52000,
  xpToNextLevel: 100,
  xpProgressPercent: 0,
  unlockedContent: ['race_zerg', 'construction_basics', 'mode_ranked'],
  tierBonusMultiplier: 1.25,
};

/* ── Helpers ───────────────────────────────────────────────────────────────── */

async function mockApi(page: Page, data: object = MOCK_TIER1) {
  await page.route('**/progression/demo-player-001', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    }),
  );
}

/**
 * Replaces window.WebSocket with a minimal Socket.io-compatible mock so the
 * /game namespace connects without a real server.
 * The mock instance is exposed as window.__mockWS so tests can inject events.
 */
async function installSocketMock(page: Page) {
  await page.addInitScript(() => {
    const _Orig = window.WebSocket;

    function MockWS(url: string, protocols?: string | string[]) {
      if (!String(url).includes('/socket.io/')) {
        return new _Orig(url, protocols as string) as unknown;
      }

      const self: {
        readyState: number;
        _h: Record<string, EventListener[]>;
        onopen: ((e: Event) => void) | null;
        onclose: ((e: CloseEvent) => void) | null;
        onmessage: ((e: MessageEvent) => void) | null;
        onerror: ((e: Event) => void) | null;
        _fire: (ev: string, e: Event) => void;
        _msg: (data: string) => void;
        send: (data: string) => void;
        close: () => void;
        addEventListener: (type: string, fn: EventListener) => void;
        removeEventListener: (type: string, fn: EventListener) => void;
        dispatchEvent: () => boolean;
      } = {
        readyState: 1,
        _h: {},
        onopen: null,
        onclose: null,
        onmessage: null,
        onerror: null,

        _fire(ev, e) {
          const cb = (self as Record<string, unknown>)[`on${ev}`] as ((e: Event) => void) | null;
          if (cb) cb(e);
          (self._h[ev] ?? []).forEach((fn) => fn(e));
        },

        _msg(data) {
          const e = new MessageEvent('message', { data });
          self._fire('message', e);
        },

        send(data) {
          if (data === '2') self._msg('3'); // pong
        },

        close() {
          self.readyState = 3;
        },

        addEventListener(type, fn) {
          self._h[type] = self._h[type] ?? [];
          self._h[type].push(fn);
        },

        removeEventListener(type, fn) {
          self._h[type] = (self._h[type] ?? []).filter((f) => f !== fn);
        },

        dispatchEvent() { return true; },
      };

      (window as unknown as Record<string, unknown>).__mockWS = self;

      // Simulate Engine.IO open + Socket.io /game namespace connect
      setTimeout(() => {
        self._fire('open', new Event('open'));
        self._msg('0{"sid":"t","upgrades":[],"pingInterval":25000,"pingTimeout":5000,"maxPayload":1000000}');
        self._msg('40/game,{"sid":"t"}');
      }, 20);

      return self;
    }

    (MockWS as unknown as Record<string, number>).CONNECTING = 0;
    (MockWS as unknown as Record<string, number>).OPEN = 1;
    (MockWS as unknown as Record<string, number>).CLOSING = 2;
    (MockWS as unknown as Record<string, number>).CLOSED = 3;

    window.WebSocket = MockWS as unknown as typeof WebSocket;
  });
}

/* ── Suite ─────────────────────────────────────────────────────────────────── */

test.describe('/progression sayfası', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await installSocketMock(page);
  });

  /* 1 ── Route loads ───────────────────────────────────────────────────────── */

  test('/progression route yükleniyor', async ({ page }) => {
    await page.goto('/progression');

    await expect(page.locator('header')).toBeVisible();
    // Badge in the header
    await expect(page.getByText('İlerleme').first()).toBeVisible();
    // Section headings
    await expect(page.getByText('Oyuncu Profili')).toBeVisible();
    await expect(page.getByText('Çağ Zaman Çizelgesi')).toBeVisible();
  });

  /* 2 ── XP bar percentage ─────────────────────────────────────────────────── */

  test('XP bar doğru yüzdeyi gösteriyor (%60)', async ({ page }) => {
    await page.goto('/progression');

    await expect(page.getByText('XP İlerlemesi')).toBeVisible();

    // The fill div uses inline style `width: 60%`
    const fill = page.locator('div[style*="width: 60%"]').first();
    await expect(fill).toBeVisible();
  });

  /* 3a ── Tier badge: Acemi ────────────────────────────────────────────────── */

  test('tier badge — Acemi (tier 1)', async ({ page }) => {
    await page.goto('/progression');

    // Tier name is rendered inside the Oyuncu Profili panel and in the header
    await expect(page.getByText('Acemi').first()).toBeVisible();
  });

  /* 3b ── Tier badge: Deneyimli ────────────────────────────────────────────── */

  test('tier badge — Deneyimli (tier 2)', async ({ page }) => {
    await mockApi(page, MOCK_TIER2);
    await page.goto('/progression');

    await expect(page.getByText('Deneyimli').first()).toBeVisible();
  });

  /* 3c ── Tier badge: Şampiyon ─────────────────────────────────────────────── */

  test('tier badge — Şampiyon (tier 3)', async ({ page }) => {
    await mockApi(page, MOCK_TIER3);
    await page.goto('/progression');

    await expect(page.getByText('Şampiyon').first()).toBeVisible();
  });

  /* 4 ── Age timeline: 6 ages ─────────────────────────────────────────────── */

  test('çağ timeline 6 çağı gösteriyor', async ({ page }) => {
    await page.goto('/progression');

    for (const label of [
      'Kuruluş Çağı',
      'Genişleme Çağı',
      'Çatışma Çağı',
      'Yıkım Çağı',
      'Yeniden Doğuş',
      'Nebula Hâkimi',
    ]) {
      await expect(page.getByText(label)).toBeVisible();
    }
  });

  /* 5 ── Completed ages marked with ✓ ────────────────────────────────────── */

  test('tamamlanan çağlar ✓ işaretli', async ({ page }) => {
    // Player at age 2 → Age 1 is past → should show ✓ + "Tamamlandı"
    await page.goto('/progression');

    // "Tamamlandı" badge for past age(s)
    await expect(page.getByText('Tamamlandı').first()).toBeVisible();

    // The age number circle for past ages renders '✓' as its sole text content
    await expect(page.getByText('✓', { exact: true }).first()).toBeVisible();
  });

  test('여러 완료된 çağlar — two ages completed', async ({ page }) => {
    await mockApi(page, MOCK_TWO_COMPLETED);
    await page.goto('/progression');

    // Two ages should be completed
    const completedBadges = page.getByText('Tamamlandı');
    await expect(completedBadges).toHaveCount(2);

    // Two ✓ marks in age circles
    const checks = page.getByText('✓', { exact: true });
    await expect(checks).toHaveCount(2);
  });

  /* 6 ── Unlock content list ──────────────────────────────────────────────── */

  test('açık içerikler listesi doğru gösteriyor', async ({ page }) => {
    await page.goto('/progression');

    await expect(page.getByText('Açık İçerikler')).toBeVisible();
    await expect(page.getByText('✓ Zerg Irkı')).toBeVisible();
    await expect(page.getByText('✓ Yapı İnşası')).toBeVisible();
  });

  test('açık içerikler — tier 3 daha fazla içerik', async ({ page }) => {
    await mockApi(page, MOCK_TIER3);
    await page.goto('/progression');

    await expect(page.getByText('✓ Ranked Mod')).toBeVisible();
    await expect(page.getByText('✓ Gelişmiş Yetenekler')).toBeVisible();
    await expect(page.getByText('✓ Özel Haritalar')).toBeVisible();
  });

  /* 7 ── XP gain event updates UI ─────────────────────────────────────────── */

  test('XP gain event sonrası progression güncelleniyor', async ({ page }) => {
    await page.goto('/progression');

    // Wait for initial render — "3.000" in Turkish locale (. is thousands separator)
    await expect(page.getByText('XP İlerlemesi')).toBeVisible();
    await expect(page.locator('text=/3\\.000/').first()).toBeVisible();

    // Inject xp_gained event through mock WebSocket
    // Socket.io packet: Engine.IO type 4 (message) + Socket.io type 2 (event) + namespace /game
    await page.evaluate(() => {
      const ws = (window as unknown as Record<string, { _msg: (d: string) => void }>).__mockWS;
      if (!ws) throw new Error('__mockWS not found — socket mock not installed');
      ws._msg(
        '42/game,["xp_gained",{"xpGained":500,"source":"daily_mission","currentXp":3500,"xpToNext":4500,"currentLevel":5,"age":2}]',
      );
    });

    // XP display should update to 3.500
    await expect(page.locator('text=/3\\.500/').first()).toBeVisible({ timeout: 5_000 });
  });
});

/* ── Boundary / edge cases ──────────────────────────────────────────────────── */

test.describe('/progression — edge cases', () => {
  test('API hata durumunda sayfa çökmüyor (graceful loading)', async ({ page }) => {
    await page.route('**/progression/demo-player-001', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' }),
    );
    await installSocketMock(page);

    await page.goto('/progression');

    // Page should still render the shell even without data
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByText('Çağ Zaman Çizelgesi')).toBeVisible();
  });

  test('max level oyuncusu isMaxLevel: true gösteriyor', async ({ page }) => {
    const maxPlayer = {
      userId: 'demo-player-001',
      age: 6,
      level: 9,
      tier: 3,
      currentXp: 950000,
      totalXp: 950000,
      xpToNextLevel: null,
      xpProgressPercent: 100,
      unlockedContent: ['race_zerg', 'construction_basics', 'mode_ranked', 'advanced_abilities', 'special_maps', 'advanced_tactics'],
      tierBonusMultiplier: 1.5,
      isMaxLevel: true,
    };

    await mockApi(page, maxPlayer);
    await installSocketMock(page);
    await page.goto('/progression');

    // Stats grid shows "Evet" for Max Seviye
    await expect(page.getByText('Evet')).toBeVisible();
    // All prior 5 ages should be completed
    const checks = page.getByText('✓', { exact: true });
    await expect(checks).toHaveCount(5);
  });
});
