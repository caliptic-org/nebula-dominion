import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubspaceController } from './subspace.controller';
import { SubspaceService } from './subspace.service';
import { SubspaceZone } from './entities/subspace-zone.entity';
import { SubspaceSession } from './entities/subspace-session.entity';
import { SubspaceBattle } from './entities/subspace-battle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SubspaceZone, SubspaceSession, SubspaceBattle])],
  controllers: [SubspaceController],
  providers: [SubspaceService],
  exports: [SubspaceService],
})
export class SubspaceModule {}
