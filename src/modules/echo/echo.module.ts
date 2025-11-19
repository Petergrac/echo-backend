import { Module } from '@nestjs/common';
import { EchoService } from './echo.service';
import { EchoController } from './echo.controller';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { FileValidationPipe } from './pipes/file-validation.pipe';

@Module({
  imports: [CloudinaryModule],
  controllers: [EchoController],
  providers: [EchoService, FileValidationPipe],
})
export class EchoModule {}
