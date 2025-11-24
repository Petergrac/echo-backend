import { Global, Module } from '@nestjs/common';
import { AuditLogService } from '../services/audit.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../../modules/auth/entities/audit-log.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class CommonModule {}
