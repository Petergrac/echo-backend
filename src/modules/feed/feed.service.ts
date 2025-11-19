import { Injectable } from '@nestjs/common';
import { FeedRepository } from './repositories/feed.repository';
import { EngagementService } from '../engagement/engagement.service';
import { FeedQueryDto } from './dto/feed-query.dto';
import {
  FeedResponseDto,
  FeedEchoDto,
  FeedMetaDto,
} from './dto/feed-response.dto';
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
    query: FeedQueryDto,
  ): Promise<FeedResponseDto> {
    const cursor = this.validateCursor(query.cursor);
    const limit = Math.min(query.limit || 10, 50);

    //* ====================== FETCH TIMELINE ECHOES ======================
    const result = await this.feedRepository.getTimelineEchoes(
      userId,
      cursor,
      limit,
    );

    //* Return empty feed if no echoes
    if (result.echoes.length === 0) {
      return this.getEmptyFeed();
    }

    //* ====================== ENRICH WITH ENGAGEMENT DATA ======================
    const enrichedEchoes = await this.enrichEchoesWithEngagementData(
      result.echoes,
      userId,
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
    userId: string,
    query: FeedQueryDto,
  ): Promise<FeedResponseDto> {
    const cursor = this.validateCursor(query.cursor);
    const limit = Math.min(query.limit || 10, 50);
    //* ====================== FETCH TRENDING ECHOES ======================
    const result = await this.feedRepository.getTrendingEchoes(cursor, limit);

    if (result.echoes.length === 0) {
      return this.getEmptyFeed();
    }
    //* ====================== ENRICH THE RESULT WITH COUNT & STATUS ======================

    const enrichedEchoes = await this.enrichEchoesWithEngagementData(
      result.echoes,
      userId,
    );

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
    userId: string,
  ): Promise<FeedEchoDto[]> {
    const echoIds = echoes.map((echo) => echo.id);

    //* Perform batch fetches for counts and user states
    const userEngagementStates =
      await this.engagementService.getBatchEngagementStates(userId, echoIds);

    //* Map each echo to its enriched DTO
    return echoes.map((echo) => {
      const baseEcho = EchoResponseDto.fromEntity(echo);
      const userState =
        userEngagementStates.get(echo.id) || this.getDefaultUserState();

      return {
        ...baseEcho,
        counts: echo.counts,
        userState,
        trendingScore: echo.trendingScore,
      };
    });
  }

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
