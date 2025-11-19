// src/echo/dto/create-echo.dto.ts
import { IsBoolean, IsOptional, IsString, MaxLength, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEchoDto {
  @ApiProperty({
    description: 'Echo content (optional if media files provided)',
    maxLength: 280,
    required: false,
    example: 'This is my awesome echo post!'
  })
  @IsOptional()
  @IsString()
  @MaxLength(280, { message: 'Content must be less than 280 characters' })
  content?: string;

  @ApiProperty({
    description: 'Mark media as sensitive content',
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  sensitivity?: boolean = false;
}