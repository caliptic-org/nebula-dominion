import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TierService } from './tier.service';

@ApiTags('tier')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tier')
export class TierController {
  constructor(private readonly tierService: TierService) {}

  @Get('progress')
  @ApiOperation({ summary: 'Get the current tier progress for the user (54-level model)' })
  getProgress(@Request() req: { user: { id: string } }) {
    return this.tierService.getProgress(req.user.id);
  }

  @Get('requirements')
  @ApiOperation({ summary: 'Get the requirements for the next tier level' })
  getRequirements(@Request() req: { user: { id: string } }) {
    return this.tierService.getRequirements(req.user.id);
  }

  @Get('levels')
  @ApiOperation({ summary: 'List all 54 tier levels with their age and metadata' })
  listLevels() {
    return this.tierService.listLevels();
  }

  @Post('level-up')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Advance to the next tier level if XP requirements are met' })
  levelUp(@Request() req: { user: { id: string } }) {
    return this.tierService.levelUp(req.user.id);
  }
}
