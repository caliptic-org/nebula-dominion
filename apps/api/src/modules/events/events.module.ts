import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';
import { EventRule } from './entities/event-rule.entity';
import { EventReward } from './entities/event-reward.entity';
import { EventParticipant } from './entities/event-participant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventRule, EventReward, EventParticipant])],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
