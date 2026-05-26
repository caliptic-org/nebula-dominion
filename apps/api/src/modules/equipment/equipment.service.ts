import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  EquipmentItem,
  EquipmentSlot,
  EquipmentRarity,
} from './entities/equipment-item.entity';
import { UserEquipment } from './entities/user-equipment.entity';

export interface EquipmentItemDto {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  atkBoost: number;
  defBoost: number;
  hpBoost: number;
  spdBoost: number;
  icon: string;
  description: string;
}

export interface UserEquipmentDto extends EquipmentItemDto {
  userEquipmentId: string;
  equippedOnCommanderId: string | null;
  acquiredAt: string;
}

@Injectable()
export class EquipmentService {
  private readonly logger = new Logger(EquipmentService.name);

  constructor(
    @InjectRepository(EquipmentItem)
    private readonly equipmentItemRepo: Repository<EquipmentItem>,
    @InjectRepository(UserEquipment)
    private readonly userEquipmentRepo: Repository<UserEquipment>,
    private readonly dataSource: DataSource,
  ) {}

  async getCatalog(): Promise<EquipmentItemDto[]> {
    const items = await this.equipmentItemRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
    return items.map((i) => this.toCatalogDto(i));
  }

  async getInventory(userId: string): Promise<UserEquipmentDto[]> {
    const rows = await this.userEquipmentRepo.find({
      where: { userId },
      order: { acquiredAt: 'ASC' },
    });
    return rows.map((r) => this.toInventoryDto(r));
  }

  /**
   * Equip an owned item on a commander.
   *
   *   - 1 commander x 1 slot x 1 item: any other owned item of the same slot
   *     equipped on that commander gets auto-unequipped in the same tx.
   *   - The same physical item can only sit in ONE place at a time, so if
   *     it's currently equipped on another commander we also clear that.
   *   - Idempotent: equipping the same item on the same commander returns
   *     the existing row.
   */
  async equip(
    userId: string,
    equipmentId: string,
    commanderId: string,
  ): Promise<UserEquipmentDto> {
    if (!commanderId || commanderId.trim().length === 0) {
      throw new BadRequestException('commanderId zorunlu');
    }

    const owned = await this.userEquipmentRepo.findOne({
      where: { userId, equipmentId },
    });
    if (!owned) {
      throw new BadRequestException('Bu ekipman size ait değil');
    }

    if (owned.equippedOnCommanderId === commanderId) {
      return this.toInventoryDto(owned);
    }

    const targetSlot = owned.equipmentItem.slot;

    await this.dataSource.transaction(async (manager) => {
      // Unequip whatever owned item currently fills this slot on this commander.
      // We restrict by user_id so we never touch another player's rows.
      await manager
        .createQueryBuilder()
        .update(UserEquipment)
        .set({ equippedOnCommanderId: null })
        .where('user_id = :userId', { userId })
        .andWhere('equipped_on_commander_id = :commanderId', { commanderId })
        .andWhere(
          'equipment_id IN (SELECT id FROM equipment_items WHERE slot = :slot)',
          { slot: targetSlot },
        )
        .execute();

      // Now equip this specific item on the target commander.
      await manager.update(
        UserEquipment,
        { userId, equipmentId },
        { equippedOnCommanderId: commanderId },
      );
    });

    this.logger.log(
      `User ${userId} equipped ${equipmentId} (slot=${targetSlot}) on commander ${commanderId}`,
    );

    const refreshed = await this.userEquipmentRepo.findOne({
      where: { userId, equipmentId },
    });
    return this.toInventoryDto(refreshed!);
  }

  async unequip(userId: string, equipmentId: string): Promise<UserEquipmentDto> {
    const owned = await this.userEquipmentRepo.findOne({
      where: { userId, equipmentId },
    });
    if (!owned) {
      throw new BadRequestException('Bu ekipman size ait değil');
    }
    if (owned.equippedOnCommanderId === null) {
      return this.toInventoryDto(owned);
    }

    await this.userEquipmentRepo.update(
      { userId, equipmentId },
      { equippedOnCommanderId: null },
    );

    this.logger.log(`User ${userId} unequipped ${equipmentId}`);

    owned.equippedOnCommanderId = null;
    return this.toInventoryDto(owned);
  }

  /**
   * Convenience grant — not exposed via controller for MVP, but the seed
   * migration and future loot tables call this to put a starter item in a
   * brand-new player's inventory. Idempotent on (userId, equipmentId).
   */
  async grant(userId: string, equipmentId: string): Promise<void> {
    const item = await this.equipmentItemRepo.findOne({
      where: { id: equipmentId, isActive: true },
    });
    if (!item) throw new NotFoundException('Ekipman bulunamadı');

    await this.userEquipmentRepo
      .createQueryBuilder()
      .insert()
      .into(UserEquipment)
      .values({ userId, equipmentId, equippedOnCommanderId: null })
      .orIgnore()
      .execute();
  }

  private toCatalogDto(item: EquipmentItem): EquipmentItemDto {
    return {
      id: item.id,
      name: item.name,
      slot: item.slot,
      rarity: item.rarity,
      atkBoost: item.atkBoost,
      defBoost: item.defBoost,
      hpBoost: item.hpBoost,
      spdBoost: item.spdBoost,
      icon: item.icon,
      description: item.description,
    };
  }

  private toInventoryDto(row: UserEquipment): UserEquipmentDto {
    const item = row.equipmentItem;
    return {
      userEquipmentId: row.id,
      id: item.id,
      name: item.name,
      slot: item.slot,
      rarity: item.rarity,
      atkBoost: item.atkBoost,
      defBoost: item.defBoost,
      hpBoost: item.hpBoost,
      spdBoost: item.spdBoost,
      icon: item.icon,
      description: item.description,
      equippedOnCommanderId: row.equippedOnCommanderId,
      acquiredAt: row.acquiredAt.toISOString(),
    };
  }
}
