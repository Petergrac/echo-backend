import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { HashtagService } from './hashtag.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('hashtags')
@Controller('hashtags')
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
  @ApiOperation({ summary: 'Get echoes by hashtag' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Echoes retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Hashtag not found' })
  async getEchoesByHashtag(
    @Param('hashtag') hashtag: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return await this.hashtagService.getEchoesByHashtag(hashtag, page, limit);
  }

  /**
    * TODO ====================== GET TRENDING HASHTAGS ======================
    * @param timeframe 
    * @param limit 
    * @returns //? Currently popular hashtags
    */
  @Get('trending')
  @ApiOperation({ summary: 'Get trending hashtags' })
  @ApiQuery({ name: 'timeframe', required: false, enum: ['1d', '7d', '30d'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Trending hashtags retrieved' })
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
  @ApiOperation({ summary: 'Search hashtags' })
  @ApiQuery({ name: 'query', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Hashtags found' })
  async searchHashtags(
    @Query('query') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.hashtagService.searchHashtags(query, limit);
  }

  /**
    * TODO ====================== GET HASHTAG STATS ======================
    * @param hashtag 
    * @returns //? Statistics for a specific hashtag
    */
  @Get(':hashtag/stats')
  @ApiOperation({ summary: 'Get hashtag statistics' })
  @ApiResponse({ status: 200, description: 'Hashtag stats retrieved' })
  @ApiResponse({ status: 404, description: 'Hashtag not found' })
  async getHashtagStats(@Param('hashtag') hashtag: string) {
    return await this.hashtagService.getHashtagStats(hashtag);
  }

  /**
    * TODO ====================== GET RELATED HASHTAGS ======================
    * @param hashtag 
    * @param limit 
    * @returns //? Hashtags related to the specified one
    */
  @Get(':hashtag/related')
  @ApiOperation({ summary: 'Get related hashtags' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Related hashtags retrieved' })
  async getRelatedHashtags(
    @Param('hashtag') hashtag: string,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    return await this.hashtagService.getRelatedHashtags(hashtag, limit);
  }
}