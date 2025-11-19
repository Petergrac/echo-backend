import { Module } from '@nestjs/common';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { FeedRepository } from './repositories/feed.repository';
import { EngagementModule } from '../engagement/engagement.module';

@Module({
  imports: [EngagementModule],
  controllers: [FeedController],
  providers: [
    FeedService,
    FeedRepository,
  ],
  exports: [FeedService],
})
export class FeedModule {}