import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Follow } from './entities/follow.entity';
import { In, Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { AuditLogService } from '../../../common/services/audit.service';
import { AuditAction, AuditResource } from '../../../common/enums/audit.enums';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from '../../auth/dto/user-response.dto';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class FollowService {
  constructor(
    //* Repositories
    @InjectRepository(Follow) private readonly followRepo: Repository<Follow>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,

    //* services
    private readonly auditService: AuditLogService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly notificationService: NotificationsService,
  ) {}

  //* ===================================================
  //TODO=> TOGGLE FOLLOW (FOLLOW/UNFOLLOW)
  //* ===================================================
  async toggleFollow(
    currentUserId: string,
    username: string,
    ip?: string,
    userAgent?: string,
  ) {
    const cacheKey = `user_profile:${username}`;
    await this.cacheManager.del(cacheKey);
    const target = await this.userRepo.findOne({
      where: { username },
      select: { id: true, username: true },
    });
    if (!target) throw new NotFoundException('User not found');
    if (target.id === currentUserId)
      throw new ForbiddenException('You cannot follow yourself');

    const existing = await this.followRepo.findOne({
      where: {
        follower: { id: currentUserId },
        following: { id: target.id },
      },
      withDeleted: true,
    });

    //* UNFOLLOW
    if (existing && !existing.deletedAt) {
      await this.followRepo.softDelete(existing.id);

      await this.auditService.createLog({
        action: AuditAction.USER_UNFOLLOWED,
        resource: AuditResource.USER,
        userId: currentUserId,
        ip,
        userAgent,
        metadata: {
          targetUserId: target.id,
          targetUsername: target.username,
        },
      });

      return { status: 'UNFOLLOWED', target: target.username };
    }

    //* RESTORE FOLLOW
    if (existing && existing.deletedAt) {
      await this.followRepo.restore(existing.id);

      await this.auditService.createLog({
        action: AuditAction.USER_FOLLOWED,
        resource: AuditResource.USER,
        userId: currentUserId,
        ip,
        userAgent,
        metadata: {
          targetUserId: target.id,
          targetUsername: target.username,
          restored: true,
        },
      });
      //* SEND FOLLOW NOTIFICATION
      await this.notificationService.createNotification({
        type: NotificationType.FOLLOW,
        recipientId: target.id,
        actorId: currentUserId,
      });
      return { status: 'FOLLOWED', target: target.username };
    }

    //* NEW FOLLOW
    const newFollow = this.followRepo.create({
      follower: { id: currentUserId },
      following: { id: target.id },
    });

    await this.followRepo.save(newFollow);

    //* SEND FOLLOW NOTIFICATION(NEW)
    await this.notificationService.createNotification({
      type: NotificationType.FOLLOW,
      recipientId: target.id,
      actorId: currentUserId,
    });
    //* Log the action
    await this.auditService.createLog({
      action: AuditAction.USER_FOLLOWED,
      resource: AuditResource.USER,
      userId: currentUserId,
      ip,
      userAgent,
      metadata: {
        targetUserId: target.id,
        targetUsername: target.username,
      },
    });

    return { status: 'FOLLOWED', target: target.username };
  }

  //* ===================================================
  //TODO=> GET FOLLOWERS OF ANY USER (OR MYSELF)
  //* ===================================================
  async getUserFollowers(
    username: string,
    viewerId: string,
    ip?: string,
    userAgent?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    //* Get all the followers
    const targetUser = await this.userRepo.findOne({
      where: { username },
      select: { id: true, username: true },
    });

    if (!targetUser) throw new NotFoundException('User not found');

    const [followRows, totalCount] = await this.followRepo.findAndCount({
      where: { following: { id: targetUser.id } },
      relations: ['follower'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const followerUsers = followRows.map((f) => f.follower);
    const followerIds = followerUsers.map((f) => f.id);
    //* Viewer follow relations
    const viewerFollows = await this.followRepo.find({
      where: {
        follower: { id: viewerId },
        following: { id: In(followerIds) },
      },
      select: {
        following: { id: true },
      },
      relations: ['following'],
    });
    const followsViewer = await this.followRepo.find({
      where: {
        following: { id: viewerId },
        follower: { id: In(followerIds) },
      },
      select: {
        follower: { id: true },
      },
      relations: ['follower'],
    });
    //* Lookup set
    const viewerFollowingSet = new Set(
      viewerFollows.map((f) => f.following.id),
    );
    const followsViewSet = new Set(followsViewer.map((f) => f.follower.id));

    //* Get followers & following counts in batch
    const followersCountRows = await this.getFollowersCount(followerIds);
    const followingCountRows = await this.getFollowingCounts(followerIds);

    const followersCountMap = new Map(
      followersCountRows.map((r) => [r.userId, Number(r.count)]),
    );
    const followingCountMap = new Map(
      followingCountRows.map((r) => [r.userId, Number(r.count)]),
    );
    //* Log viewed followers
    await this.auditService.createLog({
      action: AuditAction.PROFILE_VIEWED_FOLLOWERS,
      resource: AuditResource.USER,
      userId: viewerId,
      ip,
      userAgent,
      metadata: {
        viewedUser: targetUser.username,
        viewedUserId: targetUser.id,
      },
    });
    const enrichedFollowers = followerUsers.map((user) => ({
      ...plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      }),
      followersCount: followersCountMap.get(user.id) ?? 0,
      followingCount: followingCountMap.get(user.id) ?? 0,
      viewerFollows: viewerFollowingSet.has(user.id),
      followsViewer: followsViewSet.has(user.id),
      isMutual: viewerFollowingSet.has(user.id) && followsViewSet.has(user.id),
    }));
    return {
      followers: enrichedFollowers,
      pagination: {
        currentPage: page,
        totalItems: totalCount,
        hasNextPage: totalCount > page * limit,
        hasPrevPage: page > 1,
      },
    };
  }

  //* ===================================================
  //TODO => GET WHO A USER FOLLOWS (OR WHO I FOLLOW)
  //* ===================================================
  async getUserFollowing(
    username: string,
    viewerId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    //* Get target user
    const targetUser = await this.userRepo.findOne({
      where: { username },
      select: { id: true, username: true },
    });
    if (!targetUser) throw new NotFoundException('User not found');

    //* Get following entities
    const [followingRows, totalCount] = await this.followRepo.findAndCount({
      where: { follower: { id: targetUser.id } },
      relations: ['following'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const followingUsers = followingRows.map((f) => f.following);
    const followingIds = followingUsers.map((u) => u.id);

    //* Viewer follows these users?
    const viewerFollows = await this.followRepo.find({
      where: {
        follower: { id: viewerId },
        following: { id: In(followingIds) },
      },
      select: { following: { id: true } },
      relations: ['following'],
    });

    //* Do these users follow the viewer?
    const followsViewer = await this.followRepo.find({
      where: {
        follower: { id: In(followingIds) },
        following: { id: viewerId },
      },
      select: { follower: { id: true } },
      relations: ['follower'],
    });

    const viewerFollowingSet = new Set(
      viewerFollows.map((f) => f.following.id),
    );
    const followsViewerSet = new Set(followsViewer.map((f) => f.follower.id));

    //* Get counts in batch
    const followersCountRows = await this.getFollowersCount(followingIds);
    const followingCountRows = await this.getFollowingCounts(followingIds);

    const followersCountMap = new Map(
      followersCountRows.map((r) => [r.userId, Number(r.count)]),
    );
    const followingCountMap = new Map(
      followingCountRows.map((r) => [r.userId, Number(r.count)]),
    );

    //* Enrich users
    const enrichedFollowing = followingUsers.map((user) => ({
      ...plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      }),
      followersCount: followersCountMap.get(user.id) ?? 0,
      followingCount: followingCountMap.get(user.id) ?? 0,
      viewerFollows: viewerFollowingSet.has(user.id),
      followsViewer: followsViewerSet.has(user.id),
      isMutual:
        viewerFollowingSet.has(user.id) && followsViewerSet.has(user.id),
    }));

    const totalPages = Math.ceil(totalCount / limit);
    return {
      following: enrichedFollowing,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  //todo ==================== PRIVATE METHODS ============
  private async getFollowersCount(followerIds: string[]) {
    const followersCounts = await this.followRepo
      .createQueryBuilder('f')
      .select('f.followingId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('f.followingId IN (:...ids)', { ids: followerIds })
      .groupBy('f.followingId')
      .getRawMany();
    return followersCounts as Array<{ userId: string; count: string }>;
  }
  private async getFollowingCounts(followerIds: string[]) {
    const followingCounts = await this.followRepo
      .createQueryBuilder('f')
      .select('f.followerId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('f.followerId IN (:...ids)', { ids: followerIds })
      .groupBy('f.followerId')
      .getRawMany();
    return followingCounts as Array<{ userId: string; count: string }>;
  }
}
