import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Profile returned' })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.getProfile(user.sub);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by username prefix' })
  @ApiQuery({ name: 'q', description: 'Username query string' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  search(@Query('q') q: string, @Query('limit') limit?: number) {
    return this.usersService.searchByUsername(q, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public profile of a user by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Profile returned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getProfile(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update own profile (display name, avatar, bio)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 403, description: 'Forbidden — cannot modify another user' })
  updateProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.updateProfile(user.sub, id, dto);
  }
}
