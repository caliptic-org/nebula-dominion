import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CosmeticsController } from './cosmetics.controller';
import { UserBalanceController } from './user-balance.controller';
import { CosmeticsService } from './cosmetics.service';
import { CosmeticItem } from './entities/cosmetic-item.entity';
import { UserCosmetic } from './entities/user-cosmetic.entity';
import { UserCurrency } from './entities/user-currency.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CosmeticItem, UserCosmetic, UserCurrency])],
  controllers: [CosmeticsController, UserBalanceController],
  providers: [CosmeticsService],
  exports: [CosmeticsService],
})
export class CosmeticsModule {}
