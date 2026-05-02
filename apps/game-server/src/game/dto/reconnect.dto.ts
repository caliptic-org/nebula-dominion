import { IsString } from 'class-validator';

export class ReconnectDto {
  @IsString()
  reconnectToken: string;
}
