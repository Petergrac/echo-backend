import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FollowUser,
  PaginatedResponse,
  ToggleFollowResponse,
} from '../../../common/types/follow.types';
import { FollowRepository } from '../repository/follow.repository';
import { NotificationService } from '../../notification/notifications.service';
import { NotificationType } from '../../../generated/prisma/enums';

interface dataType {
  targetUserId: string;
  fromUserId: string;
  type: NotificationType;
}
@Injectable()
export class FollowService {
  constructor(
    private readonly followRepository: FollowRepository,
    private readonly notificationService: NotificationService,
  ) {}
  /**
   * TODO ------===================== TOGGLE FOLLOW ===========
   * @param targetUserId
   * @param currentUserId
   * @returns //* the action(followed or unfollowed) and following
   */

  async toggleFollow(
    targetUserId: string,
    currentUserId: string,
  ): Promise<ToggleFollowResponse> {
    //* 1. Prevent self-follow
    if (targetUserId === currentUserId) {
      throw new ForbiddenException('You cannot follow yourself');
    }

    const existingFollow = await this.followRepository.findExistingFollow(
      currentUserId,
      targetUserId,
    );

    if (existingFollow) {
      //* 2. Unfollow if already following
      await this.followRepository.deleteFollowById(existingFollow.id);
      return { action: 'unfollowed', following: null };
    } else {
      //* 3. Follow if not already following
      const result = await this.followRepository.createFollow(
        currentUserId,
        targetUserId,
      );
      //* 4. Create follow notification
      await this.notificationService.createNotification({
        fromUserId: currentUserId,
        targetUserId,
        type: 'FOLLOW',
      });
      return { action: 'followed', following: result.following };
    }
  }

  /**
   * TODO ======================= UNFOLLOW A USER ================
   * @param targetUserId
   * @param currentUserId
   * @returns //* This function return a message when you successfully unfollow a user
   */
  async unfollowUser(
    targetUserId: string,
    currentUserId: string,
  ): Promise<{ message: string }> {
    //* 1. Prevent self-unfollow (though it shouldn't happen, but good to check)
    if (targetUserId === currentUserId) {
      throw new ForbiddenException('Invalid operation');
    }
    //* 2. Check if you are following the user
    const existingFollow = await this.followRepository.findExistingFollow(
      currentUserId,
      targetUserId,
    );

    if (!existingFollow) {
      throw new NotFoundException('You are not following this user');
    }
    //* 3. Delete the record(unfollow)
    await this.followRepository.deleteFollowById(existingFollow.id);

    return { message: 'Successfully unfollowed user' };
  }
  /**
   * TODO ====================== GET SPECIFIC USER'S FOLLOWERS =======
   * @param userId
   * @param page -> navigate page by page
   * @param limit -> list the limit of follow per request
   * @returns //* List of followers of a given user page by page
   */
  async getFollowers(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<FollowUser>> {
    //* 1. Validate pagination parameters
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, Math.min(limit, 100)); //? Cap at 100 per page

    return await this.followRepository.getFollowers(
      userId,
      validPage,
      validLimit,
    );
  }
  /**
   * TODO ===================== GET ALL THE USERS YOU ARE FOLLOWING =========
   * @param userId
   * @param page
   * @param limit
   * @returns //* List of users the current user is following
   */
  async getFollowing(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<FollowUser>> {
    //* 1. Validate pagination parameters
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, Math.min(limit, 100));

    return await this.followRepository.getFollowing(
      userId,
      validPage,
      validLimit,
    );
  }
  /**
   * TODO========================= GET THE FOLLOW STATUS OF THE USER
   * @param currentUserId
   * @param targetUserId
   * @returns //* boolean of isFollowing the target user.
   */
  async getFollowStatus(
    currentUserId: string,
    targetUserId: string,
  ): Promise<{ isFollowing: boolean }> {
    if (currentUserId === targetUserId) {
      return { isFollowing: false };
    }

    const isFollowing = await this.followRepository.isFollowing(
      currentUserId,
      targetUserId,
    );
    return { isFollowing };
  }
}
