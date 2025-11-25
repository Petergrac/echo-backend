import { Exclude, Expose } from 'class-transformer';

export class MediaResponseDto {
  @Expose()
  id: string;

  @Expose()
  mediaUrl: string;

  @Expose()
  resourceType: 'image' | 'video' | 'gif';

  @Exclude()
  publicId: string;

  @Exclude()
  createdAt?: Date;

  @Exclude()
  postId?: string;
}
