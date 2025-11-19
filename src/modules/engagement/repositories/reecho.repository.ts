// src/engagement/repositories/reecho.repository.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BaseRepository } from '../../../common/base/repository.base';
import { PrismaService } from '../../../common/services/prisma.service';

export interface CreateReEchoDto {
  userId: string;
  echoId: string;
}

@Injectable()
export class ReEchoRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
  /**
   *  TODO ====================== REECHO AN ECHO ======================
   * @param createReEchoDto
   * @returns
   */
  async reecho(
    createReEchoDto: CreateReEchoDto,
  ): Promise<{ reecho: any; notificationNeeded: boolean }> {
    return this.executeTransaction(async (prisma) => {
      //* 1.Check if reecho already exists
      const existingReEcho = await prisma.reEcho.findUnique({
        where: {
          userId_echoId: {
            userId: createReEchoDto.userId,
            echoId: createReEchoDto.echoId,
          },
        },
      });

      if (existingReEcho) {
        throw new ConflictException('You have already reechoed this echo');
      }

      //* 2.Get echo to check ownership for notification
      const echo = await prisma.echo.findUnique({
        where: { id: createReEchoDto.echoId },
        select: { authorId: true },
      });

      if (!echo) {
        throw new NotFoundException('Echo not found');
      }

      //* 3.Create the reecho
      const reecho = await prisma.reEcho.create({
        data: createReEchoDto,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          echo: {
            select: {
              id: true,
              content: true,
              authorId: true,
            },
          },
        },
      });

      //TODO => Determine if notification is needed (not reechoing your own echo)
      const notificationNeeded = echo.authorId !== createReEchoDto.userId;

      return { reecho, notificationNeeded };
    });
  }
  /**
   * TODO ====================== UNRE ECHO AN ECHO ======================
   * @param userId
   * @param echoId
   */
  async unreecho(userId: string, echoId: string): Promise<void> {
    await this.executeTransaction(async (prisma) => {
      const reecho = await prisma.reEcho.findUnique({
        where: {
          userId_echoId: {
            userId,
            echoId,
          },
        },
      });

      if (!reecho) {
        throw new NotFoundException('ReEcho not found');
      }

      await prisma.reEcho.delete({
        where: {
          userId_echoId: {
            userId,
            echoId,
          },
        },
      });
    });
  }
  /**
   * TODO ====================== GET ALL REECHOES FOR A SPECIFIC ECHO ======================
   * @param echoId
   * @param page
   * @param limit
   * @returns // todo  ===> Return all users who reechoed this echo
   */
  async getReEchoesByEchoId(
    echoId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ reechoes: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const [reechoes, total] = await Promise.all([
      this.prisma.reEcho.findMany({
        where: { echoId },
        include: {
          user: {
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
        skip,
        take: limit,
      }),
      this.prisma.reEcho.count({ where: { echoId } }),
    ]);

    return { reechoes, total };
  }
  /**
   * TODO ====================== GET ALL REECHOES FOR A SPECIFIC USER ===================
   * @param userId
   * @param page
   * @param limit
   * @returns
   */
  async getUserReEchoes(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    reechoes: any[];
    total: number;
    meta: { hasNextPage: boolean; hasPreviousPage: boolean; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [reechoes, total] = await Promise.all([
      this.prisma.reEcho.findMany({
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
        take: limit + 1,
      }),
      this.prisma.reEcho.count({ where: { userId } }),
    ]);
    const hasNextPage = skip + limit < total;
    const hasPreviousPage = page > 1;
    const totalPages = Math.ceil(total / limit);
    return {
      reechoes,
      total,
      meta: { hasNextPage, hasPreviousPage, totalPages },
    };
  }
  /**
   * TODO ====================== CHECK IF USER REECHOED A SPECIFIC ECHO ======================
   * @param userId
   * @param echoId
   * @returns
   */
  async isReEchoed(userId: string, echoId: string): Promise<boolean> {
    const reecho = await this.prisma.reEcho.findUnique({
      where: {
        userId_echoId: {
          userId,
          echoId,
        },
      },
    });

    return !!reecho;
  }

  /**
   * TODO ====================== GET ALL REECHO COUNTS ======================
   * @param echoId
   * @returns
   */
  async getReEchoCount(echoId: string): Promise<number> {
    return this.prisma.reEcho.count({
      where: { echoId },
    });
  }
  async getUserReEchoesBatch(
    userId: string,
    echoIds: string[],
  ): Promise<{ echoId: string }[]> {
    return this.prisma.reEcho.findMany({
      where: {
        userId,
        echoId: { in: echoIds },
      },
      select: { echoId: true },
    });
  }
}
