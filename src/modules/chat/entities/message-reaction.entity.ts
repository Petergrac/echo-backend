import { Entity, Column, ManyToOne, Index, Unique } from 'typeorm';
import { CoreEntity } from '../../../common/entities/common.entity';
import { Message } from './message.entity';
import { User } from '../../auth/entities/user.entity';

@Entity()
@Unique(['message', 'user', 'emoji']) //? Prevent duplicate reactions
@Index(['message', 'emoji']) //? For reaction counts
export class MessageReaction extends CoreEntity {
  @ManyToOne(() => Message, (message) => message.reactions, {
    onDelete: 'CASCADE',
  })
  message: Message;

  @Column()
  messageId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column()
  emoji: string; //? Unicode emoji or shortcode

  @Column({ type: 'timestamp' })
  reactedAt: Date;
}
