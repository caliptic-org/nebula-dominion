import { IsString, IsNotEmpty, IsOptional, IsInt, IsIn, Min, Max } from 'class-validator';

// userId field removed (P5-S1 security fix): previously the controller
// trusted dto.userId from the request body, which let an attacker force
// any victim into a guild or drain their resources by spoofing the field.
// The authenticated user is now derived from the JWT subject claim via
// the @CurrentUser() decorator in GuildsController.

export class JoinGuildDto {}

export class LeaveGuildDto {}

// Allowed donation currencies — must match player_resources column names.
// `population` and `science` are deliberately excluded: population is
// non-fungible head-count and science is meant to gate research alone.
export const DONATABLE_RESOURCES = ['mineral', 'gas', 'energy'] as const;
export type DonatableResource = (typeof DONATABLE_RESOURCES)[number];

export class DonateDto {
  // Audit ECON-CYC6-03: defence-in-depth ceiling so a single donate call
  // can never bump contributionPts by an absurd amount even if a future
  // refactor accidentally drops the player_resources debit. 10M is well
  // above any legitimate Lv 54 stockpile but small enough that an
  // exploit attempt is bounded and obvious in telemetry.
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  amount: number;

  // Pre-fix the field accepted any free-form string; the service never
  // read it, so callers could not actually donate gas/energy separately.
  // Now whitelisted to the three currencies the resources table tracks
  // and consumed by recordDonation() to debit the right column.
  @IsOptional()
  @IsString()
  @IsIn(DONATABLE_RESOURCES as unknown as string[])
  resource?: DonatableResource;
}
