// src/engagement/engagement.module.ts
import { Module } from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { EngagementController } from './engagement.controller';
import { LikeRepository } from './repositories/like.repository';
import { RippleRepository } from './repositories/ripple.repository';
import { ReEchoRepository } from './repositories/reecho.repository';
import { BookmarkRepository } from './repositories/bookmark.repository';
import { EngagementCountRepository } from './repositories/engagement-count.repository';
import { NotificationsModule } from '../notification/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [EngagementController],
  providers: [
    EngagementService,
    LikeRepository,
    RippleRepository,
    ReEchoRepository,
    BookmarkRepository,
    EngagementCountRepository,
  ],
  exports: [EngagementService],
})
export class EngagementModule {}
