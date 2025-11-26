import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TagResponseDto {
  @ApiProperty({ description: 'Unique ID of the tag' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'When the tag was created' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'When the tag was last updated' })
  @Expose()
  updatedAt: Date;

  @ApiProperty({ example: 'design', description: 'The actual tag name' })
  @Expose()
  tag: string;

  @ApiProperty({
    example: 456,
    description: 'How many times this tag has been used',
  })
  @Expose()
  usageCount: number;

  @ApiProperty({ example: 185, description: 'Number of posts with this tag' })
  @Expose()
  postCount: number;

  @ApiProperty({ example: 43, description: 'Trending/hotness score' })
  @Expose()
  trendScore: number;

  @ApiProperty({ description: 'Last time this tag appeared on a post' })
  @Expose()
  lastUsedAt: Date | null;
}
