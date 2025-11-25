import { Entity, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { CoreEntity } from '../../../common/entities/common.entity';

@Entity('refresh_tokens')
export class RefreshToken extends CoreEntity {
  @Column()
  tokenId: string;

  @Column()
  hashedToken: string;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ nullable: true })
  lastUsedAt?: Date;

  @Column({ nullable: true })
  ip?: string;

  @Column({ nullable: true })
  userAgent?: string;

  /**
   * TODO ================ RELATIONS =======
   */
  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  user: User;
}
