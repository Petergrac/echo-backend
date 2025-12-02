# AUTHENTICATION.md - Security & Auth Implementation

## 🔐 Authentication System Overview

Echo Backend implements a **JWT-based authentication system** with secure token management, email verification, and password reset flows.

---

## 🎫 JWT Token Structure

### Access Token (Short-lived)

- **Type**: Bearer token
- **Expiration**: 15 minutes
- **Storage**: Memory (passed in Authorization header)
- **Payload**:
  ```json
  {
    "userId": "uuid",
    "role": "user|admin|moderator",
    "iat": 1234567890,
    "exp": 1234569690
  }
  ```

### Refresh Token (Long-lived)

- **Type**: Stored in HttpOnly cookie
- **Expiration**: 7 days
- **Storage**: HttpOnly, Secure, SameSite=Strict cookie
- **Database**: Stored in `refresh_tokens` table
- **Payload**:
  ```json
  {
    "userId": "uuid",
    "tokenVersion": 1,
    "iat": 1234567890,
    "exp": 1234654290
  }
  ```

---

## 📋 Authentication Flows

### 1. User Registration (Signup)

```
POST /auth/signup
Body: { email, username, password, fullName }
  ↓
[Validation] - Email format, password strength
  ↓
[Duplicate Check] - Email/username already exists?
  ↓
[Password Hashing] - bcrypt with salt rounds
  ↓
[Create User] - Insert into database
  ↓
[Email Verification] - Generate token, send email
  ↓
[Create Tokens] - Access + Refresh tokens
  ↓
Response:
{
  "accessToken": "eyJhbGc...",
  "user": { id, email, username, ... }
}
Set-Cookie: refresh_token=...
```

### 2. User Login

```
POST /auth/login
Body: { email OR username, password }
  ↓
[Validation] - Input validation
  ↓
[Find User] - Query by email or username
  ↓
[Compare Password] - bcrypt.compare(input, hashed)
  ↓
[Account Status] - Check if banned/suspended
  ↓
[Create Tokens] - Generate new JWT + Refresh
  ↓
[Store Refresh Token] - Save to database
  ↓
[Audit Log] - Record login attempt
  ↓
Response: { accessToken, user }
Set-Cookie: refresh_token=...
```

### 3. Token Refresh

```
GET /auth/refresh
Headers: Cookie: refresh_token=...
  ↓
[Extract Cookie] - Get refresh token from HttpOnly cookie
  ↓
[Verify Refresh Token] - Check signature + expiry
  ↓
[Database Check] - Verify token exists & not revoked
  ↓
[Token Rotation] - Create new refresh + access tokens
  ↓
[Invalidate Old] - Mark old refresh token as used
  ↓
Response: { accessToken }
Set-Cookie: new_refresh_token=...
```

### 4. Logout (Single Device)

```
GET /auth/logout
Headers: Cookie: refresh_token=...
  ↓
[Extract Token] - Get from cookie
  ↓
[Revoke Token] - Mark as revoked in database
  ↓
[Clear Cookie] - Remove from client
  ↓
Response: 204 No Content
```

### 5. Logout All Devices

```
POST /auth/logout-all
Body: { userId }
  ↓
[Verify User] - Ensure authenticated
  ↓
[Revoke All] - Mark all refresh tokens as revoked
  ↓
[Clear Cookie] - Remove from client
  ↓
Response: 204 No Content
```

---

## 🔑 Password Management

### Request Password Reset

```
POST /auth/request-password-reset
Body: { email }
  ↓
[Find User] - Query by email
  ↓
[Generate Token] - Cryptographically random token
  ↓
[Store Token] - Save to email_tokens table with expiry
  ↓
[Send Email] - Email with reset link: /auth/reset-password?token=...
  ↓
Response: Generic message (for security - don't reveal if email exists)
```

### Reset Password

```
POST /auth/reset-password?token=...
Body: { newPassword }
  ↓
[Verify Token] - Check if valid & not expired
  ↓
[Hash Password] - bcrypt.hash(newPassword)
  ↓
[Update User] - Save new password hash
  ↓
[Revoke Tokens] - Invalidate all refresh tokens
  ↓
[Clear Token] - Remove reset token from database
  ↓
Response: { message: "Password reset successfully" }
```

---

## ✉️ Email Verification

### Verify Email

```
GET /auth/verify-email?token=...
  ↓
[Verify Token] - Check signature & expiry
  ↓
[Find User] - Get user from token
  ↓
[Mark Verified] - Set emailVerified = true
  ↓
Response: { message: "Email verified successfully" }
```

---

## 🛡️ Security Features

### 1. Password Security

- **Hashing Algorithm**: argon2
- **Salt Rounds**: 10
- **Min Length**: 8 characters
- **Requirements**:
  - Uppercase letter
  - Lowercase letter
  - Number
  - Special character

```typescript
// Password hashing
const hashedPassword = await argon.hash(password, 10);

// Password comparison
const isValid = await argon.verify(inputPassword, hashedPassword);
```

### 2. JWT Security

- **Signing Algorithm**: HS256 (HMAC-SHA256)
- **Secret Key**: Environment variable (32+ characters)
- **Claims**: Standard (`iat`, `exp`, `sub`)
- **Verification**: Signature + expiry time checked

```typescript
// Create token
const token = this.jwtService.sign({ userId, role }, { expiresIn: '15m' });

// Verify token (automatic in JwtAuthGuard)
const decoded = this.jwtService.verify(token);
```

### 3. Cookie Security

```typescript
res.cookie('refresh_token', token, {
  httpOnly: true, // Not accessible via JavaScript
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'strict', // Prevent CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
});
```

### 4. Rate Limiting

```typescript
// Login endpoint: 3 attempts per 6000ms
@Throttle({ default: { ttl: 6000, limit: 3 } })
@Post('login')
async login(@Body() dto: LoginDto) {}
```

### 5. Token Revocation

- Refresh tokens stored in database
- Revocation checked on token refresh
- All tokens revoked on password reset
- All tokens revoked on logout-all

### 6. Audit Logging

Every authentication action is logged:

```typescript
// Stored in audit_logs table
{
  userId: "uuid",
  action: "LOGIN_SUCCESS" | "LOGIN_FAILED" | "LOGOUT" | "PASSWORD_RESET",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  timestamp: "2025-12-02T10:30:00Z",
  details: { ... }
}
```

---

## 🔒 Access Control

### Role-Based Access Control (RBAC)

```typescript
enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

// Apply role restrictions
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Post('users/:id/ban')
async banUser() {}
```

### Guards Hierarchy

```
1. JwtAuthGuard - Verify JWT token is valid
   ↓
2. RolesGuard - Check user role matches required role
   ↓
3. AdminGuard - Verify user is admin
   ↓
4. Route Handler - Execute if all guards pass
```

---

## 🚨 Error Responses

### Invalid Credentials

```json
Status: 401 Unauthorized
{
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized"
}
```

### Token Expired

```json
Status: 401 Unauthorized
{
  "statusCode": 401,
  "message": "Token expired",
  "error": "Unauthorized"
}
```

### Invalid Token

```json
Status: 401 Unauthorized
{
  "statusCode": 401,
  "message": "Invalid token",
  "error": "Unauthorized"
}
```

### Insufficient Permissions

```json
Status: 403 Forbidden
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```

### Account Banned

```json
Status: 403 Forbidden
{
  "statusCode": 403,
  "message": "Account banned",
  "error": "Forbidden"
}
```

---

## 📝 Implementing Authentication in Frontend

### 1. Store Access Token

```javascript
// After login
localStorage.setItem('accessToken', response.accessToken);
```

### 2. Send with Requests

```javascript
// Add to every authenticated request
const headers = {
  Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  'Content-Type': 'application/json',
};

fetch('/api/users/me', { headers });
```

### 3. Handle Token Refresh

```javascript
// If 401 response
if (response.status === 401) {
  // Call refresh endpoint
  const newToken = await fetch('/api/auth/refresh', {
    method: 'GET',
    credentials: 'include', // Include cookies
  });

  // Retry original request with new token
  localStorage.setItem('accessToken', newToken.accessToken);
  // Retry request...
}
```

### 4. Logout

```javascript
// Clear storage
localStorage.removeItem('accessToken');

// Call logout endpoint
await fetch('/api/auth/logout', {
  method: 'GET',
  credentials: 'include',
});
```

---

## 🔐 Best Practices

### 1. Never Store Sensitive Data in JWT

```typescript
// ❌ Bad: Storing password/sensitive data
const token = jwt.sign(
  {
    userId,
    email,
    password: hashedPassword, // Never!
  },
  secret,
);

// ✅ Good: Only essential data
const token = jwt.sign(
  {
    userId,
    role,
    email, // Only if necessary
  },
  secret,
);
```

### 2. Use HTTPS in Production

```typescript
// Cookie secure flag depends on NODE_ENV
secure: process.env.NODE_ENV === 'production';
```

### 3. Validate Input Strictly

```typescript
@IsEmail()
@MaxLength(255)
email: string;

@MinLength(8)
@Matches(/[A-Z]/)  // Uppercase
@Matches(/[a-z]/)  // Lowercase
@Matches(/[0-9]/)  // Number
password: string;
```

### 4. Implement Account Lockout

```typescript
// After N failed login attempts
const maxAttempts = 5;
const lockoutDuration = 15; // minutes

if (failedAttempts >= maxAttempts) {
  user.accountLockedUntil = new Date(Date.now() + lockoutDuration * 60000);
}
```

### 5. Enable CORS Carefully

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true, // Allow cookies
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
});
```

---

## 📊 Token Lifecycle Diagram

```
User Registration → Email Verification
                        ↓
                    Verified User
                        ↓
User Login → Generate Access + Refresh Tokens
                        ↓
Use Access Token (15 min) → Expired?
                ↓
            YES: Call /refresh → New Access Token
                ↓
            Continue using new token
                ↓
Refresh Token Expired (7 days)?
                ↓
            YES: Re-login required
                ↓
User Logout → Revoke Refresh Token → End Session
```

---

## 🔍 Debugging Authentication Issues

### 1. Verify Token in Postman

- Copy `Authorization` header value
- Go to [jwt.io](https://jwt.io)
- Paste token to decode and verify signature
- Check expiration time: `exp` field

### 2. Check Token Expiry

```bash
# Token expiry is in Unix timestamp (seconds)
# Current time: Date.now() / 1000
# If current time > exp, token is expired
```

### 3. Enable Debug Logging

```typescript
// In auth.service.ts
console.log('Token creation:', { userId, expiresIn: '15m' });
console.log('Token verification:', decoded);
```

---

## 📚 Related Files

- `src/modules/auth/auth.controller.ts` - Route handlers
- `src/modules/auth/auth.service.ts` - Business logic
- `src/modules/auth/token.service.ts` - Token operations
- `src/modules/auth/guards/jwt-auth.guard.ts` - JWT verification
- `src/modules/auth/entities/` - Database models

---

**Last Updated**: December 2, 2025
