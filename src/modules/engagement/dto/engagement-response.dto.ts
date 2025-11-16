import { ApiProperty } from '@nestjs/swagger';

export class EngagementCountsDto {
  @ApiProperty({ example: 5 })
  likes: number;

  @ApiProperty({ example: 3 })
  ripples: number;

  @ApiProperty({ example: 2 })
  reechoes: number;

  @ApiProperty({ example: 1 })
  bookmarks: number;
}

export class UserEngagementStateDto {
  @ApiProperty({ example: true })
  liked: boolean;

  @ApiProperty({ example: false })
  reechoed: boolean;

  @ApiProperty({ example: true })
  bookmarked: boolean;
}

export class RippleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
  };

  @ApiProperty({ required: false })
  parent?: {
    id: string;
    user: {
      id: string;
      username: string;
    };
  };

  @ApiProperty({ required: false })
  replies?: RippleResponseDto[];

  @ApiProperty()
  replyCount: number;
}

export class PaginationMetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNext: boolean;

  @ApiProperty()
  hasPrev: boolean;
}