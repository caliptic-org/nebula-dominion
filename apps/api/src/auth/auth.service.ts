import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { User } from '../user/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PasswordResetToken } from './entities/password-reset-token.entity';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: Omit<User, 'password'>;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private readonly resetRepo: Repository<PasswordResetToken>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * TEMPORARY playtest rule — accounts created with a @yopmail.com (disposable
   * email) address start with their resource wallet pinned to the cap so
   * a tester can jump straight into mid-game content without grinding the
   * Çağ 1 economy. Resources written: mineral / gas / energy / science.
   *
   * Caps come from apps/game-server/src/resources/entities/resource.entity.ts
   * (mineral=24000, gas=14400, energy=8400, science=999999). The row is
   * created via UPSERT so a yopmail user who hits getOrCreate first via
   * game-server's lazy init still gets bumped here on retry.
   *
   * REMOVE this branch before public launch. The yopmail check is the
   * delete marker — grep for "isYopmail" and drop the whole helper.
   */
  private isYopmail(email: string): boolean {
    return email.toLowerCase().endsWith('@yopmail.com');
  }

  private async grantMaxResources(userId: string): Promise<void> {
    // Caps mirror the entity defaults — bump if those drift. Plain SQL
    // UPSERT because the game-server-owned `player_resources` table sits
    // in the same Postgres DB but its TypeORM entity isn't imported by
    // the api app. ON CONFLICT covers the lazy-init race where game-server
    // already created the row at first /resources read.
    // 9 distinct $-params instead of reusing $2..$5 for both value+cap
    // columns: post migration 1779800000000 the wallet columns are
    // numeric(20,4) while the cap columns are bigint, and Postgres can't
    // deduce a single type for a parameter that lands in BOTH a numeric
    // and a bigint slot — `inconsistent types deduced for parameter $2`.
    // One param per column dodges the inference entirely.
    const sql = `
      INSERT INTO player_resources
        (player_id, mineral, gas, energy, science,
         mineral_cap, gas_cap, energy_cap, science_cap)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (player_id) DO UPDATE SET
        mineral = EXCLUDED.mineral,
        gas     = EXCLUDED.gas,
        energy  = EXCLUDED.energy,
        science = EXCLUDED.science
    `;
    try {
      // 10T (10 trillion) across all four currencies. Matches the new
      // entity cap defaults from migration 1779800000000-ExpandResource
      // Capacity which widened the wallet to numeric(20,4) so Lv 54
      // upgrade costs (≈10^12) actually fit. Below that cap the tester
      // can chain dozens of late-game purchases without ever waiting on
      // the trickle.
      const MAX = 10_000_000_000_000;  // 10T
      await this.dataSource.query(sql, [
        userId,
        MAX,  // mineral == kredi
        MAX,  // gas     == yakıt
        MAX,  // energy  == enerji
        MAX,  // science == bilim
        MAX,  // mineral_cap
        MAX,  // gas_cap
        MAX,  // energy_cap
        MAX,  // science_cap
      ]);
      this.logger.log(`yopmail playtest grant: maxed resources (10T each) for user=${userId}`);
    } catch (err) {
      // Non-fatal — log and let the user proceed. game-server's lazy
      // getOrCreate still gives them the default 500/200/250/0 wallet.
      this.logger.warn(
        `yopmail playtest grant failed for ${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * BLOCKER CHAIN-08-A1 fix — starter premium wallet.
   *
   * Without this, every fresh account had `user_currency.premium_gems = 0`
   * the first time the shop HUD rendered, and every Satın Al attempt
   * 400'd with "Yetersiz bakiye: premium_gems 0 < 200". The shop HUD
   * (previously reading game-server energy) made it LOOK like the player
   * had 250 gems, so the failure read as a scam.
   *
   * Now we materialise the api-side wallet row on registration with a
   * small starter balance (100 premium_gems + 1000 nebula_coins). This
   * is the same balance InventoryService.getWallet() seeds for legacy
   * accounts; the two paths share the constants conceptually so a tester
   * can buy at least the cheap SKUs (speed-boost @ 50 gems) without
   * going through XP-conversion grind first.
   *
   * Idempotent: ON CONFLICT DO NOTHING preserves any pre-existing row
   * (e.g. inventory.sellItem already credited the player before signup
   * raced the wallet insert).
   *
   * Best-effort: a failed seed becomes a warn log. The user can still
   * play — InventoryService.getWallet() will self-heal on first /wallet
   * fetch.
   */
  private async seedStarterWallet(userId: string): Promise<void> {
    const STARTER_PREMIUM_GEMS = 100;
    const STARTER_NEBULA_COINS = 1000;
    try {
      await this.dataSource.query(
        `INSERT INTO user_currency
           (user_id, premium_gems, nebula_coins, void_crystals, updated_at)
         VALUES ($1::uuid, $2, $3, 0, NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, STARTER_PREMIUM_GEMS, STARTER_NEBULA_COINS],
      );
      this.logger.log(
        `seed wallet: +${STARTER_PREMIUM_GEMS} premium_gems, +${STARTER_NEBULA_COINS} nebula_coins for user=${userId}`,
      );
    } catch (err) {
      this.logger.warn(
        `seedStarterWallet failed for ${userId}: ${
          err instanceof Error ? err.message : String(err)
        } — InventoryService.getWallet will self-heal on first /wallet fetch`,
      );
    }
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });
    if (existing) {
      throw new ConflictException('Email or username already taken');
    }

    const rounds = this.config.get<number>('bcrypt.rounds', 10);
    const hashed = await bcrypt.hash(dto.password, rounds);

    const user = this.userRepo.create({
      email: dto.email,
      username: dto.username,
      password: hashed,
    });
    await this.userRepo.save(user);

    // Seed the api-side premium wallet so the shop HUD has a non-zero
    // balance to show and the FIRST purchase doesn't bounce with
    // "Yetersiz bakiye". See seedStarterWallet block comment.
    await this.seedStarterWallet(user.id);

    // TEMPORARY playtest rule (remove before launch) — @yopmail accounts
    // skip the early-game resource grind so testers can immediately try
    // late-game buildings/units without waiting on the trickle.
    if (this.isYopmail(user.email)) {
      await this.grantMaxResources(user.id);
    }

    return this.buildAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const isEmail = dto.identifier.includes('@');
    const where = isEmail
      ? { email: dto.identifier.toLowerCase() }
      : { username: dto.identifier };
    const user = await this.userRepo.findOne({ where });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    return this.buildAuthResult(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string; type?: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.userRepo.findOne({ where: { id: payload.sub, isActive: true } });
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.signTokens(user);
  }

  /**
   * Always returns `{ ok: true }` regardless of whether the email exists,
   * so an attacker can't probe the user table by submitting addresses
   * and watching for "user not found" vs. "email sent" responses
   * (account enumeration). The dev console log is the only side effect
   * that varies, and it's not exposed over the wire.
   */
  async forgotPassword(email: string): Promise<{ ok: true }> {
    const normalized = email.toLowerCase().trim();
    const user = await this.userRepo.findOne({ where: { email: normalized } });
    if (user && user.isActive) {
      const token = crypto.randomBytes(32).toString('hex');
      const now = new Date();
      const entry = this.resetRepo.create({
        userId: user.id,
        token,
        expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
      });
      await this.resetRepo.save(entry);
      // No SMTP yet — surface the token via the API log so a dev can
      // copy it into the /reset-password URL during testing. Replace
      // with a transactional email send before going to production.
      this.logger.log(`RESET TOKEN for ${normalized}: ${token}`);
    }
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ ok: true }> {
    const entry = await this.resetRepo.findOne({ where: { token } });
    if (!entry) {
      throw new BadRequestException('Invalid or expired token');
    }
    const now = new Date();
    if (entry.usedAt !== null) {
      throw new BadRequestException('Invalid or expired token');
    }
    if (entry.expiresAt.getTime() <= now.getTime()) {
      throw new BadRequestException('Invalid or expired token');
    }
    const user = await this.userRepo.findOne({ where: { id: entry.userId } });
    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    const rounds = this.config.get<number>('bcrypt.rounds', 10);
    user.password = await bcrypt.hash(newPassword, rounds);
    await this.userRepo.save(user);

    entry.usedAt = now;
    await this.resetRepo.save(entry);

    return { ok: true };
  }

  async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepo.findOne({ where: { id: userId, isActive: true } });
    if (!user) {
      throw new UnauthorizedException();
    }
    const { password: _, ...safe } = user;
    return safe as Omit<User, 'password'>;
  }

  private buildAuthResult(user: User): AuthResult {
    const tokens = this.signTokens(user);
    const { password: _, ...safeUser } = user;
    return { ...tokens, user: safeUser as Omit<User, 'password'> };
  }

  private signTokens(user: User): AuthTokens {
    const basePayload = { sub: user.id, email: user.email, username: user.username };
    const accessToken = this.jwtService.sign(basePayload, {
      secret: this.config.get<string>('jwt.secret'),
      expiresIn: this.config.get<string>('jwt.expiresIn'),
    });
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
      },
    );
    return { accessToken, refreshToken };
  }
}
