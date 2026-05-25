import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

export class QueueUnitDto {
  /**
   * Lowercase snake_case unit identifier (e.g. `marine`, `zergling`).
   * Accepts arbitrary new types so frontend race lexicons stay flexible —
   * known types in UNIT_CONFIGS get their canonical name/emoji/duration;
   * unknown ones fall back to a 30s default and a title-cased label.
   */
  @IsString()
  @Matches(/^[a-z][a-z0-9_]{0,63}$/, {
    message: 'unitType must be lowercase snake_case (1-64 chars)',
  })
  unitType: string;

  @IsInt()
  @Min(1)
  @Max(20)
  level: number;
}
