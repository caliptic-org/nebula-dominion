import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UnitType } from '../constants/race-configs.constants';

export class TrainUnitDto {
  @IsUUID()
  buildingId: string;

  @IsEnum(UnitType)
  unitType: UnitType;

  /**
   * Batch size — how many units to queue in this single training order.
   * Defaults to 1 (legacy single-unit behaviour).  Capped at 99 to match
   * the frontend +/- stepper and the DB CHECK constraint added in
   * migration 1779810000000.  Cost is deducted as unitCost × count and
   * the queue row's completesAt = now + (duration × count).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  count?: number;
}
