import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MailType } from '../entities/mail.entity';

export class MailRewardDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty()
  @IsString()
  icon: string;
}

export class CreateMailDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: MailType })
  @IsEnum(MailType)
  type: MailType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  body: string;

  @ApiProperty()
  @IsString()
  sender: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ type: [MailRewardDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MailRewardDto)
  rewards?: MailRewardDto[];
}
