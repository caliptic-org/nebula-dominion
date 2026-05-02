import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeclareWarDto {
  @ApiProperty({ description: 'Savaş ilan edilecek ittifak UUID' })
  @IsUUID()
  targetAllianceId: string;
}
