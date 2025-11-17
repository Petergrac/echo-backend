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
  async likeEcho(
    userId: string,
    createLikeDto: CreateLikeDto,
  ): Promise<{ success: boolean }> {
    const likeData: LikeCreateDto = {
      userId,
      echoId: createLikeDto.echoId,
    };

    const { like, notificationNeeded } =
      await this.likeRepository.like(likeData);

    //* 1.Create notification if needed
    if (notificationNeeded) {
      await this.notificationService.createNotification({
        type: 'LIKE',
        fromUserId: userId,
        targetUserId: like.echo.authorId,
        echoId: createLikeDto.echoId,
      });
    }

    return { success: true };
  }
  /**
   * TODO ==================== UNLIKE AN ECHO OPERATION ====================
   * @param userId
   * @param echoId
   * @returns
   */
  async unlikeEcho(
    userId: string,
    echoId: string,
  ): Promise<{ success: boolean }> {
    await this.likeRepository.unlike(userId, echoId);
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
    return this.likeRepository.getUserLikes(userId, page, limit);
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
    if (notificationNeeded) {
      await this.handleRippleNotifications(ripple, userId);
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

  async getRippleThread(rippleId: string): Promise<RippleResponseDto | null> {
    const ripple = await this.rippleRepository.getRippleThread(rippleId);
    return ripple ? this.transformRippleToResponse(ripple) : null;
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

  async getEchoReEchoes(echoId: string, page: number = 1, limit: number = 20) {
    return this.reechoRepository.getReEchoesByEchoId(echoId, page, limit);
  }

  async getUserReEchoes(userId: string, page: number = 1, limit: number = 20) {
    return this.reechoRepository.getUserReEchoes(userId, page, limit);
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
    return this.bookmarkRepository.getUserBookmarks(userId, page, limit);
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
   * TODO ====================== GET ENGAGEMENT COUNTS FOR MULTIPLE ECHOES ======================
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
    // Notify echo author if it's not their ripple
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
        displayName: ripple.user.displayName || ripple.user.username,
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
}
