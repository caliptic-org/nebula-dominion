import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface HttpRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: unknown;
}

@Injectable()
export class HttpJwtGuard implements CanActivate {
  private readonly logger = new Logger(HttpJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<HttpRequest>();
    const token = this.extractToken(req);

    if (!token) throw new UnauthorizedException('Missing authentication token');

    try {
      const payload = this.jwtService.verify(token);
      req.user = payload;
      return true;
    } catch (err) {
      this.logger.warn(`Invalid JWT: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(req: HttpRequest): string | null {
    const auth = req.headers['authorization'] as string | undefined;
    if (auth?.startsWith('Bearer ')) return auth.substring(7);
    return null;
  }
}
