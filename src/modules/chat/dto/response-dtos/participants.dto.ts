import { Expose, Type } from 'class-transformer';
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsDate,
  IsOptional,
} from 'class-validator';
import { UserDto } from './user-response.dto';

export class ParticipantDto {
  @Expose()
  @IsString()
  id: string;

  @Expose()
  @IsString()
  userId: string;

  @Expose()
  @IsBoolean()
  isActive: boolean;

  @Expose()
  @IsBoolean()
  isAdmin: boolean;

  @Expose()
  @IsOptional()
  @IsDate()
  joinedAt?: Date;

  @Expose()
  @IsOptional()
  @IsNumber()
  unreadCount?: number;

  @Expose()
  @IsBoolean()
  notificationsEnabled: boolean;

  @Expose()
  @Type(() => UserDto)
  user: UserDto;
}
