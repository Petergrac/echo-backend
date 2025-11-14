enum user {
  user,
  admin,
}
export class UserEntity {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  username: string;
  bio: string;
  location: string;
  website: string;
  avatar: string;
  role: user;
  emailVerified: boolean;
}
