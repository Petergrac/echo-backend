import { Global, Module } from '@nestjs/common';
import { AuditLogService } from '../services/audit.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../../modules/auth/entities/audit-log.entity';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from '../controllers/healthcare.controller';
import { HttpModule } from '@nestjs/axios';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), TerminusModule, HttpModule],
  controllers: [HealthController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class CommonModule {}
