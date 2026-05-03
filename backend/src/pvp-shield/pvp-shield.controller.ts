import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PvpShieldService } from './pvp-shield.service';
import { IsUUID, IsOptional, IsDateString } from 'class-validator';

class RegisterShieldDto {
  @IsUUID()
  playerId: string;

  @IsOptional()
  @IsDateString()
  registeredAt?: string;
}

@ApiTags('pvp-shield')
@Controller('api/v1/pvp-shield')
export class PvpShieldController {
  constructor(private readonly shieldService: PvpShieldService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new player and activate their 7-day PvP shield' })
  @ApiResponse({ status: 201, description: 'Shield registered' })
  register(@Body() dto: RegisterShieldDto) {
    const registeredAt = dto.registeredAt ? new Date(dto.registeredAt) : undefined;
    return this.shieldService.registerPlayer(dto.playerId, registeredAt);
  }

  @Get(':playerId/status')
  @ApiOperation({
    summary: 'Get PvP shield status for a player',
    description: 'Returns isActive, expiresAt, and remainingSeconds for countdown display',
  })
  getStatus(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.shieldService.getShieldStatus(playerId);
  }

  @Delete(':playerId/remove')
  @ApiOperation({
    summary: 'Player voluntarily removes their PvP shield early',
    description:
      'Grants a 100 Mineral bonus upon voluntary removal. Requires confirmation from the client (show dialog before calling this endpoint).',
  })
  @ApiResponse({ status: 200, description: 'Shield removed, bonus granted' })
  removeShield(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.shieldService.removeShield(playerId);
  }
}
