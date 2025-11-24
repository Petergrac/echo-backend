import { Column, Entity, OneToMany } from 'typeorm';
import { CoreEntity } from '../../../common/entities/common.entity';
import { EmailToken } from './email-token.entity';
import { RefreshToken } from './refresh-token.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User extends CoreEntity {
  @Column({ unique: true })
  email: string;

  @Column({ unique: true, length: 100 })
  username: string;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  avatarPublicId: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  bio?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  location?: string;

  @Column()
  passwordHash: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @OneToMany(() => RefreshToken, (t) => t.user, { cascade: true })
  refreshTokens: RefreshToken[];

  @OneToMany(() => EmailToken, (e) => e.user, { cascade: true })
  emailTokens: EmailToken[];
}
