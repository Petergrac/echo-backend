import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { AdminUsersController, UsersController } from './users.controller';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { UserRepository } from './repository/user.repository';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';
import { FollowController } from './follow/follow.controller';
import { FollowService } from './follow/follow.service';
import { FollowRepository } from './repository/follow.repository';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CloudinaryModule, NotificationsModule],
  controllers: [UsersController, AdminUsersController, FollowController],
  providers: [
    UsersService,
    UserRepository,
    FileValidationPipe,
    FollowService,
    FollowRepository,
  ],
})
export class UsersModule {}
