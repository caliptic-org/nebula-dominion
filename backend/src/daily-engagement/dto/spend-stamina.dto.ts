import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SpendStaminaDto {
  @ApiProperty({ description: 'Amount of stamina to spend', minimum: 1, maximum: 10, example: 1 })
  @IsInt()
  @Min(1)
  @Max(10)
  amount: number;
}
