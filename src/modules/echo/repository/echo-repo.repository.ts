import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import { CreateEchoDto } from '../dto/create-echo.dto';
import { UpdateEchoDto } from '../dto/update-echo.dto';

export interface MediaDataType {
  url: string;
  mimetype: string;
  publicId: string;
  resourceType?: string;
}

@Injectable()
export class EchoRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * TODO ============================ CREATE ECHO ============================
   * @param userId // ID of the user creating the Echo
   * @param dto // Data Transfer Object containing Echo content
   * @param mediaData // Optional media data associated with the Echo
   * @returns // Create a new Echo record in the database
   */
  async createEcho(
    userId: string,
    dto: CreateEchoDto,
    mediaData?: MediaDataType[],
  ) {
    try {
      const result = await this.prisma.echo.create({
        data: {
          content: dto.content?.trim(),
          authorId: userId,
          media: {
            create: mediaData,
          },
        },
        include: {
          media: true,
          author: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });
      return result;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Failed to create Echo');
    }
  }
  /**
   * TODO ============================ FIND ECHO BY ID ============================
   * @param id
   * @returns // Find an Echo by its ID
   */
  async findById(id: string) {
    try {
      return await this.prisma.echo.findFirst({
        where: {
          id,
          deleted: false,
        },
        include: {
          media: true,
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to find the echo');
    }
  }

  /**
   * TODO ============================ UPDATE ECHO ============================
   * @param echoId
   * @param data
   * @returns // Update an Echo by its ID
   */
  async updateEcho(echoId: string, data: UpdateEchoDto) {
    try {
      return await this.prisma.echo.update({
        where: { id: echoId },
        data: {
          content: data.content?.trim(),
          // Add other fields as needed
        },
        include: {
          media: true,
          author: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to update echo');
    }
  }
  /**
   * TODO ============================ SOFT DELETE ECHO ============================
   * @param echoId
   * @returns
   */
  async softDeleteEcho(echoId: string) {
    try {
      return await this.prisma.echo.update({
        where: { id: echoId },
        data: { deleted: true },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete echo');
    }
  }

  /**
   * TODO ============================ FIND ECHO BY USER ID ============================
   * @param userId // ID of the user whose Echoes to retrieve
   * @param skip // Number of records to skip for pagination
   * @param take // Number of records to take for pagination
   * @returns // Retrieve Echoes by user ID with pagination
   */
  async findByUserId(userId: string, skip: number = 0, take: number = 10) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new InternalServerErrorException('User not found');
    }
    try {
      return await this.prisma.echo.findMany({
        where: {
          authorId: userId,
          deleted: false,
        },
        include: {
          media: true,
          author: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch user echoes');
    }
  }

  /**
   * TODO ============================ COUNT ECHO BY USER ID ============================
   * @param userId
   * @returns
   */
  async countByUserId(userId: string): Promise<number> {
    try {
      return await this.prisma.echo.count({
        where: {
          authorId: userId,
          deleted: false,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to count user echoes');
    }
  }
}
