import { IsEmail, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

// TODO ====================  SIGNUP DTO ===============
export class SignUpDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsNotEmpty({ message: 'Username is required.' })
  username: string;

  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;
}
//TODO ===================== LOGIN DTO ===========
export class LoginDto {
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @IsOptional()
  @IsNotEmpty({ message: 'Username cannot be empty' })
  username?: string;

  @IsNotEmpty({ message: 'Password cannot be empty.' })
  password: string;
}
//TODO ============= PASSWORD REQUEST RESET DTO ==============
export class RequestPasswordResetDto {
  @IsEmail({}, { message: 'Invalid email address.' })
  email: string;
}
// TODO =============== PASSWORD RESET DTO ===================
export class ResetPasswordDto {
  @IsOptional()
  @IsNotEmpty({ message: 'Token is required.' })
  token?: string;

  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  newPassword: string;
}
