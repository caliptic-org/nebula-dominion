import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CosmeticsService } from './cosmetics.service';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/user')
export class UserBalanceController {
  constructor(private readonly cosmeticsService: CosmeticsService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Kullanıcının gem bakiyesi' })
  @ApiResponse({ status: 200, description: 'Gem bakiyesi döner' })
  getBalance(@Request() req: { user: { id: string } }) {
    return this.cosmeticsService.getBalance(req.user.id);
  }
}
