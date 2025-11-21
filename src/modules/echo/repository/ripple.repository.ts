import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BaseRepository } from '../../../common/base/repository.base';
import { PrismaService } from '../../../common/services/prisma.service';
import { PrismaClient } from '../../../generated/prisma/client';
import { RippleResponseDto } from '../dto/response.dto';

@Injectable()
export class RippleRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
  /**
   * TODO ====================== CREATE RIPPLE ======================
   * @param createRippleDto
   * @returns
   */
  async createRipple(
    userId: string,
    echoId: string,
    content: string,
    parentId?: string | null,
  ): Promise<{ ripple: RippleResponseDto; notificationNeeded: boolean }> {
    return this.executeTransaction(async (prisma: PrismaClient) => {
      //* 1.Verify echo exists
      const echo = await prisma.echo.findUnique({
        where: { id: echoId },
        select: { id: true, authorId: true, deleted: true },
      });

      if (!echo || echo.deleted) {
        throw new NotFoundException('Echo not found');
      }

      //* 2.Verify parent exists if provided
      if (parentId) {
        const parent = await prisma.ripple.findUnique({
          where: { id: parentId },
          include: { echo: true },
        });

        if (!parent) {
          throw new NotFoundException('Parent ripple not found');
        }

        //* 3.Ensure parent belongs to the same echo
        if (parent.echoId !== echoId) {
          throw new ForbiddenException(
            'Parent ripple does not belong to this echo',
          );
        }
      }

      //* 4.Create the ripple
      const ripple = await prisma.ripple.create({
        data: {
          content: content,
          userId: userId,
          echoId: echoId,
          parentId: parentId,
        },
        include: {
          user: {
            select: {
              username: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
      });

      //* 5.Determine notification logic
      const notificationNeeded = await this.determineNotificationNeeded(
        ripple,
        echo,
      );
      return { ripple, notificationNeeded };
    });
  }
  /**
   *  TODO ====================== GET ALL RIPPLES OF A GIVEN ECHO ======================
   * @param echoId
   * @param page
   * @param limit
   * @param includeReplies
   * @returns
   */
  async getRipplesByEchoId(
    echoId: string,
    page: number = 1,
    limit: number = 20,
    includeReplies: boolean = false,
  ): Promise<{ ripples: RippleResponseDto[]; total: number }> {
    //* Get the top paginated layer of a given echo
    const skip = (page - 1) * limit;
    const whereClause: any = {
      echoId,
      parentId: includeReplies ? undefined : null,
      deleted: false,
    };

    const [ripples, total] = await Promise.all([
      this.prisma.ripple.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' as const },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              username: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
      }),
      this.prisma.ripple.count({ where: whereClause }),
    ]);

    return { ripples, total };
  }

  /**
   *  TODO ====================== EDIT A RIPPLE ======================
   * @param rippleId
   * @param userId
   * @param content
   * @returns
   */
  async updateRipple(
    rippleId: string,
    userId: string,
    content: string,
  ): Promise<RippleResponseDto> {
    return this.executeTransaction(async (prisma: PrismaClient) => {
      const ripple = await prisma.ripple.findUnique({
        where: { id: rippleId },
      });

      if (!ripple) {
        throw new NotFoundException('Ripple not found');
      }

      if (ripple.userId !== userId) {
        throw new ForbiddenException('You can only edit your own ripples');
      }

      //* 1.Check edit window (3 minutes)
      const editWindowMs = 3 * 60 * 1000;
      const now = new Date();
      const timeSinceCreation = now.getTime() - ripple.createdAt.getTime();
      const timeSinceUpdate = now.getTime() - ripple.updatedAt.getTime();

      //* 2. If already updated, use the last update time to enforce edit window
      if (timeSinceUpdate < editWindowMs || timeSinceCreation < editWindowMs) {
        throw new ForbiddenException(
          'Ripple can only be edited within 3 minutes of the last update',
        );
      }
      const rippleUpdate = await prisma.ripple.update({
        where: { id: rippleId },
        data: { content },
        include: {
          user: {
            select: {
              username: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
      });
      return rippleUpdate;
    });
  }
  /**
   * TODO =================== GET NESTED REPLIES(RIPPLES) OF A GIVEN RIPPLE ==================
   * @param parentId
   * @returns
   */
  async getReplies(
    parentId: string,
    echoId: string,
  ): Promise<RippleResponseDto[]> {
    const replies = await this.prisma.ripple.findMany({
      where: {
        parentId,
        echoId,
        deleted: false,
      },
      include: {
        user: {
          select: {
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });
    if (!replies) throw new NotFoundException('Reply not found');
    return replies;
  }
  // TODO ====================== SOFT DELETE THE RIPPLE ======================
  async softDeleteRipple(
    rippleId: string,
    userId: string,
    userRole?: string,
  ): Promise<void> {
    await this.executeTransaction(async (prisma: PrismaClient) => {
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
      return { success: true };
    });
  }
  /**
   * TODO ============= PRIVATE METHOD <+> DETERMINE IF NOTIFICATION IS NEEDED ======
   * @param ripple
   * @param echo
   * @returns
   */
  private async determineNotificationNeeded(
    ripple: any,
    echo: any,
  ): Promise<boolean> {
    //* 1.Notify echo author if it's not their ripple
    if (ripple.userId !== echo.authorId) {
      return true;
    }

    //* 2.Notify parent author if it's a reply and not to themselves
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
