import { Expose } from 'class-transformer';
import { IsString, IsOptional } from 'class-validator';

export class ReactionResponseDto {
  @Expose()
  @IsString()
  id: string;

  @Expose()
  @IsString()
  messageId: string;

  @Expose()
  @IsString()
  emoji: string;

  @Expose()
  @IsString()
  userId: string;

  @Expose()
  reactedAt: Date;

  @Expose()
  @IsOptional()
  createdAt?: Date;

  @Expose()
  @IsOptional()
  updatedAt?: Date;
}
