import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BossController } from './boss.controller';
import { BossService } from './boss.service';
import { BossEncounter } from './entities/boss-encounter.entity';
import { BossAttempt } from './entities/boss-attempt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BossEncounter, BossAttempt])],
  controllers: [BossController],
  providers: [BossService],
  exports: [BossService],
})
export class BossModule {}
