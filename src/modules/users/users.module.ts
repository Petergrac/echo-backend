import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { UserRepository } from './user.repository';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';

@Module({
  imports: [CloudinaryModule],
  controllers: [UsersController],
  providers: [UsersService, UserRepository, FileValidationPipe],
})
export class UsersModule {}
