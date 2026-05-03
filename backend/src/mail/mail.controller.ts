import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, JwtPayload } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MailService } from './mail.service';
import { ListMailDto } from './dto/list-mail.dto';
import { CreateMailDto } from './dto/create-mail.dto';

@ApiTags('mail')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get()
  @ApiOperation({ summary: "List the authenticated user's mail with pagination and filters" })
  @ApiResponse({ status: 200, description: 'Paginated mail list' })
  list(@CurrentUser() user: JwtPayload, @Query() query: ListMailDto) {
    return this.mailService.list({
      userId: user.sub,
      page: query.page,
      limit: query.limit,
      type: query.type,
      isRead:
        query.isRead === undefined ? undefined : query.isRead === 'true',
    });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a mail as read' })
  markRead(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mailService.markRead(id, user.sub);
  }

  @Post(':id/claim')
  @ApiOperation({
    summary: 'Claim mail rewards atomically (idempotent — second claim returns 409)',
  })
  @ApiResponse({ status: 201, description: 'Rewards transferred and mail flagged claimed' })
  @ApiResponse({ status: 409, description: 'Already claimed or no rewards to claim' })
  @ApiResponse({ status: 410, description: 'Mail expired' })
  claim(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mailService.claim(id, user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a mail (sets deletedAt timestamp)' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.mailService.softDelete(id, user.sub);
  }

  @Post()
  @ApiOperation({
    summary: 'Internal: create a mail for a target user (system/event/guild senders)',
  })
  create(@Body() dto: CreateMailDto) {
    return this.mailService.create(dto);
  }
}
