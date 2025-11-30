import {
  IsEnum,
  IsString,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';
import { MessageType } from '../entities/message.entity';

export class SendMessageDto {
  @IsString()
  @MaxLength(5000)
  content: string;

  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @IsString()
  @IsOptional()
  replyToId?: string;

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
