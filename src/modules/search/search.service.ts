import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../posts/entities/post.entity';
import { Hashtag } from '../posts/entities/hashtag.entity';
import { User } from '../auth/entities/user.entity';
import { Follow } from '../users/follow/entities/follow.entity';

interface SearchFilters {
  type?: 'users' | 'posts' | 'hashtags' | 'combined';
  limit?: number;
  offset?: number;
  timeframe?: 'day' | 'week' | 'month' | 'all';
  sortBy?: 'relevance' | 'popularity' | 'recent';
}

export interface SearchResult {
  users: User[];
  posts: Post[];
  hashtags: Hashtag[];
  total: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(Hashtag)
    private readonly hashtagRepo: Repository<Hashtag>,
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
  ) {}

  //TODO ==================== COMBINED SEARCH ====================
  async combinedSearch(
    query: string,
    userId?: string,
    filters: SearchFilters = {},
  ): Promise<SearchResult> {
    try {
      const normalizedQuery = query.trim().toLowerCase();

      if (!normalizedQuery || normalizedQuery.length < 2) {
        return { users: [], posts: [], hashtags: [], total: 0 };
      }

      const [users, posts, hashtags] = await Promise.all([
        this.searchUsers(normalizedQuery, userId, filters),
        this.searchPosts(normalizedQuery, userId, filters),
        this.searchHashtags(normalizedQuery, filters),
      ]);

      const total = users.length + posts.length + hashtags.length;

      return {
        users,
        posts,
        hashtags,
        total,
      };
    } catch (error) {
      this.logger.error(`Error in combined search: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== SEARCH USERS ====================
  async searchUsers(
    query: string,
    currentUserId?: string,
    filters: SearchFilters = {},
  ): Promise<User[]> {
    try {
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      //* 1.Build base query with full-text search
      let queryBuilder = this.userRepo
        .createQueryBuilder('user')
        .where('user.deletedAt IS NULL')
        .andWhere(
          '(user.username ILIKE :query OR user.displayName ILIKE :query OR user.bio ILIKE :query)',
          { query: `%${query}%` },
        )
        .orderBy('user.createdAt', 'DESC')
        .skip(offset)
        .take(limit);

      //* 2.Add relevance scoring based on match type
      if (query.startsWith('@')) {
        //? Exact username match for @mentions
        const exactUsername = query.replace('@', '');
        queryBuilder = this.userRepo
          .createQueryBuilder('user')
          .where('user.username ILIKE :exactUsername', {
            exactUsername: `${exactUsername}%`,
          })
          .andWhere('user.deletedAt IS NULL')
          .orderBy('user.createdAt', 'DESC')
          .skip(offset)
          .take(limit);
      }

      const users = await queryBuilder.getMany();

      //* If user is authenticated, add follow status
      if (currentUserId) {
        return this.enrichUsersWithFollowStatus(users, currentUserId);
      }

      return users;
    } catch (error) {
      this.logger.error(`Error searching users: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== SEARCH POSTS ====================
  async searchPosts(
    query: string,
    currentUserId?: string,
    filters: SearchFilters = {},
  ): Promise<Post[]> {
    try {
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      //* 1.Build base query with full-text search
      let queryBuilder = this.postRepo
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.media', 'media')
        .leftJoinAndSelect('post.postHashtags', 'postHashtags')
        .leftJoinAndSelect('postHashtags.hashtag', 'hashtag')
        .where('post.deletedAt IS NULL')
        .andWhere('post.visibility = :visibility', { visibility: 'public' })
        .andWhere('(post.content ILIKE :query OR hashtag.tag ILIKE :query)', {
          query: `%${query}%`,
        });

      //* 2.Apply timeframe filter
      if (filters.timeframe && filters.timeframe !== 'all') {
        const timeWindow = this.getTimeWindow(filters.timeframe);
        queryBuilder = queryBuilder.andWhere('post.createdAt >= :timeWindow', {
          timeWindow,
        });
      }

      //* 3.Apply sorting
      if (filters.sortBy === 'popularity') {
        queryBuilder = queryBuilder.orderBy(
          'post.likeCount + post.replyCount * 2 + post.repostCount * 1.5',
          'DESC',
        );
      } else if (filters.sortBy === 'recent') {
        queryBuilder = queryBuilder.orderBy('post.createdAt', 'DESC');
      } else {
        //?Default: relevance (combination of text match and engagement)
        queryBuilder = queryBuilder
          .addSelect(
            `(CASE 
              WHEN post.content ILIKE :exactQuery THEN 3
              WHEN post.content ILIKE :startQuery THEN 2
              ELSE 1
            END) * (post.likeCount + post.replyCount * 2 + post.repostCount * 1.5 + 1)`,
            'relevance_score',
          )
          .setParameter('exactQuery', query)
          .setParameter('startQuery', `${query}%`)
          .orderBy('relevance_score', 'DESC');
      }

      queryBuilder = queryBuilder.skip(offset).take(limit);

      const posts = await queryBuilder.getMany();

      //* 1.If user is authenticated, add engagement status
      if (currentUserId) {
        return this.enrichPostsWithEngagementStatus(posts, currentUserId);
      }

      return posts;
    } catch (error) {
      this.logger.error(`Error searching posts: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== SEARCH HASHTAGS ====================
  async searchHashtags(
    query: string,
    filters: SearchFilters = {},
  ): Promise<Hashtag[]> {
    try {
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      let queryBuilder = this.hashtagRepo
        .createQueryBuilder('hashtag')
        .where('hashtag.tag ILIKE :query', { query: `%${query}%` })
        .orderBy('hashtag.usageCount', 'DESC')
        .addOrderBy('hashtag.postCount', 'DESC')
        .skip(offset)
        .take(limit);

      //* 1.For hashtag searches, prioritize exact matches
      if (!query.startsWith('#')) {
        queryBuilder = this.hashtagRepo
          .createQueryBuilder('hashtag')
          .where('hashtag.tag = :exactQuery', {
            exactQuery: query.toLowerCase(),
          })
          .orWhere('hashtag.tag ILIKE :query', { query: `%${query}%` })
          .orderBy('hashtag.usageCount', 'DESC')
          .skip(offset)
          .take(limit);
      }

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error(`Error searching hashtags: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== GET SEARCH SUGGESTIONS ====================
  async getSearchSuggestions(
    query: string,
    userId?: string,
    limit: number = 10,
  ): Promise<{
    users: User[];
    hashtags: Hashtag[];
    popularQueries: string[];
  }> {
    try {
      const normalizedQuery = query.trim().toLowerCase();

      if (!normalizedQuery || normalizedQuery.length < 2) {
        return { users: [], hashtags: [], popularQueries: [] };
      }

      const [users, hashtags] = await Promise.all([
        this.userRepo
          .createQueryBuilder('user')
          .where('user.username ILIKE :query', { query: `${normalizedQuery}%` })
          .andWhere('user.deletedAt IS NULL')
          .orderBy('user.createdAt', 'DESC')
          .take(limit)
          .getMany(),
        this.hashtagRepo
          .createQueryBuilder('hashtag')
          .where('hashtag.tag ILIKE :query', { query: `${normalizedQuery}%` })
          .orderBy('hashtag.usageCount', 'DESC')
          .take(limit)
          .getMany(),
      ]);

      //* 2.Popular queries (you can implement this with a search history table later)
      const popularQueries = this.getPopularSearchQueries(normalizedQuery);

      let enrichedUsers = users;
      if (userId) {
        enrichedUsers = await this.enrichUsersWithFollowStatus(users, userId);
      }

      return {
        users: enrichedUsers,
        hashtags,
        popularQueries,
      };
    } catch (error) {
      this.logger.error(`Error getting search suggestions: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== GET TRENDING SEARCHES ====================
  async getTrendingSearches(
    timeframe: 'day' | 'week' = 'day',
    limit: number = 10,
  ): Promise<string[]> {
    try {
      //* Placeholder - implement with search analytics later
      //* For now, return popular hashtags as trending searches
      const trendingHashtags = await this.hashtagRepo
        .createQueryBuilder('hashtag')
        .orderBy('hashtag.usageCount', 'DESC')
        .take(limit)
        .getMany();

      return trendingHashtags.map((hashtag) => `#${hashtag.tag}`);
    } catch (error) {
      this.logger.error(`Error getting trending searches: ${error.message}`);
      throw error;
    }
  }

  //TODO ==================== DISCOVERY FEATURES ====================

  async getTrendingPosts(
    userId?: string,
    timeframe: 'day' | 'week' = 'day',
    limit: number = 20,
  ): Promise<Post[]> {
    try {
      const timeWindow = this.getTimeWindow(timeframe);

      const posts = await this.postRepo
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.media', 'media')
        .where('post.deletedAt IS NULL')
        .andWhere('post.visibility = :visibility', { visibility: 'public' })
        .andWhere('post.createdAt >= :timeWindow', { timeWindow })
        .orderBy(
          'post.likeCount + post.replyCount * 2 + post.repostCount * 1.5',
          'DESC',
        )
        .addOrderBy('post.viewCount', 'DESC')
        .take(limit)
        .getMany();

      if (userId) {
        return this.enrichPostsWithEngagementStatus(posts, userId);
      }

      return posts;
    } catch (error) {
      this.logger.error(`Error getting trending posts: ${error.message}`);
      throw error;
    }
  }

  async getUserRecommendations(
    userId: string,
    limit: number = 10,
  ): Promise<User[]> {
    try {
      //* Get users followed by people you follow (2nd degree connections)
      const recommendedUsers = await this.userRepo
        .createQueryBuilder('user')
        .leftJoin('user.followers', 'followers')
        .leftJoin('followers.follower', 'follower')
        .leftJoin('follower.following', 'mutualFollows')
        .where('user.id != :userId', { userId })
        .andWhere('mutualFollows.followerId = :userId', { userId })
        .andWhere('user.deletedAt IS NULL')
        .andWhere('user.isPrivate = :isPrivate', { isPrivate: false })
        .andWhere(
          'user.id NOT IN (SELECT following_id FROM follow WHERE follower_id = :userId AND deleted_at IS NULL)',
          { userId },
        )
        .groupBy('user.id')
        .addGroupBy('user.username')
        .addGroupBy('user.displayName')
        .addGroupBy('user.avatar')
        .addGroupBy('user.bio')
        .orderBy('COUNT(followers.id)', 'DESC')
        .addOrderBy('user.createdAt', 'DESC')
        .take(limit)
        .getMany();

      return this.enrichUsersWithFollowStatus(recommendedUsers, userId);
    } catch (error) {
      this.logger.error(`Error getting user recommendations: ${error.message}`);
      throw error;
    }
  }

  async getHashtagRecommendations(
    userId?: string,
    limit: number = 10,
  ): Promise<Hashtag[]> {
    try {
      return await this.hashtagRepo
        .createQueryBuilder('hashtag')
        .orderBy('hashtag.usageCount', 'DESC')
        .addOrderBy('hashtag.trendScore', 'DESC')
        .take(limit)
        .getMany();
    } catch (error) {
      this.logger.error(
        `Error getting hashtag recommendations: ${error.message}`,
      );
      throw error;
    }
  }

  //? ==================== PRIVATE UTILITY METHODS ====================

  private async enrichUsersWithFollowStatus(
    users: User[],
    currentUserId: string,
  ): Promise<User[]> {
    if (users.length === 0) return users;

    const userIds = users.map((user) => user.id);

    const followStatus = await this.followRepo
      .createQueryBuilder('follow')
      .where('follow.followerId = :currentUserId', { currentUserId })
      .andWhere('follow.followingId IN (:...userIds)', { userIds })
      .andWhere('follow.deletedAt IS NULL')
      .getMany();

    const followingMap = new Map(
      followStatus.map((f) => [f.followingId, true]),
    );

    return users.map((user) => ({
      ...user,
      isFollowing: followingMap.has(user.id),
    }));
  }

  private async enrichPostsWithEngagementStatus(
    posts: Post[],
    currentUserId: string,
  ): Promise<Post[]> {
    if (posts.length === 0) return posts;

    const postIds = posts.map((post) => post.id);

    //* Get like status
    const likedPosts = await this.postRepo.manager
      .createQueryBuilder('like', 'like')
      .where('like.userId = :currentUserId', { currentUserId })
      .andWhere('like.postId IN (:...postIds)', { postIds })
      .andWhere('like.deletedAt IS NULL')
      .getMany();

    const likedMap = new Map(likedPosts.map((like) => [like.postId, true]));

    //* Get bookmark status
    const bookmarkedPosts = await this.postRepo.manager
      .createQueryBuilder('bookmark', 'bookmark')
      .where('bookmark.userId = :currentUserId', { currentUserId })
      .andWhere('bookmark.postId IN (:...postIds)', { postIds })
      .andWhere('bookmark.deletedAt IS NULL')
      .getMany();

    const bookmarkedMap = new Map(
      bookmarkedPosts.map((bookmark) => [bookmark.postId, true]),
    );

    return posts.map((post) => ({
      ...post,
      liked: likedMap.has(post.id),
      bookmarked: bookmarkedMap.has(post.id),
    }));
  }

  private getTimeWindow(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      default:
        return new Date(0); // Beginning of time
    }
  }

  private getPopularSearchQueries(query: string): string[] {
    //* Placeholder - implement with search history analytics later
    return [
      `#${query}`,
      `@${query}`,
      `${query} tips`,
      `${query} tutorial`,
    ].slice(0, 5);
  }
}
