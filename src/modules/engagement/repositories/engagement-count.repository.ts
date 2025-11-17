import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';

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
    const countsMap = new Map<string, EngagementCounts>();

    //* 1.Get all counts in parallel
    const [likes, ripples, reechoes, bookmarks] = await Promise.all([
      this.prisma.like.groupBy({
        by: ['echoId'],
        _count: { id: true },
        where: { echoId: { in: echoIds } },
      }),
      this.prisma.ripple.groupBy({
        by: ['echoId'],
        _count: { id: true },
        where: {
          echoId: { in: echoIds },
          deleted: false,
          parentId: null,
        },
      }),
      this.prisma.reEcho.groupBy({
        by: ['echoId'],
        _count: { id: true },
        where: { echoId: { in: echoIds } },
      }),
      this.prisma.bookmark.groupBy({
        by: ['echoId'],
        _count: { id: true },
        where: { echoId: { in: echoIds } },
      }),
    ]);

    //* 2.Initialize map with zero counts
    echoIds.forEach((id) => {
      countsMap.set(id, { likes: 0, ripples: 0, reechoes: 0, bookmarks: 0 });
    });

    //* 3.Populate with actual counts
    likes.forEach((item) => {
      const counts = countsMap.get(item.echoId);
      if (counts) counts.likes = item._count.id;
    });

    ripples.forEach((item) => {
      const counts = countsMap.get(item.echoId);
      if (counts) counts.ripples = item._count.id;
    });

    reechoes.forEach((item) => {
      const counts = countsMap.get(item.echoId);
      if (counts) counts.reechoes = item._count.id;
    });

    bookmarks.forEach((item) => {
      const counts = countsMap.get(item.echoId);
      if (counts) counts.bookmarks = item._count.id;
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
