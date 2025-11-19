import { Module } from '@nestjs/common';
import { HashtagService } from './hashtag.service';
import { HashtagController } from './hashtag.controller';
import { HashtagRepository } from './repository/hashtag.repository';
import { EngagementModule } from '../engagement/engagement.module';

@Module({
  imports: [EngagementModule],
  controllers: [HashtagController],
  providers: [HashtagService, HashtagRepository],
  exports: [HashtagService],
})
export class HashtagModule {}
