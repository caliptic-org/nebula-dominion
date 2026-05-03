import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'commander42',
    description: 'Username or email address',
  })
  @IsString()
  @MinLength(1)
  identifier: string;

  @ApiProperty({ example: 'Str0ng!Pass' })
  @IsString()
  password: string;
}
