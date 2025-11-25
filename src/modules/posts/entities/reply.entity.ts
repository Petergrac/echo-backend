import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Post } from './post.entity';
import { Media } from './media.entity';
import { CoreEntity } from '../../../common/entities/common.entity';
import { Mention } from './mention.entity';

@Entity()
@Index(['post', 'createdAt']) //? For post replies sorting
@Index(['author', 'createdAt']) //? For user's reply history
export class Reply extends CoreEntity {
  @Column('text')
  content: string;

  @Column()
  postId: string;

  @Column()
  authorId: string;

  @Column({ default: 0 })
  replyCount: number;

  @Column({ nullable: true })
  parentReplyId: string;

  /**
   * TODO ================ RELATIONS =======
   */
  @OneToMany(() => Media, (media) => media.reply)
  media: Media[];

  @OneToMany(() => Reply, (reply) => reply.parentReply)
  replies: Reply[];

  @OneToMany(() => Mention, (mention) => mention.reply)
  mentions: Mention[];

  @ManyToOne(() => Post, (post) => post.replies, { onDelete: 'CASCADE' })
  post: Post;

  @ManyToOne(() => User, (user) => user.replies, { onDelete: 'CASCADE' })
  author: User;

  @ManyToOne(() => Reply, (reply) => reply.replies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  parentReply: Reply;
}
