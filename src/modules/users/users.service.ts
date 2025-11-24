import {
  BadRequestException,
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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly cloudinary: CloudinaryService,
    private readonly auditService: AuditLogService,
  ) {}
  /**
   * TODO ==================== GET LOGGED USER PROFILE ============
   * @param userId
   * @param ip
   * @param userAgent
   * @returns
   */
  async getMe(userId: string, ip?: string, userAgent?: string) {
    //* 1.Perform read operation on the database
    try {
      const user = await this.userRepo.findOneBy({
        id: userId,
      });
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
  async getUserProfile(username: string, ip?: string, userAgent?: string) {
    try {
      //* 1.Fetch user by name
      const user = await this.userRepo.findOneBy({
        username,
      });
      if (!user) throw new NotFoundException(`${username} is not found`);

      //* 2.Audit the view
      await this.auditService.createLog({
        action: AuditAction.PROFILE_VIEWED,
        resource: AuditResource.USER,
        ip,
        userAgent,
      });
      //* Transform and return the user
      return plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      });
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
        select: { id: true, emailVerified: true, avatarPublicId: true },
      });
      if (!user) throw new NotFoundException('User not found');
      let avatarUrl: string | null = '';
      let publicId: string | null = '';
      let resourceType: string | null = '';

      //* 2. Upload the avatar to cloudinary
      if (file) {
        const uploadResult = (await this.cloudinary.uploadImage(file)) as {
          url: string;
          secure_url: string;
          public_id: string;
          resource_type: string;
        };
        avatarUrl = uploadResult?.url ?? uploadResult?.secure_url;
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
      await this.userRepo.save({
        id: userId,
        avatar: avatarUrl,
        avatarPublicId: publicId,
        ...dto,
        emailVerified,
        resourceType,
      });
      //* 5. Fetch the user
      const updatedUser = await this.userRepo.findOneBy({ id: userId });
      //* 5. Log the action
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
