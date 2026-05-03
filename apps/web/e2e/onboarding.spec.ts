import { test, expect, Page } from '@playwright/test';

const ONBOARDING_KEY = 'nebula:onboarding:v1';
const NEXT_SESSION_DISMISS_KEY = 'nebula:nextSessionHook:dismissedAt';
const BATTLE_TUTORIAL_KEY = 'nebula:tutorial:battle:v1';

async function clearOnboardingState(page: Page) {
  await page.evaluate(
    ([ok, nk, bk]) => {
      localStorage.removeItem(ok);
      localStorage.removeItem(nk);
      localStorage.removeItem(bk);
      localStorage.removeItem('nebula:guildTutorial');
    },
    [ONBOARDING_KEY, NEXT_SESSION_DISMISS_KEY, BATTLE_TUTORIAL_KEY],
  );
}

async function setTutorialCompletedState(page: Page) {
  await page.evaluate(
    ([ok, nk]) => {
      localStorage.setItem(
        ok,
        JSON.stringify({
          hasSeenIntro: true,
          hasCompletedTutorial: true,
          firstVictoryClaimedAt: new Date().toISOString(),
          lastSessionEndedAt: new Date().toISOString(),
        }),
      );
      localStorage.removeItem(nk);
    },
    [ONBOARDING_KEY, NEXT_SESSION_DISMISS_KEY],
  );
}

test.describe('Onboarding & Race Selection Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearOnboardingState(page);
  });

  // --------------------------------------------------------------------------
  // Test 1: Register sonrası /race-select'e yönlendirme
  // --------------------------------------------------------------------------
  test('Register sonrası /race-select yönlendirme', async ({ page }) => {
    await page.route(
      (url) => url.pathname.endsWith('/auth/register'),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ accessToken: 'e2e-test-token' }),
        }),
    );

    await page.goto('/register');

    const form = page.locator('form[aria-label="Kayıt formu"]').first();
    await form.locator('[name="username"]').fill('testkomutan');
    await form.locator('[name="email"]').first().fill('test@galaksi.com');
    await form.locator('[name="password"]').first().fill('testpass123');
    await form.locator('[name="confirmPassword"]').first().fill('testpass123');
    await form.locator('button[type="submit"]').click();

    await expect(page).toHaveURL('/race-select');
  });

  // --------------------------------------------------------------------------
  // Test 2: 5 ırk kartının görünmesi
  // --------------------------------------------------------------------------
  test('5 ırk kartı görünüyor: Zerg, Otomat, Canavar, İnsan, Şeytan', async ({ page }) => {
    await page.goto('/race-select');

    const raceNav = page.locator('nav[aria-label="Irk seçici"]');
    const raceButtons = raceNav.locator('button');
    await expect(raceButtons).toHaveCount(5);

    for (const name of ['Zerg', 'Otomat', 'Canavar', 'İnsan', 'Şeytan']) {
      await expect(raceButtons.filter({ hasText: name })).toBeVisible();
    }
  });

  // --------------------------------------------------------------------------
  // Test 3: Irk seçimi → tema rengi değişiyor
  // --------------------------------------------------------------------------
  test('Irk seçimi tema rengini değiştirir', async ({ page }) => {
    await page.goto('/race-select');

    // Default: insan selected → #4a9eff
    const accentSpan = page.locator('h1 span').last();
    await expect(accentSpan).toHaveCSS('color', 'rgb(74, 158, 255)');

    // Click Zerg → #44ff44
    await page
      .locator('nav[aria-label="Irk seçici"] button')
      .filter({ hasText: 'Zerg' })
      .click();
    await expect(accentSpan).toHaveCSS('color', 'rgb(68, 255, 68)');

    // Click Şeytan → #cc00ff
    await page
      .locator('nav[aria-label="Irk seçici"] button')
      .filter({ hasText: 'Şeytan' })
      .click();
    await expect(accentSpan).toHaveCSS('color', 'rgb(204, 0, 255)');
  });

  // --------------------------------------------------------------------------
  // Test 4: Irk seçimi → Ana Üs'e geçiş
  // --------------------------------------------------------------------------
  test("Irk seçimi → Ana Üs'e yönlendirir", async ({ page }) => {
    await page.goto('/race-select');

    // Select Zerg
    await page
      .locator('nav[aria-label="Irk seçici"] button')
      .filter({ hasText: 'Zerg' })
      .click();

    // Click the "Zerg ile Başla" CTA
    await page.locator('button').filter({ hasText: 'Zerg ile Başla' }).click();

    await expect(page).toHaveURL('/?race=zerg');
  });

  // --------------------------------------------------------------------------
  // Test 5: İlk giriş: sadece 2 CTA görünüyor (progressive disclosure)
  // --------------------------------------------------------------------------
  test('İlk giriş progressive disclosure: sadece 2 CTA görünüyor', async ({ page }) => {
    // Fresh session — no localStorage
    await page.goto('/');

    // OnboardingFirstSession auto-advances intro → cta after 2200ms
    const ctaGroup = page.getByRole('group', { name: 'Ana eylemler' });
    await expect(ctaGroup).toBeVisible({ timeout: 5000 });

    // Exactly 2 action items: one link ("Eğitim Savaşı") + one button ("İnşa Et")
    await expect(ctaGroup.locator('a')).toHaveCount(1);
    await expect(ctaGroup.locator('button')).toHaveCount(1);
    await expect(ctaGroup.locator('a')).toContainText('Eğitim Savaşı');
    await expect(ctaGroup.locator('button')).toContainText('İnşa Et');
  });

  // --------------------------------------------------------------------------
  // Test 6: Tutorial overlay 3 adım görünüyor ve ilerliyor
  //   The TutorialOverlayScene (Phaser canvas) renders 3 battle steps:
  //   select → move → attack ("1/3", "2/3", "3/3").
  //   We verify the battle page loads in tutorial mode and the canvas is active.
  // --------------------------------------------------------------------------
  test('Tutorial overlay 3 adım (Eğitim Savaşı canvas aktif)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((k) => localStorage.removeItem(k), BATTLE_TUTORIAL_KEY);

    await page.goto('/battle?race=insan&mode=pve&tutorial=1');

    // Header shows tutorial mode labels
    await expect(page.getByText('Egitim Savasi')).toBeVisible();
    await expect(page.locator('[aria-label="Egitim modu — kayip imkansiz"]')).toBeVisible();

    // Phaser game canvas renders (3-step overlay is inside the canvas)
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });

    // Tutorial completion NOT yet recorded — all 3 steps remain
    const tutorialDone = await page.evaluate((k) => localStorage.getItem(k), BATTLE_TUTORIAL_KEY);
    expect(tutorialDone).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Test 7: İlk Zafer badge görünüyor (tutorial sonrası)
  // --------------------------------------------------------------------------
  test('İlk Zafer badge tutorial tamamlandıktan sonra görünür', async ({ page }) => {
    await page.goto('/');
    await setTutorialCompletedState(page);
    await page.reload();

    await expect(page.getByTestId('first-victory-badge')).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // Test 8: Next-session hook banner görünüyor
  // --------------------------------------------------------------------------
  test('Next-session hook banner tutorial tamamlandıktan sonra görünür', async ({ page }) => {
    await page.goto('/');
    await setTutorialCompletedState(page);
    await page.reload();

    await expect(page.getByTestId('next-session-hook')).toBeVisible();
  });
});
