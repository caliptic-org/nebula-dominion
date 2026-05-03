import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface JwtPayload {
  sub: string;
  race?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const payload = this.verifyToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.userId = payload.sub;
    request.userRace = payload.race;
    return true;
  }

  private verifyToken(token: string): JwtPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const secret = this.config.get<string>('JWT_SECRET', 'nebula-secret');

    const data = `${header}.${payload}`;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64url');

    if (expectedSig.length !== signature.length) return null;

    try {
      if (!crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(signature))) {
        return null;
      }
    } catch {
      return null;
    }

    try {
      const decoded = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as JwtPayload;

      if (decoded.exp && decoded.exp < Date.now() / 1000) return null;
      if (!decoded.sub) return null;

      return decoded;
    } catch {
      return null;
    }
  }
}
