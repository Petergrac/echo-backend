import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { CoreEntity } from '../../../../common/entities/common.entity';
import { User } from '../../../auth/entities/user.entity';

@Entity('follows')
@Unique(['follower', 'following'])
export class Follow extends CoreEntity {
  //* The user who follows another user
  @ManyToOne(() => User, (user) => user.following, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'followerId' })
  follower: User;

  //* The user who is being followed
  @ManyToOne(() => User, (user) => user.followers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'followingId' })
  following: User;

  @Column()
  followingId: string;

  @Column()
  followerId: string;
}
