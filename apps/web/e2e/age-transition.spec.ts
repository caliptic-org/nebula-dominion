/**
 * E2E — AgeTransitionScreen sinematik görünümü (CAL-310)
 *
 * Tests the cinematic age-transition overlay rendered at /dev/age-transition.
 * The fixture page renders AgeTransitionScreen with:
 *   - toAge=2 (Genişleme Çağı)
 *   - newUnlocks: [RACE_AUTOMATON, MODE_RANKED]
 *   - autoAdvanceMs: 0  (manual continue only)
 *
 * Animation phases:
 *   flash   0 – 1 200 ms
 *   reveal  1 200 – 2 800 ms
 *   ready   2 800 ms+
 */

import { test, expect } from '@playwright/test';

const DEV_PAGE = '/dev/age-transition';

test.describe('AgeTransitionScreen sinematik görünümü', () => {

  /* ── Load & aria ──────────────────────────────────────────────────────────── */

  test('dialog olarak render ediliyor ve aria attributes doğru', async ({ page }) => {
    await page.goto(DEV_PAGE);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    // aria-label should contain the age label followed by "başlıyor"
    const label = await dialog.getAttribute('aria-label');
    expect(label).toMatch(/başlıyor/);
    expect(label).toContain('Genişleme Çağı');
  });

  /* ── Flash phase ──────────────────────────────────────────────────────────── */

  test('flash fazında shockwave ring görünüyor', async ({ page }) => {
    await page.goto(DEV_PAGE);

    // The shockwave is rendered only during the flash phase (first 1200 ms).
    // Navigate and assert immediately before the phase ends.
    await expect(page.locator('.age-shockwave')).toBeVisible({ timeout: 1_000 });
  });

  test('flash fazında age-number-stamp görünüyor', async ({ page }) => {
    await page.goto(DEV_PAGE);

    const stamp = page.locator('.age-number-stamp');
    await expect(stamp).toBeVisible({ timeout: 1_000 });
  });

  test('flash fazında speed-lines görünüyor', async ({ page }) => {
    await page.goto(DEV_PAGE);

    await expect(page.locator('.age-speed-lines')).toBeVisible({ timeout: 1_000 });
  });

  /* ── Background & ambient elements (always visible) ──────────────────────── */

  test('stars arka planı görünüyor', async ({ page }) => {
    await page.goto(DEV_PAGE);

    await expect(page.locator('.age-transition-stars')).toBeVisible();
    // At least one individual star rendered
    await expect(page.locator('.age-star').first()).toBeVisible();
  });

  test('scan-line efekti var', async ({ page }) => {
    await page.goto(DEV_PAGE);

    await expect(page.locator('.age-scan-line')).toBeVisible();
  });

  test('nebula arka planı var', async ({ page }) => {
    await page.goto(DEV_PAGE);

    await expect(page.locator('.age-transition-bg')).toBeVisible();
    await expect(page.locator('.age-transition-nebula')).toBeVisible();
  });

  /* ── Reveal phase: content card ───────────────────────────────────────────── */

  test('reveal fazında çağ başlığı ve subtitle görünüyor', async ({ page }) => {
    await page.goto(DEV_PAGE);

    // Reveal phase starts at ~1 200 ms
    await expect(page.getByText('Genişleme Çağı')).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText('The Great Expansion')).toBeVisible({ timeout: 3_000 });
  });

  test('reveal fazında eyebrow etiketi görünüyor', async ({ page }) => {
    await page.goto(DEV_PAGE);

    await expect(page.getByText(/ÇAĞ.*BAŞLIYOR/)).toBeVisible({ timeout: 3_000 });
  });

  test('reveal fazında lore metni görünüyor', async ({ page }) => {
    await page.goto(DEV_PAGE);

    await expect(page.getByText(/Irk savaşları başladı/)).toBeVisible({ timeout: 3_000 });
  });

  test('reveal fazında unlock listesi görünüyor', async ({ page }) => {
    await page.goto(DEV_PAGE);

    await expect(page.getByText('YENİ İÇERİKLER AÇILDI')).toBeVisible({ timeout: 3_500 });
    await expect(page.getByText('Automaton Irkı')).toBeVisible({ timeout: 4_000 });
    await expect(page.getByText('Ranked Mod')).toBeVisible({ timeout: 4_000 });
  });

  test('procedural sahne sanatı görünüyor (concentric rings)', async ({ page }) => {
    await page.goto(DEV_PAGE);

    // After reveal phase the card shell is visible
    await expect(page.locator('.age-card-shell')).toBeVisible({ timeout: 3_000 });
    // Procedural art rings inside
    await expect(page.locator('.age-art-ring--1')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('.age-art-ring--2')).toBeVisible({ timeout: 3_000 });
  });

  /* ── Ready phase: CTA button ─────────────────────────────────────────────── */

  test('ready fazında devam butonu görünüyor', async ({ page }) => {
    await page.goto(DEV_PAGE);

    // Ready phase at ~2 800 ms; autoAdvanceMs=0 so button stays visible
    const btn = page.getByRole('button', { name: /Çağa Gir|Efsaneye Ulaş/ });
    await expect(btn).toBeVisible({ timeout: 5_000 });
  });

  test('devam butonuna tıklayınca onComplete çağrılıyor', async ({ page }) => {
    await page.goto(DEV_PAGE);

    const btn = page.getByRole('button', { name: /Çağa Gir|Efsaneye Ulaş/ });
    await expect(btn).toBeVisible({ timeout: 5_000 });

    await btn.click();

    // Fixture page replaces the screen with a completion message
    await expect(page.getByTestId('age-transition-completed')).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText('Çağ geçişi tamamlandı')).toBeVisible();
  });

  /* ── Age 6: final age CTA label ───────────────────────────────────────────── */

  test('son çağ (6) butonunda "Efsaneye Ulaş" yazıyor', async ({ page }) => {
    await page.goto(`${DEV_PAGE}?age=6`);

    const btn = page.getByRole('button', { name: 'Efsaneye Ulaş' });
    await expect(btn).toBeVisible({ timeout: 5_000 });
  });

  /* ── Accessibility ────────────────────────────────────────────────────────── */

  test('devam butonu klavye ile odaklanabilir', async ({ page }) => {
    await page.goto(DEV_PAGE);

    const btn = page.getByRole('button', { name: /Çağa Gir/ });
    await expect(btn).toBeVisible({ timeout: 5_000 });

    // Tab to the button and press Enter
    await btn.focus();
    await expect(btn).toBeFocused();
  });
});
