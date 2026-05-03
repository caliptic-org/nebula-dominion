import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EquipSlotDto {
  @ApiProperty({ description: 'Equipment item ID to assign to the slot' })
  @IsString()
  @IsNotEmpty()
  item_id: string;
}
