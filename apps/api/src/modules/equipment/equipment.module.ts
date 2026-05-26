import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { EquipmentItem } from './entities/equipment-item.entity';
import { UserEquipment } from './entities/user-equipment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EquipmentItem, UserEquipment])],
  controllers: [EquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
