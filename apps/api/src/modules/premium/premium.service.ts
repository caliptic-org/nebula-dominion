import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, MoreThan } from 'typeorm';
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

// --- MON-3: battle-pass free vs premium track split ----------------------
//
// The season pass shipped a flat `tier_rewards` array with NO track field,
// so every reward — including the cosmetics and the tier-40 unit unlock the
// 800-gem `battle_pass_premium` SKU is meant to gate — was claimable by
// anyone who reached the tier. The premium SKU bought nothing.
//
// Rather than re-seed the JSONB via a migration (a bad migration would
// crash-loop the api — boot runs `migrationsRun`), the track is derived in
// TypeScript from the reward `type` discriminator the seed already uses:
//
//   • premium track → `cosmetic` (skins/frames/trails/titles) and
//     `unit_unlock`. The prestige / power rewards that justify the
//     800-gem ($9.99) premium pass.
//   • free track    → everything else: `void_crystals`, `currency`,
//     `resource_pack`, `xp_booster`. Modest, functional, claimable by all
//     who reach the tier.
//
// `claimTierReward` gates premium-track tiers on the player actually owning
// the premium pass; `getAvailablePasses`/`getPassByCode` annotate each tier
// with its `track` so clients can render the two-column path and lock the
// premium rows for non-owners.
const PREMIUM_REWARD_TYPES = new Set(['cosmetic', 'unit_unlock']);

/** SKU whose purchase unlocks the premium battle-pass track. */
const PREMIUM_TRACK_SKU = 'battle_pass_premium';

type BattlePassTrack = 'free' | 'premium';

/** Classify a tier reward into its track from the reward `type`. */
function rewardTrack(reward: unknown): BattlePassTrack {
  const type =
    reward && typeof reward === 'object' && typeof (reward as { type?: unknown }).type === 'string'
      ? (reward as { type: string }).type
      : '';
  return PREMIUM_REWARD_TYPES.has(type) ? 'premium' : 'free';
}

/**
 * Annotate each `tier_rewards` entry with its `track` so API consumers can
 * render the free/premium reward path. Non-battle passes (no `tierRewards`
 * array) pass through untouched. The track is derived, not stored — no
 * migration needed.
 */
function annotateTierTracks<T extends { tierRewards?: unknown }>(pass: T): T {
  const tiers = (pass as { tierRewards?: unknown }).tierRewards;
  if (!Array.isArray(tiers)) return pass;
  return {
    ...pass,
    tierRewards: tiers.map((t) =>
      t && typeof t === 'object'
        ? { ...(t as Record<string, unknown>), track: rewardTrack((t as { reward?: unknown }).reward) }
        : t,
    ),
  } as T;
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
    const passes = await this.passRepository.find({
      where: { isActive: true },
      order: { priceUsd: 'ASC' },
    });
    return passes.map((p) => annotateTierTracks(p));
  }

  async getPassByCode(code: string) {
    const pass = await this.passRepository.findOne({ where: { code } });
    if (!pass) throw new NotFoundException(`Premium pass '${code}' bulunamadı`);
    return annotateTierTracks(pass);
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
   * FLOW-001 (battle pass) — ensure the player has a free-track enrollment in
   * the current battle-pass season so XP can accumulate.
   *
   * The battle pass has a FREE track for every player, but nothing ever
   * created a UserPremiumPass: buying the `battle_pass_premium` SKU only writes
   * a user_inventory row (the MON-3 ownership signal), and there was no free
   * enrollment path at all. So addBattlePassXp always no-op'd and the pass
   * never progressed for ANYONE — MON-3's tier gating was academic. This
   * lazily creates a free UserPremiumPass on first battle. Idempotent: returns
   * the existing active battle-pass enrollment when present. Premium-track
   * access is still decided separately by ownsPremiumTrack (the SKU), so free
   * enrollment here doesn't grant premium rewards.
   */
  async ensureBattlePassEnrollment(userId: string): Promise<UserPremiumPass | null> {
    const now = new Date();
    const existing = await this.userPassRepository.findOne({
      where: {
        userId,
        status: 'active',
        expiresAt: MoreThan(now),
        premiumPass: { passType: 'battle_pass' },
      },
      relations: ['premiumPass'],
    });
    if (existing) return existing;

    const season = await this.passRepository.findOne({
      where: { passType: 'battle_pass', isActive: true },
      order: { createdAt: 'DESC' },
    });
    if (!season) {
      this.logger.warn('ensureBattlePassEnrollment: no active battle_pass season found');
      return null;
    }

    // Guard against a concurrent enrollment for this exact season.
    const dup = await this.userPassRepository.findOne({
      where: { userId, premiumPassId: season.id, status: 'active' },
    });
    if (dup) return dup;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + season.durationDays);
    const userPass = this.userPassRepository.create({
      userId,
      premiumPassId: season.id,
      status: 'active',
      expiresAt,
      currentTier: 0,
      tierXp: 0,
      paymentProvider: 'free',
    });
    const saved = await this.userPassRepository.save(userPass);
    this.logger.log(`Battle pass free enrollment: user=${userId} season=${season.code}`);
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
    let battlePass = await this.userPassRepository.findOne({
      where: {
        userId,
        status: 'active',
        expiresAt: MoreThan(now),
        premiumPass: { passType: 'battle_pass' },
      },
      relations: ['premiumPass'],
    });

    // (c) No active battle pass — FLOW-001: auto-enroll in the free season so
    // the pass actually progresses (previously this no-op'd and nobody ever
    // had a UserPremiumPass). If there's no battle_pass season configured at
    // all, stay a no-op and do NOT bank the reference (so the event can credit
    // once a season exists).
    if (!battlePass) {
      battlePass = await this.ensureBattlePassEnrollment(userId);
      if (!battlePass) {
        this.logger.debug(
          `addBattlePassXp no-op (no battle_pass season): user=${userId} source=${source} ref=${referenceId}`,
        );
        return null;
      }
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

  /**
   * MON-3 — does the user own the premium battle-pass track? Ownership is a
   * `user_inventory` row for the `battle_pass_premium` SKU that hasn't
   * expired; the shop's `purchaseWithInGameCurrency` upserts this row when
   * the 800-gem SKU is bought. Runs through the passed `manager` so it joins
   * the surrounding claim transaction and sees a same-tx purchase.
   */
  private async ownsPremiumTrack(manager: EntityManager, userId: string): Promise<boolean> {
    const rows = await manager.query(
      `SELECT 1
         FROM user_inventory ui
         JOIN shop_items si ON si.id = ui.shop_item_id
        WHERE ui.user_id = $1::uuid
          AND si.sku = $2
          AND (ui.expires_at IS NULL OR ui.expires_at > NOW())
        LIMIT 1`,
      [userId, PREMIUM_TRACK_SKU],
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  /**
   * Public, non-transaction variant of ownsPremiumTrack for read-only status
   * (the FE battle-pass UI shows premium-track rewards as claimable vs locked
   * by this flag; the claim itself is still gated server-side). Same
   * user_inventory + battle_pass_premium SKU check.
   */
  async ownsPremiumBattlePass(userId: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT 1
         FROM user_inventory ui
         JOIN shop_items si ON si.id = ui.shop_item_id
        WHERE ui.user_id = $1::uuid
          AND si.sku = $2
          AND (ui.expires_at IS NULL OR ui.expires_at > NOW())
        LIMIT 1`,
      [userId, PREMIUM_TRACK_SKU],
    );
    return Array.isArray(rows) && rows.length > 0;
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

      // MON-3 — premium-track gate. Cosmetics and unit unlocks live on the
      // premium track and are claimable ONLY by players who bought the
      // `battle_pass_premium` SKU. Free-track rewards (currency / resources /
      // boosters) stay claimable by everyone who reached the tier. Without
      // this, the 800-gem premium pass bought nothing and every reward was
      // free. The ownership check runs in-tx so a purchase committed in the
      // same transaction is visible.
      if (rewardTrack(tierData.reward) === 'premium') {
        const owns = await this.ownsPremiumTrack(manager, userId);
        if (!owns) {
          throw new ForbiddenException(
            `Tier ${tier} ödülü premium savaş geçişine özel. Önce Premium Geçiş satın al.`,
          );
        }
      }

      // Credit currency rewards into the player's wallet BEFORE marking the
      // tier claimed — better to retry on a wallet failure than to mark
      // claimed and lose the reward. The seeded tier rewards are
      // discriminated by `type`:
      //   • {type:'void_crystals', amount}              → wallet void_crystals
      //   • {type:'currency', nebula_coins, premium_gems, void_crystals}
      //                                                  → wallet currencies
      // Non-wallet rewards (cosmetic / unit_unlock / resource_pack /
      // xp_booster) are recorded as claimed here so the tier completes and
      // the FE toast doesn't lie; granting the actual cosmetic, unit unlock,
      // in-game resources, or XP buff is wired through the cosmetic /
      // inventory systems and is out of scope for this wallet credit.
      //
      // NOTE: the previous code read camelCase keys (nebulaCoins /
      // voidCrystals / premiumGems) that exist on NO seeded reward, so it
      // credited zero for every tier. This now matches the real `type`-
      // discriminated snake_case shape.
      const reward = tierData.reward as Record<string, unknown>;
      const num = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));
      let coins = 0;
      let crystals = 0;
      let gems = 0;
      if (reward.type === 'void_crystals') {
        crystals = num(reward.amount);
      } else if (reward.type === 'currency') {
        coins = num(reward.nebula_coins);
        crystals = num(reward.void_crystals);
        gems = num(reward.premium_gems);
      }
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
    // ownsPremiumBattlePass = bought the battle_pass_premium SKU (the premium
    // TRACK), distinct from hasBattlePass (now true for everyone via free
    // enrollment). The FE uses it to lock/unlock premium-track rewards.
    const ownsPremiumBattlePassFlag = await this.ownsPremiumBattlePass(userId);

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
      ownsPremiumBattlePass: ownsPremiumBattlePassFlag,
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
