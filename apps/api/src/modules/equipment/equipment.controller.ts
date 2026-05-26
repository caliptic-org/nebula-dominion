import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EquipmentService } from './equipment.service';
import { EquipEquipmentDto } from './dto/equip-equipment.dto';

@ApiTags('Equipment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
// Global prefix `api/v1` is added by main.ts. The controller path must NOT
// repeat it (see CosmeticsController note) — `@Controller('equipment')`
// resolves to `/api/v1/equipment`.
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Tüm aktif ekipman kataloğu (slot/rarity dahil)' })
  @ApiResponse({ status: 200, description: 'Aktif equipment_items listesi' })
  getCatalog() {
    return this.equipmentService.getCatalog();
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Kullanıcının ekipman envanteri (commander equip durumu ile)' })
  @ApiResponse({ status: 200, description: 'Kullanıcıya ait equipment listesi' })
  getInventory(@Request() req: { user: { id: string } }) {
    return this.equipmentService.getInventory(req.user.id);
  }

  @Post(':id/equip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ekipmanı bir komutanın slotuna giydir' })
  @ApiParam({ name: 'id', description: 'Equipment item UUID' })
  @ApiResponse({ status: 200, description: 'Ekipman giydirildi (aynı slot otomatik açıldı)' })
  @ApiResponse({ status: 400, description: 'Ekipman size ait değil veya commanderId eksik' })
  equip(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EquipEquipmentDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.equipmentService.equip(req.user.id, id, dto.commanderId);
  }

  @Post(':id/unequip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ekipmanı çıkar (envanterde kalır)' })
  @ApiParam({ name: 'id', description: 'Equipment item UUID' })
  @ApiResponse({ status: 200, description: 'Ekipman çıkarıldı' })
  @ApiResponse({ status: 400, description: 'Ekipman size ait değil' })
  unequip(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.equipmentService.unequip(req.user.id, id);
  }
}
