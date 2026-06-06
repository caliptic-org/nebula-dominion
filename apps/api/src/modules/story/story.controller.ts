import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoryService } from './story.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('story')
@Controller('story')
export class StoryController {
  constructor(private readonly service: StoryService) {}

  @Get('chapters')
  @ApiOperation({ summary: 'List all story chapters' })
  getAllChapters() {
    return this.service.getAllChapters();
  }

  @Get('chapters/age/:age')
  @ApiOperation({ summary: 'List chapters by age (1-6)' })
  getChaptersByAge(@Param('age', ParseIntPipe) age: number) {
    return this.service.getChaptersByAge(age);
  }

  @Get('chapters/:id')
  @ApiOperation({ summary: 'Get chapter by id' })
  getChapter(@Param('id') id: string) {
    return this.service.getChapter(id);
  }

  // ─── mvp.txt §6.1 contract aliases (scene = chapter terminology) ─────────

  @Get('scenes/:id')
  @ApiOperation({ summary: 'Get a story scene by id (alias of /chapters/:id)' })
  getScene(@Param('id') id: string) {
    return this.service.getChapter(id);
  }

  @Get('progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user story progress' })
  getMyProgress(@Request() req: { user: { id: string } }) {
    return this.service.getUserProgress(req.user.id);
  }

  @Post('seen')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a scene/chapter as seen by the current user' })
  markSeen(
    @Request() req: { user: { id: string } },
    @Body() body: { sceneId: string; choiceId?: string },
  ) {
    return this.service.completeChapter(req.user.id, body.sceneId, body.choiceId);
  }

  // ─── Self-only endpoints (userId from JWT, not path) ──────────────────────
  // SEC/IDOR: previous variants took :userId from the URL, so a logged-in
  // U1 could read or mutate U2's story progress. userId now comes from the
  // verified JWT (req.user.id). The legacy `:userId` routes below are kept
  // as deprecated aliases that 403 if the path userId doesn't match the
  // token; remove once all FE callers switch to the `/me` paths.

  @Get('progress/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user story progress' })
  getMyUserProgress(@Request() req: { user: { id: string } }) {
    return this.service.getUserProgress(req.user.id);
  }

  @Get('available/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List available chapters for the current user' })
  getMyAvailableChapters(
    @Request() req: { user: { id: string } },
    @Query('level', new ParseIntPipe({ optional: true })) level = 1,
  ) {
    return this.service.getAvailableChapters(req.user.id, level);
  }

  @Post('progress/me/complete/:chapterId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a chapter for the current user' })
  completeMyChapter(
    @Request() req: { user: { id: string } },
    @Param('chapterId') chapterId: string,
    @Body('choiceId') choiceId?: string,
  ) {
    return this.service.completeChapter(req.user.id, chapterId, choiceId);
  }

  // ─── Legacy `:userId` paths kept as deprecated aliases ────────────────────
  // SEC/IDOR: gated by JWT; the path userId must match req.user.id, otherwise
  // 403. FE callers should migrate to the `/me` routes above; remove these
  // once the migration is done.

  @Get('progress/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get story progress (deprecated — use /progress/me)' })
  getUserProgress(
    @Request() req: { user: { id: string } },
    @Param('userId') userId: string,
  ) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('You can only access your own story progress');
    }
    return this.service.getUserProgress(userId);
  }

  @Get('available/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List available chapters (deprecated — use /available/me)' })
  getAvailableChapters(
    @Request() req: { user: { id: string } },
    @Param('userId') userId: string,
    @Query('level', new ParseIntPipe({ optional: true })) level = 1,
  ) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('You can only access your own available chapters');
    }
    return this.service.getAvailableChapters(userId, level);
  }

  @Post('progress/:userId/complete/:chapterId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a chapter (deprecated — use /progress/me/complete/:chapterId)' })
  completeChapter(
    @Request() req: { user: { id: string } },
    @Param('userId') userId: string,
    @Param('chapterId') chapterId: string,
    @Body('choiceId') choiceId?: string,
  ) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('You can only complete chapters for yourself');
    }
    return this.service.completeChapter(userId, chapterId, choiceId);
  }
}
