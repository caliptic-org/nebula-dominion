import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendChatMessageDto {
  @ApiProperty({ description: 'Mesaj içeriği (1-500 karakter)', minLength: 1, maxLength: 500 })
  @IsString()
  @Length(1, 500)
  content: string;
}
