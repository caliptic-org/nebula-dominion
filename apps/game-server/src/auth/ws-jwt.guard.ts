import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      client.disconnect();
      throw new WsException('Missing authentication token');
    }

    try {
      const payload = this.jwtService.verify(token);
      client.data.user = payload;
      return true;
    } catch (err) {
      this.logger.warn(`Invalid JWT from socket ${client.id}: ${err.message}`);
      client.disconnect();
      throw new WsException('Invalid or expired token');
    }
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return client.handshake.auth?.token ?? null;
  }
}
