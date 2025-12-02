# SETUP.md - Development Environment Setup

## 🚀 Quick Start Guide

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js**: v18.x or higher ([Download](https://nodejs.org/))
- **pnpm**: v8.x or higher (`npm install -g pnpm`)
- **PostgreSQL**: v13+ ([Download](https://www.postgresql.org/download/))
- **Redis**: v6+ ([Download](https://redis.io/download))
- **Git**: ([Download](https://git-scm.com/))

### System Requirements

- **RAM**: Minimum 2GB (4GB+ recommended)
- **Storage**: 1GB free space minimum
- **OS**: Linux, macOS, or Windows (with WSL2)

---

## 📋 Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/Petergrac/echo-backend.git
cd echo-backend
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all required packages from `package.json`.

### 3. Environment Configuration

Create a `.env` file in the project root:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/<database-name>?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets
JWT_SECRET="your-secret-key-here-min-32-characters"

# Email Configuration (Mailtrap/SMTP)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-password
EMAIL_FROM="Echo App <noreply@example.com>"
APP_BASE_URL=http://localhost:3000
EMAIL_TOKEN_EXPIRES_MINUTES=60

# Cloudinary (File Uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Arcjet (Security/Rate Limiting)
ARCJET_ENV=development
ARCJET_KEY=your-arcjet-key

# Sentry
SENTRY_DSN=your-sentry-dsn
```

### 4. Database Setup

#### Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE <database>;

# Create user with password
CREATE USER <username> WITH PASSWORD <password>;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE <database> TO <username>;

# Exit
\q
```

#### Run Migrations

```bash
# Run all pending migrations
pnpm run m:run
```

#### Seed Database (Optional)

```bash
# Populate with sample data
pnpm run seed:dev
```

### 5. Redis Setup

Ensure Redis is running:

```bash
# On macOS (with Homebrew)
brew services start redis

# On Linux
sudo systemctl start redis-server

# On Windows (WSL2)
wsl sudo service redis-server start

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

---

## 🏃 Running the Application

### Development Mode (with Hot Reload)

```bash
pnpm run start:dev
```

The API will be available at `http://localhost:3000`

### Production Build

```bash
# Build the application
pnpm run build

# Run production build
pnpm run start:prod
```

### Debug Mode

```bash
# Start with Node debugger
pnpm run start:debug
```

Then open `chrome://inspect` in Chrome DevTools

---

## 🗄️ Database Migration Commands

### Generate New Migration

```bash
pnpm run m:gen -- -n MigrationName
```

Example:

```bash
pnpm run m:gen -- -n AddUserEmail
```

### Run Migrations

```bash
pnpm run m:run
```

### Revert Last Migration

```bash
pnpm run m:rev
```

---

## 🐛 Troubleshooting

### Issue: `PORT 3000 already in use`

```bash
# Kill the process using port 3000
# On macOS/Linux
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Issue: `PostgreSQL connection refused`

1. Verify PostgreSQL is running
2. Check connection string in `.env`
3. Ensure database and user exist

```bash
psql -U <database-role> -d <database-name> -h localhost
```

### Issue: `Redis connection error`

1. Verify Redis is running: `redis-cli ping`
2. Check `REDIS_URL` in `.env`
3. Default should be `redis://localhost:6379`

### Issue: `pnpm install fails`

```bash
# Clear pnpm cache
pnpm store prune

# Reinstall
pnpm install
```

### Issue: `JWT_SECRET is missing`

- Ensure `.env` file exists
- Add a 32+ character secret key to `JWT_SECRET`
- Restart the application

---

## 🎯 Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/feature-name
```

### 2. Make Changes

```bash
# Edit your files
# Follow code style guidelines
```

### 3. Run Linter & Formatter

```bash
# Auto-fix linting issues
pnpm run lint

# Format code
pnpm run format
```

### 4. Run Tests

```bash
# Run unit tests for changes
pnpm run test

# Run E2E tests
pnpm run test:e2e
```

### 5. Commit & Push

```bash
git add .
git commit -m "feat: add new feature"
git push origin feature/feature-name
```

---

## 📦 Available Scripts

| Command            | Description               |
| ------------------ | ------------------------- |
| `pnpm start`       | Run application           |
| `pnpm start:dev`   | Run with hot reload       |
| `pnpm start:debug` | Run with debugger         |
| `pnpm start:prod`  | Run production build      |
| `pnpm build`       | Build application         |
| `pnpm test`        | Run unit tests            |
| `pnpm test:watch`  | Run tests in watch mode   |
| `pnpm test:e2e`    | Run E2E tests             |
| `pnpm test:cov`    | Generate test coverage    |
| `pnpm lint`        | Run ESLint                |
| `pnpm format`      | Format code with Prettier |
| `pnpm seed`        | Seed database             |
| `pnpm m:gen`       | Generate migration        |
| `pnpm m:run`       | Run migrations            |
| `pnpm m:rev`       | Revert last migration     |

---

## 🐳 Docker Setup (Optional)

### Build Docker Image

```bash
docker build -t echo-backend .
```

### Run with Docker Compose

```bash
docker-compose up -d
```

### Docker Compose Services

- **API**: Port 3000
- **PostgreSQL**: Port 5432
- **Redis**: Port 6379

---

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [JWT Documentation](https://jwt.io/)

---

## ✅ Verification Checklist

- [ ] Node.js v18+ installed
- [ ] pnpm installed globally
- [ ] PostgreSQL running
- [ ] Redis running
- [ ] `.env` file created with all variables
- [ ] Database created and migrations run
- [ ] `pnpm install` completed
- [ ] `pnpm run start:dev` starts without errors
- [ ] API accessible at `http://localhost:3000`
- [ ] Tests passing with `pnpm run test`

---

**Last Updated**: December 2, 2025
