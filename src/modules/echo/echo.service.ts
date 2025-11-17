import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import {
  EchoRepository,
  MediaDataType,
} from './repository/echo-repo.repository';
import { AuditService } from '../../common/services/audit.service';
import { CreateEchoDto } from './dto/create-echo.dto';
import { UploadApiResponse } from 'cloudinary';
import { UpdateEchoDto } from './dto/update-echo.dto';
import { EchoResponseDto } from './dto/echo-response.dto';
import { PaginatedResponseDto, PaginationMetaDto } from './dto/pagination.dto';
import { HashtagService } from '../hashtag/hashtag.service';

@Injectable()
export class EchoService {
  constructor(
    private readonly cloudinary: CloudinaryService,
    private readonly repo: EchoRepository,
    private readonly audit: AuditService,
    private readonly hashtagService: HashtagService,
  ) {}
  /**
   * TODO ============================ CREATE ECHO ============================
   * @param userId // ID of the user creating the Echo
   * @param dto // Data Transfer Object containing Echo content
   * @param files // Optional media files to be uploaded
   * @param ip // IP address of the user
   * @param userAgent // User agent string of the user's device
   * @returns // Create a new Echo with optional media files
   */
  async createEcho(
    userId: string,
    dto: CreateEchoDto,
    files?: Express.Multer.File[],
    ip?: string,
    userAgent?: string,
  ) {
    //* 1. Validate that we have either text or files
    this.validateContentOrFiles(dto.content, files);

    let mediaData: MediaDataType[] = [];

    //* 2. If we have files, upload them to Cloudinary
    if (files && files.length) {
      mediaData = await this.uploadMediaFiles(files, dto.sensitivity);
    }
    //* 3. Create Echo record in DB
    const echo = await this.repo.createEcho(userId, dto, mediaData);

    if (dto.content) {
      //* 4.Process hashtags in background (don't await for performance)
      this.hashtagService
        .processHashtagsForEcho(echo.id, dto.content)
        .catch((error) => {
          console.error('Failed to process hashtags:', error);
          //* 5. Don't fail the echo creation if hashtag processing fails
        });
    }

    //* 4. Audit the action
    await this.audit.log(userId, 'ECHO_CREATED', {
      ip,
      userAgent,
      metadata: { echoId: echo.id },
    });
    return EchoResponseDto.fromEntity(echo);
  }

  /**
   *  TODO ============================ UPDATE ECHO ============================
   * @param userId // ID of the user attempting the update
   * @param echoId // ID of the Echo to be updated
   * @param dto // Data Transfer Object containing updated content
   * @param userRole // Role of the user (e.g., 'user', 'admin')
   * @returns // Update an existing Echo if ownership and time window conditions are met
   */
  async updateEcho(
    userId: string,
    echoId: string,
    dto: UpdateEchoDto,
    userRole?: string,
  ) {
    //* 0 Find the echo to update
    const echo = await this.repo.findById(echoId);
    if (!echo) {
      throw new NotFoundException('Echo not found');
    }

    //* 1 Check ownership or admin role
    this.validateOwnership(userId, echo.authorId, userRole);

    console.log(echo.createdAt);
    //* 2 Check edit time window
    this.validateEditWindow(echo.createdAt, echo.updatedAt);

    //* 3 Proceed with update
    const updatedEcho = await this.repo.updateEcho(echoId, {
      content: dto.content,
    });
    return EchoResponseDto.fromEntity(updatedEcho);
  }
  /**
   *  TODO ============================ DELETE ECHO ============================
   * @param userId
   * @param echoId
   * @param userRole
   * @param ip
   * @param userAgent
   * @returns // Delete an Echo if ownership or admin role conditions are met
   */
  async deleteEcho(
    userId: string,
    echoId: string,
    userRole?: string,
    ip?: string,
    userAgent?: string,
  ) {
    const echo = await this.repo.findById(echoId);
    if (!echo) {
      throw new NotFoundException('Echo not found');
    }

    //* 1 Check ownership or admin role
    this.validateOwnership(userId, echo.authorId, userRole);

    //* 2. Delete associated media from Cloudinary
    if (echo.media && echo.media.length > 0) {
      await this.deleteMediaFiles(echo.media);
    }
    //* 3. Soft delete the echo
    await this.repo.softDeleteEcho(echoId);
    //* 4. Audit the deletion
    await this.audit.log(userId, 'ECHO_DELETED', {
      ip,
      userAgent,
      metadata: { echoId: echo.id },
    });

    return { message: 'Echo deleted successfully' };
  }

  /**
   * TODO ============================ GET ECHO BY ID ============================
   * @param id // ID of the Echo to retrieve
   * @returns  // Retrieve an Echo by its ID, throwing an error if not found
   */
  async getEchoById(id: string) {
    const echo = await this.repo.findById(id);

    if (!echo) {
      throw new NotFoundException('Echo not found');
    }

    return echo;
  }

  /**
   * TODO ============================ GET USER ECHOES ============================
   * @param userId
   * @param skip
   * @param limit
   * @returns
   */
  async getUserEchoes(
    userId: string,
    skip: number = 0,
    limit: number = 10,
  ): Promise<PaginatedResponseDto<EchoResponseDto>> {
    const [echoes, total] = await Promise.all([
      this.repo.findByUserId(userId, skip, limit),
      this.repo.countByUserId(userId),
    ]);

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(skip / limit) + 1;

    const meta: PaginationMetaDto = {
      page: currentPage,
      limit,
      total,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    };

    const data = echoes.map((echo) => EchoResponseDto.fromEntity(echo));

    return new PaginatedResponseDto(data, meta);
  }

  // TODO ============ PRIVATE METHODS ============
  //* Validate that either content or files are provided
  private validateContentOrFiles(
    content?: string,
    files?: Express.Multer.File[],
  ) {
    const hasContent = content && content.trim().length > 0;
    const hasFiles = files && files.length > 0;

    if (!hasContent && !hasFiles) {
      throw new BadRequestException(
        'Echo must contain either text content or media files',
      );
    }
  }
  //* Validate that the user is either the owner or has admin role */
  private validateOwnership(
    userId: string,
    authorId: string,
    userRole?: string,
  ) {
    const isOwner = userId === authorId;
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }
  }
  //* Validate that the edit is within the allowed time window
  private validateEditWindow(createdAt: Date, updatedAt: Date) {
    const editWindowMs = 15 * 60 * 1000; // 15 minutes
    const now = new Date();
    const timeSinceCreation = now.getTime() - createdAt.getTime();
    const timeSinceUpdate = now.getTime() - updatedAt.getTime();
    if (timeSinceCreation < editWindowMs || timeSinceUpdate < editWindowMs) {
      throw new ForbiddenException(
        'Edit window has expired. Echo can only be edited within 15 minutes of creation.',
      );
    }
  }

  /**
   *  TODO ============================ UPLOAD MEDIA FILES ============================
   * @param files
   * @param sensitivity
   * @returns
   */
  private async uploadMediaFiles(
    files: Express.Multer.File[],
    sensitivity: boolean = false,
  ): Promise<MediaDataType[]> {
    const uploadPromises = files.map(async (file) => {
      try {
        const uploaded: UploadApiResponse = (await this.cloudinary.uploadFile(
          file,
        )) as UploadApiResponse;

        return {
          url: uploaded.secure_url,
          mimetype: file.mimetype,
          sensitivity,
          size: file.size,
          publicId: uploaded.public_id,
        };
      } catch (error) {
        // If one file fails, we should clean up any already uploaded files
        throw new BadRequestException(
          `Failed to upload file ${file.originalname}: ${error.message}`,
        );
      }
    });

    return await Promise.all(uploadPromises);
  }

  /**
   * TODO ============================ DELETE MEDIA FILES ============================
   * @param media
   */
  private async deleteMediaFiles(media: any[]) {
    const deletePromises = media.map(async (mediaItem) => {
      if (mediaItem.publicId) {
        try {
          await this.cloudinary.deleteFile(
            mediaItem.publicId,
            mediaItem.resourceType,
          );
        } catch (error) {
          // Log the error but don't fail the entire operation
          console.error(`Failed to delete media ${mediaItem.publicId}:`, error);
        }
      }
    });

    await Promise.all(deletePromises);
  }
}
