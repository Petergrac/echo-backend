// dto/post-response.dto.ts
import { Exclude, Expose, Type } from 'class-transformer';
import { MediaResponseDto } from './media-response.dto';
import { UserResponseDto } from '../../auth/dto/user-response.dto';

export class PostResponseDto {
  @Expose()
  id: string;

  @Expose()
  content: string;

  @Expose()
  visibility: 'public' | 'followers' | 'private';

  @Expose()
  createdAt: Date;

  @Expose()
  likeCount: number;

  @Expose()
  replyCount: number;

  @Expose()
  repostCount: number;

  @Expose()
  viewCount: number;

  @Expose()
  mediaCount: number;

  @Type(() => UserResponseDto)
  @Expose()
  author: UserResponseDto;

  //* Transform media array
  @Type(() => MediaResponseDto)
  @Expose()
  media: MediaResponseDto[];

  @Exclude()
  updatedAt?: Date;

  @Exclude()
  deletedAt?: Date | null;

  @Exclude()
  version?: number;

  @Exclude()
  authorId?: string;
}
