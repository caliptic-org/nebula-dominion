import { defineConfig, devices } from '@playwright/test';

/**
 * WEB_PORT: reuse the existing dev server on 3000.
 * GAME_SERVER_PORT: the default the client connects to (localhost:3001).
 *   Our mock server runs on this port so no env-var injection is needed.
 */
const WEB_PORT = 3000;
const GAME_SERVER_PORT = 3001;

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/global-setup.ts',
  timeout: 60_000,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      // Mock socket.io game server on the default port the client expects.
      command: `node tests/fixtures/mock-game-server.cjs`,
      port: GAME_SERVER_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        MOCK_GAME_SERVER_PORT: String(GAME_SERVER_PORT),
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // Reuse the running Next.js dev server; only start if not already up.
      command: `node ../../node_modules/next/dist/bin/next dev --port ${WEB_PORT}`,
      port: WEB_PORT,
      reuseExistingServer: true,
      timeout: 90_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
