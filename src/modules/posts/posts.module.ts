import { Module } from '@nestjs/common';
import { PostsService } from './services/posts.service';
import { PostsController } from './controllers/posts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { Like } from './entities/post-like.entity';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { Media } from './entities/media.entity';
import { User } from '../auth/entities/user.entity';
import { Bookmark } from './entities/bookmark.entity';
import { Reply } from './entities/reply.entity';
import { Repost } from './entities/repost.entity';
import { EngagementController } from './controllers/engagement.controller';
import { EngagementService } from './services/engagement.service';
import { Hashtag, PostHashtag } from './entities/hashtag.entity';
import { Mention } from './entities/mention.entity';
import { HashtagService } from './services/hashtag.service';
import { MentionService } from './services/mention.service';
import { FeedService } from './services/feed.service';
import { HashtagController } from './controllers/hashtag.controller';
import { MentionController } from './controllers/mention.controller';
import { DeleteOrphanedHashTagsTask } from '../../common/tasks/cleanup.task';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    CloudinaryModule,
    NotificationsModule,
    TypeOrmModule.forFeature([
      Post,
      Like,
      Hashtag,
      Mention,
      PostHashtag,
      Media,
      User,
      Bookmark,
      Reply,
      Repost,
    ]),
  ],
  controllers: [
    PostsController,
    EngagementController,
    HashtagController,
    MentionController,
  ],
  providers: [
    PostsService,
    EngagementService,
    HashtagService,
    MentionService,
    FeedService,
    DeleteOrphanedHashTagsTask,
  ],
})
export class PostsModule {}
