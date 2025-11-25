// services/feed.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../entities/post.entity';
import { User } from '../../auth/entities/user.entity';

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
  ) {}

  //TODO ==================== ALGORITHMIC FEED ====================
  async getAlgorithmicFeed(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    //* 1. Get posts from followed users and user's own posts
    const posts = await this.getBaseFeedPosts(userId, page * 2); //* Get more for scoring

    //* 2. Score each post
    const scoredPosts = await Promise.all(
      posts.map((post) => this.calculatePostScore(post, userId)),
    );

    //* 3. Sort by score and paginate
    const sortedPosts = scoredPosts
      .sort((a, b) => b.score - a.score)
      .slice((page - 1) * limit, page * limit)
      .map((item) => ({
        ...item.post,
        score: item.score,
        scoreFactors: item.factors,
      }));

    return {
      posts: sortedPosts,
      pagination: {
        currentPage: page,
        hasNextPage: scoredPosts.length > page * limit,
        hasPrevPage: page > 1,
      },
    };
  }

  //TODO ==================== TRENDING FEED ====================
  async getTrendingFeed(
    page: number = 1,
    limit: number = 20,
    timeframe: 'day' | 'week' = 'day',
  ) {
    const timeWindow = new Date();
    timeWindow.setHours(
      timeWindow.getHours() - (timeframe === 'day' ? 24 : 168),
    );

    const [posts, total] = await this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.media', 'media')
      .where('post.createdAt > :timeWindow', { timeWindow })
      .andWhere('post.visibility = :visibility', { visibility: 'public' })
      .andWhere('post.deletedAt IS NULL')
      .orderBy(
        '(post.likeCount + post.replyCount * 2 + post.repostCount * 1.5)',
        'DESC',
      )
      .addOrderBy('post.viewCount', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  //TODO ==================== DISCOVER FEED ====================
  async getDiscoverFeed(userId: string, page: number = 1, limit: number = 20) {
    //* Get posts from non-followed users with high engagement
    const posts = await this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.media', 'media')
      .where('post.authorId != :userId', { userId })
      .andWhere('post.visibility = :visibility', { visibility: 'public' })
      .andWhere('post.deletedAt IS NULL')
      .andWhere(
        `post.authorId NOT IN (
          SELECT following_id FROM follow 
          WHERE follower_id = :userId AND deleted_at IS NULL
        )`,
        { userId },
      )
      .orderBy('(post.likeCount + post.replyCount + post.repostCount)', 'DESC')
      .addOrderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      posts,
      pagination: {
        currentPage: page,
        hasNextPage: posts.length === limit,
        hasPrevPage: page > 1,
      },
    };
  }

  //? ==================== PRIVATE METHODS ====================

  private async getBaseFeedPosts(
    userId: string,
    take: number,
  ): Promise<Post[]> {
    return this.postRepo
      .createQueryBuilder('post')
      .innerJoin('post.author', 'author')
      .leftJoin(
        'author.followers',
        'followers',
        'followers.followerId = :userId',
        { userId },
      )
      .leftJoinAndSelect('post.media', 'media')
      .leftJoinAndSelect('post.author', 'postAuthor')
      .where('post.deletedAt IS NULL')
      .andWhere('(post.authorId = :userId OR followers.followerId = :userId)', {
        userId,
      })
      .andWhere('(post.visibility = :public OR post.visibility = :followers)', {
        public: 'public',
        followers: 'followers',
      })
      .orderBy('post.createdAt', 'DESC')
      .take(take)
      .getMany();
  }

  private async calculatePostScore(
    post: Post,
    userId: string,
  ): Promise<PostScore> {
    const now = new Date();
    const postAge = now.getTime() - post.createdAt.getTime();

    //* Factor 1: Recency (0-40 points)
    const recency = this.calculateRecencyScore(postAge);

    //* Factor 2: Engagement Density (0-30 points)
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

    //* Check if this is a close connection (mutual follows, frequent interactions)
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
    if (post.content.length > 100) score += 3;
    if (post.content.length > 200) score += 2;
    return Math.min(10, score);
  }
}
