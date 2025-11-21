import { Injectable } from '@nestjs/common';
import { LikeRepository } from '../repository/like.repository';
import { RippleRepository } from '../repository/ripple.repository';

@Injectable()
export class EngagementService {
  constructor(
    private readonly likeRepo: LikeRepository,
    private readonly rippleRepo: RippleRepository,
  ) {}

  /**
   * TODO ================= TOGGLE LIKE ===================
   * @param userId
   * @param echoId
   * @returns
   */
  async toggleLike(userId: string, echoId: string) {
    //* Toggle Like
    const likeDto = { userId, echoId };
    const { like, notificationNeeded } =
      await this.likeRepo.toggleLike(likeDto);
    //* 2.Send notification if needed( Like and feed notification)
    // ? Use like to get the id and username for the notification
    return { success: true, like };
  }

  /**
   * TODO ============== CREATE RIPPLE ====================
   * @param userId
   * @param echoId
   * @param content
   * @param parentId
   * @returns
   */
  async createRipple(
    userId: string,
    echoId: string,
    content: string,
    parentId?: string | null,
  ) {
    const { notificationNeeded, ripple } = await this.rippleRepo.createRipple(
      userId,
      echoId,
      content,
      parentId,
    );
    //* Send notification if needed
    return ripple;
  }
  /**
   * TODO ======================= GET REPLIES OF A GIVEN RIPPLE =======
   * @param echoId
   * @param parentId
   * @returns
   */
  async getChildrenRipples(echoId: string, parentId: string) {
    const replies = await this.rippleRepo.getReplies(parentId, echoId);
    return replies;
  }

  /**
   * TODO ============= GET PAGINATED REPLIES OF A GIVEN ECHO ========
   * @param echoId
   * @param page
   * @param limit
   * @returns
   */
  async getEchoRipples(echoId: string, page: number = 1, limit: number = 10) {
    const { ripples, total } = await this.rippleRepo.getRipplesByEchoId(
      echoId,
      page,
      limit,
    );
    const totalPages = Math.ceil(total / limit);
    return {
      ripples,
      total,
      hasNextPage: totalPages > page,
      currentPage: page,
      totalPages,
      limit,
      hasPrevPage: page > 1,
    };
  }

  /**
   * TODO ============== UPDATE A RIPPLE ===============
   * @param userId
   * @param rippleId
   * @param contentUpdate
   * @returns
   */
  async updateRipple(userId: string, rippleId: string, contentUpdate: string) {
    const { content, createdAt } = await this.rippleRepo.updateRipple(
      userId,
      rippleId,
      contentUpdate,
    );
    return { content, createdAt };
  }
  /**
   * TODO =============== DELETE THE RIPPLE ================
   * @param userId 
   * @param rippleId 
   * @returns 
   */
  async deleteRipple(userId: string, rippleId: string) {
    return await this.rippleRepo.softDeleteRipple(rippleId, userId);
  }
}
