import { IsEnum, IsUUID } from 'class-validator';
import { UnitType } from '../constants/race-configs.constants';

export class TrainUnitDto {
  @IsUUID()
  buildingId: string;

  @IsEnum(UnitType)
  unitType: UnitType;
}
