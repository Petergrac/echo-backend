import { Expose, Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsDate,
  IsEnum,
  IsArray,
  IsObject,
} from 'class-validator';
import { UserDto } from './user-response.dto';
import { MessageStatus, MessageType } from '../../entities/message.entity';

class MediaInfo {
  @Expose()
  url: string;
  @Expose()
  publicId: string;
  @Expose()
  type: string;
  @Expose()
  width: number;
  @Expose()
  height: number;
  @Expose()
  fileSize: number;
}

export class ReactionDto {
  @Expose()
  @IsString()
  id: string;

  @Expose()
  @IsString()
  emoji: string;

  @Expose()
  @IsString()
  userId: string;

  @Expose()
  @IsDate()
  reactedAt: Date;
}

export class ReadReceiptDto {
  @Expose()
  @IsString()
  userId: string;

  @Expose()
  @IsDate()
  readAt: Date;
}

export class MessageResponseDto {
  @Expose()
  @IsString()
  id: string;

  @Expose()
  @IsString()
  content: string;

  @Expose()
  @IsEnum(MessageType)
  type: MessageType;

  @Expose()
  @IsEnum(MessageStatus)
  status: MessageStatus;

  @Expose()
  @IsString()
  conversationId: string;

  @Expose()
  @Type(() => UserDto)
  sender: UserDto;

  @Expose()
  @Type(() => MessageResponseDto)
  @IsOptional()
  replyTo: MessageResponseDto;

  @Expose()
  @IsOptional()
  @IsObject()
  media?: MediaInfo;

  @Expose()
  @Type(() => ReactionDto)
  @IsArray()
  reactions: ReactionDto[];

  @Expose()
  @Type(() => ReadReceiptDto)
  @IsArray()
  readReceipts: ReadReceiptDto[];

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
  @IsOptional()
  @IsDate()
  deletedForUserAt?: Date;

  @Expose()
  @IsOptional()
  @IsString()
  deletedForUserId?: string;
}
