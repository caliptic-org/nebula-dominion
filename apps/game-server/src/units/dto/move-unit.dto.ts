import { IsInt, IsUUID, Min } from 'class-validator';

export class MoveUnitDto {
  @IsUUID()
  unitId: string;

  @IsInt()
  @Min(0)
  toX: number;

  @IsInt()
  @Min(0)
  toY: number;
}
