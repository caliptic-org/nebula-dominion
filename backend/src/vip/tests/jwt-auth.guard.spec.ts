import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { createHmac } from 'crypto';

const TEST_SECRET = 'test-jwt-secret';

function makeJwt(payload: object, secret = TEST_SECRET, expOffset = 3600): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const fullPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expOffset,
  };
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function makeContext(authHeader: string | undefined, user: object = {}): ExecutionContext {
  const request: Record<string, unknown> = { headers: {} as Record<string, string>, user };
  if (authHeader !== undefined) {
    (request.headers as Record<string, string>)['authorization'] = authHeader;
  }
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    guard = new JwtAuthGuard();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('returns true for valid JWT', () => {
    const token = makeJwt({ sub: 'user-abc' });
    const ctx = makeContext(`Bearer ${token}`);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('sets request.user with correct sub', () => {
    const token = makeJwt({ sub: 'user-xyz' });
    const request = { headers: { authorization: `Bearer ${token}` } } as any;
    const ctx = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;

    guard.canActivate(ctx);

    expect(request.user?.sub).toBe('user-xyz');
  });

  it('throws UnauthorizedException when Authorization header missing', () => {
    const ctx = makeContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when no Bearer prefix', () => {
    const token = makeJwt({ sub: 'u1' });
    const ctx = makeContext(token);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for wrong signature', () => {
    const token = makeJwt({ sub: 'u1' }, 'wrong-secret');
    const ctx = makeContext(`Bearer ${token}`);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for expired token', () => {
    const token = makeJwt({ sub: 'u1' }, TEST_SECRET, -100);
    const ctx = makeContext(`Bearer ${token}`);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when JWT_SECRET env not set', () => {
    delete process.env.JWT_SECRET;
    const token = makeJwt({ sub: 'u1' });
    const ctx = makeContext(`Bearer ${token}`);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for malformed token (2 parts)', () => {
    const ctx = makeContext('Bearer header.payload');
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for token missing sub', () => {
    const token = makeJwt({ role: 'admin' });
    const ctx = makeContext(`Bearer ${token}`);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
