import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { CoreEntity } from '../../../common/entities/common.entity';
import { Post } from './post.entity';

@Entity()
@Index(['tag']) //? For fast hashtag lookups
@Index(['usageCount']) //? For trending queries
export class Hashtag extends CoreEntity {
  @Column({ unique: true })
  tag: string; //? Lowercase

  @Column({ default: 0 })
  usageCount: number; //? Total times used across all posts

  @Column({ default: 0 })
  postCount: number; //? Number of posts currently using this hashtag

  @Column({ default: 0 })
  trendScore: number; //? Calculated score for trending

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUsedAt: Date;

  //todo====> Relations
  @OneToMany(() => PostHashtag, (postHashtag) => postHashtag.hashtag)
  postHashtags: PostHashtag[];
}
@Entity()
@Index(['hashtag', 'createdAt'])
@Index(['post', 'hashtag']) // For post-specific hashtag queries
export class PostHashtag extends CoreEntity {
  @ManyToOne(() => Post, (post) => post.postHashtags, { onDelete: 'CASCADE' })
  post: Post;

  @ManyToOne(() => Hashtag, (hashtag) => hashtag.postHashtags, {
    onDelete: 'CASCADE',
  })
  hashtag: Hashtag;

  @Column()
  postId: string;

  @Column()
  hashtagId: string;
}
