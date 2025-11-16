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

  async reecho(
    createReEchoDto: CreateReEchoDto,
  ): Promise<{ reecho: any; notificationNeeded: boolean }> {
    return this.executeTransaction(async (prisma) => {
      //* Check if reecho already exists
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

      //* Get echo to check ownership for notification
      const echo = await prisma.echo.findUnique({
        where: { id: createReEchoDto.echoId },
        select: { authorId: true },
      });

      if (!echo) {
        throw new NotFoundException('Echo not found');
      }

      //* Create the reecho
      const reecho = await prisma.reEcho.create({
        data: createReEchoDto,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
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

      //TODO Determine if notification is needed (not reechoing your own echo)
      const notificationNeeded = echo.authorId !== createReEchoDto.userId;

      return { reecho, notificationNeeded };
    });
  }

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

  async getUserReEchoes(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ reechoes: any[]; total: number }> {
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
      this.prisma.reEcho.count({ where: { userId } }),
    ]);

    return { reechoes, total };
  }

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

  async getReEchoCount(echoId: string): Promise<number> {
    return this.prisma.reEcho.count({
      where: { echoId },
    });
  }
  async getUserReEchoesBatch(userId: string, echoIds: string[]): Promise<{ echoId: string }[]> {
  return this.prisma.reEcho.findMany({
    where: {
      userId,
      echoId: { in: echoIds },
    },
    select: { echoId: true },
  });
}
}
