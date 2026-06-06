import { IsEnum, IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Currency types accepted by the in-game purchase endpoint.
 *
 * NOTE: `real_money` is intentionally **excluded** here — real-money
 * payments go through the dedicated `/api/v1/payment` provider flow,
 * not the in-game shop. Adding it to this enum would let the client
 * trigger the "must use payment endpoint" BadRequest after passing
 * validation, which is a needless round-trip. Better to 400 at the
 * pipe layer.
 */
export enum InGameCurrencyType {
  NEBULA_COINS = 'nebula_coins',
  VOID_CRYSTALS = 'void_crystals',
  PREMIUM_GEMS = 'premium_gems',
}

/**
 * Body for POST /api/v1/shop/purchase.
 *
 * The previous version of this endpoint accepted an unvalidated inline
 * type, which let a negative `quantity` slip into shop.service.ts and
 * **credit** the player's wallet (UPDATE balance - (-N) = +N) instead
 * of debiting it. The @Min(1)/@Max(99) bound here is the primary guard;
 * shop.service.ts re-clamps as defence-in-depth.
 */
export class PurchaseDto {
  @ApiProperty({ description: 'Shop item SKU', example: 'unit_skin_phoenix' })
  @IsString()
  @MaxLength(128)
  sku!: string;

  @ApiProperty({
    description: 'In-game currency used for the purchase',
    enum: InGameCurrencyType,
  })
  @IsEnum(InGameCurrencyType)
  currencyType!: InGameCurrencyType;

  @ApiPropertyOptional({
    description: 'How many copies to buy (1-99). Defaults to 1.',
    minimum: 1,
    maximum: 99,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity?: number = 1;
}
