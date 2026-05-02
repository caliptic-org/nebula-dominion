import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { ShopItem } from './entities/shop-item.entity';
import { UserInventory } from './entities/user-inventory.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShopItem, UserInventory])],
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
