# Echo Backend - Modern Social Media API

<div align="center">

![NestJS](https://img.shields.io/badge/nestjs-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

**A production-ready social media backend that powers modern social experiences**

</div>

## ✨ What is Echo?

Echo is a comprehensive social media backend built with NestJS and TypeScript. It's designed to handle everything you need for a modern social platform—authentication, real-time chat, content feeds, and engagement features. Think of it as the engine that can power your own Twitter, Instagram, or Threads-like application.

## 🚀 Why Choose Echo?

### 🔥 Built for Real-World Use

- **Production-ready**: Battle-tested architecture ready for deployment
- **Comprehensive feature set**: Everything from authentication to real-time notifications
- **Developer experience**: Clean codebase with comprehensive documentation
- **Scalable design**: Handles everything from small projects to large platforms

### 🛠️ Everything You Need for Social Media

#### 📱 Core Features

- **User Management**: Complete user profiles with avatars, bios, and social connections
- **Content System**: Create posts with text and media, replies, and reposts
- **Smart Feeds**: Algorithmic, trending, discover, and following feeds
- **Real-time Chat**: Direct messages and group conversations
- **Engagement Engine**: Likes, bookmarks, follows, and hashtags
- **Notification System**: Real-time alerts for social interactions
- **Search & Discovery**: Unified search across users, posts, and hashtags

#### 🔐 Security & Reliability

- **Secure Authentication**: JWT with refresh tokens and email verification
- **Rate Limiting**: Protection against abuse and excessive requests
- **Input Validation**: Comprehensive validation on all endpoints
- **Audit Logging**: Track important actions throughout the system
- **Error Handling**: Graceful error responses with proper logging


## 🔐 Authentication Model

Echo uses **cookie-based authentication**, not Bearer tokens.

### Key Characteristics

- ✅ Access token → **HttpOnly cookie**
- ✅ Refresh token → **HttpOnly cookie**
- ❌ No tokens returned in JSON responses
- ❌ No `Authorization: Bearer` headers
- ❌ No `localStorage` / `sessionStorage`
- ✅ Tokens are automatically sent by the browser

This model is **secure by default** and protects against:

- XSS token theft
- Accidental token leaks
- Frontend misuse

---

## 🧠 Intended Clients

| Client Type                                    | Supported |
| ---------------------------------------------- | --------- |
| Browser-based apps (React, Next.js, Vue, etc.) | ✅        |
| Swagger UI                                     | ✅        |
| Postman / curl                                 | ❌        |
| Mobile apps                                    | ❌        |
| Server-to-server APIs                          | ❌        |

> ⚠️ **This API is browser-first**.  
> It is not designed for direct consumption by non-browser clients.

---

## 🔑 Auth Flow Overview

### 1️⃣ Login

- Validates user credentials
- Sets cookies:
  - `access_token` (short-lived)
  - `refresh_token` (long-lived)
- Response body may be empty or contain user metadata

### You can also return access token on `login` & `token rotation` if you want to attach this backend to a mobile application
