import { Injectable } from '@nestjs/common';
import { NotificationRepository } from './repository/notification.repository';

export type NotificationData = {
  type: 'LIKE' | 'RIPPLE' | 'RIPPLE_REPLY' | 'REECHO' | 'FOLLOW' | 'MENTION';
  fromUserId: string;
  targetUserId: string;
  echoId?: string;
  rippleId?: string;
};


@Injectable()
export class NotificationService {
  constructor(private repo: NotificationRepository) {}

  // TODO =========== CREATE A NOTIFICATION ===========
  async createNotification(data: NotificationData):Promise<void>{
    return await this.repo.createANotification(data);
  }
  // TODO ========== GET MY NOTIFICATIONS ===========
  async getMyNotifications(userId: string,page: number =1,limit: number = 20) {
    return await this.repo.getUserNotifications(userId);
  } 
  // TODO ========== MARK ALL NOTIFICATIONS AS READ ===========
  async markAsRead(userId: string) {
    return await this.repo.markAllAsRead(userId);
  }
  // TODO ========== MARK A SPECIFIC NOTIFICATION AS READ ===========
  async markANotificationAsRead(userId: string,notificationId:string) {
    return await this.repo.markAsRead(userId,notificationId);
  }
  // TODO ========== GET UNREAD NOTIFICATION COUNT ===========
  async getUnreadCount(userId: string): Promise<number> {
    return await this.repo.getUnreadCount(userId);
  }
}
