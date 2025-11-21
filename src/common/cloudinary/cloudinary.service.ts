import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  v2 as Cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';

// Proper type definitions
interface CloudinaryUploader {
  upload_stream: (
    options: any,
    callback?: (
      error?: UploadApiErrorResponse,
      result?: UploadApiResponse,
    ) => void,
  ) => {
    end: (buffer: Buffer) => void;
  };
  destroy: (
    publicId: string,
    options: { resource_type?: string },
    callback?: (error: any, result: any) => void,
  ) => void;
}

interface CloudinaryDeleteResponse {
  result: string;
}

interface TypedCloudinary {
  uploader: CloudinaryUploader;
}

@Injectable()
export class CloudinaryService {
  private readonly cloudinary: TypedCloudinary;

  constructor(@Inject('CLOUDINARY') cloudinary: typeof Cloudinary) {
    this.cloudinary = cloudinary as unknown as TypedCloudinary;
  }
  /**
   * TODO ==================== UPLOAD USER AVATAR IMAGE ============
   * @param file
   * @returns
   */
  async uploadImage(file: Express.Multer.File): Promise<UploadApiResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return new Promise((resolve, reject) => {
      this.cloudinary.uploader
        .upload_stream(
          {
            folder: 'user_avatar',
            resource_type: 'image',
            transformation: [
              { width: 512, height: 512, crop: 'fill', gravity: 'face' },
            ],
          },
          (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
            if (error) {
              const err = new InternalServerErrorException(
                `Cloudinary upload failed: ${error.message}`,
              );
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              (err as any).http_code = error.http_code;
              reject(err);
              return;
            }
            if (!result) {
              reject('Cloudinary upload failed: No result returned');
              return;
            }
            resolve(result);
          },
        )
        .end(file.buffer);
    });
  }
  /**
   * TODO========================== DELETE THE IMAGE UPON USER CHANGE OR ACCOUNT DELETION ====
   * @param publicId
   * @returns
   */
  async deleteFile(
    publicId: string,
    resource_type: string,
  ): Promise<CloudinaryDeleteResponse> {
    return new Promise((resolve, reject) => {
      this.cloudinary.uploader.destroy(
        publicId,
        {
          resource_type,
        },
        (error: any, result: CloudinaryDeleteResponse) => {
          if (error) {
            reject(
              new InternalServerErrorException(
                'Failed to delete the file from cloudinary',
              ),
            );
            return;
          }
          if (result.result === 'already deleted') {
            resolve(result);
          }
          if (result.result !== 'ok') {
            reject(
              new InternalServerErrorException(
                'Failed to delete file from cloudinary',
              ),
            );
            return;
          }
          resolve(result);
        },
      );
    });
  }

  // Helper method to extract public_id from Cloudinary URL
  extractPublicId(imageUrl: string): string {
    const matches = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
    return matches ? matches[1] : imageUrl;
  }

  /**
   * TODO ========================== UPLOAD MEDIA FILES FOR ECHO =============
   * @param file
   * @returns
   */
  async uploadFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File too large for Cloudinary');
    }

    return new Promise<UploadApiResponse>((resolve, reject) => {
      this.cloudinary.uploader
        .upload_stream(
          {
            folder: 'echo_media',
            resource_type: 'auto',
          },
          (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
            if (error) {
              const err = new Error(
                `Cloudinary upload failed: ${error.message}`,
              );
              (err as any).http_code = error.http_code;
              reject(
                new BadRequestException(
                  'Cloudinary upload failed: No response from server',
                ),
              );
              return;
            }
            if (!result) {
              reject(
                new BadRequestException(
                  'Cloudinary upload failed: No response from server',
                ),
              );
              return;
            }
            resolve(result);
          },
        )
        .end(file.buffer);
    });
  }
}
