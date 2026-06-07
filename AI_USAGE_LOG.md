# AI Usage Log — School Backoffice System

This log records significant AI interactions during development of the Attendance & Credit module.
Each entry documents what was asked, what was produced, and the human judgment applied to the output.

---

### 2026-06-03 — Initial Schema Design (ERD & Architecture)

- **What I asked:** Act as a Senior Database Architect. Design a PostgreSQL schema for a centralised backoffice for a children's coding school covering Attendance & Credit System. Requirements: define tables/columns/types/relationships for Students, Branches, Classes (with seat limits), Bookings, and Credit Packages; state database-level constraints (overbooking prevention, negative seats/credits); suggest critical indexes; propose a schema design specifically for the "Skip" compensation entitlement. Output as both a written explanation and a Mermaid ERD.

- **What AI produced:**
  A full schema narrative with table-by-table rationale, followed by a Mermaid ERD and explicit design decisions:
  - **8 tables defined:** `Branch`, `User`, `Student`, `Course`, `CreditPackage`, `ClassSession`, `Booking`, `Compensation`
  - **Key constraints listed:** `bookedSeats <= totalSeats`, `bookedSeats >= 0`, `remainingCredits >= 0`, `UNIQUE(studentId, classSessionId)`, `UNIQUE(bookingId)` on Compensation
  - **5 critical indexes suggested:** `ClassSession(scheduledAt)`, `ClassSession(branchId)`, `Booking(studentId)`, `Booking(classSessionId)`, `CreditPackage(studentId)`
  - **Skip compensation flow documented:** `BOOKED → SKIP → Compensation(PENDING) → Staff resolves via MAKEUP_CLASS / SEAT_CREDIT / EXPIRY_EXTENSION → COMPLETED`
  - **Three key design decisions defended:**
    1. Denormalized `bookedSeats` counter on `ClassSession` — avoids O(n) seat count and race conditions under concurrent bookings
    2. Nullable `courseId` on `CreditPackage` — single table handles both general-purpose and course-specific credit bundles
    3. `Compensation` as a separate table — has its own lifecycle (pending → resolved by different staff) and should not be mixed into `Booking`

- **What I changed or rejected — and why:** TBD

---

### 2026-06-03 — Schema Review & Prisma Design

- **What I asked:** Review my initial `schema.prisma` against the assignment's 4 attendance states (Booked, Attend, Skip, Absent). Critically analyze for business rule alignment, data integrity, missing indexes, and relation accuracy. Produce a corrected schema.

- **What AI produced:**
  A categorized critique across 4 dimensions, followed by a fully rewritten schema. Key changes included:
  1. **`BookingStatus` enum rewritten** — replaced `PENDING/CONFIRMED/CANCELLED/ATTENDED/NO_SHOW` with `BOOKED/ATTENDED/SKIPPED/ABSENT/CANCELLED` to match spec exactly. `SKIP` was entirely absent from the original and is the most business-critical state (triggers compensation logic).
  2. **`CompensationType` enum corrected** — replaced `CREDIT_REFUND/RESCHEDULE/OTHER` with `MAKEUP_CLASS/SEAT_CREDIT/EXPIRY_EXTENSION` to match the three mechanisms named literally in the assignment.
  3. **New `CreditTransaction` model** — an immutable ledger table to record every credit deduction and refund event, making `remainingCredits` an auditable cached value rather than a mutable field with no history.
  4. **New `PackageStatus` enum** — `ACTIVE/EXPIRED/DEPLETED/CANCELLED` to represent the lifecycle of a credit package without requiring multi-field derivation on every read.
  5. **`@@unique([studentId, classSessionId])` on `Booking`** — database-level prevention of double-booking a student into the same session.
  6. **`Student.email @unique`** — was a plain `String`, which allowed duplicate students sharing an email.
  7. **`Student.phone` made nullable** — unrealistic to require phone for every record.
  8. **`Compensation.resolvedById` added** — staff accountability for who resolved each compensation.
  9. **`Booking.markedAt` added** — captures when attendance status was changed, distinct from `createdAt`.
  10. **`datasource db` missing `url = env("DATABASE_URL")`** — the original schema had no database URL.
  11. **Indexes added** — `Booking` (studentId, classSessionId, packageId, status), `ClassSession` (branchId+scheduledAt, courseId), `CreditPackage` (studentId+status, studentId+expiresAt), `Compensation` (status), `CreditTransaction` (packageId).
  12. **`updatedAt` added** to all models missing it.
  13. **Noted Prisma-unsupported CHECK constraints** — `bookedSeats <= totalSeats` and `remainingCredits >= 0` must be enforced at service layer and added via raw SQL migration.

- **What I changed or rejected — and why:** TBD

---

### 2026-06-03 — User Roles & RBAC Design

- **What I asked:** What roles should be included in the `User` table?

- **What AI produced:**
  A role design with three roles and justification for why three instead of two:
  - **`HQ_ADMIN`** — full cross-branch access; can manage courses, create branches, override attendance/compensation decisions, manage staff accounts
  - **`BRANCH_MANAGER`** — scoped to own branch; can mark attendance, manage bookings, resolve compensations, view branch-level reports
  - **`BRANCH_STAFF`** — scoped to own branch; day-to-day ops (mark attendance, create bookings); cannot resolve compensations or view reports
  - **Access matrix** explicitly defined across 6 actions for all three roles
  - **`branchId Int?` pattern** — `null` = HQ (not scoped), non-null = branch-scoped; enforced at application layer
  - **Why not two roles:** collapsing `BRANCH_MANAGER` and `BRANCH_STAFF` into one either over-privileges frontdesk staff or forces managers to do frontdesk work — neither is acceptable in a real school operation

- **What I changed or rejected — and why:** TBD

---

### 2026-06-03 — Edge Cases, Use Cases & Resolution Strategies

- **What I asked:** List all edge cases to consider in this project, describe a use case for each, and suggest how to resolve them.

- **What AI produced:**
  10 edge cases with use cases, code solutions, and a summary table:

  | #   | Edge Case                                            | Root Cause                       | Solution                                                                                                                                    |
  | --- | ---------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
  | 1   | **Concurrent overbooking**                           | Race condition on last seat      | `$transaction` + `SELECT FOR UPDATE` to lock the `ClassSession` row                                                                         |
  | 2   | **Credit goes negative**                             | Race condition on last credit    | `$transaction` + `CHECK (remainingCredits >= 0)` as DB safety net                                                                           |
  | 3   | **Invalid state transition**                         | No enforcement                   | Explicit state machine — `BOOKED → ATTENDED/SKIPPED/ABSENT` only; all terminal states block further transitions                             |
  | 4   | **Using an expired package**                         | Missing pre-deduction validation | `validatePackage()` checks `expiresAt`, `remainingCredits`, and `courseId` scope before every deduction                                     |
  | 5   | **Double booking**                                   | No uniqueness enforcement        | `@@unique([studentId, classSessionId])` + catch Prisma error `P2002`                                                                        |
  | 6   | **Skip without compensation record**                 | Non-atomic operation             | `markSkip()` creates both the `Booking` update and `Compensation` record in a single transaction — impossible to have one without the other |
  | 7   | **Compensation overwritten after resolution**        | No status guard                  | Reject any update if `compensation.status === 'COMPLETED'`                                                                                  |
  | 8   | **Cross-branch data access**                         | No server-side scope check       | `BranchAccessGuard` — `HQ_ADMIN` bypasses; all branch-scoped roles must match `user.branchId === requestedBranchId`                         |
  | 9   | **Deleting records with active bookings**            | Hard delete                      | Soft delete pattern — `deletedAt DateTime?`; all queries filter `where: { deletedAt: null }`                                                |
  | 10  | **Wrong package selected when student has multiple** | No deterministic selection rule  | Priority query: course-specific package first, then earliest expiry within same type                                                        |

- **What I changed or rejected — and why:** TBD

---

### 2026-06-03 — Full Backend Implementation (Phases 1–4)

- **What I asked:** Scaffold, implement, and wire up the complete RESTful backend across four phases: CLI scaffolding, DTOs, business-logic services, and secured controllers.

- **What AI produced:**

  **Phase 1 — Scaffolding** — 6 modules via `nest g res --no-spec` (`branches`, `students`, `courses`, `credit-packages`, `class-sessions`, `compensations`). All auto-registered in `AppModule`.

  **Phase 2 — DTOs** — 14 files. Date fields use `@Type(() => Date)`. `MarkAttendanceDto` restricts to terminal statuses via `@IsIn`. `ResolveCompensationDto` allows only `RESOLVED | REJECTED`.

  **Phase 3 — Services** — 7 files. `CreditPackagesService.create` initialises `remainingCredits = totalCredits` and `status = ACTIVE`. `ClassSessionsService.update` blocks reducing `totalSeats` below `bookedSeats`. `BookingsService` covers EC#1 (SELECT FOR UPDATE on ClassSession), EC#2 (SELECT FOR UPDATE on CreditPackage), EC#3 (terminal state guard), EC#4/5 (package expiry + course-scope check), EC#6 (P2002 → 409), EC#7 (Compensation created atomically on SKIPPED), EC#9 (raw SQL overlap), EC#12/13 (findBestPackageId). `CompensationsService.resolve` enforces EC#8.

  **Phase 4 — Controllers & Security** — 7 controllers + `BranchAccessGuard`. All use `@Auth()` composite decorator. `AccessTokenPayload` extended with `branchId`; JWT signing updated. `GET /class-sessions` auto-scopes by branch for non-HQ staff. `PATCH /bookings/:id/attendance` records `markedById` from JWT.

- **Assumptions made:** Soft-delete not yet in schema (EC#11 deferred). Default compensation type on SKIPPED is `SEAT_CREDIT`. `POST /compensations` exposed for manual overrides.

- **Human judgment required:** Confirm role boundary for student deletion, soft-delete migration timing.

---

### 2026-06-03 — Remove Global Package; Make courseId Required

- **What I asked:** Remove global credit packages entirely. `courseId` should always be required when creating a `CreditPackage`. A package can only be used against the course it was purchased for.

- **What AI produced:**
  Three changes:
  1. **`CreateCreditPackageDto`** — removed `@IsOptional()` from `courseId` and dropped the unused `IsOptional` import. `courseId` is now a required `@IsInt() @IsPositive()` field.
  2. **`BookingsService.findBestPackageId`** — removed the `OR: [{ courseId }, { courseId: null }]` clause and the `courseSpecific ?? packages[0]` fallback. Now uses `findFirst` with an exact `courseId` match, ordered by earliest `expiresAt`. EC#13 (global-vs-course-specific priority) is eliminated; EC#12 (no valid package → `BadRequestException`) is retained.
  3. **`AI_USAGE_LOG.md`** — this entry.

- **What I changed or rejected — and why:** Decision was product-driven: every package is tied to a specific course at purchase time. Removing global packages eliminates ambiguity in package selection and simplifies booking logic.

---

### 2026-06-03 — Make packageId Required on Booking; Remove findBestPackageId

- **What I asked:** Since `packageId` is always provided by the caller when creating a booking, make it required and remove the auto-selection logic entirely.

- **What AI produced:**
  Three changes:
  1. **`CreateBookingDto`** — removed `@IsOptional()` from `packageId` and dropped the unused `IsOptional` import. `packageId` is now a required field.
  2. **`BookingsService.createBooking`** — replaced the `let packageId = dto.packageId` block and all references with `dto.packageId` directly. Removed `findBestPackageId` method entirely (EC#12/EC#13 logic no longer needed).
  3. **EC#5 check simplified** — `pkg.courseId !== null && pkg.courseId !== session.courseId` → `pkg.courseId !== session.courseId`. The `!== null` guard is now redundant since all packages have a `courseId`.

- **What I changed or rejected — and why:** Consequence of the previous decision (global packages removed + courseId required). With no auto-selection needed, keeping `findBestPackageId` would be dead code.

---

### 2026-06-05 — Add CourseLesson Table for Curriculum Definition

- **What I asked:** Should `ClassSession` have a `name` field to describe the topic per session? And if a student buys a Python package with 10 sessions (Session 1: Data Types, Session 2: Control Flow, etc.), they get 10 credits — does that require a new table?

- **What AI produced:**
  Introduced a new `CourseLesson` model and updated two existing models:
  1. **`CourseLesson` model added** — `courseId`, `order` (1-based sequence), `topic` (e.g. "Data Types"), `createdAt`, `updatedAt`. `@@unique([courseId, order])` prevents duplicate session numbers per course.
  2. **`Course.lessons CourseLesson[]`** — back-relation added so a course owns its curriculum.
  3. **`ClassSession.courseLessonId Int?`** — optional FK to `CourseLesson`; optional because sessions can be scheduled before the curriculum is fully defined, or as ad-hoc classes outside the fixed curriculum.
  4. **Design rationale:** `CourseLesson` is a curriculum template (what will be taught), while `ClassSession` is a scheduled event (when/where it will be taught). Separating them avoids repeating topic strings across every scheduled instance and allows curriculum to be defined once and reused across branches.

- **What I changed or rejected — and why:** `courseLessonId` kept optional (not required) — a `ClassSession` may be a makeup or ad-hoc class that doesn't map to a fixed curriculum slot. Forcing it required would break compensation flows that book students into substitute sessions.

---
