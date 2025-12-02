# Echo App - API Endpoints Documentation

## 📋 Complete Endpoint Map

---

## 🔐 AUTH MODULE (`/auth`)

### Authentication & Token Management

| Method | Endpoint                       | Description                                        | Auth Required |
| ------ | ------------------------------ | -------------------------------------------------- | ------------- |
| POST   | `/auth/signup`                 | Create new user and return access + refresh tokens | ❌            |
| POST   | `/auth/login`                  | Login with email/username and return tokens        | ❌            |
| GET    | `/auth/refresh`                | Rotate refresh token and issue new access token    | ❌            |
| GET    | `/auth/logout`                 | Revoke refresh token (single device)               | ❌            |
| POST   | `/auth/logout-all`             | Revoke all refresh tokens (all devices)            | ❌            |
| POST   | `/auth/request-password-reset` | Generate password reset token and send email       | ❌            |
| POST   | `/auth/reset-password`         | Reset password with token verification             | ❌            |
| GET    | `/auth/verify-email`           | Verify email address with token                    | ❌            |

### Email Testing

| Method | Endpoint      | Description                  | Auth Required |
| ------ | ------------- | ---------------------------- | ------------- |
| GET    | `/email/test` | Send test verification email | ❌            |

---

## 👥 USERS MODULE (`/users`)

### User Profile Management

| Method | Endpoint           | Description                              | Auth Required |
| ------ | ------------------ | ---------------------------------------- | ------------- |
| GET    | `/users/me`        | Get current authenticated user profile   | ✅            |
| GET    | `/users/:username` | Get user profile by username             | ✅            |
| PATCH  | `/users/me`        | Update user profile and/or avatar upload | ✅            |
| DELETE | `/users/me`        | Delete user account (soft delete)        | ✅            |

### Follow Management (Nested in Users Module)

| Method | Endpoint                      | Description                                     | Auth Required |
| ------ | ----------------------------- | ----------------------------------------------- | ------------- |
| POST   | `/users/:username/follow`     | Toggle follow/unfollow user                     | ✅            |
| GET    | `/users/:username/followers`  | Get list of user's followers (paginated)        | ✅            |
| GET    | `/users/:username/following`  | Get list of users this user follows (paginated) | ✅            |
| GET    | `/users/current/me/followers` | Get my followers list (paginated)               | ✅            |
| GET    | `/users/current/me/following` | Get list of users I follow (paginated)          | ✅            |

**Query Parameters:**

- `page` (optional, default: 1)
- `limit` (optional, default: varies)

---

## 📝 POSTS MODULE

### Posts Management (`/posts`)

| Method | Endpoint                | Description                                       | Auth Required |
| ------ | ----------------------- | ------------------------------------------------- | ------------- |
| POST   | `/posts`                | Create new post with media upload (up to 5 files) | ✅            |
| GET    | `/posts/:id`            | Get post details by ID                            | ✅            |
| PATCH  | `/posts/:id`            | Update post content/media                         | ✅            |
| DELETE | `/posts/:id`            | Delete post (soft delete)                         | ✅            |
| GET    | `/posts/user/:username` | Get all posts from specific user (paginated)      | ✅            |

### Feed Endpoints (`/posts/feed/*`)

| Method | Endpoint                  | Description                                                    | Auth Required |
| ------ | ------------------------- | -------------------------------------------------------------- | ------------- |
| GET    | `/posts/feed/me`          | Get personalized home feed (paginated)                         | ✅            |
| GET    | `/posts/feed/algorithmic` | Get algorithmic feed (mutual followers priority) (paginated)   | ✅            |
| GET    | `/posts/feed/trending`    | Get trending feed (daily/weekly) (paginated)                   | ✅            |
| GET    | `/posts/feed/discover`    | Get discover feed (posts from non-following users) (paginated) | ✅            |

**Query Parameters:**

- `page` (default: 1)
- `limit` (default: varies)
- `timeframe` (for trending: 'day' \| 'week', default: 'day')

---

## 💬 ENGAGEMENT MODULE (`/engagement`)

### Like Management

| Method | Endpoint                      | Description                                  | Auth Required |
| ------ | ----------------------------- | -------------------------------------------- | ------------- |
| POST   | `/engagement/posts/:id/like`  | Toggle like on post                          | ✅            |
| GET    | `/engagement/posts/:id/likes` | Get list of users who liked post (paginated) | ✅            |
| GET    | `/engagement/me/likes`        | Get all posts I've liked (paginated)         | ✅            |

### Bookmark Management

| Method | Endpoint                         | Description                             | Auth Required |
| ------ | -------------------------------- | --------------------------------------- | ------------- |
| POST   | `/engagement/posts/:id/bookmark` | Toggle bookmark on post                 | ✅            |
| GET    | `/engagement/me/bookmarks`       | Get all my bookmarked posts (paginated) | ✅            |

### Reply Management

| Method | Endpoint                          | Description                                     | Auth Required |
| ------ | --------------------------------- | ----------------------------------------------- | ------------- |
| POST   | `/engagement/posts/:id/reply`     | Create reply on post (with media up to 2 files) | ✅            |
| PATCH  | `/engagement/posts/:id/:replyId`  | Update reply content/media                      | ✅            |
| GET    | `/engagement/posts/:id/replies`   | Get all replies on post (paginated)             | ✅            |
| GET    | `/engagement/replies/:id/replies` | Get child replies of a reply (paginated)        | ✅            |
| DELETE | `/engagement/replies/:id`         | Delete reply (soft delete)                      | ✅            |

### Repost Management

| Method | Endpoint                        | Description                                | Auth Required |
| ------ | ------------------------------- | ------------------------------------------ | ------------- |
| POST   | `/engagement/posts/:id/repost`  | Toggle repost on post                      | ✅            |
| GET    | `/engagement/posts/:id/reposts` | Get list of users who reposted (paginated) | ✅            |
| GET    | `/engagement/me/reposts`        | Get all posts I've reposted (paginated)    | ✅            |

**Query Parameters:**

- `page` (optional)
- `limit` (optional)

---

## 🏷️ MENTIONS MODULE (`/mentions`)

| Method | Endpoint                    | Description                                  | Auth Required |
| ------ | --------------------------- | -------------------------------------------- | ------------- |
| GET    | `/mentions/me`              | Get all mentions of current user (paginated) | ✅            |
| GET    | `/mentions/me/unread-count` | Get count of unread mentions                 | ✅            |

**Query Parameters:**

- `page` (default: 1)
- `limit` (default: 20)

---

## #️⃣ HASHTAGS MODULE (`/hashtags`)

| Method | Endpoint               | Description                                     | Auth Required |
| ------ | ---------------------- | ----------------------------------------------- | ------------- |
| GET    | `/hashtags/trending`   | Get trending hashtags                           | ✅            |
| GET    | `/hashtags/search`     | Search hashtags by query                        | ✅            |
| GET    | `/hashtags/:tag/posts` | Get all posts with specific hashtag (paginated) | ✅            |

**Query Parameters:**

- `limit` (default: 10)
- `timeframe` (for trending: 'day' \| 'week' \| 'month', default: 'week')
- `q` (for search, min 2 characters)
- `page` (default: 1)

---

## 🔍 SEARCH MODULE (`/search`)

### Combined Search

| Method | Endpoint              | Description                                   | Auth Required |
| ------ | --------------------- | --------------------------------------------- | ------------- |
| GET    | `/search`             | Combined search across users, posts, hashtags | ✅            |
| GET    | `/search/suggestions` | Get search suggestions as user types          | ✅            |
| GET    | `/search/trending`    | Get trending searches                         | ✅            |

**Query Parameters for `/search`:**

- `q` (required, min 2 characters)
- `type` ('users' \| 'posts' \| 'hashtags' \| 'combined', default: 'combined')
- `limit` (default: 20, max: 50)
- `offset` (default: 0)
- `timeframe` ('day' \| 'week' \| 'month' \| 'all', default: 'all')
- `sortBy` ('relevance' \| 'popularity' \| 'recent', default: 'relevance')

### Discovery Endpoints

| Method | Endpoint                                   | Description                      | Auth Required |
| ------ | ------------------------------------------ | -------------------------------- | ------------- |
| GET    | `/search/discover/trending-posts`          | Get trending posts for discovery | ✅            |
| GET    | `/search/discover/user-recommendations`    | Get recommended users to follow  | ✅            |
| GET    | `/search/discover/hashtag-recommendations` | Get recommended hashtags         | ✅            |
| GET    | `/search/discover/who-to-follow`           | Get who to follow suggestions    | ✅            |

**Query Parameters:**

- `timeframe` (for posts: 'day' \| 'week', default: 'day')
- `limit` (default: 10)

---

## 💬 CHAT MODULE (`/chat`)

### Conversation Management

| Method | Endpoint                               | Description                            | Auth Required |
| ------ | -------------------------------------- | -------------------------------------- | ------------- |
| POST   | `/chat/conversations`                  | Create new conversation                | ✅            |
| GET    | `/chat/conversations`                  | Get all user conversations (paginated) | ✅            |
| GET    | `/chat/conversations/:id`              | Get conversation details               | ✅            |
| PATCH  | `/chat/conversations/:id`              | Update conversation settings           | ✅            |
| POST   | `/chat/conversations/:id/participants` | Add participants to conversation       | ✅            |
| DELETE | `/chat/conversations/:id/leave`        | Leave conversation                     | ✅            |

**Query Parameters:**

- `page` (default: 1)
- `limit` (default: 50)

### Message Management

| Method | Endpoint                           | Description                                | Auth Required |
| ------ | ---------------------------------- | ------------------------------------------ | ------------- |
| POST   | `/chat/conversations/:id/messages` | Send message with optional file attachment | ✅            |
| GET    | `/chat/conversations/:id/messages` | Get conversation messages (paginated)      | ✅            |
| PATCH  | `/chat/messages/:id`               | Edit message content                       | ✅            |
| DELETE | `/chat/messages/:id`               | Delete message                             | ✅            |

**Query Parameters:**

- `page` (default: 1)
- `limit` (default: 50)
- `before` (optional, ISO date string for pagination)
- `forEveryone` (delete: false = delete for me only, true = delete for everyone)

### Message Reactions

| Method | Endpoint                       | Description                   | Auth Required |
| ------ | ------------------------------ | ----------------------------- | ------------- |
| POST   | `/chat/messages/:id/reactions` | Add emoji reaction to message | ✅            |
| GET    | `/chat/messages/:id/reactions` | Get all reactions on message  | ✅            |

### Message Status

| Method | Endpoint                       | Description           | Auth Required |
| ------ | ------------------------------ | --------------------- | ------------- |
| POST   | `/chat/conversations/:id/read` | Mark messages as read | ✅            |

---

## 🔔 NOTIFICATIONS MODULE

### Notifications (`/notifications`)

| Method | Endpoint                      | Description                        | Auth Required |
| ------ | ----------------------------- | ---------------------------------- | ------------- |
| GET    | `/notifications`              | Get user notifications (paginated) | ✅            |
| GET    | `/notifications/unread-count` | Get count of unread notifications  | ✅            |
| PATCH  | `/notifications/:id/read`     | Mark single notification as read   | ✅            |
| PATCH  | `/notifications/read-all`     | Mark all notifications as read     | ✅            |
| DELETE | `/notifications/:id`          | Delete notification                | ✅            |

**Query Parameters:**

- `page` (default: 1)
- `limit` (default: 20)

### Notification Preferences (`/notifications/preferences`)

| Method | Endpoint                                            | Description                            | Auth Required |
| ------ | --------------------------------------------------- | -------------------------------------- | ------------- |
| GET    | `/notifications/preferences`                        | Get user notification preferences      | ✅            |
| PATCH  | `/notifications/preferences`                        | Update notification preferences        | ✅            |
| POST   | `/notifications/preferences/mute-user`              | Mute/unmute notifications from user    | ✅            |
| POST   | `/notifications/preferences/mute-keyword`           | Mute/unmute notifications with keyword | ✅            |
| DELETE | `/notifications/preferences/reset`                  | Reset preferences to defaults          | ✅            |
| GET    | `/notifications/preferences/check-permission/:type` | Check if notification type is allowed  | ✅            |

---

## ⚙️ ADMIN MODULE (`/admin`)

**All admin endpoints require both `JwtAuthGuard` and `AdminGuard`**

### Dashboard & Analytics

| Method | Endpoint             | Description                  | Auth Required |
| ------ | -------------------- | ---------------------------- | ------------- |
| GET    | `/admin/dashboard`   | Get system dashboard metrics | ✅ Admin      |
| GET    | `/admin/stats/daily` | Get daily statistics         | ✅ Admin      |

**Query Parameters:**

- `days` (default: 7)

### User Management

| Method | Endpoint                 | Description                             | Auth Required |
| ------ | ------------------------ | --------------------------------------- | ------------- |
| GET    | `/admin/users`           | Get all users with filters (paginated)  | ✅ Admin      |
| GET    | `/admin/users/:id`       | Get specific user details               | ✅ Admin      |
| POST   | `/admin/users/:id/ban`   | Ban user with optional reason           | ✅ Admin      |
| POST   | `/admin/users/:id/unban` | Unban user                              | ✅ Admin      |
| PATCH  | `/admin/users/:id/role`  | Update user role (admin/moderator/user) | ✅ Admin      |

**Query Parameters for GET /admin/users:**

- `page` (optional)
- `limit` (optional)
- `search` (optional)
- `role` ('user' \| 'admin' \| 'moderator' \| 'banned')
- `dateFrom` (ISO date string)
- `dateTo` (ISO date string)
- `sortBy` (optional)
- `sortOrder` ('ASC' \| 'DESC')

### Post Management

| Method | Endpoint                   | Description                            | Auth Required |
| ------ | -------------------------- | -------------------------------------- | ------------- |
| GET    | `/admin/posts`             | Get all posts with filters (paginated) | ✅ Admin      |
| GET    | `/admin/posts/:id`         | Get specific post details              | ✅ Admin      |
| DELETE | `/admin/posts/:id`         | Delete post with optional reason       | ✅ Admin      |
| POST   | `/admin/posts/:id/restore` | Restore deleted post                   | ✅ Admin      |

**Query Parameters for GET /admin/posts:**

- `page` (optional)
- `limit` (optional)
- `search` (optional)
- `dateFrom` (ISO date string)
- `dateTo` (ISO date string)
- `sortBy` (optional)
- `sortOrder` ('ASC' \| 'DESC')

### Audit & Monitoring

| Method | Endpoint            | Description                       | Auth Required |
| ------ | ------------------- | --------------------------------- | ------------- |
| GET    | `/admin/audit-logs` | Get system audit logs (paginated) | ✅ Admin      |
| GET    | `/admin/health`     | Get system health status          | ✅ Admin      |

**Query Parameters for GET /admin/audit-logs:**

- `page` (optional)
- `limit` (optional)
- `search` (optional)
- `dateFrom` (ISO date string)
- `dateTo` (ISO date string)
- `sortBy` (optional)
- `sortOrder` ('ASC' \| 'DESC')

---

## 🏥 HEALTH MODULE (`/health`)

### Health Checks

| Method | Endpoint               | Description                                             | Auth Required |
| ------ | ---------------------- | ------------------------------------------------------- | ------------- |
| GET    | `/health`              | Full system health check (database, memory, disk, HTTP) | ❌            |
| GET    | `/health/debug-sentry` | Trigger test Sentry error for monitoring                | ❌            |

---

## 📊 API Summary Statistics

- **Total Modules**: 10
- **Total Controllers**: 13
- **Total Endpoints**: 95+
- **Protected Endpoints**: ~85 (require JWT)
- **Public Endpoints**: ~10 (auth, email, health)
- **Admin Endpoints**: 14 (require admin role)

---

## 🔐 Authentication & Authorization

### Authentication Methods

- **JWT Bearer Token**: Most authenticated endpoints
- **Cookies**: Refresh token stored in HttpOnly cookie
- **Query Params**: Some endpoints support token in query (for email verification, password reset)

### Guard Types

1. **JwtAuthGuard**: Verifies JWT token, extracts userId
2. **AdminGuard**: Verifies user has admin role
3. **ArcjetGuard**: Rate limiting and bot detection
4. **ThrottlerGuard**: Global request throttling (6000ms window, 10 requests max)

### Rate Limiting

- Default: 10 requests per 6000ms (global)
- Login: 3 requests per 6000ms (throttled)
- User Profile: 100 requests per 60000ms
- Follow endpoints: 100 requests per 60000ms

---

## 📝 Common Query Parameters

| Parameter   | Type            | Description                                |
| ----------- | --------------- | ------------------------------------------ |
| `page`      | number          | Page number for pagination (default: 1)    |
| `limit`     | number          | Items per page (varies by endpoint)        |
| `offset`    | number          | Skip N items (alternative to page)         |
| `sortBy`    | string          | Sort field name                            |
| `sortOrder` | 'ASC' \| 'DESC' | Sort direction                             |
| `timeframe` | string          | Filter by time period (day/week/month/all) |
| `type`      | string          | Filter by type (varies by endpoint)        |
| `q`         | string          | Search query string                        |

---

## 🚀 Request/Response Format

### Request Headers

```
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
User-Agent: <client-user-agent>
```

### Success Response (2xx)

```json
{
  "data": {},
  "statusCode": 200,
  "message": "Success message"
}
```

### Error Response (4xx/5xx)

```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "BadRequest"
}
```

---

## 📞 Contact & Support

For API issues or documentation updates, contact the development team.

---

**Last Updated**: December 2, 2025
**API Version**: 1.0
**Status**: Active
