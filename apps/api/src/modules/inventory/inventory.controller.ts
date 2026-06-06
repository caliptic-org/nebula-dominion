import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InventoryService } from './inventory.service';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { UseItemDto, SellItemDto } from './dto/use-sell-item.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
// Global prefix `api/v1` lives in main.ts. Declaring `api/inventory`
// here mounted routes at `/api/v1/api/inventory/*` — every FE call to
// `/api/v1/inventory/*` 404'd silently. Match the alliance/shop/payment
// fix pattern: drop the `api/` prefix here.
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Kullanıcının envanter listesi' })
  @ApiResponse({ status: 200, description: 'Sayfalandırılmış envanter listesi' })
  @ApiResponse({ status: 401, description: 'Kimlik doğrulama gerekli' })
  listInventory(@Request() req: ExpressRequest & { user: { id: string } }, @Query() query: InventoryQueryDto) {
    return this.inventoryService.listInventory(req.user.id, query);
  }

  @Get('capacity')
  @ApiOperation({ summary: 'Depo kapasite bilgisi (used/max)' })
  @ApiResponse({ status: 200, description: 'Kapasite bilgisi' })
  @ApiResponse({ status: 401, description: 'Kimlik doğrulama gerekli' })
  getCapacity(@Request() req: ExpressRequest & { user: { id: string } }) {
    return this.inventoryService.getCapacity(req.user.id);
  }

  /**
   * BLOCKER CHAIN-08-A1 fix
   * ----------------------------------------------
   * Shop HUD used to show game-server `energy` (default 250) as gem balance,
   * but POST /shop/purchase debits api-side `user_currency.premium_gems`
   * (default 0). Two completely different wallets → every fresh-account
   * purchase failed with "Yetersiz bakiye: premium_gems 0 < 200" and all
   * cycle-8-seeded SKUs were unbuyable.
   *
   * Fix: expose the REAL api-side wallet via a thin GET endpoint the shop
   * HUD can read. Lazy-creates the row with a starter balance the first
   * time a player hits it so anyone whose `register()` predates the auth
   * seed (or skipped it) still gets a usable balance instead of all-zero.
   *
   * Lives on /api/v1/inventory/wallet because InventoryModule already owns
   * the UserCurrency entity (used by sellItem to credit gems). Adding a
   * second module/controller just to host this would duplicate the
   * TypeOrmModule.forFeature registration.
   */
  @Get('wallet')
  @ApiOperation({ summary: 'Kullanıcının premium wallet bakiyesi (premium_gems, nebula_coins, void_crystals)' })
  @ApiResponse({ status: 200, description: 'Wallet bakiyesi' })
  @ApiResponse({ status: 401, description: 'Kimlik doğrulama gerekli' })
  getWallet(@Request() req: ExpressRequest & { user: { id: string } }) {
    return this.inventoryService.getWallet(req.user.id);
  }

  @Get(':itemId')
  @ApiOperation({ summary: 'Tekil envanter item detayı' })
  @ApiParam({ name: 'itemId', description: 'Envanter item UUID' })
  @ApiResponse({ status: 200, description: 'Item detayı' })
  @ApiResponse({ status: 401, description: 'Kimlik doğrulama gerekli' })
  @ApiResponse({ status: 403, description: 'Bu item size ait değil' })
  @ApiResponse({ status: 404, description: 'Item bulunamadı' })
  getItem(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.inventoryService.getItem(req.user.id, itemId);
  }

  @Post('use/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Item kullan (miktar ve etki validasyonu)' })
  @ApiParam({ name: 'itemId', description: 'Envanter item UUID' })
  @ApiResponse({ status: 200, description: 'Item kullanıldı' })
  @ApiResponse({ status: 401, description: 'Kimlik doğrulama gerekli' })
  @ApiResponse({ status: 403, description: 'Bu item size ait değil' })
  @ApiResponse({ status: 404, description: 'Item bulunamadı' })
  @ApiResponse({ status: 409, description: 'Item kullanılamaz veya yetersiz miktar' })
  useItem(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UseItemDto,
  ) {
    return this.inventoryService.useItem(req.user.id, itemId, dto.quantity ?? 1);
  }

  @Post('sell/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Item sat (miktar kontrolü, gem ekleme)' })
  @ApiParam({ name: 'itemId', description: 'Envanter item UUID' })
  @ApiResponse({ status: 200, description: 'Item satıldı, gem bakiyesi güncellendi' })
  @ApiResponse({ status: 401, description: 'Kimlik doğrulama gerekli' })
  @ApiResponse({ status: 403, description: 'Bu item size ait değil' })
  @ApiResponse({ status: 404, description: 'Item bulunamadı' })
  @ApiResponse({ status: 409, description: 'Item satılamaz veya yetersiz miktar' })
  sellItem(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: SellItemDto,
  ) {
    return this.inventoryService.sellItem(req.user.id, itemId, dto.quantity ?? 1);
  }
}
