import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commander } from './entities/commander.entity';
import { EquipmentItem } from './entities/equipment-item.entity';
import { PlayerInventory } from './entities/player-inventory.entity';
import { CommanderEquipmentSlot } from './entities/commander-equipment-slot.entity';
import { EquipmentSlot } from './types/equipment.types';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Commander)
    private readonly commanderRepo: Repository<Commander>,
    @InjectRepository(EquipmentItem)
    private readonly itemRepo: Repository<EquipmentItem>,
    @InjectRepository(PlayerInventory)
    private readonly inventoryRepo: Repository<PlayerInventory>,
    @InjectRepository(CommanderEquipmentSlot)
    private readonly slotRepo: Repository<CommanderEquipmentSlot>,
  ) {}

  async getCommanderEquipment(commanderId: string, playerId: string) {
    const commander = await this.assertCommanderOwnership(commanderId, playerId);
    const equipped = await this.slotRepo.find({ where: { commanderId } });

    const slots: Record<string, unknown> = {};
    for (const s of equipped) {
      slots[s.slot] = {
        id: s.item.id,
        name: s.item.name,
        slot: s.item.slot,
        rarity: s.item.rarity,
        icon: s.item.icon,
        description: s.item.description,
        stats: s.item.stats,
      };
    }

    return {
      commanderId: commander.id,
      slots,
      lockedSlots: commander.lockedSlots,
    };
  }

  async equipSlot(commanderId: string, slot: EquipmentSlot, itemId: string, playerId: string) {
    const commander = await this.assertCommanderOwnership(commanderId, playerId);

    if (commander.lockedSlots?.includes(slot)) {
      throw new ForbiddenException({ error: 'slot_locked', message: `Slot ${slot} is locked` });
    }

    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException(`Equipment item ${itemId} not found`);

    if (item.slot !== slot) {
      throw new BadRequestException(
        `Item ${itemId} belongs to slot '${item.slot}', not '${slot}'`,
      );
    }

    const inInventory = await this.inventoryRepo.findOne({ where: { playerId, itemId } });
    if (!inInventory) {
      throw new NotFoundException(`Item ${itemId} is not in player's inventory`);
    }

    const alreadyEquipped = await this.slotRepo.findOne({ where: { itemId } });
    if (alreadyEquipped && alreadyEquipped.commanderId !== commanderId) {
      throw new ConflictException(`Item ${itemId} is already equipped on another commander`);
    }

    await this.slotRepo.save({ commanderId, slot, itemId, item });

    return {
      commanderId,
      slot,
      item: {
        id: item.id,
        name: item.name,
        slot: item.slot,
        rarity: item.rarity,
        icon: item.icon,
        description: item.description,
        stats: item.stats,
      },
    };
  }

  async unequipSlot(commanderId: string, slot: EquipmentSlot, playerId: string) {
    await this.assertCommanderOwnership(commanderId, playerId);

    const existing = await this.slotRepo.findOne({ where: { commanderId, slot } });
    if (!existing) {
      throw new NotFoundException(`Slot ${slot} on commander ${commanderId} is already empty`);
    }

    await this.slotRepo.delete({ commanderId, slot });
  }

  async getPlayerInventory(playerId: string) {
    const entries = await this.inventoryRepo.find({ where: { playerId } });
    const equippedSlots = await this.slotRepo
      .createQueryBuilder('ces')
      .innerJoin('commanders', 'c', 'c.id = ces.commander_id AND c.player_id = :playerId', {
        playerId,
      })
      .select('ces.item_id')
      .getRawMany();

    const equippedItemIds = new Set(equippedSlots.map((r) => r.ces_item_id));

    return entries.map((entry) => ({
      id: entry.item.id,
      name: entry.item.name,
      slot: entry.item.slot,
      rarity: entry.item.rarity,
      icon: entry.item.icon,
      description: entry.item.description,
      stats: entry.item.stats,
      isEquipped: equippedItemIds.has(entry.itemId),
    }));
  }

  private async assertCommanderOwnership(commanderId: string, playerId: string): Promise<Commander> {
    const commander = await this.commanderRepo.findOne({ where: { id: commanderId } });
    if (!commander) throw new NotFoundException(`Commander ${commanderId} not found`);
    if (commander.playerId !== playerId) {
      throw new ForbiddenException(`Commander ${commanderId} does not belong to player ${playerId}`);
    }
    return commander;
  }
}
