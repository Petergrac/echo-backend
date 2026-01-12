import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChatService } from '../services/chat.service';
import { MessagesService } from '../services/message.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { UpdateConversationDto } from '../dto/update-dtos/update-conversation.dto';
import { AddParticipantsDto } from '../dto/update-dtos/add-participants.dto';
import type { Request } from 'express';
@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly messagesService: MessagesService,
  ) {}

  //TODO ==================== CONVERSATION ENDPOINTS ====================

  @Post('conversations')
  async createConversation(
    @Req() req: Request,
    @Body() createDto: CreateConversationDto,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.chatService.createConversation(userId, createDto);
  }

  @Get('conversations')
  async getUserConversations(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.chatService.getUserConversations(userId, page, limit);
  }

  @Get('conversations/:id')
  async getConversation(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) conversationId: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.chatService.getConversation(conversationId, userId);
  }

  @Patch('conversations/:id')
  async updateConversation(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) conversationId: string,
    @Body() updateDto: UpdateConversationDto,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.chatService.updateConversation(
      conversationId,
      userId,
      updateDto,
    );
  }

  @Post('conversations/:id/participants')
  async addParticipants(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) conversationId: string,
    @Body() addDto: AddParticipantsDto,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.chatService.addParticipants(conversationId, userId, addDto);
  }

  @HttpCode(HttpStatus.OK)
  @Delete('conversations/:id/leave')
  async leaveConversation(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) conversationId: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    await this.chatService.leaveConversation(conversationId, userId);
    return { message: 'Left conversation successfully' };
  }

  //TODO ==================== MESSAGE ENDPOINTS ====================

  @Get('conversations/:id/messages')
  async getMessages(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) conversationId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('before') before?: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const beforeDate = before ? new Date(before) : undefined;
    return this.messagesService.getConversationMessages(
      conversationId,
      userId,
      page,
      limit,
      beforeDate,
    );
  }

  @Patch('messages/:id')
  async editMessage(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) messageId: string,
    @Body('content') content: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.messagesService.editMessage(messageId, userId, content);
  }

  @HttpCode(HttpStatus.OK)
  @Delete('messages/:id')
  async deleteMessage(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) messageId: string,
    @Query('forEveryone') forEveryone: boolean = false,
  ) {
    const userId = (req.user as { userId: string }).userId;
    await this.messagesService.deleteMessage(messageId, userId, forEveryone);
    return { message: 'Message deleted successfully' };
  }

  @Post('messages/:id/reactions')
  async addReaction(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) messageId: string,
    @Body('emoji') emoji: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.messagesService.addReaction(messageId, userId, emoji);
  }
  @Get('messages/:id/reactions')
  async getMessageReactions(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) messageId: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.messagesService.getMessageReactions(messageId, userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('conversations/:id/read')
  async markAsRead(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) conversationId: string,
    @Body('messageIds') messageIds: string[],
  ) {
    const userId = (req.user as { userId: string }).userId;
    await this.messagesService.markMessagesAsRead(
      conversationId,
      userId,
      messageIds,
    );
    return { message: 'Messages marked as read' };
  }
}
