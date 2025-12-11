import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Username can only contain letters, numbers, underscore and hyphen',
  })
  username: string;

  @IsString({ message: 'Invalid first name' })
  @MinLength(3, { message: 'Invalid first name' })
  firstName: string;

  @IsString({ message: 'Invalid last name' })
  @MinLength(3, { message: 'Invalid last name' })
  lastName: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  website?: string;

  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*/, {
    message:
      'Password too weak - must contain uppercase, lowercase, and number/special char',
  })
  password: string;
}
