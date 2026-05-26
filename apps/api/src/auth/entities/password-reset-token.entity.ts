import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * One-shot password reset token.
 *
 * - `token` is a 64-char hex string (32 bytes from crypto.randomBytes).
 *   Indexed because the reset endpoint looks rows up by token alone.
 * - `usedAt` is null until the token is consumed; setting it marks the
 *   row dead. We never delete rows so we can audit reset attempts.
 * - `expiresAt` is set to createdAt + 1 hour at issue time.
 *
 * Note: kept in its own table (not on `users`) so a user can have
 * multiple outstanding tokens without race conditions, and so a leaked
 * old token doesn't block a fresh request.
 */
@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index('IDX_password_reset_tokens_token')
  @Column({ type: 'varchar', length: 128 })
  token: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;
}
