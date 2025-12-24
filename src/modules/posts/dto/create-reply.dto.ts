import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReplyDto {
  @IsString()
  @IsOptional()
  @MaxLength(280, { message: 'reply size exceeded 280 characters' })
  content?: string;

  @IsString()
  @IsOptional()
  parentReplyId?: string;
}

export class UpdateReplyDto {
  @IsString()
  @IsOptional()
  @MaxLength(280, { message: 'reply size exceeded 280 characters' })
  content?: string;

  @IsString()
  @IsOptional()
  parentReplyId?: string;
}
