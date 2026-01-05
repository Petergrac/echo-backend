import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReplyDto {
  @ApiPropertyOptional({
    description: 'Reply content (max 280 characters)',
    example: 'Great post! I completely agree.',
    maxLength: 280,
  })
  @IsString()
  @IsOptional()
  @MaxLength(280, { message: 'reply size exceeded 280 characters' })
  content?: string;

  @ApiPropertyOptional({
    description: 'Parent reply ID if replying to another reply',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString()
  @IsOptional()
  parentReplyId?: string;
}

export class UpdateReplyDto {
  @ApiPropertyOptional({
    description: 'Updated reply content (max 280 characters)',
    example: 'Updated reply text',
    maxLength: 280,
  })
  @IsString()
  @IsOptional()
  @MaxLength(280, { message: 'reply size exceeded 280 characters' })
  content?: string;

  @ApiPropertyOptional({
    description: 'Parent reply ID if replying to another reply',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString()
  @IsOptional()
  parentReplyId?: string;
}
