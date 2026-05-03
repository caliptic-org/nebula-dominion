import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export interface AuthenticatedPlayer {
  id: string;
  race?: string;
}

/**
 * Validates Bearer JWT and extracts player identity from the payload.
 * The token is a standard JWT; this guard decodes the payload without
 * signature verification — full verification should be added once the
 * auth service issues tokens with a shared secret/public key.
 */
@Injectable()
export class PlayerAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const player = this.extractPlayer(req);

    if (!player) {
      throw new UnauthorizedException('Valid Authorization header required');
    }

    (req as any).player = player;
    return true;
  }

  private extractPlayer(req: Request): AuthenticatedPlayer | null {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7);

    // x-player-id header overrides JWT for development/testing convenience
    const devPlayerId = req.headers['x-player-id'] as string | undefined;
    if (devPlayerId) {
      return { id: devPlayerId };
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(
        Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
      ) as { sub?: string; player_id?: string; race?: string };

      const id = payload.sub ?? payload.player_id;
      if (!id) return null;

      return { id, race: payload.race };
    } catch {
      return null;
    }
  }
}
