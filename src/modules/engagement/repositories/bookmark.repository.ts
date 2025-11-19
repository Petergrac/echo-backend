import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BaseRepository } from '../../../common/base/repository.base';
import { PrismaService } from '../../../common/services/prisma.service';

export interface CreateBookmarkDto {
  userId: string;
  echoId: string;
}

@Injectable()
export class BookmarkRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
  // TODO ==================== BOOKMARK OPERATIONS ====================
  async bookmark(createBookmarkDto: CreateBookmarkDto): Promise<any> {
    return this.executeTransaction(async (prisma) => {
      //* 1. Check if bookmark already exists using composite keys
      const existingBookmark = await prisma.bookmark.findUnique({
        where: {
          userId_echoId: {
            userId: createBookmarkDto.userId,
            echoId: createBookmarkDto.echoId,
          },
        },
      });

      if (existingBookmark) {
        throw new ConflictException('You have already bookmarked this echo');
      }

      //* 2. Verify echo exists
      const echo = await prisma.echo.findUnique({
        where: { id: createBookmarkDto.echoId },
        select: { id: true },
      });

      if (!echo) {
        throw new NotFoundException('Echo not found');
      }

      //* 3.Create the bookmark
      return prisma.bookmark.create({
        data: createBookmarkDto,
        include: {
          echo: {
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
                },
              },
            },
          },
        },
      });
    });
  }
  // TODO ==================== UN-BOOKMARK OPERATIONS ====================
  async unbookmark(userId: string, echoId: string): Promise<void> {
    //* 1. First check if the bookmark is available
    await this.executeTransaction(async (prisma) => {
      const bookmark = await prisma.bookmark.findUnique({
        where: {
          userId_echoId: {
            userId,
            echoId,
          },
        },
      });

      if (!bookmark) {
        throw new NotFoundException('Bookmark not found');
      }
      //* 2. Delete the bookmark
      await prisma.bookmark.delete({
        where: {
          userId_echoId: {
            userId,
            echoId,
          },
        },
      });
    });
  }
  // TODO ==================== GET USER BOOKMARKS ====================
  async getUserBookmarks(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ bookmarks: any[]; total: number }> {
    const skip = (page - 1) * limit;
    const [bookmarks, total] = await Promise.all([
      //* Get all users bookmarks
      this.prisma.bookmark.findMany({
        where: { userId },
        include: {
          echo: {
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
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bookmark.count({ where: { userId } }),
    ]);

    return { bookmarks, total };
  }
  // TODO ==================== CHECK IF BOOKMARKED ====================
  async isBookmarked(userId: string, echoId: string): Promise<boolean> {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: {
        userId_echoId: {
          userId,
          echoId,
        },
      },
    });

    return !!bookmark;
  }
  // TODO ==================== GET BOOKMARK COUNT ====================
  async getBookmarkCount(echoId: string): Promise<number> {
    return this.prisma.bookmark.count({
      where: { echoId },
    });
  }
  //TODO =================== GET ALL USERS BOOKMARKS IN BATCH ===============
  async getUserBookmarksBatch(
    userId: string,
    echoIds: string[],
  ): Promise<{ echoId: string }[]> {
    return this.prisma.bookmark.findMany({
      where: {
        userId,
        echoId: { in: echoIds },
      },
      select: { echoId: true },
    });
  }
}
