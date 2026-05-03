import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserInventory } from '../shop/entities/user-inventory.entity';
import { ShopItem } from '../shop/entities/shop-item.entity';
import { UserCurrency } from './entities/user-currency.entity';
import { InventoryQueryDto } from './dto/inventory-query.dto';

export interface ItemEffect {
  type: string;
  value: number;
  duration?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: 'tumsu' | 'kaynak' | 'ekipman' | 'yukseltme' | 'ozel';
  rarity: 'siradan' | 'yaygin' | 'nadir' | 'destansi' | 'efsanevi';
  icon: string;
  quantity: number;
  effects: ItemEffect[];
  acquiredAt: number;
  canUse: boolean;
  canSell: boolean;
  sellValue: number;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface InventoryCapacity {
  used: number;
  max: number;
}

export interface UseItemResponse {
  success: boolean;
  remainingQuantity: number;
  effects: ItemEffect[];
}

export interface SellItemResponse {
  success: boolean;
  gemsEarned: number;
  remainingQuantity: number;
}

const INVENTORY_CAPACITY = 100;

const USABLE_CATEGORIES = new Set(['resource_pack', 'xp_booster', 'unit_boost']);
const SELLABLE_CATEGORIES = new Set([
  'cosmetic_skin', 'cosmetic_banner', 'cosmetic_avatar_frame',
  'cosmetic_trail', 'cosmetic_chat_bubble', 'resource_pack',
  'unit_boost', 'xp_booster',
]);

const CATEGORY_MAP: Record<string, InventoryItem['category']> = {
  cosmetic_skin: 'ekipman',
  cosmetic_banner: 'ekipman',
  cosmetic_avatar_frame: 'ekipman',
  cosmetic_trail: 'ekipman',
  cosmetic_chat_bubble: 'ekipman',
  resource_pack: 'kaynak',
  unit_boost: 'yukseltme',
  premium_pass: 'ozel',
  battle_pass_tier_skip: 'ozel',
  xp_booster: 'tumsu',
  currency_bundle: 'ozel',
};

const RARITY_MAP: Record<string, InventoryItem['rarity']> = {
  common: 'siradan',
  uncommon: 'yaygin',
  rare: 'nadir',
  epic: 'destansi',
  legendary: 'efsanevi',
};

const RARITY_SELL_VALUE: Record<string, number> = {
  common: 5,
  uncommon: 10,
  rare: 25,
  epic: 50,
  legendary: 100,
};

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(UserInventory)
    private readonly inventoryRepo: Repository<UserInventory>,
    @InjectRepository(ShopItem)
    private readonly shopItemRepo: Repository<ShopItem>,
    @InjectRepository(UserCurrency)
    private readonly currencyRepo: Repository<UserCurrency>,
    private readonly dataSource: DataSource,
  ) {}

  async listInventory(userId: string, query: InventoryQueryDto): Promise<InventoryListResponse> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const qb = this.inventoryRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.shopItem', 'item')
      .where('inv.userId = :userId', { userId })
      .andWhere('(inv.expiresAt IS NULL OR inv.expiresAt > NOW())');

    if (query.category) {
      const dbCategories = Object.entries(CATEGORY_MAP)
        .filter(([, mapped]) => mapped === query.category)
        .map(([db]) => db);
      if (dbCategories.length > 0) {
        qb.andWhere('item.category IN (:...cats)', { cats: dbCategories });
      } else {
        return { items: [], total: 0, limit, offset };
      }
    }

    const sortField = query.sort === 'name' ? 'item.name'
      : query.sort === 'rarity' ? 'item.rarity'
      : 'inv.acquiredAt';
    const sortDir = (query.order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';

    qb.orderBy(sortField, sortDir).skip(offset).take(limit);

    const [rows, total] = await qb.getManyAndCount();

    return {
      items: rows.map(r => this.toInventoryItem(r)),
      total,
      limit,
      offset,
    };
  }

  async getItem(userId: string, itemId: string): Promise<InventoryItem> {
    const inv = await this.inventoryRepo.findOne({
      where: { id: itemId },
      relations: ['shopItem'],
    });
    if (!inv) throw new NotFoundException(`Envanter item '${itemId}' bulunamadı`);
    if (inv.userId !== userId) throw new ForbiddenException('Bu item size ait değil');
    return this.toInventoryItem(inv);
  }

  async useItem(userId: string, itemId: string, quantity: number): Promise<UseItemResponse> {
    return this.dataSource.transaction(async (manager) => {
      const inv = await manager.findOne(UserInventory, {
        where: { id: itemId },
        relations: ['shopItem'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!inv) throw new NotFoundException(`Envanter item '${itemId}' bulunamadı`);
      if (inv.userId !== userId) throw new ForbiddenException('Bu item size ait değil');
      if (!USABLE_CATEGORIES.has(inv.shopItem.category)) {
        throw new ConflictException('Bu item kullanılamaz');
      }
      if (inv.quantity < quantity) {
        throw new ConflictException(`Yetersiz miktar: mevcut ${inv.quantity}, istenilen ${quantity}`);
      }

      const remaining = inv.quantity - quantity;
      const effects = this.parseEffects(inv.shopItem.content);

      if (remaining === 0) {
        await manager.remove(UserInventory, inv);
      } else {
        await manager.update(UserInventory, inv.id, { quantity: remaining });
      }

      this.logger.log(`Kullanıcı ${userId} kullandı: ${inv.shopItem.name} x${quantity}`);

      return { success: true, remainingQuantity: remaining, effects };
    });
  }

  async sellItem(userId: string, itemId: string, quantity: number): Promise<SellItemResponse> {
    return this.dataSource.transaction(async (manager) => {
      const inv = await manager.findOne(UserInventory, {
        where: { id: itemId },
        relations: ['shopItem'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!inv) throw new NotFoundException(`Envanter item '${itemId}' bulunamadı`);
      if (inv.userId !== userId) throw new ForbiddenException('Bu item size ait değil');
      if (!SELLABLE_CATEGORIES.has(inv.shopItem.category)) {
        throw new ConflictException('Bu item satılamaz');
      }
      if (inv.quantity < quantity) {
        throw new ConflictException(`Yetersiz miktar: mevcut ${inv.quantity}, istenilen ${quantity}`);
      }

      const sellValue = this.computeSellValue(inv.shopItem);
      const gemsEarned = sellValue * quantity;
      const remaining = inv.quantity - quantity;

      if (remaining === 0) {
        await manager.remove(UserInventory, inv);
      } else {
        await manager.update(UserInventory, inv.id, { quantity: remaining });
      }

      // Upsert user_currency: add gems atomically (INSERT ... ON CONFLICT DO UPDATE)
      await manager.query(
        `INSERT INTO user_currency (user_id, premium_gems, nebula_coins, void_crystals, updated_at)
         VALUES ($1, $2, 0, 0, NOW())
         ON CONFLICT (user_id) DO UPDATE
           SET premium_gems = user_currency.premium_gems + $2, updated_at = NOW()`,
        [userId, gemsEarned],
      );

      this.logger.log(`Kullanıcı ${userId} sattı: ${inv.shopItem.name} x${quantity}, +${gemsEarned} gems`);

      return { success: true, gemsEarned, remainingQuantity: remaining };
    });
  }

  async getCapacity(userId: string): Promise<InventoryCapacity> {
    const used = await this.inventoryRepo.count({
      where: { userId },
    });
    return { used, max: INVENTORY_CAPACITY };
  }

  private toInventoryItem(inv: UserInventory): InventoryItem {
    const item = inv.shopItem;
    return {
      id: inv.id,
      name: item.name,
      description: item.description ?? '',
      category: CATEGORY_MAP[item.category] ?? 'ozel',
      rarity: RARITY_MAP[item.rarity] ?? 'siradan',
      icon: item.previewAsset ?? '',
      quantity: inv.quantity,
      effects: this.parseEffects(item.content),
      acquiredAt: inv.acquiredAt.getTime(),
      canUse: USABLE_CATEGORIES.has(item.category),
      canSell: SELLABLE_CATEGORIES.has(item.category),
      sellValue: this.computeSellValue(item),
    };
  }

  private parseEffects(content: Record<string, unknown>): ItemEffect[] {
    const effects: ItemEffect[] = [];
    if (content.multiplier != null) {
      effects.push({
        type: 'xp_multiplier',
        value: content.multiplier as number,
        duration: content.duration_minutes as number | undefined,
      });
    }
    if (content.stat_bonus_pct != null) {
      effects.push({
        type: 'stat_bonus',
        value: content.stat_bonus_pct as number,
        duration: content.duration_hours != null
          ? (content.duration_hours as number) * 60
          : undefined,
      });
    }
    if (content.minerals != null) {
      effects.push({ type: 'minerals', value: content.minerals as number });
    }
    if (content.energy != null) {
      effects.push({ type: 'energy', value: content.energy as number });
    }
    if (content.void_crystals != null) {
      effects.push({ type: 'void_crystals', value: content.void_crystals as number });
    }
    if (content.premium_gems != null) {
      effects.push({ type: 'premium_gems', value: content.premium_gems as number });
    }
    return effects;
  }

  private computeSellValue(item: ShopItem): number {
    if (item.pricePremiumGems != null && item.pricePremiumGems > 0) {
      return Math.max(1, Math.floor(item.pricePremiumGems * 0.1));
    }
    return RARITY_SELL_VALUE[item.rarity] ?? 5;
  }
}
