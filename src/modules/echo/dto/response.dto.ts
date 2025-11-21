export class RippleResponseDto {
  user: {
    username: string;
    avatar: string | null;
  };
  _count: {
    replies: number;
  };

  id: string;
  content: string;
  userId: string;
  echoId: string;
  parentId: string | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
