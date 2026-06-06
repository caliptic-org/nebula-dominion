import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

export class QueueUnitDto {
  /**
   * Lowercase snake_case unit identifier (e.g. `marine`, `zergling`).
   * BasesService.queueUnit() rejects unknown types with a 400 — the
   * permissive regex here just shapes the payload, the catalog check
   * (UNIT_CONFIGS lookup + race-match + trainable gate) happens in the
   * service layer alongside the cost deduction.
   */
  @IsString()
  @Matches(/^[a-z][a-z0-9_]{0,63}$/, {
    message: 'unitType must be lowercase snake_case (1-64 chars)',
  })
  unitType: string;

  /**
   * Target level for the queued unit. The @Max(20) ceiling is kept as a
   * hard structural cap; the economic deterrent on high levels comes
   * from the 1.5^(level-1) cost ramp in BasesService.queueUnit() — at
   * L20 the cost is ×2216 base, making free max-tier mints (the
   * ECON-CYC6-01 exploit) impossible without a matching wallet.
   */
  @IsInt()
  @Min(1)
  @Max(20)
  level: number;
}
