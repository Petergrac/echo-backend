import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';

@Injectable()
export class UserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async getUserById(userId: string) {
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
    return user;
  }

  async getUserByUserName(username: string) {
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
    return userDetails;
  }

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
}
