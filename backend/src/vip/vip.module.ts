import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VipTierConfig } from './entities/vip-tier-config.entity';
import { VipSpendLedger } from './entities/vip-spend-ledger.entity';
import { PurchaseEvent } from './entities/purchase-event.entity';
import { VipService } from './vip.service';
import { VipController } from './vip.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VipTierConfig, VipSpendLedger, PurchaseEvent])],
  controllers: [VipController],
  providers: [VipService],
  exports: [VipService],
})
export class VipModule {}
