/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from '../auth/dto/user-response.dto';
import { AuditLogService } from '../../common/services/audit.service';
import { AuditAction, AuditResource } from '../../common/enums/audit.enums';
import { User } from '../auth/entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Follow } from './follow/entities/follow.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly cloudinary: CloudinaryService,
    private readonly auditService: AuditLogService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  /**
   * TODO ==================== GET LOGGED USER PROFILE ============
   * @param userId
   * @param ip
   * @param userAgent
   * @returns
   */
  async getMe(userId: string, ip?: string, userAgent?: string) {
    //* 0.Check if the username is in the cache
    const cacheKey = `user_id:${userId}`;
    const cached = await this.cacheManager.get(cacheKey);
    //* If so return it
    if (cached) return cached;
    //* 1.Perform read operation on the database
    try {
      const user = await this.userRepo
        .createQueryBuilder('user')
        .loadRelationCountAndMap('user.followersCount', 'user.followers')
        .loadRelationCountAndMap('user.followingCount', 'user.following')
        .where('user.id = :id', { id: userId })
        .getOne();

      //* 2.Audit
      await this.auditService.createLog({
        action: AuditAction.PROFILE_VIEWED,
        resource: AuditResource.USER,
        ip,
        userAgent,
        userId,
      });
      if (!user) throw new NotFoundException('User not found');
      const transformUser = plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      });
      // * 3. Cache the transformed User
      await this.cacheManager.set(cacheKey, transformUser, 300_000);
      return transformUser;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  /**
   * TODO ======================= FIND USER BY USERNAME ===============
   * @param username
   * @param ip
   * @param userAgent
   * @returns
   */
  async getUserProfile(
    username: string,
    currentUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    //* 0. Check the cache first and if is a hit, return it
    const cacheKey = `user_profile:${username}`;
    const cache = await this.cacheManager.get(cacheKey);
    if (cache) return cache;
    try {
      //* 1.Fetch user by name
      const user = await this.userRepo
        .createQueryBuilder('user')
        .where('user.username = :username', { username })
        .loadRelationCountAndMap('user.followersCount', 'user.followers')
        .loadRelationCountAndMap('user.followingCount', 'user.following')
        .loadRelationCountAndMap('user.postCount', 'user.posts')
        .getOne();

      if (!user) throw new NotFoundException(`${username} is not found`);

      //* 2. Check if current user is following this user
      const followRecord = await this.userRepo
        .createQueryBuilder()
        .from(Follow, 'f')
        .where('f.followerId = :currentUserId', { currentUserId })
        .andWhere('f.followingId = :userId', { userId: user.id })
        .andWhere('f.deletedAt IS NULL')
        .select('1')
        .getRawOne();
      user.isFollowing = !!followRecord;

      //* 3.Audit the view
      await this.auditService.createLog({
        action: AuditAction.PROFILE_VIEWED,
        resource: AuditResource.USER,
        ip,
        userAgent,
      });
      //* 4.Transform and return the user
      const transformedUser = plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      });
      //* 5.Cache the transformed user
      await this.cacheManager.set(cacheKey, transformedUser, 300_000); //? 5 minutes
      return transformedUser;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  /**
   * TODO =============== UPDATE CURRENT USER PROFILE ==========
   * @param userId
   * @param dto
   * @param ip
   * @param userAgent
   * @returns ->//? This function returns user with updated fields
   */
  async updateProfile(
    userId: string,
    dto: UpdateUserDto,
    ip?: string,
    userAgent?: string,
    file?: Express.Multer.File,
  ) {
    try {
      //* 1.Get specific user by id
      const user = await this.userRepo.findOne({
        where: { id: userId },
        select: {
          id: true,
          emailVerified: true,
          avatarPublicId: true,
          username: true,
        },
      });
      if (!user) throw new NotFoundException('User not found');
      let avatarUrl: string | null = '';
      let publicId: string | null = '';
      let resourceType: string | null = '';

      //* 2. Upload the avatar to cloudinary
      console.log('outside log');
      if (file) {
        console.log('inside log');
        const uploadResult = (await this.cloudinary.uploadImage(file)) as {
          url: string;
          secure_url: string;
          public_id: string;
          resource_type: string;
        };
        avatarUrl = uploadResult?.secure_url;
        publicId = uploadResult.public_id;
        resourceType = uploadResult.resource_type;
        //! Delete the old avatar image if available
        if (user.avatarPublicId) {
          await this.cloudinary.deleteFile(
            user.avatarPublicId,
            user.resourceType,
          );
        }
      }
      //* 3.Prevent empty Updates
      if (
        Object.keys(dto).length === 0 &&
        (avatarUrl === '' || publicId === '')
      )
        throw new BadRequestException('No fields for update');
      //? Check if the user is updating the email.
      let emailVerified = user.emailVerified;
      if (dto.email) {
        emailVerified = false;
      }
      //* 4.Patch the user profile
      const updateData: any = {
        id: userId,
        ...dto,
        emailVerified,
      };
      if (file && avatarUrl) {
        updateData.avatar = avatarUrl;
        updateData.avatarPublicId = publicId;
        updateData.resourceType = resourceType;
      }
      await this.userRepo.save(updateData);
      //* 5. Fetch the user
      const updatedUser = await this.userRepo.findOneBy({ id: userId });

      //todo=> 6.Invalidate the cache
      if (updatedUser) {
        await this.cacheManager.del(`user_profile:${user.username}`);
        await this.cacheManager.del(`user_id:${updatedUser.id}`);
      }

      //* 7. Log the action
      await this.auditService.createLog({
        action: AuditAction.USER_UPDATED,
        resource: AuditResource.USER,
        ip,
        userAgent,
        userId,
        metadata: {
          changes: Object.keys(dto),
        },
      });
      //* 6.Transform and return the user
      return plainToInstance(UserResponseDto, updatedUser, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  async deleteAccount(userId: string, ip?: string, userAgent?: string) {
    try {
      //* 1.Check if the user exists
      const user = await this.userRepo.findOne({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          avatar: true,
          avatarPublicId: true,
          resourceType: true,
        },
        withDeleted: true,
      });
      if (!user) throw new NotFoundException('user not found');
      //* 2. Delete the image avatar if available
      if (user.avatarPublicId && user.resourceType) {
        await this.cloudinary.deleteFile(
          user.avatarPublicId,
          user.resourceType,
        );
      }
      //* 3. Delete user,refresh tokens and all audits for that user
      if (user) {
        const response = await this.userRepo.softDelete(user.id);
        //* 4.Audit the action
        await this.auditService.createLog({
          action: AuditAction.USER_DELETED,
          resource: AuditResource.USER,
          ip,
          userAgent,
          userId: user.id,
          metadata: {
            username: user.username,
            avatar: user.avatar,
          },
        });
        //* 5.Revoke all tokens
        return response;
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
