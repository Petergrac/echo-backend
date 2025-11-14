import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';

@Injectable()
export class NotificationRepository {
  constructor(private prisma: PrismaService) {}
    //TODO =========== CREATE FOLLOW NOTIFICATION =======
  async createFollowNotification(userId: string, fromId: string) {
    return await this.prisma.notification.create({
      data: {
        userId,
        fromId,
        type: 'FOLLOW',
      },
    });
  }
// TODO ========== GET ALL SPECIFIC USER NOTIFICATIONS ===========
  async getUserNotifications(userId: string) {
    return await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        from: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });
  }
  // TODO =============== MARK USERS ALL NOTIFICATIONS NOTIFICATION AS READ ============
  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
