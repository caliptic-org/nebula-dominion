import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the Battle (Savaş) E2E test suite.
 * Separate from playwright.config.ts which handles api/auth/guild tests.
 * Run: pnpm test:e2e:battle
 */
const WEB_PORT = 3000;
const GAME_SERVER_PORT = 3001;

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/global-setup.ts',
  timeout: 60_000,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-battle-report' }]],

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'battle',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: `node tests/fixtures/mock-game-server.cjs`,
      port: GAME_SERVER_PORT,
      reuseExistingServer: !process.env.CI,
      env: { MOCK_GAME_SERVER_PORT: String(GAME_SERVER_PORT) },
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `node ../../node_modules/next/dist/bin/next dev --port ${WEB_PORT}`,
      port: WEB_PORT,
      reuseExistingServer: true,
      timeout: 90_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
