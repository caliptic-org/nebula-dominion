import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddReactionDto {
  @ApiProperty({ description: 'Emoji (max 10 karakter)', maxLength: 10 })
  @IsString()
  @Length(1, 10)
  emoji: string;
}
