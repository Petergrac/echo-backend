// src/feed/feed.service.ts - FIXED VERSION
import { Injectable } from '@nestjs/common';
import { FeedRepository } from './repositories/feed.repository';
import { EngagementService } from '../engagement/engagement.service';
import { FeedQueryDto } from './dto/feed-query.dto';
import { FeedResponseDto, FeedEchoDto, FeedMetaDto } from './dto/feed-response.dto';
import { EchoResponseDto } from '../echo/dto/echo-response.dto';

@Injectable()
export class FeedService {

  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly engagementService: EngagementService,
  ) {}

  /**
    * TODO ====================== GET TIMELINE FEED ======================
    * @param userId 
    * @param query 
    * @returns //? Personalized timeline feed with full engagement data
    */
  async getTimelineFeed(
    userId: string, 
    query: FeedQueryDto
  ): Promise<FeedResponseDto> {
    const cursor = this.validateCursor(query.cursor);
    const limit = Math.min(query.limit || 10, 50);

    /**
      * TODO ====================== FETCH TIMELINE ECHOES ======================
      * @param userId 
      * @param cursor 
      * @param limit 
      * @returns //? Get raw echoes from users the current user follows
      */
    const result = await this.feedRepository.getTimelineEchoes(
      userId, 
      cursor, 
      limit
    );

    // Return empty feed if no echoes
    if (result.echoes.length === 0) {
      return this.getEmptyFeed();
    }

    /**
      * TODO ====================== ENRICH WITH ENGAGEMENT DATA ======================
      * @param result.echoes 
      * @param userId 
      * @returns //? Add engagement counts and user states to each echo
      */
    const enrichedEchoes = await this.enrichEchoesWithEngagementData(
      result.echoes, 
      userId
    );

    const meta: FeedMetaDto = {
      hasNext: result.hasNext,
      nextCursor: result.nextCursor?.toISOString(),
      count: enrichedEchoes.length,
    };

    return { items: enrichedEchoes, meta };
  }

  /**
    * TODO ====================== GET TRENDING FEED ======================
    * @param userId 
    * @param query 
    * @returns //? Platform-wide trending feed with engagement data
    */
  async getTrendingFeed(
    userId: string | null, 
    query: FeedQueryDto
  ): Promise<FeedResponseDto> {
    const cursor = this.validateCursor(query.cursor);
    const limit = Math.min(query.limit || 10, 50);

    /**
      * TODO ====================== FETCH TRENDING ECHOES ======================
      * @param cursor 
      * @param limit 
      * @returns //? Get trending echoes with engagement-based scoring
      */
    const result = await this.feedRepository.getTrendingEchoes(cursor, limit);

    if (result.echoes.length === 0) {
      return this.getEmptyFeed();
    }

    /**
      * TODO ====================== ENRICH BASED ON AUTH STATUS ======================
      * @param result.echoes 
      * @param userId 
      * @returns //? Full enrichment for auth users, basic for guests
      */
    const enrichedEchoes = userId 
      ? await this.enrichEchoesWithEngagementData(result.echoes, userId)
      : await this.enrichEchoesWithCountsOnly(result.echoes);

    const meta: FeedMetaDto = {
      hasNext: result.hasNext,
      nextCursor: result.nextCursor?.toISOString(),
      count: enrichedEchoes.length,
    };

    return { items: enrichedEchoes, meta };
  }

  /**
    * TODO ====================== ENRICH ECHOES WITH ENGAGEMENT DATA ======================
    * @param echoes 
    * @param userId 
    * @returns //? Full enrichment with counts and user engagement states
    */
  private async enrichEchoesWithEngagementData(
    echoes: any[], 
    userId: string
  ): Promise<FeedEchoDto[]> {
    const echoIds = echoes.map(echo => echo.id);

    /**
      * TODO ====================== PARALLEL ENGAGEMENT OPERATIONS ======================
      * @param echoIds 
      * @param userId 
      * @returns //? Execute batch operations in parallel for optimal performance
      */
    const [engagementCounts, userEngagementStates] = await Promise.all([
      this.engagementService.getBatchEngagementCounts(echoIds),
      this.engagementService.getBatchEngagementStates(userId, echoIds),
    ]);

    /**
      * TODO ====================== TRANSFORM ECHOES WITH ENGAGEMENT DATA ======================
      * @param echoes 
      * @param engagementCounts 
      * @param userEngagementStates 
      * @returns //? Combine echo data with engagement information
      */
    return echoes.map(echo => {
      const baseEcho = EchoResponseDto.fromEntity(echo);
      const counts = engagementCounts.get(echo.id) || this.getZeroCounts();
      const userState = userEngagementStates.get(echo.id) || this.getDefaultUserState();

      return {
        ...baseEcho,
        counts,
        userState,
        trendingScore: echo.trendingScore,
      };
    });
  }

  /**
    * TODO ====================== ENRICH ECHOES WITH COUNTS ONLY ======================
    * @param echoes 
    * @returns //? Basic enrichment for unauthenticated users (counts only)
    */
  private async enrichEchoesWithCountsOnly(echoes: any[]): Promise<FeedEchoDto[]> {
    const echoIds = echoes.map(echo => echo.id);
    const engagementCounts = await this.engagementService.getBatchEngagementCounts(echoIds);

    return echoes.map(echo => {
      const baseEcho = EchoResponseDto.fromEntity(echo);
      const counts = engagementCounts.get(echo.id) || this.getZeroCounts();

      return {
        ...baseEcho,
        counts,
        userState: this.getDefaultUserState(),
        trendingScore: echo.trendingScore,
      };
    });
  }

  // ==================== UTILITY METHODS ====================

  /**
    * TODO ====================== VALIDATE CURSOR ======================
    * @param cursor 
    * @returns //? Safe cursor validation with fallback to null
    */
  private validateCursor(cursor: string | null): Date | null {
    if (!cursor) return null;
    const cursorDate = new Date(cursor);
    return isNaN(cursorDate.getTime()) ? null : cursorDate;
  }

  /**
    * TODO ====================== GET EMPTY FEED ======================
    * @returns //? Standardized empty feed response
    */
  private getEmptyFeed(): FeedResponseDto {
    return {
      items: [],
      meta: {
        hasNext: false,
        count: 0,
      },
    };
  }

  /**
    * TODO ====================== GET ZERO COUNTS ======================
    * @returns //? Default zero counts for engagement metrics
    */
  private getZeroCounts() {
    return { likes: 0, ripples: 0, reechoes: 0, bookmarks: 0 };
  }

  /**
    * TODO ====================== GET DEFAULT USER STATE ======================
    * @returns //? Default false states for user engagement
    */
  private getDefaultUserState() {
    return { liked: false, reechoed: false, bookmarked: false };
  }
}