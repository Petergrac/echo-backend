# Echo Backend - Modern Social Media API

<div align="center">

![NestJS](https://img.shields.io/badge/nestjs-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

**A production-ready social media backend that powers modern social experiences**

</div>
Echo Backend is a **NestJS-based REST API** that powers the Echo social media platform. It provides authentication, user management, content creation, social interactions, and real-time–ready endpoints used by the Next.js web client and Flutter mobile client.

The project is designed with scalability, security, and clean architecture in mind.

---

## Features

### Authentication

- User registration and login
- JWT-based authentication using **HttpOnly cookies**
- Access & refresh token flow
- Protected routes with guards

### Users

- Profile management
- Follow / unfollow
- User discovery

### Content

- Create, read, update, delete posts
- Replies / threaded conversations
- Likes and bookmarks
- Feed endpoints

### Social & System

- Notifications
- Role-based access control (where applicable)
- Input validation and DTOs
- Modular architecture

### API & Tooling

- OpenAPI / Swagger specification (`openapi-spec.json`)
- Structured logging
- Centralized error handling

---

## Tech Stack

- **NestJS** – backend framework
- **TypeScript** – language
- **PostgreSQL** – database
- **Prisma / TypeORM** – ORM (depending on current module usage)
- **JWT** – authentication
- **Passport** – auth strategies
- **Swagger / OpenAPI** – API documentation

---

## Project Structure

```
src/
├── modules/        # Feature modules (auth, users, posts, etc.)
├── common/         # Guards, decorators, interceptors, filters
├── config/         # App and environment configuration
├── database/       # ORM setup and migrations
├── main.ts         # App bootstrap

prisma/ or migrations/   # Database schema & migrations
test/                   # Unit & integration tests
```

---

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- PostgreSQL
- pnpm / npm / yarn

---

### Installation

```bash
git clone https://github.com/Petergrac/echo-backend.git
cd echo-backend
```

```bash
pnpm install
# or npm install
# or yarn
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/echo
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLIENT_URL=http://localhost:3000
PORT=4000
```

Add other variables as required by your setup (Redis, email service, etc.).

---

## Database Setup

### Migrations

```bash
pnpm prisma migrate dev
# or equivalent TypeORM command
```

### Seeding (if available)

```bash
pnpm prisma db seed
```

---

## Running the Server

### Development

```bash
pnpm start:dev
```

### Production

```bash
pnpm build
pnpm start
```

Server will run on:

```
http://localhost:4000
```

---

## API Documentation

If Swagger is enabled, access it at:

```
http://localhost:4000/api/docs
```

You can also refer to the generated OpenAPI spec:

```
openapi-spec.json
```

---

## Authentication Model

Echo uses **cookie-based JWT authentication**:

- Access token stored in HttpOnly cookie
- Refresh token stored in HttpOnly cookie
- Automatic refresh flow
- CSRF protection via same-site cookies

This approach is optimized for browser clients (Next.js) and mobile apps (Flutter).

---

## Available Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| pnpm start:dev | Start development server |
| pnpm build     | Build production bundle  |
| pnpm start     | Start production server  |
| pnpm test      | Run tests                |
| pnpm lint      | Run linter               |

---

## Testing

```bash
pnpm test
```

Tests include unit and integration coverage for core modules such as auth and users.

---

## Clients Supported

| Client                      | Status    |
| --------------------------- | --------- |
| Next.js Web App             | Supported |
| Flutter Mobile App          | Supported |
| REST Clients (Postman/Curl) | Supported |

---

## Deployment

You can deploy on:

- Railway
- Render
- Fly.io
- VPS (Docker or PM2)

Steps:

1. Set environment variables
2. Run migrations
3. Build the project
4. Start the server

Docker setup can be added for production environments.

---

## Security

- Password hashing
- Input validation with DTOs
- JWT expiration & refresh flow
- CORS configuration
- HTTP-only cookies
- Role-based guards (where used)

---

## Roadmap

- WebSocket or Ably-based real-time messaging
- Media uploads
- Advanced notifications
- Search improvements
- Rate limiting
- Caching layer

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Open a pull request

---

## Related Projects

- Frontend (Next.js): [https://github.com/Petergrac/echo-web](https://github.com/Petergrac/echo-web)

---

## License

MIT (or specify your license)
