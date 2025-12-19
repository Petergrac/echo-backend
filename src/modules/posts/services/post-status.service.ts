import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Like } from '../entities/post-like.entity';
import { Bookmark } from '../entities/bookmark.entity';
import { Repost } from '../entities/repost.entity';
import { Reply } from '../entities/reply.entity';

export interface PostStatus {
  hasLiked: boolean;
  hasBookmarked: boolean;
  hasReposted: boolean;
  hasReplied: boolean;
  repostContent: string | null;
}

export interface PostStatusMap {
  [postId: string]: PostStatus;
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
  ) {}

  /**
   *todo ======> Get status for a single post
   */
  async getPostStatus(postId: string, userId?: string): Promise<PostStatus> {
    if (!userId) {
      return this.getDefaultStatus();
    }

    const [like, bookmark, repost, reply] = await Promise.all([
      this.likeRepo.findOne({ where: { postId, userId } }),
      this.bookmarkRepo.findOne({ where: { postId, userId } }),
      this.repostRepo.findOne({ where: { originalPostId: postId, userId } }),
      this.replyRepo.findOne({ where: { postId, authorId: userId } }),
    ]);

    return {
      hasLiked: !!like,
      hasBookmarked: !!bookmark,
      hasReposted: !!repost,
      hasReplied: !!reply,
      repostContent: repost?.content || null,
    };
  }

  /**
   *todo ===========> Get status for multiple posts in bulk (optimized for feed/user posts)
   */
  async getPostsStatus(
    postIds: string[],
    userId?: string,
  ): Promise<PostStatusMap> {
    //* 1.Use single queries for each interaction type
    const [likes, bookmarks, reposts, replies] = await Promise.all([
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
    ]);

    //* 2.Create sets for O(1) lookup
    const likedPostIds = new Set(likes.map((l) => l.postId));
    const bookmarkedPostIds = new Set(bookmarks.map((b) => b.postId));
    const repliedPostIds = new Set(replies.map((r) => r.postId));

    const repostMap = new Map<string, string | null>(
      reposts.map((r) => [r.originalPostId, r.content]),
    );
    //* 3.Build status map
    const statusMap: PostStatusMap = {};
    for (const postId of postIds) {
      statusMap[postId] = {
        hasLiked: likedPostIds.has(postId),
        hasBookmarked: bookmarkedPostIds.has(postId),
        hasReposted: repostMap.has(postId),
        repostContent: repostMap.get(postId) || null,
        hasReplied: repliedPostIds.has(postId),
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
    };
  }
}
