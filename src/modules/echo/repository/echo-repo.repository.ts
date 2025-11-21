import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BaseRepository } from '../../../common/base/repository.base';
import { PrismaService } from '../../../common/services/prisma.service';
import { CreateEchoDto, MediaType } from '../dto/create-echo.dto';
import { PrismaClient } from '../../../generated/prisma/client';

@Injectable()
export class EchoRepository extends BaseRepository {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * TODO ========================== CREATE ECHO ================
   * @param userId
   * @param dto
   * @param media
   * @returns
   */
  async createEcho(userId: string, dto?: CreateEchoDto, media?: MediaType[]) {
    const content = dto?.content?.trim() ?? null;
    const hasContent = !!content;
    const hasMedia = media && media.length > 0;

    //* 1.Validate input
    if (!hasContent && !hasMedia) {
      throw new Error('Echo must have either content or media');
    }

    //* 2.Use transaction only when media is present
    if (hasMedia) {
      return this.createEchoWithMedia(userId, content, media);
    } else {
      return this.createEchoWithoutMedia(userId, content);
    }
  }

  /**
   *TODO ================================ PRIVATE METHODS ==================
   * @param userId
   * @param content
   * @returns
   */
  private async createEchoWithoutMedia(userId: string, content: string | null) {
    return this.prisma.echo.create({
      data: {
        authorId: userId,
        content,
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
  }

  private async createEchoWithMedia(
    userId: string,
    content: string | null,
    media: MediaType[],
  ) {
    return this.executeTransaction(async (prisma: PrismaClient) => {
      //* 1.Create echo
      const echo = await prisma.echo.create({
        data: {
          authorId: userId,
          content,
        },
      });

      //* 2.Create media records
      const mediaRecords = await Promise.all(
        media.map((file) =>
          prisma.media.create({
            data: {
              echoId: echo.id,
              url: file.url,
              publicId: file.publicId,
              resourceType: file.resourceType,
              mimetype: file.mimetype,
            },
          }),
        ),
      );

      //* 3.Get author info
      const author = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      });

      return {
        ...echo,
        media: mediaRecords,
        author,
      };
    });
  }

  /**
   * TODO ================ GET ECHO BY ID ================
   * @param id
   * @returns
   */
  async getEchoById(id: string) {
    const echo = await this.prisma.echo.findUnique({
      where: { id, deleted: false },
      include: {
        media: true,
        author: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            reechoes: true,
            ripples: true,
            bookmarks: true,
            likes: true,
          },
        },
      },
    });
    if (!echo) throw new NotFoundException('Echo not found');
    return echo;
  }

  /**
   * TODO ======================= SOFT DELETE ECHO =============
   * @param userId
   * @param echoId
   * @returns
   */
  async deleteEchoById(userId: string, echoId: string) {
    //* 1.Get the echo author id
    const author = await this.prisma.echo.findUnique({
      where: { id: echoId },
      select: { authorId: true, media: true },
    });
    if (!author) throw new NotFoundException('Echo does not exist');

    //* 2.Verify the author
    const isAuthor = author?.authorId === userId;
    if (!isAuthor)
      throw new ForbiddenException('You can only delete your own echoes');
    //* 3.Soft delete echo
    await this.prisma.echo.update({
      where: { id: echoId },
      data: {
        deleted: true,
      },
    });
    return { deleted: true };
  }
  /**
   * TODO ========================== COMPLETE  DELETE ECHOES ===========
   * @returns
   */
  async forceDeleteEchoBatch() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      //* 1. First, get just the IDs of echoes to delete
      const echoesToDelete = await this.prisma.echo.findMany({
        where: {
          deleted: true,
          updatedAt: {
            lte: thirtyDaysAgo,
          },
        },
        select: {
          id: true,
        },
      });
      if (echoesToDelete.length === 0) {
        return { deletedCount: 0, message: 'No echoes to permanently delete' };
      }
      const echoIds = echoesToDelete.map((echo) => echo.id);
      //* 2. Get media files for cleanup before deletion
      const mediaFiles = await this.prisma.media.findMany({
        where: {
          echoId: { in: echoIds },
        },
        select: {
          publicId: true,
          resourceType: true,
        },
      });
      //* 3. Delete all related data in batch operations
      const result = await this.executeTransaction(
        async (prisma: PrismaClient) => {
          //* Delete all related records in batches
          await prisma.media.deleteMany({
            where: { echoId: { in: echoIds } },
          });
          await prisma.like.deleteMany({
            where: { echoId: { in: echoIds } },
          });
          await prisma.ripple.deleteMany({
            where: { echoId: { in: echoIds } },
          });
          await prisma.reEcho.deleteMany({
            where: { echoId: { in: echoIds } },
          });
          await prisma.bookmark.deleteMany({
            where: { echoId: { in: echoIds } },
          });
          await prisma.echoHashtag.deleteMany({
            where: { echoId: { in: echoIds } },
          });
          await prisma.notification.deleteMany({
            where: { echoId: { in: echoIds } },
          });
          //* Finally delete the echoes
          const deleteResult = await prisma.echo.deleteMany({
            where: { id: { in: echoIds } },
          });
          return {
            deletedEchoCount: deleteResult.count,
            mediaFiles,
          };
        },
      );
      return {
        deletedCount: result.deletedEchoCount,
        mediaFiles,
        mediaFilesDeleted: mediaFiles.length,
        message: `Permanently deleted ${result.deletedEchoCount} echoes and ${mediaFiles.length} media files`,
      };
    } catch (error) {
      console.error('Error in forceDeleteEchoBatch:', error);
      throw new Error('Failed to permanently delete echoes');
    }
  }
}
