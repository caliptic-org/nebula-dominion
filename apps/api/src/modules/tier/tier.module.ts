import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TierController } from './tier.controller';
import { TierService } from './tier.service';
import { TierProgress } from './entities/tier-progress.entity';
import { UserModule } from '../../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([TierProgress]), UserModule],
  controllers: [TierController],
  providers: [TierService],
  exports: [TierService],
})
export class TierModule {}
