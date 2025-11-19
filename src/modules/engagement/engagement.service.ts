// src/engagement/engagement.service.ts
import { Injectable } from '@nestjs/common';
import {
  LikeRepository,
  CreateLikeDto as LikeCreateDto,
} from './repositories/like.repository';
import {
  RippleRepository,
  CreateRippleDto as RippleCreateDto,
  RippleWithRelations,
} from './repositories/ripple.repository';
import {
  ReEchoRepository,
  CreateReEchoDto as ReEchoCreateDto,
} from './repositories/reecho.repository';
import {
  BookmarkRepository,
  CreateBookmarkDto as BookmarkCreateDto,
} from './repositories/bookmark.repository';
import { EngagementCountRepository } from './repositories/engagement-count.repository';
import {
  CreateLikeDto,
  CreateRippleDto,
  CreateReEchoDto,
  CreateBookmarkDto,
} from './dto/create-engagement.dto';
import {
  EngagementCountsDto,
  UserEngagementStateDto,
  RippleResponseDto,
} from './dto/engagement-response.dto';
import { NotificationService } from '../notification/notifications.service';

@Injectable()
export class EngagementService {
  constructor(
    private readonly likeRepository: LikeRepository,
    private readonly rippleRepository: RippleRepository,
    private readonly reechoRepository: ReEchoRepository,
    private readonly bookmarkRepository: BookmarkRepository,
    private readonly engagementCountRepository: EngagementCountRepository,
    private readonly notificationService: NotificationService,
  ) {}
  /**
   * TODO ==================== LIKE OPERATIONS ====================
   * @param userId
   * @param createLikeDto
   * @returns
   */
  async toggleLike(
    userId: string,
    createLikeDto: CreateLikeDto,
  ): Promise<{ success: boolean }> {
    const likeData: LikeCreateDto = {
      userId,
      echoId: createLikeDto.echoId,
    };
    const { notificationNeeded } =
      await this.likeRepository.toggleLike(likeData);

    //* 1.Create notification if needed
    if (notificationNeeded) {
      try {
        //* 1.0 Get echo author for notification
        const echo = await this.likeRepository.getEchoAuthor(
          createLikeDto.echoId,
        );
        //* 1.1 Create Notification
        await this.notificationService.createNotification({
          type: 'LIKE',
          fromUserId: userId,
          targetUserId: echo.authorId,
          echoId: createLikeDto.echoId,
        });

        //* 2.Send real-time feed update to echo author
        await this.notificationService.sendFeedUpdate(echo.authorId, {
          type: 'ECHO_LIKED',
          echoId: createLikeDto.echoId,
          likedBy: userId,
          likeCount: await this.likeRepository.getLikeCount(
            createLikeDto.echoId,
          ),
        });
      } catch (error) {
        console.log(error);
      }
    }

    return { success: true };
  }
  /**
   *  TODO ==================== GET LIKES OF A SPECIFIC ECHO ====================
   * @param echoId
   * @param page
   * @param limit
   * @returns
   */
  async getEchoLikes(echoId: string, page: number = 1, limit: number = 20) {
    return this.likeRepository.getLikesByEchoId(echoId, page, limit);
  }

  async getUserLikes(userId: string, page: number = 1, limit: number = 20) {
    const response = this.likeRepository.getUserLikes(userId, page, limit);
    //* Enrich likes with echo states & counts
    const likes = (await response).likes;
    const echoIds = likes.map((like) => like.echoId);
    const engagementStates = await this.getBatchEngagementStates(
      userId,
      echoIds,
    );
    const engagementCounts = await this.getBatchEngagementCounts(echoIds);
    //* Map states and counts to likes
    const enrichedEchoes = likes.map((like) => ({
      ...like,
      engagementStates: engagementStates.get(like.echoId),
      engagementCounts: engagementCounts.get(like.echoId),
    }));

    const meta = {
      hasNexPage: (await response).total > page * limit,
      currentPage: page,
      hasPreviousPage: page > 1,
      totalPages: Math.ceil((await response).total / limit),
    };

    return { userLikedEchoes: enrichedEchoes, meta };
  }

  // TODO==================== RIPPLE (REPLY) OPERATIONS ====================
  async createRipple(
    userId: string,
    createRippleDto: CreateRippleDto,
  ): Promise<RippleResponseDto> {
    const rippleData: RippleCreateDto = {
      userId,
      echoId: createRippleDto.echoId,
      content: createRippleDto.content,
      parentId: createRippleDto.parentId,
    };

    const { ripple, notificationNeeded } =
      await this.rippleRepository.createRipple(rippleData);
    //* 1.Handle notifications
    try {
      if (notificationNeeded) {
        await this.handleRippleNotifications(ripple, userId);
      }

      //* 2.Send real-time update to all users viewing this echo
      await this.broadcastRippleUpdate(createRippleDto.echoId, {
        type: 'NEW_RIPPLE',
        rippleId: ripple.id,
        echoId: createRippleDto.echoId,
      });
    } catch (error) {
      console.log(error);
    }
    return this.transformRippleToResponse(ripple);
  }
  /**
   *  TODO ==================== GET RIPPLES OF A GIVEN ECHO ====================
   * @param echoId
   * @param page
   * @param limit
   * @param includeReplies
   * @returns
   */
  async getEchoRipples(
    echoId: string,
    page: number = 1,
    limit: number = 20,
    includeReplies: boolean = false,
  ) {
    const { ripples, total } = await this.rippleRepository.getRipplesByEchoId(
      echoId,
      page,
      limit,
      includeReplies,
    );

    const totalPages = Math.ceil(total / limit);

    return {
      ripples: ripples.map((ripple) => this.transformRippleToResponse(ripple)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   *   TODO ==================== UPDATE A RIPPLE ====================
   * @param rippleId
   * @param userId
   * @param content
   * @returns
   */
  async updateRipple(
    rippleId: string,
    userId: string,
    content: string,
  ): Promise<RippleResponseDto> {
    const updatedRipple = await this.rippleRepository.updateRipple(
      rippleId,
      userId,
      content,
    );
    return this.transformRippleToResponse(updatedRipple);
  }
  /**
   *  TODO ==================== DELETE A RIPPLE ====================
   * @param rippleId
   * @param userId
   * @param userRole
   * @returns
   */
  async deleteRipple(
    rippleId: string,
    userId: string,
    userRole?: string,
  ): Promise<{ success: boolean }> {
    await this.rippleRepository.softDeleteRipple(rippleId, userId, userRole);
    return { success: true };
  }

  // TODO==================== REECHO AN ECHO ====================
  async reechoEcho(
    userId: string,
    createReEchoDto: CreateReEchoDto,
  ): Promise<{ success: boolean }> {
    const reechoData: ReEchoCreateDto = {
      userId,
      echoId: createReEchoDto.echoId,
    };

    const { reecho, notificationNeeded } =
      await this.reechoRepository.reecho(reechoData);

    if (notificationNeeded) {
      await this.notificationService.createNotification({
        type: 'REECHO',
        fromUserId: userId,
        targetUserId: reecho.echo.authorId,
        echoId: createReEchoDto.echoId,
      });
    }

    return { success: true };
  }
  /**
   *  TODO ==================== UN TWEET (UN RE-ECHO) AN ECHO ====================
   * @param userId
   * @param echoId
   * @returns
   */
  async unreechoEcho(
    userId: string,
    echoId: string,
  ): Promise<{ success: boolean }> {
    await this.reechoRepository.unreecho(userId, echoId);
    return { success: true };
  }

  async getUserReEchoes(userId: string, page: number = 1, limit: number = 20) {
    const reechoes = this.reechoRepository.getUserReEchoes(userId, page, limit);
    const reechoesIds = (await reechoes).reechoes.map(
      (reecho) => reecho.echoId,
    );
    //* Enrich it with echo states
    const engagementState = await this.getBatchEngagementStates(
      userId,
      reechoesIds,
    );
    //* Map the states to their respective reechoes
    const enrichedReEchoes = (await reechoes).reechoes.map((reecho) => ({
      ...reecho,
      engagementState: engagementState.get(reecho.echoId),
    }));
    return {
      reechoes: enrichedReEchoes,
      meta: (await reechoes).meta,
    };
  }

  // TODO==================== BOOKMARK OPERATIONS ====================
  async bookmarkEcho(
    userId: string,
    createBookmarkDto: CreateBookmarkDto,
  ): Promise<{ success: boolean }> {
    const bookmarkData: BookmarkCreateDto = {
      userId,
      echoId: createBookmarkDto.echoId,
    };

    await this.bookmarkRepository.bookmark(bookmarkData);
    return { success: true };
  }

  async unbookmarkEcho(
    userId: string,
    echoId: string,
  ): Promise<{ success: boolean }> {
    await this.bookmarkRepository.unbookmark(userId, echoId);
    return { success: true };
  }

  async getUserBookmarks(userId: string, page: number = 1, limit: number = 20) {
    const { bookmarks, total } = await this.bookmarkRepository.getUserBookmarks(
      userId,
      page,
      limit,
    );
    //* Enrich bookmarks with echo states & counts
    const echoIds = bookmarks.map((bookmark) => bookmark.echoId);
    const engagementStates = await this.getBatchEngagementStates(
      userId,
      echoIds,
    );
    const engagementCounts = await this.getBatchEngagementCounts(echoIds);

    //* Map states and counts to bookmarks
    const enrichedBookmarks = bookmarks.map((bookmark) => ({
      ...bookmark,
      engagementStates: engagementStates.get(bookmark.echoId),
      engagementCounts: engagementCounts.get(bookmark.echoId),
    }));

    const totalPages = Math.ceil(total / limit);
    return {
      enrichedBookmarks,
      hasNexPage: totalPages > page,
      currentPage: page,
      hasPreviousPage: page > 1,
      totalPages,
      limit,
    };
  }

  // TODO==================== ENGAGEMENT STATE & COUNTS ====================
  async getEngagementCounts(echoId: string): Promise<EngagementCountsDto> {
    return this.engagementCountRepository.getCountsForEcho(echoId);
  }

  async getUserEngagementState(
    userId: string,
    echoId: string,
  ): Promise<UserEngagementStateDto> {
    const [liked, reechoed, bookmarked] = await Promise.all([
      this.likeRepository.isLiked(userId, echoId),
      this.reechoRepository.isReEchoed(userId, echoId),
      this.bookmarkRepository.isBookmarked(userId, echoId),
    ]);
    return { liked, reechoed, bookmarked };
  }

  async getBatchEngagementStates(
    userId: string,
    echoIds: string[],
  ): Promise<Map<string, UserEngagementStateDto>> {
    const statesMap = new Map<string, UserEngagementStateDto>();

    //? Get all states in parallel
    const [likes, reechoes, bookmarks] = await Promise.all([
      this.likeRepository.getUserLikesBatch(userId, echoIds),
      this.reechoRepository.getUserReEchoesBatch(userId, echoIds),
      this.bookmarkRepository.getUserBookmarksBatch(userId, echoIds),
    ]);

    //? Initialize with false states
    echoIds.forEach((echoId) => {
      statesMap.set(echoId, {
        liked: false,
        reechoed: false,
        bookmarked: false,
      });
    });

    //* Update with actual states
    likes.forEach((like) => {
      const state = statesMap.get(like.echoId);
      if (state) state.liked = true;
    });

    reechoes.forEach((reecho) => {
      const state = statesMap.get(reecho.echoId);
      if (state) state.reechoed = true;
    });

    bookmarks.forEach((bookmark) => {
      const state = statesMap.get(bookmark.echoId);
      if (state) state.bookmarked = true;
    });

    return statesMap;
  }

  async getUserEngagementStats(userId: string) {
    return this.engagementCountRepository.getUserEngagementStats(userId);
  }

  /**
   * TODO ====================== GET BATCH ENGAGEMENT COUNTS FOR MULTIPLE ECHOES ======================
   * @param echoIds
   * @returns //? Map of echo IDs to their respective engagement counts
   */
  async getBatchEngagementCounts(
    echoIds: string[],
  ): Promise<Map<string, EngagementCountsDto>> {
    return this.engagementCountRepository.getCountsForEchoes(echoIds);
  }

  // TODO ==================== PRIVATE METHODS ====================
  private async handleRippleNotifications(
    ripple: RippleWithRelations,
    userId: string,
  ): Promise<void> {
    //? Notify echo author if it's not their ripple
    if (ripple.echo.authorId !== userId) {
      await this.notificationService.createNotification({
        type: 'RIPPLE',
        fromUserId: userId,
        targetUserId: ripple.echo.authorId,
        echoId: ripple.echoId,
        rippleId: ripple.id,
      });
    }

    //? Notify parent author if it's a reply and not to themselves
    if (ripple.parentId && ripple.parent && ripple.parent.user.id !== userId) {
      await this.notificationService.createNotification({
        type: 'RIPPLE_REPLY',
        fromUserId: userId,
        targetUserId: ripple.parent.user.id,
        echoId: ripple.echoId,
        rippleId: ripple.id,
      });
    }
  }

  private transformRippleToResponse(ripple: any): RippleResponseDto {
    const response: RippleResponseDto = {
      id: ripple.id,
      content: ripple.content,
      createdAt: ripple.createdAt,
      updatedAt: ripple.updatedAt,
      user: {
        id: ripple.user.id,
        username: ripple.user.username,
        firstName: ripple.user.firstName,
        lastName: ripple.user.lastName,
        avatar: ripple.user.avatar,
      },
      replyCount: ripple._count?.replies || 0,
    };

    if (ripple.parent) {
      response.parent = {
        id: ripple.parent.id,
        user: {
          id: ripple.parent.user.id,
          username: ripple.parent.user.username,
        },
      };
    }

    if (ripple.replies && Array.isArray(ripple.replies)) {
      response.replies = ripple.replies.map((reply) =>
        this.transformRippleToResponse(reply),
      );
    }

    return response;
  }

  /**
   * TODO ====================== BROADCAST RIPPLE UPDATE ======================
   * @param echoId
   * @param update
   * @returns //? Send real-time update to all users viewing an echo
   */
  private async broadcastRippleUpdate(
    echoId: string,
    update: any,
  ): Promise<void> {
    //? In production, you'd track which users are viewing the echo
    //? For now, we'll log the intent
    console.log(
      `Would broadcast ripple update for echo ${echoId} to all viewers`,
    );
  }

  /**
   * TODO ====================== BROADCAST TO FOLLOWERS ======================
   * @param userId
   * @param update
   * @returns //? Send real-time update to all followers of a user
   */
  private async broadcastToFollowers(
    userId: string,
    update: any,
  ): Promise<void> {
    // In production, you'd get followers and send updates
    console.log(`Would broadcast to followers of user ${userId}`);
  }
}
