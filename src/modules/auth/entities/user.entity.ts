import { Column, Entity, OneToMany } from 'typeorm';
import { CoreEntity } from '../../../common/entities/common.entity';
import { EmailToken } from './email-token.entity';
import { RefreshToken } from './refresh-token.entity';
import { Follow } from '../../users/follow/entities/follow.entity';
import { Post } from '../../posts/entities/post.entity';
import { Like } from '../../posts/entities/post-like.entity';
import { Bookmark } from '../../posts/entities/bookmark.entity';
import { Reply } from '../../posts/entities/reply.entity';
import { Repost } from '../../posts/entities/repost.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User extends CoreEntity {
  @Column({ unique: true })
  email: string;

  @Column({ unique: true, length: 100 })
  username: string;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  avatarPublicId: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  bio?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  resourceType: string;

  @Column()
  passwordHash: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  /**
   * TODO ================ RELATIONS =======
   */
  @OneToMany(() => RefreshToken, (t) => t.user, {
    cascade: ['soft-remove', 'recover'],
  })
  refreshTokens: RefreshToken[];

  @OneToMany(() => EmailToken, (e) => e.user, {
    cascade: ['soft-remove', 'recover'],
  })
  emailTokens: EmailToken[];

  @OneToMany(() => Follow, (follow) => follow.follower)
  followers: Follow[];

  @OneToMany(() => Follow, (follow) => follow.following)
  following: Follow[];

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @OneToMany(() => Like, (like) => like.user)
  likes: Like[];

  @OneToMany(() => Bookmark, (bookmark) => bookmark.user)
  bookmarks: Bookmark[];

  @OneToMany(() => Reply, (reply) => reply.author)
  replies: Reply[];

  @OneToMany(() => Repost, (repost) => repost.user)
  reposts: Repost[];
}
