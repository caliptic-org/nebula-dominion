import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Whitelist of conversion event names. Keeping this tight prevents an
 * attacker from spamming arbitrary GA4 events that pollute reports.
 *
 * Order roughly matches funnel position: top-of-funnel signup down to
 * monetization purchase.
 */
const ALLOWED_EVENTS = [
  'sign_up',
  'login',
  'race_select',
  'race_confirm',
  'tutorial_complete',
  'first_building',
  'first_battle',
  'level_up',
  'age_advance',
  'purchase',
  'iap_view',
  'subscription_start',
] as const;

export type ConversionEventName = (typeof ALLOWED_EVENTS)[number];

export class TrackConversionDto {
  @ApiProperty({ enum: ALLOWED_EVENTS, description: 'Conversion event name' })
  @IsString()
  @IsIn(ALLOWED_EVENTS as unknown as string[])
  eventName!: ConversionEventName;

  @ApiPropertyOptional({ description: 'GA4 client_id from _ga cookie (1234567890.1700000000)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientId?: string;

  @ApiPropertyOptional({ description: 'Optional user id (for cross-device stitching)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;

  @ApiPropertyOptional({ description: 'Monetary value of the conversion (purchases)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @ApiPropertyOptional({ description: 'ISO 4217 currency code', default: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  // Ad attribution click IDs — passed-through to GA4 so revenue attaches to
  // the originating campaign. Optional so non-paid traffic still tracks.
  @ApiPropertyOptional({ description: 'Google Ads click id (gclid)' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  gclid?: string;

  @ApiPropertyOptional({ description: 'Meta Ads click id (fbclid)' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  fbclid?: string;

  @ApiPropertyOptional({ description: 'Microsoft Ads click id (msclkid)' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  msclkid?: string;

  @ApiPropertyOptional({ description: 'TikTok Ads click id (ttclid)' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  ttclid?: string;

  // Optional context — useful for ad-network audience filtering.
  @ApiPropertyOptional({ description: 'Race the player picked (insan/zerg/otomat/canavar/seytan)' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  race?: string;

  @ApiPropertyOptional({ description: 'Player level at conversion time' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  level?: number;
}
