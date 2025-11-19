export interface FollowUser {
  id: string;
  username: string;
  email: string;
}

export interface ToggleFollowResponse {
  action: 'followed' | 'unfollowed';
  following: FollowUser | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
