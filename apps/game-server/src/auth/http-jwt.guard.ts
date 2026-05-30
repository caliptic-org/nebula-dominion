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
      // Normalize the user shape so downstream code is decoupled from the
      // JWT claim layout. The api mints tokens with `sub` (standard JWT
      // subject claim), but controllers + decorators here read
      // `request.user.id` / `request.user.userId`. Without this mirror, every
      // authed route on game-server resolves currentUserId to '' and silently
      // 403s with "Cannot award XP to another user" (and similar friends).
      request['user'] = { ...payload, id: payload.sub, userId: payload.sub };
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
