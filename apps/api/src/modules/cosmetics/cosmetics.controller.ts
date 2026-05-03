import {
  Controller,
  Get,
  Post,
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
import { CosmeticsService } from './cosmetics.service';

@ApiTags('Cosmetics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/cosmetics')
export class CosmeticsController {
  constructor(private readonly cosmeticsService: CosmeticsService) {}

  @Get()
  @ApiOperation({ summary: "Kullanıcının tüm kozmetik envanteri (owned/equipped state)" })
  @ApiResponse({ status: 200, description: 'Tüm aktif kozmetikler, kullanıcı sahipliği ile birlikte' })
  getInventory(@Request() req: { user: { id: string } }) {
    return this.cosmeticsService.getInventory(req.user.id);
  }

  @Post(':id/equip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kozmetik giydir (owned ise)' })
  @ApiParam({ name: 'id', description: 'Kozmetik item ID' })
  @ApiResponse({ status: 400, description: 'Item sahipliği yok veya zaten giyili' })
  @ApiResponse({ status: 404, description: 'Kozmetik bulunamadı' })
  equip(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.cosmeticsService.equip(req.user.id, id);
  }

  @Post(':id/purchase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kilitli kozmetik satın al (gem ile, idempotent)' })
  @ApiParam({ name: 'id', description: 'Kozmetik item ID' })
  @ApiResponse({ status: 400, description: 'Yetersiz gem veya item satın alınamaz' })
  @ApiResponse({ status: 404, description: 'Kozmetik bulunamadı' })
  purchase(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.cosmeticsService.purchase(req.user.id, id);
  }
}
