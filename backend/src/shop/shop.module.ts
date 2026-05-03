import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopProduct } from './entities/shop-product.entity';
import { PlayerWallet } from './entities/player-wallet.entity';
import { PurchaseTransaction } from './entities/purchase-transaction.entity';
import { GameEvent } from './entities/game-event.entity';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShopProduct, PlayerWallet, PurchaseTransaction, GameEvent]),
  ],
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
