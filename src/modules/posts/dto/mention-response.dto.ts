// dtos/mention-response.dto.ts
import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MentionPostDto {
  @ApiProperty({ description: 'Post ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'When the post was created' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Post content' })
  @Expose()
  content: string;

  @ApiProperty({ enum: ['public', 'followers', 'private'] })
  @Expose()
  visibility: string;

  @ApiProperty({ description: 'Number of likes' })
  @Expose()
  likeCount: number;

  @ApiProperty({ description: 'Number of replies' })
  @Expose()
  replyCount: number;

  @ApiProperty({ description: 'Number of reposts' })
  @Expose()
  repostCount: number;

  @ApiProperty({ description: 'Number of views' })
  @Expose()
  viewCount: number;

  @ApiProperty({ description: 'Number of media items' })
  @Expose()
  mediaCount: number;
}

class MentionAuthorDto {
  @ApiProperty({ description: 'User ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Username' })
  @Expose()
  username: string;

  @ApiProperty({ description: 'First name' })
  @Expose()
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  @Expose()
  lastName: string;

  @ApiProperty({ description: 'Profile picture URL' })
  @Expose()
  avatar: string;

  @ApiProperty({ description: 'Bio' })
  @Expose()
  bio: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @Expose()
  website?: string | null;

  @ApiPropertyOptional({ description: 'Location' })
  @Expose()
  location?: string | null;
}

export class MentionResponseDto {
  @ApiProperty({ description: 'Mention notification ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'When the mention was created' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Whether the mention has been read' })
  @Expose()
  read: boolean;

  @ApiProperty({ type: MentionPostDto })
  @Type(() => MentionPostDto)
  @Expose()
  post: MentionPostDto;

  @ApiProperty({ type: MentionAuthorDto })
  @Type(() => MentionAuthorDto)
  @Expose()
  author: MentionAuthorDto;

  @ApiPropertyOptional({ type: MentionPostDto, nullable: true })
  @Type(() => MentionPostDto)
  @Expose()
  reply?: MentionPostDto | null;
}
