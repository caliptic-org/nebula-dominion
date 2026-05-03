import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token issued at login or last refresh' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
