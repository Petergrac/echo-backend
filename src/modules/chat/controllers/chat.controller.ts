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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiParam,
} from '@nestjs/swagger';
import { ChatService } from '../services/chat.service';
import { MessagesService } from '../services/message.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { UpdateConversationDto } from '../dto/update-dtos/update-conversation.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { AddParticipantsDto } from '../dto/update-dtos/add-participants.dto';
import type { Request } from 'express';
import { FileValidationPipe } from '../pipes/file-validation.pipe';
import { ConversationResponseDto } from '../dto/response-dtos/conversation-response.dto';
import { MessageResponseDto } from '../dto/response-dtos/message-response.dto';
import { ApiPaginatedResponse } from '../../../common/decorators/api-paginated-response.decorator';

@ApiTags('Chat')
@ApiBearerAuth('access_token')
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly messagesService: MessagesService,
  ) {}

  //TODO ==================== CONVERSATION ENDPOINTS ====================

  @ApiOperation({
    summary: 'Create a new conversation',
    description:
      'Create a direct or group conversation. For direct messages, if conversation already exists, returns existing conversation.',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input or direct conversation must have exactly 2 participants',
  })
  @ApiResponse({
    status: 404,
    description: 'Creator or participants not found',
  })
  @ApiBody({ type: CreateConversationDto })
  @Post('conversations')
  async createConversation(
    @Req() req: Request,
    @Body() createDto: CreateConversationDto,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.chatService.createConversation(userId, createDto);
  }

  @ApiOperation({
    summary: 'Get user conversations',
    description:
      'Retrieve paginated list of conversations for the authenticated user, ordered by last message timestamp.',
  })
  @ApiPaginatedResponse(ConversationResponseDto)
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 50, max: 100)',
    example: 50,
  })
  @Get('conversations')
  async getUserConversations(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.chatService.getUserConversations(userId, page, limit);
  }

  @ApiOperation({
    summary: 'Get conversation details',
    description:
      'Retrieve details of a specific conversation including participants.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation retrieved successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation not found or access denied',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Get('conversations/:id')
  async getConversation(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) conversationId: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.chatService.getConversation(conversationId, userId);
  }

  @ApiOperation({
    summary: 'Update conversation',
    description:
      'Update conversation name, avatar, or notification settings. User must be a participant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation updated successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'User is not a participant of this conversation',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateConversationDto })
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

  @ApiOperation({
    summary: 'Add participants to conversation',
    description:
      'Add new participants to a group conversation. Only conversation admins can add participants.',
  })
  @ApiResponse({
    status: 200,
    description: 'Participants added successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Only admins can add participants',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation or users not found',
  })
  @ApiResponse({
    status: 400,
    description: 'All users are already participants',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: AddParticipantsDto })
  @Post('conversations/:id/participants')
  async addParticipants(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) conversationId: string,
    @Body() addDto: AddParticipantsDto,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.chatService.addParticipants(conversationId, userId, addDto);
  }

  @ApiOperation({
    summary: 'Leave conversation',
    description:
      'Leave a conversation. User will no longer receive messages and will be marked as inactive participant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Left conversation successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Left conversation successfully' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not a participant of this conversation',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
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

  @ApiOperation({
    summary: 'Send message',
    description:
      'Send a text or media message to a conversation. Supports file upload for media messages.',
  })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Not a participant of this conversation',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation or reply message not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or file too large',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Message content (max 5000 chars)',
          example: 'Hello, how are you?',
        },
        type: {
          type: 'string',
          enum: ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'GIF'],
          description: 'Message type',
          example: 'TEXT',
        },
        replyToId: {
          type: 'string',
          description: 'Message ID to reply to',
          example: '123e4567-e89b-12d3-a456-426614174001',
        },
        media: {
          type: 'string',
          description: 'JSON string of media metadata',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (image, video, audio, document)',
        },
      },
      required: ['content'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @Post('conversations/:id/messages')
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

  @ApiOperation({
    summary: 'Get conversation messages',
    description:
      'Retrieve paginated messages from a conversation. Messages are automatically marked as read for the requesting user.',
  })
  @ApiPaginatedResponse(MessageResponseDto)
  @ApiResponse({
    status: 403,
    description: 'Not a participant of this conversation',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 50, max: 100)',
    example: 50,
  })
  @ApiQuery({
    name: 'before',
    required: false,
    type: String,
    description:
      'ISO date string to get messages before this date (cursor-based pagination)',
    example: '2024-01-01T00:00:00.000Z',
  })
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

  @ApiOperation({
    summary: 'Edit message',
    description:
      'Edit message content. Only the sender can edit messages within 15 minutes of sending.',
  })
  @ApiResponse({
    status: 200,
    description: 'Message edited successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'You can only edit your own messages',
  })
  @ApiResponse({
    status: 404,
    description: 'Message not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Message is too old to edit',
  })
  @ApiParam({
    name: 'id',
    description: 'Message UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'New message content',
          example: 'Updated message content',
        },
      },
      required: ['content'],
    },
  })
  @Patch('messages/:id')
  async editMessage(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) messageId: string,
    @Body('content') content: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.messagesService.editMessage(messageId, userId, content);
  }

  @ApiOperation({
    summary: 'Delete message',
    description:
      'Delete a message. Can delete for everyone (if sender) or just for yourself.',
  })
  @ApiResponse({
    status: 200,
    description: 'Message deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Message deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'You can only delete your own messages',
  })
  @ApiResponse({
    status: 404,
    description: 'Message not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Message UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiQuery({
    name: 'forEveryone',
    required: false,
    type: Boolean,
    description: 'Delete for all participants (default: false)',
    example: false,
  })
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

  @ApiOperation({
    summary: 'Add/remove reaction to message',
    description:
      'Add an emoji reaction to a message. If reaction already exists, it will be removed (toggle behavior).',
  })
  @ApiResponse({
    status: 200,
    description: 'Reaction added/removed successfully',
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            emoji: { type: 'string', example: '👍' },
            messageId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174001',
            },
            userId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174002',
            },
            reactedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        {
          type: 'null',
          description: 'Reaction removed (returns null)',
        },
      ],
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Not a participant of this conversation',
  })
  @ApiResponse({
    status: 404,
    description: 'Message not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Message UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        emoji: {
          type: 'string',
          description: 'Emoji character',
          example: '👍',
        },
      },
      required: ['emoji'],
    },
  })
  @Post('messages/:id/reactions')
  async addReaction(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) messageId: string,
    @Body('emoji') emoji: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.messagesService.addReaction(messageId, userId, emoji);
  }

  @ApiOperation({
    summary: 'Get message reactions',
    description: 'Get all reactions for a specific message, grouped by emoji.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reactions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        reactions: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                avatar: { type: 'string', nullable: true },
              },
            },
          },
          example: {
            '👍': [
              {
                id: '123e4567-e89b-12d3-a456-426614174002',
                username: 'john_doe',
                avatar: 'https://example.com/avatar.jpg',
              },
              {
                id: '123e4567-e89b-12d3-a456-426614174003',
                username: 'jane_doe',
                avatar: 'https://example.com/avatar2.jpg',
              },
            ],
            '❤️': [
              {
                id: '123e4567-e89b-12d3-a456-426614174004',
                username: 'bob_smith',
                avatar: null,
              },
            ],
          },
        },
        totalReactions: { type: 'number', example: 3 },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Not a participant of this conversation',
  })
  @ApiResponse({
    status: 404,
    description: 'Message not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Message UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @Get('messages/:id/reactions')
  async getMessageReactions(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) messageId: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.messagesService.getMessageReactions(messageId, userId);
  }

  @ApiOperation({
    summary: 'Mark messages as read',
    description:
      'Mark specific messages as read for the authenticated user. Updates unread count for the conversation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Messages marked as read',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Messages marked as read' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Not a participant of this conversation',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        messageIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of message IDs to mark as read',
          example: [
            '123e4567-e89b-12d3-a456-426614174001',
            '123e4567-e89b-12d3-a456-426614174002',
          ],
        },
      },
      required: ['messageIds'],
    },
  })
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
