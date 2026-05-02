import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sector } from './entities/sector.entity';
import { SectorBattle } from './entities/sector-battle.entity';
import { WeeklyLeague } from './entities/weekly-league.entity';
import { LeagueParticipant } from './entities/league-participant.entity';
import { SectorWarsService } from './sector-wars.service';
import { SectorWarsController } from './sector-wars.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Sector, SectorBattle, WeeklyLeague, LeagueParticipant])],
  providers: [SectorWarsService],
  controllers: [SectorWarsController],
  exports: [SectorWarsService, TypeOrmModule],
})
export class SectorWarsModule {}
