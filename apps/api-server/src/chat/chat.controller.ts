import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto, SendDmDto, BlockUserDto } from './dto/send-message.dto';
import { GetMessagesDto, GetDmMessagesDto } from './dto/get-messages.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('chat')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'chat', version: '1' })
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ── Global / Guild Messages ───────────────────────────────────────────────

  @Get('messages')
  @ApiOperation({ summary: 'Fetch message history (global or guild channel)' })
  @ApiQuery({ name: 'channel', enum: ['global', 'guild'] })
  @ApiQuery({ name: 'guildId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'before', required: false, description: 'Cursor (ISO timestamp)' })
  @ApiResponse({ status: 200, description: 'Message list returned' })
  getMessages(@Query() dto: GetMessagesDto) {
    return this.chatService.getMessages(dto);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message to global or guild channel' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 403, description: 'Not a guild member' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  sendMessage(@Body() dto: SendMessageDto, @CurrentUser() user: JwtPayload) {
    return this.chatService.sendMessage(user.sub, dto);
  }

  // ── Online Count ──────────────────────────────────────────────────────────

  @Get('online-count')
  @ApiOperation({ summary: 'Get current online player count' })
  @ApiResponse({ status: 200, description: 'Online count returned' })
  getOnlineCount() {
    return { count: this.chatService.getOnlineCount() };
  }

  // ── DM Conversations ─────────────────────────────────────────────────────

  @Get('dm/conversations')
  @ApiOperation({ summary: 'List DM conversations with unread count and online status' })
  @ApiResponse({ status: 200, description: 'Conversation list returned' })
  getDmConversations(@CurrentUser() user: JwtPayload) {
    return this.chatService.getDmConversations(user.sub);
  }

  // ── DM Messages ──────────────────────────────────────────────────────────

  @Get('dm/:userId/messages')
  @ApiOperation({ summary: 'Get DM message history with a user' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'before', required: false, description: 'Cursor (ISO timestamp)' })
  @ApiResponse({ status: 200, description: 'Messages returned' })
  getDmMessages(
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Query() dto: GetDmMessagesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatService.getDmMessages(user.sub, targetUserId, dto);
  }

  @Post('dm/:userId/messages')
  @ApiOperation({ summary: 'Send a DM to a user' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'DM sent' })
  @ApiResponse({ status: 403, description: 'User is blocked or has blocked you' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  sendDm(
    @Param('userId', ParseUUIDPipe) recipientId: string,
    @Body() dto: SendDmDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatService.sendDm(user.sub, recipientId, dto);
  }

  // ── Block / Unblock ──────────────────────────────────────────────────────

  @Post('dm/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Block a user from sending DMs' })
  @ApiResponse({ status: 204, description: 'User blocked' })
  blockUser(@Body() dto: BlockUserDto, @CurrentUser() user: JwtPayload) {
    return this.chatService.blockUser(user.sub, dto.userId);
  }

  @Delete('dm/block/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'User unblocked' })
  unblockUser(@Param('userId', ParseUUIDPipe) blockedId: string, @CurrentUser() user: JwtPayload) {
    return this.chatService.unblockUser(user.sub, blockedId);
  }

  @Get('dm/blocks')
  @ApiOperation({ summary: 'List blocked users' })
  @ApiResponse({ status: 200, description: 'Block list returned' })
  getBlockedUsers(@CurrentUser() user: JwtPayload) {
    return this.chatService.getBlockedUsers(user.sub);
  }
}
