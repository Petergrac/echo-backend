import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    required: true,
  })
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @ApiProperty({
    description: 'Username (letters, numbers, underscore and hyphen only)',
    example: 'john_doe123',
    minLength: 3,
    required: true,
  })
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Username can only contain letters, numbers, underscore and hyphen',
  })
  username: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
    minLength: 3,
    required: true,
  })
  @IsString({ message: 'Invalid first name' })
  @MinLength(3, { message: 'Invalid first name' })
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
    minLength: 3,
    required: true,
  })
  @IsString({ message: 'Invalid last name' })
  @MinLength(3, { message: 'Invalid last name' })
  lastName: string;

  @ApiPropertyOptional({
    description: 'User location',
    example: 'New York, USA',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Short biography',
    example: 'Software developer passionate about open source',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: 'Personal website URL',
    example: 'https://john.doe.com',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  website?: string;

  @ApiProperty({
    description:
      'Password (must contain uppercase, lowercase, and number/special char)',
    example: 'Password123!',
    minLength: 8,
    required: true,
  })
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*/, {
    message:
      'Password too weak - must contain uppercase, lowercase, and number/special char',
  })
  password: string;
}
