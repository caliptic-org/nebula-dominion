import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedPlayer } from '../guards/player-auth.guard';

export const Player = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedPlayer => {
    const req = ctx.switchToHttp().getRequest();
    return req.player;
  },
);
