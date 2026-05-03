import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ShopService } from './shop.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Shop')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get()
  @ApiOperation({ summary: 'Mağaza itemlerini listele' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'rarity', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'age', required: false, type: Number })
  getItems(
    @Query('category') category?: string,
    @Query('rarity') rarity?: string,
    @Query('tag') tag?: string,
    @Query('age') age?: number,
  ) {
    return this.shopService.getShopItems({ category, rarity, tag, ageRequired: age });
  }

  @Get('featured')
  @ApiOperation({ summary: 'Öne çıkan itemler (legendary)' })
  getFeatured() {
    return this.shopService.getFeaturedItems();
  }

  @Get('limited')
  @ApiOperation({ summary: 'Sınırlı süreli itemler' })
  getLimited() {
    return this.shopService.getLimitedTimeItems();
  }

  @Get('items/:sku')
  @ApiOperation({ summary: 'Item detayı (SKU ile)' })
  @ApiParam({ name: 'sku', description: 'Item SKU kodu' })
  getItem(@Param('sku') sku: string) {
    return this.shopService.getItemBySku(sku);
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Item satın al (oyun içi para birimi ile)' })
  purchase(
    @CurrentUser() currentUserId: string,
    @Body()
    body: {
      sku: string;
      currencyType: 'nebula_coins' | 'void_crystals' | 'premium_gems';
      quantity?: number;
    },
  ) {
    return this.shopService.purchaseWithInGameCurrency(currentUserId, body);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Kullanıcı envanteri' })
  @ApiQuery({ name: 'category', required: false })
  getInventory(@CurrentUser() currentUserId: string, @Query('category') category?: string) {
    return this.shopService.getUserInventory(currentUserId, category);
  }

  @Patch('inventory/:inventoryId/equip')
  @ApiOperation({ summary: 'Item koy (equip)' })
  @ApiParam({ name: 'inventoryId', description: 'Envanter ID' })
  equipItem(@CurrentUser() currentUserId: string, @Param('inventoryId') inventoryId: string) {
    return this.shopService.equipItem(currentUserId, inventoryId);
  }

  @Patch('inventory/:inventoryId/unequip')
  @ApiOperation({ summary: 'Item çıkar (unequip)' })
  @ApiParam({ name: 'inventoryId', description: 'Envanter ID' })
  unequipItem(@CurrentUser() currentUserId: string, @Param('inventoryId') inventoryId: string) {
    return this.shopService.unequipItem(currentUserId, inventoryId);
  }
}
