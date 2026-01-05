import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateConversationDto {
  @ApiPropertyOptional({
    description: 'New conversation name',
    example: 'Updated Group Name',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'New conversation avatar URL',
    example: 'https://example.com/new-avatar.jpg',
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Enable/disable notifications for this conversation',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  notificationsEnabled?: boolean;
}
