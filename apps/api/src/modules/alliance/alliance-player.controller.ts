import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AlliancePlayerService } from './alliance-player.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { ProcessApplicationDto } from './dto/process-application.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { DonateDto } from './dto/donate.dto';
import { DeclareWarByTagDto } from './dto/declare-war-by-tag.dto';
import { ChatQueryDto } from './dto/chat-query.dto';
import { DonationQueryDto } from './dto/donation-query.dto';

@ApiTags('Alliance (Player)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
// Global prefix `api/v1` is set in main.ts; declaring 'api/alliance' here
// double-mounted at /api/v1/api/alliance/* and the FE never reached this
// controller. Drop the redundant prefix; FE will call /api/v1/alliance/*.
@Controller('alliance')
export class AlliancePlayerController {
  constructor(private readonly service: AlliancePlayerService) {}

  // ─── Alliance Core ────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Mevcut kullanıcının lonca bilgisi' })
  getMyAlliance(@Request() req: any) {
    return this.service.getMyAlliance(req.user.id);
  }

  // ─── Members ──────────────────────────────────────────────────────────────

  @Get('members')
  @ApiOperation({ summary: 'Lonca üye listesi' })
  @ApiQuery({ name: 'search', required: false, description: 'Üye arama' })
  getMembers(@Request() req: any, @Query('search') search?: string) {
    return this.service.getMembers(req.user.id, search);
  }

  @Post('members/invite')
  @ApiOperation({ summary: 'Oyuncuya lonca daveti gönder (Lider/Subay)' })
  inviteMember(@Request() req: any, @Body() dto: InviteMemberDto) {
    return this.service.inviteMember(req.user.id, dto);
  }

  @Delete('members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Üyeyi loncadan çıkar (Lider/Subay)' })
  @ApiParam({ name: 'memberId', description: 'Üyelik kaydı UUID' })
  kickMember(@Request() req: any, @Param('memberId', ParseUUIDPipe) memberId: string) {
    return this.service.kickMember(req.user.id, memberId);
  }

  // ─── Applications ─────────────────────────────────────────────────────────

  @Get('applications')
  @ApiOperation({ summary: 'Bekleyen lonca başvurularını listele (Lider/Subay)' })
  getApplications(@Request() req: any) {
    return this.service.getApplications(req.user.id);
  }

  @Patch('applications/:applicationId')
  @ApiOperation({ summary: 'Başvuruyu kabul et veya reddet (Lider/Subay)' })
  @ApiParam({ name: 'applicationId', description: 'Başvuru UUID' })
  processApplication(
    @Request() req: any,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: ProcessApplicationDto,
  ) {
    return this.service.processApplication(req.user.id, applicationId, dto);
  }

  // ─── Chat ─────────────────────────────────────────────────────────────────

  @Get('chat')
  @ApiOperation({ summary: 'Lonca sohbet mesajlarını getir (cursor-based)' })
  getChatMessages(@Request() req: any, @Query() query: ChatQueryDto) {
    return this.service.getChatMessages(req.user.id, query);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Lonca sohbetine mesaj gönder' })
  sendChatMessage(@Request() req: any, @Body() dto: SendChatMessageDto) {
    return this.service.sendChatMessage(req.user.id, dto);
  }

  @Post('chat/:messageId/reactions')
  @ApiOperation({ summary: 'Mesaja emoji reaksiyonu ekle' })
  @ApiParam({ name: 'messageId', description: 'Mesaj UUID' })
  addReaction(
    @Request() req: any,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: AddReactionDto,
  ) {
    return this.service.addReaction(req.user.id, messageId, dto);
  }

  @Delete('chat/:messageId/reactions/:emoji')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mesajdan emoji reaksiyonunu kaldır' })
  @ApiParam({ name: 'messageId', description: 'Mesaj UUID' })
  @ApiParam({ name: 'emoji', description: 'Emoji karakteri' })
  removeReaction(
    @Request() req: any,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Param('emoji') emoji: string,
  ) {
    return this.service.removeReaction(req.user.id, messageId, emoji);
  }

  // ─── Storage & Donations ──────────────────────────────────────────────────

  @Get('storage')
  @ApiOperation({ summary: 'Lonca deposu mevcut seviyeleri' })
  getStorage(@Request() req: any) {
    return this.service.getStorage(req.user.id);
  }

  @Post('donations')
  @ApiOperation({ summary: 'Loncaya kaynak bağışla (atomik işlem)' })
  donate(@Request() req: any, @Body() dto: DonateDto) {
    return this.service.donate(req.user.id, dto);
  }

  @Get('donations')
  @ApiOperation({ summary: 'Lonca bağış geçmişi' })
  getDonations(@Request() req: any, @Query() query: DonationQueryDto) {
    return this.service.getDonations(req.user.id, query);
  }

  // ─── Wars ─────────────────────────────────────────────────────────────────

  @Get('wars')
  @ApiOperation({ summary: 'Savaş geçmişi ve aktif savaş' })
  getWars(@Request() req: any) {
    return this.service.getWars(req.user.id);
  }

  @Post('wars')
  @ApiOperation({ summary: 'Savaş ilan et — sadece tag ile, yalnızca Lider yetkisi' })
  declareWar(@Request() req: any, @Body() dto: DeclareWarByTagDto) {
    return this.service.declareWarByTag(req.user.id, dto);
  }
}
