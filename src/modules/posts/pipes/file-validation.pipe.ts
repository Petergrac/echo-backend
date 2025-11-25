import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

interface FileValidationOptions {
  maxSize?: number;
  allowedMimeTypes?: string[];
  maxCount?: number;
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor() {}

  private readonly defaultOptions: Required<FileValidationOptions> = {
    maxSize: 30 * 1024 * 1024,
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'video/webm',
    ],
    maxCount: 5,
  };

  transform(files: Express.Multer.File[]) {
    const opts = { ...this.defaultOptions };

    if (!files || files.length === 0) {
      return files;
    }

    if (files.length > opts.maxCount) {
      throw new BadRequestException(
        `Too many files. Maximum ${opts.maxCount} files allowed.`,
      );
    }

    files.forEach((file) => {
      this.validateFile(file, opts);
    });

    return files;
  }

  private validateFile(
    file: Express.Multer.File,
    options: Required<FileValidationOptions>,
  ) {
    //* Size validation
    if (file.size > options.maxSize) {
      const maxSizeMB = options.maxSize / (1024 * 1024);
      throw new BadRequestException(
        `File "${file.originalname}" exceeds maximum size of ${maxSizeMB}MB`,
      );
    }

    //* MIME type validation
    if (!options.allowedMimeTypes.includes(file.mimetype)) {
      const allowedTypes = options.allowedMimeTypes
        .map((type) => type.split('/')[1])
        .join(', ');
      throw new BadRequestException(
        `File "${file.originalname}" has invalid type. Allowed types: ${allowedTypes}`,
      );
    }
  }
}
