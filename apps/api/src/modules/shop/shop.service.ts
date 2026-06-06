import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ShopItem } from './entities/shop-item.entity';
import { UserInventory } from './entities/user-inventory.entity';
import { VipService } from '../vip/vip.service';
import { PurchaseDto } from './dto/purchase.dto';

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

    if (item.isLimited && item.stockRemaining !== null && item.stockRemaining < quantity) {
      throw new BadRequestException('Stok yetersiz');
    }

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

      // Stock decrement (limited item only).
      if (item.isLimited && item.stockRemaining !== null) {
        await manager.update(ShopItem, item.id, {
          stockRemaining: item.stockRemaining - quantity,
        });
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
        await this.vipService.recordPurchaseAndUpgradeVip({
          userId,
          transactionId: null,
          amountUsd: spendUsd,
          amountTry: null,
          currencyCode: 'USD',
          purchaseType: 'premium_pass',
          countryCode: null,
        });
        this.logger.log(
          `VIP upgrade hook fired user=${userId} sku=${item.sku} spendUsd=${spendUsd}`,
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
