import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Mention } from '../entities/mention.entity';
import { User } from '../../auth/entities/user.entity';
import { Post } from '../entities/post.entity';
import { Reply } from '../entities/reply.entity';
import { plainToInstance } from 'class-transformer';
import { MentionResponseDto } from '../dto/mention-response.dto';

@Injectable()
export class MentionService {
  private readonly logger = new Logger(MentionService.name);

  constructor(
    @InjectRepository(Mention)
    private readonly mentionRepo: Repository<Mention>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(Reply) private readonly replyRepo: Repository<Reply>,
  ) {}

  //TODO ==================== EXTRACT MENTIONS FROM CONTENT ====================
  extractMentions(content: string): string[] {
    try {
      const mentionRegex = /@(\w+)/g;
      const matches = content.match(mentionRegex);
      if (!matches) return [];

      //* Process mentions: remove @, lowercase, validate
      return matches
        .map((mention) => mention.replace('@', '').toLowerCase().trim())
        .filter((username) => {
          //* Validate: 3-30 chars, only letters/numbers/underscores
          return (
            username.length >= 3 &&
            username.length <= 30 &&
            /^[a-z0-9_]+$/.test(username)
          );
        })
        .filter((username, index, array) => array.indexOf(username) === index); //? Remove duplicates
    } catch (error) {
      this.logger.error(`Error extracting mentions: ${error.message}`);
      return [];
    }
  }

  //TODO ==================== VALIDATE MENTIONED USERS ====================
  async validateMentionedUsers(usernames: string[]): Promise<User[]> {
    try {
      if (usernames.length === 0) return [];

      const users = await this.userRepo.find({
        where: {
          username: In(usernames.map((u) => u.toLowerCase())),
        },
        select: ['id', 'username', 'email'], //? Only necessary fields
      });

      //* 1.Check if all mentioned users exist
      const foundUsernames = users.map((user) => user.username.toLowerCase());
      const missingUsernames = usernames.filter(
        (username) => !foundUsernames.includes(username.toLowerCase()),
      );

      if (missingUsernames.length > 0) {
        this.logger.warn(
          `Some mentioned users not found: ${missingUsernames.join(', ')}`,
        );
        //*>>=> Don't throw error, just log and continue with valid mentions
      }

      return users;
    } catch (error) {
      this.logger.error(`Error validating mentioned users: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== CREATE MENTIONS ====================
  async createMentions(
    mentions: string[],
    postId: string,
    authorId: string,
    replyId?: string,
  ): Promise<void> {
    const queryRunner = this.mentionRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* 1. Validate mentioned users exist
      const mentionedUsers = await this.validateMentionedUsers(mentions);
      if (mentionedUsers.length === 0) {
        await queryRunner.commitTransaction();
        return;
      }

      //* 2. Verify post/reply exists
      if (replyId) {
        const reply = await this.replyRepo.findOneBy({ id: replyId });
        if (!reply) throw new NotFoundException('Reply not found');
      } else {
        const post = await this.postRepo.findOneBy({ id: postId });
        if (!post) throw new NotFoundException('Post not found');
      }

      //* 3. Create mention records
      for (const user of mentionedUsers) {
        //* Skip if user mentions themselves
        if (user.id === authorId) continue;

        const mention = queryRunner.manager.create(Mention, {
          mentionedUser: { id: user.id },
          author: { id: user.id },
          postId: replyId ? null : postId,
          replyId: replyId ?? null,
        });

        await queryRunner.manager.save(mention);
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Created ${mentionedUsers.length} mentions`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error creating mentions: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== GET USER MENTIONS ====================
  async getUserMentions(userId: string, page: number = 1, limit: number = 20) {
    try {
      const [mentions, total] = await this.mentionRepo.findAndCount({
        where: { mentionedUser: { id: userId } },
        relations: ['author', 'post', 'reply', 'reply.author'],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        mentions: plainToInstance(MentionResponseDto, mentions, {
          excludeExtraneousValues: true,
        }),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting user mentions: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== GET UNREAD MENTION COUNT ====================
  async getUnreadMentionCount(userId: string): Promise<number> {
    try {
      //* For now, we'll return all mentions count
      //* Later you can add 'read' boolean field to Mention entity
      const count = await this.mentionRepo.count({
        where: { mentionedUser: { id: userId } },
      });

      return count;
    } catch (error) {
      this.logger.error(`Error getting unread mention count: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== MARK MENTIONS AS READ ====================
  async markMentionsAsRead(mentionIds: string[]): Promise<void> {
    try {
      //* 1.Mark mention as read
      this.logger.log(`Marking ${mentionIds.length} mentions as read`);
      await this.mentionRepo.update({ id: In(mentionIds) }, { read: true });
    } catch (error) {
      this.logger.error(`Error marking mentions as read: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== GET MENTIONS FOR POST ====================
  async getPostMentions(postId: string) {
    try {
      const mentions = await this.mentionRepo.find({
        where: { post: { id: postId } },
        relations: ['mentionedUser', 'author'],
        order: { createdAt: 'ASC' },
      });

      return mentions;
    } catch (error) {
      this.logger.error(`Error getting post mentions: ${error.message}`);
      throw error;
    }
  }
}
