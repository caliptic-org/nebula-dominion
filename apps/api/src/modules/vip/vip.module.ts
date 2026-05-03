import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VipController } from './vip.controller';
import { VipService } from './vip.service';
import { UserVipSpending } from './entities/user-vip-spending.entity';
import { VipTierConfig } from './entities/vip-tier-config.entity';
import { PurchaseTelemetry } from './entities/purchase-telemetry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserVipSpending, VipTierConfig, PurchaseTelemetry])],
  controllers: [VipController],
  providers: [VipService],
  exports: [VipService],
})
export class VipModule {}
