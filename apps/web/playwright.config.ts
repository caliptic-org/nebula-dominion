import { defineConfig, devices } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/api/v1';
const GAME_BASE = process.env.GAME_BASE_URL ?? 'http://localhost:3001/api';
const WEB_BASE = process.env.WEB_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

  use: {
    baseURL: WEB_BASE,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'api',
      testMatch: /auth\.api\.spec\.ts/,
      use: { baseURL: API_BASE },
    },
    {
      name: 'guild-api',
      testMatch: /guild\.api\.spec\.ts/,
      use: { baseURL: GAME_BASE },
    },
    {
      name: 'chromium',
      testMatch: /auth\.ui\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: WEB_BASE },
    },
  ],
});
