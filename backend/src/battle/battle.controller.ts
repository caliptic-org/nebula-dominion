import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { BattleService } from './battle.service';
import { CreateBattleDto } from './dto/create-battle.dto';
import { ExecuteTurnDto } from './dto/execute-turn.dto';

@ApiTags('battles')
@Controller('api/v1/battles')
export class BattleController {
  constructor(private readonly battleService: BattleService) {}

  @Post()
  @ApiOperation({ summary: 'Create and start a new battle between two players' })
  @ApiResponse({ status: 201, description: 'Battle created' })
  createBattle(@Body() dto: CreateBattleDto) {
    return this.battleService.createBattle({
      attackerId: dto.attackerId,
      defenderId: dto.defenderId,
      attackerUnits: dto.attackerUnits.map((u) => ({ ...u, hp: u.maxHp, isAlive: true })),
      defenderUnits: dto.defenderUnits.map((u) => ({ ...u, hp: u.maxHp, isAlive: true })),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get battle state by ID' })
  getBattle(@Param('id', ParseUUIDPipe) id: string) {
    return this.battleService.getBattle(id);
  }

  @Post(':id/turn')
  @ApiOperation({ summary: 'Execute a turn in a battle (server-side calculation)' })
  @ApiResponse({ status: 201, description: 'Turn executed, battle log entry returned' })
  executeTurn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExecuteTurnDto,
  ) {
    return this.battleService.executeTurn(id, dto);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get all turn logs for a battle' })
  getBattleLogs(@Param('id', ParseUUIDPipe) id: string) {
    return this.battleService.getBattleLogs(id);
  }

  @Get(':id/replay')
  @ApiOperation({ summary: 'Get presigned URL to download the replay file from MinIO' })
  getReplayUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.battleService.getReplayUrl(id);
  }

  @Get(':id/replay/data')
  @ApiOperation({ summary: 'Download and return full replay JSON data' })
  getReplayData(@Param('id', ParseUUIDPipe) id: string) {
    return this.battleService.getReplayData(id);
  }

  @Get(':id/integrity')
  @ApiOperation({ summary: 'Verify battle integrity via state hash chain (anti-cheat)' })
  verifyIntegrity(@Param('id', ParseUUIDPipe) id: string) {
    return this.battleService.verifyBattleIntegrity(id);
  }

  @Get('player/:playerId')
  @ApiOperation({ summary: 'Get all battles for a player' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  getPlayerBattles(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.battleService.getPlayerBattles(playerId, limit, offset);
  }

  @Delete(':id/abandon')
  @ApiOperation({ summary: 'Abandon an in-progress battle (player forfeits)' })
  abandonBattle(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.battleService.abandonBattle(id, playerId);
  }
}
