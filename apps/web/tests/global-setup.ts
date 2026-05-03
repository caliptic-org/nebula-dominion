import { chromium } from '@playwright/test';

/**
 * Pre-warms the Next.js battle page compilation so the first real test
 * doesn't time out waiting for webpack to bundle Phaser.
 */
async function globalSetup() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    const webBase = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
    await page.goto(`${webBase}/battle?race=insan&mode=pve&userId=player_demo`, {
      timeout: 90_000,
      waitUntil: 'domcontentloaded',
    });
    // Wait for canvas to confirm the game bundle compiled and Phaser booted
    await page.waitForFunction(
      () => {
        const g = (window as typeof window & { __phaserGame?: unknown }).__phaserGame;
        return !!g && document.querySelectorAll('canvas').length > 0;
      },
      { timeout: 60_000 },
    ).catch(() => {
      // If Phaser doesn't fully init, compilation still happened
    });
  } finally {
    await browser.close();
  }
}

export default globalSetup;
