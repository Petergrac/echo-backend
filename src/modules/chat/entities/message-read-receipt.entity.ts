import { Entity, Column, ManyToOne, Index, Unique } from 'typeorm';
import { CoreEntity } from '../../../common/entities/common.entity';
import { Message } from './message.entity';
import { User } from '../../auth/entities/user.entity';

@Entity()
@Unique(['message', 'user']) //? One receipt per user per message
@Index(['user', 'readAt']) //? For user read history
export class MessageReadReceipt extends CoreEntity {
  @ManyToOne(() => Message, (message) => message.readReceipts, {
    onDelete: 'CASCADE',
  })
  message: Message;

  @Column()
  messageId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'timestamp' })
  readAt: Date;
}
