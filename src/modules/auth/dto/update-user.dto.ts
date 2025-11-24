import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

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
