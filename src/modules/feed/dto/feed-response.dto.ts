import { ApiProperty } from '@nestjs/swagger';
import { EchoResponseDto } from '../../echo/dto/echo-response.dto';
import { EngagementCountsDto, UserEngagementStateDto } from '../../engagement/dto/engagement-response.dto';

export class FeedEchoDto extends EchoResponseDto {
 
  @ApiProperty()
  declare counts: EngagementCountsDto;

  @ApiProperty()
  userState: UserEngagementStateDto;

  @ApiProperty({ example: 0.85 })
  trendingScore?: number; // For trending feed
}

export class FeedMetaDto {
  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: '2023-11-16T10:15:00.000Z', required: false })
  nextCursor?: string;

  @ApiProperty({ example: 10 })
  count: number;

  @ApiProperty({ example: 150 })
  totalCount?: number;
}

export class FeedResponseDto {
  @ApiProperty({ type: [FeedEchoDto] })
  items: FeedEchoDto[];

  @ApiProperty()
  meta: FeedMetaDto;
}