import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hashtag } from '../entities/hashtag.entity';
import { PostHashtag } from '../entities/hashtag.entity';
import { Post } from '../entities/post.entity';
import { plainToInstance } from 'class-transformer';
import { TagResponseDto } from '../dto/hashtag-response.dto';
import { PostResponseDto } from '../dto/post-response.dto';
import { PostStatusService } from './post-status.service';

@Injectable()
export class HashtagService {
  private readonly logger = new Logger(HashtagService.name);

  constructor(
    @InjectRepository(Hashtag)
    private readonly hashtagRepo: Repository<Hashtag>,
    @InjectRepository(PostHashtag)
    private readonly postHashtagRepo: Repository<PostHashtag>,
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,

    private readonly postStatusService: PostStatusService,
  ) {}

  //TODO ==================== EXTRACT HASHTAGS FROM CONTENT ====================
  extractHashtags(content: string): string[] {
    try {
      const hashtagRegex = /#(\w+)/g;
      const matches = content.match(hashtagRegex);
      if (!matches) return [];

      //* 1.Process hashtags: remove #, -> lowercase, -> validate
      return matches
        .map((tag) => tag.replace('#', '').toLowerCase().trim())
        .filter((tag) => {
          //* Validate: 2-50 chars, only letters/numbers/underscores
          return (
            tag.length >= 2 && tag.length <= 50 && /^[a-z0-9_]+$/.test(tag)
          );
        })
        .filter((tag, index, array) => array.indexOf(tag) === index); //* Remove duplicates
    } catch (error) {
      this.logger.error(`Error extracting hashtags: ${error.message}`);
      return [];
    }
  }

  //TODO ==================== CREATE & LINK HASHTAGS TO POST ====================
  async createHashtags(hashtags: string[], postId: string): Promise<void> {
    const queryRunner = this.hashtagRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const tag of hashtags) {
        //* 1. Find or create hashtag
        let hashtag = await queryRunner.manager.findOne(Hashtag, {
          where: { tag },
        });

        if (!hashtag) {
          hashtag = queryRunner.manager.create(Hashtag, {
            tag,
            usageCount: 0,
            postCount: 0,
            lastUsedAt: new Date(),
          });
          hashtag = await queryRunner.manager.save(Hashtag, hashtag);
        }

        //* 2. Create post-hashtag relationship
        const postHashtag = queryRunner.manager.create(PostHashtag, {
          post: { id: postId },
          hashtag: { id: hashtag.id },
        });
        await queryRunner.manager.save(PostHashtag, postHashtag);

        //* 3. Update hashtag statistics
        await queryRunner.manager.increment(
          Hashtag,
          { id: hashtag.id },
          'usageCount',
          1,
        );
        await queryRunner.manager.increment(
          Hashtag,
          { id: hashtag.id },
          'postCount',
          1,
        );
        await queryRunner.manager.update(
          Hashtag,
          { id: hashtag.id },
          { lastUsedAt: new Date() },
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error creating hashtags: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== GET TRENDING HASHTAGS ====================
  async getTrendingHashtags(
    limit: number = 10,
    timeframe: 'day' | 'week' | 'month' = 'week',
  ) {
    try {
      const timeWindow = new Date();

      switch (timeframe) {
        case 'day':
          timeWindow.setDate(timeWindow.getDate() - 1);
          break;
        case 'week':
          timeWindow.setDate(timeWindow.getDate() - 7);
          break;
        case 'month':
          timeWindow.setMonth(timeWindow.getMonth() - 1);
          break;
      }

      //* Get hashtags with highest usage in the timeframe
      const trendingHashtags = await this.hashtagRepo
        .createQueryBuilder('hashtag')
        .innerJoin('hashtag.postHashtags', 'postHashtag')
        .where('postHashtag.createdAt > :timeWindow', { timeWindow })
        .groupBy('hashtag.id')
        .addGroupBy('hashtag.tag')
        .addGroupBy('hashtag.usageCount')
        .orderBy('COUNT(postHashtag.id)', 'DESC')
        .addOrderBy('hashtag.usageCount', 'DESC')
        .limit(limit)
        .getMany();
      return plainToInstance(TagResponseDto, trendingHashtags, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      this.logger.error(`Error getting trending hashtags: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== GET POSTS BY HASHTAG ====================
  async getHashtagPosts(
    hashtag: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      //* 1. Find the hashtag
      const tag = await this.hashtagRepo.findOne({
        where: { tag: hashtag.toLowerCase() },
      });

      if (!tag) {
        return {
          posts: [],
          pagination: { currentPage: page, totalPages: 0, totalItems: 0 },
        };
      }

      //* 2. Get posts with this hashtag
      const [posts, total] = await this.postRepo
        .createQueryBuilder('post')
        .innerJoin('post.postHashtags', 'postHashtag')
        .innerJoin('postHashtag.hashtag', 'hashtag')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.media', 'media')
        .where('hashtag.tag = :tag', { tag: hashtag.toLowerCase() })
        .andWhere('post.deletedAt IS NULL')
        .andWhere('post.visibility = :visibility', { visibility: 'public' })
        .orderBy('post.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      //* 3. Get post status for all posts
      const postIds = posts.map((post) => post.id);
      const statusMap = await this.postStatusService.getPostsStatus(
        postIds,
        userId,
      );

      //* 4. Merge posts with their status
      const postsWithStatus = posts.map((post) => {
        const status = statusMap[post.id] || {
          hasLiked: false,
          hasBookmarked: false,
          hasReposted: false,
          hasReplied: false,
        };

        return {
          ...post,
          ...status,
        };
      });

      return {
        posts: plainToInstance(PostResponseDto, postsWithStatus, {
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
      this.logger.error(`Error getting hashtag posts: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== SEARCH HASHTAGS ====================
  async searchHashtags(query: string, limit: number = 10) {
    try {
      const hashtags = await this.hashtagRepo
        .createQueryBuilder('hashtag')
        .where('hashtag.tag LIKE :query', { query: `%${query.toLowerCase()}%` })
        .orderBy('hashtag.usageCount', 'DESC')
        .addOrderBy('hashtag.postCount', 'DESC')
        .limit(limit)
        .getMany();

      return hashtags;
    } catch (error) {
      this.logger.error(`Error searching hashtags: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== CLEANUP ORPHANED HASHTAGS ====================
  async cleanupOrphanedHashtags(): Promise<number> {
    const queryRunner = this.hashtagRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //* Find hashtags with no post associations
      const orphanedHashtags = await queryRunner.manager
        .createQueryBuilder(Hashtag, 'hashtag')
        .leftJoin('hashtag.postHashtags', 'postHashtag')
        .where('postHashtag.id IS NULL')
        .getMany();

      const deletedCount = orphanedHashtags.length;

      if (deletedCount > 0) {
        await queryRunner.manager.remove(Hashtag, orphanedHashtags);
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Cleaned up ${deletedCount} orphaned hashtags`);
      return deletedCount;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error cleaning up hashtags: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //TODO ==================== UPDATE HASHTAG STATS ====================
  async updateHashtagStats(hashtagId: string): Promise<void> {
    try {
      const postCount = await this.postHashtagRepo.count({
        where: { hashtag: { id: hashtagId } },
      });

      await this.hashtagRepo.update(
        { id: hashtagId },
        { postCount, lastUsedAt: new Date() },
      );
    } catch (error) {
      this.logger.error(`Error updating hashtag stats: ${error.message}`);
      throw error;
    }
  }
}
