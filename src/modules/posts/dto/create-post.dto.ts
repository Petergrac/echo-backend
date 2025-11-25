import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PostVisibility } from '../entities/post.entity';

export class CreatePostDto {
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'content can only be 200 characters or less' })
  content: string;

  @IsEnum(PostVisibility)
  @IsOptional()
  visibility: PostVisibility;
}
