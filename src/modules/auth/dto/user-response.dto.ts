import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Email address', example: 'user@example.com' })
  @Expose()
  email: string;

  @ApiProperty({ description: 'Username', example: 'john_doe123' })
  @Expose()
  username: string;

  @ApiProperty({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  @Expose()
  avatar: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  @Expose()
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @Expose()
  lastName: string;

  @ApiPropertyOptional({
    description: 'Short biography',
    example: 'Software developer',
  })
  @Expose()
  bio?: string;

  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://john.doe.com',
  })
  @Expose()
  website?: string;

  @ApiPropertyOptional({ description: 'Location', example: 'New York, USA' })
  @Expose()
  location?: string;

  @ApiProperty({ description: 'Email verification status', example: true })
  @Expose()
  emailVerified: boolean;

  @ApiProperty({ description: 'Resource type', example: 'user' })
  @Expose()
  resourceType: string;

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  updatedAt: Date;

  @ApiProperty({ description: 'Number of followers', example: 150 })
  @Expose()
  followersCount: number;

  @ApiProperty({ description: 'Number of followed users', example: 75 })
  @Expose()
  followingCount: number;

  @ApiProperty({ description: 'Number of posts', example: 42 })
  @Expose()
  postCount: number;

  @ApiProperty({
    description: 'Whether current user is following this user',
    example: false,
  })
  @Expose()
  isFollowing: boolean;
}
