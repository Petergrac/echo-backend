import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';

@Injectable()
export class FollowRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   *TODO========== Find existing follow relationship
   * */
  async findExistingFollow(followerId: string, followingId: string) {
    return await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
  }
  //TODO Create new follow relationship
  async createFollow(followerId: string, followingId: string) {
    const result = await this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return { following: result.following };
  }

  //TODO Delete follow relationship by ID
  async deleteFollowById(followId: string): Promise<void> {
    await this.prisma.follow.delete({
      where: {
        id: followId,
      },
    });
  }

  //TODO Get paginated followers
  async getFollowers(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: {
          followingId: userId,
        },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.follow.count({
        where: {
          followingId: userId,
        },
      }),
    ]);

    const followers = follows.map((follow) => follow.follower);

    return {
      data: followers,
      meta: {
        page,
        limit,
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  // Get paginated following
  async getFollowing(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: {
          followerId: userId,
        },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.follow.count({
        where: {
          followerId: userId,
        },
      }),
    ]);

    const following = follows.map((follow) => follow.following);

    return {
      data: following,
      meta: {
        page,
        limit,
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }
}
