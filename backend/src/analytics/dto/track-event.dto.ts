import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const VALID_RACES = ['zerg', 'droid', 'creature', 'human', 'demon'] as const;

// All event types accepted by the ingestion endpoint
export const VALID_EVENT_TYPES = [
  'auth.signup',
  'auth.login',
  'auth.logout',
  'race.preview_viewed',
  'race.selected',
  'race.rerolled',
  'tutorial.battle_started',
  'tutorial.battle_completed',
  'home.viewed',
  'home.action',
  'pvp.match_queued',
  'pvp.match_started',
  'pvp.match_ended',
  'era.transition_viewed',
  'era.transition_completed',
  'daily.streak_claimed',
  'daily.quest_completed',
  'guild.suggested',
  'guild.joined',
  'guild.left',
  'session.start',
  'session.end',
] as const;

export type EventType = (typeof VALID_EVENT_TYPES)[number];

export class TrackEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @IsIn(VALID_EVENT_TYPES)
  event_type: EventType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  user_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  session_id: string;

  @IsOptional()
  @IsIn(VALID_RACES)
  race?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  tier_age?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  tier_level?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  vip_level?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  device?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  app_version?: string;

  @IsOptional()
  @IsDateString()
  client_ts?: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;
}

export class BatchTrackEventDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TrackEventDto)
  events: TrackEventDto[];
}
