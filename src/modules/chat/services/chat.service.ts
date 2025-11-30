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
  Conversation,
  ConversationType,
} from '../entities/conversation.entity';
import { ConversationParticipant } from '../entities/conversation-participant.entity';
import { User } from '../../auth/entities/user.entity';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { UpdateConversationDto } from '../dto/update-conversation.dto';
import { AddParticipantsDto } from '../dto/add-participants.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private readonly participantRepo: Repository<ConversationParticipant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  //TODO ==================== CREATE CONVERSATION ====================
  async createConversation(
    creatorId: string,
    createDto: CreateConversationDto,
  ) {
    const queryRunner =
      this.conversationRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* 1. Validate creator exists
      const creator = await this.userRepo.findOneBy({ id: creatorId });
      if (!creator) {
        throw new NotFoundException('Creator user not found');
      }

      //* 2. Validate all participants exist
      const allParticipantIds = [
        ...new Set([creatorId, ...createDto.participantIds]),
      ];
      const participants = await this.userRepo.find({
        where: { id: In(allParticipantIds) },
      });

      if (participants.length !== allParticipantIds.length) {
        throw new NotFoundException('One or more participants not found');
      }

      //* 3. For direct messages, check if conversation already exists
      if (createDto.type === ConversationType.DIRECT) {
        if (allParticipantIds.length !== 2) {
          throw new BadRequestException(
            'Direct conversations must have exactly 2 participants',
          );
        }

        const existingConversation = await this.findDirectConversation(
          allParticipantIds[0],
          allParticipantIds[1],
        );

        if (existingConversation) {
          return existingConversation;
        }
      }

      //* 4. Create conversation
      const conversation = this.conversationRepo.create({
        type: createDto.type,
        name: createDto.name,
        avatar: createDto.avatar,
        createdBy: creator,
        createdById: creatorId,
        lastMessageAt: new Date(),
      });

      const savedConversation = await queryRunner.manager.save(
        Conversation,
        conversation,
      );

      //* 5. Create conversation participants
      const participantEntities = allParticipantIds.map((userId) =>
        this.participantRepo.create({
          conversation: savedConversation,
          conversationId: savedConversation.id,
          user: { id: userId },
          userId: userId,
          joinedAt: new Date(),
          isAdmin: userId === creatorId, //? Creator is admin
        }),
      );

      await queryRunner.manager.save(
        ConversationParticipant,
        participantEntities,
      );

      await queryRunner.commitTransaction();

      this.logger.log(
        `Created ${createDto.type} conversation: ${savedConversation.id}`,
      );
      return this.getConversationWithRelations(savedConversation.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error creating conversation: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== GET USER CONVERSATIONS ====================
  async getUserConversations(
    userId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    try {
      const [conversations, total] = await this.conversationRepo
        .createQueryBuilder('conversation')
        .innerJoin(
          'conversation.participants',
          'participant',
          'participant.userId = :userId',
          { userId },
        )
        .leftJoinAndSelect('conversation.participants', 'allParticipants')
        .leftJoinAndSelect('allParticipants.user', 'user')
        .leftJoinAndSelect('conversation.lastMessage', 'lastMessage')
        .where('participant.isActive = :isActive', { isActive: true })
        .andWhere('conversation.lastMessageAt IS NOT NULL')
        .orderBy('conversation.lastMessageAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return {
        conversations,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting user conversations: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== GET CONVERSATION BY ID ====================
  async getConversation(
    conversationId: string,
    userId: string,
  ): Promise<Conversation> {
    try {
      const conversation = await this.conversationRepo
        .createQueryBuilder('conversation')
        .leftJoinAndSelect('conversation.participants', 'participant')
        .leftJoinAndSelect('participant.user', 'user')
        .leftJoinAndSelect('conversation.createdBy', 'createdBy')
        .where('conversation.id = :conversationId', { conversationId })
        .andWhere('participant.userId = :userId', { userId })
        .andWhere('participant.isActive = :isActive', { isActive: true })
        .getOne();

      if (!conversation) {
        throw new NotFoundException('Conversation not found or access denied');
      }

      return conversation;
    } catch (error) {
      this.logger.error(`Error getting conversation: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== UPDATE CONVERSATION ====================
  async updateConversation(
    conversationId: string,
    userId: string,
    updateDto: UpdateConversationDto,
  ): Promise<Conversation | null> {
    const queryRunner =
      this.conversationRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* 1. Verify user is participant and has permission
      const participant = await this.participantRepo.findOne({
        where: {
          conversation: { id: conversationId },
          user: { id: userId },
          isActive: true,
        },
        relations: ['conversation'],
      });

      if (!participant) {
        throw new ForbiddenException('Not a participant of this conversation');
      }

      //* 2. Update conversation
      await queryRunner.manager.update(
        Conversation,
        { id: conversationId },
        updateDto,
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Updated conversation: ${conversationId}`);
      return this.getConversationWithRelations(conversationId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error updating conversation: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== ADD PARTICIPANTS ====================
  async addParticipants(
    conversationId: string,
    userId: string,
    addDto: AddParticipantsDto,
  ): Promise<Conversation | null> {
    const queryRunner =
      this.conversationRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* 1. Verify user is admin of conversation
      const adminParticipant = await this.participantRepo.findOne({
        where: {
          conversation: { id: conversationId },
          user: { id: userId },
          isActive: true,
          isAdmin: true,
        },
        relations: ['conversation'],
      });

      if (!adminParticipant) {
        throw new ForbiddenException('Only admins can add participants');
      }

      //* 2. Validate new participants exist
      const newParticipants = await this.userRepo.find({
        where: { id: In(addDto.participantIds) },
      });

      if (newParticipants.length !== addDto.participantIds.length) {
        throw new NotFoundException('One or more users not found');
      }

      //* 3. Check if participants are already in conversation
      const existingParticipants = await this.participantRepo.find({
        where: {
          conversation: { id: conversationId },
          user: { id: In(addDto.participantIds) },
        },
      });

      const existingUserIds = existingParticipants.map((p) => p.userId);
      const newUserIds = addDto.participantIds.filter(
        (id) => !existingUserIds.includes(id),
      );

      if (newUserIds.length === 0) {
        throw new BadRequestException('All users are already participants');
      }

      //* 4. Add new participants
      const participantEntities = newUserIds.map((userId) =>
        this.participantRepo.create({
          conversation: { id: conversationId },
          conversationId: conversationId,
          user: { id: userId },
          userId: userId,
          joinedAt: new Date(),
          isAdmin: false,
        }),
      );

      await queryRunner.manager.save(
        ConversationParticipant,
        participantEntities,
      );

      await queryRunner.commitTransaction();

      this.logger.log(
        `Added ${newUserIds.length} participants to conversation: ${conversationId}`,
      );
      return this.getConversationWithRelations(conversationId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error adding participants: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== LEAVE CONVERSATION ====================
  async leaveConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const queryRunner =
      this.conversationRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const participant = await this.participantRepo.findOne({
        where: {
          conversation: { id: conversationId },
          user: { id: userId },
          isActive: true,
        },
      });

      if (!participant) {
        throw new NotFoundException('Not a participant of this conversation');
      }

      //* Update participant as inactive
      await queryRunner.manager.update(
        ConversationParticipant,
        { id: participant.id },
        {
          isActive: false,
          leftAt: new Date(),
          notificationsEnabled: false,
        },
      );

      await queryRunner.commitTransaction();

      this.logger.log(`User ${userId} left conversation: ${conversationId}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error leaving conversation: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //? ==================== PRIVATE METHODS ====================

  //* Find existing direct conversation between two users
  private async findDirectConversation(
    userId1: string,
    userId2: string,
  ): Promise<Conversation | undefined> {
    const conversation = await this.conversationRepo
      .createQueryBuilder('conversation')
      .innerJoin('conversation.participants', 'p1', 'p1.userId = :userId1', {
        userId1,
      })
      .innerJoin('conversation.participants', 'p2', 'p2.userId = :userId2', {
        userId2,
      })
      .where('conversation.type = :type', { type: ConversationType.DIRECT })
      .andWhere('p1.isActive = :isActive', { isActive: true })
      .andWhere('p2.isActive = :isActive', { isActive: true })
      .getOne();

    return conversation || undefined;
  }

  //* Get conversation with all relations
  private async getConversationWithRelations(conversationId: string) {
    return this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['participants', 'participants.user', 'createdBy'],
    });
  }
}
