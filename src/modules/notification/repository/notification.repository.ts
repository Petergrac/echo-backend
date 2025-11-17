import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { NotificationData } from '../notifications.service';

@Injectable()
export class NotificationRepository {
  constructor(private prisma: PrismaService) {}
  //TODO =========== CREATE FOLLOW NOTIFICATION =======
  async createANotification(data: NotificationData) {
    try {
      await this.prisma.notification.create({
        data: {
          userId: data.targetUserId,
          fromId: data.fromUserId,
          type: data.type,
          echoId: data.echoId,
          rippleId: data.rippleId,
        },
      });
      //? 1. Emit a WebSocket event for real-time notifications
      //? 2. Send push notifications for mobile apps
      //? 3. Update notification counts in cache
    } catch (error) {
      //? Log error but don't fail the main operation
      console.error('Failed to create notification:', error);
    }
  }
  // TODO ========== GET ALL SPECIFIC USER NOTIFICATIONS ===========

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        include: {
          from: {
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
              media: { take: 1 },
            },
          },
          ripple: {
            select: {
              id: true,
              content: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      notifications,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
  // TODO =============== GET UNREAD NOTIFICATIONS COUNT ============
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }
  // TODO =============== MARK USERS ALL NOTIFICATIONS NOTIFICATION AS READ ============
  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
  // TODO =============== MARK A SPECIFIC NOTIFICATION AS READ ============
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }
}
