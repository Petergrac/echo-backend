import { Module } from '@nestjs/common';
import { HashtagService } from './hashtag.service';
import { HashtagController } from './hashtag.controller';
import { HashtagRepository } from './repository/hashtag.repository';
import { EngagementCountRepository } from '../engagement/repositories/engagement-count.repository';

@Module({
  controllers: [HashtagController],
  providers: [
    HashtagService,
    HashtagRepository,
    EngagementCountRepository,
  ],
  exports: [HashtagService],
})
export class HashtagModule {}