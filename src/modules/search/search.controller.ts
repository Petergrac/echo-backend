import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  //TODO ==================== COMBINED SEARCH ====================
  @Get()
  async search(
    @Req() req: Request,
    @Query('q') query: string,
    @Query('type')
    type: 'users' | 'posts' | 'hashtags' | 'combined' = 'combined',
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' | 'all' = 'all',
    @Query('sortBy')
    sortBy: 'relevance' | 'popularity' | 'recent' = 'relevance',
  ) {
    const userId = (req.user as { userId: string }).userId;

    if (!query || query.trim().length < 2) {
      return {
        users: [],
        posts: [],
        hashtags: [],
        total: 0,
        message: 'Query must be at least 2 characters long',
      };
    }

    const filters = {
      type,
      limit: Math.min(limit, 50),
      offset,
      timeframe,
      sortBy,
    };

    return this.searchService.combinedSearch(query, userId, filters);
  }

  //TODO ==================== SEARCH SUGGESTIONS ====================
  @Get('suggestions')
  async getSuggestions(
    @Req() req: Request,
    @Query('q') query: string,
    @Query('limit') limit: number = 10,
  ) {
    const userId = (req.user as { userId: string }).userId;

    if (!query || query.trim().length < 2) {
      return { users: [], hashtags: [], popularQueries: [] };
    }

    return this.searchService.getSearchSuggestions(query, userId, limit);
  }

  //TODO ==================== TRENDING SEARCHES ====================
  @Get('trending')
  async getTrendingSearches(
    @Query('timeframe') timeframe: 'day' | 'week' = 'day',
    @Query('limit') limit: number = 10,
  ) {
    return this.searchService.getTrendingSearches(timeframe, limit);
  }

  //TODO ==================== DISCOVERY ENDPOINTS ====================

  @Get('discover/trending-posts')
  async getTrendingPosts(
    @Req() req: Request,
    @Query('timeframe') timeframe: 'day' | 'week' = 'day',
    @Query('limit') limit: number = 20,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.searchService.getTrendingPosts(userId, timeframe, limit);
  }

  @Get('discover/user-recommendations')
  async getUserRecommendations(
    @Req() req: Request,
    @Query('limit') limit: number = 10,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.searchService.getUserRecommendations(userId, limit);
  }

  @Get('discover/hashtag-recommendations')
  async getHashtagRecommendations(
    @Req() req: Request,
    @Query('limit') limit: number = 10,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.searchService.getHashtagRecommendations(userId, limit);
  }

  @Get('discover/who-to-follow')
  async getWhoToFollow(
    @Req() req: Request,
    @Query('limit') limit: number = 10,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.searchService.getUserRecommendations(userId, limit);
  }
}
