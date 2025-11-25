import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Post } from './post.entity';
import { CoreEntity } from '../../../common/entities/common.entity';

@Entity()
@Index(['user', 'createdAt']) //? For user's repost history
@Index(['originalPost', 'createdAt']) //? For repost counts
export class Repost extends CoreEntity {
  @Column({ type: 'text', nullable: true })
  content: string;

  @Column()
  userId: string;

  @Column()
  originalPostId: string;

  /**
   * TODO ================ RELATIONS =======
   */
  @ManyToOne(() => Post, (post) => post.reposts, { onDelete: 'CASCADE' })
  originalPost: Post;

  @ManyToOne(() => User, (user) => user.reposts, { onDelete: 'CASCADE' })
  user: User;
}
