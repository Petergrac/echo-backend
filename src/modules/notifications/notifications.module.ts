import { Module } from '@nestjs/common';
import { NotificationController } from './notifications.controller';
import { NotificationService } from './notifications.service';
import { NotificationRepository } from './repository/notification.repository';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepository],
  exports: [NotificationService],
})
export class NotificationsModule {}
