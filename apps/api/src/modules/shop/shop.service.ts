import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopItem } from './entities/shop-item.entity';
import { UserInventory } from './entities/user-inventory.entity';

interface ShopFilter {
  category?: string;
  rarity?: string;
  tag?: string;
  ageRequired?: number;
}

interface PurchaseDto {
  sku: string;
  currencyType: 'nebula_coins' | 'void_crystals' | 'premium_gems' | 'real_money';
  quantity?: number;
}

@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(
    @InjectRepository(ShopItem)
    private readonly shopItemRepository: Repository<ShopItem>,
    @InjectRepository(UserInventory)
    private readonly inventoryRepository: Repository<UserInventory>,
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

    const quantity = dto.quantity || 1;
    let price: number | null = null;

    switch (dto.currencyType) {
      case 'nebula_coins': price = item.priceNebulaCoins; break;
      case 'void_crystals': price = item.priceVoidCrystals; break;
      case 'premium_gems': price = item.pricePremiumGems; break;
      case 'real_money':
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

    // Stok güncelle (limited item)
    if (item.isLimited && item.stockRemaining !== null) {
      await this.shopItemRepository.update(item.id, {
        stockRemaining: item.stockRemaining - quantity,
      });
    }

    // Envantere ekle (ya da miktarı artır)
    let inventoryEntry = await this.inventoryRepository.findOne({
      where: { userId, shopItemId: item.id },
    });

    if (inventoryEntry) {
      inventoryEntry.quantity += quantity;
      inventoryEntry = await this.inventoryRepository.save(inventoryEntry);
    } else {
      inventoryEntry = await this.inventoryRepository.save(
        this.inventoryRepository.create({
          userId,
          shopItemId: item.id,
          quantity,
          source: 'purchase',
        }),
      );
    }

    this.logger.log(
      `Kullanıcı ${userId} satın aldı: ${item.name} (${dto.currencyType}: ${price * quantity})`,
    );

    return inventoryEntry;
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
