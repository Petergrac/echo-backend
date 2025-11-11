import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditService } from '../auth/audit.service';

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
}
