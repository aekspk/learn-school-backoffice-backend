# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm start:dev          # Watch mode on port 9191
pnpm build              # Compile to dist/
pnpm start:prod         # Run compiled output

# Testing
pnpm test               # All unit tests
pnpm test:e2e           # E2E tests (requires running DB)
pnpm test:watch         # Watch mode
pnpm test:cov           # With coverage
# Run a single test file:
pnpm test -- --testPathPattern=auth.service

# Code quality
pnpm lint               # ESLint (auto-fix)
pnpm format             # Prettier

# Database (Prisma)
pnpm db:push            # Sync schema to DB without migrations (dev only)
pnpm db:studio          # Open Prisma Studio GUI
pnpm db:seed            # Run prisma/seed.ts
pnpm db:reset           # Drop and recreate DB + seed
pnpm db:deploy          # Apply pending migrations (production)
```

Start PostgreSQL locally with `docker compose up db` — it runs on **port 9111** (not the default 5432). Copy `.env.example` to `.env` and set `DATABASE_URL`.

## Architecture

### Module Structure

`AppModule` imports three modules:
- **`CoreModule`** — `@Global()`, exports `PrismaService` to every module. Also wires up Redis `CacheModule` and imports `AuthModule` for guard access.
- **`UsersModule`** — exports `UsersService`; no controller (users are managed through `AuthModule` endpoints).
- **`AuthModule`** — owns all `POST /auth/*` and `GET|PATCH /auth/profile` endpoints.

`CoreModule` being global means `PrismaService` is injectable everywhere without re-importing.

### Auth Flow (Passport Strategies + Guards)

Four Passport strategies, each paired with a guard:

| Strategy | Guard | Trigger |
|---|---|---|
| `RegisterStrategy` | `RegisterAuthGuard` | `POST /auth/register` |
| `LoginStrategy` | `LoginAuthGuard` | `POST /auth/login` |
| `AccessTokenStrategy` | `AccessTokenAuthGuard` | Protected routes (bearer JWT) |
| `RefreshTokenStrategy` | `RefreshTokenAuthGuard` | `POST /auth/refresh-token` |

`RolesGuard` pairs with the `@Roles()` decorator and reads `role` from the access token payload (`AccessTokenPayload { sub: number, role: Role }`).

Access tokens expire in `ACCESS_TOKEN_EXPIRE_IN` (default 5m); refresh tokens in `REFRESH_TOKEN_EXPIRE_IN` (default 1d). Refresh tokens are stored hashed in the DB — a null value means the user is logged out.

### Prisma

`PrismaService` (`src/core/services/prisma.service.ts`) extends `PrismaClient` with the `@prisma/adapter-pg` driver. It connects on `onModuleInit`. Inject it directly in any service — no repository layer.

Custom errors in `src/core/errors/` (`RecordNotFoundError`, `UniqueConstraintError`) wrap Prisma exceptions for consistent HTTP responses.

### Domain Model

The schema (`prisma/schema.prisma`) models a school booking system:

- **`Branch`** → has `User`s (staff) and `ClassSession`s
- **`Student`** → buys `CreditPackage`s, makes `Booking`s
- **`Course`** → taught in `ClassSession`s; packages may be scoped to a course (`courseId` nullable = global package)
- **`Booking`** — links Student + ClassSession + CreditPackage; status: `BOOKED → ATTENDED | SKIPPED | ABSENT | CANCELLED`
- **`CreditTransaction`** — immutable ledger; `remainingCredits` on `CreditPackage` is a derived cache that must stay consistent with this table
- **`Compensation`** — issued on `SKIPPED` bookings; three types: `MAKEUP_CLASS`, `SEAT_CREDIT`, `EXPIRY_EXTENSION`

User roles: `HQ_ADMIN` (no branch), `BRANCH_MANAGER`, `BRANCH_STAFF` (both require `branchId`).

### File Uploads

`UploadFileInterceptor` (`src/core/interceptors/upload-file.interceptor.ts`) validates jpg/jpeg/png, enforces 1 MB limit, and names files with UUIDs. Uploaded files are served as static assets at `/uploads/*`.

## Edge Cases & Handling Strategy

| # | Scenario | Fix |
|---|---|---|
| 1 | **Concurrent Overbooking** — two staff book the last seat simultaneously | `$transaction` + `SELECT FOR UPDATE` on ClassSession before incrementing `bookedSeats` |
| 2 | **Credit Goes Negative** — two ATTENDED markings fire simultaneously | Check `remainingCredits >= 1` inside transaction + DB `CHECK (remaining_credits >= 0)` as safety net |
| 3 | **Invalid State Transition** — e.g. ATTENDED → BOOKED | State machine: ATTENDED, SKIPPED, ABSENT are terminal — no further transitions allowed |
| 4 | **Expired Package Used** — staff selects an expired package | Validate `expiresAt > now()` and `remainingCredits >= 1` before every deduction |
| 5 | **Wrong Package for Course** — course-specific package used against non-matching course | Validate `package.courseId === null \|\| package.courseId === session.courseId` before booking |
| 6 | **Double Booking** — same student booked into same class twice | DB-level `@@unique([studentId, classSessionId])`; catch Prisma error `P2002` → 409 |
| 7 | **Skip Without Compensation** — SKIPPED but Compensation never created | Create Compensation atomically in the same `$transaction` as the SKIPPED update |
| 8 | **Compensation Modified After Resolution** — staff overwrites a RESOLVED record | Guard at service layer: throw `BadRequestException` if `status === RESOLVED` |
| 9 | **Time Overlap Booking** — student booked into two overlapping sessions | Raw SQL overlap check inside transaction: `scheduledAt < newEnd AND (scheduledAt + durationMin * interval '1 minute') > newStart` |
| 10 | **Cross-Branch Access** — branch staff calls another branch's endpoints | `BranchAccessGuard`: validate `user.branchId === requestedBranchId`; HQ_ADMIN bypasses |
| 11 | **Deleting Active Data** — hard-delete Student/ClassSession with existing Bookings | Soft delete: `deletedAt DateTime?`; all queries filter `WHERE deletedAt IS NULL` |
| 12 | **No Valid Package Found** — student has no active package with credits | `findBestPackage()`: course-specific first, then global, ordered by earliest expiry; throw `BadRequestException` if none |
| 13 | **Multiple Active Packages** — which package to charge | Priority: course-specific before global, earliest `expiresAt` first within each group |
| 14 | **Class Cancellation by School** — session cancelled with BOOKED students | **Known gap** — requires a cancellation flow that refunds credits and writes `CreditTransaction` records for all BOOKED students; `BookingStatus.CANCELLED` exists for this purpose |
| 15 | **Package Expires With Active Bookings** — package expires before a future BOOKED class | **Known gap** — credits should be re-validated at attendance-marking time, not only at booking time |
