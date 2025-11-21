import { PartialType, OmitType } from '@nestjs/mapped-types';
import { UserEntity } from '../entities/user.entity';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto extends PartialType(
  OmitType(UserEntity, ['id', 'role', 'createdAt', 'updatedAt'] as const),
) {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  lastName?: string;

  @IsOptional()
  @IsString({
    message: 'name must be a string with more that 2 characters',
  })
  @MinLength(3)
  @MaxLength(30)
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'A valid string bio is needed' })
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsEmail({}, { message: 'A valid email is needed' })
  @MaxLength(500)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(200)
  website?: string;
}
