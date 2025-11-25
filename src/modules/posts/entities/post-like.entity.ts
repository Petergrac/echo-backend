import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { CoreEntity } from '../../../common/entities/common.entity';
import { Post } from './post.entity';
import { User } from '../../auth/entities/user.entity';

@Entity()
@Index(['post', 'user'], { unique: true }) //* Prevent duplicate likes
@Index(['createdAt']) //* For chronological sorting
export class Like extends CoreEntity {
  @Column()
  userId: string;

  @Column()
  postId: string;

  /**
   * TODO ================ RELATIONS =======
   */
  @ManyToOne(() => User, (user) => user.likes, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Post, (post) => post.likes, { onDelete: 'CASCADE' })
  post: Post;
}
