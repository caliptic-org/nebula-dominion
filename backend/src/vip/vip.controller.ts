import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { VipService } from './vip.service';
import { PurchaseVipDto } from './dto/purchase-vip.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/guards/jwt-auth.guard';

@ApiTags('vip')
@Controller('api/vip')
export class VipController {
  constructor(private readonly vipService: VipService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get authenticated user's VIP status" })
  @ApiResponse({ status: 200, description: 'VIP status returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStatus(@CurrentUser() user: JwtPayload) {
    return this.vipService.getStatus(user.sub);
  }

  @Get('plans')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List available VIP purchase plans' })
  @ApiResponse({ status: 200, description: 'Plans list returned' })
  getPlans() {
    return this.vipService.getPlans();
  }

  @Post('claim-daily')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Claim daily VIP rewards (idempotent within 24h)' })
  @ApiResponse({ status: 200, description: 'Rewards returned (already_claimed=true if already claimed today)' })
  @ApiResponse({ status: 404, description: 'No active VIP subscription' })
  claimDaily(@CurrentUser() user: JwtPayload) {
    return this.vipService.claimDaily(user.sub);
  }

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate VIP purchase — returns checkout URL' })
  @ApiResponse({ status: 201, description: 'Checkout URL returned' })
  @ApiResponse({ status: 409, description: 'Already has an active VIP subscription' })
  purchase(@CurrentUser() user: JwtPayload, @Body() dto: PurchaseVipDto) {
    return this.vipService.purchase(user.sub, dto.plan_id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Payment provider webhook — HMAC-SHA256 signature required' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-webhook-signature') signature: string,
  ) {
    const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body);
    await this.vipService.processWebhook(rawBody, signature ?? '');
    return { ok: true };
  }
}
