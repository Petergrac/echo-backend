// src/echo/dto/update-echo.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateEchoDto } from './create-echo.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UpdateEchoDto extends PartialType(CreateEchoDto) {
  // Inherits all properties from CreateEchoDto as optional
  // No need to redecorate - they automatically become optional

  @ApiProperty({
    description:
      'Timestamp when the echo was created (for edit window validation)',
    required: false,
  })
  @IsOptional()
  createdAt?: string;
}
