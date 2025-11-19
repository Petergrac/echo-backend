import { Module } from '@nestjs/common';
import { EchoService } from './echo.service';
import { EchoController } from './echo.controller';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { EchoRepository } from './repository/echo-repo.repository';
import { FileValidationPipe } from './pipes/file-validation.pipe';
import { HashtagModule } from '../hashtag/hashtag.module';
import { EngagementModule } from '../engagement/engagement.module';

@Module({
  imports: [CloudinaryModule, HashtagModule, EngagementModule],
  controllers: [EchoController],
  providers: [EchoService, EchoRepository, FileValidationPipe],
})
export class EchoModule {}
