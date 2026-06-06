import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  /**
   * Normalize email to lowercase + trim BEFORE @IsEmail() runs. Both
   * AuthService.login (dto.identifier.toLowerCase()) and
   * forgotPassword (email.toLowerCase().trim()) lookup with a
   * lowercased identifier, so storing the raw mixed-case verbatim left
   * a HIGH-severity gap:
   *
   *   1. User registers "Foo@x.com"  → users.email = "Foo@x.com"
   *   2. They login with "foo@x.com" → WHERE email='foo@x.com'
   *      misses the row (Postgres UNIQUE on email is case-sensitive)
   *      → UnauthorizedException "Invalid credentials".
   *   3. The "forgot password" silent-noop path also misses, so the
   *      account is effectively orphaned.
   *   4. Worse: a different actor can now re-register "foo@x.com" as
   *      a brand-new account — the UNIQUE constraint sees the two
   *      strings as distinct, so account squatting becomes possible.
   *
   * Transform-based normalization is the canonical contract: by the
   * time AuthService.register sees the DTO, dto.email is already
   * lowercase + trimmed. AuthService still normalizes again as
   * defense-in-depth (transformers can be skipped if validation
   * pipeline is misconfigured), but the DTO is the source of truth.
   */
  @ApiProperty({ example: 'user@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'commander42' })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Username may only contain letters, numbers, underscores and hyphens' })
  username: string;

  @ApiProperty({ example: 'Str0ng!Pass' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
