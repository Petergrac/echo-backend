import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { CoreEntity } from '../../../common/entities/common.entity';
import { User } from '../../auth/entities/user.entity';
import { Post } from '../../posts/entities/post.entity';
import { Reply } from '../../posts/entities/reply.entity';

export enum NotificationType {
  LIKE = 'LIKE',
  REPLY = 'REPLY',
  REPOST = 'REPOST',
  FOLLOW = 'FOLLOW',
  MENTION = 'MENTION',
  SYSTEM = 'SYSTEM',
}

@Entity()
@Index(['recipient', 'read', 'createdAt'])
@Index(['recipient', 'type', 'createdAt'])
export class Notification extends CoreEntity {
  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  recipient: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  actor: User;

  @ManyToOne(() => Post, { onDelete: 'CASCADE', nullable: true })
  post: Post;

  @Column({ nullable: true })
  postId: string;

  @ManyToOne(() => Reply, { onDelete: 'CASCADE', nullable: true })
  reply: Reply;

  @Column({ nullable: true })
  replyId: string;

  @Column({ default: false })
  read: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  shouldSendRealTime(): boolean {
    return this.type !== NotificationType.SYSTEM;
  }
}
