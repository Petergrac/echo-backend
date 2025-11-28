import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReplyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(280, { message: 'reply size exceeded 280 characters' })
  content: string;

  @IsString()
  @IsOptional()
  parentReplyId?: string;
}

export class UpdateReplyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(280, { message: 'reply size exceeded 280 characters' })
  content: string;

  @IsString()
  @IsOptional()
  parentReplyId?: string;
}
