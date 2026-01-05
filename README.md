# Echo Backend API

A modern, secure backend built with **NestJS**, designed primarily for **browser-based web applications**.

This backend uses **HttpOnly cookie-based authentication** with JWTs (access + refresh tokens) and is intentionally **not token-in-response** or Bearer-header based.

---

## 🚀 Tech Stack

- **NestJS**
- **PostgreSQL**
- **TypeORM**
- **JWT**
- **HttpOnly Cookies**
- **Swagger (OpenAPI)**
- **Docker (optional)**

---

## 🔐 Authentication Model (IMPORTANT)

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

**Example Response Headers**
