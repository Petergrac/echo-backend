import { IsBoolean, IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    description: 'Enable/disable like notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  likes?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable reply notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  replies?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable repost notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  reposts?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable follow notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  follows?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable mention notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  mentions?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable system notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  system?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable email notifications for likes',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  emailLikes?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable email notifications for replies',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  emailReplies?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable email notifications for reposts',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  emailReposts?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable email notifications for follows',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  emailFollows?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable email notifications for mentions',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  emailMentions?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable email notifications for system messages',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  emailSystem?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable email digest',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  emailDigest?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable push notifications for likes',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  pushLikes?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable push notifications for replies',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  pushReplies?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable push notifications for reposts',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  pushReposts?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable push notifications for follows',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  pushFollows?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable push notifications for mentions',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  pushMentions?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable push notifications for system messages',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  pushSystem?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable notification sounds',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  soundEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable notification vibration',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  vibrationEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Notification delivery timing',
    enum: ['immediate', 'digest', 'scheduled'],
    example: 'immediate',
  })
  @IsString()
  @IsOptional()
  deliveryTiming?: string;

  @ApiPropertyOptional({
    description: 'List of muted user IDs or usernames',
    type: [String],
    example: ['john_doe', 'jane_doe'],
  })
  @IsArray()
  @IsOptional()
  mutedUsers?: string[];

  @ApiPropertyOptional({
    description: 'List of muted keywords',
    type: [String],
    example: ['spam', 'promotion'],
  })
  @IsArray()
  @IsOptional()
  mutedKeywords?: string[];
}

export class MuteUserDto {
  @ApiProperty({
    description: 'User ID to mute/unmute',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'True to mute, false to unmute',
    example: true,
  })
  @IsBoolean()
  mute: boolean;
}

export class MuteKeywordDto {
  @ApiProperty({
    description: 'Keyword to mute/unmute',
    example: 'spam',
  })
  @IsString()
  keyword: string;

  @ApiProperty({
    description: 'True to mute, false to unmute',
    example: true,
  })
  @IsBoolean()
  mute: boolean;
}
