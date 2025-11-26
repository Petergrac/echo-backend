import { Entity, ManyToOne, Unique } from 'typeorm';
import { CoreEntity } from '../../../../common/entities/common.entity';
import { User } from '../../../auth/entities/user.entity';

@Entity('follow')
@Unique(['follower', 'following'])
export class Follow extends CoreEntity {
  //* The user who follows another user
  @ManyToOne(() => User, (user) => user.following, {
    onDelete: 'CASCADE',
  })
  follower: User;

  //* The user who is being followed
  @ManyToOne(() => User, (user) => user.followers, {
    onDelete: 'CASCADE',
  })
  following: User;
}
