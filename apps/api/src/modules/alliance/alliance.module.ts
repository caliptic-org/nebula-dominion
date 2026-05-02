import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllianceController } from './alliance.controller';
import { AllianceService } from './alliance.service';
import { Alliance } from './entities/alliance.entity';
import { AllianceMember } from './entities/alliance-member.entity';
import { AllianceWar } from './entities/alliance-war.entity';
import { AllianceStorage } from './entities/alliance-storage.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Alliance, AllianceMember, AllianceWar, AllianceStorage])],
  controllers: [AllianceController],
  providers: [AllianceService],
  exports: [AllianceService],
})
export class AllianceModule {}
