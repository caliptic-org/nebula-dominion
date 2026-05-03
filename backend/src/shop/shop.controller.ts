import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { ShopService } from './shop.service';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { PurchaseDto, PurchaseResponseDto } from './dto/purchase.dto';
import { PlayerAuthGuard } from '../common/guards/player-auth.guard';
import { Player } from '../common/decorators/player.decorator';
import { AuthenticatedPlayer } from '../common/guards/player-auth.guard';

@ApiTags('shop')
@ApiBearerAuth()
@UseGuards(PlayerAuthGuard)
@Controller('api')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('shop/products')
  @ApiOperation({ summary: 'List shop products with optional tab and race filters' })
  @ApiResponse({ status: 200, description: 'Product list with real-time stock and prices' })
  getProducts(@Query() query: GetProductsQueryDto) {
    return this.shopService.getProducts(query);
  }

  @Get('player/balance')
  @ApiOperation({ summary: 'Get authenticated player wallet balance' })
  @ApiResponse({ status: 200, description: 'Current gem and gold balance', schema: { example: { gem: 1250, gold: 8400 } } })
  getBalance(@Player() player: AuthenticatedPlayer) {
    return this.shopService.getPlayerBalance(player.id);
  }

  @Post('shop/purchase')
  @ApiOperation({ summary: 'Purchase a shop product (idempotent)' })
  @ApiHeader({ name: 'idempotency-key', description: 'Unique key to prevent duplicate purchases', required: true })
  @ApiResponse({ status: 201, description: 'Purchase successful, returns updated balance', type: PurchaseResponseDto })
  @ApiResponse({ status: 400, description: 'Insufficient balance or invalid product' })
  @ApiResponse({ status: 409, description: 'Duplicate idempotency key with different parameters' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded (max 10 purchases/min)' })
  purchase(
    @Player() player: AuthenticatedPlayer,
    @Body() dto: PurchaseDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ): Promise<PurchaseResponseDto> {
    if (!idempotencyKey) {
      throw new BadRequestException('idempotency-key header is required');
    }
    return this.shopService.purchase(player.id, dto, idempotencyKey);
  }

  @Get('events/active')
  @ApiOperation({ summary: 'List active game events with countdown timestamps' })
  @ApiResponse({ status: 200, description: 'Active events with endsAt for countdown calculation' })
  getActiveEvents() {
    return this.shopService.getActiveEvents();
  }
}
