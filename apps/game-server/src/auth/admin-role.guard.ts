import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request['user'] as { sub: string; role?: string } | undefined;
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
