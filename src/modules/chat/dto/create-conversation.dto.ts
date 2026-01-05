import {
  IsEnum,
  IsArray,
  IsString,
  IsOptional,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationType } from '../entities/conversation.entity';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Type of conversation',
    enum: ConversationType,
    example: ConversationType.DIRECT,
  })
  @IsEnum(ConversationType)
  type: ConversationType;

  @ApiProperty({
    description: 'Array of participant user IDs (excluding creator)',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174001'],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50) //? Limit for group chats
  participantIds: string[];

  @ApiPropertyOptional({
    description: 'Conversation name (required for group chats)',
    example: 'Team Chat',
  })
  @IsString()
  @IsOptional()
  name?: string; //? If it is a group

  @ApiPropertyOptional({
    description: 'Group avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsString()
  @IsOptional() //? Group avatar
  avatar?: string;
}
