import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FormationsService } from './formations.service';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';
import { ListFormationsDto } from './dto/list-formations.dto';
import { FormationPowerDto } from './dto/formation-power.dto';

@ApiTags('formations')
@Controller('api/v1/formations')
export class FormationsController {
  constructor(private readonly formationsService: FormationsService) {}

  // ─── Templates ────────────────────────────────────────────────────────────

  @Get('templates')
  @ApiOperation({ summary: 'List all active formation preset templates' })
  @ApiResponse({ status: 200, description: 'Formation templates returned' })
  listTemplates() {
    return this.formationsService.listTemplates();
  }

  // ─── Power Calculation ────────────────────────────────────────────────────

  @Post('power')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate server-side formation power',
    description:
      'Reads unit stats from the database to compute authoritative power scores. ' +
      'Prevents client-side manipulation — never trust client-computed totals.',
  })
  @ApiResponse({ status: 200, description: 'Power breakdown returned' })
  calculatePower(@Body() dto: FormationPowerDto) {
    return this.formationsService.calculatePower(dto);
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new formation for a player' })
  @ApiResponse({ status: 201, description: 'Formation created' })
  create(@Body() dto: CreateFormationDto) {
    return this.formationsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List formations for a player',
    description: 'Returns paginated formations sorted by last-active first, then most recently updated.',
  })
  @ApiResponse({ status: 200, description: 'Formation list returned' })
  findAll(@Query() query: ListFormationsDto) {
    return this.formationsService.findByPlayer(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single formation by ID' })
  @ApiResponse({ status: 200, description: 'Formation returned' })
  @ApiResponse({ status: 404, description: 'Formation not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.formationsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a formation' })
  @ApiResponse({ status: 200, description: 'Formation updated' })
  @ApiResponse({ status: 403, description: 'Formation does not belong to player' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('playerId', ParseUUIDPipe) playerId: string,
    @Body() dto: UpdateFormationDto,
  ) {
    return this.formationsService.update(id, playerId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete (soft-delete) a formation' })
  @ApiResponse({ status: 204, description: 'Formation deleted' })
  @ApiResponse({ status: 403, description: 'Formation does not belong to player' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.formationsService.remove(id, playerId);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark a formation as last-active',
    description: 'Clears the last-active flag from any other formation belonging to the player.',
  })
  @ApiResponse({ status: 200, description: 'Formation marked as last-active' })
  markLastActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.formationsService.markLastActive(id, playerId);
  }
}
