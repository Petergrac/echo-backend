import { Entity, Column, OneToMany, Index, ManyToOne } from 'typeorm';
import { CoreEntity } from '../../../common/entities/common.entity';
import { ConversationParticipant } from './conversation-participant.entity';
import { Message } from './message.entity';
import { User } from '../../auth/entities/user.entity';

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
}

@Entity()
@Index(['lastMessageAt']) //? For sorting conversations
@Index(['type', 'createdAt']) //? For query optimization
export class Conversation extends CoreEntity {
  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  type: ConversationType;

  @Column({ nullable: true })
  name: string; //? For group chats

  @Column({ nullable: true })
  avatar: string; //? For group chats

  @Column({ nullable: true })
  avatarPublicId: string;

  @ManyToOne(() => User, { nullable: true })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  //TODO =================> Relations  <====================
  @OneToMany(
    () => ConversationParticipant,
    (participant) => participant.conversation,
    { cascade: true },
  )
  participants: ConversationParticipant[];

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  //? Counters for performance
  @Column({ default: 0 })
  messageCount: number;

  @Column({ default: 0 })
  unreadCount: number; //? Total unread messages in conversation

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @Column({ nullable: true })
  lastMessageId: string;

  //? Additional metadata
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
