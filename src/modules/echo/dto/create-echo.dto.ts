import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateEchoDto {
  @IsOptional()
  @IsString()
  @MaxLength(280, { message: 'Echo content cannot exceed 280 characters' })
  content?: string;

  @IsOptional()
  @IsBoolean()
  sensitivity?: boolean; // true if content is explicit
}
