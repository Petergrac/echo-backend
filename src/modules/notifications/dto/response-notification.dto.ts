import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationActorDto {
  @ApiProperty({ description: 'User ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Username' })
  @Expose()
  username: string;

  @ApiProperty({ description: 'Display name' })
  @Expose()
  firstName: string;

  @ApiProperty({ description: 'Profile picture' })
  @Expose()
  avatar: string;
}

export class NotificationResponseDto {
  @ApiProperty({ description: 'Notification ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'When notification was created' })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    enum: ['LIKE', 'REPLY', 'REPOST', 'FOLLOW', 'MENTION', 'SYSTEM'],
  })
  @Expose()
  type: string;

  @ApiProperty({ type: NotificationActorDto })
  @Type(() => NotificationActorDto)
  @Expose()
  actor: NotificationActorDto;

  @ApiPropertyOptional({ description: 'Post ID (click to view)' })
  @Expose()
  postId?: string;

  @ApiPropertyOptional({ description: 'Reply ID (click to view)' })
  @Expose()
  replyId?: string;

  @ApiProperty({ description: 'Has the user read this notification' })
  @Expose()
  read: boolean;
}
