import { Entity, Column, ManyToOne, Index, Unique } from 'typeorm';
import { CoreEntity } from '../../../common/entities/common.entity';
import { Conversation } from './conversation.entity';
import { User } from '../../auth/entities/user.entity';

@Entity()
@Unique(['conversation', 'user']) //? Prevent duplicate participants
@Index(['user', 'lastReadAt']) //? For user-specific queries
@Index(['conversation', 'isActive']) //? For active participant queries
export class ConversationParticipant extends CoreEntity {
  @ManyToOne(() => Conversation, (conversation) => conversation.participants, {
    onDelete: 'CASCADE',
  })
  conversation: Conversation;

  @Column()
  conversationId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isAdmin: boolean; //? For group chat admins

  @Column({ type: 'timestamp', nullable: true })
  joinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  leftAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastReadAt: Date;

  @Column({ default: 0 })
  unreadCount: number; //? Unread messages for this participant

  @Column({ default: true })
  notificationsEnabled: boolean;

  @Column({ type: 'jsonb', default: {} })
  preferences: Record<string, any>;
}
