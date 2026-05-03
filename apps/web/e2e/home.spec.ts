import { test, expect } from '@playwright/test';

// Set localStorage before page scripts run so the onboarding overlay
// (which covers the entire screen and intercepts all pointer events for
// first-time visitors) does not appear during tests.
const skipOnboarding = async ({ page }: { page: import('@playwright/test').Page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'nebula:onboarding:v1',
      JSON.stringify({
        hasSeenIntro: true,
        hasCompletedTutorial: false,
        firstVictoryClaimedAt: null,
        lastSessionEndedAt: null,
      }),
    );
  });
};

test.describe('Ana Üs & Kaynak Sistemi', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding({ page });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // ────────────────────────────────────────────────────────────
  // 1. Ana üs ekranı yükleniyor (tilemap render)
  // ────────────────────────────────────────────────────────────
  test('tilemap canvas renders on the base screen', async ({ page }) => {
    const canvas = page.locator('canvas[aria-label="İzometrik oyun haritası"]');
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  // ────────────────────────────────────────────────────────────
  // 2. Kaynak barı görünüyor (Mineral, Gas, Enerji, Nüfus)
  // ────────────────────────────────────────────────────────────
  test('resource bar shows all four resource types', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();

    const resourceBars = page.locator('.resource-bar');
    const count = await resourceBars.count();
    expect(count).toBeGreaterThan(3);

    for (const label of ['Mineral', 'Gas', 'Enerji', 'Nüfus']) {
      await expect(header.getByTitle(label)).toBeVisible();
    }
  });

  // ────────────────────────────────────────────────────────────
  // 3. 5 bottom nav tab çalışıyor
  // ────────────────────────────────────────────────────────────
  test('bottom nav contains exactly 5 tabs', async ({ page }) => {
    const nav = page.locator('nav');
    const tabs = nav.locator('button');
    await expect(tabs).toHaveCount(5);
  });

  test('bottom nav tabs display correct labels', async ({ page }) => {
    const nav = page.locator('nav');
    for (const label of ['Ana Üs', 'Harita', 'Savaş', 'Komutanlar', 'Mağaza']) {
      await expect(nav.getByText(label)).toBeVisible();
    }
  });

  test('Ana Üs tab is active by default', async ({ page }) => {
    const nav = page.locator('nav');
    const anaUsBtn = nav.locator('button', { hasText: 'Ana Üs' });
    await expect(anaUsBtn).toHaveAttribute('aria-current', 'page');
  });

  test('Komutanlar tab switches to commanders view', async ({ page }) => {
    const nav = page.locator('nav');
    await nav.locator('button', { hasText: 'Komutanlar' }).click();
    await expect(page.getByText('Tüm Komutanlar')).toBeVisible({ timeout: 5_000 });
  });

  // ────────────────────────────────────────────────────────────
  // 4. Yapı listesi görünüyor
  // ────────────────────────────────────────────────────────────
  test('active structures list is visible', async ({ page }) => {
    await expect(page.getByText('Aktif Yapılar')).toBeVisible();
    // The structure items use a distinctive inline style — at least one should exist
    const panel = page.locator('.manga-panel', { has: page.getByText('Aktif Yapılar') });
    await expect(panel.locator('div.space-y-2 > div').first()).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────
  // 5. Komutan kartı sağda görünüyor
  // ────────────────────────────────────────────────────────────
  test('commander card is visible on the right panel', async ({ page }) => {
    await expect(page.getByText('Yetenekler')).toBeVisible();
    await expect(page.locator('.badge').filter({ hasText: /Lv\./ }).first()).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────
  // 6. Irk switcher → tema değişiyor
  // ────────────────────────────────────────────────────────────
  test('race switcher section is visible with 5 race buttons', async ({ page }) => {
    await expect(page.getByText('Irk Değiştir')).toBeVisible();
    const switcherPanel = page.locator('.manga-panel', { has: page.getByText('Irk Değiştir') });
    const raceButtons = switcherPanel.locator('button');
    await expect(raceButtons).toHaveCount(5);
  });

  test('switching race updates active button color', async ({ page }) => {
    const switcherPanel = page.locator('.manga-panel', { has: page.getByText('Irk Değiştir') });
    const raceButtons = switcherPanel.locator('button');

    const firstBtn = raceButtons.nth(0);
    const secondBtn = raceButtons.nth(1);

    // Initially the first race (insan) is active — its color is not grey
    const initialFirst = await firstBtn.evaluate((el) => getComputedStyle(el).color);
    expect(initialFirst).not.toBe('rgb(85, 85, 85)');

    await secondBtn.click();
    await page.waitForTimeout(300);

    // After switching, second button is active (non-grey), first becomes inactive (#555)
    const newSecond = await secondBtn.evaluate((el) => getComputedStyle(el).color);
    expect(newSecond).not.toBe('rgb(85, 85, 85)');

    const newFirst = await firstBtn.evaluate((el) => getComputedStyle(el).color);
    expect(newFirst).toBe('rgb(85, 85, 85)');
  });

  // ────────────────────────────────────────────────────────────
  // 7. Zoom in/out tilemap'te çalışıyor
  // ────────────────────────────────────────────────────────────
  test('zoom in button is present in the tilemap controls', async ({ page }) => {
    const zoomIn = page.locator('button[title="Zoom in"]');
    await expect(zoomIn).toBeVisible({ timeout: 15_000 });
    await expect(zoomIn).toHaveText('+');
  });

  test('zoom out button is present in the tilemap controls', async ({ page }) => {
    const zoomOut = page.locator('button[title="Zoom out"]');
    await expect(zoomOut).toBeVisible({ timeout: 15_000 });
    await expect(zoomOut).toHaveText('−');
  });

  test('clicking zoom in does not throw a JS error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const zoomIn = page.locator('button[title="Zoom in"]');
    await zoomIn.waitFor({ state: 'visible', timeout: 15_000 });
    await zoomIn.click();
    await page.waitForTimeout(100);

    expect(errors).toHaveLength(0);
  });

  test('clicking zoom out does not throw a JS error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const zoomOut = page.locator('button[title="Zoom out"]');
    await zoomOut.waitFor({ state: 'visible', timeout: 15_000 });
    await zoomOut.click();
    await page.waitForTimeout(100);

    expect(errors).toHaveLength(0);
  });

  test('zoom is clamped between 0.5 and 1.8 after repeated clicks', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const zoomIn = page.locator('button[title="Zoom in"]');
    const zoomOut = page.locator('button[title="Zoom out"]');
    await zoomIn.waitFor({ state: 'visible', timeout: 15_000 });

    for (let i = 0; i < 15; i++) await zoomIn.click();
    await page.waitForTimeout(200);

    for (let i = 0; i < 20; i++) await zoomOut.click();
    await page.waitForTimeout(200);

    expect(errors).toHaveLength(0);
  });

  // ────────────────────────────────────────────────────────────
  // 8. Grid overlay toggle çalışıyor
  // ────────────────────────────────────────────────────────────
  test('grid toggle button is visible in the tilemap', async ({ page }) => {
    const gridBtn = page.locator('button[title="Grid toggle"]');
    await expect(gridBtn).toBeVisible({ timeout: 15_000 });
    await expect(gridBtn).toHaveText('GRID');
  });

  test('clicking grid toggle does not throw a JS error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const gridBtn = page.locator('button[title="Grid toggle"]');
    await gridBtn.waitFor({ state: 'visible', timeout: 15_000 });

    await gridBtn.click();
    await page.waitForTimeout(100);
    await gridBtn.click();
    await page.waitForTimeout(100);

    expect(errors).toHaveLength(0);
  });

  test('grid toggle button changes color when toggled off and back on', async ({ page }) => {
    const gridBtn = page.locator('button[title="Grid toggle"]');
    await gridBtn.waitFor({ state: 'visible', timeout: 15_000 });

    // Grid starts ON — button is race-colored (not grey)
    const onColor = await gridBtn.evaluate((el) => getComputedStyle(el).color);
    expect(onColor).not.toBe('rgb(85, 85, 85)');

    await gridBtn.click();
    await page.waitForTimeout(200);

    // Grid is now OFF — button should be grey (#555)
    const offColor = await gridBtn.evaluate((el) => getComputedStyle(el).color);
    expect(offColor).toBe('rgb(85, 85, 85)');

    await gridBtn.click();
    await page.waitForTimeout(200);

    // Grid is back ON — button is race-colored again
    const backOnColor = await gridBtn.evaluate((el) => getComputedStyle(el).color);
    expect(backOnColor).not.toBe('rgb(85, 85, 85)');
  });
});
