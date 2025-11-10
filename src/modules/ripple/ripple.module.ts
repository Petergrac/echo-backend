import { Module } from '@nestjs/common';
import { RippleService } from './ripple.service';
import { RippleController } from './ripple.controller';

@Module({
  controllers: [RippleController],
  providers: [RippleService],
})
export class RippleModule {}
