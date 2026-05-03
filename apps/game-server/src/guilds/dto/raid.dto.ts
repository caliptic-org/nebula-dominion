import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class RaidAttackDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsInt()
  @Min(1)
  damage: number;
}
