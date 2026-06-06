import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { ShopItem } from './entities/shop-item.entity';
import { UserInventory } from './entities/user-inventory.entity';
import { VipModule } from '../vip/vip.module';

@Module({
  // VipModule is imported so ShopService can call
  // VipService.recordPurchaseAndUpgradeVip on a successful premium_pass
  // purchase. Without this, the VIP SKUs in shop_items (vip_vip-monthly
  // etc.) just produced an inventory row — the player's VIP level
  // never ticked up. See shop.service.purchaseWithInGameCurrency.
  imports: [TypeOrmModule.forFeature([ShopItem, UserInventory]), VipModule],
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
