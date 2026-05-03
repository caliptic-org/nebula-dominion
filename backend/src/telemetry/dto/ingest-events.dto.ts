import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
  ArrayMaxSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// The 10 core funnel event names
export const VALID_EVENT_NAMES = [
  'game_session_start',
  'onboarding_step_view',
  'onboarding_step_complete',
  'battle_load_start',
  'battle_load_complete',
  'battle_result',
  'churn_risk_trigger',
  'era_progression',
  'session_start',
  'session_end',
  'quit_intent',
] as const;

export type FunnelEventName = (typeof VALID_EVENT_NAMES)[number];

export class FunnelEventDto {
  @ApiProperty({ enum: VALID_EVENT_NAMES })
  @IsIn(VALID_EVENT_NAMES)
  eventName: FunnelEventName;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sessionId: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  platform?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  device?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  race?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  era?: number;

  @ApiProperty({ description: 'Client-side event timestamp (ISO 8601)' })
  @IsDateString()
  occurredAt: string;
}

export class IngestEventsDto {
  @ApiProperty({ type: [FunnelEventDto], maxItems: 50 })
  @IsArray()
  @IsNotEmpty()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => FunnelEventDto)
  events: FunnelEventDto[];
}
