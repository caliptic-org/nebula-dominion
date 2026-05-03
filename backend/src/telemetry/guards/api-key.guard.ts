import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly apiKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get<string>('TELEMETRY_API_KEY');
  }

  canActivate(ctx: ExecutionContext): boolean {
    if (!this.apiKey) return true; // guard is opt-in; skip if key not configured

    const req = ctx.switchToHttp().getRequest<Request>();
    const provided = req.headers['x-telemetry-key'];
    if (provided !== this.apiKey) {
      throw new UnauthorizedException('Invalid or missing X-Telemetry-Key header');
    }
    return true;
  }
}
