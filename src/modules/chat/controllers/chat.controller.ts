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
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from '../services/chat.service';
import { MessagesService } from '../services/message.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { UpdateConversationDto } from '../dto/update-conversation.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { AddParticipantsDto } from '../dto/add-participants.dto';
import type { Request } from 'express';
import { FileValidationPipe } from '../pipes/file-validation.pipe';

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

  @Post('conversations/:id/messages')
  @UseInterceptors(FileInterceptor('file'))
  async sendMessage(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) conversationId: string,
    @Body() sendDto: SendMessageDto,
    @UploadedFile(FileValidationPipe) file?: Express.Multer.File,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.messagesService.sendMessage(
      conversationId,
      userId,
      sendDto,
      file,
    );
  }

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
