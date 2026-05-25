import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { BasesService } from './bases.service';
import { QueueUnitDto } from './dto/queue-unit.dto';

@Controller('api/bases/:id/production-queue')
@UseGuards(HttpJwtGuard)
export class BasesProductionQueueController {
  constructor(private readonly bases: BasesService) {}

  /** GET /api/bases/:id/production-queue */
  @Get()
  async getQueue(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) baseId: string,
  ) {
    return this.bases.getQueue(baseId, userId);
  }

  /** POST /api/bases/:id/production-queue */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async queueUnit(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) baseId: string,
    @Body() dto: QueueUnitDto,
  ) {
    return this.bases.queueUnit(baseId, userId, dto);
  }

  /** DELETE /api/bases/:id/production-queue/:unitId */
  @Delete(':unitId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelUnit(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) baseId: string,
    @Param('unitId', ParseUUIDPipe) unitId: string,
  ): Promise<void> {
    await this.bases.cancelUnit(baseId, userId, unitId);
  }
}
