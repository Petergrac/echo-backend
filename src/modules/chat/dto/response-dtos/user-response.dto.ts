import { Expose } from 'class-transformer';
import { IsString, IsOptional, IsDate } from 'class-validator';

export class UserDto {
  @Expose()
  @IsString()
  id: string;

  @Expose()
  @IsString()
  username: string;

  @Expose()
  @IsString()
  firstName: string;

  @Expose()
  @IsOptional()
  @IsString()
  lastName?: string;

  @Expose()
  @IsOptional()
  @IsString()
  avatar?: string;

  @Expose()
  @IsOptional()
  @IsString()
  bio?: string;

  @Expose()
  @IsOptional()
  @IsDate()
  createdAt?: Date;
}
