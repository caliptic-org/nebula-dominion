import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '../entities/event.entity';

export class QueryEventsDto {
  @ApiPropertyOptional({ enum: EventStatus, description: 'Filter by event status' })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}
