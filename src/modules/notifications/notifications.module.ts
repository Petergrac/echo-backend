import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../auth/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { Reply } from '../posts/entities/reply.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, Post, Reply])],
  providers: [NotificationsGateway, NotificationsService],
})
export class NotificationsModule {}
