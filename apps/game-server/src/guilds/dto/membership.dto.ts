import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

// userId field removed (P5-S1 security fix): previously the controller
// trusted dto.userId from the request body, which let an attacker force
// any victim into a guild or drain their resources by spoofing the field.
// The authenticated user is now derived from the JWT subject claim via
// the @CurrentUser() decorator in GuildsController.

export class JoinGuildDto {}

export class LeaveGuildDto {}

export class DonateDto {
  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  resource?: string;
}
