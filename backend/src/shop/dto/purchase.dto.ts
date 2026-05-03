import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '../types/shop.types';

export class PurchaseDto {
  @ApiProperty({ description: 'UUID of the product to purchase' })
  @IsUUID()
  productId: string;

  @ApiProperty({ enum: Currency, description: 'Currency to use for payment' })
  @IsEnum(Currency)
  currency: Currency;
}

export class PurchaseResponseDto {
  @ApiProperty()
  transactionId: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  currency: Currency;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  balance: { gem: number; gold: number };
}
