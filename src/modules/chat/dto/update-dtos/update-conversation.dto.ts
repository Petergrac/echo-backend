import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateConversationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsBoolean()
  @IsOptional()
  notificationsEnabled?: boolean;
}
