import { Entity, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { CoreEntity } from '../../../common/entities/common.entity';

@Entity('email_tokens')
export class EmailToken extends CoreEntity {
  @Column()
  tokenHash: string;

  @Column({ type: 'enum', enum: ['VERIFY', 'RESET'] })
  type: 'VERIFY' | 'RESET';

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  /**
   * TODO ================ RELATIONS =======
   */
  @ManyToOne(() => User, (user) => user.emailTokens, {
    onDelete: 'CASCADE',
  })
  user: User;
}
