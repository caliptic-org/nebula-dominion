import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v5 as uuidv5 } from 'uuid';
import { ShopItem } from './entities/shop-item.entity';
import { UserInventory } from './entities/user-inventory.entity';
import { VipService } from '../vip/vip.service';
import { PurchaseDto } from './dto/purchase.dto';

/**
 * Stable UUIDv5 namespace for synthetic transactionIds minted by the
 * in-game-currency purchase flow (see HIGH ECON-SHOP-VIP-SPEND-NO-
 * IDEMPOTENCY-INGAME, audit cycle 6).
 *
 * The synthetic id is hashed (v5) from `userId:sku:inventoryRowId:
 * acquiredAtMillis` so the SAME purchase event — when re-driven through
 * the post-tx hook (controller retry, supervisor restart mid-hook, a
 * future queued-job redelivery) — collapses to the SAME ledger row via
 * vip_spend_ledger UNIQUE(transaction_id). A legitimately separate
 * purchase event (new HTTP call, distinct acquiredAt epoch on a fresh
 * inventory row OR a quantity bump that touches a different
 * acquiredAtMillis cohort) still mints a fresh synthetic id and credits
 * normally.
 *
 * Namespace UUID is a constant random v4 — no semantic meaning, just a
 * v5 seed pinned for the project so synthetic ids stay stable across
 * deploys.
 */
const SHOP_INGAME_VIP_TXID_NAMESPACE =
  'b7f9c6e0-3a4d-4e6b-9c2f-7d1e4f8a5b21';

interface ShopFilter {
  category?: string;
  rarity?: string;
  tag?: string;
  ageRequired?: number;
}

/**
 * Hard bounds on `quantity` for any single purchase call.
 *
 * Primary validation lives on PurchaseDto (@Min(1) @Max(99) @IsInt) so
 * malformed requests fail at the global ValidationPipe with a 400. The
 * constants here re-apply the same bounds inside the service as
 * defence-in-depth — if any future caller bypasses the DTO (internal
 * service-to-service call, a test, etc.) we still won't let a negative
 * or absurd quantity flow into the wallet UPDATE, which previously
 * **credited** the player (UPDATE balance - (-N) = +N).
 */
const PURCHASE_QUANTITY_MIN = 1;
const PURCHASE_QUANTITY_MAX = 99;

@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(ShopItem)
    private readonly shopItemRepository: Repository<ShopItem>,
    @InjectRepository(UserInventory)
    private readonly inventoryRepository: Repository<UserInventory>,
    /** Injected so premium_pass purchases (VIP SKUs) actually upgrade
     *  the player's VIP tier instead of just adding an inventory row.
     *  See purchaseWithInGameCurrency's post-transaction hook. */
    private readonly vipService: VipService,
  ) {}

  async getShopItems(filter: ShopFilter = {}) {
    const now = new Date();
    const qb = this.shopItemRepository
      .createQueryBuilder('item')
      .where('item.isActive = true')
      .andWhere('(item.availableFrom IS NULL OR item.availableFrom <= :now)', { now })
      .andWhere('(item.availableUntil IS NULL OR item.availableUntil >= :now)', { now })
      .andWhere('(item.stockRemaining IS NULL OR item.stockRemaining > 0)');

    if (filter.category) {
      qb.andWhere('item.category = :category', { category: filter.category });
    }
    if (filter.rarity) {
      qb.andWhere('item.rarity = :rarity', { rarity: filter.rarity });
    }
    if (filter.tag) {
      qb.andWhere(':tag = ANY(item.tags)', { tag: filter.tag });
    }
    if (filter.ageRequired) {
      qb.andWhere('(item.ageRequired IS NULL OR item.ageRequired <= :age)', { age: filter.ageRequired });
    }

    return qb.orderBy('item.sortOrder', 'ASC').getMany();
  }

  async getItemBySku(sku: string) {
    const item = await this.shopItemRepository.findOne({ where: { sku } });
    if (!item) throw new NotFoundException(`İtem '${sku}' bulunamadı`);
    return item;
  }

  async getFeaturedItems() {
    return this.shopItemRepository.find({
      where: { isActive: true, rarity: 'legendary' },
      order: { sortOrder: 'ASC' },
      take: 6,
    });
  }

  async getLimitedTimeItems() {
    const now = new Date();
    return this.shopItemRepository
      .createQueryBuilder('item')
      .where('item.isActive = true')
      .andWhere('item.isLimited = true')
      .andWhere('item.availableUntil >= :now', { now })
      .orderBy('item.availableUntil', 'ASC')
      .getMany();
  }

  async purchaseWithInGameCurrency(
    userId: string,
    dto: PurchaseDto,
  ): Promise<UserInventory> {
    const item = await this.shopItemRepository.findOne({ where: { sku: dto.sku } });
    if (!item) throw new NotFoundException(`İtem '${dto.sku}' bulunamadı`);

    // Defence-in-depth clamp. PurchaseDto already enforces
    // @IsInt @Min(1) @Max(99) at the ValidationPipe layer, so under
    // normal request flow `dto.quantity` is already in [1, 99]. We
    // re-clamp here for any future internal caller that constructs the
    // DTO by hand and might pass a negative / NaN / huge value. Floor
    // first to defang fractional inputs before Math.max/min.
    const rawQuantity = Math.floor(Number(dto.quantity ?? 1));
    const quantity = Number.isFinite(rawQuantity)
      ? Math.max(PURCHASE_QUANTITY_MIN, Math.min(PURCHASE_QUANTITY_MAX, rawQuantity))
      : PURCHASE_QUANTITY_MIN;

    let price: number | null = null;

    switch (dto.currencyType) {
      case 'nebula_coins': price = item.priceNebulaCoins; break;
      case 'void_crystals': price = item.priceVoidCrystals; break;
      case 'premium_gems': price = item.pricePremiumGems; break;
      default:
        // `real_money` and any other unexpected currencyType: real-money
        // payments go through /api/v1/payment, not the in-game shop.
        // PurchaseDto's @IsEnum already rejects this at the pipe layer,
        // so reaching here means a hand-built DTO from internal code.
        throw new BadRequestException(
          'Gerçek para ödemeleri /api/v1/payment endpoint\'i ile yapılmalıdır',
        );
    }

    if (!price) {
      throw new BadRequestException(
        `Bu item '${dto.currencyType}' ile satın alınamaz`,
      );
    }

    // NOTE: The stock pre-check that lived here previously was advisory
    // only — it ran against the un-locked `item` snapshot fetched
    // outside the transaction. The authoritative stock check now runs
    // INSIDE the transaction below, against a row locked FOR UPDATE,
    // with the decrement performed as a single conditional SQL
    // expression so two concurrent buyers can't both pass the same
    // `stockRemaining=1` snapshot. See "ECON STOCK RACE" block below.

    const totalCost = price * quantity;

    // ── ECONOMY GUARD ───────────────────────────────────────────────────
    // Wallet read + balance check + atomic deduct + stock-decrement +
    // inventory grant all inside one transaction.  Before this commit the
    // service decremented stock and granted the item but NEVER touched the
    // user's wallet (engine audit flagged it as "free items, CRITICAL").
    //
    // user_currency row is lazy-created with all-zero balances when a
    // user touches the shop for the first time; that lets the balance
    // check fail cleanly with "Yetersiz bakiye" instead of NotFound.
    const COLUMN_BY_CURRENCY: Record<string, string> = {
      nebula_coins: 'nebula_coins',
      void_crystals: 'void_crystals',
      premium_gems: 'premium_gems',
    };
    const walletCol = COLUMN_BY_CURRENCY[dto.currencyType];
    if (!walletCol) {
      throw new BadRequestException(`Bilinmeyen para birimi: ${dto.currencyType}`);
    }

    const result = await this.dataSource.transaction(async (manager) => {
      // Lazy-init wallet row if absent.
      await manager.query(
        `INSERT INTO user_currency (user_id) VALUES ($1::uuid)
           ON CONFLICT (user_id) DO NOTHING`,
        [userId],
      );

      // Lock the wallet row so concurrent purchases can't double-spend
      // the same balance.
      const rows = (await manager.query(
        `SELECT ${walletCol} AS balance FROM user_currency
           WHERE user_id = $1::uuid FOR UPDATE`,
        [userId],
      )) as Array<{ balance: number }>;
      const balance = Number(rows[0]?.balance ?? 0);
      if (balance < totalCost) {
        throw new BadRequestException(
          `Yetersiz bakiye: ${dto.currencyType} ${balance} < ${totalCost}`,
        );
      }

      // Deduct.
      await manager.query(
        `UPDATE user_currency SET ${walletCol} = ${walletCol} - $2 WHERE user_id = $1::uuid`,
        [userId, totalCost],
      );

      // ── ECON STOCK RACE ──────────────────────────────────────────────
      // Prior implementation:
      //   1. Read `item` BEFORE the transaction (un-locked snapshot)
      //   2. Pre-check `item.stockRemaining < quantity`
      //   3. Inside tx: manager.update(ShopItem, item.id,
      //         { stockRemaining: item.stockRemaining - quantity })
      //   --> step (3) wrote a value computed from the stale snapshot,
      //       not an SQL increment. Two concurrent purchases for q=1
      //       against stockRemaining=1 both saw 1, both passed, both
      //       wrote `1-1=0`, both granted inventory — last legendary
      //       item duplicated, audit ECON-C6-06.
      //
      // Fix: re-fetch the row INSIDE the tx with FOR UPDATE (lock the
      // ShopItem row tail-of-the-line), then apply the decrement as a
      // CONDITIONAL SQL UPDATE — the decrement only fires when stock
      // can actually cover `quantity`. Treat affected-rows=0 as a
      // race-loss / sold-out and bail with 409 Conflict so the wallet
      // deduction rolls back with the rest of the tx.
      //
      // Note: we reuse the outer `item` only for the up-front
      // category / price metadata (read-mostly fields). All
      // stock-bearing logic now goes through `lockedItem`.
      if (item.isLimited) {
        const lockedItem = await manager.findOne(ShopItem, {
          where: { id: item.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!lockedItem) {
          // Item deleted between outer fetch and tx open.
          throw new NotFoundException(`İtem '${dto.sku}' bulunamadı`);
        }
        if (lockedItem.stockRemaining !== null) {
          if (lockedItem.stockRemaining < quantity) {
            throw new ConflictException('Stok yetersiz');
          }
          // Conditional decrement — even with FOR UPDATE in place this
          // belt-and-braces WHERE guards against any future code path
          // that drops the lock (e.g. switching isolation level) and
          // makes the intent obvious to readers.
          const updateResult = (await manager.query(
            `UPDATE shop_items
                SET stock_remaining = stock_remaining - $1
              WHERE id = $2::uuid
                AND stock_remaining >= $1
              RETURNING stock_remaining`,
            [quantity, item.id],
          )) as [Array<{ stock_remaining: number }>, number] | Array<{ stock_remaining: number }>;
          // pg driver returns [rows, count] for parameterised queries
          // via TypeORM's manager.query; older paths just rows. Handle
          // both shapes defensively.
          const affectedRows = Array.isArray(updateResult)
            && Array.isArray((updateResult as unknown[])[0])
              ? ((updateResult as [Array<unknown>, number])[0]).length
              : (updateResult as Array<unknown>).length;
          if (affectedRows === 0) {
            // Another concurrent purchase drained the stock between our
            // lock acquire and the conditional UPDATE — should be
            // impossible with FOR UPDATE held, but treat as race-loss
            // and roll the whole tx back so the wallet stays intact.
            throw new ConflictException('Stok yetersiz');
          }
        }
      }

      // Grant inventory entry (upsert).
      let inventoryEntry = await manager.findOne(UserInventory, {
        where: { userId, shopItemId: item.id },
      });
      if (inventoryEntry) {
        inventoryEntry.quantity += quantity;
        inventoryEntry = await manager.save(UserInventory, inventoryEntry);
      } else {
        inventoryEntry = await manager.save(
          UserInventory,
          manager.create(UserInventory, {
            userId,
            shopItemId: item.id,
            quantity,
            source: 'purchase',
          }),
        );
      }

      this.logger.log(
        `Kullanıcı ${userId} satın aldı: ${item.name} (${dto.currencyType}: -${totalCost}, kalan: ${balance - totalCost})`,
      );

      return inventoryEntry;
    });

    // Post-transaction VIP upgrade hook.
    //
    // `premium_pass` SKUs (vip_vip-monthly / -quarterly / -annual) need
    // to actually bump the player's VIP tier — not just sit in their
    // inventory. We resolve the SKU again here so we don't re-issue the
    // grant on inventory equip; this branch fires once, on the
    // successful purchase path.
    //
    // Run OUTSIDE the wallet/inventory transaction so a VIP-service
    // hiccup doesn't roll back the deduction. The purchase already
    // succeeded — VIP failure becomes a logged warning. The next
    // VipService.getVipStatus call will reflect the spend on the next
    // purchase (cumulativeSpendUsd is the SoT, not local state).
    //
    // ── HIGH ECON-SHOP-VIP-SPEND-NO-IDEMPOTENCY-INGAME (cycle 6) ──
    // Previously we passed `transactionId: null` here. The 3-arg
    // process_vip_spend() short-circuits the vip_spend_ledger INSERT
    // when transaction_id IS NULL (migration 1779900000000 L121) and
    // falls through to the unconditional `cumulative_spend_usd +=
    // p_spend_usd` accumulate path. That makes the in-game-currency
    // VIP-SKU flow trivially replay-amplifiable: any caller (controller
    // retry, supervisor restart between commit and hook, a future
    // queued-job redelivery, batch admin tooling) would re-credit the
    // SAME purchase event into cumulative_spend_usd, inflating the
    // player's VIP tier and polluting arppu_by_vip_cohort.
    //
    // Fix: mint a SYNTHETIC, DETERMINISTIC transactionId via UUIDv5 so
    // (a) the ledger's UNIQUE(transaction_id) constraint engages for
    // in-game purchases, and (b) re-driving the SAME purchase event
    // collapses to a single ledger row (already_credited=true) instead
    // of double-bumping. Two SEPARATE purchase events (different
    // inventoryEntry.id or distinct acquiredAt epoch) still mint
    // distinct synthetic ids and credit correctly — so 8 honest
    // purchases of vip_vip-monthly across 8 separate HTTP calls still
    // produce 8 ledger rows and 8 × $9.99 of cumulative spend.
    //
    // OPEN PRODUCT QUESTION (Option B follow-up): should in-game-
    // currency purchases of premium_pass touch cumulative_spend_usd
    // AT ALL? cumulative_spend_usd drives ARPPU dashboards, which are
    // supposed to track REAL MONEY only. A player hoarding gems and
    // converting them into VIP tier via the in-game shop currently
    // pollutes those dashboards even with this idempotency fix in
    // place. Decoupling (in-game premium_pass grants VIP via a separate
    // progression path, leaves cumulative_spend_usd untouched) is the
    // cleaner long-term shape but is a contract/product call — flagged
    // for review, not in-scope for this audit cycle.
    try {
      const item = await this.shopItemRepository.findOne({
        where: { sku: dto.sku },
      });
      if (item && item.category === 'premium_pass') {
        // Spend USD value for VIP tier math. Prefer the configured
        // price_real_usd column; fall back to the gem price ÷ 100 so a
        // 1000-gem pass reads as ≈ $10 of cumulative spend. The
        // VipService threshold table is the SoT for tier cutoffs.
        const spendUsd =
          item.priceRealUsd !== null
            ? Number(item.priceRealUsd)
            : (item.pricePremiumGems ?? 0) / 100;

        // Synthetic transactionId — UUIDv5(userId:sku:inventoryRowId:
        // post-upsert-quantity). The inventoryRowId is stable across
        // the upsert path (same UserInventory row, quantity bumps each
        // time); the POST-UPSERT quantity uniquely identifies *which*
        // purchase event in the sequence we're crediting. Purchase #1
        // sees quantity=1 → synth id A; purchase #2 (same row,
        // qty++ → 2) → synth id B; … purchase #8 → synth id H. Eight
        // distinct ids → eight ledger rows → 8 × $9.99 credited.
        //
        // A re-drive of the SAME purchase event (same call, same
        // post-upsert quantity snapshot) produces the SAME synth id
        // and collapses on UNIQUE(transaction_id) →
        // already_credited=true, no double-bump.
        //
        // We also fold the inventoryRowId in so the v5 key stays
        // stable across deletes-then-re-grants (a new row gets a new
        // UUID; the quantity sequence restarts at 1 but the row id
        // disambiguates from the old cohort's qty=1).
        const syntheticTxId = uuidv5(
          `${userId}:${item.sku}:${result.id}:${result.quantity}`,
          SHOP_INGAME_VIP_TXID_NAMESPACE,
        );

        await this.vipService.recordPurchaseAndUpgradeVip({
          userId,
          transactionId: syntheticTxId,
          amountUsd: spendUsd,
          amountTry: null,
          currencyCode: 'USD',
          purchaseType: 'premium_pass',
          countryCode: null,
        });
        this.logger.log(
          `VIP upgrade hook fired user=${userId} sku=${item.sku} spendUsd=${spendUsd} synthTxn=${syntheticTxId}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `VIP upgrade hook failed user=${userId} sku=${dto.sku}: ${
          err instanceof Error ? err.message : String(err)
        } — purchase already committed`,
      );
    }

    return result;
  }

  async getUserInventory(userId: string, category?: string) {
    const qb = this.inventoryRepository
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.shopItem', 'item')
      .where('inv.userId = :userId', { userId })
      .andWhere('(inv.expiresAt IS NULL OR inv.expiresAt > NOW())');

    if (category) {
      qb.andWhere('item.category = :category', { category });
    }

    return qb.orderBy('inv.acquiredAt', 'DESC').getMany();
  }

  async equipItem(userId: string, inventoryId: string): Promise<UserInventory> {
    const inv = await this.inventoryRepository.findOne({
      where: { id: inventoryId, userId },
      relations: ['shopItem'],
    });
    if (!inv) throw new NotFoundException('Envanter item bulunamadı');

    // Aynı kategorideki diğer itemlerin ekipmanını kaldır
    await this.inventoryRepository
      .createQueryBuilder()
      .update()
      .set({ isEquipped: false })
      .where('userId = :userId', { userId })
      .andWhere(
        'shopItemId IN (SELECT id FROM shop_items WHERE category = :category)',
        { category: inv.shopItem.category },
      )
      .execute();

    inv.isEquipped = true;
    return this.inventoryRepository.save(inv);
  }

  async unequipItem(userId: string, inventoryId: string): Promise<UserInventory> {
    const inv = await this.inventoryRepository.findOne({
      where: { id: inventoryId, userId },
    });
    if (!inv) throw new NotFoundException('Envanter item bulunamadı');

    inv.isEquipped = false;
    return this.inventoryRepository.save(inv);
  }
}
