import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { CoreEntity } from '../../../common/entities/common.entity';
import { User } from '../../auth/entities/user.entity';
import { Reply } from './reply.entity';

@Entity()
@Index(['reply', 'user'], { unique: true }) //* Prevent duplicate likes
@Index(['createdAt']) //* For chronological sorting
export class RLike extends CoreEntity {
  @Column()
  userId: string;

  @Column()
  postId: string;

  /**
   * TODO ================ RELATIONS =======
   */
  @ManyToOne(() => User, (user) => user.likes, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Reply, (reply) => reply.likes, { onDelete: 'CASCADE' })
  reply: Reply;
}
