import {
  Controller,
  Get,
  UseGuards,
  Req,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FeedService } from './feed.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import { FeedResponseDto } from './dto/feed-response.dto';
import { FeedQueryDto } from './dto/feed-query.dto';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get('timeline')
  @UseGuards(JwtAuthGuard)
  async getTimelineFeed(
    @Req() req: Request,
    @Query('cursor') cursor: FeedQueryDto['cursor'],
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ): Promise<FeedResponseDto> {
    const userId = (req.user as { userId: string }).userId;
    
    // Validate and sanitize inputs
    const validatedLimit = Math.min(Math.max(limit || 10, 1), 50);
    
    return await this.feedService.getTimelineFeed(userId, {
      cursor,
      limit: validatedLimit,
    });
  }

  @Get('trending')
  async getTrendingFeed(
    @Req() req: Request,
    @Query('cursor') cursor: FeedQueryDto['cursor'],
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ): Promise<FeedResponseDto> {
    const userId = (req.user as { userId: string })?.userId || null;
    const validatedLimit = Math.min(Math.max(limit || 10, 1), 50);
    
    return await this.feedService.getTrendingFeed(userId, {
      cursor,
      limit: validatedLimit,
    });
  }
}