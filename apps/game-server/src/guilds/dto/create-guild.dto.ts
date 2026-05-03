import { IsString, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateGuildDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(5)
  @Matches(/^[A-Z0-9]+$/, { message: 'tag must be 3-5 uppercase alphanumeric characters' })
  tag: string;

  @IsString()
  @IsNotEmpty()
  leaderId: string;
}
