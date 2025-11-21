# 🚀 Echo Backend — HTTP Endpoints API Documentation

*Generated: 2025-11-18*

This document summarizes the HTTP endpoints in the echo backend project with clear descriptions and usage hints.

---

## 🔐 **Authentication** (`/auth`)

### **User Registration & Login**
| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/auth/signup` | Create new user account | `SignUpDto` |
| `POST` | `/auth/login` | Login with email/username | `LoginDto` |

### **Token Management**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/refresh` | Rotate refresh token |
| `GET` | `/auth/logout` | Revoke token & clear cookie |
| `POST` | `/auth/logout-all` | Revoke all user tokens |

### **Account Recovery**
| Method | Endpoint | Description | Body/Params |
|--------|----------|-------------|-------------|
| `POST` | `/auth/request-password-reset` | Send password reset email | `{ email }` |
| `POST` | `/auth/reset-password?token=...` | Reset password | `ResetPasswordDto` |
| `GET` | `/auth/verify-email?token=...` | Verify email address | `token` (query) |

---

## 📧 **Email** (Testing)

### **Test Endpoints**
| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/email/test?to=...` | Send test verification email | `to` (email address) |

---

## ❤️ **Health Check**

### **System Status**
| Method | Endpoint | Response |
|--------|----------|----------|
| `GET` | `/health` | `{ status: 'ok', message: 'Echo backend healthy ✅' }` |

---

## 👥 **Users Management** (`/users`)

### **Profile Operations**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/users/me` | Get your profile details | ✅ |
| `GET` | `/users/:username` | Get someone else's profile | ❌ |
| `PATCH` | `/users/me` | Update your profile | ✅ |
| `DELETE` | `/users/me` | Delete your account & echoes | ✅ |

### **Social Features**
| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/users/:id/followers` | Get user's followers | `id` (param), `page`, `limit` (query) |
| `GET` | `/users/:id/followings` | Get user's followings | `id` (param), `page`, `limit` (query) |
| `POST` | `/users/:id/toggle-follow` | Follow/unfollow user | `id` (param) |

---
### **ECHO FEATURES**
| Method | Endpoint | Description | Parameters |  BODY |
|--------|----------|-------------|------------|-------|
| `GET` | `/echo/:id/` | Get specific echo  | `id` (param) |
| `POST` | `/echo` | Add a new Echo(post) with media support `Content and up to 5 media`||provide either `content `or `media` in `form-data`
| `DELETE` | `/echo/:id/` | Soft delete an echo `Permanent delete is handled by cron job after 30 days` | `id` (param) |

## 🎯 **Key Features Summary**

| Category | Features |
|----------|----------|
| **🔐 Auth** | Registration, Login, Token Refresh, Password Reset, Email Verification |
| **👤 Users** | Profile Management, Social Following, Account Deletion |
| **📊 System** | Health Monitoring, Email Testing |

---

## 💡 **Usage Notes**

- **Authentication**: Most endpoints require JWT token in `Authorization: Bearer` header
- **Cookies**: Refresh tokens are stored as HttpOnly cookies
- **Pagination**: Use `page` and `limit` query parameters for list endpoints
- **Validation**: All endpoints include request validation and error handling

---

*Documentation automatically generated from the Echo backend implementation.*