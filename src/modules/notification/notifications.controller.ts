import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { NotificationService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private service: NotificationService) {}

  /**
   * TODO ====================== GET USER NOTIFICATIONS ======================
   * @param req
   * @param page
   * @param limit
   * @returns //? Paginated notifications with online status
   */
  @Get()
  async getNotifications(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return await this.service.getMyNotifications(userId);
  }

  /**
   * TODO ====================== MARK NOTIFICATION AS READ ======================
   * @param notificationId
   * @param req
   * @returns //? Mark specific notification as read with real-time confirmation
   */
  @Patch(':notificationId/read')
  async markAsRead(
    @Req() req: Request,
    @Param('notificationId') notificationId: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.service.markANotificationAsRead(userId, notificationId);
  }

  /**
   * TODO ====================== MARK ALL AS READ ======================
   * @param req
   * @returns //? Mark all notifications as read with real-time confirmation
   */
  @Get('read-all')
  async markAllAsRead(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    await this.service.markAsRead(userId);
    return { success: true };
  }

  /**
   * TODO ====================== GET UNREAD COUNT ======================
   * @param req
   * @returns //? Get count of unread notifications
   */
  @Get('unread-count')
  async getUnreadCount(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return await this.service.getUnreadCount(userId);
  }

  /**
   * TODO ====================== GET CONNECTION STATS ======================
   * @param req
   * @returns //? Admin endpoint for connection monitoring
   */
  @Get('connection-stats')
  async getConnectionStats(@Req() req: Request) {
    //* In production, add admin role check
    return this.service.getConnectionStats();
  }
}
