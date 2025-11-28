import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { CoreEntity } from '../../../common/entities/common.entity';
import { User } from '../../auth/entities/user.entity';

@Entity()
export class NotificationPreferences extends CoreEntity {
  @OneToOne(() => User, (user) => user.notificationPreferences, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  //* 1.In-app notifications
  @Column({ default: true })
  likes: boolean;

  @Column({ default: true })
  posts: boolean;

  @Column({ default: true })
  replies: boolean;

  @Column({ default: true })
  reposts: boolean;

  @Column({ default: true })
  follows: boolean;

  @Column({ default: true })
  mentions: boolean;

  @Column({ default: true })
  system: boolean;

  //* 2.Email notifications
  @Column({ default: false })
  emailLikes: boolean;

  @Column({ default: false })
  emailReplies: boolean;

  @Column({ default: false })
  emailReposts: boolean;

  @Column({ default: false })
  emailFollows: boolean;

  @Column({ default: false })
  emailMentions: boolean;

  @Column({ default: true })
  emailSystem: boolean;

  @Column({ default: true })
  emailDigest: boolean;

  //* 3.Push notifications
  @Column({ default: true })
  pushLikes: boolean;

  @Column({ default: true })
  pushReplies: boolean;

  @Column({ default: true })
  pushReposts: boolean;

  @Column({ default: true })
  pushFollows: boolean;

  @Column({ default: true })
  pushMentions: boolean;

  @Column({ default: true })
  pushSystem: boolean;

  //* 4.Additional preferences
  @Column({ default: true })
  soundEnabled: boolean;

  @Column({ default: true })
  vibrationEnabled: boolean;

  @Column({ default: 'immediate' })
  deliveryTiming: 'immediate' | 'digest' | 'off';

  @Column({ type: 'jsonb', default: () => "'[]'" })
  mutedUsers: string[]; //* Array of user IDs

  @Column({ type: 'jsonb', default: () => "'[]'" })
  mutedKeywords: string[]; //* Array of keywords to mute
}
