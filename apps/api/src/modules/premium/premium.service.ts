import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, MoreThan } from 'typeorm';
import { PremiumPass } from './entities/premium-pass.entity';
import { UserPremiumPass } from './entities/user-premium-pass.entity';

// --- BLOCKER F1 guard rails for `addBattlePassXp` -------------------------
//
// Three layers of defence around the battle-pass XP grant, mirroring the
// pattern already in `quest-progress.service.ts`:
//
//   1. PER-CALL CLAMP — even a maliciously crafted internal call (or a
//      buggy game-server change) can't push more than `XP_PER_TIER` worth
//      of XP through a single request. The DTO caps at 1000 too; this is
//      belt-and-braces in case the DTO is bypassed.
//
//   2. IDEMPOTENCY — `(userId, referenceId)` is recorded on first sight.
//      A retry with the same referenceId returns the cached row without
//      touching the DB. game-server tends to fire fire-and-forget after
//      battle resolution; without this, a network retry would double-
//      credit XP. Process-local on purpose — same trade-off as the
//      quest-progress dedupe (single-instance api today; a stronger
//      cross-replica guarantee needs a `battle_pass_xp_log` table with
//      UNIQUE(user_id, source, reference_id), left as follow-up).
//
//   3. DAILY CAP — per-user rolling window. Capped at 2000 XP/day, i.e.
//      ~2 tiers/day even if every legitimate event maxes out. This is
//      the actual progression governor; the per-call clamp only limits
//      burst size. Excess XP returns the unchanged row + an
//      `xpGranted: 0` flag rather than throwing, so a downstream
//      game-server flow that fans XP across multiple events doesn't
//      bubble a 4xx for a single capped event.
//
// All three are in-memory. Switching to DB-backed dedupe / cap is a clean
// migration: add a `battle_pass_xp_log` table with UNIQUE(user_id, source,
// reference_id) and an index on (user_id, awarded_at), then replace the
// `seenXpKeys` / `dailyXp` Maps with queries against it.

const XP_PER_CALL_MAX = 1000;
const PER_USER_BATTLE_PASS_XP_DAILY_CAP = 2000;
const XP_DEDUPE_MAX = 10_000;

interface CachedXpResult {
  /** Snapshot of the row at the time we first applied the grant. */
  userPassId: string;
  currentTier: number;
  tierXp: number;
}
const seenXpKeys = new Map<string, CachedXpResult>();
const seenXpOrder: string[] = [];

function recordXpKey(key: string, payload: CachedXpResult): void {
  if (seenXpKeys.has(key)) return;
  seenXpKeys.set(key, payload);
  seenXpOrder.push(key);
  while (seenXpOrder.length > XP_DEDUPE_MAX) {
    const oldest = seenXpOrder.shift();
    if (oldest) seenXpKeys.delete(oldest);
  }
}

interface DailyXpBucket {
  /** YYYY-MM-DD (UTC) — rolls over at 00:00 UTC. */
  day: string;
  total: number;
}
const dailyXp = new Map<string, DailyXpBucket>();

function currentUtcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function remainingDailyXp(userId: string): number {
  const day = currentUtcDay();
  const bucket = dailyXp.get(userId);
  if (!bucket || bucket.day !== day) return PER_USER_BATTLE_PASS_XP_DAILY_CAP;
  return Math.max(0, PER_USER_BATTLE_PASS_XP_DAILY_CAP - bucket.total);
}

function recordDailyXp(userId: string, awarded: number): void {
  if (awarded <= 0) return;
  const day = currentUtcDay();
  const existing = dailyXp.get(userId);
  if (!existing || existing.day !== day) {
    dailyXp.set(userId, { day, total: awarded });
    return;
  }
  existing.total += awarded;
}

@Injectable()
export class PremiumService {
  private readonly logger = new Logger(PremiumService.name);

  constructor(
    @InjectRepository(PremiumPass)
    private readonly passRepository: Repository<PremiumPass>,
    @InjectRepository(UserPremiumPass)
    private readonly userPassRepository: Repository<UserPremiumPass>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getAvailablePasses() {
    return this.passRepository.find({
      where: { isActive: true },
      order: { priceUsd: 'ASC' },
    });
  }

  async getPassByCode(code: string) {
    const pass = await this.passRepository.findOne({ where: { code } });
    if (!pass) throw new NotFoundException(`Premium pass '${code}' bulunamadı`);
    return pass;
  }

  async getUserActivePasses(userId: string) {
    const now = new Date();
    return this.userPassRepository.find({
      where: { userId, status: 'active', expiresAt: MoreThan(now) },
      relations: ['premiumPass'],
    });
  }

  async activatePass(
    userId: string,
    passCode: string,
    paymentProvider: string,
    subscriptionId?: string,
  ): Promise<UserPremiumPass> {
    const pass = await this.passRepository.findOne({ where: { code: passCode } });
    if (!pass) throw new NotFoundException('Premium pass bulunamadı');

    const existingActive = await this.userPassRepository.findOne({
      where: { userId, premiumPassId: pass.id, status: 'active' },
    });
    if (existingActive) {
      throw new BadRequestException('Bu pass zaten aktif');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pass.durationDays);

    const userPass = this.userPassRepository.create({
      userId,
      premiumPassId: pass.id,
      status: 'active',
      expiresAt,
      paymentProvider,
      subscriptionId: subscriptionId ?? null,
    });

    const saved = await this.userPassRepository.save(userPass);
    this.logger.log(`Premium pass aktif: kullanıcı=${userId}, pass=${pass.name}`);
    return saved;
  }

  /**
   * Grant battle-pass XP from an internal (game-server) event.
   *
   * BLOCKER F1 hardening — see the module-level guard rails block above
   * for the full rationale. Order of operations is deliberate:
   *
   *   a. Clamp the raw amount to `[0, XP_PER_CALL_MAX]`. Defends against
   *      bypassed DTO validation / future caller bugs.
   *   b. Short-circuit on the idempotency cache. Same `(userId,
   *      referenceId)` returns the previously-applied snapshot without
   *      a second DB write.
   *   c. Resolve the active battle pass row. If the user has none, the
   *      call is a no-op (returns null, same shape the route always had)
   *      and we DO NOT bank the referenceId — so when their pass
   *      activates later, the same event id can still credit XP.
   *   d. Apply the daily cap. If the user already used their 2000 XP
   *      today, we still mark the referenceId as seen (game-server's
   *      retry shouldn't keep hitting us) and return the unchanged row
   *      with `xpGranted: 0`. Partial grants (cap remaining < clamped
   *      amount) credit only the remainder.
   *   e. Persist & cache.
   */
  async addBattlePassXp(
    userId: string,
    rawXpAmount: number,
    source: string,
    referenceId: string,
  ): Promise<(UserPremiumPass & { xpGranted: number; alreadyApplied: boolean }) | null> {
    if (!referenceId || typeof referenceId !== 'string') {
      throw new BadRequestException('referenceId zorunlu (idempotency anahtarı)');
    }

    // (a) Per-call clamp — see XP_PER_CALL_MAX rationale at top of file.
    const clamped = Math.max(
      0,
      Math.min(XP_PER_CALL_MAX, Math.floor(Number(rawXpAmount) || 0)),
    );

    const dedupeKey = `${userId}:${referenceId}`;

    // (b) Idempotency — same (userId, referenceId) was already applied.
    const cached = seenXpKeys.get(dedupeKey);
    if (cached) {
      const existing = await this.userPassRepository.findOne({
        where: { id: cached.userPassId },
        relations: ['premiumPass'],
      });
      if (existing) {
        return Object.assign(existing, { xpGranted: 0, alreadyApplied: true });
      }
      // Pass was deleted between calls — fall through and try fresh.
    }

    const now = new Date();
    const battlePass = await this.userPassRepository.findOne({
      where: {
        userId,
        status: 'active',
        expiresAt: MoreThan(now),
      },
      relations: ['premiumPass'],
    });

    // (c) No active battle pass — null no-op, do not bank the reference.
    if (!battlePass || battlePass.premiumPass.passType !== 'battle_pass') {
      this.logger.debug(
        `addBattlePassXp no-op (no active battle pass): user=${userId} source=${source} ref=${referenceId}`,
      );
      return null;
    }

    // (d) Daily cap — credit only what's left in today's bucket.
    const remaining = remainingDailyXp(userId);
    const toGrant = Math.min(clamped, remaining);

    if (toGrant === 0) {
      // Mark seen so retries from game-server don't keep paging us.
      recordXpKey(dedupeKey, {
        userPassId: battlePass.id,
        currentTier: battlePass.currentTier,
        tierXp: battlePass.tierXp,
      });
      this.logger.warn(
        `Battle pass daily cap reached: user=${userId} source=${source} ref=${referenceId} requested=${clamped}`,
      );
      return Object.assign(battlePass, { xpGranted: 0, alreadyApplied: false });
    }

    const XP_PER_TIER = 1000;
    battlePass.tierXp += toGrant;
    const tiersGained = Math.floor(battlePass.tierXp / XP_PER_TIER);

    if (tiersGained > 0) {
      battlePass.currentTier = Math.min(
        battlePass.currentTier + tiersGained,
        50,
      );
      battlePass.tierXp = battlePass.tierXp % XP_PER_TIER;
    }

    const saved = await this.userPassRepository.save(battlePass);

    // (e) Cache + daily ledger.
    recordXpKey(dedupeKey, {
      userPassId: saved.id,
      currentTier: saved.currentTier,
      tierXp: saved.tierXp,
    });
    recordDailyXp(userId, toGrant);

    this.logger.log(
      `Battle pass XP granted: user=${userId} source=${source} ref=${referenceId} +${toGrant}xp tier=${saved.currentTier}`,
    );

    return Object.assign(saved, { xpGranted: toGrant, alreadyApplied: false });
  }

  async claimTierReward(userId: string, userPassId: string, tier: number): Promise<Record<string, unknown>> {
    // HIGH F4-econ — race-condition hardening.
    //
    // Previously this method did a non-transactional read of
    // `claimedRewards`, an UPDATE to `user_currency`, and a save() back to
    // the pass. Two parallel POSTs for the same (userPassId, tier) would
    // both observe `alreadyClaimed === false`, both credit the wallet,
    // and the last save() would just append a duplicate entry to
    // claimedRewards. Net effect: double-credit.
    //
    // Fix: wrap the whole flow in a transaction and take a
    // `pessimistic_write` row lock on `user_premium_pass` for the duration.
    // The second concurrent request blocks at findOne until the first
    // commits, then re-reads `claimedRewards` (now containing the tier)
    // and short-circuits with a BadRequest. Wallet UPDATE + the
    // claimedRewards save share the same tx, so they commit atomically.
    //
    // Deferred follow-up (documented, not implemented here): add a
    // dedicated `user_premium_pass_claim` table with
    // UNIQUE(user_pass_id, tier) and INSERT first to fail-fast on the
    // duplicate-key violation. Cleaner and lock-free, but requires a
    // migration + entity + read-side adjustments — out of scope for the
    // minimal fix.
    return this.dataSource.transaction(async (manager) => {
      const userPass = await manager.findOne(UserPremiumPass, {
        where: { id: userPassId, userId },
        relations: ['premiumPass'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!userPass) throw new NotFoundException('Pass bulunamadı');
      if (tier > userPass.currentTier) {
        throw new BadRequestException(`Tier ${tier} henüz açılmadı. Mevcut tier: ${userPass.currentTier}`);
      }

      // Re-check under the lock — a parallel request that won the race
      // has already mutated `claimedRewards` and committed.
      const alreadyClaimed = userPass.claimedRewards.some(
        (r: Record<string, unknown>) => r.tier === tier,
      );
      if (alreadyClaimed) {
        throw new BadRequestException(`Tier ${tier} ödülü zaten alındı`);
      }

      const tierRewards = userPass.premiumPass.tierRewards as Array<{ tier: number; reward: Record<string, unknown> }>;
      const tierData = tierRewards.find((t) => t.tier === tier);
      if (!tierData) {
        throw new NotFoundException(`Tier ${tier} için ödül tanımlanmamış`);
      }

      // Credit the reward into the player's wallet BEFORE marking it as
      // claimed — better to retry on a wallet-update failure than to mark
      // claimed and lose the reward entirely. The reward shape supports
      // nebulaCoins / voidCrystals / premiumGems / xp keys (battle-pass
      // tier rewards in the existing pass definitions follow this). Anything
      // outside that set is silently skipped so the tier still completes
      // and the FE toast doesn't lie.
      const reward = tierData.reward as Partial<{
        nebulaCoins: number; voidCrystals: number; premiumGems: number; xp: number;
      }>;
      const coins = Math.max(0, Math.floor(Number(reward.nebulaCoins ?? 0)));
      const crystals = Math.max(0, Math.floor(Number(reward.voidCrystals ?? 0)));
      const gems = Math.max(0, Math.floor(Number(reward.premiumGems ?? 0)));
      if (coins + crystals + gems > 0) {
        // Lazy-init the wallet row (mirrors the shop service pattern) so
        // a player who's never touched the shop still gets their first
        // tier claim credited. Both queries go through `manager` so they
        // share the surrounding transaction and roll back atomically
        // if the subsequent save() throws.
        await manager.query(
          `INSERT INTO user_currency (user_id) VALUES ($1::uuid)
             ON CONFLICT (user_id) DO NOTHING`,
          [userId],
        );
        await manager.query(
          `UPDATE user_currency
              SET nebula_coins  = nebula_coins  + $2,
                  void_crystals = void_crystals + $3,
                  premium_gems  = premium_gems  + $4
            WHERE user_id = $1::uuid`,
          [userId, coins, crystals, gems],
        );
      }

      userPass.claimedRewards = [
        ...userPass.claimedRewards,
        { tier, claimedAt: new Date(), reward: tierData.reward },
      ];
      await manager.save(UserPremiumPass, userPass);

      this.logger.log(
        `Tier ödülü alındı: kullanıcı=${userId}, tier=${tier}, +${coins} coins +${crystals} crystals +${gems} gems`,
      );
      return tierData.reward;
    });
  }

  async cancelPass(userId: string, userPassId: string): Promise<UserPremiumPass> {
    const userPass = await this.userPassRepository.findOne({
      where: { id: userPassId, userId, status: 'active' },
    });
    if (!userPass) throw new NotFoundException('Aktif pass bulunamadı');

    userPass.status = 'cancelled';
    userPass.autoRenew = false;
    return this.userPassRepository.save(userPass);
  }

  async checkPremiumStatus(userId: string): Promise<Record<string, unknown>> {
    const activePasses = await this.getUserActivePasses(userId);
    const hasPremium = activePasses.length > 0;
    const hasBattlePass = activePasses.some((p) => p.premiumPass.passType === 'battle_pass');

    const multipliers = activePasses.reduce(
      (acc, pass) => {
        const rewards = pass.premiumPass.rewards as Record<string, unknown>;
        const resMult = (rewards.resource_multiplier as number) || 1;
        const xpMult = (rewards.xp_multiplier as number) || 1;
        return {
          resource: Math.max(acc.resource, resMult),
          xp: Math.max(acc.xp, xpMult),
        };
      },
      { resource: 1, xp: 1 },
    );

    return {
      hasPremium,
      hasBattlePass,
      activePasses: activePasses.map((p) => ({
        id: p.id,
        passName: p.premiumPass.name,
        passType: p.premiumPass.passType,
        expiresAt: p.expiresAt,
        currentTier: p.currentTier,
      })),
      multipliers,
    };
  }
}
