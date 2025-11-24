import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {}

// TODO =============== PASSWORD RESET DTO ===================
export class ResetPasswordDto {
  @IsOptional()
  @IsNotEmpty({ message: 'Token is required.' })
  token?: string;

  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  newPassword: string;
}

//TODO ============= PASSWORD REQUEST RESET DTO ==============
export class RequestPasswordResetDto {
  @IsEmail({}, { message: 'Invalid email address.' })
  email: string;
}
