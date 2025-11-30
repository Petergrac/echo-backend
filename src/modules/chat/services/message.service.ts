/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Message,
  MessageType,
  MessageStatus,
} from '../entities/message.entity';
import { MessageReadReceipt } from '../entities/message-read-receipt.entity';
import { MessageReaction } from '../entities/message-reaction.entity';
import { Conversation } from '../entities/conversation.entity';
import { ConversationParticipant } from '../entities/conversation-participant.entity';
import { SendMessageDto } from '../dto/send-message.dto';
import { CloudinaryService } from '../../../common/cloudinary/cloudinary.service';
import { UploadApiResponse } from 'cloudinary';

export interface PaginatedMessages {
  messages: Message[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(MessageReadReceipt)
    private readonly readReceiptRepo: Repository<MessageReadReceipt>,
    @InjectRepository(MessageReaction)
    private readonly reactionRepo: Repository<MessageReaction>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private readonly participantRepo: Repository<ConversationParticipant>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  //TODO ==================== SEND MESSAGE ====================
  async sendMessage(
    conversationId: string,
    senderId: string,
    sendDto: SendMessageDto,
    file?: Express.Multer.File,
  ): Promise<Message | null> {
    const queryRunner = this.messageRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* 1. Verify conversation exists and user is participant
      const conversation = await this.conversationRepo.findOne({
        where: { id: conversationId },
        relations: ['participants', 'participants.user'],
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      const isParticipant = conversation.participants.some(
        (p) => p.userId === senderId && p.isActive,
      );

      if (!isParticipant) {
        throw new ForbiddenException('Not a participant of this conversation');
      }

      //* 2. Validate reply message if provided
      if (sendDto.replyToId) {
        const replyToMessage = await this.messageRepo.findOne({
          where: {
            id: sendDto.replyToId,
            conversation: { id: conversationId },
          },
        });

        if (!replyToMessage) {
          throw new BadRequestException(
            'Reply message not found in this conversation',
          );
        }
      }

      //* 3. Handle file upload if provided
      let mediaInfo = sendDto.media;
      if (file) {
        const uploadResult: UploadApiResponse =
          await this.cloudinaryService.uploadFile(file);
        mediaInfo = {
          url: uploadResult.secure_url || uploadResult.url,
          publicId: uploadResult.public_id,
          type: uploadResult.resource_type,
          width: uploadResult.width,
          height: uploadResult.height,
          fileSize: uploadResult.bytes,
        };
      }

      //* 4. Create and save message
      const message = this.messageRepo.create({
        content: sendDto.content,
        type: sendDto.type || MessageType.TEXT,
        conversation: { id: conversationId },
        conversationId: conversationId,
        sender: { id: senderId },
        senderId: senderId,
        replyTo: sendDto.replyToId ? { id: sendDto.replyToId } : undefined,
        replyToId: sendDto.replyToId,
        media: mediaInfo,
        status: MessageStatus.SENT,
      });

      const savedMessage = await queryRunner.manager.save(Message, message);

      //* 5. Update conversation counters and timestamps
      await queryRunner.manager.increment(
        Conversation,
        { id: conversationId },
        'messageCount',
        1,
      );

      await queryRunner.manager.update(
        Conversation,
        { id: conversationId },
        {
          lastMessageAt: new Date(),
          lastMessageId: savedMessage.id,
        },
      );

      //* 6. Increment unread counts for all participants except sender
      await queryRunner.manager
        .createQueryBuilder()
        .update(ConversationParticipant)
        .set({
          unreadCount: () => 'unreadCount + 1',
        })
        .where('conversationId = :conversationId', { conversationId })
        .andWhere('userId != :senderId', { senderId })
        .andWhere('isActive = :isActive', { isActive: true })
        .execute();

      await queryRunner.commitTransaction();

      this.logger.log(
        `Message sent in conversation ${conversationId} by user ${senderId}`,
      );
      return this.getMessageWithRelations(savedMessage.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error sending message: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== GET CONVERSATION MESSAGES ====================
  async getConversationMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
    before?: Date,
  ): Promise<PaginatedMessages> {
    try {
      //* 1. Verify user is participant
      const participant = await this.participantRepo.findOne({
        where: {
          conversation: { id: conversationId },
          user: { id: userId },
          isActive: true,
        },
      });

      if (!participant) {
        throw new ForbiddenException('Not a participant of this conversation');
      }

      //* 2. Build query with pagination
      const queryBuilder = this.messageRepo
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.sender', 'sender')
        .leftJoinAndSelect('message.replyTo', 'replyTo')
        .leftJoinAndSelect('replyTo.sender', 'replyToSender')
        .leftJoinAndSelect('message.reactions', 'reactions')
        .leftJoinAndSelect('reactions.user', 'reactionUser')
        .leftJoinAndSelect('message.readReceipts', 'readReceipts')
        .leftJoinAndSelect('readReceipts.user', 'readReceiptUser')
        .where('message.conversationId = :conversationId', { conversationId })
        .andWhere(
          '(message.deletedForUserId IS NULL OR message.deletedForUserId != :userId)',
          { userId },
        )
        .orderBy('message.createdAt', 'DESC');

      //* 3. Apply cursor-based pagination if before date provided
      if (before) {
        queryBuilder.andWhere('message.createdAt < :before', { before });
      }

      const [messages, total] = await queryBuilder
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      //* 4. Mark messages as read for this user
      await this.markMessagesAsRead(
        conversationId,
        userId,
        messages.map((m) => m.id),
      );

      return {
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting conversation messages: ${error.message}`,
      );
      throw error;
    }
  }

  //TODO ==================== MARK MESSAGES AS READ ====================
  async markMessagesAsRead(
    conversationId: string,
    userId: string,
    messageIds: string[],
  ): Promise<void> {
    const queryRunner = this.messageRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (messageIds.length === 0) return;

      //* 1. Create read receipts for unread messages
      const existingReceipts = await this.readReceiptRepo.find({
        where: {
          messageId: In(messageIds),
          userId: userId,
        },
      });

      const existingMessageIds = existingReceipts.map((r) => r.messageId);
      const newMessageIds = messageIds.filter(
        (id) => !existingMessageIds.includes(id),
      );

      if (newMessageIds.length > 0) {
        const readReceipts = newMessageIds.map((messageId) =>
          this.readReceiptRepo.create({
            message: { id: messageId },
            messageId: messageId,
            user: { id: userId },
            userId: userId,
            readAt: new Date(),
          }),
        );

        await queryRunner.manager.save(MessageReadReceipt, readReceipts);
      }

      //* 2. Update participant unread count
      const unreadCount = await this.messageRepo
        .createQueryBuilder('message')
        .leftJoin(
          'message.readReceipts',
          'readReceipts',
          'readReceipts.userId = :userId',
          { userId },
        )
        .where('message.conversationId = :conversationId', { conversationId })
        .andWhere('readReceipts.id IS NULL') // Messages without read receipts
        .andWhere('message.senderId != :userId', { userId }) // Don't count own messages
        .andWhere(
          '(message.deletedForUserId IS NULL OR message.deletedForUserId != :userId)',
          { userId },
        )
        .getCount();

      await queryRunner.manager.update(
        ConversationParticipant,
        {
          conversation: { id: conversationId },
          user: { id: userId },
        },
        {
          unreadCount: unreadCount,
          lastReadAt: new Date(),
        },
      );

      await queryRunner.commitTransaction();

      this.logger.log(
        `Marked ${newMessageIds.length} messages as read for user ${userId}`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error marking messages as read: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== DELETE MESSAGE ====================
  async deleteMessage(
    messageId: string,
    userId: string,
    forEveryone: boolean = false,
  ): Promise<void> {
    const queryRunner = this.messageRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* 1. Find message and verify ownership
      const message = await this.messageRepo.findOne({
        where: { id: messageId },
        relations: ['sender', 'conversation'],
      });

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      if (message.senderId !== userId) {
        throw new ForbiddenException('You can only delete your own messages');
      }

      if (forEveryone) {
        //* Delete for everyone (soft delete the message)
        await queryRunner.manager.softDelete(Message, { id: messageId });

        //* Decrement conversation message count
        await queryRunner.manager.decrement(
          Conversation,
          { id: message.conversationId },
          'messageCount',
          1,
        );
      } else {
        //* Delete for me only (update deletedForUser fields)
        await queryRunner.manager.update(
          Message,
          { id: messageId },
          {
            deletedForUserId: userId,
            deletedForUserAt: new Date(),
          },
        );
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Message ${messageId} deleted by user ${userId} (forEveryone: ${forEveryone})`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error deleting message: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== ADD REACTION ====================
  async addReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<MessageReaction | null> {
    const queryRunner = this.messageRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* 1. Verify message exists and user can access it
      const message = await this.messageRepo.findOne({
        where: { id: messageId },
        relations: ['conversation', 'conversation.participants'],
      });

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      const isParticipant = message.conversation.participants.some(
        (p) => p.userId === userId && p.isActive,
      );

      if (!isParticipant) {
        throw new ForbiddenException('Not a participant of this conversation');
      }

      //* 2. Check for existing reaction
      const existingReaction = await this.reactionRepo.findOne({
        where: {
          message: { id: messageId },
          user: { id: userId },
          emoji: emoji,
        },
      });

      if (existingReaction) {
        //* Remove reaction if it exists (toggle behavior)
        await queryRunner.manager.remove(MessageReaction, existingReaction);
        await queryRunner.commitTransaction();
        return null;
      }

      //* 3. Create new reaction
      const reaction = this.reactionRepo.create({
        message: { id: messageId },
        messageId: messageId,
        user: { id: userId },
        userId: userId,
        emoji: emoji,
        reactedAt: new Date(),
      });

      const savedReaction = await queryRunner.manager.save(
        MessageReaction,
        reaction,
      );
      await queryRunner.commitTransaction();

      this.logger.log(
        `Reaction ${emoji} added to message ${messageId} by user ${userId}`,
      );
      return savedReaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error adding reaction: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== EDIT MESSAGE ====================
  async editMessage(
    messageId: string,
    userId: string,
    newContent: string,
  ): Promise<Message | null> {
    const queryRunner = this.messageRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* 1. Find message and verify ownership
      const message = await this.messageRepo.findOne({
        where: { id: messageId },
        relations: ['sender'],
      });

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      if (message.senderId !== userId) {
        throw new ForbiddenException('You can only edit your own messages');
      }

      //* 2. Check if message is too old to edit (e.g., 15 minutes)
      const editTimeLimit = 15 * 60 * 1000;
      const messageAge = Date.now() - message.createdAt.getTime();

      if (messageAge > editTimeLimit) {
        throw new BadRequestException('Message is too old to edit');
      }

      //* 3. Update message content
      await queryRunner.manager.update(
        Message,
        { id: messageId },
        {
          content: newContent,
          metadata: {
            ...message.metadata,
            editedAt: new Date(),
            editHistory: [
              ...(message.metadata?.editHistory || []),
              {
                previousContent: message.content,
                editedAt: new Date(),
              },
            ],
          },
        },
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Message ${messageId} edited by user ${userId}`);
      return this.getMessageWithRelations(messageId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error editing message: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== GET MESSAGE REACTIONS ====================
  async getMessageReactions(messageId: string, userId: string) {
    try {
      //* 1.Verify user can access the message
      const message = await this.messageRepo.findOne({
        where: { id: messageId },
        relations: ['conversation', 'conversation.participants'],
      });

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      const isParticipant = message.conversation.participants.some(
        (p) => p.userId === userId && p.isActive,
      );

      if (!isParticipant) {
        throw new ForbiddenException('Not a participant of this conversation');
      }

      const reactions = await this.reactionRepo.find({
        where: { message: { id: messageId } },
        relations: ['user'],
        order: { reactedAt: 'ASC' },
      });

      //* 2.Group reactions by emoji
      const groupedReactions = reactions.reduce((acc, reaction) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = [];
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        acc[reaction.emoji]!.push(reaction.user);
        return acc;
      }, {});

      return {
        reactions: groupedReactions,
        totalReactions: reactions.length,
      };
    } catch (error) {
      this.logger.error(`Error getting message reactions: ${error.message}`);
      throw error;
    }
  }

  //? ==================== PRIVATE METHODS ====================

  private async getMessageWithRelations(
    messageId: string,
  ): Promise<Message | null> {
    return this.messageRepo.findOne({
      where: { id: messageId },
      relations: [
        'sender',
        'replyTo',
        'replyTo.sender',
        'reactions',
        'reactions.user',
        'readReceipts',
        'readReceipts.user',
      ],
    });
  }
}
