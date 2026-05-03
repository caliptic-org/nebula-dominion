import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
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
import { InventoryService } from './inventory.service';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { UseItemDto, SellItemDto } from './dto/use-sell-item.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Kullanıcının envanter listesi' })
  @ApiResponse({ status: 200, description: 'Sayfalandırılmış envanter listesi' })
  @ApiResponse({ status: 401, description: 'Kimlik doğrulama gerekli' })
  listInventory(@Request() req: { user: { id: string } }, @Query() query: InventoryQueryDto) {
    return this.inventoryService.listInventory(req.user.id, query);
  }

  @Get('capacity')
  @ApiOperation({ summary: 'Depo kapasite bilgisi (used/max)' })
  @ApiResponse({ status: 200, description: 'Kapasite bilgisi' })
  @ApiResponse({ status: 401, description: 'Kimlik doğrulama gerekli' })
  getCapacity(@Request() req: { user: { id: string } }) {
    return this.inventoryService.getCapacity(req.user.id);
  }

  @Get(':itemId')
  @ApiOperation({ summary: 'Tekil envanter item detayı' })
  @ApiParam({ name: 'itemId', description: 'Envanter item UUID' })
  @ApiResponse({ status: 200, description: 'Item detayı' })
  @ApiResponse({ status: 401, description: 'Kimlik doğrulama gerekli' })
  @ApiResponse({ status: 403, description: 'Bu item size ait değil' })
  @ApiResponse({ status: 404, description: 'Item bulunamadı' })
  getItem(
    @Request() req: { user: { id: string } },
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.inventoryService.getItem(req.user.id, itemId);
  }

  @Post('use/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Item kullan (miktar ve etki validasyonu)' })
  @ApiParam({ name: 'itemId', description: 'Envanter item UUID' })
  @ApiResponse({ status: 200, description: 'Item kullanıldı' })
  @ApiResponse({ status: 401, description: 'Kimlik doğrulama gerekli' })
  @ApiResponse({ status: 403, description: 'Bu item size ait değil' })
  @ApiResponse({ status: 404, description: 'Item bulunamadı' })
  @ApiResponse({ status: 409, description: 'Item kullanılamaz veya yetersiz miktar' })
  useItem(
    @Request() req: { user: { id: string } },
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UseItemDto,
  ) {
    return this.inventoryService.useItem(req.user.id, itemId, dto.quantity ?? 1);
  }

  @Post('sell/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Item sat (miktar kontrolü, gem ekleme)' })
  @ApiParam({ name: 'itemId', description: 'Envanter item UUID' })
  @ApiResponse({ status: 200, description: 'Item satıldı, gem bakiyesi güncellendi' })
  @ApiResponse({ status: 401, description: 'Kimlik doğrulama gerekli' })
  @ApiResponse({ status: 403, description: 'Bu item size ait değil' })
  @ApiResponse({ status: 404, description: 'Item bulunamadı' })
  @ApiResponse({ status: 409, description: 'Item satılamaz veya yetersiz miktar' })
  sellItem(
    @Request() req: { user: { id: string } },
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: SellItemDto,
  ) {
    return this.inventoryService.sellItem(req.user.id, itemId, dto.quantity ?? 1);
  }
}
