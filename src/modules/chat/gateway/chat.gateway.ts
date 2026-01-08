/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from '../services/chat.service';
import { MessagesService } from '../services/message.service';
import { SendMessageDto } from '../dto/send-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../auth/entities/user.entity';
import { Repository } from 'typeorm';
import { JoinConversationDto } from '../dto/join-conversation.dto';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  user: { userId: string; username: string };
}

@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();
  private readonly socketUsers = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly messagesService: MessagesService,
    private readonly configService: ConfigService,

    //*Repositories
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  //TODO ==================== HANDLE CONNECTION ====================
  async handleConnection(socket: AuthenticatedSocket) {
    try {
      //* 1.Authenticate socket connection using JWT
      const token = this.extractTokenFromHeader(socket);
      if (!token) throw new WsException('Unauthorized');
      const payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('JWT_SECRET'),
      });
      //* 2.Fetch the user from the database
      const user = await this.userRepo.findOne({
        where: {
          id: payload.sub,
        },
      });
      if (!user) {
        socket.disconnect();
        return;
      }
      socket.user = { userId: payload.sub, username: user.username };

      //* 3.Store socket connection
      this.addUserSocket(socket.user.userId, socket.id);

      //* 4.Join user to their personal room for direct notifications
      socket.join(`user:${socket.user.userId}`);

      this.logger.log(
        `User ${socket.user.username} connected with socket ${socket.id} 👏👏`,
      );

      //* 5.Notify user of successful connection
      socket.emit('connected', {
        message: 'Connected to chat',
        userId: socket.user.userId,
      });
    } catch (error) {
      this.logger.error(`WebSocket connection failed: ${error.message}`);
      console.log(error);
      socket.disconnect();
    }
  }

  //TODO ==================== HANDLE DISCONNECTION ====================
  handleDisconnect(socket: AuthenticatedSocket) {
    if (socket.user) {
      this.removeUserSocket(socket.user.userId, socket.id);
      this.logger.log(`User ${socket.user.userId} disconnected`);
    }
  }

  //TODO ==================== JOIN CONVERSATION ====================
  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: JoinConversationDto,
  ) {
    try {
      //* 1.Verify user is participant of conversation
      await this.chatService.getConversation(
        data.conversationId,
        socket.user.userId,
      );

      //* 2.Join conversation room
      socket.join(`conversation:${data.conversationId}`);

      this.logger.log(
        `User ${socket.user.userId} joined conversation ${data.conversationId}`,
      );
      //* 3.Inform user after successfully joining the conversation
      socket.emit('joined_conversation', {
        conversationId: data.conversationId,
      });
    } catch (error) {
      this.logger.error(`Error joining conversation: ${error.message}`);
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  }

  //TODO ==================== LEAVE CONVERSATION ====================
  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    socket.leave(`conversation:${data.conversationId}`);
    this.logger.log(
      `User ${socket.user.userId} left conversation ${data.conversationId}`,
    );
  }

  //TODO ==================== SEND MESSAGE ====================
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; message: SendMessageDto },
  ) {
    try {
      //* 1.Save message to database
      const message = await this.messagesService.sendMessage(
        data.conversationId,
        socket.user.userId,
        data.message,
      );

      //* 2.Get conversation participants
      const conversation = await this.chatService.getConversation(
        data.conversationId,
        socket.user.userId,
      );
      const participantIds = conversation.participants
        .filter((p) => p.isActive && p.userId !== socket.user.userId)
        .map((p) => p.userId);

      //* 3.Emit message to all participants in the conversation
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('new_message', {
          conversationId: data.conversationId,
          message: message,
        });

      //* 4.Notify participants who are not in the conversation room
      for (const participantId of participantIds) {
        const isInRoom = this.isUserInConversationRoom(
          participantId,
          data.conversationId,
        );
        if (!isInRoom) {
          this.server.to(`user:${participantId}`).emit('message_notification', {
            conversationId: data.conversationId,
            message: message,
            unreadCount: 1,
          });
        }
      }

      this.logger.log(
        `Message sent in conversation ${data.conversationId} by user ${socket.user.userId}`,
      );
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  //TODO ==================== TYPING INDICATOR ====================
  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      userId: socket.user.userId,
      username: socket.user.username,
      typing: true,
    });
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      userId: socket.user.userId,
      username: socket.user.username,
      typing: false,
    });
  }

  //TODO ==================== MESSAGE REACTION ====================
  @SubscribeMessage('add_reaction')
  async handleAddReaction(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    try {
      const reaction = await this.messagesService.addReaction(
        data.messageId,
        socket.user.userId,
        data.emoji,
      );

      //* 1.Get message to find conversation ID
      const message = await this.messagesService.getMessageWithRelations(
        data.messageId,
      );

      if (reaction && message) {
        //* 1.1 Reaction added
        this.server
          .to(`conversation:${message.conversationId}`)
          .emit('reaction_added', {
            messageId: data.messageId,
            reaction: reaction,
          });
      } else if (message) {
        //* 1.2.Reaction removed
        this.server
          .to(`conversation:${message.conversationId}`)
          .emit('reaction_removed', {
            messageId: data.messageId,
            userId: socket.user.userId,
            emoji: data.emoji,
          });
      }
    } catch (error) {
      this.logger.error(`Error adding reaction: ${error.message}`);
      socket.emit('error', { message: 'Failed to add reaction' });
    }
  }

  //TODO ==================== MESSAGE READ RECEIPT ====================
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageIds: string[] },
  ) {
    try {
      await this.messagesService.markMessagesAsRead(
        data.conversationId,
        socket.user.userId,
        data.messageIds,
      );

      //* 1.Notify other participants that messages were read
      socket.to(`conversation:${data.conversationId}`).emit('messages_read', {
        conversationId: data.conversationId,
        userId: socket.user.userId,
        messageIds: data.messageIds,
      });
    } catch (error) {
      this.logger.error(`Error marking messages as read: ${error.message}`);
      socket.emit('error', { message: 'Failed to mark messages as read' });
    }
  }

  //? ==================== UTILITY METHODS ====================

  private addUserSocket(userId: string, socketId: string) {
    //* 1.Add to user's socket set
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set()); //* 1.1Create a new set if user is unavailable
    }
    this.userSockets.get(userId)!.add(socketId);
    //* 2.Add to socket-user mapping
    this.socketUsers.set(socketId, userId);
  }

  private removeUserSocket(userId: string, socketId: string) {
    //* Delete user sockets or the id
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.socketUsers.delete(socketId);
  }

  private isUserInConversationRoom(
    userId: string,
    conversationId: string,
  ): boolean {
    const userSockets = this.userSockets.get(userId);
    if (!userSockets?.size) return false;

    const conversationRoom = `conversation:${conversationId}`;

    //* 1.Single responsibility: Check if ANY socket is in room
    return Array.from(userSockets).some((socketId) =>
      this.isSocketInRoom(socketId, conversationRoom),
    );
  }

  private isSocketInRoom(socketId: string, room: string): boolean {
    const socket = this.server.sockets.sockets.get(socketId);
    return socket?.rooms.has(room) ?? false;
  }

  //* Get online status of users
  private getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  //* Check if user is online
  private isUserOnline(userId: string): boolean {
    return (
      this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0
    );
  }
  private extractTokenFromHeader(client: Socket): string | undefined {
    //* 1.Try cookies
    const cookies = client.handshake.headers.cookie;
    if (cookies) {
      const tokenCookie = cookies
        .split(';')
        .find((c) => c.trim().startsWith('access_token='));
      if (tokenCookie) return tokenCookie.split('=')[1];
    }
    //* 2. Try socket.io auth payload
    const authToken = client.handshake.auth?.token as string;
    if (authToken) {
      return authToken;
    }

    //* 3. Try Authorization header
    const header = client.handshake.headers?.authorization;
    if (header) {
      return header;
    }
    return undefined;
  }
}
