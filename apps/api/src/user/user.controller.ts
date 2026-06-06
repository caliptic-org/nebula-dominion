import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SelectRaceDto } from './dto/select-race.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get the current authenticated user profile' })
  getMyProfile(@Request() req: { user: { id: string } }) {
    return this.userService.getProfile(req.user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update the current user profile (username)' })
  @ApiResponse({ status: 409, description: 'Username already taken' })
  updateMyProfile(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(req.user.id, dto);
  }

  @Post('select-race')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'One-time race selection for the current user' })
  @ApiResponse({ status: 200, description: 'Race selected' })
  @ApiResponse({ status: 400, description: 'Race already chosen' })
  selectRace(
    @Request() req: { user: { id: string } },
    @Body() dto: SelectRaceDto,
  ) {
    return this.userService.selectRace(req.user.id, dto.race);
  }

  @Get()
  @ApiOperation({ summary: 'List all users' })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 404, description: 'User not found' })
  // SEC/PII (audit S7): pass the caller's id so the service can pick
  // PRIVATE_FIELDS (email, lastLoginAt) only when the lookup is a
  // self-lookup. Cross-user lookups stay on the PUBLIC projection.
  findOne(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.userService.findOne(id, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate the current user (self-only)' })
  // SEC/IDOR: self-only — a logged-in user must not be able to disable
  // another user's account. No admin role exists yet; if one is added
  // later, allow admins through here as well.
  deactivate(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (req.user.id !== id) {
      throw new ForbiddenException('You can only deactivate your own account');
    }
    return this.userService.deactivate(id);
  }
}
