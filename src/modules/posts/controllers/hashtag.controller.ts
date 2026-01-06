import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { HashtagService } from '../services/hashtag.service';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PostResponseDto } from '../dto/post-response.dto';
import { ApiPaginatedResponse } from '../../../common/decorators/api-paginated-response.decorator';

@ApiTags('Hashtags')
@Controller('hashtags')
@UseGuards(JwtAuthGuard)
export class HashtagController {
  constructor(private readonly hashtagService: HashtagService) {}

  @ApiOperation({
    summary: 'Get trending hashtags',
    description:
      'Retrieve trending hashtags based on recent usage. Can filter by timeframe.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trending hashtags retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        hashtags: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tag: { type: 'string', example: 'javascript' },
              count: { type: 'number', example: 150 },
              trendChange: { type: 'number', example: 15.5 },
            },
          },
        },
      },
    },
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of hashtags to return (default: 10, max: 50)',
    example: 10,
  })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Time period for trending calculation (default: week)',
    example: 'week',
  })
  @Get('trending')
  async getTrendingHashtags(
    @Query('limit') limit: number = 10,
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' = 'month',
  ) {
    return this.hashtagService.getTrendingHashtags(limit, timeframe);
  }

  @ApiOperation({
    summary: 'Search hashtags',
    description:
      'Search for hashtags by partial match. Minimum 2 characters required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Hashtags retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        hashtags: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tag: { type: 'string', example: 'javascript' },
              count: { type: 'number', example: 150 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Query too short (minimum 2 characters)',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query (minimum 2 characters)',
    example: 'java',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of results to return (default: 10, max: 20)',
    example: 10,
  })
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

  @ApiOperation({
    summary: 'Get posts by hashtag',
    description:
      'Retrieve paginated list of posts containing a specific hashtag',
  })
  @ApiPaginatedResponse(PostResponseDto)
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiParam({
    name: 'tag',
    description: 'Hashtag (without #)',
    example: 'javascript',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
    example: 20,
  })
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
