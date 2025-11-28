import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class NotificationPreferencesResponseDto {
  @ApiProperty({ description: 'Preferences ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'User ID' })
  @Expose()
  userId: string;

  //* Core notification preferences (in-app)
  @ApiProperty({ description: 'Receive like notifications' })
  @Expose()
  likes: boolean;

  @ApiProperty({ description: 'Receive post notifications' })
  @Expose()
  posts: boolean;

  @ApiProperty({ description: 'Receive reply notifications' })
  @Expose()
  replies: boolean;

  @ApiProperty({ description: 'Receive repost notifications' })
  @Expose()
  reposts: boolean;

  @ApiProperty({ description: 'Receive follow notifications' })
  @Expose()
  follows: boolean;

  @ApiProperty({ description: 'Receive mention notifications' })
  @Expose()
  mentions: boolean;

  @ApiProperty({ description: 'Receive system notifications' })
  @Expose()
  system: boolean;

  //* Email preferences
  @ApiProperty({ description: 'Receive email digest' })
  @Expose()
  emailDigest: boolean;

  @ApiProperty({ description: 'Email for system notifications' })
  @Expose()
  emailSystem: boolean;

  //* Push notification preferences
  @ApiProperty({ description: 'Push notifications enabled' })
  @Expose()
  pushLikes: boolean;

  @ApiProperty({ description: 'Push notifications for replies' })
  @Expose()
  pushReplies: boolean;

  @ApiProperty({ description: 'Push notifications for reposts' })
  @Expose()
  pushReposts: boolean;

  @ApiProperty({ description: 'Push notifications for follows' })
  @Expose()
  pushFollows: boolean;

  @ApiProperty({ description: 'Push notifications for mentions' })
  @Expose()
  pushMentions: boolean;

  @ApiProperty({ description: 'Push notifications for system' })
  @Expose()
  pushSystem: boolean;

  //* UX Preferences
  @ApiProperty({ description: 'Enable notification sounds' })
  @Expose()
  soundEnabled: boolean;

  @ApiProperty({ description: 'Enable vibration' })
  @Expose()
  vibrationEnabled: boolean;

  @ApiProperty({
    description: 'Delivery timing',
    enum: ['immediate', 'off', 'scheduled'],
  })
  @Expose()
  deliveryTiming: string;

  //* Muting preferences
  @ApiProperty({ description: 'List of muted user IDs' })
  @Expose()
  mutedUsers: string[];

  @ApiProperty({ description: 'List of muted keywords' })
  @Expose()
  mutedKeywords: string[];
}
