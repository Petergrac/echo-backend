import { Injectable } from '@nestjs/common';
import { EchoRepository } from './repository/echo-repo.repository';
import { CreateEchoDto, MediaType } from './dto/create-echo.dto';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { UploadApiResponse } from 'cloudinary';
import { AuditService } from '../../common/services/audit.service';

@Injectable()
export class EchoService {
  constructor(
    private readonly repo: EchoRepository,
    private readonly cloudinary: CloudinaryService,
    private readonly audit: AuditService,
  ) {}

  /**
   * TODO ============ CREATE ECHO =============
   * @param param0
   * @returns
   */
  async createEcho({
    userId,
    dto,
    files,
    ip,
    userAgent,
  }: {
    userId: string;
    dto: CreateEchoDto;
    files?: Express.Multer.File[];
    ip?: string;
    userAgent?: string;
  }) {
    let media: MediaType[] = [];
    if (files && files.length > 0) {
      //* 1.Upload files to cloudinary if they exist
      for (const file of files) {
        const uploadedMedia: UploadApiResponse =
          (await this.cloudinary.uploadFile(file)) as UploadApiResponse;
        //* 2. Push the response in the media array
        media.push({
          url: uploadedMedia.url,
          mimetype: file.mimetype,
          resourceType: uploadedMedia.resource_type,
          publicId: uploadedMedia.public_id,
        });
      }
    }
    //* 3.Save the response to the database
    const response = await this.repo.createEcho(userId, dto, media);

    //* 4. Log the action
    //? Add notification here
    if (response) {
      this.audit.log(response.author?.id!, 'ECHO_CREATED', { ip, userAgent });
    }
    //* 5. Return response
    return response;
  }
  /**
   * TODO ======================== GET ECHO BY ID ==============
   * @param echoId
   * @returns
   */
  async getEchoById(echoId: string) {
    //* Request the echo
    return this.repo.getEchoById(echoId);
  }

  /**
   * TODO ========================== SOFT DELETE ECHO =============
   * @param userId
   * @param echoId
   * @param ip
   * @param userAgent
   * @returns
   */
  async softDeleteEcho(
    userId: string,
    echoId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const response = await this.repo.deleteEchoById(userId, echoId);
    if (response) {
      //* Log(Audit ) the action
      await this.audit.log(userId, 'ECHO_DELETED', { ip, userAgent });
    }
    return { response, echoId };
  }

  /**
   * TODO ====================== DELETE MEDIA FROM CLOUDINARY ==================
   * @param mediaUrls
   */
  async deleteMediaFiles() {
    const response = await this.repo.forceDeleteEchoBatch();
    const mediaFiles = response.mediaFiles;
    //* Delete mediaFiles if available
    if (mediaFiles && mediaFiles?.length > 0)
      //* Cloudinary does bulk delete
      await Promise.all(
        mediaFiles.map((m) =>
          this.cloudinary.deleteFile(m.publicId!, m.resourceType!),
        ),
      );
    console.log(mediaFiles?.map((m) => m.publicId));
  }
}
