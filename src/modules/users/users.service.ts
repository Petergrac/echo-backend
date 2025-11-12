import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * TODO ============= GET THE CURRENT USER ==================
   * @param userId
   * @returns //* The logged user details
   */
  async getMe(userId: string, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
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
    const userDetails = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
      },
    });
    if (!userDetails) throw new NotFoundException(`${username} not Found`);
    //? Audit the view
    await this.auditService.log(userDetails.id, 'PROFILE_VIEWED', {
      ip,
      userAgent,
    });
    return userDetails;
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
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    //*Prevent empty Updates
    if (Object.keys(dto).length === 0)
      throw new BadRequestException('No fields for update');
    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: { ...dto },
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
    await this.auditService.log(userId, 'PROFILE_UPDATED', { ip, userAgent });
    return updatedUser;
  }
}
