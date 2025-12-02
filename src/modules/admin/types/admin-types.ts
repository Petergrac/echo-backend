export interface SystemMetrics {
  users: {
    total: number;
    activeToday: number;
    activeThisWeek: number;
    newToday: number;
    newThisWeek: number;
    banned: number;
    admins: number;
    moderators: number;
  };
  content: {
    posts: {
      total: number;
      today: number;
      thisWeek: number;
      withMedia: number;
      deleted: number;
    };
    replies: {
      total: number;
      today: number;
    };
    reposts: {
      total: number;
      today: number;
    };
    likes: {
      total: number;
      today: number;
    };
  };
  engagement: {
    averageLikesPerPost: number;
    averageRepliesPerPost: number;
    averageRepostsPerPost: number;
    mostEngagedPost: any;
  };
  chat: {
    conversations: number;
    messages: number;
    activeChatsToday: number;
  };
  system: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    databaseSize: string;
  };
}

export interface AdminFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'user' | 'admin' | 'moderator' | 'banned';
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
