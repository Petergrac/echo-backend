/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { NotificationsService } from './notifications.service';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';

interface OnlineUser {
  socketId: string;
  username: string;
  userId: string;
  connectedAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
@Injectable()
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);
  private onlineUsers: Map<string, OnlineUser> = new Map();

  constructor(
    //* Repositories
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    //* Services
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
  ) {}
  //TODO ===============... AFTER INIT ====================
  afterInit() {
    this.logger.log('🔌 Notifications WebSocket Gateway initialized');
  }
  //TODO ============ HANDLE CONNECTIONS ---------------=====
  async handleConnection(client: Socket) {
    try {
      //* Auth
      const token = this.extractTokenFromHeader(client);
      if (!token) throw new WsException('Unauthorized');
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      client.data.user = payload;
      const user = client.data.user as { sub: string };
      //* Get Username from the database
      const userFromDatabase = await this.userRepo.findOne({
        where: { id: user.sub },
        select: {
          username: true,
        },
      });
      if (!userFromDatabase) throw new WsException('User not found');
      //* 1.Store user connections
      this.onlineUsers.set(client.id, {
        socketId: client.id,
        username: userFromDatabase.username,
        userId: user.sub,
        connectedAt: new Date(),
      });

      //* 2.Join user to their personal room
      client.join(`user:${user.sub}`);

      //* 3.Send connection confirmation
      client.emit('connected', {
        message: 'Connected to notifications',
        userId: user.sub,
      });

      //* 4.Send initial unread count
      const unreadCount = await this.notificationsService.getUnreadCount(
        user.sub,
      );
      client.emit('unread-count', { count: unreadCount });

      this.logger.log(
        `🔗 User ${userFromDatabase.username} connected to notifications. Online: ${this.onlineUsers.size}`,
      );
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }
  //TODO ================<<<<<<<<<<<<<< HANDLE DISCONNECTIONS >>>>>>>>>>>>===========
  handleDisconnect(client: Socket) {
    try {
      const user = this.onlineUsers.get(client.id);
      if (user) {
        this.onlineUsers.delete(client.id);
        this.logger.log(
          `🔴 User ${user.username} disconnected. Online: ${this.onlineUsers.size}`,
        );
      }
    } catch (error) {
      this.logger.error(`Disconnection error for client ${client.id}`, error);
    }
  }

  //TODO ================ SEND NOTIFICATION TO SINGLE USER =====================
  async sendNotificationToUser(userId: string, notification: any) {
    try {
      //* 1.Send Notification
      this.server.to(`user:${userId}`).emit('new_notification', {
        ...notification,
        timestamp: new Date().toISOString(),
      });
      //* 2.Update the unread count
      const unreadCount =
        await this.notificationsService.getUnreadCount(userId);
      this.server.to(`user:${userId}`).emit('unread_count', {
        count: unreadCount,
      });
      this.logger.log(`📤 Sent notification to user ${userId}`);
    } catch (error) {
      this.logger.error(`Error sending notification to user ${userId}:`, error);
    }
  }

  //TODO ================ SEND NOTIFICATION TO MULTIPLE USERS =====================
  sendNotificationsToUsers(userIds: string[], notification: any) {
    try {
      userIds.forEach((userId) => {
        this.server.to(`user:${userId}`).emit('new_notification', {
          ...notification,
          timestamp: new Date().toISOString(),
        });
      });
      this.logger.log(`📤 Sent notification to ${userIds.length} users`);
    } catch (error) {
      this.logger.error(`Error sending notification to multiple users:`, error);
    }
  }
  //TODO ============== MARK NOTIFICATION AS READ(VIA SOCKET) =============
  @SubscribeMessage('mark_notification_read')
  async handleMarkNotificationRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string },
  ) {
    try {
      //* 1.Get userId from the payload
      const user = client.data.user as { userId: string };
      //* 2.Update the notification
      const updatedNotification = await this.notificationsService.markAsRead(
        data.notificationId,
        user.userId,
      );

      //* 3.Send updated notification back to client
      client.emit('notification_marked_as_read', updatedNotification);

      //* 4.Get & Send the notification unread count
      const unreadCount = await this.notificationsService.getUnreadCount(
        user.userId,
      );
      client.emit('unread_count', { counts: unreadCount });
    } catch (error) {
      this.logger.error(`Error marking notification as read:`, error);
      client.emit('error', { message: 'Failed to mark notification as read' });
    }
  }

  //TODO ========================MARK ALL AS READ ====================
  @SubscribeMessage('mark_all_as_read')
  async markAllNotificationsAsRead(@ConnectedSocket() client: Socket) {
    try {
      //* 1.Mark all notifications of a given user as read
      const user = client.data.user as { userId: string };
      console.log(user.userId);
      const result = await this.notificationsService.markAllAsRead(user.userId);

      //* 2.Send Confirmation
      client.emit('mark_all_as_read', {
        result,
      });
      //* 3.Update Unread count
      client.emit('unread_count', {
        count: 0,
      });
    } catch (error) {
      this.logger.error(`Error marking all notifications as read:`, error);
      client.emit('error', {
        message: 'Failed to mark all notifications as read',
      });
    }
  }
  //TODO ==================== TYPING INDICATORS (FOR CHATS) =====================
  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const user = client.data.user as { userId: string };
      //* 1.Broadcast to other users in the conversation
      client.to(data.conversationId).emit('user_typing', {
        userId: user.userId,
        conversationId: data.conversationId,
      });
    } catch (error) {
      this.logger.error(`Error handling typing start:`, error);
    }
  }
  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const user = client.data.user as { userId: string };
      // Broadcast to other users in conversation
      client.to(data.conversationId).emit('user_stopped_typing', {
        userId: user.userId,
        conversationId: data.conversationId,
      });
    } catch (error) {
      this.logger.error(`Error handling typing stop:`, error);
    }
  }
  //TODO====================== GET ONLINE STATUS ====================
  @SubscribeMessage('get_online_status')
  handleGetOnlineStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userIds: string[] },
  ) {
    try {
      console.log(this.onlineUsers);
      const onlineStatus = data.userIds.map((userId) => ({
        userId,
        isOnline: this.isUserOnline(userId),
      }));
      client.emit('online_status', onlineStatus);
    } catch (error) {
      this.logger.error(`Error getting online status:`, error);
    }
  }
  //TODO ==================== PING/PONG FOR CONNECTION HEALTH ====================
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: Date.now() });
  }

  //? ==================== UTILITY METHODS ====================

  //* Check if user is online
  isUserOnline(userId: string): boolean {
    return Array.from(this.onlineUsers.values()).some(
      (user) => user.userId === userId,
    );
  }

  //* Get all online users
  getOnlineUsers(): OnlineUser[] {
    return Array.from(this.onlineUsers.values());
  }

  //* Get user's socket IDs
  getUserSocketIds(userId: string): string[] {
    return (
      Array.from(this.onlineUsers.entries())
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([_, user]) => user.userId === userId)
        .map(([socketId]) => socketId)
    );
  }
  private extractTokenFromHeader(client: Socket): string | undefined {
    //* 1. Try socket.io auth payload
    const authToken = client.handshake.auth?.token;
    if (authToken) {
      return authToken;
    }

    //* 2. Try Authorization header
    const header = client.handshake.headers?.authorization;
    if (header) {
      return header;
    }

    return undefined;
  }
}
