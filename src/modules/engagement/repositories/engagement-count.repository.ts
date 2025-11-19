import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { Prisma } from '../../../generated/prisma/client';

export interface EngagementCounts {
  likes: number;
  ripples: number;
  reechoes: number;
  bookmarks: number;
}

@Injectable()
export class EngagementCountRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * TODO ====================== GET COUNTS FOR ECHO ======================
   * @param echoId  the echo id to get counts for
   * @returns //? Counts of likes, ripples, reechoes, and bookmarks for a specific echo
   */
  async getCountsForEcho(echoId: string): Promise<EngagementCounts> {
    const [likes, ripples, reechoes, bookmarks] = await Promise.all([
      this.prisma.like.count({ where: { echoId } }),
      this.prisma.ripple.count({
        where: {
          echoId,
          deleted: false,
          parentId: null,
        },
      }),
      this.prisma.reEcho.count({ where: { echoId } }),
      this.prisma.bookmark.count({ where: { echoId } }),
    ]);

    return { likes, ripples, reechoes, bookmarks };
  }
  /**
   *  TODO ====================== GET COUNTS FOR MULTIPLE ECHOES ======================
   * @param echoIds
   * @returns //? Map of echo IDs to their respective engagement counts
   */
  async getCountsForEchoes(
    echoIds: string[],
  ): Promise<Map<string, EngagementCounts>> {
    if (echoIds.length === 0) return new Map();

    //* 1.Single optimized query using raw SQL for best performance
    const counts = await this.prisma.$queryRaw<
      Array<{
        echoId: string;
        likes: number;
        ripples: number;
        reechoes: number;
        bookmarks: number;
      }>
    >`
    SELECT 
      e.id as "echoId",
      COALESCE(l.likes, 0) as likes,
      COALESCE(r.ripples, 0) as ripples,
      COALESCE(re.reechoes, 0) as reechoes,
      COALESCE(b.bookmarks, 0) as bookmarks
    FROM "Echo" e
    LEFT JOIN (
      SELECT "echoId", COUNT(*) as likes
      FROM "Like" 
      WHERE "echoId" IN (${Prisma.join(echoIds)})
      GROUP BY "echoId"
    ) l ON e.id = l."echoId"
    LEFT JOIN (
      SELECT "echoId", COUNT(*) as ripples
      FROM "Ripple" 
      WHERE "echoId" IN (${Prisma.join(echoIds)})
        AND "deleted" = false
        AND "parentId" IS NULL
      GROUP BY "echoId"
    ) r ON e.id = r."echoId"
    LEFT JOIN (
      SELECT "echoId", COUNT(*) as reechoes
      FROM "ReEcho" 
      WHERE "echoId" IN (${Prisma.join(echoIds)})
      GROUP BY "echoId"
    ) re ON e.id = re."echoId"
    LEFT JOIN (
      SELECT "echoId", COUNT(*) as bookmarks
      FROM "Bookmark" 
      WHERE "echoId" IN (${Prisma.join(echoIds)})
      GROUP BY "echoId"
    ) b ON e.id = b."echoId"
    WHERE e.id IN (${Prisma.join(echoIds)})
  `;

    const countsMap = new Map<string, EngagementCounts>();
    counts.forEach((item) => {
      countsMap.set(item.echoId, {
        likes: Number(item.likes),
        ripples: Number(item.ripples),
        reechoes: Number(item.reechoes),
        bookmarks: Number(item.bookmarks),
      });
    });

    return countsMap;
  }
  /**
   *  TODO ====================== GET USER ENGAGEMENT STATISTICS ======================
   * @param userId
   * @returns // ? Statistics of a user's engagement activities
   */
  async getUserEngagementStats(userId: string): Promise<{
    likesGiven: number;
    ripplesMade: number;
    reechoesMade: number;
    bookmarksMade: number;
    echoesCreated: number;
  }> {
    const [
      likesGiven,
      ripplesMade,
      reechoesMade,
      bookmarksMade,
      echoesCreated,
    ] = await Promise.all([
      this.prisma.like.count({ where: { userId } }),
      this.prisma.ripple.count({ where: { userId, deleted: false } }),
      this.prisma.reEcho.count({ where: { userId } }),
      this.prisma.bookmark.count({ where: { userId } }),
      this.prisma.echo.count({ where: { authorId: userId, deleted: false } }),
    ]);

    return {
      likesGiven,
      ripplesMade,
      reechoesMade,
      bookmarksMade,
      echoesCreated,
    };
  }
}
