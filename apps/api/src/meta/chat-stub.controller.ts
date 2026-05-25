import {
  Body,
  Controller,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/* Chat stub.
 *
 * Three channels: 'global', 'guild', 'dm'. State is an in-memory ring buffer
 * of the last 100 messages per channel. Vanishes on process restart — the
 * production ChatModule will replace this with persistent storage. */

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

// Singleton ring buffers, keyed by channel name.
const BUFFERS = new Map<Channel, ChatMessage[]>(
  CHANNELS.map((c) => [c, []] as [Channel, ChatMessage[]]),
);

function nextMessageId(): string {
  return `m_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

@ApiTags('chat (stub)')
@Controller('chat')
export class ChatStubController {
  @Get(':channel')
  @ApiOperation({ summary: 'Get the last N messages of a channel (public)' })
  @ApiParam({ name: 'channel', enum: CHANNELS })
  @ApiQuery({ name: 'limit', required: false, description: 'Max 100, default 50' })
  list(@Param('channel') channel: string, @Query('limit') limit?: string) {
    if (!isChannel(channel)) {
      throw new HttpException(`Bilinmeyen kanal: ${channel}`, HttpStatus.BAD_REQUEST);
    }
    const n = Math.max(1, Math.min(MAX_BUFFER, Number(limit) || 50));
    const buffer = BUFFERS.get(channel)!;
    return { channel, messages: buffer.slice(-n) };
  }

  @Post(':channel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Append a message to a channel (auth required)' })
  @ApiParam({ name: 'channel', enum: CHANNELS })
  send(
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
    const message: ChatMessage = {
      id: nextMessageId(),
      userId: req.user?.id ?? 'unknown',
      username: req.user?.username ?? 'Bilinmeyen',
      race: req.user?.race ?? 'Bilinmeyen',
      content,
      timestamp: new Date().toISOString(),
    };
    const buffer = BUFFERS.get(channel)!;
    buffer.push(message);
    if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
    return message;
  }
}
