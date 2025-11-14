import { Injectable } from '@nestjs/common';
import { CreateEchoDto } from './dto/create-echo.dto';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { UploadApiResponse } from 'cloudinary';
import {
  EchoRepository,
  MediaDataType,
} from './repository/echo-repo.repository';
import { AuditService } from '../../common/services/audit.service';

@Injectable()
export class EchoService {
  constructor(
    private readonly cloudinary: CloudinaryService,
    private readonly repo: EchoRepository,
    private readonly audit: AuditService,
  ) {}

  async createEcho(
    userId: string,
    dto: CreateEchoDto,
    files?: Express.Multer.File[],
    ip?: string,
    userAgent?: string,
  ) {
    /**
     * TODO ============ UPLOAD MEDIA FILES TO CLOUDINARY ==========
     */
    let mediaData: MediaDataType[] = [];
    console.log(files && files[0].size);
    if (files && files.length) {
      mediaData = await Promise.all(
        files.map(async (file) => {
          const uploaded: UploadApiResponse = (await this.cloudinary.uploadFile(
            file,
          )) as UploadApiResponse;
          return {
            url: uploaded.secure_url,
            mimetype: file.mimetype,
            sensitivity: dto.sensitivity ?? false,
            size: file.size,
            publicId: uploaded.public_id,
          };
        }),
      );
    }
    /**
     * TODO============== SAVE THE CONTENT IN THE DATABASE =============
     */
    const response = await this.repo.createEcho(userId, dto, mediaData);
    await this.audit.log(userId, 'ECHO_CREATED', { ip, userAgent });
    return response;
  }
}
