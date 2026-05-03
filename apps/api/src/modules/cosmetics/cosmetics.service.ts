import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CosmeticItem } from './entities/cosmetic-item.entity';
import { UserCosmetic } from './entities/user-cosmetic.entity';
import { UserCurrency } from './entities/user-currency.entity';

export interface CosmeticItemDto {
  id: string;
  name: string;
  category: string;
  rarity: string;
  price: number | null;
  isOwned: boolean;
  isEquipped: boolean;
  icon: string;
  description: string;
  previewImage: string | null;
}

@Injectable()
export class CosmeticsService {
  private readonly logger = new Logger(CosmeticsService.name);

  constructor(
    @InjectRepository(CosmeticItem)
    private readonly cosmeticItemRepo: Repository<CosmeticItem>,
    @InjectRepository(UserCosmetic)
    private readonly userCosmeticRepo: Repository<UserCosmetic>,
    @InjectRepository(UserCurrency)
    private readonly userCurrencyRepo: Repository<UserCurrency>,
    private readonly dataSource: DataSource,
  ) {}

  async getInventory(userId: string): Promise<CosmeticItemDto[]> {
    const [allItems, ownedRecords] = await Promise.all([
      this.cosmeticItemRepo.find({
        where: { isActive: true },
        order: { category: 'ASC', sortOrder: 'ASC' },
      }),
      this.userCosmeticRepo.find({ where: { userId } }),
    ]);

    const ownedMap = new Map(ownedRecords.map((r) => [r.cosmeticId, r]));

    return allItems.map((item) => {
      const owned = ownedMap.get(item.id);
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        rarity: item.rarity,
        price: item.priceGems,
        isOwned: owned !== undefined,
        isEquipped: owned?.isEquipped ?? false,
        icon: item.icon,
        description: item.description,
        previewImage: item.previewImage,
      };
    });
  }

  async getBalance(userId: string): Promise<{ gems: number }> {
    const currency = await this.userCurrencyRepo.findOne({ where: { userId } });
    return { gems: currency?.premiumGems ?? 0 };
  }

  async equip(userId: string, cosmeticId: string): Promise<CosmeticItemDto> {
    const owned = await this.userCosmeticRepo.findOne({
      where: { userId, cosmeticId },
    });
    if (!owned) {
      throw new BadRequestException('Bu kozmetik size ait değil');
    }
    if (owned.isEquipped) {
      return this.toDto(owned.cosmeticItem, owned);
    }

    await this.dataSource.transaction(async (manager) => {
      // Aynı kategorideki diğer itemlerin ekipmanını kaldır
      await manager
        .createQueryBuilder()
        .update(UserCosmetic)
        .set({ isEquipped: false })
        .where('user_id = :userId', { userId })
        .andWhere(
          'cosmetic_id IN (SELECT id FROM cosmetic_items WHERE category = :category)',
          { category: owned.cosmeticItem.category },
        )
        .execute();

      await manager.update(UserCosmetic, { userId, cosmeticId }, { isEquipped: true });
    });

    this.logger.log(`User ${userId} equipped cosmetic ${cosmeticId}`);
    owned.isEquipped = true;
    return this.toDto(owned.cosmeticItem, owned);
  }

  async purchase(userId: string, cosmeticId: string): Promise<CosmeticItemDto> {
    const item = await this.cosmeticItemRepo.findOne({
      where: { id: cosmeticId, isActive: true },
    });
    if (!item) throw new NotFoundException('Kozmetik bulunamadı');

    if (item.priceGems === null) {
      throw new BadRequestException('Bu item satın alınamaz');
    }

    // Idempotent: already owned
    const existing = await this.userCosmeticRepo.findOne({ where: { userId, cosmeticId } });
    if (existing) {
      return this.toDto(item, existing);
    }

    await this.dataSource.transaction(async (manager) => {
      // Deduct gems with row-level lock to prevent race conditions
      const currency = await manager
        .createQueryBuilder(UserCurrency, 'uc')
        .where('uc.userId = :userId', { userId })
        .setLock('pessimistic_write')
        .getOne();

      const balance = currency?.premiumGems ?? 0;
      if (balance < item.priceGems!) {
        throw new BadRequestException(
          `Yetersiz gem bakiyesi (gereken: ${item.priceGems}, mevcut: ${balance})`,
        );
      }

      if (currency) {
        await manager.update(UserCurrency, { userId }, { premiumGems: balance - item.priceGems! });
      } else {
        // Should not happen in production, but handle gracefully
        throw new BadRequestException('Kullanıcı bakiyesi bulunamadı');
      }

      await manager.insert(UserCosmetic, {
        userId,
        cosmeticId,
        isEquipped: false,
      });
    });

    this.logger.log(`User ${userId} purchased cosmetic ${cosmeticId} for ${item.priceGems} gems`);

    const owned = await this.userCosmeticRepo.findOne({ where: { userId, cosmeticId } });
    return this.toDto(item, owned!);
  }

  private toDto(item: CosmeticItem, record: UserCosmetic): CosmeticItemDto {
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      rarity: item.rarity,
      price: item.priceGems,
      isOwned: true,
      isEquipped: record.isEquipped,
      icon: item.icon,
      description: item.description,
      previewImage: item.previewImage,
    };
  }
}
