import { Module } from '@nestjs/common';
import { NotificationsService } from './services/notifications.service';
import { NotificationsGateway } from './gateway/notifications.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../auth/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { Reply } from '../posts/entities/reply.entity';
import { NotificationsController } from './controllers/notification.controller';
import { DeleteOldNotifications } from '../../common/tasks/cleanup.task';
import { JwtService } from '@nestjs/jwt';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { NotificationPreferencesController } from './controllers/notification-preference.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      User,
      NotificationPreferences,
      Post,
      Reply,
    ]),
  ],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    NotificationsGateway,
    JwtService,
    NotificationsService,
    NotificationPreferenceService,
    DeleteOldNotifications,
  ],
  exports: [NotificationsService, NotificationPreferenceService],
})
export class NotificationsModule {}
