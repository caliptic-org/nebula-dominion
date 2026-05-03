import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminRoleGuard } from './admin-role.guard';

function makeContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminRoleGuard', () => {
  let guard: AdminRoleGuard;

  beforeEach(() => {
    guard = new AdminRoleGuard();
  });

  it('allows request when role is admin', () => {
    const ctx = makeContext({ sub: 'uuid-1', role: 'admin' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when role is player', () => {
    const ctx = makeContext({ sub: 'uuid-2', role: 'player' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when role field is absent', () => {
    const ctx = makeContext({ sub: 'uuid-3' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user is undefined (no JWT guard ran)', () => {
    const ctx = makeContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
