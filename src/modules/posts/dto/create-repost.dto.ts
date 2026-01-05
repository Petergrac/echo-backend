import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRepostDto {
  @ApiPropertyOptional({
    description: 'Additional commentary for the repost (max 280 characters)',
    example: 'This is amazing!',
    maxLength: 280,
  })
  @IsString()
  @IsOptional()
  @MaxLength(280, { message: 'content must not exceed 280 characters' })
  content?: string;
}
