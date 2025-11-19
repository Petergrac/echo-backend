# Echo Backend — HTTP Endpoints

Generated: 2025-11-18

This document summarizes the HTTP endpoints discovered in the backend project and short hints about what they do.

## Auth (/auth)

- POST `/auth/signup`
  - Create a new user, returns access token and sets an HttpOnly refresh cookie.
  - Body: SignUpDto

- POST `/auth/login`
  - Login with email or username; sets refresh cookie and returns access token.
  - Body: LoginDto

- GET `/auth/refresh`
  - Rotate refresh token (reads cookie or body refreshToken), issues new access token and sets new refresh cookie.

- GET `/auth/logout`
  - Revoke provided refresh token (cookie) and clear cookie. Http 204 when successful.

- POST `/auth/logout-all`
  - Revoke all tokens for a user (body must include userId), clear refresh cookie. Http 204.

- POST `/auth/request-password-reset`
  - Request password reset: send an email with reset link.
  - Body: { email }

- POST `/auth/reset-password?token=...`
  - Reset password using token (query or body). Body: ResetPasswordDto

- GET `/auth/verify-email?token=...`
  - Verify email token and mark user as verified.

## Email (test)

- GET `/email/test?to=...`
  - Send a test verification email to the given address.

## Notifications (/notifications) — (JwtAuthGuard required)

- GET `/notifications`
  - Get the current user's notifications.

- PATCH `/notifications/:notificationId/read`
  - Mark a single notification as read.

- GET `/notifications/read-all`
  - Mark all notifications as read.

- GET `/notifications/unread-count`
  - Get count of unread notifications.

- GET `/notifications/connection-stats`
  - Returns connection stats (comment suggests admin check should be added).

## Users (/users) — (JwtAuthGuard required)

- GET `/users/me`
  - Get current user's profile.

- GET `/users/:username`
  - Get another user's public profile by username.

- PATCH `/users/me`
  - Update current user's profile; supports avatar upload (`avatar` file).
  - All data must be in the form-data(content & avatar( media: image/gif/jpeg/jpg/png ))

- DELETE `/users/me`
  - Delete current user's account. HttpCode(204).

### Admin (/admin/users) — (JwtAuthGuard + RoleGuard, @Roles('admin'))

- GET `/admin/users?q=&role=&page=&limit=`
  - Admin: list users with optional search and pagination.

- DELETE `/admin/users/:userId`
  - Admin: delete a user by id (admins cannot delete themselves).

## Follow (controller base `users/:id`) — (JwtAuthGuard required)

- GET `/users/:id/followers?page=&limit=`
  - Get followers for user with id `:id`.

- GET `/users/:id/followings?page=&limit=`
  - Get followings for user `:id`.

- POST `/users/:id/toggle-follow`
  - Toggle follow/unfollow for `:id` (current user as follower).

## Feed (/feed)

- GET `/feed/timeline?cursor=&limit=`
  - Authenticated timeline feed for current user (JwtAuthGuard used on method).
  - Uses cursor based pagination with optimized sorted query in the database
  - Uses raw SQL to get batch count of ripples,likes,bookmarks => One operation

- GET `/feed/trending?cursor=&limit=`
  - Trending feed - ( uses scoring algorithm with `time decay` for freshness(` half life of 36 hours`) )
  - The engagement power score `(1×Likes) + (2×Comments) + (3×Shares)`

## Hashtags (/hashtags)

- GET` /hashtags/:hashtag/echoes?page=&limit=`
  - Get echoes tagged with the hashtag.

- GET `/hashtags/trending?timeframe=&limit=`
  - Get trending hashtags (timeframe enum `1d`|`7d`|`30d`).
  - Returns all trending hashtags in the specified timeframe

- GET `/hashtags/search?query=&limit=`
  - Search hashtags by query string.
  - Returns the number of echoes using this tag and date it was created & last used
- GET `/hashtags/:hashtag/stats`
  - Stats for a hashtag.

- GET `/hashtags/:hashtag/related?limit=`
  - Related hashtags.
  - Returns list of related hashtags with echo counts

## Echo (/echo) — (JwtAuthGuard at controller level)

- POST `/echo`
  - Create an echo with optional media uploads (field `media`, up to 5 files).
  - Body: CreateEchoDto
  - You can upload `image` | `video` | `gif` in the same post

- GET `/echo/:id`
  - Get echo by id.

- PATCH `/echo/:id`
  - Update an echo (auth required).

- DELETE `/echo/:id`
  - Delete an echo (auth required).

- GET `/echo/users/:userId/echoes?page=&limit=`
  - Get echoes for a specific user.

## Engagement (/engagement) — (JwtAuthGuard required)

- POST `/engagement/toggle-like/`
  - Toggle like on an echo. Body: CreateLikeDto.
- POST `/engagement/ripples`
  - Create a ripple (comment). Body: CreateRippleDto.

- PATCH `/engagement/ripples/:rippleId`
  - Edit a ripple.

- DELETE `/engagement/ripples/:rippleId`
  - Delete a ripple (soft delete rules apply).

- POST `/engagement/reechoes`
  - Reecho (share) an echo.

- DELETE `/engagement/reechoes/:echoId`
  - Unreecho.

- POST `/engagement/bookmarks`
  - Bookmark an echo.

- DELETE `/engagement/bookmarks/:echoId`
  - Remove bookmark.

- GET `/engagement/echoes/:echoId/likes?page=&limit=`
  - Get users who liked an echo.

- GET `/engagement/echoes/:echoId/ripples?page=&limit=`
  - Get comments on an echo.

### CURRENT USER ENGAGEMENT

- GET `/engagement/users/me/reechoes?page=&limit=`
  - Get all re-echoes of the current user
- GET `/engagement/users/me/likes?page=&limit=`
  - Get current user's liked echoes.

- GET `/engagement/users/me/bookmarks?page=&limit=`
  - Get current user's bookmarks.
- GET `/engagement/users/me/ripples?page=&limit=`
  - Get current user's replied posts(ripples)

## Health (/health)

- GET `/health`
  - Simple health check returning { status: 'ok', message: 'Echo backend healthy ✅' }.
