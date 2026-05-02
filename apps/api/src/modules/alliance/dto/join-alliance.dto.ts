import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinAllianceDto {
  @ApiProperty({ description: 'Katılmak istenen ittifak UUID' })
  @IsUUID()
  allianceId: string;
}
