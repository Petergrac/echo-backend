import { Expose, Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDate,
  IsArray,
  IsEnum,
  IsObject,
} from 'class-validator';
import { ConversationType } from '../../entities/conversation.entity';
import { ParticipantDto } from './participants.dto';
import { UserDto } from './user-response.dto';

export class ConversationResponseDto {
  @Expose()
  @IsString()
  id: string;

  @Expose()
  @IsEnum(ConversationType)
  type: ConversationType;

  @Expose()
  @IsOptional()
  @IsString()
  name?: string;

  @Expose()
  @IsOptional()
  @IsString()
  avatar?: string;

  @Expose()
  @IsNumber()
  messageCount: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  unreadCount?: number;

  @Expose()
  @IsOptional()
  @IsDate()
  lastMessageAt?: Date;

  @Expose()
  @IsOptional()
  @IsString()
  lastMessageId?: string;

  @Expose()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @Expose()
  @IsDate()
  createdAt: Date;

  @Expose()
  @IsDate()
  updatedAt: Date;

  @Expose()
  @Type(() => ParticipantDto)
  @IsArray()
  participants: ParticipantDto[];

  @Expose()
  @Type(() => UserDto)
  createdBy: UserDto;
}
