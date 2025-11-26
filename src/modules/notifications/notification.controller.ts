import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  //TODO ==================== GET USER NOTIFICATIONS ====================
  @Get()
  async getUserNotifications(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return await this.notificationsService.getUserNotifications(
      userId,
      page,
      limit,
    );
  }

  //TODO ==================== GET UNREAD COUNT ====================
  @Get('unread-count')
  async getUnreadCount(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  //TODO ==================== MARK NOTIFICATION AS READ ====================
  @Patch(':id/read')
  async markAsRead(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) notificationId: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.notificationsService.markAsRead(notificationId, userId);
  }

  //TODO ==================== MARK ALL AS READ ====================
  @Patch('read-all')
  async markAllAsRead(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.notificationsService.markAllAsRead(userId);
  }

  //TODO ==================== DELETE NOTIFICATION ====================
  @Delete(':id')
  async deleteNotification(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) notificationId: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    await this.notificationsService.deleteNotification(notificationId, userId);
    return { message: 'Notification deleted successfully' };
  }

  //TODO ==================== GET NOTIFICATION PREFERENCES ====================
  @Get('preferences')
  async getPreferences(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.notificationsService.getNotificationPreferences(userId);
  }
}
