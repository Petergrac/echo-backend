import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Follow } from './entities/follow.entity';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { AuditLogService } from '../../../common/services/audit.service';
import { AuditAction, AuditResource } from '../../../common/enums/audit.enums';

@Injectable()
export class FollowService {
  constructor(
    @InjectRepository(Follow) private readonly followRepo: Repository<Follow>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly auditService: AuditLogService,
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

      return { status: 'FOLLOWED', target: target.username };
    }

    //* NEW FOLLOW
    const newFollow = this.followRepo.create({
      follower: { id: currentUserId },
      following: { id: target.id },
    });

    await this.followRepo.save(newFollow);

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
    username: string | null,
    viewerId: string,
    ip?: string,
    userAgent?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    //* If username is null → get my followers
    const targetUser = username
      ? await this.userRepo.findOne({
          where: { username },
          select: { id: true, username: true },
        })
      : await this.userRepo.findOne({
          where: { id: viewerId },
          select: { id: true, username: true },
        });

    if (!targetUser) throw new NotFoundException('User not found');

    const [followers, totalCount] = await this.followRepo.findAndCount({
      where: { following: { id: targetUser.id } },
      relations: ['follower'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

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

    return {
      followers: followers.map((f) => f.follower),
      currentPage: page,
      limit,
      hasNextPage: totalCount > page * limit,
      hasPrevPage: page > 1,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  //* ===================================================
  //TODO => GET WHO A USER FOLLOWS (OR WHO I FOLLOW)
  //* ===================================================
  async getUserFollowing(
    username: string | null,
    viewerId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const targetUser = username
      ? await this.userRepo.findOne({
          where: { username },
          select: { id: true, username: true },
        })
      : await this.userRepo.findOne({
          where: { id: viewerId },
          select: { id: true, username: true },
        });

    if (!targetUser) throw new NotFoundException('User not found');

    const [followingEntities, totalCount] = await this.followRepo.findAndCount({
      where: { follower: { id: targetUser.id } },
      relations: ['following'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);
    return {
      following: followingEntities.map((f) => f.following),
      currentPage: page,
      totalPages,
      limit,
      totalCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }
}
