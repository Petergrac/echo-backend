import { CoreEntity } from '../../../common/entities/common.entity';
import {
  AuditAction,
  AuditResource,
  RiskEvent,
} from '../../../common/enums/audit.enums';
import { Entity, Column } from 'typeorm';

@Entity('audit_logs')
export class AuditLog extends CoreEntity {
  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditResource,
    nullable: true,
  })
  resource?: AuditResource;

  @Column({
    type: 'enum',
    enum: RiskEvent,
    nullable: true,
  })
  riskEvent?: RiskEvent;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  ip?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
