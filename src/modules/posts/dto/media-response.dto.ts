import { Exclude, Expose } from 'class-transformer';

export class MediaResponseDto {
  @Expose()
  id: string;

  @Expose()
  mediaUrl: string;

  @Expose()
  resourceType: 'image' | 'gif';

  @Exclude()
  publicId: string;

  @Exclude()
  createdAt?: Date;

  @Exclude()
  postId?: string;
}
