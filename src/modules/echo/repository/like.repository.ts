import { Injectable, NotFoundException } from '@nestjs/common';
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
  /**
   *  TODO ====================== LIKE / UNLIKE AN ECHO ======================
   * @param createLikeDto
   * @returns //? Like object and boolean indicating if notification is needed
   */
  async toggleLike(
    createLikeDto: CreateLikeDto,
  ): Promise<{ like: any; notificationNeeded: boolean }> {
    return this.executeTransaction(async (prisma) => {
      //* 1.Check if like already exists
      const existingLike = await prisma.like.findUnique({
        where: {
          userId_echoId: {
            userId: createLikeDto.userId,
            echoId: createLikeDto.echoId,
          },
        },
      });

      //* 2.If like exists, remove it first (toggle behavior)
      if (existingLike) {
        await prisma.like.delete({
          where: {
            userId_echoId: {
              userId: createLikeDto.userId,
              echoId: createLikeDto.echoId,
            },
          },
        });
        return { like: null, notificationNeeded: false };
      }

      //* 3.Get echo to check ownership for notification
      const echo = await prisma.echo.findUnique({
        where: { id: createLikeDto.echoId },
        select: { authorId: true },
      });

      if (!echo) {
        throw new NotFoundException('Echo not found');
      }

      //* 3.Create the like
      const like: LikeWithUser = await prisma.like.create({
        data: {
          ...createLikeDto,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
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
  /**
   *  TODO ====================== CHECK IF USER LIKED A SPECIFIC ECHO ======================
   * @param userId
   * @param echoId
   * @returns
   */
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
}
