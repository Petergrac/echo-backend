/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Post, PostVisibility } from '../entities/post.entity';
import { User } from '../../auth/entities/user.entity';
import { plainToInstance } from 'class-transformer';
import { PostResponseDto } from '../dto/post-response.dto';
import { PostStatusService } from './post-status.service';
import { Follow } from '../../users/follow/entities/follow.entity';

interface PostScore {
  post: Post;
  score: number;
  factors: {
    recency: number;
    engagement: number;
    relationship: number;
    content: number;
  };
}

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Follow) private readonly followRepo: Repository<Follow>,
    private readonly postStatusService: PostStatusService,
  ) {}

  //todo ==================== ALGORITHMIC FEED (FOR YOU) ====================
  async getAlgorithmicFeed(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      //* 1. Get posts from multiple sources
      const [followedPosts, trendingPosts, discoverPosts, closeNetworkPosts] =
        await Promise.all([
          this.getFollowedPostsForAlgorithm(userId, limit * 2),
          this.getTrendingPostsForAlgorithm(userId, limit * 1),
          this.getDiscoverPostsForAlgorithm(userId, limit * 1),
          this.getCloseNetworkPosts(userId, limit * 1),
        ]);
      //* 2. Combine and deduplicate
      const allPosts = this.combineAndDeduplicatePosts(
        followedPosts,
        trendingPosts,
        discoverPosts,
        closeNetworkPosts,
      );
      //* 3. Score each post
      const scoredPosts = await Promise.all(
        allPosts.map((post) => this.calculateEnhancedPostScore(post, userId)),
      );

      //* 4. Sort by score and paginate
      const sortedPosts = scoredPosts
        .sort((a, b) => b.score - a.score)
        .slice((page - 1) * limit, page * limit)
        .map((item) => ({
          post: item.post,
          score: item.score,
          scoreFactors: item.factors,
        }));
      //* 5. Increment view counts
      const postInfo = sortedPosts.map((item) => ({
        postId: item.post.id,
        authorId: item.post.authorId,
      }));
      await Promise.allSettled(
        postInfo.map((info) => this.incrementViewCount(info.postId)),
      );

      //* 6. Get post status
      const statusMap = await this.postStatusService.getPostsStatus(
        postInfo,
        userId,
      );

      //* 7. Merge posts with their status
      const postsWithStatus = sortedPosts.map((item) => {
        const status = statusMap[item.post.id] || {
          hasLiked: false,
          hasBookmarked: false,
          hasReposted: false,
          hasReplied: false,
          isFollowingAuthor: false,
        };

        return {
          ...plainToInstance(PostResponseDto, item.post, {
            excludeExtraneousValues: true,
            exposeUnsetFields: false,
          }),
          ...status,
        };
      });

      return {
        posts: postsWithStatus,
        pagination: {
          currentPage: page,
          hasNextPage: scoredPosts.length > page * limit,
          hasPrevPage: page > 1,
          totalItems: allPosts.length,
        },
      };
    } catch (error) {
      console.error('Error in getAlgorithmicFeed:', error);
      throw error;
    }
  }

  //todo ==================== TRENDING FEED ====================
  async getTrendingFeed(
    page: number = 1,
    userId: string,
    limit: number = 20,
    timeframe: 'day' | 'week' = 'week',
  ) {
    const timeWindow = new Date();
    timeWindow.setHours(
      timeWindow.getHours() - (timeframe === 'day' ? 24 : 168),
    );

    try {
      // Simple query without complex expressions
      const posts = await this.postRepo
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.media', 'media')
        .where('post.createdAt > :timeWindow', { timeWindow })
        .andWhere('post.visibility = :visibility', { visibility: 'public' })
        .andWhere('post.deletedAt IS NULL')
        .orderBy('post.createdAt', 'DESC')
        .offset((page - 1) * limit)
        .limit(limit)
        .getMany();

      //* Calculate scores in JavaScript
      const postsWithScore = posts.map((post) => {
        const postAge = Date.now() - post.createdAt.getTime();
        const hours = postAge / (1000 * 60 * 60);

        //* Simple trending score
        const engagement =
          post.likeCount + post.replyCount * 2 + post.repostCount * 1.5;
        const score = engagement / (hours + 2);

        return { post, score };
      });

      //* Sort by score
      const sortedPosts = postsWithScore
        .sort((a, b) => b.score - a.score)
        .map((item) => item.post);

      //* Get post status
      const postInfo = sortedPosts.map((post) => ({
        postId: post.id,
        authorId: post.authorId,
      }));
      await Promise.allSettled(
        postInfo.map((info) => this.incrementViewCount(info.postId)),
      );
      const statusMap = await this.postStatusService.getPostsStatus(
        postInfo,
        userId,
      );

      //* Merge posts with their status
      const postsWithStatus = sortedPosts.map((post) => {
        const status = statusMap[post.id] || {
          hasLiked: false,
          hasBookmarked: false,
          hasReposted: false,
          hasReplied: false,
          isFollowingAuthor: false,
        };

        return {
          ...plainToInstance(PostResponseDto, post, {
            excludeExtraneousValues: true,
            exposeUnsetFields: false,
          }),
          ...status,
        };
      });

      return {
        posts: postsWithStatus,
        pagination: {
          currentPage: page,
          totalItems: sortedPosts.length,
          totalPages: sortedPosts.length / limit,
          hasNextPage: false,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      console.error('Error in getTrendingFeed:', error);
      throw error;
    }
  }

  //todo ==================== DISCOVER FEED ====================
  async getDiscoverFeed(userId: string, page: number = 1, limit: number = 20) {
    try {
      const posts = await this.postRepo
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.media', 'media')
        .where('post.authorId != :userId', { userId })
        .andWhere('post.visibility = :visibility', { visibility: 'public' })
        .andWhere('post.deletedAt IS NULL')
        .andWhere(
          `post.authorId NOT IN (
            SELECT "followingId" FROM follows 
            WHERE "followerId" = :userId AND "deletedAt" IS NULL
          )`,
          { userId },
        )
        .orderBy('post.createdAt', 'DESC')
        .offset((page - 1) * limit)
        .limit(limit)
        .getMany();

      const postInfo = posts.map((post) => ({
        postId: post.id,
        authorId: post.authorId,
      }));
      await Promise.allSettled(
        postInfo.map((info) => this.incrementViewCount(info.postId)),
      );
      const statusMap = await this.postStatusService.getPostsStatus(
        postInfo,
        userId,
      );

      const postsWithStatus = posts.map((post) => {
        const status = statusMap[post.id] || {
          hasLiked: false,
          hasBookmarked: false,
          hasReposted: false,
          hasReplied: false,
          isFollowingAuthor: false,
        };

        return {
          ...plainToInstance(PostResponseDto, post, {
            excludeExtraneousValues: true,
            exposeUnsetFields: false,
          }),
          ...status,
        };
      });

      return {
        posts: postsWithStatus,
        pagination: {
          currentPage: page,
          totalItems: posts.length,
          totalPages: posts.length / limit,
          hasNextPage: posts.length === limit,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      console.error('Error in getDiscoverFeed:', error.message);
      throw error;
    }
  }

  //todo ==================== FOLLOWING FEED ====================
  async getFollowingFeed(userId: string, page: number = 1, limit: number = 20) {
    try {
      const followingIds = await this.getFollowingIds(userId);

      if (followingIds.length === 0) {
        // Return user's own posts
        const ownPosts = await this.postRepo
          .createQueryBuilder('post')
          .leftJoinAndSelect('post.author', 'author')
          .leftJoinAndSelect('post.media', 'media')
          .where('post.authorId = :userId', { userId })
          .andWhere('post.deletedAt IS NULL')
          .andWhere('post.visibility IN (:...visibilities)', {
            visibilities: [PostVisibility.PUBLIC, PostVisibility.FOLLOWERS],
          })
          .orderBy('post.createdAt', 'DESC')
          .offset((page - 1) * limit)
          .limit(limit)
          .getMany();

        // Process posts
        const postInfo = ownPosts.map((post) => ({
          postId: post.id,
          authorId: post.authorId,
        }));
        await Promise.allSettled(
          postInfo.map((info) => this.incrementViewCount(info.postId)),
        );
        const statusMap = await this.postStatusService.getPostsStatus(
          postInfo,
          userId,
        );

        const postsWithStatus = ownPosts.map((post) => {
          const status = statusMap[post.id] || {
            hasLiked: false,
            hasBookmarked: false,
            hasReposted: false,
            hasReplied: false,
          };

          return {
            ...plainToInstance(PostResponseDto, post, {
              excludeExtraneousValues: true,
              exposeUnsetFields: false,
            }),
            ...status,
          };
        });

        return {
          posts: postsWithStatus,
          pagination: {
            currentPage: page,
            totalItems: ownPosts.length,
            hasNextPage: ownPosts.length === limit,
            hasPrevPage: page > 1,
            noFollowing: true,
          },
        };
      }

      // Get posts from followed users
      const posts = await this.postRepo
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.media', 'media')
        .where('post.authorId IN (:...followingIds)', { followingIds })
        .andWhere('post.visibility IN (:...visibilities)', {
          visibilities: [PostVisibility.PUBLIC, PostVisibility.FOLLOWERS],
        })
        .andWhere('post.deletedAt IS NULL')
        .orderBy('post.createdAt', 'DESC')
        .offset((page - 1) * limit)
        .limit(limit)
        .getMany();

      //* Get post status
      const postInfo = posts.map((post) => ({
        postId: post.id,
        authorId: post.authorId,
      }));
      await Promise.allSettled(
        postInfo.map((info) => this.incrementViewCount(info.postId)),
      );
      const statusMap = await this.postStatusService.getPostsStatus(
        postInfo,
        userId,
      );

      //* Merge posts with their status
      const postsWithStatus = posts.map((post) => {
        const status = statusMap[post.id] || {
          hasLiked: false,
          hasBookmarked: false,
          hasReposted: false,
          hasReplied: false,
          isFollowingAuthor: false,
        };

        return {
          ...plainToInstance(PostResponseDto, post, {
            excludeExtraneousValues: true,
            exposeUnsetFields: false,
          }),
          ...status,
        };
      });

      return {
        posts: postsWithStatus,
        pagination: {
          currentPage: page,
          totalItems: posts.length,
          totalPages: posts.length / limit,
          hasNextPage: posts.length === limit,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      console.error('Error in getFollowingFeed:', error.message);
      throw error;
    }
  }

  //todo ==================== PRIVATE HELPER METHODS ====================

  //* Algorithmic Feed Helpers - SIMPLIFIED VERSIONS
  private async getFollowedPostsForAlgorithm(
    userId: string,
    limit: number,
  ): Promise<Post[]> {
    const followingIds = await this.getFollowingIds(userId);

    if (followingIds.length === 0) {
      return [];
    }

    return this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.media', 'media')
      .where('post.authorId IN (:...followingIds)', { followingIds })
      .andWhere('post.visibility IN (:...visibilities)', {
        visibilities: [PostVisibility.PUBLIC, PostVisibility.FOLLOWERS],
      })
      .andWhere('post.deletedAt IS NULL')
      .orderBy('post.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  private async getTrendingPostsForAlgorithm(
    userId: string,
    limit: number,
  ): Promise<Post[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.media', 'media')
      .where('post.createdAt > :oneDayAgo', { oneDayAgo })
      .andWhere('post.visibility = :visibility', {
        visibility: PostVisibility.PUBLIC,
      })
      .andWhere('post.deletedAt IS NULL')
      .andWhere('post.authorId != :userId', { userId })
      .orderBy('post.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  private async getDiscoverPostsForAlgorithm(
    userId: string,
    limit: number,
  ): Promise<Post[]> {
    const followingIds = await this.getFollowingIds(userId);
    const query = this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.media', 'media')
      .where('post.visibility = :visibility', {
        visibility: PostVisibility.PUBLIC,
      })
      .andWhere('post.deletedAt IS NULL')
      .andWhere('post.authorId != :userId', { userId })
      .orderBy('post.createdAt', 'DESC')
      .take(limit);

    if (followingIds.length > 0) {
      query.andWhere('post.authorId NOT IN (:...followingIds)', {
        followingIds,
      });
    }
    return query.getMany();
  }
  private async getCloseNetworkPosts(
    userId: string,
    limit: number,
  ): Promise<Post[]> {
    const interactedUserIds = await this.getFrequentlyInteractedUserIds(userId);
    const followingIds = await this.getFollowingIds(userId);

    if (interactedUserIds.length === 0) {
      return [];
    }

    const followingSet = new Set(followingIds);

    //* 1.Split our interacted users into two groups
    const followedInteracted = interactedUserIds.filter((id) =>
      followingSet.has(id),
    );
    const nonFollowedInteracted = interactedUserIds.filter(
      (id) => !followingSet.has(id),
    );

    const query = this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.media', 'media');

    //* 2.Use Brackets to group the visibility logic safely
    query.where(
      new Brackets((qb) => {
        //* 2.1. For users I follow: Show PUBLIC + FOLLOWER posts
        if (followedInteracted.length > 0) {
          qb.orWhere(
            '(post.authorId IN (:...followedInteracted) AND post.visibility IN (:...followedVis))',
            {
              followedInteracted,
              followedVis: [PostVisibility.PUBLIC, PostVisibility.FOLLOWERS],
            },
          );
        }

        //* 2.2. For users I don't follow: Show ONLY PUBLIC posts
        if (nonFollowedInteracted.length > 0) {
          qb.orWhere(
            '(post.authorId IN (:...nonFollowedInteracted) AND post.visibility = :publicVis)',
            {
              nonFollowedInteracted,
              publicVis: PostVisibility.PUBLIC,
            },
          );
        }
      }),
    );

    //* 3.General constraints for everyone
    return query
      .andWhere('post.authorId != :userId', { userId })
      .andWhere('post.deletedAt IS NULL')
      .orderBy('post.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }
  private async getFrequentlyInteractedUserIds(
    userId: string,
  ): Promise<string[]> {
    try {
      const result = await this.userRepo.query(
        `
        SELECT 
          user_id,
          COUNT(*) as interaction_count
        FROM (
          -- Users whose posts this user has liked
          SELECT p."authorId" as user_id
          FROM "like" l
          INNER JOIN "post" p ON l."postId" = p."id"
          WHERE l."userId" = $1
          
          UNION ALL
          
          -- Users who have replied to this user's posts
          SELECT r."authorId" as user_id
          FROM "reply" r
          INNER JOIN "post" p ON r."postId" = p."id"
          WHERE p."authorId" = $1 AND r."authorId" != $1
          
          UNION ALL
          
          -- Users this user follows
          SELECT "followingId" as user_id
          FROM "follows" 
          WHERE "followerId" = $1
        ) AS interactions
        GROUP BY user_id
        ORDER BY interaction_count DESC
        LIMIT 10
        `,
        [userId],
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return result.map((row) => row.user_id);
    } catch (error) {
      console.error('Error getting interacted user IDs:', error);
      return [];
    }
  }

  private async calculateEnhancedPostScore(
    post: Post,
    userId: string,
  ): Promise<PostScore> {
    const now = new Date();
    const postAge = now.getTime() - post.createdAt.getTime();

    //* Factor 1: Recency (0-40 points)
    const recency = this.calculateRecencyScore(postAge);

    //* Factor 2: Engagement (0-30 points)
    const engagement = this.calculateEngagementScore(post);

    //* Factor 3: Relationship (0-20 points)
    const relationship = await this.calculateRelationshipScore(post, userId);

    //* Factor 4: Content Quality (0-10 points)
    const content = this.calculateContentScore(post);

    const totalScore = recency + engagement + relationship + content;

    return {
      post,
      score: totalScore,
      factors: { recency, engagement, relationship, content },
    };
  }

  private calculateRecencyScore(postAge: number): number {
    const hours = postAge / (1000 * 60 * 60);
    if (hours < 1) return 40;
    if (hours < 6) return 35;
    if (hours < 24) return 25;
    if (hours < 72) return 15;
    return 5;
  }

  private calculateEngagementScore(post: Post): number {
    const engagementRate =
      (post.likeCount + post.replyCount * 2 + post.repostCount * 1.5) /
      Math.max(1, post.viewCount);
    return Math.min(30, engagementRate * 100);
  }

  private async calculateRelationshipScore(
    post: Post,
    userId: string,
  ): Promise<number> {
    if (post.author.id === userId) return 20; // User's own post

    //* Check if this is a mutual follow
    const mutualFollows = await this.userRepo
      .createQueryBuilder('user')
      .innerJoin(
        'user.following',
        'userFollowing',
        'userFollowing.followingId = :authorId',
        {
          authorId: post.author.id,
        },
      )
      .innerJoin(
        'user.followers',
        'userFollowers',
        'userFollowers.followerId = :authorId',
        {
          authorId: post.author.id,
        },
      )
      .where('user.id = :userId', { userId })
      .getCount();

    return mutualFollows > 0 ? 15 : 5;
  }

  private calculateContentScore(post: Post): number {
    let score = 0;
    if (post.mediaCount > 0) score += 5;
    if (post.content && post.content.length > 100) score += 3;
    if (post.content && post.content.length > 200) score += 2;
    return Math.min(10, score);
  }

  //* General helpers
  private combineAndDeduplicatePosts(...postGroups: Post[][]): Post[] {
    const seen = new Set<string>();
    const result: Post[] = [];

    for (const group of postGroups) {
      for (const post of group) {
        if (!seen.has(post.id)) {
          seen.add(post.id);
          result.push(post);
        }
      }
    }

    return result;
  }

  private async getFollowingIds(userId: string): Promise<string[]> {
    const follows = await this.followRepo.find({
      where: { followerId: userId },
      select: ['followingId'],
    });

    return follows.map((follow) => follow.followingId);
  }

  //* Increment view count (non-blocking)
  private async incrementViewCount(postId: string) {
    try {
      await this.postRepo.increment({ id: postId }, 'viewCount', 1);
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  }
}
