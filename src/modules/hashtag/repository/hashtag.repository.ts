// src/hashtag/repositories/hashtag.repository.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { HashtagExtractor } from '../utils/hashtag-extractor.util';

@Injectable()
export class HashtagRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
    * TODO ====================== FIND OR CREATE HASHTAGS ======================
    * @param hashtagNames 
    * @returns //? Map of hashtag names to their database records
    */
  async findOrCreateHashtags(hashtagNames: string[]): Promise<Map<string, any>> {
    if (hashtagNames.length === 0) {
      return new Map();
    }

    try {
      //* 1.Normalize and validate all hashtags
      const normalizedHashtags = hashtagNames
        .map(name => HashtagExtractor.normalizeHashtag(name))
        .filter(name => HashtagExtractor.isValidHashtag(name));

      if (normalizedHashtags.length === 0) {
        return new Map();
      }

      //* 2.Find existing hashtags
      const existingHashtags = await this.prisma.hashtag.findMany({
        where: { name: { in: normalizedHashtags } },
      });

      const existingMap = new Map(
        existingHashtags.map(tag => [tag.name, tag])
      );

      //* 3.Identify new hashtags to create
      const newHashtagNames = normalizedHashtags.filter(
        name => !existingMap.has(name)
      );

      //* 4.Create new hashtags
      if (newHashtagNames.length > 0) {
        const createPromises = newHashtagNames.map(name =>
          this.prisma.hashtag.create({
            data: { name },
          })
        );

        const newHashtags = await Promise.all(createPromises);
        newHashtags.forEach(tag => existingMap.set(tag.name, tag));
      }

      return existingMap;
    } catch (error) {
      throw new InternalServerErrorException('Failed to process hashtags');
    }
  }

  /**
    * TODO ====================== LINK HASHTAGS TO ECHO ======================
    * @param echoId 
    * @param hashtagMap 
    * @returns //? Create EchoHashtag relations
    */
  async linkHashtagsToEcho(echoId: string, hashtagMap: Map<string, any>): Promise<void> {
    if (hashtagMap.size === 0) return;

    try {
      const echoHashtagData = Array.from(hashtagMap.values()).map(hashtag => ({
        echoId,
        hashtagId: hashtag.id,
      }));

      await this.prisma.echoHashtag.createMany({
        data: echoHashtagData,
        skipDuplicates: true, // Prevent duplicate relations
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to link hashtags to echo');
    }
  }

  /**
    * TODO ====================== GET ECHOES BY HASHTAG ======================
    * @param hashtagName 
    * @param page 
    * @param limit 
    * @returns //? Paginated echoes for a specific hashtag
    */
  async getEchoesByHashtag(
    hashtagName: string, 
    page: number = 1, 
    limit: number = 20
  ) {
    try {
      const normalizedHashtag = HashtagExtractor.normalizeHashtag(hashtagName);
      const skip = (page - 1) * limit;

      const [echoes, total] = await Promise.all([
        this.prisma.echo.findMany({
          where: {
            echoHashtags: {
              some: {
                hashtag: {
                  name: normalizedHashtag,
                },
              },
            },
            deleted: false,
          },
          include: {
            media: true,
            author: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
            _count: {
              select: {
                likes: true,
                ripples: true,
                reechoes: true,
                bookmarks: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.echo.count({
          where: {
            echoHashtags: {
              some: {
                hashtag: {
                  name: normalizedHashtag,
                },
              },
            },
            deleted: false,
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        echoes,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch echoes by hashtag');
    }
  }

  /**
    * TODO ====================== GET TRENDING HASHTAGS ======================
    * @param timeframe 
    * @param limit 
    * @returns //? Most popular hashtags based on recent usage
    */
  async getTrendingHashtags(timeframe: string = '7d', limit: number = 10) {
    try {
      //* Calculate time window
      const since = new Date();
      switch (timeframe) {
        case '1d':
          since.setDate(since.getDate() - 1);
          break;
        case '7d':
          since.setDate(since.getDate() - 7);
          break;
        case '30d':
          since.setDate(since.getDate() - 30);
          break;
        default:
          since.setDate(since.getDate() - 7);
      }

      const trendingHashtags = await this.prisma.hashtag.findMany({
        where: {
          echoHashtags: {
            some: {
              echo: {
                createdAt: { gte: since },
                deleted: false,
              },
            },
          },
        },
        include: {
          _count: {
            select: {
              echoHashtags: {
                where: {
                  echo: {
                    createdAt: { gte: since },
                    deleted: false,
                  },
                },
              },
            },
          },
        },
        orderBy: {
          echoHashtags: {
            _count: 'desc',
          },
        },
        take: limit,
      });

      //* Transform to include echo count and last used date
      const transformed = trendingHashtags.map(hashtag => ({
        name: hashtag.name,
        echoCount: hashtag._count.echoHashtags,
        lastUsed: hashtag.updatedAt,
      }));

      return {
        trending: transformed,
        timeframe,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch trending hashtags');
    }
  }

  /**
    * TODO ====================== SEARCH HASHTAGS ======================
    * @param query 
    * @param limit 
    * @returns //? Hashtag search with autocomplete functionality
    */
  async searchHashtags(query: string, limit: number = 10) {
    try {
      const normalizedQuery = HashtagExtractor.normalizeHashtag(query);

      const hashtags = await this.prisma.hashtag.findMany({
        where: {
          name: {
            contains: normalizedQuery,
            mode: 'insensitive',
          },
        },
        include: {
          _count: {
            select: {
              echoHashtags: {
                where: {
                  echo: {
                    deleted: false,
                  },
                },
              },
            },
          },
        },
        orderBy: {
          echoHashtags: {
            _count: 'desc',
          },
        },
        take: limit,
      });

      return hashtags.map(hashtag => ({
        name: hashtag.name,
        echoCount: hashtag._count.echoHashtags,
        lastUsed: hashtag.updatedAt,
      }));
    } catch (error) {
      throw new InternalServerErrorException('Failed to search hashtags');
    }
  }

  /**
    * TODO ====================== GET HASHTAG STATS ======================
    * @param hashtagName 
    * @returns //? Detailed statistics for a specific hashtag
    */
  async getHashtagStats(hashtagName: string) {
    try {
      const normalizedHashtag = HashtagExtractor.normalizeHashtag(hashtagName);

      const [hashtag, echoCount, recentEchoes] = await Promise.all([
        this.prisma.hashtag.findUnique({
          where: { name: normalizedHashtag },
        }),
        this.prisma.echoHashtag.count({
          where: {
            hashtag: { name: normalizedHashtag },
            echo: { deleted: false },
          },
        }),
        this.prisma.echo.count({
          where: {
            echoHashtags: {
              some: {
                hashtag: { name: normalizedHashtag },
              },
            },
            deleted: false,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      if (!hashtag) {
        return null;
      }

      return {
        name: hashtag.name,
        totalEchoes: echoCount,
        recentEchoes,
        createdAt: hashtag.createdAt,
        lastUsed: hashtag.updatedAt,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch hashtag stats');
    }
  }
}