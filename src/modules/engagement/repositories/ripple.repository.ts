// src/engagement/repositories/ripple.repository.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BaseRepository } from '../../../common/base/repository.base';
import { PrismaService } from '../../../common/services/prisma.service';

export interface CreateRippleDto {
  content: string;
  userId: string;
  echoId: string;
  parentId?: string;
}
export interface RippleWithRelations {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  echoId: string;
  parentId: string | null;
  deleted: boolean;
  user: {
    id: string;
    username: string;
    avatar: string | null;
  };
  echo: {
    id: string;
    authorId: string;
  };
  parent?: {
    id: string;
    user: {
      id: string;
      username: string;
    };
  } | null;
  replies?: any | null;
  _count?: {
    replies: number;
  } | null;
}

@Injectable()
export class RippleRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createRipple(
    createRippleDto: CreateRippleDto,
  ): Promise<{ ripple: RippleWithRelations; notificationNeeded: boolean }> {
    return this.executeTransaction(async (prisma) => {
      //* Verify echo exists
      const echo = await prisma.echo.findUnique({
        where: { id: createRippleDto.echoId },
        select: { id: true, authorId: true, deleted: true },
      });

      if (!echo || echo.deleted) {
        throw new NotFoundException('Echo not found');
      }

      //* Verify parent exists if provided
      if (createRippleDto.parentId) {
        const parent = await prisma.ripple.findUnique({
          where: { id: createRippleDto.parentId },
          include: { echo: true },
        });

        if (!parent) {
          throw new NotFoundException('Parent ripple not found');
        }

        //* Ensure parent belongs to the same echo
        if (parent.echoId !== createRippleDto.echoId) {
          throw new ForbiddenException(
            'Parent ripple does not belong to this echo',
          );
        }
      }

      //* Create the ripple
      const ripple = await prisma.ripple.create({
        data: {
          content: createRippleDto.content,
          userId: createRippleDto.userId,
          echoId: createRippleDto.echoId,
          parentId: createRippleDto.parentId,
        },
        include: this.getRippleInclude(),
      });

      //* Determine notification logic
      const notificationNeeded = await this.determineNotificationNeeded(
        ripple,
        echo,
      );

      return { ripple, notificationNeeded };
    });
  }

  async getRipplesByEchoId(
    echoId: string,
    page: number = 1,
    limit: number = 20,
    includeReplies: boolean = false,
  ): Promise<{ ripples: RippleWithRelations[]; total: number }> {
    const skip = (page - 1) * limit;

    const whereClause: any = {
      echoId,
      parentId: includeReplies ? undefined : null,
      deleted: false,
    };

    const [ripples, total] = await Promise.all([
      this.prisma.ripple.findMany({
        where: whereClause,
        include: this.getRippleInclude(includeReplies),
        orderBy: { createdAt: 'desc' as const },
        skip,
        take: limit,
      }),
      this.prisma.ripple.count({ where: whereClause }),
    ]);

    return { ripples, total };
  }

  async getRippleThread(rippleId: string): Promise<RippleWithRelations | null> {
    return this.prisma.ripple.findUnique({
      where: { id: rippleId, deleted: false },
      include: this.getRippleInclude(true),
    });
  }
  async updateRipple(
    rippleId: string,
    userId: string,
    content: string,
  ): Promise<RippleWithRelations> {
    return this.executeTransaction(async (prisma) => {
      const ripple = await prisma.ripple.findUnique({
        where: { id: rippleId },
      });

      if (!ripple) {
        throw new NotFoundException('Ripple not found');
      }

      if (ripple.userId !== userId) {
        throw new ForbiddenException('You can only edit your own ripples');
      }

      //* Check edit window (15 minutes)
      const editWindowMs = 15 * 60 * 1000;
      const now = new Date();
      const timeSinceCreation = now.getTime() - ripple.createdAt.getTime();
      const timeSinceUpdate = now.getTime() - ripple.updatedAt.getTime();

      //* If already updated, use the last update time to enforce edit window
      if (timeSinceUpdate > editWindowMs || timeSinceCreation > editWindowMs) {
        throw new ForbiddenException(
          'Ripple can only be edited within 15 minutes of the last update',
        );
      }

      return prisma.ripple.update({
        where: { id: rippleId },
        data: { content },
        include: this.getRippleInclude(),
      });
    });
  }

  async softDeleteRipple(
    rippleId: string,
    userId: string,
    userRole?: string,
  ): Promise<void> {
    await this.executeTransaction(async (prisma) => {
      const ripple = await prisma.ripple.findUnique({
        where: { id: rippleId },
        include: { echo: true },
      });

      if (!ripple) {
        throw new NotFoundException('Ripple not found');
      }

      const isOwner = ripple.userId === userId;
      const isEchoOwner = ripple.echo.authorId === userId;
      const isAdmin = userRole === 'admin';

      if (!isOwner && !isEchoOwner && !isAdmin) {
        throw new ForbiddenException(
          'You do not have permission to delete this ripple',
        );
      }

      await prisma.ripple.update({
        where: { id: rippleId },
        data: { deleted: true },
      });
    });
  }

  async getRippleCount(echoId: string): Promise<number> {
    return this.prisma.ripple.count({
      where: {
        echoId,
        deleted: false,
        parentId: null, // Only count top-level ripples
      },
    });
  }

  private getRippleInclude(includeReplies: boolean = false) {
    return {
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
          authorId: true,
        },
      },
      parent: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
      ...(includeReplies && {
        replies: {
          where: { deleted: false },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
            _count: {
              select: { replies: true },
            },
          },
          orderBy: { createdAt: 'asc' as const },
        },
      }),
      _count: {
        select: { replies: true },
      },
    };
  }

  private async determineNotificationNeeded(
    ripple: any,
    echo: any,
  ): Promise<boolean> {
    //* Notify echo author if it's not their ripple
    if (ripple.userId !== echo.authorId) {
      return true;
    }

    //* Notify parent author if it's a reply and not to themselves
    if (ripple.parentId) {
      const parent = await this.prisma.ripple.findUnique({
        where: { id: ripple.parentId },
        select: { userId: true },
      });

      if (parent && parent.userId !== ripple.userId) {
        return true;
      }
    }

    return false;
  }
}
