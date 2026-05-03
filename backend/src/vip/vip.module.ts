import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VipSubscription } from './entities/vip-subscription.entity';
import { VipDailyClaim } from './entities/vip-daily-claim.entity';
import { VipController } from './vip.controller';
import { VipService } from './vip.service';

@Module({
  imports: [TypeOrmModule.forFeature([VipSubscription, VipDailyClaim])],
  controllers: [VipController],
  providers: [VipService],
  exports: [VipService],
})
export class VipModule {}
