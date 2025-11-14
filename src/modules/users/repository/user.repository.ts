import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CloudinaryService } from '../../../common/cloudinary/cloudinary.service';
import { UserSelect } from '../../../generated/prisma/models';

@Injectable()
export class UserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /**
   * /// TODO =================== GET USER DETAILS USING ID ============
   * @param userId
   * @param fields
   * @returns //* This function will return user with the specified id
   */
  async getUserById(userId: string, fields: UserSelect) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: { ...fields },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
  /**
   * /// TODO =================== GET USER DETAILS USING USERNAME ============
   * @param username
   * @param fields
   * @returns //* This function will return user with the specified name
   */
  async getUserByUserName(username: string, fields: UserSelect) {
    const userDetails = await this.prisma.user.findUnique({
      where: { username },
      select: { ...fields },
    });
    if (!userDetails) throw new NotFoundException(`${username} not Found`);
    return userDetails;
  }
  /**
   * /// TODO =================== UPDATE SPECIFIC USER DETAILS ============
   * @param userId
   * @param dto //* User Details
   * @param avatarUrl //* This is the updated avatar url, with it's public_url
   * @param publicId //? This tracks the old avatar in case user uploads new one
   * @returns //* This method will return specified user details
   */
  async updateUserDetails(
    userId: string,
    dto: UpdateUserDto,
    avatarUrl?: string,
    publicId?: string,
  ) {
    //TODO =====> Check if the user has already uploaded the avatar & delete it ===
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarPublicId: true },
    });
    //* Delete the old image if public id is available
    if (user?.avatarPublicId && publicId) {
      await this.cloudinary.deleteImage(user.avatarPublicId);
    }
    //? Update the database
    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...dto,
        ...(avatarUrl && { avatar: avatarUrl, avatarPublicId: publicId }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        bio: true,
        location: true,
        website: true,
        avatar: true,
        updatedAt: true,
      },
    });
    return updatedUser;
  }

  /**
   * /// TODO =================== DELETE SPECIFIC USER ACCOUNT ============
   * @param userId
   * //* This method will delete all user info including the session tokens and activity logs
   */
  async deleteUserAccount(userId: string) {
    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.emailToken.deleteMany({ where: { userId } }),
      this.prisma.auditLog.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
    return { message: 'Account deleted successfully ' };
  }

  /**
   * /// TODO =================== GET ALL USERS (ADMIN ROUTE)============
   */
  async getAllUsers({
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
    //*TODO Filter Conditions
    const where: Record<string, object | string> = {};
    //TODO => BY QUERY
    if (search) {
      where.username = {
        contains: search,
        mode: 'insensitive',
      };
    }
    //TODO => BY ROLE
    if (role) {
      where.role = role;
    }
    //TODO ===> GET NUMBER OF USERS => For creating pages
    const totalUsers = await this.prisma.user.count({ where });
    //TODO =====> GET USERS BASED ON THE WHERE CONDITION
    const users = await this.prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        location: true,
        website: true,
        avatar: true,
        emailVerified: true,
      },
    });
    //TODO =====> CALCULATE NUMBER OF PAGES BASED ON USERS
    const totalPages = Math.ceil(totalUsers / limit);
    // TODO ======> RETURN THE RESULT
    return {
      data: users,
      meta: {
        total: totalUsers,
        page,
        limit,
        totalPages,
        previousPage: page > 1 ? page - 1 : null,
        nextPage: page < totalPages ? page + 1 : null,
      },
    };
  }
}
