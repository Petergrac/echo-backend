import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../auth/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { Reply } from '../posts/entities/reply.entity';
import { NotificationsController } from './notification.controller';
import { DeleteOldNotifications } from '../../common/tasks/cleanup.task';
import { JwtService } from '@nestjs/jwt';
import { WsGuard } from './guards/ws-jwt.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, Post, Reply])],
  controllers: [NotificationsController],
  providers: [
    NotificationsGateway,
    JwtService,
    NotificationsService,
    DeleteOldNotifications,
    WsGuard,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
