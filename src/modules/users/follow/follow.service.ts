import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { FollowRepository } from '../repository/follow.repository';
import { UserListResponseDto } from './dto/user-list-response.dto';

@Injectable()
export class FollowService {
  constructor(
    private readonly followRepository: FollowRepository,
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
  ) {
    //* 1. Prevent self-follow
    if (targetUserId === currentUserId) {
      throw new ForbiddenException('You cannot follow yourself');
    }
    //? Check if is already following
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
      return { action: 'followed', following: result.following };
    }
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
  ): Promise<UserListResponseDto> {
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
  ): Promise<UserListResponseDto> {
    //* 1. Validate pagination parameters
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, Math.min(limit, 100));

    return await this.followRepository.getFollowing(
      userId,
      validPage,
      validLimit,
    );
  }
}
