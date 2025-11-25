// dto/reply-response.dto.ts
import { Exclude, Expose, Type } from 'class-transformer';
import { PostResponseDto } from './post-response.dto'; // we'll create this too
import { UserResponseDto } from '../../auth/dto/user-response.dto';
import { MediaResponseDto } from './media-response.dto';

export class ReplyResponseDto {
  @Expose()
  id: string;

  @Expose()
  content: string;

  @Expose()
  createdAt: Date;

  @Expose()
  replyCount: number;

  @Expose()
  postId: string;

  @Expose()
  parentReplyId: string | null;

  @Type(() => UserResponseDto)
  @Expose()
  author: UserResponseDto;

  @Type(() => PostResponseDto)
  @Expose()
  post?: PostResponseDto;

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
