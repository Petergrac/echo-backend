// src/engagement/repositories/like.repository.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BaseRepository } from '../../../common/base/repository.base';
import { PrismaService } from '../../../common/services/prisma.service';

export interface CreateLikeDto {
  userId: string;
  echoId: string;
}

export interface LikeWithUser {
  id: string;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    avatar?: string | null;
  };
}

@Injectable()
export class LikeRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async like(
    createLikeDto: CreateLikeDto,
  ): Promise<{ like: any; notificationNeeded: boolean }> {
    return this.executeTransaction(async (prisma) => {
      //* Check if like already exists
      const existingLike = await prisma.like.findUnique({
        where: {
          userId_echoId: {
            userId: createLikeDto.userId,
            echoId: createLikeDto.echoId,
          },
        },
      });

      if (existingLike) {
        throw new ConflictException('You have already liked this echo');
      }

      //* Get echo to check ownership for notification
      const echo = await prisma.echo.findUnique({
        where: { id: createLikeDto.echoId },
        select: { authorId: true },
      });

      if (!echo) {
        throw new NotFoundException('Echo not found');
      }

      //* Create the like
      const like = await prisma.like.create({
        data: createLikeDto,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      });

      //? Determine if notification is needed (not liking your own echo)
      const notificationNeeded = echo.authorId !== createLikeDto.userId;

      return { like, notificationNeeded };
    });
  }

  async unlike(userId: string, echoId: string): Promise<void> {
    await this.executeTransaction(async (prisma) => {
      const like = await prisma.like.findUnique({
        where: {
          userId_echoId: {
            userId,
            echoId,
          },
        },
      });

      if (!like) {
        throw new NotFoundException('Like not found');
      }

      await prisma.like.delete({
        where: {
          userId_echoId: {
            userId,
            echoId,
          },
        },
      });
    });
  }

  async getLikesByEchoId(
    echoId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ likes: LikeWithUser[]; total: number }> {
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      this.prisma.like.findMany({
        where: { echoId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.like.count({ where: { echoId } }),
    ]);

    return { likes, total };
  }

  async getUserLikes(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ likes: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      this.prisma.like.findMany({
        where: { userId },
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.like.count({ where: { userId } }),
    ]);

    return { likes, total };
  }

  async isLiked(userId: string, echoId: string): Promise<boolean> {
    const like = await this.prisma.like.findUnique({
      where: {
        userId_echoId: {
          userId,
          echoId,
        },
      },
    });

    return !!like;
  }

  async getLikeCount(echoId: string): Promise<number> {
    return this.prisma.like.count({
      where: { echoId },
    });
  }

  async getUserLikesBatch(userId: string, echoIds: string[]): Promise<{ echoId: string }[]> {
  return this.prisma.like.findMany({
    where: {
      userId,
      echoId: { in: echoIds },
    },
    select: { echoId: true },
  });
}
}
