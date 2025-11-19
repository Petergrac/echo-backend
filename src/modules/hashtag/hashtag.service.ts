import { Injectable, NotFoundException } from '@nestjs/common';
import { HashtagRepository } from './repository/hashtag.repository';
import { EngagementCountRepository } from '../engagement/repositories/engagement-count.repository';
import { HashtagExtractor } from './utils/hashtag-extractor.util';
import { EchoResponseDto } from '../echo/dto/echo-response.dto';
import { EngagementService } from '../engagement/engagement.service';

@Injectable()
export class HashtagService {
  constructor(
    private readonly hashtagRepository: HashtagRepository,
    private readonly engagementService: EngagementService,
  ) {}

  /**
   * TODO ====================== PROCESS HASHTAGS FOR ECHO ======================
   * @param echoId
   * @param content
   * @returns //? Extract, validate, and link hashtags to echo
   */
  async processHashtagsForEcho(echoId: string, content: string): Promise<void> {
    if (!content) return;

    const hashtagNames = HashtagExtractor.extractHashtags(content);

    if (hashtagNames.length === 0) {
      return;
    }

    const hashtagMap =
      await this.hashtagRepository.findOrCreateHashtags(hashtagNames);
    await this.hashtagRepository.linkHashtagsToEcho(echoId, hashtagMap);
  }

  /**
   * TODO ====================== GET ECHOES BY HASHTAG ======================
   * @param hashtagName
   * @param page
   * @param limit
   * @returns //? Paginated echoes with engagement data for a hashtag
   */
  async getEchoesByHashtag(
    hashtagName: string,
    page: number = 1,
    limit: number = 20,
    userId: string,
  ) {
    const result = await this.hashtagRepository.getEchoesByHashtag(
      hashtagName,
      page,
      limit,
    );
    if (result.echoes.length === 0) {
      throw new NotFoundException(
        `No echoes found for hashtag #${hashtagName}`,
      );
    }
    //* ========> Enrich with engagement counts and user states <========

    const echoIds = result.echoes.map((echo) => echo.id);
    const engagementCounts =
      await this.engagementService.getBatchEngagementCounts(echoIds);
    const userStates = await this.engagementService.getBatchEngagementStates(
      userId,
      echoIds,
    );

    //* Map echoes to response DTOs with enrichment
    const enrichedEchoes = result.echoes.map((echo) => {
      const baseEcho = EchoResponseDto.fromEntity(echo);
      const counts = engagementCounts.get(echo.id) || this.getZeroCounts();
      const userState = userStates.get(echo.id) || {};
      return {
        ...baseEcho,
        counts,
        userState,
      };
    });

    return {
      hashtag: hashtagName,
      echoes: enrichedEchoes,
      meta: result.meta,
    };
  }

  /**
   * TODO ====================== GET TRENDING HASHTAGS ======================
   * @param timeframe
   * @param limit
   * @returns //? Popular hashtags with usage statistics
   */
  async getTrendingHashtags(timeframe: string = '7d', limit: number = 10) {
    return await this.hashtagRepository.getTrendingHashtags(timeframe, limit);
  }

  /**
   * TODO ====================== SEARCH HASHTAGS ======================
   * @param query
   * @param limit
   * @returns //? Hashtag search for autocomplete and discovery
   */
  async searchHashtags(query: string, limit: number = 10) {
    if (!query || query.length < 2) {
      return [];
    }
    return await this.hashtagRepository.searchHashtags(query, limit);
  }

  /**
   * TODO ====================== GET RELATED HASHTAGS ======================
   * @param hashtagName
   * @param limit
   * @returns //? Hashtags frequently used together
   */
  async getRelatedHashtags(hashtagName: string, limit: number = 5) {
    // This could use more advanced analytics in production
    // For now, we'll return recently popular hashtags
    return await this.hashtagRepository.getTrendingHashtags('7d', limit);
  }
  //TODO ==================== UTILITY METHODS ====================

  private getZeroCounts() {
    return { likes: 0, ripples: 0, reechoes: 0, bookmarks: 0 };
  }
}
