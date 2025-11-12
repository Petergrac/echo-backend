export class UserEntity {
  id: string;
  email: string;
  username: string;
  bio?: string | null;
  avatar?: string | null;
  location?: string | null;
  website?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
