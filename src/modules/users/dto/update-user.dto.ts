import { PartialType, OmitType } from '@nestjs/mapped-types';
import { UserEntity } from '../entities/user.entity';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto extends PartialType(
  OmitType(UserEntity, [
    'id',
    'email',
    'role',
    'createdAt',
    'updatedAt',
  ] as const),
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
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(200)
  website?: string;
}
