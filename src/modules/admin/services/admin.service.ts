import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, IsNull } from 'typeorm';
import { User, UserRole } from '../../auth/entities/user.entity';
import { Post } from '../../posts/entities/post.entity';
import { Follow } from '../../users/follow/entities/follow.entity';
import { Like } from '../../posts/entities/post-like.entity';
import { Reply } from '../../posts/entities/reply.entity';
import { Repost } from '../../posts/entities/repost.entity';
import { Conversation } from '../../chat/entities/conversation.entity';
import { Message } from '../../chat/entities/message.entity';
import { AuditLogService } from '../../../common/services/audit.service';
import { AdminFilters, SystemMetrics } from '../types/admin-types';
import { AuditAction, AuditResource } from '../../../common/enums/audit.enums';
import { CloudinaryService } from '../../../common/cloudinary/cloudinary.service';
import { AuditLog } from '../../auth/entities/audit-log.entity';
import { plainToInstance } from 'class-transformer';
import { PostResponseDto } from '../../posts/dto/post-response.dto';
import { UserResponseDto } from '../../auth/dto/user-response.dto';
import { ReplyResponseDto } from '../../posts/dto/reply-response.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
    @InjectRepository(Like)
    private readonly likeRepo: Repository<Like>,
    @InjectRepository(Reply)
    private readonly replyRepo: Repository<Reply>,
    @InjectRepository(Repost)
    private readonly repostRepo: Repository<Repost>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,

    //* Services
    private readonly auditService: AuditLogService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  //TODO ==================== SYSTEM METRICS ====================
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      //* 1.Users metrics
      const [totalUsers, bannedUsers, adminUsers, moderatorUsers] =
        await Promise.all([
          this.userRepo.count({ where: { deletedAt: undefined } }),
          this.userRepo.count({ where: { isBanned: true } }),
          this.userRepo.count({ where: { role: UserRole.ADMIN } }),
          this.userRepo.count({ where: { isModerator: true } }),
        ]);
      //* 1.1 new users today
      const newUsersToday = await this.userRepo.count({
        where: {
          createdAt: MoreThan(today),
          deletedAt: undefined,
        },
      });
      //* 1.2 new users this week
      const newUsersThisWeek = await this.userRepo.count({
        where: {
          createdAt: MoreThan(weekAgo),
          deletedAt: undefined,
        },
      });

      //* 2.Content metrics
      const [totalPosts, postsToday, postsThisWeek] = await Promise.all([
        this.postRepo.count({ where: { deletedAt: undefined } }),
        this.postRepo.count({
          where: { createdAt: MoreThan(today), deletedAt: undefined },
        }),
        this.postRepo.count({
          where: { createdAt: MoreThan(weekAgo), deletedAt: undefined },
        }),
      ]);
      //* 2.1 Post with media
      const postsWithMedia = await this.postRepo.count({
        where: {
          mediaCount: MoreThan(0),
          deletedAt: undefined,
        },
      });
      //* 2.2 Soft deleted posts
      const deletedPosts = await this.postRepo.count({
        where: { deletedAt: undefined },
        withDeleted: true,
      });
      //* 2.3 Totals replies
      const [totalReplies, repliesToday] = await Promise.all([
        this.replyRepo.count({ where: { deletedAt: undefined } }),
        this.replyRepo.count({
          where: { createdAt: MoreThan(today), deletedAt: undefined },
        }),
      ]);
      //* 2.4  Totals reposts
      const [totalReposts, repostsToday] = await Promise.all([
        this.repostRepo.count({ where: { deletedAt: undefined } }),
        this.repostRepo.count({
          where: { createdAt: MoreThan(today), deletedAt: undefined },
        }),
      ]);
      //* 2.5 total likes
      const [totalLikes, likesToday] = await Promise.all([
        this.likeRepo.count({ where: { deletedAt: undefined } }),
        this.likeRepo.count({
          where: { createdAt: MoreThan(today), deletedAt: undefined },
        }),
      ]);

      //* 3.Engagement metrics
      const mostEngagedPost = await this.postRepo.findOne({
        where: { deletedAt: undefined },
        order: { likeCount: 'DESC' },
        relations: ['author'],
      });

      const averageLikesPerPost = totalPosts > 0 ? totalLikes / totalPosts : 0;
      const averageRepliesPerPost =
        totalPosts > 0 ? totalReplies / totalPosts : 0;
      const averageRepostsPerPost =
        totalPosts > 0 ? totalReposts / totalPosts : 0;

      //* 4.Chat metrics
      const [totalConversations, totalMessages] = await Promise.all([
        this.conversationRepo.count({ where: { deletedAt: undefined } }),
        this.messageRepo.count({ where: { deletedAt: undefined } }),
      ]);

      //* 5.System metrics
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      return {
        users: {
          total: totalUsers,
          activeToday: newUsersToday,
          activeThisWeek: newUsersThisWeek,
          newToday: newUsersToday,
          newThisWeek: newUsersThisWeek,
          banned: bannedUsers,
          admins: adminUsers,
          moderators: moderatorUsers,
        },
        content: {
          posts: {
            total: totalPosts,
            today: postsToday,
            thisWeek: postsThisWeek,
            withMedia: postsWithMedia,
            deleted: deletedPosts - totalPosts,
          },
          replies: {
            total: totalReplies,
            today: repliesToday,
          },
          reposts: {
            total: totalReposts,
            today: repostsToday,
          },
          likes: {
            total: totalLikes,
            today: likesToday,
          },
        },
        engagement: {
          averageLikesPerPost,
          averageRepliesPerPost,
          averageRepostsPerPost,
          mostEngagedPost: plainToInstance(PostResponseDto, mostEngagedPost, {
            excludeExtraneousValues: true,
          }),
        },
        chat: {
          conversations: totalConversations,
          messages: totalMessages,
          activeChatsToday: 0,
        },
        system: {
          uptime,
          memoryUsage,
          databaseSize: 'N/A',
        },
      };
    } catch (error) {
      this.logger.error(`Error getting system metrics: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== GET ALL USERS ====================
  async getAllUsers(filters: AdminFilters = {}) {
    try {
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 50, 100);
      const skip = (page - 1) * limit;

      //* 1.Build query
      let queryBuilder = this.userRepo
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.posts', 'posts')
        .where('user.deletedAt IS NULL');

      //* 2.Apply SEARCH filters
      if (filters.search) {
        queryBuilder = queryBuilder.andWhere(
          `(user.username ILIKE :search 
          OR user."firstName" ILIKE :search 
          OR user."lastName" ILIKE :search 
          OR user.email ILIKE :search)`,
          { search: `%${filters.search}%` },
        );
      }
      //* 3.Apply MODERATOR/ROLE filters
      if (filters.role) {
        switch (filters.role) {
          case 'admin':
            queryBuilder = queryBuilder.andWhere('user.role = :role', {
              role: UserRole.ADMIN,
            });
            break;
          case 'moderator':
            queryBuilder = queryBuilder.andWhere(
              'user.isModerator = :isModerator',
              { isModerator: true },
            );
            break;
          case 'banned':
            queryBuilder = queryBuilder.andWhere('user.isBanned = :isBanned', {
              isBanned: true,
            });
            break;
        }
      }
      //* 4.Apply the period of joining
      if (filters.dateFrom && filters.dateTo) {
        queryBuilder = queryBuilder.andWhere(
          'user.createdAt BETWEEN :dateFrom AND :dateTo',
          {
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
          },
        );
      }

      //* 5.Apply sorting
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'DESC';
      queryBuilder = queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

      //* 6.Get paginated results
      const [users, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
        filters,
      };
    } catch (error) {
      this.logger.error(`Error getting all users: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== GET USER DETAILS ====================
  async getUserDetails(userId: string) {
    //* 1. Load ONLY the user + notification prefs
    const user = await this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.notificationPreferences', 'prefs')
      .where('u.id = :id', { id: userId })
      .withDeleted()
      .getOne();

    if (!user) throw new NotFoundException('User not found');

    //* 2. Load counts WITHOUT relations
    const [followersCount, followingCount, postsCount, likesCount] =
      await Promise.all([
        this.followRepo.count({
          where: { following: { id: userId }, deletedAt: IsNull() },
        }),
        this.followRepo.count({
          where: { follower: { id: userId }, deletedAt: IsNull() },
        }),
        this.postRepo.count({
          where: { author: { id: userId }, deletedAt: IsNull() },
        }),
        this.likeRepo.count({
          where: { user: { id: userId }, deletedAt: IsNull() },
        }),
      ]);

    //* 3. Load recent posts
    const recentPosts = await this.postRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.media', 'media')
      .where('p.authorId = :id', { id: userId })
      .andWhere('p.deletedAt IS NULL')
      .orderBy('p.createdAt', 'DESC')
      .limit(10)
      .getMany();

    //* 4. Load recent followers
    const recentFollowers = await this.followRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.follower', 'fuser')
      .where('f.followingId = :id', { id: userId })
      .andWhere('f.deletedAt IS NULL')
      .orderBy('f.createdAt', 'DESC')
      .limit(10)
      .getMany();

    //* 5. Load recent following
    const recentFollowing = await this.followRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.following', 'fuser')
      .where('f.followerId = :id', { id: userId })
      .andWhere('f.deletedAt IS NULL')
      .orderBy('f.createdAt', 'DESC')
      .limit(10)
      .getMany();

    return {
      ...plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      }),
      stats: {
        followersCount,
        followingCount,
        postsCount,
        likesCount,
      },
      recent: {
        posts: recentPosts,
        followers: recentFollowers.map((f) => f.follower),
        following: recentFollowing.map((f) => f.following),
      },
    };
  }

  //TODO ==================== BAN/UN-BAN USER ====================
  async banUser(userId: string, adminId: string, reason?: string) {
    const queryRunner = this.userRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.role === UserRole.ADMIN) {
        throw new BadRequestException('Cannot ban an admin user');
      }

      await queryRunner.manager.update(
        User,
        { id: userId },
        {
          isBanned: true,
          bannedAt: new Date(),
          banReason: reason,
        },
      );
      await queryRunner.commitTransaction();

      //* Log the action
      await this.auditService.createLog({
        action: AuditAction.USER_BANNED,
        resource: AuditResource.USER,
        userId: adminId,
        metadata: {
          targetUserId: userId,
          reason,
        },
      });

      this.logger.log(`User ${userId} banned by admin ${adminId}`);
      return { success: true, message: 'User banned successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error banning user: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
  //TODO ========================== UN-BAN USER ===========================
  async unbanUser(userId: string, adminId: string) {
    const queryRunner = this.userRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      await queryRunner.manager.update(
        User,
        { id: userId },
        {
          isBanned: false,
          bannedAt: undefined,
          banReason: undefined,
        },
      );

      await queryRunner.commitTransaction();

      //* Log the action
      await this.auditService.createLog({
        action: AuditAction.USER_UNBANNED,
        resource: AuditResource.USER,
        userId: adminId,
        metadata: {
          targetUserId: userId,
        },
      });

      this.logger.log(`User ${userId} unbanned by admin ${adminId}`);
      return { success: true, message: 'User unbanned successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error unbanning user: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== UPDATE USER ROLE ====================
  async updateUserRole(
    userId: string,
    role: 'admin' | 'moderator' | 'user',
    adminId: string,
  ) {
    const queryRunner = this.userRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const updates: Partial<User> = {};
      if (role === 'admin') {
        updates.role = UserRole.ADMIN;
        updates.isModerator = false;
      } else if (role === 'moderator') {
        updates.role = UserRole.USER;
        updates.isModerator = true;
      } else {
        updates.role = UserRole.USER;
        updates.isModerator = false;
      }

      await queryRunner.manager.update(User, { id: userId }, updates);
      await queryRunner.commitTransaction();

      //* Log the action
      await this.auditService.createLog({
        action: AuditAction.USER_ROLE_UPDATED,
        resource: AuditResource.USER,
        userId: adminId,
        metadata: {
          targetUserId: userId,
          newRole: role,
        },
      });

      this.logger.log(
        `User ${userId} role updated to ${role} by admin ${adminId}`,
      );
      return { success: true, message: 'User role updated successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error updating user role: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== GET ALL POSTS ====================
  async getAllPosts(filters: AdminFilters = {}) {
    try {
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 50, 100);
      const skip = (page - 1) * limit;

      let queryBuilder = this.postRepo
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.media', 'media')
        .where('post.deletedAt IS NULL');

      if (filters.search) {
        queryBuilder = queryBuilder.andWhere('post.content ILIKE :search', {
          search: `%${filters.search}%`,
        });
      }

      if (filters.dateFrom && filters.dateTo) {
        queryBuilder = queryBuilder.andWhere(
          'post.createdAt BETWEEN :dateFrom AND :dateTo',
          {
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
          },
        );
      }

      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'DESC';
      queryBuilder = queryBuilder.orderBy(`post.${sortBy}`, sortOrder);

      const [posts, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return {
        posts: plainToInstance(PostResponseDto, posts, {
          excludeExtraneousValues: true,
        }),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
        filters,
      };
    } catch (error) {
      this.logger.error(`Error getting all posts: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== GET POST DETAILS ====================
  async getPostDetails(postId: string) {
    try {
      //* 1. Load ONLY the post + author + media
      const post = await this.postRepo
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.author', 'author')
        .leftJoinAndSelect('p.media', 'media')
        .leftJoinAndSelect('p.postHashtags', 'postHashtags')
        .leftJoinAndSelect('postHashtags.hashtag', 'hashtag')
        .leftJoinAndSelect('p.mentions', 'mentions')
        .leftJoinAndSelect('mentions.mentionedUser', 'mentionedUser')
        .where('p.id = :id', { id: postId })
        .withDeleted()
        .getOne();

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      //* 2. Load counts without relations
      const [likeCount, replyCount, repostCount] = await Promise.all([
        this.likeRepo.count({
          where: { post: { id: postId }, deletedAt: IsNull() },
        }),
        this.replyRepo.count({
          where: { post: { id: postId }, deletedAt: IsNull() },
        }),
        this.repostRepo.count({
          where: { originalPost: { id: postId }, deletedAt: IsNull() },
        }),
      ]);

      //* 3. Load recent engagement
      const [recentLikes, recentReplies, recentReposts] = await Promise.all([
        this.likeRepo
          .createQueryBuilder('l')
          .leftJoinAndSelect('l.user', 'u')
          .where('l.postId = :id', { id: postId })
          .andWhere('l.deletedAt IS NULL')
          .orderBy('l.createdAt', 'DESC')
          .limit(10)
          .getMany(),

        this.replyRepo
          .createQueryBuilder('r')
          .leftJoinAndSelect('r.author', 'u')
          .leftJoinAndSelect('r.media', 'media')
          .where('r.postId = :id', { id: postId })
          .andWhere('r.deletedAt IS NULL')
          .orderBy('r.createdAt', 'DESC')
          .limit(10)
          .getMany(),

        this.repostRepo
          .createQueryBuilder('rp')
          .leftJoinAndSelect('rp.user', 'u')
          .where('rp.originalPostId = :id', { id: postId })
          .andWhere('rp.deletedAt IS NULL')
          .orderBy('rp.createdAt', 'DESC')
          .limit(10)
          .getMany(),
      ]);

      return {
        post: plainToInstance(PostResponseDto, post, {
          excludeExtraneousValues: true,
        }),
        engagement: {
          likeCount,
          replyCount,
          repostCount,
          recent: {
            likes: plainToInstance(
              UserResponseDto,
              recentLikes.map((l) => l.user),
              {
                excludeExtraneousValues: true,
              },
            ),
            replies: plainToInstance(ReplyResponseDto, recentReplies, {
              excludeExtraneousValues: true,
            }),
            reposts: plainToInstance(
              UserResponseDto,
              recentReposts.map((l) => l.user),
              {
                excludeExtraneousValues: true,
              },
            ),
          },
        },
      };
    } catch (error) {
      this.logger.error(`Error getting post details: ${error.message}`);
      throw error;
    }
  }
  //TODO ==================== DELETE POST (ADMIN) ====================
  async deletePostAsAdmin(postId: string, adminId: string, reason?: string) {
    const queryRunner = this.postRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const post = await this.postRepo.findOne({
        where: { id: postId },
        relations: ['author', 'media'],
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      //* Hard delete the post (admin override)
      await queryRunner.manager.delete(Post, { id: postId });

      //* Also delete associated media from Cloudinary
      if (post.media && post.media.length > 0) {
        await Promise.all(
          post.media.map((m) =>
            this.cloudinary.deleteFile(m.publicId, m.resourceType),
          ),
        );
        this.logger.log(
          `Post ${postId} had ${post.media.length} media items to delete`,
        );
      }

      await queryRunner.commitTransaction();

      //* Log the action
      await this.auditService.createLog({
        action: AuditAction.POST_DELETED_BY_ADMIN,
        resource: AuditResource.POST,
        userId: adminId,
        metadata: {
          postId,
          authorId: post.author.id,
          reason,
          mediaCount: post.media?.length || 0,
        },
      });

      this.logger.log(`Post ${postId} deleted by admin ${adminId}`);
      return { success: true, message: 'Post deleted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error deleting post as admin: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== RESTORE DELETED POST ====================
  async restorePost(postId: string, adminId: string) {
    const queryRunner = this.postRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const post = await this.postRepo.findOne({
        where: { id: postId },
        withDeleted: true,
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      if (!post.deletedAt) {
        throw new BadRequestException('Post is not deleted');
      }

      await queryRunner.manager.restore(Post, { id: postId });
      await queryRunner.commitTransaction();

      //* Log the action
      await this.auditService.createLog({
        action: AuditAction.POST_RESTORED_BY_ADMIN,
        resource: AuditResource.POST,
        userId: adminId,
        metadata: { postId },
      });

      this.logger.log(`Post ${postId} restored by admin ${adminId}`);
      return { success: true, message: 'Post restored successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error restoring post: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== GET AUDIT LOGS ====================
  async getAuditLogs(filters: AdminFilters = {}) {
    try {
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 50, 100);
      const skip = (page - 1) * limit;

      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'DESC';

      const qb = this.auditLogRepo
        .createQueryBuilder('logs')
        .orderBy(`logs.${sortBy}`, sortOrder)
        .take(limit)
        .skip(skip);

      //* --- SEARCH ---
      if (filters.search) {
        qb.andWhere(
          `(logs.userId ILIKE :search 
          OR logs.action::text ILIKE :search
          OR logs.resource::text ILIKE :search
          OR logs.riskEvent::text ILIKE :search)`,
          { search: `%${filters.search}%` },
        );
      }

      //* --- DATE RANGE ---
      if (filters.dateFrom && filters.dateTo) {
        qb.andWhere('logs.createdAt BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        });
      } else if (filters.dateFrom) {
        qb.andWhere('logs.createdAt >= :dateFrom', {
          dateFrom: filters.dateFrom,
        });
      } else if (filters.dateTo) {
        qb.andWhere('logs.createdAt <= :dateTo', { dateTo: filters.dateTo });
      }

      const [logs, total] = await qb.getManyAndCount();

      return {
        page,
        limit,
        total,
        logs,
      };
    } catch (error) {
      this.logger.error(`Error getting audit logs: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== GET DAILY STATS ====================
  async getDailyStats(days: number = 7) {
    try {
      const stats: {
        date: Date | string;
        newUsers: number | string;
        newPosts: number | string;
        newLikes: number | string;
      }[] = [];
      const today = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const [newUsers, newPosts, newLikes] = await Promise.all([
          this.userRepo.count({
            where: {
              createdAt: Between(date, nextDay),
              deletedAt: undefined,
            },
          }),
          this.postRepo.count({
            where: {
              createdAt: Between(date, nextDay),
              deletedAt: undefined,
            },
          }),
          this.likeRepo.count({
            where: {
              createdAt: Between(date, nextDay),
              deletedAt: undefined,
            },
          }),
        ]);

        stats.push({
          date: date.toISOString().split('T')[0],
          newUsers,
          newPosts,
          newLikes,
        });
      }

      return stats;
    } catch (error) {
      this.logger.error(`Error getting daily stats: ${error.message}`);
      throw error;
    }
  }
}
