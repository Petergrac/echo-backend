import {
  IsEnum,
  IsArray,
  IsString,
  IsOptional,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ConversationType } from '../entities/conversation.entity';

export class CreateConversationDto {
  @IsEnum(ConversationType)
  type: ConversationType;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50) //? Limit for group chats
  participantIds: string[];

  @IsString()
  @IsOptional()
  name?: string; //? If it is a group

  @IsString()
  @IsOptional() //? Group avatar
  avatar?: string;
}
