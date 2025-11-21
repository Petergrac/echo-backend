import { Module } from '@nestjs/common';
import { EchoService } from './echo.service';
import { EchoController } from './echo.controller';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { FileValidationPipe } from './pipes/file-validation.pipe';
import { EchoRepository } from './repository/echo-repo.repository';
import { CronService } from './echo-cron.service';

@Module({
  imports: [CloudinaryModule],
  controllers: [EchoController],
  providers: [EchoService, FileValidationPipe, EchoRepository, CronService],
})
export class EchoModule {}
