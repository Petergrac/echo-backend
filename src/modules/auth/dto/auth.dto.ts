import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class SignUpDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsNotEmpty({ message: 'Username is required.' })
  username: string;

  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email address.' })
  email: string;

  @IsNotEmpty({ message: 'Password cannot be empty.' })
  password: string;
}
