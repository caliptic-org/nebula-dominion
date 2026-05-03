import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeclareWarByTagDto {
  @ApiProperty({ description: 'Hedef lonca etiketi (tag)', minLength: 2, maxLength: 10 })
  @IsString()
  @Length(2, 10)
  targetTag: string;
}
