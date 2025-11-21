import { Injectable, Logger } from '@nestjs/common';
import { EchoService } from './echo.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CronService {
  private logger = new Logger(CronService.name);
  constructor(private readonly echoService: EchoService) {}

  //* Run Cleanup every day
  @Cron(CronExpression.EVERY_DAY_AT_11PM)
  async cleanDeleteEchoes(){
    this.logger.log('Running cleanup job...');
    await this.echoService.deleteMediaFiles();
    this.logger.log('Cleanup job is completed')
  }
}
