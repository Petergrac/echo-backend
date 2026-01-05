import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiPropertyOptional({
    description: 'Email address for login',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Username for login',
    example: 'john_doe123',
  })
  @IsOptional()
  @IsNotEmpty({ message: 'Username cannot be empty' })
  username?: string;

  @ApiProperty({
    description: 'Password',
    example: 'Password123!',
    required: true,
  })
  @IsNotEmpty({ message: 'Password cannot be empty.' })
  password: string;
}
