import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class JoinGuildDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class LeaveGuildDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class DonateDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  resource?: string;
}
