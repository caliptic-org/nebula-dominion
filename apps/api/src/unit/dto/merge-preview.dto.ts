import {
  IsArray,
  IsDefined,
  IsEnum,
  IsInt,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ND_MERGE_SLOT_COUNT, NDRaceKey } from '../data/nd-races';

export class MergeSlotDto {
  @ApiProperty({ description: 'Zero-based slot position in the merge ritual UI', minimum: 0 })
  @IsInt()
  @Min(0)
  slotIndex: number;

  @ApiProperty({ description: 'Identifier of the unit placed in this slot' })
  @IsString()
  @MaxLength(64)
  unitId: string;
}

export class MergePreviewRequestDto {
  @ApiProperty({
    type: [MergeSlotDto],
    description: `Slot selection — the unit IDs currently placed in the merge slots. Must contain exactly ${ND_MERGE_SLOT_COUNT} entries.`,
  })
  @IsDefined()
  @IsArray()
  @ArrayMinSize(ND_MERGE_SLOT_COUNT)
  @ArrayMaxSize(ND_MERGE_SLOT_COUNT)
  @ValidateNested({ each: true })
  @Type(() => MergeSlotDto)
  slots: MergeSlotDto[];

  @ApiProperty({
    enum: ['insan', 'zerg', 'otomat', 'canavar', 'seytan'],
    description: 'Race performing the merge ritual',
  })
  @IsEnum(['insan', 'zerg', 'otomat', 'canavar', 'seytan'] as const)
  race: NDRaceKey;
}

export class MergePreviewCostsDto {
  @ApiProperty({ description: 'Cost in race-specific resource A (e.g. İnsan: Kredi)' })
  resourceA: number;

  @ApiProperty({ description: 'Cost in race-specific resource B (e.g. İnsan: Bilim)' })
  resourceB: number;

  @ApiProperty({ required: false, description: 'Optional crystal/premium cost for higher-tier merges' })
  crystal?: number;
}

/**
 * Mirrors the `MergePreview` type consumed by `apps/web/src/hooks/useMergePreview.ts`.
 * Keep field names and types identical so the frontend can swap the placeholder
 * hook to an SWR fetcher in one line.
 */
export class MergePreviewResponseDto {
  @ApiProperty({ description: 'True when slot recipe is legal and merge would succeed' })
  canMerge: boolean;

  @ApiProperty({ nullable: true, type: String, description: 'Identifier of the resulting unit (null when canMerge=false)' })
  resultUnitId: string | null;

  @ApiProperty({ nullable: true, type: Number, description: 'Tier of the resulting unit (null when canMerge=false)' })
  resultTier: number | null;

  @ApiProperty({ type: MergePreviewCostsDto })
  costs: MergePreviewCostsDto;

  @ApiProperty({ type: [String], description: 'Unit IDs that would be consumed on commit' })
  consumed: string[];

  @ApiProperty({ type: [String], required: false, description: 'i18n keys when canMerge=false' })
  reasons?: string[];
}
