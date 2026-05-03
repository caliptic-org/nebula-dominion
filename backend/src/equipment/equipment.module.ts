import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commander } from './entities/commander.entity';
import { EquipmentItem } from './entities/equipment-item.entity';
import { PlayerInventory } from './entities/player-inventory.entity';
import { CommanderEquipmentSlot } from './entities/commander-equipment-slot.entity';
import { EquipmentService } from './equipment.service';
import { EquipmentController } from './equipment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Commander, EquipmentItem, PlayerInventory, CommanderEquipmentSlot]),
  ],
  controllers: [EquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
