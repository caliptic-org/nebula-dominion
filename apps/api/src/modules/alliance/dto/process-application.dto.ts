import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ApplicationAction {
  ACCEPT = 'accept',
  REJECT = 'reject',
}

export class ProcessApplicationDto {
  @ApiProperty({ enum: ApplicationAction, description: 'Başvuruyu kabul et veya reddet' })
  @IsEnum(ApplicationAction)
  action: ApplicationAction;
}
