/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import {
  Notification,
  NotificationType,
} from '../entities/notification.entity';
import { User } from '../../auth/entities/user.entity';
import { Post } from '../../posts/entities/post.entity';
import { Reply } from '../../posts/entities/reply.entity';
import { plainToInstance } from 'class-transformer';
import { NotificationResponseDto } from '../dto/response-notification.dto';
import { NotificationsGateway } from '../gateway/notifications.gateway';
import { NotificationPreferenceService } from './notification-preference.service';

export interface CreateNotificationData {
  type: NotificationType;
  recipientId: string;
  actorId: string;
  postId?: string;
  replyId?: string;
  metadata?: {
    content: string;
  };
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    //* Repositories
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(Reply) private readonly replyRepo: Repository<Reply>,

    //* Services
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationGateway: NotificationsGateway,
    private readonly preferenceService: NotificationPreferenceService,
  ) {}

  //TODO ==================== CREATE NOTIFICATION ====================
  async createNotification(data: CreateNotificationData) {
    try {
      //* 1. Validate recipient exists
      const recipient = await this.userRepo.findOneBy({ id: data.recipientId });
      if (!recipient) {
        this.logger.warn(`Recipient not found: ${data.recipientId}`);
        throw new NotFoundException('Recipient not found');
      }

      //* 2. Validate actor exists
      const actor = await this.userRepo.findOneBy({ id: data.actorId });
      if (!actor) {
        this.logger.warn(`Actor not found: ${data.actorId}`);
        throw new NotFoundException('Actor not found');
      }

      //* 3. Validate post exists if postId provided
      if (data.postId) {
        const post = await this.postRepo.findOneBy({ id: data.postId });
        if (!post) {
          this.logger.warn(`Post not found: ${data.postId}`);
          throw new NotFoundException('Post not found');
        }
      }

      //* 4. Validate reply exists if replyId provided
      if (data.replyId) {
        const reply = await this.replyRepo.findOneBy({ id: data.replyId });
        if (!reply) {
          this.logger.warn(`Reply not found: ${data.replyId}`);
          throw new NotFoundException('Reply not found');
        }
      }

      //* 5. Prevent self-notifications (except for system notifications)
      if (
        data.recipientId === data.actorId &&
        data.type !== NotificationType.SYSTEM
      ) {
        this.logger.log(`Skipping self-notification for user: ${data.actorId}`);
        return null;
      }

      //* 6.Check notification preference before creating
      const permission = await this.preferenceService.isNotificationAllowed(
        data.recipientId,
        data.type,
        data.actorId,
        data.metadata?.content,
      );
      if (!permission.allowed) {
        this.logger.log(
          `Notification blocked by preferences: ${permission.reason},type: ${data.type}, recipient: ${data.recipientId}`,
        );
        return undefined;
      }
      //* 6. Check for duplicate notifications (within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const existingNotification = await this.notificationRepo.findOne({
        where: {
          type: data.type,
          recipient: { id: data.recipientId },
          actor: { id: data.actorId },
          post: data.postId ? { id: data.postId } : IsNull(),
          reply: data.replyId ? { id: data.replyId } : IsNull(),
          createdAt: MoreThan(fiveMinutesAgo),
        },
      });

      if (existingNotification) {
        this.logger.log(
          `Duplicate notification skipped for user: ${data.recipientId}`,
        );
        //? Format notification for client
        return plainToInstance(NotificationResponseDto, existingNotification, {
          excludeExtraneousValues: true,
          exposeUnsetFields: false,
        });
      }

      //* 7. Create and save notification
      const notification = this.notificationRepo.create({
        type: data.type,
        recipient: { id: data.recipientId },
        actor: { id: data.actorId },
        post: data.postId ? { id: data.postId } : undefined,
        reply: data.replyId ? { id: data.replyId } : undefined,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        metadata: data.metadata || {},
      });

      const savedNotification = await this.notificationRepo.save(notification);

      this.logger.log(
        `Created ${data.type} notification for user: ${data.recipientId}`,
      );
      //* 8.SEND REAL-TIME NOTIFICATION VIA WEBSOCKET
      if (savedNotification) {
        this.notificationGateway
          .sendNotificationToUser(
            data.recipientId,
            plainToInstance(NotificationResponseDto, savedNotification, {
              excludeExtraneousValues: true,
              exposeUnsetFields: false,
            }),
          )
          .catch((error) => {
            this.logger.error('Failed to send websocket notification', error);
          });
      }
      return savedNotification;
    } catch (error) {
      this.logger.error(
        `Error creating notification: ${error.message}`,
        error.stack,
      );

      // Don't throw error for duplicate or self-notifications
      if (error instanceof NotFoundException) {
        throw error;
      }

      return null; // Silent fail for other errors to not break main operations
    }
  }

  //TODO ==================== GET USER NOTIFICATIONS ====================
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    notifications: NotificationResponseDto[];
    pagination: PaginationInfo;
  }> {
    try {
      //* 1. Validate user exists
      const user = await this.userRepo.findOneBy({ id: userId });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      //* 2. Calculate pagination
      const skip = (page - 1) * limit;

      //* 3. Get notifications with relations
      const [notifications, total] = await this.notificationRepo.findAndCount({
        where: { recipient: { id: userId } },
        relations: ['actor', 'post', 'reply', 'reply.author'],
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

      //* 4. Calculate pagination info
      const totalPages = Math.ceil(total / limit);
      const pagination: PaginationInfo = {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };

      return {
        notifications: plainToInstance(NotificationResponseDto, notifications, {
          excludeExtraneousValues: true,
        }),
        pagination,
      };
    } catch (error) {
      this.logger.error(`Error getting user notifications: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== MARK AS READ ====================
  async markAsRead(notificationId: string, userId: string) {
    const queryRunner =
      this.notificationRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* 1. Find notification and verify ownership
      const notification = await this.notificationRepo.findOne({
        where: { id: notificationId },
        relations: ['recipient'],
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      if (notification.recipient.id !== userId) {
        throw new ForbiddenException(
          'You can only mark your own notifications as read',
        );
      }

      //* 2. Update read status
      await queryRunner.manager.update(
        Notification,
        { id: notificationId },
        { read: true },
      );

      await queryRunner.commitTransaction();

      //* 3. Return updated notification
      const updatedNotification = await this.notificationRepo.findOne({
        where: { id: notificationId },
        relations: ['actor', 'post', 'reply'],
      });

      this.logger.log(`Marked notification as read: ${notificationId}`);
      if (updatedNotification) {
        return plainToInstance(NotificationResponseDto, updatedNotification, {
          excludeExtraneousValues: true,
        });
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error marking notification as read: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== MARK ALL AS READ ====================
  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const queryRunner =
      this.notificationRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* 1. Validate user exists
      const user = await this.userRepo.findOneBy({ id: userId });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      //* 2. Update all unread notifications for user
      const updateResult = await queryRunner.manager.update(
        Notification,
        {
          recipient: { id: userId },
          read: false,
        },
        { read: true },
      );

      await queryRunner.commitTransaction();

      const updatedCount = updateResult.affected || 0;
      this.logger.log(
        `Marked ${updatedCount} notifications as read for user: ${userId}`,
      );

      return { updatedCount };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error marking all notifications as read: ${error.message}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== GET UNREAD COUNT ====================
  async getUnreadCount(userId: string): Promise<number> {
    try {
      //* 1. Validate user exists
      const user = await this.userRepo.findOneBy({ id: userId });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      //* 2. Count unread notifications
      const count = await this.notificationRepo.count({
        where: {
          recipient: { id: userId },
          read: false,
        },
      });

      return count;
    } catch (error) {
      this.logger.error(`Error getting unread count: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== DELETE NOTIFICATION ====================
  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const queryRunner =
      this.notificationRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* 1. Find notification and verify ownership
      const notification = await this.notificationRepo.findOne({
        where: { id: notificationId },
        relations: ['recipient'],
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      if (notification.recipient.id !== userId) {
        throw new ForbiddenException(
          'You can only delete your own notifications',
        );
      }

      //* 2. Soft delete the notification
      await queryRunner.manager.softDelete(Notification, {
        id: notificationId,
      });
      await queryRunner.commitTransaction();

      this.logger.log(`Deleted notification: ${notificationId}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error deleting notification: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== BATCH NOTIFICATION CREATION ====================
  async createBatchNotifications(
    notificationsData: CreateNotificationData[],
  ): Promise<number> {
    const queryRunner =
      this.notificationRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let createdCount = 0;
      const userNotifications: Map<string, any[]> = new Map();
      for (const data of notificationsData) {
        try {
          const notification = await this.createNotification(data);
          if (notification) {
            createdCount++;

            //* Group notifications by user for batch websocket sending
            if (!userNotifications.has(data.recipientId)) {
              userNotifications.set(data.recipientId, []);
            }
            //* Format it and add it to the batch
            userNotifications.get(data.recipientId)?.push(
              plainToInstance(NotificationResponseDto, notification, {
                excludeExtraneousValues: true,
                exposeUnsetFields: false,
              }),
            );
          }
        } catch (error) {
          //? Continue with next notification if one fails
          this.logger.warn(
            `Failed to create batch notification: ${error.message}`,
          );
        }
      }

      await queryRunner.commitTransaction();
      return createdCount;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error creating batch notifications: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== CLEANUP OLD NOTIFICATIONS (CRON JOB) ====================
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const queryRunner =
      this.notificationRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deleteResult = await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from(Notification)
        .where('createdAt < :cutoffDate', { cutoffDate })
        .andWhere('read = :read', { read: true })
        .execute();

      await queryRunner.commitTransaction();

      const deletedCount = deleteResult.affected || 0;
      this.logger.log(`Cleaned up ${deletedCount} old notifications`);

      return deletedCount;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error cleaning up old notifications: ${error.message}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
