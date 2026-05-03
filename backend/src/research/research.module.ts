import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TechNode } from './entities/tech-node.entity';
import { PlayerResearch } from './entities/player-research.entity';
import { ResearchController } from './research.controller';
import { ResearchService } from './research.service';

@Module({
  imports: [TypeOrmModule.forFeature([TechNode, PlayerResearch])],
  controllers: [ResearchController],
  providers: [ResearchService],
  exports: [ResearchService],
})
export class ResearchModule {}
