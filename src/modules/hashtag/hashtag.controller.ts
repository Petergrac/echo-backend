import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { HashtagService } from './hashtag.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('hashtags')
@UseGuards(JwtAuthGuard)
export class HashtagController {
  constructor(private readonly hashtagService: HashtagService) {}

  /**
   * TODO ====================== GET ECHOES BY HASHTAG ======================
   * @param hashtag
   * @param page
   * @param limit
   * @returns //? Paginated echoes for a specific hashtag
   */
  @Get(':hashtag/echoes')
  async getEchoesByHashtag(
    @Param('hashtag') hashtag: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Req() req: Request,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.hashtagService.getEchoesByHashtag(
      hashtag,
      page,
      limit,
      userId,
    );
  }

  /**
   * TODO ====================== GET TRENDING HASHTAGS ======================
   * @param timeframe
   * @param limit
   * @returns //? Currently popular hashtags
   */
  @Get('trending')
  async getTrendingHashtags(
    @Query('timeframe') timeframe: string = '7d',
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.hashtagService.getTrendingHashtags(timeframe, limit);
  }

  /**
   * TODO ====================== SEARCH HASHTAGS ======================
   * @param query
   * @param limit
   * @returns //? Search hashtags by name
   */
  @Get('search')
  async searchHashtags(
    @Query('query') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.hashtagService.searchHashtags(query, limit);
  }
  /**
   * TODO ====================== GET RELATED HASHTAGS ======================
   * @param hashtag
   * @param limit
   * @returns //? Hashtags related to the specified one
   */
  @Get(':hashtag/related')
  async getRelatedHashtags(
    @Param('hashtag') hashtag: string,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    return await this.hashtagService.getRelatedHashtags(hashtag, limit);
  }
}
