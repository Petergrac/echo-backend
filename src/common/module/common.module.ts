import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { AuditService } from '../services/audit.service';

@Global()
@Module({
  providers: [PrismaService, AuditService],
  exports: [PrismaService, AuditService],
})
export class CommonModule {}
