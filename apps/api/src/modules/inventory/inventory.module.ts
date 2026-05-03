import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { UserInventory } from '../shop/entities/user-inventory.entity';
import { ShopItem } from '../shop/entities/shop-item.entity';
import { UserCurrency } from './entities/user-currency.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserInventory, ShopItem, UserCurrency]),
    AuthModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
