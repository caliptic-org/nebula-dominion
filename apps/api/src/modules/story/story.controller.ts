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

  // ─── Legacy paths kept for backward compatibility ─────────────────────────

  @Get('progress/:userId')
  @ApiOperation({ summary: 'Get story progress for a specific user (legacy)' })
  getUserProgress(@Param('userId') userId: string) {
    return this.service.getUserProgress(userId);
  }

  @Get('available/:userId')
  @ApiOperation({ summary: 'List available chapters for a user (legacy)' })
  getAvailableChapters(
    @Param('userId') userId: string,
    @Query('level', new ParseIntPipe({ optional: true })) level = 1,
  ) {
    return this.service.getAvailableChapters(userId, level);
  }

  @Post('progress/:userId/complete/:chapterId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a chapter (legacy)' })
  completeChapter(
    @Param('userId') userId: string,
    @Param('chapterId') chapterId: string,
    @Body('choiceId') choiceId?: string,
  ) {
    return this.service.completeChapter(userId, chapterId, choiceId);
  }
}
