/**
 * Auth API E2E tests — targets the NestJS api-server directly.
 *
 * Run with:
 *   cd apps/web
 *   npx playwright test --project=api
 *
 * Requires api-server running on API_BASE_URL (default http://localhost:4000/api/v1).
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/api/v1';

function uniqueUser() {
  const id = Date.now() + Math.floor(Math.random() * 10_000);
  return {
    username: `test_u${id}`,
    email: `test_${id}@nebula.test`,
    password: 'TestP@ss123!',
  };
}

// ─── Register ─────────────────────────────────────────────────────────────────

test.describe('POST /auth/register', () => {
  let api: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({ baseURL: API_BASE });
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('201 — successful register returns accessToken and userId', async () => {
    const res = await api.post('/auth/register', { data: uniqueUser() });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(typeof body.accessToken).toBe('string');
    expect(body.accessToken.length).toBeGreaterThan(20);
    expect(typeof body.userId).toBe('string');
  });

  test('409 — duplicate email returns conflict message', async () => {
    const user = uniqueUser();
    await api.post('/auth/register', { data: user });

    const res = await api.post('/auth/register', {
      data: { ...user, username: `alt_${user.username}` },
    });

    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.message).toMatch(/already taken/i);
  });

  test('409 — duplicate username returns conflict message', async () => {
    const user = uniqueUser();
    await api.post('/auth/register', { data: user });

    const res = await api.post('/auth/register', {
      data: { ...user, email: `alt_${user.email}` },
    });

    expect(res.status()).toBe(409);
  });

  test('400 — missing email returns validation error', async () => {
    const { username, password } = uniqueUser();
    const res = await api.post('/auth/register', { data: { username, password } });
    expect(res.status()).toBe(400);
  });

  test('400 — missing username returns validation error', async () => {
    const { email, password } = uniqueUser();
    const res = await api.post('/auth/register', { data: { email, password } });
    expect(res.status()).toBe(400);
  });

  test('400 — missing password returns validation error', async () => {
    const { username, email } = uniqueUser();
    const res = await api.post('/auth/register', { data: { username, email } });
    expect(res.status()).toBe(400);
  });

  test('400 — password shorter than 8 chars returns validation error', async () => {
    const user = uniqueUser();
    const res = await api.post('/auth/register', { data: { ...user, password: 'short' } });
    expect(res.status()).toBe(400);
  });

  test('400 — username with spaces rejected (alphanumeric + underscore only)', async () => {
    const user = uniqueUser();
    const res = await api.post('/auth/register', {
      data: { ...user, username: 'invalid user name' },
    });
    expect(res.status()).toBe(400);
  });

  test('400 — username shorter than 3 chars rejected', async () => {
    const user = uniqueUser();
    const res = await api.post('/auth/register', { data: { ...user, username: 'ab' } });
    expect(res.status()).toBe(400);
  });

  test('400 — invalid email format rejected', async () => {
    const user = uniqueUser();
    const res = await api.post('/auth/register', { data: { ...user, email: 'not-an-email' } });
    expect(res.status()).toBe(400);
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

test.describe('POST /auth/login', () => {
  let api: APIRequestContext;
  let user: { username: string; email: string; password: string };

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({ baseURL: API_BASE });
    user = uniqueUser();
    const res = await api.post('/auth/register', { data: user });
    expect(res.status()).toBe(201);
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('200 — successful login by username returns accessToken and userId', async () => {
    const res = await api.post('/auth/login', {
      data: { identifier: user.username, password: user.password },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.accessToken).toBe('string');
    expect(body.accessToken.length).toBeGreaterThan(20);
    expect(typeof body.userId).toBe('string');
  });

  test('200 — successful login by email returns accessToken', async () => {
    const res = await api.post('/auth/login', {
      data: { identifier: user.email, password: user.password },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.accessToken).toBe('string');
  });

  test('401 — wrong password returns unauthorized', async () => {
    const res = await api.post('/auth/login', {
      data: { identifier: user.username, password: 'WrongP@ss999!' },
    });
    expect(res.status()).toBe(401);
  });

  test('401 — non-existent user returns unauthorized', async () => {
    const res = await api.post('/auth/login', {
      data: { identifier: 'ghost_xyz_nobody', password: 'SomeP@ss123!' },
    });
    expect(res.status()).toBe(401);
  });

  test('400 — missing identifier returns validation error', async () => {
    const res = await api.post('/auth/login', {
      data: { password: user.password },
    });
    expect(res.status()).toBe(400);
  });

  test('400 — missing password returns validation error', async () => {
    const res = await api.post('/auth/login', {
      data: { identifier: user.username },
    });
    expect(res.status()).toBe(400);
  });

  test('400 — empty body returns validation error', async () => {
    const res = await api.post('/auth/login', { data: {} });
    expect(res.status()).toBe(400);
  });
});

// ─── Protected endpoints ──────────────────────────────────────────────────────

test.describe('Protected endpoints — JWT guard', () => {
  let api: APIRequestContext;
  let validToken: string;

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({ baseURL: API_BASE });
    const user = uniqueUser();
    const res = await api.post('/auth/register', { data: user });
    const body = await res.json();
    validToken = body.accessToken;
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('401 — no Authorization header returns unauthorized', async () => {
    const res = await api.get('/users/me');
    expect(res.status()).toBe(401);
  });

  test('401 — malformed token returns unauthorized', async () => {
    const res = await api.get('/users/me', {
      headers: { Authorization: 'Bearer not.a.valid.jwt' },
    });
    expect(res.status()).toBe(401);
  });

  test('401 — random string as token returns unauthorized', async () => {
    const res = await api.get('/users/me', {
      headers: { Authorization: 'Bearer randomstringtoken12345' },
    });
    expect(res.status()).toBe(401);
  });

  test('200 — valid token from register grants access to /users/me', async () => {
    const res = await api.get('/users/me', {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    expect(res.status()).toBe(200);
  });

  test('200 — valid token from login grants access to /users/me', async () => {
    const user = uniqueUser();
    await api.post('/auth/register', { data: user });
    const loginRes = await api.post('/auth/login', {
      data: { identifier: user.username, password: user.password },
    });
    const { accessToken } = await loginRes.json();

    const res = await api.get('/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
  });
});

// ─── Logout (client-side token removal) ──────────────────────────────────────

test.describe('Logout — token lifecycle', () => {
  let api: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({ baseURL: API_BASE });
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  /**
   * The api-server uses stateless JWT — there is no server-side logout endpoint
   * or token blacklist. Logout is client-side only (remove token from localStorage).
   * A token remains valid until its expiry (JWT_EXPIRES_IN=7d by default).
   *
   * This test documents that a "discarded" token is still accepted by the server,
   * which is expected behaviour for stateless JWT. True revocation would require
   * a token blacklist (Redis) or short-lived tokens with refresh.
   */
  test('JWT remains valid after client-side logout (stateless JWT — no revocation)', async () => {
    const user = uniqueUser();
    await api.post('/auth/register', { data: user });
    const loginRes = await api.post('/auth/login', {
      data: { identifier: user.username, password: user.password },
    });
    const { accessToken } = await loginRes.json();

    // Simulate client-side logout by simply not sending the token again.
    // But to show the token is still valid on the server:
    const res = await api.get('/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    // Token is still valid — this is expected with stateless JWT.
    expect(res.status()).toBe(200);
  });
});
