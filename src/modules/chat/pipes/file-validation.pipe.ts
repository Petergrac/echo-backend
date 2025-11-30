import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  transform(
    file: Express.Multer.File | undefined,
  ): Express.Multer.File | undefined {
    if (!file) return;

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/gif',
      'audio/mp3',
      'video/mp4',
      'video/mkv',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only images and GIFs are allowed');
    }

    const maxSize = 30 * 1024 * 1024; // 30MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be ≤ 10MB');
    }
    return file;
  }
}
