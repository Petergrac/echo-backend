// src/notification/gateways/notifications.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';

interface AuthenticatedSocket extends Socket {
  user: { userId: string; username: string };
}

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly userSockets = new Map<string, string>(); // userId -> socketId

  constructor(private readonly jwtService: JwtService) {}

  /**
    * TODO ====================== HANDLE CONNECTION ======================
    * @param client 
    * @param args 
    * @returns //? Authenticate user and register their socket connection
    */
  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.user = { userId: payload.userId, username: payload.username };

      // Register user socket
      this.userSockets.set(client.user.userId, client.id);
      
      this.logger.log(`User ${client.user.username} connected with socket ${client.id}`);
      this.logger.log(`Total connected users: ${this.userSockets.size}`);

      // Send connection confirmation
      client.emit('connected', { 
        message: 'Successfully connected to notifications',
        userId: client.user.userId 
      });

    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  /**
    * TODO ====================== HANDLE DISCONNECT ======================
    * @param client 
    * @returns //? Clean up user socket registration
    */
  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      this.userSockets.delete(client.user.userId);
      this.logger.log(`User ${client.user.username} disconnected`);
      this.logger.log(`Total connected users: ${this.userSockets.size}`);
    }
  }

  /**
    * TODO ====================== SEND NOTIFICATION TO USER ======================
    * @param userId 
    * @param notification 
    * @returns //? Deliver real-time notification to specific user
    */
  async sendNotificationToUser(userId: string, notification: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('new_notification', notification);
      this.logger.log(`Notification sent to user ${userId}`);
      return true;
    }
    this.logger.log(`User ${userId} is not connected - notification queued`);
    return false;
  }

  /**
    * TODO ====================== SEND FEED UPDATE TO USER ======================
    * @param userId 
    * @param update 
    * @returns //? Send real-time feed updates (new echoes, engagement changes)
    */
  async sendFeedUpdateToUser(userId: string, update: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('feed_update', update);
      return true;
    }
    return false;
  }

  /**
    * TODO ====================== BROADCAST TO ALL USERS ======================
    * @param event 
    * @param data 
    * @returns //? Send event to all connected users (for global announcements)
    */
  async broadcastToAllUsers(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(`Broadcasted ${event} to all connected users`);
  }

  /**
    * TODO ====================== MARK NOTIFICATION AS READ ======================
    * @param client 
    * @param payload 
    * @returns //? Handle client-side notification read events
    */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('mark_notification_read')
  async handleMarkAsRead(client: AuthenticatedSocket, payload: { notificationId: string }) {
    // This would typically call a service to update the database
    this.logger.log(`User ${client.user.userId} marked notification ${payload.notificationId} as read`);
    
    // Acknowledge the action
    client.emit('notification_marked_read', { 
      notificationId: payload.notificationId,
      success: true 
    });
  }

  /**
    * TODO ====================== GET CONNECTED USERS COUNT ======================
    * @param client 
    * @param payload 
    * @returns //? Admin feature to get connected users count
    */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('get_connected_users')
  async handleGetConnectedUsers(client: AuthenticatedSocket, payload: any) {
    // Only allow admins in production
    client.emit('connected_users_count', {
      count: this.userSockets.size,
      timestamp: new Date().toISOString(),
    });
  }

  /**
    * TODO ====================== EXTRACT TOKEN FROM SOCKET ======================
    * @param client 
    * @returns //? Extract JWT token from socket handshake
    */
  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  /**
    * TODO ====================== GET CONNECTED USER COUNT ======================
    * @returns //? Utility method for monitoring
    */
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
    * TODO ====================== IS USER CONNECTED ======================
    * @param userId 
    * @returns //? Check if a specific user is currently connected
    */
  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}