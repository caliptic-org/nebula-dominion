import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class HttpJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException('Missing authentication token');

    try {
      const payload = this.jwtService.verify(token) as { sub: string; email?: string; username?: string };
      // Store the JWT payload verbatim. All downstream readers go through
      // CurrentUser (apps/game-server/src/auth/current-user.decorator.ts)
      // which reads payload.sub — the standard JWT subject claim the api
      // mints. Earlier versions of this guard mirrored sub into id+userId
      // as a defensive shim while controllers were inconsistent; that
      // mirror is gone now (P5.4) so every reader follows the same path.
      request['user'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: Request): string | null {
    const auth = request.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.substring(7);
    return null;
  }
}
