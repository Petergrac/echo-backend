import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { UserResponseDto } from '../auth/dto/user-response.dto';
import { PostResponseDto } from '../posts/dto/post-response.dto';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';

@ApiTags('Search')
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @ApiOperation({
    summary: 'Unified search across users, posts, and hashtags',
    description: `Perform a comprehensive search across the platform. Supports filtering by type, timeframe, and sorting options.
    
    Search Types:
    - **users**: Search for users by username, name, or bio
    - **posts**: Search for posts by content or hashtags
    - **hashtags**: Search for hashtags
    - **combined**: Search all types (default)
    
    Minimum query length: 2 characters`,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: { $ref: getSchemaPath(UserResponseDto) },
          description: 'Matched users',
        },
        posts: {
          type: 'array',
          items: { $ref: getSchemaPath(PostResponseDto) },
          description: 'Matched posts',
        },
        hashtags: {
          type: 'array',
          description: 'Matched hashtags',
        },
        total: {
          type: 'number',
          description: 'Total number of results across all categories',
          example: 45,
        },
        filters: {
          type: 'object',
          description: 'Applied search filters',
          properties: {
            query: { type: 'string', example: 'typescript' },
            type: { type: 'string', example: 'combined' },
            limit: { type: 'number', example: 20 },
            offset: { type: 'number', example: 0 },
            timeframe: { type: 'string', example: 'all' },
            sortBy: { type: 'string', example: 'relevance' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Query too short (minimum 2 characters required)',
    schema: {
      type: 'object',
      properties: {
        users: { type: 'array', items: { type: 'object' }, example: [] },
        posts: { type: 'array', items: { type: 'object' }, example: [] },
        hashtags: { type: 'array', items: { type: 'object' }, example: [] },
        total: { type: 'number', example: 0 },
        message: {
          type: 'string',
          example: 'Query must be at least 2 characters long',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query (minimum 2 characters)',
    example: 'typescript',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['users', 'posts', 'hashtags', 'combined'],
    description: 'Type of content to search (default: combined)',
    example: 'combined',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description:
      'Maximum number of results per category (default: 20, max: 50)',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of results to skip (for pagination)',
    example: 0,
  })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['day', 'week', 'month', 'all'],
    description: 'Time window for results (default: all)',
    example: 'all',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['relevance', 'popularity', 'recent'],
    description: 'Sorting method (default: relevance)',
    example: 'relevance',
  })
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

    const results = await this.searchService.combinedSearch(
      query,
      userId,
      filters,
    );

    return {
      ...results,
      filters: {
        query,
        ...filters,
      },
    };
  }

  @ApiOperation({
    summary: 'Get search suggestions',
    description:
      'Get real-time search suggestions as users type. Returns matching users, hashtags, and popular queries.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search suggestions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: { $ref: getSchemaPath(UserResponseDto) },
          description: 'Suggested users',
        },
        hashtags: {
          type: 'array',
          description: 'Suggested hashtags',
        },
        popularQueries: {
          type: 'array',
          items: { type: 'string' },
          description: 'Popular search queries related to the input',
          example: [
            '#typescript',
            '@typescript',
            'typescript tips',
            'typescript tutorial',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Query too short (minimum 2 characters required)',
    schema: {
      type: 'object',
      properties: {
        users: { type: 'array', items: { type: 'object' }, example: [] },
        hashtags: { type: 'array', items: { type: 'object' }, example: [] },
        popularQueries: {
          type: 'array',
          items: { type: 'string' },
          example: [],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query for suggestions (minimum 2 characters)',
    example: 'typesc',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description:
      'Maximum number of suggestions per category (default: 10, max: 20)',
    example: 10,
  })
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

  @ApiOperation({
    summary: 'Get trending searches',
    description: 'Get currently trending search queries across the platform',
  })
  @ApiResponse({
    status: 200,
    description: 'Trending searches retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        trendingSearches: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of trending search queries',
          example: [
            '#javascript',
            '#react',
            '@typescript',
            'web development',
            'AI',
          ],
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Last update timestamp',
          example: '2024-01-01T12:00:00.000Z',
        },
      },
    },
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of trending searches to return (default: 10, max: 50)',
    example: 10,
  })
  @Get('trending')
  async getTrendingSearches(@Query('limit') limit: number = 10) {
    const trendingSearches =
      await this.searchService.getTrendingSearches(limit);
    return {
      trendingSearches,
      updatedAt: new Date().toISOString(),
    };
  }

  @ApiOperation({
    summary: 'Get trending posts for discovery',
    description:
      'Discover trending posts based on engagement within a specific timeframe',
  })
  @ApiPaginatedResponse(PostResponseDto)
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['day', 'week'],
    description: 'Time period for trending calculation (default: day)',
    example: 'day',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of posts to return (default: 20, max: 100)',
    example: 20,
  })
  @Get('discover/trending-posts')
  async getTrendingPosts(
    @Req() req: Request,
    @Query('timeframe') timeframe: 'day' | 'week' = 'day',
    @Query('limit') limit: number = 20,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.searchService.getTrendingPosts(userId, timeframe, limit);
  }

  @ApiOperation({
    summary: 'Get user recommendations',
    description:
      'Discover new users to follow based on mutual connections and interests',
  })
  @ApiResponse({
    status: 200,
    description: 'User recommendations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        recommendations: {
          type: 'array',
          items: { $ref: getSchemaPath(UserResponseDto) },
          description: 'Recommended users to follow',
        },
        reason: {
          type: 'string',
          description: 'Reason for recommendations',
          example: 'Based on mutual connections and interests',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recommendations to return (default: 10, max: 20)',
    example: 10,
  })
  @Get('discover/user-recommendations')
  async getUserRecommendations(
    @Req() req: Request,
    @Query('limit') limit: number = 10,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const recommendations = await this.searchService.getUserRecommendations(
      userId,
      limit,
    );
    return {
      recommendations,
      reason: 'Based on mutual connections and interests',
    };
  }

  @ApiOperation({
    summary: 'Get hashtag recommendations',
    description: 'Discover popular and trending hashtags',
  })
  @ApiResponse({
    status: 200,
    description: 'Hashtag recommendations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        recommendations: {
          type: 'array',
          description: 'Recommended hashtags to explore',
        },
        reason: {
          type: 'string',
          description: 'Reason for recommendations',
          example: 'Based on current trends and your interests',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recommendations to return (default: 10, max: 20)',
    example: 10,
  })
  @Get('discover/hashtag-recommendations')
  async getHashtagRecommendations(
    @Req() req: Request,
    @Query('limit') limit: number = 10,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const recommendations = await this.searchService.getHashtagRecommendations(
      userId,
      limit,
    );
    return {
      recommendations,
      reason: 'Based on current trends and your interests',
    };
  }

  @ApiOperation({
    summary: 'Get "Who to follow" suggestions',
    description: 'Get personalized suggestions for users to follow',
  })
  @ApiResponse({
    status: 200,
    description: 'Follow suggestions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: { $ref: getSchemaPath(UserResponseDto) },
          description: 'Suggested users to follow',
        },
        criteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'Criteria used for suggestions',
          example: [
            'Mutual connections',
            'Similar interests',
            'Popular in your network',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of suggestions to return (default: 10, max: 20)',
    example: 10,
  })
  @Get('discover/who-to-follow')
  async getWhoToFollow(
    @Req() req: Request,
    @Query('limit') limit: number = 10,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const suggestions = await this.searchService.getUserRecommendations(
      userId,
      limit,
    );
    return {
      suggestions,
      criteria: [
        'Mutual connections',
        'Similar interests',
        'Popular in your network',
      ],
    };
  }
}
