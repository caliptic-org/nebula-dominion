import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PurchaseVipDto {
  @ApiProperty({ enum: ['monthly', 'quarterly', 'annual'] })
  @IsIn(['monthly', 'quarterly', 'annual'])
  plan_id: string;
}
