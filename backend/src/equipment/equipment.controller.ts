import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { EquipmentService } from './equipment.service';
import { EquipSlotDto } from './dto/equip-slot.dto';
import { EquipmentSlot } from './types/equipment.types';

@ApiTags('equipment')
@Controller('api/v1')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get('commanders/:id/equipment')
  @ApiOperation({ summary: "Get all equipment slots for a commander" })
  @ApiQuery({ name: 'playerId', required: true, description: 'Requesting player UUID' })
  @ApiResponse({ status: 200, description: 'Commander equipment slots' })
  @ApiResponse({ status: 403, description: 'Commander does not belong to player' })
  @ApiResponse({ status: 404, description: 'Commander not found' })
  getCommanderEquipment(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.equipmentService.getCommanderEquipment(id, playerId);
  }

  @Put('commanders/:id/equipment/:slot')
  @ApiOperation({ summary: 'Assign an equipment item to a commander slot' })
  @ApiQuery({ name: 'playerId', required: true, description: 'Requesting player UUID' })
  @ApiResponse({ status: 200, description: 'Equipment assigned' })
  @ApiResponse({ status: 400, description: 'Item does not match slot type' })
  @ApiResponse({ status: 403, description: 'Slot is locked or commander not owned' })
  @ApiResponse({ status: 404, description: 'Commander or item not found' })
  equipSlot(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('slot') slot: EquipmentSlot,
    @Body() dto: EquipSlotDto,
    @Query('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.equipmentService.equipSlot(id, slot, dto.item_id, playerId);
  }

  @Delete('commanders/:id/equipment/:slot')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove equipment from a commander slot' })
  @ApiQuery({ name: 'playerId', required: true, description: 'Requesting player UUID' })
  @ApiResponse({ status: 204, description: 'Equipment removed' })
  @ApiResponse({ status: 403, description: 'Commander not owned' })
  @ApiResponse({ status: 404, description: 'Commander not found or slot is empty' })
  unequipSlot(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('slot') slot: EquipmentSlot,
    @Query('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.equipmentService.unequipSlot(id, slot, playerId);
  }

  @Get('equipment/inventory')
  @ApiOperation({ summary: "Get equipment items in the player's inventory" })
  @ApiQuery({ name: 'playerId', required: true, description: 'Requesting player UUID' })
  @ApiResponse({ status: 200, description: 'Player inventory with isEquipped flag' })
  getInventory(@Query('playerId', ParseUUIDPipe) playerId: string) {
    return this.equipmentService.getPlayerInventory(playerId);
  }
}
