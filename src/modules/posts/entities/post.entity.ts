import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { CoreEntity } from '../../../common/entities/common.entity';
import { Like } from './post-like.entity';
import { Bookmark } from './bookmark.entity';
import { Reply } from './reply.entity';
import { Repost } from './repost.entity';
import { Media } from './media.entity';
import { PostHashtag } from './hashtag.entity';
import { Mention } from './mention.entity';

export enum PostVisibility {
  PUBLIC = 'public',
  FOLLOWERS = 'followers',
  PRIVATE = 'private',
}

@Entity()
@Index(['author', 'visibility', 'createdAt']) //* For feed queries
@Index(['createdAt']) //* For chronological sorting
@Index(['visibility']) //* For privacy filtering
export class Post extends CoreEntity {
  @Column('text', { nullable: true })
  content: string;

  @Column({
    type: 'enum',
    enum: PostVisibility,
    default: PostVisibility.PUBLIC,
  })
  visibility: PostVisibility;

  @Column()
  authorId: string;

  @Column({ default: 0 })
  likeCount: number;

  @Column({ default: 0 })
  replyCount: number;

  @Column({ default: 0 })
  repostCount: number;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  mediaCount: number;

  /**
   * TODO ================ RELATIONS =======
   */
  @OneToMany(() => Like, (like) => like.post, {
    onDelete: 'CASCADE',
  })
  likes: Like[];

  @OneToMany(() => Bookmark, (bookmark) => bookmark.post, {
    onDelete: 'CASCADE',
  })
  bookmarks: Bookmark[];

  @OneToMany(() => Reply, (reply) => reply.post, {
    onDelete: 'CASCADE',
  })
  replies: Reply[];

  @OneToMany(() => Repost, (repost) => repost.originalPost, {
    onDelete: 'CASCADE',
  })
  reposts: Repost[];

  @OneToMany(() => Media, (media) => media.post)
  media: Media[];

  @OneToMany(() => PostHashtag, (postHashtag) => postHashtag.post, {
    onDelete: 'CASCADE',
  })
  postHashtags: PostHashtag[];

  @OneToMany(() => Mention, (mention) => mention.post, {
    onDelete: 'CASCADE',
  })
  mentions: Mention[];

  @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  //TODO ======> VIRTUAL FIELDS <==========
  hashtags?: string[];
}
