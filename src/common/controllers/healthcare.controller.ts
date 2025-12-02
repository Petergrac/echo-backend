import { Controller, Get } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    //* Http Indicator
    return this.health
      .check([
        () => this.http.pingCheck('nestjs-docs', 'https://docs.nestjs.com'),
        () => this.db.pingCheck('database'),
        () =>
          this.disk.checkStorage('storage', {
            path: '/',
            thresholdPercent: 0.9,
          }),
        () => this.memory.checkHeap('memory-heap', 300 * 1024 * 1024),
        () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      ])
      .catch((error) => {
        throw error;
      });
  }
  @Get('debug-sentry')
  getError() {
    //? Send a log before throwing the error
    Sentry.logger.info('User triggered test error', {
      action: 'test_error_endpoint',
    });
    //? Send a test metric before throwing the error
    Sentry.metrics.count('test_counter', 1);
    throw new Error('My first Sentry error!');
  }
}
