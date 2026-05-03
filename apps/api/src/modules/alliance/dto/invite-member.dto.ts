import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteMemberDto {
  @ApiProperty({ description: 'Davet edilecek oyuncu UUID' })
  @IsUUID()
  playerId: string;
}
