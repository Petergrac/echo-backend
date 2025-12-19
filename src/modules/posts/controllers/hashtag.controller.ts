import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { HashtagService } from '../services/hashtag.service';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('hashtags')
@UseGuards(JwtAuthGuard)
export class HashtagController {
  constructor(private readonly hashtagService: HashtagService) {}

  //TODO ==================== GET TRENDING HASHTAGS ====================
  @Get('trending')
  async getTrendingHashtags(
    @Query('limit') limit: number = 10,
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' = 'week',
  ) {
    return this.hashtagService.getTrendingHashtags(limit, timeframe);
  }

  //TODO ==================== SEARCH HASHTAGS ====================
  @Get('search')
  async searchHashtags(
    @Query('q') query: string,
    @Query('limit') limit: number = 10,
  ) {
    if (!query || query.length < 2) {
      return { hashtags: [] };
    }
    return this.hashtagService.searchHashtags(query, limit);
  }

  //TODO ==================== GET HASHTAG POSTS ====================
  @Get(':tag/posts')
  async getHashtagPosts(
    @Req() req: Request,
    @Param('tag') tag: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.hashtagService.getHashtagPosts(tag, userId, page, limit);
  }
}
