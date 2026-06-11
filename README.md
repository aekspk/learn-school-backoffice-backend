# Learn School Backoffice — Backend

NestJS REST API for a school backoffice system (Class Sessions, Bookings, Credit Packages).

---

## Requirements

| Tool    | Version |
| ------- | ------- |
| Node.js | >= 20   |
| pnpm    | >= 9    |
| Docker  | >= 24   |

---

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` for your local setup:

```env
ENV=local
PORT=9191

# Use this value if running PostgreSQL via docker compose
DATABASE_URL="postgresql://myapp:mypassword@localhost:9111/shop?schema=public"

ACCESS_TOKEN_SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_IN=5m
REFRESH_TOKEN_SECRET_KEY=your-refresh-secret-key
REFRESH_TOKEN_EXPIRE_IN=1d
```

### 3. Start PostgreSQL with Docker

```bash
docker compose up db -d
```

> PostgreSQL runs on port **9111** (not the default 5432).

### 4. Sync Database Schema

```bash
pnpm db:push
```

> Dev only — syncs the Prisma schema to the database without creating migration files.

### 5. Seed sample data (optional)

```bash
pnpm db:seed
```

### 6. Start the server

```bash
pnpm start:dev
```

Server runs at `http://localhost:9191`.

---

## Commands

### Development

```bash
pnpm start:dev        # Watch mode (auto reload)
pnpm start:debug      # Watch mode + debug port
pnpm build            # Compile TypeScript → dist/
pnpm start:prod       # Run compiled output (requires build first)
```

### Database (Prisma)

```bash
pnpm db:push          # Sync schema → DB (dev only, no migration files)
pnpm db:deploy        # Apply pending migrations (production)
pnpm db:seed          # Run seed data
pnpm db:reset         # Drop + recreate DB + re-seed
pnpm db:studio        # Open Prisma Studio GUI at localhost:5555
```

### Code Quality

```bash
pnpm lint             # ESLint + auto-fix
pnpm format           # Prettier
```

---

## Project Structure

```
src/
├── core/             # Global module (PrismaService, Redis, Auth guards)
│   ├── errors/       # Custom errors (RecordNotFound, UniqueConstraint)
│   ├── interceptors/ # UploadFileInterceptor
│   └── services/     # PrismaService
├── auth/             # POST /auth/* endpoints, Passport strategies
├── users/            # UsersService (no controller)
├── students/
├── courses/
├── class-sessions/
├── bookings/
├── credit-packages/
└── compensations/
prisma/
├── schema.prisma     # Database schema
└── seed.ts           # Seed data
```

---

## API Overview

Base URL: `http://localhost:9191`

### Auth

| Method | Path                  | Description                            |
| ------ | --------------------- | -------------------------------------- |
| POST   | `/auth/register`      | Register a new user                    |
| POST   | `/auth/login`         | Login — returns access + refresh token |
| POST   | `/auth/refresh-token` | Renew access token                     |
| GET    | `/auth/profile`       | Get current user profile               |
| PATCH  | `/auth/profile`       | Update current user profile            |

> Protected routes require `Authorization: Bearer <access_token>` on every request.

### Roles

| Role             | branchId | Access          |
| ---------------- | -------- | --------------- |
| `HQ_ADMIN`       | none     | All branches    |
| `BRANCH_MANAGER` | required | Own branch only |
| `BRANCH_STAFF`   | required | Own branch only |

---

## Postman Collection

Import `postman_collection.json` from the project root to test all API endpoints.

---

## Docker (Full Stack)

To run the app and database together in Docker, uncomment the `app` service in `docker-compose.yml` and run:

```bash
docker compose up --build
```

> When running inside Docker, use the Docker `DATABASE_URL` (`@db:5432`) instead of localhost in `.env`.
