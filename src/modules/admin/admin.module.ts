import { Module } from '@nestjs/common';
import { AdminService } from './services/admin.service';
import { AdminController } from './controllers/admin.controller';
import { AdminGuard } from './guards/admin.guard';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { Conversation } from '../chat/entities/conversation.entity';
import { Message } from '../chat/entities/message.entity';
import { Post } from '../posts/entities/post.entity';
import { Repost } from '../posts/entities/repost.entity';
import { Like } from '../posts/entities/post-like.entity';
import { Follow } from '../users/follow/entities/follow.entity';
import { Reply } from '../posts/entities/reply.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      AuditLog,
      Conversation,
      Message,
      Post,
      Repost,
      Like,
      Follow,
      Reply,
    ]),
    CloudinaryModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
