// src/common/controllers/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return { status: 'ok', message: 'Echo backend healthy ✅' };
  }
}
