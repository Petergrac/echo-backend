import { Injectable, Logger } from '@nestjs/common';
import { NotificationRepository } from './repository/notification.repository';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type NotificationData = {
  type: 'LIKE' | 'RIPPLE' | 'RIPPLE_REPLY' | 'REECHO' | 'FOLLOW' | 'MENTION';
  fromUserId: string;
  targetUserId: string;
  echoId?: string;
  rippleId?: string;
};

@Injectable()
export class NotificationService {
  constructor(
    private repo: NotificationRepository,
    private readonly notificationGateway: NotificationsGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private readonly logger = new Logger(NotificationService.name);

  // TODO =========== CREATE A NOTIFICATION WITH REAL TIME DELIVERY ===========
  async createNotification(data: NotificationData): Promise<void> {
    try {
      const notification = await this.repo.createANotification(data);
      //* 1. Enrich notification with related data
      const enrichedNotification = await this.enrichNotification(notification);

      //* 2.Emit notification via WebSocket if user is connected
      const delivered = await this.notificationGateway.sendNotificationToUser(
        data.targetUserId,
        enrichedNotification,
      );
      //* 3.Emit event for other services (analytics, push notifications, etc.)
      this.eventEmitter.emit('notification.created', {
        notification: enrichedNotification,
        deliveredRealtime: delivered,
      });

      this.logger.log(
        `Notification created for user ${data.targetUserId} - ` +
          `Real-time: ${delivered ? 'DELIVERED' : 'QUEUED'}`,
      );
    } catch (error) {
      this.logger.error('Failed to create notification:', error);
    }
  }

  /**
   * TODO ====================== BATCH CREATE NOTIFICATIONS ======================
   * @param notificationsData
   * @returns //? Create multiple notifications efficiently
   */
  async batchCreateNotifications(
    notificationsData: NotificationData[],
  ): Promise<void> {
    if (notificationsData.length === 0) return;

    const batchPromises = notificationsData.map((data) =>
      this.createNotification(data).catch((error) =>
        this.logger.error(`Failed to create batch notification:`, error),
      ),
    );

    await Promise.all(batchPromises);
    this.logger.log(
      `Processed ${notificationsData.length} batch notifications`,
    );
  }

  /**
   * TODO ====================== SEND REAL-TIME FEED UPDATE ======================
   * @param userId
   * @param update
   * @returns //? Send real-time updates for feed changes
   */
  async sendFeedUpdate(userId: string, update: any): Promise<void> {
    try {
      const delivered = await this.notificationGateway.sendFeedUpdateToUser(
        userId,
        update,
      );

      if (delivered) {
        this.logger.log(`Feed update sent to user ${userId}`);
      }
    } catch (error) {
      this.logger.error('Failed to send feed update:', error);
    }
  }

  // TODO ========== GET MY NOTIFICATIONS ===========
  async getMyNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const result = await this.repo.getUserNotifications(userId, page, limit);

    //* 2.Add real-time connection status
    const isUserOnline = this.notificationGateway.isUserConnected(userId);

    //* 3.Return notifications with meta
    return {
      ...result,
      meta: {
        ...result.meta,
        userOnline: isUserOnline,
      },
    };
  }
  // TODO ========== MARK ALL NOTIFICATIONS AS READ ===========
  async markAsRead(userId: string) {
    await this.repo.markAllAsRead(userId);

    //* 1.Send bulk confirmation if user is online
    if (this.notificationGateway.isUserConnected(userId)) {
      this.notificationGateway.sendNotificationToUser(userId, {
        type: 'ALL_NOTIFICATIONS_READ',
        readAt: new Date().toISOString(),
      });
    }
  }
  // TODO ========== MARK A SPECIFIC NOTIFICATION AS READ ===========
  async markANotificationAsRead(userId: string, notificationId: string) {
    await this.repo.markAsRead(userId, notificationId);

    //* 1.Send confirmation to client if online
    if (this.notificationGateway.isUserConnected(userId)) {
      this.notificationGateway.sendNotificationToUser(userId, {
        type: 'NOTIFICATION_READ',
        notificationId,
        readAt: new Date().toISOString(),
      });
    }
  }
  // TODO ========== GET UNREAD NOTIFICATION COUNT ===========
  async getUnreadCount(userId: string): Promise<number> {
    return await this.repo.getUnreadCount(userId);
  }
  /**
   * TODO ====================== GET CONNECTION STATISTICS ======================
   * @returns //? Monitoring and analytics for WebSocket connections
   */
  getConnectionStats() {
    return {
      connectedUsers: this.notificationGateway.getConnectedUsersCount(),
      timestamp: new Date().toISOString(),
    };
  }
  /**
   * TODO ====================== ENRICH NOTIFICATION WITH RELATED DATA ======================
   * @param notification
   * @returns //? Add user, echo, and ripple data for complete notification
   */
  private async enrichNotification(notification: any): Promise<any> {
    try {
      return {
        id: notification.id,
        type: notification.type,
        read: notification.read,
        createdAt: notification.createdAt,
        fromUser: { id: notification.fromId }, // Would fetch username, avatar
        ...(notification.echoId && { echo: { id: notification.echoId } }),
        ...(notification.rippleId && { ripple: { id: notification.rippleId } }),
      };
    } catch (error) {
      this.logger.error('Failed to enrich notification:', error);
      return notification; // Return basic notification if enrichment fails
    }
  }
}
