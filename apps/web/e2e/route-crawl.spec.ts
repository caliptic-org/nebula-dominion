/* Route smoke crawler — visits every public + authenticated route as test2
 * and reports HTTP status, console errors, and obvious 4xx/5xx network
 * failures. Designed to run as part of the autonomous QA loop:
 *
 *   pnpm --filter @nebula-dominion/web exec playwright test e2e/route-crawl.spec.ts
 *
 * Bypasses `webServer` startup by reusing the running dev server when
 * present (the playwright.config has reuseExistingServer:!process.env.CI).
 *
 * Output is a single console block per route, plus a final JSON summary
 * that can be diff'd between baseline and post-fix runs.
 */

import { expect, test } from '@playwright/test';

const ROUTES = [
  '/',
  '/login',
  '/register',
  '/base',
  '/base/build',
  '/base/production',
  '/inventory',
  '/profile',
  '/settings',
  '/missions',
  '/commanders',
  '/merge',
  '/alliance',
  '/shop',
  '/map',
  '/leaderboard',
  '/battle-prep',
  '/battle',
  '/battle-result',
  '/research',
  '/customization',
  '/vip',
  '/events',
  '/mail',
  '/chat',
  '/formation',
  '/stats',
  '/race-select',
  '/race-confirm',
  '/tier-up',
  '/story-gallery',
  '/story',
  '/splash',
  '/handoff',
  '/tutorial?step=1',
  '/tutorial?step=2',
  '/tutorial?step=3',
  '/tutorial?step=4',
  '/tutorial?step=5',
  '/tutorial?step=6',
];

interface RouteResult {
  route: string;
  httpStatus: number;
  consoleErrors: string[];
  failedRequests: { url: string; status: number }[];
  jsExceptions: string[];
}

/* Login as test2 so authenticated screens render their populated state
 * rather than the guest mock. We post directly to the api login endpoint
 * and stash the JWT in localStorage under the same keys session.ts uses. */
async function loginAsTest2(page: import('@playwright/test').Page) {
  const res = await page.request.post('http://localhost:4000/api/v1/auth/login', {
    data: { identifier: 'test2@nebula.com', password: 'Test1234!' },
  });
  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()} ${await res.text()}`);
  }
  const body = (await res.json()) as { accessToken: string; refreshToken?: string };
  await page.addInitScript(
    ({ access, refresh }) => {
      window.localStorage.setItem('accessToken', access);
      if (refresh) window.localStorage.setItem('refreshToken', refresh);
    },
    { access: body.accessToken, refresh: body.refreshToken ?? null },
  );
}

test('crawl every route and report failures', async ({ page }, testInfo) => {
  testInfo.setTimeout(15 * 60 * 1000); // 15 min total budget

  await loginAsTest2(page);

  const results: RouteResult[] = [];

  for (const route of ROUTES) {
    const consoleErrors: string[] = [];
    const failedRequests: { url: string; status: number }[] = [];
    const jsExceptions: string[] = [];

    const onConsole = (msg: import('@playwright/test').ConsoleMessage) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    };
    const onResponse = (res: import('@playwright/test').Response) => {
      const status = res.status();
      if (status >= 400) {
        // Suppress noisy 404s for known-missing-asset paths so the report
        // surfaces only real problems.
        const url = res.url();
        if (/\/assets\/tiles\//.test(url)) return; // tile sprite probes
        if (/\/_next\//.test(url)) return; // Next.js dev probes
        if (/\.well-known\//.test(url)) return; // Chrome devtools probe
        failedRequests.push({ url, status });
      }
    };
    const onPageError = (err: Error) => {
      jsExceptions.push(err.message);
    };

    page.on('console', onConsole);
    page.on('response', onResponse);
    page.on('pageerror', onPageError);

    let httpStatus = 0;
    try {
      const resp = await page.goto(`http://localhost:3000${route}`, {
        waitUntil: 'networkidle',
        timeout: 30_000,
      });
      httpStatus = resp?.status() ?? 0;
      // Give SWR/React a beat to fire any post-render fetches.
      await page.waitForTimeout(800);
    } catch (err) {
      jsExceptions.push(`navigate error: ${err instanceof Error ? err.message : String(err)}`);
    }

    page.off('console', onConsole);
    page.off('response', onResponse);
    page.off('pageerror', onPageError);

    results.push({ route, httpStatus, consoleErrors, failedRequests, jsExceptions });

    // eslint-disable-next-line no-console
    console.log(
      `[crawl] ${route.padEnd(25)} ${String(httpStatus).padEnd(4)} ` +
        `console:${consoleErrors.length} req4xx:${failedRequests.length} ex:${jsExceptions.length}`,
    );
  }

  // Persist machine-readable summary to a stable path so the autonomous
  // loop can diff it across runs.
  const fs = await import('node:fs/promises');
  const summaryPath = 'route-crawl-summary.json';
  await fs.writeFile(summaryPath, JSON.stringify(results, null, 2));
  // eslint-disable-next-line no-console
  console.log(`[crawl] DONE — summary saved to ${summaryPath}`);

  // Pass condition: every route returned 2xx/3xx. Console errors and
  // network 4xx are recorded but don't fail the test (we want the FULL
  // picture, not first-failure).
  const non200 = results.filter((r) => r.httpStatus === 0 || r.httpStatus >= 400);
  if (non200.length > 0) {
    // eslint-disable-next-line no-console
    console.error('[crawl] non-2xx routes:', non200);
  }
  expect(non200, `non-2xx routes:\n${JSON.stringify(non200, null, 2)}`).toHaveLength(0);
});
