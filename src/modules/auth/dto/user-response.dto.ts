import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  username: string;

  @Expose()
  avatar: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  bio?: string;

  @Expose()
  website?: string;

  @Expose()
  location?: string;

  @Expose()
  emailVerified: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
