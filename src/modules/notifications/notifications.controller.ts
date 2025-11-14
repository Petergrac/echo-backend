import { Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
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

  @Patch('read')
  async markAsRead(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return await this.service.markAsRead(userId);
  }
}
