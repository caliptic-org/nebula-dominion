import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'commander_zero', description: 'Unique username (3-30 chars, alphanumeric + underscore)' })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username may only contain letters, numbers and underscores' })
  username: string;

  @ApiProperty({ example: 'commander@nebula.io' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Str0ngP@ss!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
