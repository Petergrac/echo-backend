import {
  IsEnum,
  IsString,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../entities/message.entity';

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content (max 5000 characters)',
    example: 'Hello, how are you?',
    maxLength: 5000,
  })
  @IsString()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({
    description: 'Message type',
    enum: MessageType,
    default: MessageType.TEXT,
    example: MessageType.TEXT,
  })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @ApiPropertyOptional({
    description: 'ID of message to reply to',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString()
  @IsOptional()
  replyToId?: string;

  @ApiPropertyOptional({
    description: 'Media metadata (for uploaded files)',
    example: {
      url: 'https://example.com/file.jpg',
      publicId: 'chat/folder/file_jpg',
      type: 'image',
      width: 1920,
      height: 1080,
      duration: null,
      fileSize: 1024000,
    },
  })
  @IsObject()
  @IsOptional()
  media?: {
    url: string;
    publicId: string;
    type: string;
    width?: number;
    height?: number;
    duration?: number;
    fileSize?: number;
  };
}
