import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { User } from '../auth/entities/user.entity';
import { FollowModule } from './follow/follow.module';
import { CleanupOldAccountsTask } from '../../common/tasks/cleanup.task';

@Module({
  imports: [TypeOrmModule.forFeature([User]), CloudinaryModule, FollowModule],
  controllers: [UsersController],
  providers: [UsersService, CleanupOldAccountsTask],
})
export class UsersModule {}
