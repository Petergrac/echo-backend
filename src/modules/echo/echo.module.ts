import { Module } from '@nestjs/common';
import { EchoService } from './echo.service';
import { EchoController } from './echo.controller';

@Module({
  controllers: [EchoController],
  providers: [EchoService],
})
export class EchoModule {}
