import { Module } from '@nestjs/common';
import { NotificationController } from './notifications.controller';
import { NotificationService } from './notifications.service';
import { NotificationRepository } from './repository/notification.repository';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    NotificationsGateway,
    WsJwtGuard,
    JwtService,
    EventEmitter2,
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
