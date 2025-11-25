import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { Post } from './post.entity';
import { User } from '../../auth/entities/user.entity';
import { CoreEntity } from '../../../common/entities/common.entity';

@Entity()
@Index(['post', 'user'], { unique: true }) //? Prevent duplicate bookmarks
@Index(['user', 'createdAt']) //? For user's bookmark feed
export class Bookmark extends CoreEntity {
  @Column()
  userId: string;

  @Column()
  postId: string;
  /**
   * TODO ================ RELATIONS =======
   */
  @ManyToOne(() => Post, (post) => post.bookmarks, { onDelete: 'CASCADE' })
  post: Post;

  @ManyToOne(() => User, (user) => user.bookmarks, { onDelete: 'CASCADE' })
  user: User;
}
