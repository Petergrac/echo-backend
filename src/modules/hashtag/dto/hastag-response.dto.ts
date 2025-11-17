// src/hashtag/dto/hashtag-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class HashtagDto {
  @ApiProperty({ example: 'programming' })
  name: string;

  @ApiProperty({ example: 150 })
  echoCount: number;

  @ApiProperty({ example: '2023-11-16T10:15:00.000Z' })
  lastUsed: Date;
}

export class HashtagEchoesResponseDto {
  @ApiProperty({ type: [HashtagDto] })
  hashtags: HashtagDto[];

  @ApiProperty({ example: 50 })
  totalCount: number;
}

export class TrendingHashtagsResponseDto {
  @ApiProperty({ type: [HashtagDto] })
  trending: HashtagDto[];

  @ApiProperty({ example: '7d' })
  timeframe: string;
}