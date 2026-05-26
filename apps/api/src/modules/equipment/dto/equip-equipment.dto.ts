import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class EquipEquipmentDto {
  @ApiProperty({
    description:
      'Commander slug (e.g. "voss", "malphas"). Matches the static commander list in apps/web/src/app/commanders/data.ts',
    example: 'voss',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  commanderId: string;
}
