import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRepostDto {
  @IsString()
  @IsOptional()
  @MaxLength(280, { message: 'content must not exceed 280 characters' })
  content?: string;
}
