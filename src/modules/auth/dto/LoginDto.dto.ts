import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

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
