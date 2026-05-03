import { IsEnum, IsInt, IsOptional, IsPositive, IsUUID, Max, Min } from 'class-validator';
import { ResourceType } from '../../resources/entities/resource-config.entity';

export class CreateDonateRequestDto {
  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  amount?: number;
}

export class FulfillDonateRequestDto {
  @IsUUID()
  requestId: string;

  @IsInt()
  @IsPositive()
  amount: number;
}
