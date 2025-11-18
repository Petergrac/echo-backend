# Echo Backend — HTTP Endpoints

Generated: 2025-11-18

This document summarizes the HTTP endpoints discovered in the backend project and short hints about what they do.

## Auth (/auth)

- POST /auth/signup
  - Create a new user, returns access token and sets an HttpOnly refresh cookie.
  - Body: SignUpDto

- POST /auth/login
  - Login with email or username; sets refresh cookie and returns access token.
  - Body: LoginDto

- GET /auth/refresh
  - Rotate refresh token (reads cookie or body refreshToken), issues new access token and sets new refresh cookie.

- GET /auth/logout
  - Revoke provided refresh token (cookie) and clear cookie. Http 204 when successful.

- POST /auth/logout-all
  - Revoke all tokens for a user (body must include userId), clear refresh cookie. Http 204.

- POST /auth/request-password-reset
  - Request password reset: send an email with reset link.
  - Body: { email }

- POST /auth/reset-password?token=...
  - Reset password using token (query or body). Body: ResetPasswordDto

- GET /auth/verify-email?token=...
  - Verify email token and mark user as verified.

## Email (test)

- GET /email/test?to=...
  - Send a test verification email to the given address.

## Notifications (/notifications) — (JwtAuthGuard required)

- GET /notifications
  - Get the current user's notifications.

- PATCH /notifications/:notificationId/read
  - Mark a single notification as read.

- GET /notifications/read-all
  - Mark all notifications as read.

- GET /notifications/unread-count
  - Get count of unread notifications.

- GET /notifications/connection-stats
  - Returns connection stats (comment suggests admin check should be added).

## Users (/users) — (JwtAuthGuard required)

- GET /users/me
  - Get current user's profile.

- GET /users/:username
  - Get another user's public profile by username.

- PATCH /users/me
  - Update current user's profile; supports avatar upload (`avatar` file).

- DELETE /users/me
  - Delete current user's account. HttpCode(204).

### Admin (/admin/users) — (JwtAuthGuard + RoleGuard, @Roles('admin'))

- GET /admin/users?q=&role=&page=&limit=
  - Admin: list users with optional search and pagination.

- DELETE /admin/users/:userId
  - Admin: delete a user by id (admins cannot delete themselves).

## Follow (controller base `users/:id`) — (JwtAuthGuard required)

- GET /users/:id/followers?page=&limit=
  - Get followers for user with id `:id`.

- GET /users/:id/followings?page=&limit=
  - Get followings for user `:id`.

- POST /users/:id/follow
  - Toggle follow/unfollow for `:id` (current user as follower).

- DELETE /users/:id/unfollow
  - Explicit unfollow.

## Feed (/feed)

- GET /feed/timeline?cursor=&limit=
  - Authenticated timeline feed for current user (JwtAuthGuard used on method).

- GET /feed/trending?cursor=&limit=
  - Trending feed (works for unauthenticated users too).

## Hashtags (/hashtags)

- GET /hashtags/:hashtag/echoes?page=&limit=
  - Get echoes tagged with the hashtag.

- GET /hashtags/trending?timeframe=&limit=
  - Get trending hashtags (timeframe enum '1d'|'7d'|'30d').

- GET /hashtags/search?query=&limit=
  - Search hashtags by query string.

- GET /hashtags/:hashtag/stats
  - Stats for a hashtag.

- GET /hashtags/:hashtag/related?limit=
  - Related hashtags.

## Echo (/echo) — (JwtAuthGuard at controller level)

- POST /echo
  - Create an echo with optional media uploads (field `media`, up to 5 files).
  - Body: CreateEchoDto

- GET /echo/:id
  - Get echo by id.

- PATCH /echo/:id
  - Update an echo (auth required).

- DELETE /echo/:id
  - Delete an echo (auth required).

- GET /echo/users/:userId/echoes?page=&limit=
  - Get echoes for a specific user.

## Engagement (/engagement) — (JwtAuthGuard required)

- POST /engagement/likes
  - Like an echo. Body: CreateLikeDto.

- DELETE /engagement/likes/:echoId
  - Unlike an echo.

- POST /engagement/ripples
  - Create a ripple (comment). Body: CreateRippleDto.

- PATCH /engagement/ripples/:rippleId
  - Edit a ripple.

- DELETE /engagement/ripples/:rippleId
  - Delete a ripple (soft delete rules apply).

- POST /engagement/reechoes
  - Reecho (share) an echo.

- DELETE /engagement/reechoes/:echoId
  - Unreecho.

- POST /engagement/bookmarks
  - Bookmark an echo.

- DELETE /engagement/bookmarks/:echoId
  - Remove bookmark.

- GET /engagement/echoes/:echoId/likes?page=&limit=
  - Get users who liked an echo.

- GET /engagement/echoes/:echoId/ripples?page=&limit=
  - Get comments on an echo.

- GET /engagement/ripples/:rippleId/thread
  - Get a ripple and its replies (thread).

- GET /engagement/users/me/likes?page=&limit=
  - Get current user's liked echoes.

- GET /engagement/users/me/bookmarks?page=&limit=
  - Get current user's bookmarks.

- GET /engagement/echoes/:echoId/counts
  - Get aggregate engagement counts.

- GET /engagement/echoes/:echoId/user-state
  - Get current user's engagement state for an echo.

## Health (/health)

- GET /health
  - Simple health check returning { status: 'ok', message: 'Echo backend healthy ✅' }.

## Notes

- Many endpoints require `JwtAuthGuard` (send Authorization: Bearer <token>).
- Admin endpoints use `RoleGuard` + `@Roles('admin')`.
- Refresh token cookie name: `refresh_token` (HttpOnly cookie).
- Echo creation uses `FilesInterceptor('media', 5)` and `FileValidationPipe`.

---

If you want this exported to PDF I will try to convert this markdown to `docs/endpoints.pdf` using an available system tool (pandoc/wkhtmltopdf) or by installing a small converter. If you prefer a different layout or adding DTO examples, tell me and I'll include them before conversion.
