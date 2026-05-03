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
} from '@nestjs/common';
import { StoryService } from './story.service';

@Controller('story')
export class StoryController {
  constructor(private readonly service: StoryService) {}

  @Get('chapters')
  getAllChapters() {
    return this.service.getAllChapters();
  }

  @Get('chapters/age/:age')
  getChaptersByAge(@Param('age', ParseIntPipe) age: number) {
    return this.service.getChaptersByAge(age);
  }

  @Get('chapters/:id')
  getChapter(@Param('id') id: string) {
    return this.service.getChapter(id);
  }

  @Get('progress/:userId')
  getUserProgress(@Param('userId') userId: string) {
    return this.service.getUserProgress(userId);
  }

  @Get('available/:userId')
  getAvailableChapters(
    @Param('userId') userId: string,
    @Query('level', new ParseIntPipe({ optional: true })) level = 1,
  ) {
    return this.service.getAvailableChapters(userId, level);
  }

  @Post('progress/:userId/complete/:chapterId')
  @HttpCode(HttpStatus.OK)
  completeChapter(
    @Param('userId') userId: string,
    @Param('chapterId') chapterId: string,
    @Body('choiceId') choiceId?: string,
  ) {
    return this.service.completeChapter(userId, chapterId, choiceId);
  }
}
