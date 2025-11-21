import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../../common/services/audit.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { UserRepository } from './repository/user.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly auditService: AuditService,
    private readonly cloudinary: CloudinaryService,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * TODO ============= GET THE CURRENT USER ==================
   * @param userId
   * @returns //* The logged user details
   */
  async getMe(userId: string, ip?: string, userAgent?: string) {
    //*Perform read operation on the database
    const user = await this.userRepository.getUserById(userId, {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      bio: true,
      website: true,
      location: true,
      avatar: true,
    });

    //? Audit the view
    await this.auditService.log(userId, 'PROFILE_VIEWED', { ip, userAgent });
    return user;
  }

  /**
   * TODO ===============  GET DETAILS OF A SPECIFIC USER ==========
   * @param username
   * @returns //* The user details else 404
   */
  async getSpecificUserDetails(
    username: string,
    ip?: string,
    userAgent?: string,
  ) {
    //* Fetch user by name
    const user = await this.userRepository.getUserByUserName(username, {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      bio: true,
      website: true,
      location: true,
      avatar: true,
    });
    //? Audit the view
    await this.auditService.log(user.id, 'PROFILE_VIEWED', {
      ip,
      userAgent,
    });
    return user;
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
    //TODO ===> Perform Read on the database and get specific user
    const user = await this.userRepository.getUserById(userId, { id: true });
    if (!user) throw new NotFoundException('User not found');
    let avatarUrl: string | null = '';
    let publicId: string | null = '';

    //TODO ===> Upload the Image to cloudinary
    if (file) {
      const uploadResult = (await this.cloudinary.uploadImage(file)) as {
        url: string;
        secure_url: string;
        public_id: string;
      };
      avatarUrl = uploadResult?.url ?? uploadResult?.secure_url;
      publicId = uploadResult.public_id;
    }
    //*Prevent empty Updates
    if (Object.keys(dto).length === 0)
      throw new BadRequestException('No fields for update');

    //TODO ===> Perform PATCH on the database
    const updatedUser = await this.userRepository.updateUserDetails(
      userId,
      dto,
      avatarUrl,
      publicId,
    );
    //TODO ===> Log the ACTION =========
    await this.auditService.log(userId, 'PROFILE_UPDATED', {
      ip,
      userAgent,
      changes: Object.keys(dto),
    });
    return updatedUser;
  }

  /**
   *
   * TODO =============== DELETE A SPECIFIC USER ACCOUNT (ADMIN & OWNER) ==========
   * @param userId
   * @param ip
   * @param userAgent
   * @returns //* Deletes user account
   */
  async deleteAccount(
    userId: string,
    ip?: string,
    userAgent?: string,
    role?: 'ADMIN',
  ) {
    //* 1. First check if the user is available
    const user = await this.userRepository.getUserById(userId, {
      avatarPublicId: true,
      username: true,
    });
    //* 2. Delete the image avatar if available
    if (user.avatarPublicId) {
      try {
        await this.cloudinary.deleteFile(user.avatarPublicId, 'image');
      } catch (error) {
        console.error(
          'Failed to delete Cloudinary avatar:',
          (error as { message: string }).message,
        );
      }
    }

    //* 3. Delete refresh tokens and all audits for that user
    const response = await this.userRepository.deleteUserAccount(userId);

    //* 4. Log the deleted account,
    await this.auditService.log(userId, 'ACCOUNT_DELETED', {
      ip,
      userAgent,
      user: user.username,
    });
    //* 5. Log the deleted account if it is from user
    await this.auditService.log(userId, 'ACCOUNT_DELETED_BY_ADMIN', {
      ip,
      userAgent,
    });
    return response;
  }
  /**
   * TODO === ================ GET ALL USERS ============
   * @returns ==> //? Returns all users (admin only)
   */
  async getallUsers({
    page,
    limit,
    search,
    role,
  }: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
  }) {
    return this.userRepository.getAllUsers({ page, limit, search, role });
  }
}
