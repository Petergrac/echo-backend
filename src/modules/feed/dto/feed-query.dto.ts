export class FeedQueryDto {
  cursor: string | null; // ISO date string for cursor-based pagination
  limit?: number;  // Number of items to fetch
}