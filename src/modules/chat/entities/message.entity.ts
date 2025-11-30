import { Entity, Column, ManyToOne, OneToMany, Index } from 'typeorm';
import { CoreEntity } from '../../../common/entities/common.entity';
import { Conversation } from './conversation.entity';
import { User } from '../../auth/entities/user.entity';
import { MessageReadReceipt } from './message-read-receipt.entity';
import { MessageReaction } from './message-reaction.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'file',
  SYSTEM = 'system', //? For system messages like "user joined"
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

@Entity()
@Index(['conversation', 'createdAt']) //? For message history
@Index(['sender', 'createdAt']) //? For user's sent messages
@Index(['conversation', 'status']) //? For status tracking
export class Message extends CoreEntity {
  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  conversation: Conversation;

  @Column()
  conversationId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  sender: User;

  @Column()
  senderId: string;

  //? Reply functionality
  @ManyToOne(() => Message, { nullable: true })
  replyTo: Message;

  @Column({ nullable: true })
  replyToId: string;

  //? Media attachments
  @Column({ type: 'jsonb', nullable: true })
  media: {
    url: string;
    publicId: string;
    type: string;
    width?: number;
    height?: number;
    duration?: number;
    fileSize?: number;
  };

  //? Relations
  @OneToMany(() => MessageReadReceipt, (receipt) => receipt.message)
  readReceipts: MessageReadReceipt[];

  @OneToMany(() => MessageReaction, (reaction) => reaction.message)
  reactions: MessageReaction[];

  //? Additional metadata
  @Column({ type: 'jsonb', default: {} })
  metadata: any;

  //? Soft delete for message deletion (delete for me only)
  @Column({ type: 'timestamp', nullable: true })
  deletedForUserAt: Date;

  @Column({ nullable: true })
  deletedForUserId: string;
}
