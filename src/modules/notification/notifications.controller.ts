import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { NotificationService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private service: NotificationService) {}

  @Get()
  async getMyNotifications(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return await this.service.getMyNotifications(userId);
  }

  @Patch(':notificationId')
  async markAsRead(@Req() req: Request,@Param('notificationId') notificationId: string){ 
    const userId = (req.user as { userId: string }).userId;
    return await this.service.markANotificationAsRead(userId,notificationId);
  }
  @Get('all-read')
  async markAllAsRead(@Req() req: Request){
    const userId = (req.user as { userId: string }).userId;
    return await this.service.markAsRead(userId);
  }
  @Get('unread-count')
  async getUnreadCount(@Req() req: Request){
    const userId = (req.user as { userId: string }).userId;
    return await this.service.getUnreadCount(userId);
  }
}


