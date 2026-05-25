import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/* Buffs stub.
 *
 * Per-user list of active timed buffs. Expired entries (expiresAt < now) are
 * filtered on each GET so the array stays clean. Starts empty for every user —
 * intentional clean slate until BuffsModule lands. */

interface ActiveBuff {
  id: string;
  label: string;
  effect: string;
  expiresAt: string;
  totalSec: number;
}

const BUFFS = new Map<string, ActiveBuff[]>();

function nextBuffId(): string {
  return `bf_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

@ApiTags('buffs (stub)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('buffs')
export class BuffsStubController {
  @Get('active')
  @ApiOperation({ summary: 'List my non-expired buffs' })
  active(@Request() req: any): ActiveBuff[] {
    const userId: string = req.user?.id ?? 'unknown';
    const list = BUFFS.get(userId) ?? [];
    const now = Date.now();
    const fresh = list.filter((b) => new Date(b.expiresAt).getTime() >= now);
    // Garbage-collect expired in place so the map doesn't grow forever.
    if (fresh.length !== list.length) BUFFS.set(userId, fresh);
    return fresh;
  }

  @Post('grant')
  @ApiOperation({ summary: 'Grant a timed buff to myself (stub helper)' })
  grant(
    @Request() req: any,
    @Body() body: { label?: string; effect?: string; durationSec?: number },
  ): ActiveBuff {
    const userId: string = req.user?.id ?? 'unknown';
    const label = (body?.label ?? '').toString().trim();
    const effect = (body?.effect ?? '').toString().trim();
    const durationSec = Number(body?.durationSec);
    if (!label) throw new HttpException('label gerekli.', HttpStatus.BAD_REQUEST);
    if (!effect) throw new HttpException('effect gerekli.', HttpStatus.BAD_REQUEST);
    if (!Number.isFinite(durationSec) || durationSec <= 0) {
      throw new HttpException('durationSec pozitif bir sayı olmalı.', HttpStatus.BAD_REQUEST);
    }
    const buff: ActiveBuff = {
      id: nextBuffId(),
      label,
      effect,
      expiresAt: new Date(Date.now() + durationSec * 1000).toISOString(),
      totalSec: Math.floor(durationSec),
    };
    const list = BUFFS.get(userId) ?? [];
    list.push(buff);
    BUFFS.set(userId, list);
    return buff;
  }
}
