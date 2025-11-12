import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuditAction } from '../../generated/prisma/enums';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(userId: string | null, action: AuditAction, meta?: object) {
    await this.prisma.auditLog.create({
      data: { userId, action, meta },
    });
  }
}
