import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PostVisibility } from '../entities/post.entity';

export class CreatePostDto {
  @ApiPropertyOptional({
    description: 'Post content (max 200 characters)',
    example: 'Check out this amazing sunset!',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'content can only be 200 characters or less' })
  content: string;

  @ApiPropertyOptional({
    description: 'Post visibility setting',
    enum: PostVisibility,
    default: PostVisibility.PUBLIC,
    example: PostVisibility.PUBLIC,
  })
  @IsEnum(PostVisibility)
  @IsOptional()
  visibility: PostVisibility;
}
