import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AllianceService } from './alliance.service';
import { CreateAllianceDto } from './dto/create-alliance.dto';
import { JoinAllianceDto } from './dto/join-alliance.dto';
import { DeclareWarDto } from './dto/declare-war.dto';
import { DepositResourcesDto } from './dto/deposit-resources.dto';
import { AllianceRole } from './entities/alliance-member.entity';

@ApiTags('Alliance')
// Global prefix `api/v1` is set in main.ts via setGlobalPrefix; declaring it
// here too produced a literal /api/v1/api/v1/alliances/* mount where the FE's
// api.post('/alliances/join') silently 404'd ("henüz hazır" toast).
@Controller('alliances')
export class AllianceController {
  constructor(private readonly allianceService: AllianceService) {}

  @Get()
  @ApiOperation({ summary: 'Tüm ittifakları listele' })
  findAll() {
    return this.allianceService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'İttifak detayını al' })
  @ApiParam({ name: 'id', description: 'İttifak UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.allianceService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Yeni ittifak kur' })
  create(@Request() req: any, @Body() dto: CreateAllianceDto) {
    return this.allianceService.create(req.user.id, dto);
  }

  @Post('join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'İttifaka katıl' })
  join(@Request() req: any, @Body() dto: JoinAllianceDto) {
    return this.allianceService.join(req.user.id, dto.allianceId);
  }

  @Delete('leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'İttifaktan ayrıl' })
  leave(@Request() req: any) {
    return this.allianceService.leave(req.user.id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'İttifak üyelerini listele' })
  @ApiParam({ name: 'id', description: 'İttifak UUID' })
  getMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.allianceService.getMembers(id);
  }

  @Patch(':id/members/:userId/role')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Üye rolünü güncelle' })
  @ApiParam({ name: 'id', description: 'İttifak UUID' })
  @ApiParam({ name: 'userId', description: 'Hedef kullanıcı UUID' })
  @ApiQuery({ name: 'role', enum: AllianceRole })
  promoteRole(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) allianceId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Query('role') role: AllianceRole,
  ) {
    return this.allianceService.promoteMember(req.user.id, allianceId, targetUserId, role);
  }

  @Delete(':id/members/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Üyeyi ittifaktan çıkar' })
  @ApiParam({ name: 'id', description: 'İttifak UUID' })
  @ApiParam({ name: 'userId', description: 'Hedef kullanıcı UUID' })
  kickMember(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) allianceId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.allianceService.kickMember(req.user.id, allianceId, targetUserId);
  }

  @Post('wars')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Başka bir ittifaka savaş ilan et' })
  declareWar(@Request() req: any, @Body() dto: DeclareWarDto) {
    return this.allianceService.declareWar(req.user.id, dto);
  }

  @Get(':id/wars')
  @ApiOperation({ summary: 'İttifak savaşlarını listele' })
  @ApiParam({ name: 'id', description: 'İttifak UUID' })
  getWars(@Param('id', ParseUUIDPipe) id: string) {
    return this.allianceService.getWars(id);
  }

  @Get(':id/storage')
  @ApiOperation({ summary: 'İttifak depo durumunu al' })
  @ApiParam({ name: 'id', description: 'İttifak UUID' })
  getStorage(@Param('id', ParseUUIDPipe) id: string) {
    return this.allianceService.getStorage(id);
  }

  @Post(':id/storage/deposit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'İttifak deposuna kaynak ekle' })
  @ApiParam({ name: 'id', description: 'İttifak UUID' })
  deposit(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) allianceId: string,
    @Body() dto: DepositResourcesDto,
  ) {
    return this.allianceService.deposit(req.user.id, allianceId, dto);
  }
}
