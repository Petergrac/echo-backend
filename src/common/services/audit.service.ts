import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../modules/auth/entities/audit-log.entity';

import { AuditAction, AuditResource, RiskEvent } from '../enums/audit.enums';

export interface AuditLogInput {
  action: AuditAction;
  resource?: AuditResource;
  riskEvent?: RiskEvent;
  userId?: string | undefined;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async createLog(input: AuditLogInput) {
    const log = this.auditRepo.create({
      ...input,
    });

    return this.auditRepo.save(log);
  }

  async getLogsForUser(userId: string) {
    return this.auditRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteAllLogsForUser(userId: string) {
    await this.auditRepo.delete({ userId });
  }
}
