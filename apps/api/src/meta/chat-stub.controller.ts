import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * STUB controller — backed by in-memory state. Acceptable risk until
 * DB-backed module lands (task #200). Restart wipes state.
 *
 * Chat stub.
 *
 * Three channels: 'global', 'guild', 'dm'. State is an in-memory ring buffer
 * of the last 100 messages per channel. Vanishes on process restart — the
 * production ChatModule will replace this with persistent storage.
 *
 * PERIMETER HARDENINGS (F6-econ + stub-gaps research):
 *  - 'global' and 'guild' remain shared ring buffers (fan-out).
 *  - 'dm' is partitioned per recipient userId: a player only reads/writes
 *    their OWN dm buffer. Without this, /chat/dm leaked every DM in the
 *    process to every authenticated reader.
 *  - HIGH CHAIN-08-A3: the 'guild' channel was JWT-guarded but did NOT
 *    verify alliance_members membership. A freshly-created Lv1 account
 *    with no guild affiliation could POST /chat/guild and pollute the
 *    shared ring buffer that every legitimate alliance member reads.
 *    send() now consults alliance_members and 403s non-members.
 */

type Channel = 'global' | 'guild' | 'dm';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  race: string;
  content: string;
  timestamp: string;
}

const CHANNELS: Channel[] = ['global', 'guild', 'dm'];
const MAX_BUFFER = 100;

const isChannel = (v: unknown): v is Channel =>
  typeof v === 'string' && (CHANNELS as string[]).includes(v);

/** Shared ring buffers for the fan-out channels. */
const BUFFERS = new Map<Channel, ChatMessage[]>([
  ['global', []],
  ['guild', []],
]);

/** Per-user ring buffers for 'dm'. Keyed by the userId of the buffer
 *  owner — i.e. each entry is the inbox/outbox view that user is allowed
 *  to read. Without this partition, /chat/dm fan-out leaked every DM in
 *  the process to every authenticated reader. */
const DM_BUFFERS = new Map<string, ChatMessage[]>();

function getDmBuffer(userId: string): ChatMessage[] {
  let b = DM_BUFFERS.get(userId);
  if (!b) {
    b = [];
    DM_BUFFERS.set(userId, b);
  }
  return b;
}

function nextMessageId(): string {
  return `m_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Per-user sliding window for guild-channel posts. Keys are userId, values
 *  are the timestamps (ms) of the last <=GUILD_RATE_LIMIT_MAX writes inside
 *  the rolling GUILD_RATE_LIMIT_WINDOW_MS window. Stops one chatty member
 *  from drowning out the shared ring buffer even after the membership gate
 *  passes. Lives in process memory only — fine for the stub. */
const GUILD_RATE_LIMIT_MAX = 5;
const GUILD_RATE_LIMIT_WINDOW_MS = 10_000;
const GUILD_RATE_LIMIT: Map<string, number[]> = new Map();

@ApiTags('chat (stub)')
@Controller('chat')
export class ChatStubController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * GET /chat/:channel — read the last N messages.
   *
   * 'global' / 'guild' return the shared buffer (publicly visible, no auth
   * needed in this stub). 'dm' is per-user: it REQUIRES auth and returns
   * only the caller's own dm buffer.
   */
  @Get(':channel')
  @ApiOperation({ summary: 'Get the last N messages of a channel' })
  @ApiParam({ name: 'channel', enum: CHANNELS })
  @ApiQuery({ name: 'limit', required: false, description: 'Max 100, default 50' })
  list(
    @Request() req: any,
    @Param('channel') channel: string,
    @Query('limit') limit?: string,
  ) {
    if (!isChannel(channel)) {
      throw new HttpException(`Bilinmeyen kanal: ${channel}`, HttpStatus.BAD_REQUEST);
    }
    const n = Math.max(1, Math.min(MAX_BUFFER, Number(limit) || 50));

    if (channel === 'dm') {
      // 'dm' is per-user — refuse anonymous reads, and scope to caller.
      const userId: string | undefined = req?.user?.id;
      if (!userId) {
        throw new HttpException('DM kanalı kimlik doğrulaması gerektirir.', HttpStatus.UNAUTHORIZED);
      }
      const buffer = getDmBuffer(userId);
      return { channel, messages: buffer.slice(-n) };
    }

    const buffer = BUFFERS.get(channel)!;
    return { channel, messages: buffer.slice(-n) };
  }

  /**
   * POST /chat/:channel — append a message. Auth required for all channels.
   *
   * 'dm' writes target the CALLER's own dm buffer in this stub. The full
   * DB-backed module (task #200) will add per-recipient routing; right now
   * we just need to make sure messages don't fan out to every user.
   *
   * HIGH CHAIN-08-A3 — guild membership gate:
   *   Before this fix the 'guild' channel was JWT-guarded but accepted
   *   writes from ANY authenticated user, regardless of alliance_members
   *   membership. A brand-new Lv1 account with no guild affiliation could
   *   POST /chat/guild and pollute the shared ring buffer that every
   *   legitimate alliance member reads — a one-line spam-cannon against
   *   every player on /chat. We now resolve the caller's row in
   *   `alliance_members`; non-members get a 403 with a TR-localised
   *   reason. Members also get a per-user sliding rate limit
   *   (GUILD_RATE_LIMIT_MAX writes per GUILD_RATE_LIMIT_WINDOW_MS) so a
   *   compromised member account can't drown the buffer either.
   */
  @Post(':channel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Append a message to a channel (auth required)' })
  @ApiParam({ name: 'channel', enum: CHANNELS })
  async send(
    @Request() req: any,
    @Param('channel') channel: string,
    @Body() body: { content?: string },
  ) {
    if (!isChannel(channel)) {
      throw new HttpException(`Bilinmeyen kanal: ${channel}`, HttpStatus.BAD_REQUEST);
    }
    const content = (body?.content ?? '').toString().trim();
    if (!content) {
      throw new HttpException('İçerik boş olamaz.', HttpStatus.BAD_REQUEST);
    }
    const userId: string = req.user?.id ?? 'unknown';

    // CHAIN-08-A3: hard gate on guild membership. Without a row in
    // alliance_members the caller has no business writing to the guild
    // ring buffer — that surface is read by every guild-affiliated player
    // in the process. We treat 'alliance' identically as defence-in-depth
    // for any future routing that aliases the two names.
    if (channel === 'guild' || (channel as string) === 'alliance') {
      const rows: Array<{ alliance_id: string }> = await this.dataSource.query(
        'SELECT alliance_id FROM alliance_members WHERE user_id = $1 LIMIT 1',
        [userId],
      );
      if (!rows || rows.length === 0) {
        throw new ForbiddenException(
          'İttifak üyesi olmayan oyuncular ittifak sohbetine yazamaz',
        );
      }

      // Per-user sliding rate limit (member-side abuse guard).
      const now = Date.now();
      const stamps = (GUILD_RATE_LIMIT.get(userId) ?? []).filter(
        (t) => now - t < GUILD_RATE_LIMIT_WINDOW_MS,
      );
      if (stamps.length >= GUILD_RATE_LIMIT_MAX) {
        throw new HttpException(
          'Çok hızlı mesaj gönderiyorsun, biraz bekle.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      stamps.push(now);
      GUILD_RATE_LIMIT.set(userId, stamps);
    }

    const message: ChatMessage = {
      id: nextMessageId(),
      userId,
      username: req.user?.username ?? 'Bilinmeyen',
      race: req.user?.race ?? 'Bilinmeyen',
      content,
      timestamp: new Date().toISOString(),
    };
    const buffer =
      channel === 'dm' ? getDmBuffer(userId) : BUFFERS.get(channel)!;
    buffer.push(message);
    if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
    return message;
  }
}
