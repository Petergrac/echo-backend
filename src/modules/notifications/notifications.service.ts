import { Injectable } from '@nestjs/common';
import { NotificationRepository } from './repository/notification.repository';

@Injectable()
export class NotificationService {
  constructor(private repo: NotificationRepository) {}

  async createFollowNotification(targetUserId: string, fromUserId: string) {
    //TODO====> Prevent duplicate notifications if multiple toggles happen fast
    return await this.repo.createFollowNotification(targetUserId, fromUserId);
  }

  async getMyNotifications(userId: string) {
    return await this.repo.getUserNotifications(userId);
  }

  async markAsRead(userId: string) {
    return await this.repo.markAllAsRead(userId);
  }
}
