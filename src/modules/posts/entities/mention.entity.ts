import { Entity, ManyToOne, Index, Column } from 'typeorm';
import { CoreEntity } from '../../../common/entities/common.entity';
import { Post } from './post.entity';
import { Reply } from './reply.entity';
import { User } from '../../auth/entities/user.entity';

@Entity()
@Index(['mentionedUser', 'createdAt']) //? For user's mention feed
@Index(['post', 'mentionedUser']) //? For post mention queries
@Index(['reply', 'mentionedUser']) //? For reply mention queries
export class Mention extends CoreEntity {
  @Column({ default: false })
  read: boolean;

  @ManyToOne(() => Post, (post) => post.mentions, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  post: Post;

  @ManyToOne(() => Reply, (reply) => reply.mentions, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  reply: Reply;

  @ManyToOne(() => User, (user) => user.mentions, { onDelete: 'CASCADE' })
  mentionedUser: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  author: User; //* Who created the mention
}
