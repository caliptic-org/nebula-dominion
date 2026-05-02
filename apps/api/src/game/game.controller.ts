import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GameService, CreateGameDto } from './game.service';
import { GameStatus } from './entities/game.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class CreateGameBodyDto implements CreateGameDto {
  @ApiProperty({ example: 'My Nebula Empire' })
  @IsString()
  @MinLength(1)
  name: string;
}

@ApiTags('games')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new game' })
  create(@Request() req: any, @Body() dto: CreateGameBodyDto) {
    return this.gameService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my games' })
  findAll(@Request() req: any) {
    return this.gameService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a game' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.gameService.findOne(id, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a game' })
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.gameService.remove(id, req.user.id);
  }
}
