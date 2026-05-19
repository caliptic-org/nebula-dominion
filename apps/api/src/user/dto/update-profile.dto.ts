import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Display username (3-32 chars, alphanumeric + _-)' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9_\-]+$/, {
    message: 'username may only contain letters, digits, underscore or hyphen',
  })
  username?: string;
}
