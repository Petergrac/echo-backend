// src/feed/repositories/feed.repository.ts - FIXED VERSION
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { EngagementService } from '../../engagement/engagement.service';

@Injectable()
export class FeedRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engagementService: EngagementService,
  ) {}

  /**
   * TODO ====================== GET FOLLOWING USER IDs ======================
   * @param userId
   * @returns //? Array of user IDs that the current user follows
   */
  async getFollowingUserIds(userId: string): Promise<string[]> {
    try {
      const follows = await this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });

      return follows.map((follow) => follow.followingId);
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch following users');
    }
  }

  /**
   * TODO ====================== GET TIMELINE ECHOES ======================
   * @param userId
   * @param cursor
   * @param limit
   * @returns //? Paginated timeline echoes from followed users with engagement counts
   */
  async getTimelineEchoes(userId: string, cursor: Date | null, limit: number) {
    try {
      const followingIds = await this.getFollowingUserIds(userId);
      //* 1.Include user's own echoes in timeline
      const authorIds = [...followingIds, userId];

      const whereClause: any = {
        authorId: { in: authorIds },
        deleted: false,
      };

      //* 2.Cursor-based pagination
      if (cursor) {
        whereClause.createdAt = { lt: cursor };
      }

      const echoes = await this.prisma.echo.findMany({
        where: whereClause,
        include: {
          media: true,
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      });

      const hasNext = echoes.length > limit;
      const items = hasNext ? echoes.slice(0, -1) : echoes;
      const nextCursor =
        items.length > 0 ? items[items.length - 1].createdAt : null;

      return {
        echoes: items,
        hasNext,
        nextCursor,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch timeline echoes');
    }
  }

  /**
   * TODO ====================== GET TRENDING ECHOES ======================
   * @param cursor
   * @param limit
   * @returns //? Paginated trending echoes with engagement-based scoring
   */
  async getTrendingEchoes(cursor: Date | null, limit: number) {
    try {
      //* Calculate time window (last 7 days for trending)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const whereClause: any = {
        deleted: false,
        createdAt: { gte: oneWeekAgo },
      };

      if (cursor) {
        whereClause.createdAt.lt = cursor;
      }

      const echoes = await this.prisma.echo.findMany({
        where: whereClause,
        include: {
          media: true,
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
      });

      //* Get the echo counts for engagement scoring
      const echoIds = echoes.map((echo) => echo.id);
      const engagementCounts =
        await this.engagementService.getBatchEngagementCounts(echoIds);

      //* Calculate trending scores
      const echoesWithScores = echoes.map((echo) => ({
        ...echo,
        trendingScore: this.calculateTrendingScore(
          echo,
          engagementCounts.get(echo.id),
        ),
      }));

      //* Sort by trending score (descending)
      echoesWithScores.sort((a, b) => b.trendingScore - a.trendingScore);

      const hasNext = echoesWithScores.length > limit;
      const items = hasNext ? echoesWithScores.slice(0, -1) : echoesWithScores;
      const nextCursor =
        items.length > 0 ? items[items.length - 1].createdAt : null;

      return {
        echoes: items,
        hasNext,
        nextCursor,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch trending echoes');
    }
  }

  /**
   * TODO ====================== CALCULATE TRENDING SCORE ======================
   * @param echo
   * @param counts
   * @returns //? Engagement-based trending score with time decay
   */
  private calculateTrendingScore(echo: any, counts: any): number {
    const { likes = 0, ripples = 0, reechoes = 0 } = counts;

    // Engagement weights
    const engagementScore = likes * 1 + ripples * 2 + reechoes * 3;

    // Time decay factor
    const now = new Date();
    const hoursOld =
      (now.getTime() - echo.createdAt.getTime()) / (1000 * 60 * 60);
    const timeDecay = Math.exp(-hoursOld / 36); // Half-life of 36 hours

    // Media bonus
    const mediaBonus = echo.media.length > 0 ? 1.2 : 1.0;

    return engagementScore * timeDecay * mediaBonus;
  }
}
