import {
  IsBoolean,
  IsEnum,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdatePreferencesDto {
  //* 1.In-app notifications
  @IsBoolean()
  @IsOptional()
  likes?: boolean;

  @IsBoolean()
  @IsOptional()
  replies?: boolean;

  @IsBoolean()
  @IsOptional()
  reposts?: boolean;

  @IsBoolean()
  @IsOptional()
  follows?: boolean;

  @IsBoolean()
  @IsOptional()
  mentions?: boolean;

  @IsBoolean()
  @IsOptional()
  system?: boolean;

  //* 2.Email notifications
  @IsBoolean()
  @IsOptional()
  emailLikes?: boolean;

  @IsBoolean()
  @IsOptional()
  emailReplies?: boolean;

  @IsBoolean()
  @IsOptional()
  emailReposts?: boolean;

  @IsBoolean()
  @IsOptional()
  emailFollows?: boolean;

  @IsBoolean()
  @IsOptional()
  emailMentions?: boolean;

  @IsBoolean()
  @IsOptional()
  emailSystem?: boolean;

  @IsBoolean()
  @IsOptional()
  emailDigest?: boolean;

  //* 3.Push notifications
  @IsBoolean()
  @IsOptional()
  pushLikes?: boolean;

  @IsBoolean()
  @IsOptional()
  pushReplies?: boolean;

  @IsBoolean()
  @IsOptional()
  pushReposts?: boolean;

  @IsBoolean()
  @IsOptional()
  pushFollows?: boolean;

  @IsBoolean()
  @IsOptional()
  pushMentions?: boolean;

  @IsBoolean()
  @IsOptional()
  pushSystem?: boolean;

  //* 4.Additional preferences
  @IsBoolean()
  @IsOptional()
  soundEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  vibrationEnabled?: boolean;

  @IsEnum(['immediate', 'digest', 'off'])
  @IsOptional()
  deliveryTiming?: 'immediate' | 'digest' | 'off';

  @IsArray()
  @IsOptional()
  mutedUsers?: string[];

  @IsArray()
  @IsOptional()
  mutedKeywords?: string[];
}

export class MuteUserDto {
  @IsBoolean()
  mute: boolean;

  @IsString()
  @IsUUID()
  userId: string;
}

export class MuteKeywordDto {
  @IsBoolean()
  mute: boolean;

  @IsString()
  keyword: string;
}
