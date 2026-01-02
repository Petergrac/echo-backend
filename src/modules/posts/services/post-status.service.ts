import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Like } from '../entities/post-like.entity';
import { Bookmark } from '../entities/bookmark.entity';
import { Repost } from '../entities/repost.entity';
import { Reply } from '../entities/reply.entity';
import { Follow } from '../../users/follow/entities/follow.entity';

export interface PostStatus {
  hasLiked: boolean;
  hasBookmarked: boolean;
  hasReposted: boolean;
  hasReplied: boolean;
  repostContent: string | null;
  isFollowingAuthor: boolean;
}

export interface PostStatusMap {
  [postId: string]: PostStatus;
}
export interface PostInfo {
  postId: string;
  authorId: string;
}

@Injectable()
export class PostStatusService {
  constructor(
    @InjectRepository(Like)
    private readonly likeRepo: Repository<Like>,
    @InjectRepository(Bookmark)
    private readonly bookmarkRepo: Repository<Bookmark>,
    @InjectRepository(Repost)
    private readonly repostRepo: Repository<Repost>,
    @InjectRepository(Reply)
    private readonly replyRepo: Repository<Reply>,
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
  ) {}

  /**
   *todo ======> Get status for a single post
   */
  async getPostStatus(
    postId: string,
    userId: string,
    authorId: string,
  ): Promise<PostStatus> {
    if (!userId) {
      return this.getDefaultStatus();
    }

    const [like, bookmark, repost, reply, follow] = await Promise.all([
      this.likeRepo.findOne({ where: { postId, userId } }),
      this.bookmarkRepo.findOne({ where: { postId, userId } }),
      this.repostRepo.findOne({ where: { originalPostId: postId, userId } }),
      this.replyRepo.findOne({ where: { postId, authorId: userId } }),
      this.followRepo.findOne({
        where: { followerId: userId, followingId: authorId },
      }),
    ]);

    return {
      hasLiked: !!like,
      hasBookmarked: !!bookmark,
      hasReposted: !!repost,
      hasReplied: !!reply,
      repostContent: repost?.content || null,
      isFollowingAuthor: !!follow,
    };
  }

  /**
   *todo ===========> Get status for multiple posts in bulk (optimized for feed/user posts)
   */

  async getPostsStatus(
    postsInfo: PostInfo[],
    userId: string,
  ): Promise<PostStatusMap> {
    //? Extract arrays for queries
    const postIds = postsInfo.map((p) => p.postId);
    const authorIds = [...new Set(postsInfo.map((p) => p.authorId))];

    //* 1. Use single queries for each interaction type
    const [likes, bookmarks, reposts, replies, follows] = await Promise.all([
      this.likeRepo.find({
        where: { postId: In(postIds), userId },
        select: ['postId'],
      }),
      this.bookmarkRepo.find({
        where: { postId: In(postIds), userId },
        select: ['postId'],
      }),
      this.repostRepo.find({
        where: { originalPostId: In(postIds), userId },
        select: ['originalPostId', 'content'],
      }),
      this.replyRepo.find({
        where: { postId: In(postIds), authorId: userId },
        select: ['postId'],
      }),
      //* Query to check which authors the user is following
      this.followRepo.find({
        where: {
          followerId: userId,
          followingId: In(authorIds),
        },
        select: ['followingId'],
      }),
    ]);

    //* 2. Create sets for O(1) lookup
    const likedPostIds = new Set(likes.map((l) => l.postId));
    const bookmarkedPostIds = new Set(bookmarks.map((b) => b.postId));
    const repliedPostIds = new Set(replies.map((r) => r.postId));
    const followedAuthorIds = new Set(follows.map((f) => f.followingId));

    const repostMap = new Map<string, string | null>(
      reposts.map((r) => [r.originalPostId, r.content]),
    );

    //* 3. Build status map
    const statusMap: PostStatusMap = {};

    for (const post of postsInfo) {
      statusMap[post.postId] = {
        hasLiked: likedPostIds.has(post.postId),
        hasBookmarked: bookmarkedPostIds.has(post.postId),
        hasReposted: repostMap.has(post.postId),
        repostContent: repostMap.get(post.postId) || null,
        hasReplied: repliedPostIds.has(post.postId),
        isFollowingAuthor: followedAuthorIds.has(post.authorId),
      };
    }

    return statusMap;
  }

  /**
   *todo======> Get default status for non-authenticated users
   */
  private getDefaultStatus(): PostStatus {
    return {
      hasLiked: false,
      hasBookmarked: false,
      hasReposted: false,
      hasReplied: false,
      repostContent: null,
      isFollowingAuthor: false,
    };
  }
}
