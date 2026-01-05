import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiPropertyOptional({
    description:
      'Password reset token (can also be provided via query parameter)',
    example: 'abc123def456',
  })
  @IsOptional()
  @IsNotEmpty({ message: 'Token is required.' })
  token?: string;

  @ApiProperty({
    description:
      'New password (must contain uppercase, lowercase, and number/special char)',
    example: 'NewPassword123!',
    minLength: 8,
    required: true,
  })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*/, {
    message:
      'Password too weak - must contain uppercase, lowercase, and number/special char',
  })
  newPassword: string;
}

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'Email address for password reset',
    example: 'user@example.com',
    required: true,
  })
  @IsEmail({}, { message: 'Invalid email address.' })
  email: string;
}
