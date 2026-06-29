# CedarRose OpsHub — Backend Creation Plan

**Stack:** Express · Node.js · TypeScript · Drizzle ORM · PostgreSQL  
**Target:** 100% production-ready API that mirrors every business rule in the React frontend  
**Security baseline:** OWASP Top 10 (2021) fully addressed

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Folder Structure](#2-folder-structure)
3. [Database Schema Design](#3-database-schema-design)
4. [API Endpoint Catalogue](#4-api-endpoint-catalogue)
5. [Business Logic Specification](#5-business-logic-specification)
6. [Auth & RBAC Design](#6-auth--rbac-design)
7. [Security — OWASP Top 10 Mitigations](#7-security--owasp-top-10-mitigations)
8. [Design Patterns](#8-design-patterns)
9. [Configuration & Environment](#9-configuration--environment)
10. [Error Handling Strategy](#10-error-handling-strategy)
11. [Drizzle ORM Setup](#11-drizzle-orm-setup)
12. [Middleware Stack](#12-middleware-stack)
13. [Testing Strategy](#13-testing-strategy)
14. [Deployment Checklist](#14-deployment-checklist)
15. [Form Builder — Deep Specification](#15-form-builder--deep-specification)
16. [Existing Database Integration](#16-existing-database-integration)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  React SPA (Vite)                        │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / JSON
┌────────────────────────▼────────────────────────────────┐
│              Express API  (Node.js + TypeScript)         │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │  Routes  │  │Middleware│  │ Services │  │ Utils  │  │
│  └────┬─────┘  └──────────┘  └────┬─────┘  └────────┘  │
│       │                           │                      │
│  ┌────▼────────────────────────────▼──────────────────┐  │
│  │          Repositories (Drizzle ORM)                 │  │
│  └────────────────────────┬───────────────────────────┘  │
└───────────────────────────┼─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                  PostgreSQL                              │
└─────────────────────────────────────────────────────────┘
```

**Layered architecture:**
```
HTTP Request
  → Global Middleware (CORS, Helmet, Rate-limit, Body-parse, Morgan)
  → Auth Middleware (JWT verify)
  → Role/Permission Guard
  → Route Handler (thin — validate input only)
  → Service Layer (pure business logic)
  → Repository Layer (Drizzle queries only)
  → PostgreSQL
  → Response serializer
```

No business logic in route handlers. No DB calls in services. Strict layer boundaries enforced.

---

## 2. Folder Structure

```
cedarrose-opshub-api/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── .env
├── .env.example
├── .gitignore
│
├── src/
│   ├── main.ts                        # Entry point — creates app, connects DB, starts server
│   ├── app.ts                         # Express app factory (no listen)
│   │
│   ├── config/
│   │   ├── env.ts                     # Zod-validated env schema
│   │   ├── database.ts                # Drizzle + pg pool setup
│   │   └── constants.ts               # App-wide constants (status priority, stale hours, etc.)
│   │
│   ├── db/
│   │   ├── schema/
│   │   │   ├── index.ts               # Re-exports all schema tables
│   │   │   ├── users.ts
│   │   │   ├── cases.ts
│   │   │   ├── companies.ts
│   │   │   ├── questionnaire-responses.ts
│   │   │   ├── audit-events.ts
│   │   │   ├── notifications.ts
│   │   │   ├── templates.ts
│   │   │   ├── sections.ts
│   │   │   ├── questions.ts
│   │   │   ├── platform-config.ts
│   │   │   ├── refresh-tokens.ts
│   │   │   └── countries.ts
│   │   ├── migrations/                # Drizzle-kit generated migration files
│   │   └── seeds/
│   │       ├── index.ts
│   │       ├── users.seed.ts
│   │       ├── cases.seed.ts
│   │       ├── templates.seed.ts
│   │       └── config.seed.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.router.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.schema.ts         # Zod request schemas
│   │   │   └── auth.types.ts
│   │   ├── cases/
│   │   │   ├── cases.router.ts
│   │   │   ├── cases.controller.ts
│   │   │   ├── cases.service.ts
│   │   │   ├── cases.repository.ts
│   │   │   ├── cases.schema.ts
│   │   │   └── cases.types.ts
│   │   ├── companies/
│   │   │   ├── companies.router.ts
│   │   │   ├── companies.controller.ts
│   │   │   ├── companies.service.ts
│   │   │   ├── companies.repository.ts
│   │   │   ├── companies.schema.ts
│   │   │   └── companies.types.ts
│   │   ├── audit/
│   │   │   ├── audit.router.ts
│   │   │   ├── audit.controller.ts
│   │   │   ├── audit.service.ts
│   │   │   ├── audit.repository.ts
│   │   │   └── audit.types.ts
│   │   ├── users/
│   │   │   ├── users.router.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   ├── users.schema.ts
│   │   │   └── users.types.ts
│   │   ├── templates/
│   │   │   ├── templates.router.ts
│   │   │   ├── templates.controller.ts
│   │   │   ├── templates.service.ts
│   │   │   ├── templates.repository.ts
│   │   │   ├── templates.schema.ts
│   │   │   └── templates.types.ts
│   │   ├── config/
│   │   │   ├── config.router.ts
│   │   │   ├── config.controller.ts
│   │   │   ├── config.service.ts
│   │   │   ├── config.repository.ts
│   │   │   └── config.schema.ts
│   │   ├── notifications/
│   │   │   ├── notifications.router.ts
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   ├── notifications.repository.ts
│   │   │   └── notifications.types.ts
│   │   └── questionnaire/
│   │       ├── questionnaire.router.ts  # Public-facing (recipient link)
│   │       ├── questionnaire.controller.ts
│   │       ├── questionnaire.service.ts
│   │       ├── questionnaire.repository.ts
│   │       ├── questionnaire.schema.ts
│   │       └── questionnaire.types.ts
│   │
│   ├── middleware/
│   │   ├── authenticate.ts            # JWT verification
│   │   ├── authorize.ts               # Role-based guard factory
│   │   ├── validate.ts                # Zod request validation middleware
│   │   ├── rate-limit.ts              # Per-route rate limiter configs
│   │   ├── audit-logger.ts            # Auto-append audit events
│   │   ├── error-handler.ts           # Global error handler
│   │   └── request-id.ts              # UUID per request (tracing)
│   │
│   ├── shared/
│   │   ├── errors/
│   │   │   ├── AppError.ts            # Base typed error class
│   │   │   ├── HttpError.ts           # 4xx/5xx factory helpers
│   │   │   └── error-codes.ts         # Machine-readable error codes
│   │   ├── types/
│   │   │   ├── express.d.ts           # Augment req.user, req.id
│   │   │   └── common.ts              # Shared TS types
│   │   └── utils/
│   │       ├── crypto.ts              # Token generation, hashing
│   │       ├── date.ts                # Date arithmetic helpers
│   │       ├── email.ts               # Email validation, typo detection
│   │       ├── pagination.ts          # Cursor / offset pagination helpers
│   │       └── response.ts            # Standardised JSON response wrapper
│   │
│   └── jobs/
│       ├── scheduler.ts               # node-cron job registry
│       ├── expire-links.job.ts        # Mark expired links daily
│       ├── send-reminders.job.ts      # Dispatch Day 0/r1/r2/r3 reminders
│       └── stale-cases.job.ts         # Flag stale IN PROGRESS cases
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── scripts/
    ├── generate-migration.sh
    └── seed.ts
```

---

## 3. Database Schema Design

### 3.1 `users`

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  role            VARCHAR(20) NOT NULL CHECK (role IN ('researcher','reviewer','analyst','admin')),
  status          VARCHAR(10) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
  title           VARCHAR(100),
  initials        VARCHAR(5),
  total_reports   INT,
  score           NUMERIC(5,2),
  last_submission TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Drizzle schema (`db/schema/users.ts`):**

```typescript
export const users = pgTable("users", {
  id:             uuid("id").primaryKey().defaultRandom(),
  firstName:      varchar("first_name", { length: 100 }).notNull(),
  lastName:       varchar("last_name",  { length: 100 }).notNull(),
  email:          varchar("email", { length: 255 }).notNull().unique(),
  passwordHash:   text("password_hash").notNull(),
  role:           roleEnum("role").notNull(),
  status:         userStatusEnum("status").notNull().default("Active"),
  title:          varchar("title", { length: 100 }),
  initials:       varchar("initials", { length: 5 }),
  totalReports:   integer("total_reports"),
  score:          numeric("score", { precision: 5, scale: 2 }),
  lastSubmission: timestamp("last_submission", { withTimezone: true }),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

---

### 3.2 `user_platforms`

Maps users to their app+role assignments (QA Automation Platform / QA Questionnaire Platform).

```sql
CREATE TABLE user_platforms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform    VARCHAR(50) NOT NULL CHECK (platform IN ('automation','questionnaire')),
  role        VARCHAR(20) NOT NULL CHECK (role IN ('researcher','reviewer','analyst','admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 3.3 `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 3.4 `companies`

```sql
CREATE TABLE companies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid                 VARCHAR(50) NOT NULL UNIQUE,   -- e.g. "UID-44529"
  company_name        VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100),
  country             VARCHAR(100),
  risk_rating         VARCHAR(10) CHECK (risk_rating IN ('Low','Medium','High')),
  incorporation_date  DATE,
  legal_structure     VARCHAR(100),
  primary_industry    VARCHAR(100),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE company_recipient_emails (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email       VARCHAR(255) NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 3.5 `cases`

```sql
CREATE TABLE cases (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_ref                  VARCHAR(20) NOT NULL UNIQUE,   -- e.g. "c-001"
  order_id                  VARCHAR(100) NOT NULL,
  uid                       VARCHAR(50) REFERENCES companies(uid),
  subject_name              VARCHAR(255) NOT NULL,
  country                   VARCHAR(100) NOT NULL,
  recipient_type            VARCHAR(50) NOT NULL
                              CHECK (recipient_type IN (
                                'Supplier','Customer','Partner','Business Analytics Report'
                              )),
  status                    VARCHAR(50) NOT NULL DEFAULT 'NOT SENT'
                              CHECK (status IN (
                                'SENT','OPENED','IN PROGRESS','COMPLETED',
                                'COMPLETED — MISSING DATA','PENDING CONTACT',
                                'PENDING LINKAGE & CONTACT','EXPIRED','NOT SENT'
                              )),
  completion_mandatory      INT NOT NULL DEFAULT 0,
  completion_optional       INT NOT NULL DEFAULT 0,
  date_submitted            TIMESTAMPTZ,
  date_received             TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity             TIMESTAMPTZ,
  analyst_id                UUID REFERENCES users(id),
  assigned_researcher_id    UUID REFERENCES users(id),
  researcher_status         VARCHAR(20)
                              CHECK (researcher_status IN (
                                'Not Applicable','Awaiting Review',
                                'Approved','Flagged','Rejected'
                              )),
  researcher_notes          TEXT,
  researcher_reviewed_at    TIMESTAMPTZ,
  api_push_status           VARCHAR(10) DEFAULT 'Pending'
                              CHECK (api_push_status IN ('Pending','Success','Failed')),
  api_push_at               TIMESTAMPTZ,
  current_step              INT NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 16),
  link_token_hash           TEXT,                          -- hashed secure token
  link_expiry               TIMESTAMPTZ,
  link_validity_hours       INT NOT NULL DEFAULT 48,
  reminders_sent            INT NOT NULL DEFAULT 0,
  resent_count              INT NOT NULL DEFAULT 0,
  template_id               UUID REFERENCES templates(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cases_status         ON cases(status);
CREATE INDEX idx_cases_analyst_id     ON cases(analyst_id);
CREATE INDEX idx_cases_researcher_id  ON cases(assigned_researcher_id);
CREATE INDEX idx_cases_uid            ON cases(uid);
CREATE INDEX idx_cases_link_expiry    ON cases(link_expiry);
```

---

### 3.6 `questionnaire_responses`

```sql
CREATE TABLE questionnaire_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  answer      TEXT,
  mandatory   BOOLEAN NOT NULL DEFAULT TRUE,
  language    VARCHAR(10),
  section_id  UUID REFERENCES sections(id),
  question_id UUID REFERENCES questions(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 3.7 `audit_events`

```sql
CREATE TABLE audit_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       UUID REFERENCES cases(id),
  case_subject  VARCHAR(255),
  case_order_id VARCHAR(100),
  step          INT CHECK (step BETWEEN 1 AND 16),
  event_type    VARCHAR(30) NOT NULL
                  CHECK (event_type IN (
                    'API Call','Link Event','Authentication',
                    'Form Activity','Researcher Action','API Push'
                  )),
  description   TEXT NOT NULL,
  triggered_by  VARCHAR(255),
  triggered_by_user_id UUID REFERENCES users(id),
  status        VARCHAR(10) NOT NULL DEFAULT 'Success'
                  CHECK (status IN ('Success','Failed','Pending')),
  payload       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_case_id    ON audit_events(case_id);
CREATE INDEX idx_audit_created_at ON audit_events(created_at DESC);
CREATE INDEX idx_audit_event_type ON audit_events(event_type);
```

---

### 3.8 `notifications`

```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(20) NOT NULL
                CHECK (type IN ('submission','expired','blocked','reminder','review','api')),
  title       VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  case_id     UUID REFERENCES cases(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id  ON notifications(user_id);
CREATE INDEX idx_notifications_read     ON notifications(read);
```

---

### 3.9 `templates`

```sql
CREATE TABLE templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  status        VARCHAR(10) NOT NULL DEFAULT 'Draft'
                  CHECK (status IN ('Active','Draft')),
  recipient_type VARCHAR(50),
  version       INT NOT NULL DEFAULT 1,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 3.10 `sections`

```sql
CREATE TABLE sections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  order_index  INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 3.11 `questions`

```sql
CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  field_type      VARCHAR(20) NOT NULL
                    CHECK (field_type IN (
                      'text','longtext','number','date','dropdown','radio',
                      'multiselect','file','table','esign','toggle','url','support_doc'
                    )),
  mandatory       BOOLEAN NOT NULL DEFAULT FALSE,
  order_index     INT NOT NULL DEFAULT 0,
  placeholder     TEXT,
  help_text       TEXT,
  options         JSONB,                               -- for dropdown/radio/multiselect
  table_columns   JSONB,                               -- for field_type='table'
  validation      JSONB,                               -- { min, max, maxLength, allowPast, allowFuture }
  condition       JSONB,                               -- { enabled, fieldId, operator, value }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 3.12 `platform_config`

Single-row table (enforced by trigger / CHECK).

```sql
CREATE TABLE platform_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link settings
  link_validity_days    INT NOT NULL DEFAULT 10,
  token_type            VARCHAR(15) NOT NULL DEFAULT 'single-use'
                          CHECK (token_type IN ('single-use','time-based')),
  token_expiry_value    INT NOT NULL DEFAULT 30,
  token_expiry_unit     VARCHAR(10) NOT NULL DEFAULT 'minutes'
                          CHECK (token_expiry_unit IN ('hours','minutes')),

  -- OTP settings
  otp_length            INT NOT NULL DEFAULT 6,
  otp_expiry_minutes    INT NOT NULL DEFAULT 10,
  otp_max_attempts      INT NOT NULL DEFAULT 3,

  -- Reminder schedule (days from dispatch)
  reminder_1_day        INT NOT NULL DEFAULT 3,
  reminder_2_day        INT NOT NULL DEFAULT 5,
  reminder_final_day    INT NOT NULL DEFAULT 7,
  expiry_day            INT NOT NULL DEFAULT 10,

  -- Gamification
  gamification_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  tier1_label           VARCHAR(100),
  tier1_description     TEXT,
  tier2_label           VARCHAR(100),
  tier2_description     TEXT,

  -- Processing flags
  auto_process_a        BOOLEAN NOT NULL DEFAULT TRUE,
  manual_process_b      BOOLEAN NOT NULL DEFAULT FALSE,
  alert_cd              BOOLEAN NOT NULL DEFAULT TRUE,

  -- Audit / export
  audit_retention_days  INT NOT NULL DEFAULT 365,
  export_format         VARCHAR(10) NOT NULL DEFAULT 'csv',
  stale_hours           INT NOT NULL DEFAULT 72,

  updated_by            UUID REFERENCES users(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 3.13 `countries`

```sql
CREATE TABLE countries (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) NOT NULL UNIQUE,
  code  CHAR(2)
);
```

---

### ERD Summary (relationships)

```
users ──< user_platforms
users ──< cases (analyst_id)
users ──< cases (assigned_researcher_id)
users ──< audit_events (triggered_by_user_id)
users ──< notifications
users ──< templates (created_by)
users ──< refresh_tokens
companies ──< company_recipient_emails
companies >── cases (uid FK)
cases ──< questionnaire_responses
cases ──< audit_events
cases ──< notifications
templates ──< sections ──< questions
```

---

## 4. API Endpoint Catalogue

Base URL: `/api/v1`

### 4.1 Auth

| Method | Path | Description | Auth | Roles |
|--------|------|-------------|------|-------|
| `POST` | `/auth/login` | Email + password → access + refresh tokens | Public | – |
| `POST` | `/auth/refresh` | Rotate access token via refresh token | Public | – |
| `POST` | `/auth/logout` | Revoke refresh token | JWT | any |
| `GET`  | `/auth/me` | Logged-in user profile | JWT | any |
| `POST` | `/auth/change-password` | Update own password | JWT | any |

---

### 4.2 Cases

| Method | Path | Description | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET`    | `/cases` | List all cases (filter, sort, paginate) | JWT | any |
| `GET`    | `/cases/:id` | Get single case with responses | JWT | any |
| `POST`   | `/cases` | Create new questionnaire request | JWT | any |
| `PATCH`  | `/cases/:id/resend-link` | Regenerate + resend secure link | JWT | any |
| `PATCH`  | `/cases/:id/researcher-review` | Submit researcher decision | JWT | `researcher`, `admin` |
| `PATCH`  | `/cases/:id/api-push` | Manually trigger API push to CedarRose | JWT | `admin` |
| `GET`    | `/cases/export` | Export cases as CSV | JWT | `admin`, `analyst` |

**Query params for `GET /cases`:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by `CaseStatus` |
| `recipientType` | string | Filter by recipient type |
| `country` | string | Filter by country |
| `analystId` | UUID | Filter by analyst |
| `search` | string | Full-text search on subject/orderId |
| `sortBy` | string | Field name |
| `sortDir` | `asc` \| `desc` | Sort direction |
| `page` | number | Page number (1-based) |
| `limit` | number | Items per page (default 20, max 100) |

---

### 4.3 Companies

| Method | Path | Description | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET`  | `/companies/:uid` | Lookup company by CRiS UID | JWT | any |
| `GET`  | `/companies` | List all companies (admin) | JWT | `admin` |
| `POST` | `/companies` | Register new company | JWT | `admin` |
| `PATCH`| `/companies/:uid` | Update company profile | JWT | `admin` |

---

### 4.4 Audit Log

| Method | Path | Description | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET`  | `/audit-log` | List audit events (filter, paginate) | JWT | any |
| `GET`  | `/audit-log/export` | Export audit log CSV | JWT | `admin` |

**Query params for `GET /audit-log`:**

| Param | Type | Description |
|-------|------|-------------|
| `caseId` | UUID | Filter by case |
| `type` | string | Filter by event type |
| `status` | string | Filter by event status |
| `from` | ISO date | Start of date range |
| `to` | ISO date | End of date range |
| `page` | number | Page |
| `limit` | number | Items per page |

---

### 4.5 Users (Admin)

| Method | Path | Description | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET`    | `/admin/users` | List users (filter by role) | JWT | `admin` |
| `POST`   | `/admin/users` | Create user | JWT | `admin` |
| `PATCH`  | `/admin/users/:id` | Update user | JWT | `admin` |
| `DELETE` | `/admin/users/:id` | Soft-delete user (set Inactive) | JWT | `admin` |
| `GET`    | `/admin/users/export` | Export users CSV | JWT | `admin` |

---

### 4.6 Templates (Admin)

| Method | Path | Description | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET`   | `/admin/templates` | List templates | JWT | `admin` |
| `GET`   | `/admin/templates/:id` | Get template with sections+questions | JWT | `admin` |
| `POST`  | `/admin/templates` | Create template | JWT | `admin` |
| `PUT`   | `/admin/templates/:id` | Replace full template | JWT | `admin` |
| `PATCH` | `/admin/templates/:id/status` | Activate / draft | JWT | `admin` |
| `DELETE`| `/admin/templates/:id` | Delete draft template | JWT | `admin` |

---

### 4.7 Platform Configuration (Admin)

| Method | Path | Description | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET`  | `/admin/config` | Get platform config | JWT | `admin` |
| `PUT`  | `/admin/config` | Replace full config | JWT | `admin` |

---

### 4.8 Notifications

| Method | Path | Description | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET`    | `/notifications` | List notifications for current user | JWT | any |
| `PATCH`  | `/notifications/:id/read` | Mark single notification read | JWT | any |
| `PATCH`  | `/notifications/read-all` | Mark all notifications read | JWT | any |
| `DELETE` | `/notifications/:id` | Delete notification | JWT | any |

---

### 4.9 Questionnaire (Public — recipient link)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/questionnaire/verify-link` | Validate token, return case metadata | Token param |
| `POST` | `/questionnaire/authenticate` | OTP request | Token param |
| `POST` | `/questionnaire/otp-verify` | OTP code verification → session JWT | Token param |
| `GET`  | `/questionnaire/:token/form` | Get questions for this case | Questionnaire JWT |
| `POST` | `/questionnaire/:token/save` | Auto-save progress | Questionnaire JWT |
| `POST` | `/questionnaire/:token/submit` | Final submission | Questionnaire JWT |

---

### 4.10 Misc

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET`  | `/countries` | List countries | JWT |
| `GET`  | `/health` | Health check | Public |

---

## 5. Business Logic Specification

### 5.1 Case Status Machine

**Transitions enforced server-side only:**

```
NOT SENT ──────────────────────────────────► SENT
                                              │
                         ┌────────────────────┘
                         ▼
                      OPENED
                         │
                         ▼
                    IN PROGRESS
                    │         │
         (all mandatory)   (timeout 72h → stale flag)
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
      COMPLETED        COMPLETED — MISSING DATA
          │                    │
          └────────┬───────────┘
                   ▼
           (researcher review)
             Approved / Flagged / Rejected

SENT / OPENED / IN PROGRESS ──► EXPIRED (scheduled job)
EXPIRED ──────────────────────► SENT (resend-link)
PENDING CONTACT ──────────────► SENT (after email resolved)
PENDING LINKAGE & CONTACT ────► SENT (after UID linked + email resolved)
```

**Status determination on case creation:**

```typescript
function determineInitialStatus(dto: CreateCaseDto): CaseStatus {
  const hasEmail = dto.recipientEmail != null;
  const hasUid   = dto.uid != null;
  if (!hasUid && !hasEmail) return "PENDING LINKAGE & CONTACT";
  if (!hasEmail)             return "PENDING CONTACT";
  return "NOT SENT";
}
```

---

### 5.2 Secure Link Generation

```typescript
// In cases.service.ts → generateSecureLink()
import { randomBytes, createHash } from "crypto";

function generateSecureLink(caseId: string, validityHours: number) {
  const rawToken  = randomBytes(48).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = addHours(new Date(), validityHours);
  return { rawToken, tokenHash, expiresAt };
  // rawToken goes in the email link URL
  // tokenHash is stored in DB — never store rawToken
}
```

**Link URL format:** `https://questionnaire.cedarrose.com/q/{rawToken}`

**On resend:**
1. Invalidate old `link_token_hash` (set to NULL)
2. Generate new token + new expiry (resets to config `linkValidityHours`)
3. Increment `resent_count`
4. Reset `reminders_sent` to 0
5. Update case status to `SENT`
6. Append `AuditEvent` (type: `Link Event`, step: 5)
7. Send email (notify email service)

---

### 5.3 Reminder Schedule (Cron Job)

Uses `platform_config.reminder_1_day`, `reminder_2_day`, `reminder_final_day`.

```typescript
// jobs/send-reminders.job.ts — runs every 6 hours
async function sendReminders() {
  const config = await configRepository.get();
  const now    = new Date();

  const cases = await casesRepository.findByStatuses(["SENT","OPENED","IN PROGRESS"]);

  for (const c of cases) {
    const daysSinceDispatch = differenceInDays(now, c.dispatchedAt);
    const nextReminderDue   = getReminderDue(config, c.remindersSent);

    if (nextReminderDue !== null && daysSinceDispatch >= nextReminderDue) {
      await notificationService.sendReminder(c);
      await casesRepository.incrementRemindersSent(c.id);
      await auditService.log({ caseId: c.id, type: "Link Event", step: 6, ... });
    }
  }
}

function getReminderDue(config: PlatformConfig, sent: number): number | null {
  if (sent === 0) return config.reminder1Day;
  if (sent === 1) return config.reminder2Day;
  if (sent === 2) return config.reminderFinalDay;
  return null; // max 3 reminders
}
```

---

### 5.4 Link Expiry Job

```typescript
// jobs/expire-links.job.ts — runs every hour
async function expireLinks() {
  const expired = await casesRepository.findExpiredActive();
  for (const c of expired) {
    await casesRepository.updateStatus(c.id, "EXPIRED");
    await auditService.log({ caseId: c.id, type: "Link Event", description: "Link expired", step: 6 });
    await notificationsService.create({ type: "expired", caseId: c.id, ... });
  }
}
```

---

### 5.5 Stale IN PROGRESS Detection

```typescript
// jobs/stale-cases.job.ts — runs every 4 hours
async function flagStaleCases() {
  const config    = await configRepository.get();
  const threshold = subHours(new Date(), config.staleHours);
  const staleCases = await casesRepository.findStaleInProgress(threshold);
  // Add a stale flag notification for each analyst — do NOT change status
  for (const c of staleCases) {
    await notificationsService.create({
      userId: c.analystId,
      type: "reminder",
      title: `Case ${c.caseRef} is stale`,
      body: `No activity in ${config.staleHours}h`,
      caseId: c.id,
    });
  }
}
```

---

### 5.6 Dashboard "Needs Attention" Query

```typescript
// cases.repository.ts
async findNeedsAttention(): Promise<CaseRecord[]> {
  const config = await configRepository.get();
  const staleThreshold = subHours(new Date(), config.staleHours);

  return db.select().from(cases).where(
    or(
      inArray(cases.status, [
        "EXPIRED",
        "COMPLETED — MISSING DATA",
        "PENDING CONTACT",
        "PENDING LINKAGE & CONTACT",
      ]),
      and(
        eq(cases.status, "IN PROGRESS"),
        lt(cases.lastActivity, staleThreshold)
      )
    )
  );
}
```

---

### 5.7 Case Sort Priority

Status priority (lower = higher urgency) used in `GET /cases` default sort:

```typescript
const STATUS_PRIORITY: Record<CaseStatus, number> = {
  "PENDING LINKAGE & CONTACT": 0,
  "PENDING CONTACT":           1,
  "EXPIRED":                   2,
  "IN PROGRESS":               3,
  "SENT":                      4,
  "OPENED":                    5,
  "COMPLETED — MISSING DATA":  6,
  "NOT SENT":                  7,
  "COMPLETED":                 8,
};
```

Default `ORDER BY` is by status_priority ASC, then `created_at` DESC.  
Implemented via `CASE WHEN` expression in Drizzle raw SQL.

---

### 5.8 Researcher Review

`PATCH /cases/:id/researcher-review`  
Body: `{ decision: "Approved" | "Flagged" | "Rejected", notes?: string }`

Rules:
- Caller must be `researcher` or `admin`
- Case must be in `COMPLETED` or `COMPLETED — MISSING DATA`
- `researcherStatus` updates to decision
- `researcherReviewedAt` = now
- `assignedResearcherId` = caller's ID
- Audit event: type `Researcher Action`, step 14
- If `Approved`: trigger `api_push_status = Pending`, schedule API push job

---

### 5.9 Questionnaire Submission Flow (recipient-side)

1. **`POST /questionnaire/verify-link`** — hash inbound rawToken with SHA-256; query `cases` where `link_token_hash = hash AND link_expiry > now`. Audit event step 7.
2. **`POST /questionnaire/authenticate`** — generate 6-digit OTP, store hashed in Redis/PG with 10min TTL, send OTP email. Audit step 8.
3. **`POST /questionnaire/otp-verify`** — verify OTP, max 3 attempts (block on exceed), return short-lived questionnaire JWT (15min, separate secret). Audit step 8.
4. **`GET /questionnaire/:token/form`** — return template sections/questions for this case's `template_id`. Update case status to `OPENED` (if was `SENT`) then `IN PROGRESS`. Audit step 9.
5. **`POST /questionnaire/:token/save`** — upsert `questionnaire_responses`, update `lastActivity`. Audit step 10.
6. **`POST /questionnaire/:token/submit`** — validate mandatory fields complete. Compute `completionMandatory` + `completionOptional` percentages. Set status to `COMPLETED` or `COMPLETED — MISSING DATA`. Set `dateSubmitted`. Audit step 12, 13. Trigger researcher notification.

**Reward tier determination on submit:**

```typescript
function determineStatus(responses: QuestionnaireResponse[]): CaseStatus {
  const mandatory = responses.filter(r => r.mandatory);
  const allMandatoryFilled = mandatory.every(r => r.answer?.trim());
  return allMandatoryFilled ? "COMPLETED" : "COMPLETED — MISSING DATA";
}
```

---

### 5.10 New Request Creation (from OpsHub UI)

`POST /cases`  
Body validated against `createCaseSchema` (Zod):

```typescript
const createCaseSchema = z.object({
  orderId:         z.string().min(1).max(100),
  uid:             z.string().optional(),
  subjectName:     z.string().min(1).max(255),
  country:         z.string().min(1).max(100),
  recipientType:   z.enum(["Supplier","Customer","Partner","Business Analytics Report"]),
  recipientEmail:  z.string().email().optional(),
  linkValidityHours: z.number().int().min(24).max(72).default(48),
  templateId:      z.string().uuid().optional(),
  analystId:       z.string().uuid().optional(),
});
```

Server flow:
1. Validate UID → fetch company (or mark PENDING LINKAGE)
2. Validate email → if absent mark PENDING CONTACT
3. Detect email typos: `/\.con$|\.cm$|@gmial\./i` → reject with `EMAIL_TYPO_DETECTED`
4. Assign template based on `recipientType` if not provided
5. Determine initial status (§5.1)
6. Generate `caseRef` = `c-{sequential padded number}`
7. Generate secure link token (SHA-256 hash stored, raw sent)
8. Persist case
9. Audit event step 1 + step 2
10. Emit `SENT` if email available → link email + audit step 5+6

---

### 5.11 User Management Rules

Enforced in `users.service.ts`:

- `email` must be unique across all users
- Admin users have `totalReports = null`, `score = null`
- At least one platform+role combination required
- `status` defaults to `Active` on creation
- `password` must be min 12 chars, 1 uppercase, 1 number, 1 symbol (OWASP A07)
- Deleting a user: soft-delete only (set `status = Inactive`) — never `DELETE` from DB
- `initials` computed from first + last name if not provided

---

### 5.12 Platform Config Constraints

- Single row (enforced: `INSERT` only allowed when table empty)
- `expiryDay` must be ≥ `reminderFinalDay`
- `reminderFinalDay` must be ≥ `reminder2Day`
- `reminder2Day` must be ≥ `reminder1Day`
- `otpMaxAttempts` must be ≥ 1 and ≤ 10
- `staleHours` must be ≥ 1

---

## 6. Auth & RBAC Design

### 6.1 Token Strategy

| Token | TTL | Storage |
|-------|-----|---------|
| Access JWT | 15 minutes | In-memory (client) |
| Refresh JWT | 7 days | HttpOnly Secure SameSite=Strict cookie |

```typescript
// payload shape
interface JwtPayload {
  sub: string;     // user id
  role: RoleKey;
  iat: number;
  exp: number;
  jti: string;     // JWT ID for revocation
}
```

Refresh tokens:
- Stored hashed (SHA-256) in `refresh_tokens` table
- Rotation on every use (old token revoked, new token issued)
- Detect token reuse → revoke **all** tokens for that user (breach signal)

### 6.2 Role Hierarchy

```
admin
  ├── All researcher permissions
  ├── All reviewer permissions
  ├── All analyst permissions
  ├── /admin/* routes
  └── User management, config, templates

researcher
  ├── GET /cases, GET /cases/:id
  └── PATCH /cases/:id/researcher-review

reviewer
  └── GET /cases, GET /cases/:id (read-only)

analyst
  ├── GET /cases, GET /cases/:id
  ├── POST /cases
  └── PATCH /cases/:id/resend-link
```

### 6.3 Middleware Implementation

```typescript
// middleware/authenticate.ts
export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) throw new HttpError(401, "UNAUTHORIZED");
  const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
  req.user = { id: payload.sub, role: payload.role };
  next();
};

// middleware/authorize.ts
export const authorize = (...roles: RoleKey[]) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role))
      throw new HttpError(403, "FORBIDDEN");
    next();
  };
```

```typescript
// Usage in router
router.patch(
  "/:id/researcher-review",
  authenticate,
  authorize("researcher", "admin"),
  validate(researcherReviewSchema),
  casesController.researcherReview
);
```

---

## 7. Security — OWASP Top 10 Mitigations

### A01 — Broken Access Control

| Mitigation | Implementation |
|------------|----------------|
| Enforce role checks on every protected route | `authorize()` middleware on all non-public routes |
| Analyst cannot access `/admin/*` | Route-level guard |
| Users can only read own notifications | `WHERE user_id = req.user.id` in repository |
| Soft-delete only, no data erasure via API | `status = Inactive`, no `DELETE` SQL |
| IDOR prevention | All IDs are UUIDs; ownership validated in service layer |

```typescript
// cases.service.ts — check analyst ownership for mutations
async resendLink(caseId: string, requesterId: string, requesterRole: RoleKey) {
  const c = await casesRepository.findById(caseId);
  if (!c) throw new HttpError(404, "CASE_NOT_FOUND");
  if (requesterRole !== "admin" && c.analystId !== requesterId)
    throw new HttpError(403, "FORBIDDEN");
  // ...
}
```

---

### A02 — Cryptographic Failures

| Mitigation | Implementation |
|------------|----------------|
| Passwords hashed with Argon2id | `argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 })` |
| Link tokens never stored in plaintext | SHA-256 hash stored; raw token only in email URL |
| OTP stored hashed | SHA-256 of OTP stored with TTL |
| Refresh tokens hashed in DB | SHA-256 before INSERT |
| HTTPS enforced | `helmet` HSTS header; redirect HTTP→HTTPS at load balancer |
| Sensitive fields excluded from API responses | `passwordHash` never in any response DTO |
| DB credentials via env only | Never in code; `env.ts` Zod-validated at startup |

---

### A03 — Injection

| Mitigation | Implementation |
|------------|----------------|
| All DB queries via Drizzle ORM parameterised | Zero raw string interpolation in SQL |
| Zod validates all inputs before service layer | `validate()` middleware rejects invalid shapes |
| No `eval()`, no dynamic code execution | ESLint rule `no-eval` enforced |
| JSONB fields validated before insert | Zod schemas for `options`, `validation`, `condition`, `payload` |
| CSV export sanitised | Strip leading `=`, `+`, `-`, `@` from all cell values (CSV injection) |

---

### A04 — Insecure Design

| Mitigation | Implementation |
|------------|----------------|
| Workflow state machine enforced server-side | Illegal transitions rejected with `INVALID_TRANSITION` error |
| Questionnaire JWT is separate short-lived secret | `env.questionnaireJwtSecret` ≠ `env.jwtSecret`; scope limited to `/questionnaire/*` |
| OTP max attempts enforced | Lockout after 3 failures; exponential back-off for re-requests |
| Email typo detection before link dispatch | Regex check in `createCase` service |
| Reminder cap at 3 per case | `remindersSent >= 3` guard in cron job |

---

### A05 — Security Misconfiguration

```typescript
// app.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      objectSrc:   ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts:            { maxAge: 31536000, includeSubDomains: true },
  frameguard:      { action: "deny" },
  noSniff:         true,
  xssFilter:       true,
  referrerPolicy:  { policy: "no-referrer" },
}));

app.use(cors({
  origin:      env.allowedOrigins,   // explicit allowlist
  credentials: true,
  methods:     ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
}));

app.disable("x-powered-by");
```

- No default credentials; app refuses to start if `JWT_SECRET` or `DATABASE_URL` is missing
- `drizzle.config.ts` never imports from `.env` directly — uses `env.ts` Zod schema
- All dev-only routes (`/debug/*`) removed before production build; checked by CI lint rule
- `NODE_ENV=production` disables detailed error stack traces in responses

---

### A06 — Vulnerable and Outdated Components

- `npm audit` runs in CI on every PR; PRs with critical/high CVEs blocked
- `dependabot` enabled for weekly automated PRs
- Pinned major versions in `package.json`; range `^` allowed for patches only
- Minimal dependency surface: no lodash, no moment.js, no leftover unused packages

---

### A07 — Identification and Authentication Failures

| Mitigation | Implementation |
|------------|----------------|
| Argon2id with high work factor | See A02 |
| Refresh token rotation + reuse detection | §6.1 |
| Account lockout after failed logins | 5 failures in 15min → 15min lockout (stored in Redis / PG) |
| Brute-force rate limiting on `/auth/*` | 10 req/15min per IP |
| Password policy enforced on creation/change | Min 12 chars, uppercase, number, symbol |
| Session invalidated on password change | All refresh tokens for user revoked on password change |
| JWT `jti` claims for individual token revocation | `jti` stored in `refresh_tokens.id` |

---

### A08 — Software and Data Integrity Failures

- All npm scripts run inside Docker with checksum verification
- No `exec()` of arbitrary scripts from user input
- Webhook payloads (future) signed with HMAC and verified before processing
- DB migrations run only with explicit `npm run migrate` command (no auto-migrate in production start)
- Schema changes reviewed via PR — no schema drift allowed

---

### A09 — Security Logging and Monitoring Failures

```typescript
// middleware/audit-logger.ts
// Auto-appends audit events for all mutating operations
const AUDITABLE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

export const auditLogger = async (req, res, next) => {
  if (!AUDITABLE_METHODS.includes(req.method)) return next();
  res.on("finish", async () => {
    await auditRepository.insertRaw({
      eventType: "API Call",
      description: `${req.method} ${req.path}`,
      triggeredByUserId: req.user?.id,
      status: res.statusCode < 400 ? "Success" : "Failed",
      payload: { statusCode: res.statusCode, requestId: req.id },
    });
  });
  next();
};
```

- Structured JSON logs via `pino` (not `console.log`) — shipped to log aggregator
- All auth events (login success/fail, logout, token refresh) logged with IP + user agent
- Audit log `created_at` is immutable — no UPDATE/DELETE on `audit_events` table (enforced by Postgres role)
- Alerts configured for: multiple failed logins, admin escalations, API push failures

---

### A10 — Server-Side Request Forgery (SSRF)

- External HTTP calls (CedarRose Data Exchange API push) go through a dedicated `httpClient` wrapper
- Allowlist of permitted hostnames validated before any outbound request
- No user-supplied URLs passed to server-side `fetch` without validation
- Internal service metadata endpoints (`169.254.169.254`, `localhost`, `10.x.x.x`) blocked by allowlist

```typescript
// shared/utils/http-client.ts
const ALLOWED_HOSTS = new Set(env.allowedExternalHosts);

export async function safeExternalFetch(url: string, opts: RequestInit) {
  const { hostname } = new URL(url);
  if (!ALLOWED_HOSTS.has(hostname))
    throw new HttpError(400, "SSRF_BLOCKED");
  return fetch(url, opts);
}
```

---

## 8. Design Patterns

### 8.1 Repository Pattern

Each module has a `*.repository.ts` that owns all Drizzle queries. Services never import `db` directly.

```typescript
// cases.repository.ts
export class CasesRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<CaseRecord | null> {
    const [row] = await this.db
      .select()
      .from(cases)
      .where(eq(cases.id, id))
      .limit(1);
    return row ?? null;
  }

  async findAll(filters: CaseFilters): Promise<{ data: CaseRecord[]; total: number }> { ... }
  async create(dto: CreateCaseDto): Promise<CaseRecord> { ... }
  async updateStatus(id: string, status: CaseStatus): Promise<void> { ... }
  async findExpiredActive(): Promise<CaseRecord[]> { ... }
  async findStaleInProgress(threshold: Date): Promise<CaseRecord[]> { ... }
  async incrementRemindersSent(id: string): Promise<void> { ... }
}
```

---

### 8.2 Service Layer (Business Logic)

Services receive repositories via constructor injection (DI-lite pattern).

```typescript
// cases.service.ts
export class CasesService {
  constructor(
    private readonly casesRepo: CasesRepository,
    private readonly auditService: AuditService,
    private readonly notifService: NotificationsService,
    private readonly companiesRepo: CompaniesRepository,
    private readonly configRepo: ConfigRepository,
  ) {}

  async createCase(dto: CreateCaseDto, requesterId: string): Promise<CaseRecord> {
    // 1. Validate company UID
    // 2. Email typo check
    // 3. Determine initial status
    // 4. Assign template
    // 5. Generate secure link
    // 6. Persist
    // 7. Audit + notify
  }
}
```

---

### 8.3 Controller Pattern (thin)

Controllers only: parse validated request, call service, return response.

```typescript
// cases.controller.ts
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  createCase = async (req: Request, res: Response) => {
    const result = await this.casesService.createCase(req.body, req.user.id);
    res.status(201).json(success(result, "Case created"));
  };
}
```

---

### 8.4 Dependency Injection (manual container)

```typescript
// app.ts — wire up dependencies
const db             = createDrizzleClient(env.databaseUrl);
const casesRepo      = new CasesRepository(db);
const auditRepo      = new AuditRepository(db);
const notifRepo      = new NotificationsRepository(db);
const configRepo     = new ConfigRepository(db);
const companiesRepo  = new CompaniesRepository(db);

const auditService   = new AuditService(auditRepo);
const notifService   = new NotificationsService(notifRepo);
const casesService   = new CasesService(casesRepo, auditService, notifService, companiesRepo, configRepo);
const casesCtrl      = new CasesController(casesService);

app.use("/api/v1/cases", casesRouter(casesCtrl));
```

---

### 8.5 Standardised Response Format

All responses use the same envelope:

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "message": "Case created",
  "meta": { "page": 1, "limit": 20, "total": 84 }   // pagination when applicable
}

// Error
{
  "success": false,
  "error": {
    "code": "CASE_NOT_FOUND",
    "message": "Case c-999 does not exist",
    "requestId": "req_abc123"
  }
}
```

---

### 8.6 Result / Error Type

Business errors use typed `AppError` — never raw JS `Error`:

```typescript
// shared/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
```

Machine-readable error codes defined in `error-codes.ts`:

```
AUTH_INVALID_CREDENTIALS
AUTH_TOKEN_EXPIRED
AUTH_REFRESH_REUSE
CASE_NOT_FOUND
CASE_INVALID_TRANSITION
CASE_LINK_EXPIRED
EMAIL_TYPO_DETECTED
COMPANY_NOT_FOUND
OTP_MAX_ATTEMPTS
OTP_EXPIRED
TEMPLATE_NOT_ACTIVE
CONFIG_CONSTRAINT_VIOLATED
SSRF_BLOCKED
```

---

## 9. Configuration & Environment

### `src/config/env.ts` (Zod-validated)

```typescript
const envSchema = z.object({
  NODE_ENV:               z.enum(["development","test","production"]),
  PORT:                   z.coerce.number().default(3000),
  DATABASE_URL:           z.string().url(),
  JWT_SECRET:             z.string().min(64),
  JWT_ACCESS_EXPIRY:      z.string().default("15m"),
  JWT_REFRESH_EXPIRY:     z.string().default("7d"),
  QUESTIONNAIRE_JWT_SECRET: z.string().min(64),
  ALLOWED_ORIGINS:        z.string().transform(v => v.split(",")),
  ALLOWED_EXTERNAL_HOSTS: z.string().transform(v => v.split(",")),
  SMTP_HOST:              z.string(),
  SMTP_PORT:              z.coerce.number().default(587),
  SMTP_USER:              z.string(),
  SMTP_PASS:              z.string(),
  REDIS_URL:              z.string().url().optional(),
  LOG_LEVEL:              z.enum(["trace","debug","info","warn","error"]).default("info"),
});

export const env = envSchema.parse(process.env);
// App crashes at startup if any required var is missing/invalid
```

---

## 10. Error Handling Strategy

### Global error handler (`middleware/error-handler.ts`)

```typescript
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(failure(err.code, err.message, req.id));
  }
  if (err instanceof ZodError) {
    return res.status(422).json(failure("VALIDATION_ERROR", err.flatten(), req.id));
  }
  // Unexpected — log full stack, return generic 500
  logger.error({ err, requestId: req.id }, "Unhandled error");
  return res.status(500).json(failure("INTERNAL_SERVER_ERROR", "Something went wrong", req.id));
};
```

- `ZodError` → 422 Unprocessable Entity (never leaks stack)
- `AppError` → appropriate 4xx
- Unexpected errors → 500 with opaque message (stack only in logs)
- Unhandled rejections and exceptions caught at process level → graceful shutdown + alert

---

## 11. Drizzle ORM Setup

### `drizzle.config.ts`

```typescript
import type { Config } from "drizzle-kit";
import { env } from "./src/config/env";

export default {
  schema:    "./src/db/schema/index.ts",
  out:       "./src/db/migrations",
  dialect:   "postgresql",
  dbCredentials: { url: env.DATABASE_URL },
  verbose:   true,
  strict:    true,
} satisfies Config;
```

### `config/database.ts`

```typescript
import { drizzle }    from "drizzle-orm/node-postgres";
import { Pool }       from "pg";
import * as schema    from "../db/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export function createDrizzleClient(url: string) {
  if (_db) return _db;
  const pool = new Pool({ connectionString: url, max: 20 });
  _db = drizzle(pool, { schema, logger: env.NODE_ENV !== "production" });
  return _db;
}
```

### Enum declarations (Drizzle)

```typescript
// db/schema/enums.ts
export const roleEnum          = pgEnum("role", ["researcher","reviewer","analyst","admin"]);
export const caseStatusEnum    = pgEnum("case_status", [ "SENT","OPENED","IN PROGRESS","COMPLETED","COMPLETED — MISSING DATA","PENDING CONTACT","PENDING LINKAGE & CONTACT","EXPIRED","NOT SENT"]);
export const researcherStatusEnum = pgEnum("researcher_status", ["Not Applicable","Awaiting Review","Approved","Flagged","Rejected"]);
export const eventTypeEnum     = pgEnum("event_type", ["API Call","Link Event","Authentication","Form Activity","Researcher Action","API Push"]);
export const fieldTypeEnum     = pgEnum("field_type", ["text","longtext","number","date","dropdown","radio","multiselect","file","table","esign","toggle","url","support_doc"]);
```

---

## 12. Middleware Stack

Applied in order in `app.ts`:

```typescript
app.use(requestId());            // 1. Attach req.id (UUID)
app.use(morgan("combined", ...));// 2. Access logs (pino transport)
app.use(helmet(...));            // 3. Security headers
app.use(cors(...));              // 4. CORS
app.use(express.json({ limit: "500kb" }));      // 5. Body parser (size limit)
app.use(express.urlencoded({ extended: false }));
app.use(generalRateLimit);       // 6. Global rate limit (100/15min per IP)
app.use(compression());          // 7. Gzip

// Routes
app.use("/api/v1/auth",         authRouter);
app.use("/api/v1/cases",        authenticate, casesRouter);
app.use("/api/v1/companies",    authenticate, companiesRouter);
app.use("/api/v1/audit-log",    authenticate, auditRouter);
app.use("/api/v1/notifications",authenticate, notificationsRouter);
app.use("/api/v1/admin",        authenticate, authorize("admin"), adminRouter);
app.use("/api/v1/questionnaire",questionnaireRouter);   // own JWT middleware internally
app.use("/api/v1/countries",    authenticate, countriesRouter);
app.get("/health", healthRouter);

app.use(errorHandler);           // Must be last
```

### Rate limits (`middleware/rate-limit.ts`)

| Route | Window | Max |
|-------|--------|-----|
| `/auth/login` | 15 min | 10 req per IP |
| `/auth/refresh` | 15 min | 20 req per IP |
| `/questionnaire/authenticate` | 15 min | 5 per IP |
| `/questionnaire/otp-verify` | 15 min | 5 per IP |
| All other `/api/v1/*` | 15 min | 100 per IP |

---

## 13. Testing Strategy

### Unit tests (Vitest)

- All service methods tested with mocked repositories
- Status machine transition matrix: all legal and illegal transitions
- `generateSecureLink`, `determineInitialStatus`, `determineStatus` (submission)
- Reminder schedule calculation
- Email typo detection regex
- CSV injection sanitisation

### Integration tests (Supertest + test DB)

- Full request lifecycle for every endpoint
- Auth flows: login → access token → refresh → rotation → reuse detection
- Case creation end-to-end: status determination → link generation → audit event
- OTP flow: request → verify → max attempts → lockout

### E2E (optional, Playwright)

- Happy path: create case → resend link → researcher review → API push
- Admin: create template → activate → assign to case

### CI pipeline

```yaml
# GitHub Actions
- npm audit --audit-level=high
- npm run lint
- npm run type-check
- npm run test:unit
- npm run test:integration
- docker build (smoke)
```

---

## 14. Deployment Checklist

### Environment

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` ≥ 64 random bytes
- [ ] `QUESTIONNAIRE_JWT_SECRET` ≥ 64 random bytes (different from JWT_SECRET)
- [ ] `DATABASE_URL` pointing to managed Postgres (connection pooler like PgBouncer)
- [ ] `ALLOWED_ORIGINS` set to exact frontend domain(s)
- [ ] `ALLOWED_EXTERNAL_HOSTS` set to CedarRose Data Exchange hostname only
- [ ] `SMTP_*` credentials set

### Database

- [ ] Run migrations: `npm run migrate`
- [ ] Run seeds (if fresh): `npm run seed`
- [ ] Postgres role with limited permissions (no `SUPERUSER`; only DML on app tables)
- [ ] Audit table: `REVOKE UPDATE, DELETE ON audit_events FROM app_role`
- [ ] Backups configured (daily, 30-day retention minimum)
- [ ] SSL connections enforced (`?sslmode=require`)

### Infrastructure

- [ ] HTTPS enforced, HTTP → HTTPS redirect
- [ ] HSTS header present
- [ ] Rate limiting at load balancer level (additional layer)
- [ ] Health endpoint `/health` reachable by load balancer (no auth)
- [ ] Structured logs shipped to aggregator (Datadog / Loki)
- [ ] Alerts configured for error rate spikes, failed login bursts
- [ ] Cron jobs scheduled: expire-links (hourly), send-reminders (every 6h), stale-cases (every 4h)
- [ ] `npm audit` passes with zero high/critical CVEs

### Code

- [ ] `app.disable("x-powered-by")`
- [ ] No `.env` file committed (`.gitignore` verified)
- [ ] No `console.log` in production code (ESLint `no-console` rule)
- [ ] All unhandled promise rejections caught at process level
- [ ] `process.on("uncaughtException")` graceful shutdown implemented
- [ ] DB connection pool closed on `SIGTERM`

---

## Appendix: Package List

```json
{
  "dependencies": {
    "express": "^4.19",
    "drizzle-orm": "^0.31",
    "pg": "^8.12",
    "zod": "^3.23",
    "argon2": "^0.31",
    "jsonwebtoken": "^9.0",
    "helmet": "^7.1",
    "cors": "^2.8",
    "express-rate-limit": "^7.3",
    "compression": "^1.7",
    "pino": "^9.2",
    "pino-http": "^10.2",
    "uuid": "^10.0",
    "date-fns": "^3.6",
    "nodemailer": "^6.9",
    "node-cron": "^3.0",
    "dotenv": "^16.4"
  },
  "devDependencies": {
    "typescript": "^5.5",
    "drizzle-kit": "^0.22",
    "tsx": "^4.15",
    "vitest": "^2.0",
    "supertest": "^7.0",
    "@types/express": "^4.17",
    "@types/pg": "^8.11",
    "@types/jsonwebtoken": "^9.0",
    "@types/nodemailer": "^6.4",
    "@types/node": "^20",
    "eslint": "^9",
    "@typescript-eslint/eslint-plugin": "^7"
  }
}
```

---

---

## 15. Form Builder — Deep Specification

The Form Builder is a full visual editor for questionnaire templates. Every admin user can create, edit, reorder, and activate templates. Each template is scoped to a **recipient type** and consists of nested **sections → questions**. This section covers every gap that Section 4.6 did not address.

---

### 15.1 Schema Corrections & Missing Columns

The `questions` table in Section 3.11 must be extended with fields that the frontend actually stores:

```sql
ALTER TABLE questions ADD COLUMN prefill           BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE questions ADD COLUMN system_controlled  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE questions ADD COLUMN repeater           BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE questions ADD COLUMN attach_upload      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE questions ADD COLUMN same_as_toggle_label VARCHAR(200);
ALTER TABLE questions ADD COLUMN note              TEXT;
```

The `sections` table must include the `banner` field used for table-type section instructions:

```sql
ALTER TABLE sections ADD COLUMN banner TEXT;
```

The `templates` table must track the last editor (not just creator):

```sql
ALTER TABLE templates ADD COLUMN updated_by UUID REFERENCES users(id);
ALTER TABLE templates ADD COLUMN last_edited_at TIMESTAMPTZ NOT NULL DEFAULT now();
```

**Complete corrected Drizzle schema for `questions`:**

```typescript
export const questions = pgTable("questions", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  sectionId:          uuid("section_id").notNull().references(() => sections.id, { onDelete: "cascade" }),
  label:              text("label").notNull(),
  fieldType:          fieldTypeEnum("field_type").notNull(),
  mandatory:          boolean("mandatory").notNull().default(false),
  prefill:            boolean("prefill").notNull().default(false),
  systemControlled:   boolean("system_controlled").notNull().default(false),
  repeater:           boolean("repeater").notNull().default(false),
  attachUpload:       boolean("attach_upload").notNull().default(false),
  sameAsToggleLabel:  varchar("same_as_toggle_label", { length: 200 }),
  note:               text("note"),
  helpText:           text("help_text"),
  placeholder:        text("placeholder"),
  options:            jsonb("options").$type<string[]>(),
  tableColumns:       jsonb("table_columns").$type<TableColumnDef[]>(),
  validation:         jsonb("validation").$type<ValidationDef>(),
  condition:          jsonb("condition").$type<ConditionDef>(),
  orderIndex:         integer("order_index").notNull().default(0),
  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:          timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

**TypeScript types for JSONB columns (`templates/templates.types.ts`):**

```typescript
export interface TableColumnDef {
  name:     string;
  type:     FieldType;
  required: boolean;
}

export interface ValidationDef {
  min?:         number;
  max?:         number;
  maxLength?:   number;
  allowPast?:   boolean;
  allowFuture?: boolean;
}

export interface ConditionDef {
  enabled:   boolean;
  fieldId?:  string;   // references another question's id within same template
  operator?: "equals" | "not_empty" | "contains";
  value?:    string;
}
```

---

### 15.2 Expanded API Endpoints

The original plan (Section 4.6) listed only 6 template endpoints covering the full-template PUT. The frontend also performs **granular section and question mutations**. Both patterns are supported:

- **Full-save route** (`PUT /admin/templates/:id`) — replaces entire structure in one call (matches the "Save template" button in the UI)
- **Granular routes** — for individual section/question CRUD operations called individually

#### Template Endpoints (expanded)

| Method | Path | Description | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET`    | `/admin/templates` | List all templates with summary stats | JWT | `admin` |
| `GET`    | `/admin/templates/:id` | Full template with sections + questions | JWT | `admin` |
| `POST`   | `/admin/templates` | Create new empty template | JWT | `admin` |
| `PUT`    | `/admin/templates/:id` | Full replace (name, sections, questions) | JWT | `admin` |
| `PATCH`  | `/admin/templates/:id` | Partial update (name only / status only) | JWT | `admin` |
| `PATCH`  | `/admin/templates/:id/activate` | Set status → Active (with guard) | JWT | `admin` |
| `PATCH`  | `/admin/templates/:id/draft` | Set status → Draft | JWT | `admin` |
| `DELETE` | `/admin/templates/:id` | Delete (Draft only) | JWT | `admin` |
| `POST`   | `/admin/templates/:id/duplicate` | Clone template as new Draft | JWT | `admin` |

#### Section Endpoints (sub-resource)

| Method | Path | Description | Auth | Roles |
|--------|------|-------------|------|-------|
| `POST`   | `/admin/templates/:id/sections` | Add new section | JWT | `admin` |
| `PATCH`  | `/admin/templates/:id/sections/:sectionId` | Update title / description / banner | JWT | `admin` |
| `DELETE` | `/admin/templates/:id/sections/:sectionId` | Remove section + its questions | JWT | `admin` |
| `PATCH`  | `/admin/templates/:id/sections/reorder` | Reorder all sections (array of IDs) | JWT | `admin` |

#### Question Endpoints (sub-resource)

| Method | Path | Description | Auth | Roles |
|--------|------|-------------|------|-------|
| `POST`   | `/admin/templates/:id/sections/:sectionId/questions` | Add new question | JWT | `admin` |
| `PATCH`  | `/admin/templates/:id/sections/:sectionId/questions/:questionId` | Update any question field | JWT | `admin` |
| `DELETE` | `/admin/templates/:id/sections/:sectionId/questions/:questionId` | Remove question | JWT | `admin` |
| `PATCH`  | `/admin/templates/:id/sections/:sectionId/questions/reorder` | Reorder questions in section | JWT | `admin` |

---

### 15.3 Request / Response Shapes

#### `POST /admin/templates` — Create template

```typescript
// Zod schema (templates.schema.ts)
export const createTemplateSchema = z.object({
  name:          z.string().min(1, "Template name is required").max(255),
  recipientType: z.enum(["Supplier", "Customer", "Partner", "Business Analytics Report"]),
});

// Response: 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Enhanced KYC — Supplier",
    "recipientType": "Supplier",
    "status": "Draft",
    "sections": [],
    "totalQuestions": 0,
    "requiredCount": 0,
    "optionalCount": 0,
    "lastEditedAt": "2026-06-24T10:00:00Z",
    "lastEditedBy": { "id": "...", "name": "David Chen" }
  }
}
```

#### `PUT /admin/templates/:id` — Full save

```typescript
export const upsertTemplateSchema = z.object({
  name:          z.string().min(1).max(255),
  recipientType: z.enum(["Supplier","Customer","Partner","Business Analytics Report"]),
  status:        z.enum(["Active","Draft"]),
  sections:      z.array(sectionSchema),
});

const sectionSchema = z.object({
  id:          z.string().optional(),        // omit for new sections
  title:       z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  banner:      z.string().max(1000).optional(),
  orderIndex:  z.number().int().min(0),
  questions:   z.array(questionSchema),
});

const questionSchema = z.object({
  id:                 z.string().optional(),  // omit for new questions
  label:              z.string().min(1),
  fieldType:          fieldTypeEnum,
  mandatory:          z.boolean().default(false),
  prefill:            z.boolean().default(false),
  systemControlled:   z.boolean().default(false),
  repeater:           z.boolean().default(false),
  attachUpload:       z.boolean().default(false),
  sameAsToggleLabel:  z.string().max(200).optional(),
  note:               z.string().optional(),
  helpText:           z.string().max(1000).optional(),
  options:            z.array(z.string()).optional(),
  tableColumns:       z.array(tableColumnSchema).optional(),
  validation:         validationSchema.optional(),
  condition:          conditionSchema.optional(),
  orderIndex:         z.number().int().min(0),
});
```

The `PUT` handler diffs incoming sections/questions against stored ones:
- Sections/questions **without** an `id` → INSERT
- Sections/questions **with** an `id` that exists in DB → UPDATE
- Sections/questions in DB but **absent** from payload → DELETE (if safe; see §15.5 guard)

#### `POST /admin/templates/:id/sections` — Add section

```typescript
export const addSectionSchema = z.object({
  title:       z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  banner:      z.string().max(1000).optional(),
  afterIndex:  z.number().int().min(-1).default(-1),  // -1 = append at end
});
```

#### `PATCH /admin/templates/:id/sections/reorder` — Reorder sections

```typescript
export const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
  // All section IDs for this template must be present
});
```

Backend sets `order_index = position in array` for each ID. Returns 400 if IDs don't match exactly.

#### `POST /admin/templates/:id/sections/:sectionId/questions` — Add question

```typescript
export const addQuestionSchema = z.object({
  label:     z.string().min(1),
  fieldType: fieldTypeEnum,
  mandatory: z.boolean().default(false),
  prefill:   z.boolean().default(false),
  // all other question fields optional, defaulting to false/null
});
```

---

### 15.4 Template Service — Business Logic

```typescript
// templates.service.ts

export class TemplatesService {

  // Create — always Draft, empty sections
  async createTemplate(dto: CreateTemplateDto, creatorId: string): Promise<Template> {
    // No Active template for same recipientType check is intentionally NOT enforced
    // (multiple Active templates per type are allowed — case assignment picks the right one)
    return this.templatesRepo.create({ ...dto, status: "Draft", createdBy: creatorId });
  }

  // Full upsert — used by "Save template" button
  async upsertTemplate(id: string, dto: UpsertTemplateDto, editorId: string): Promise<Template> {
    const existing = await this.templatesRepo.findById(id);
    if (!existing) throw new HttpError(404, "TEMPLATE_NOT_FOUND");

    // Guard: cannot change recipientType if Active and linked to cases
    if (existing.status === "Active" && dto.recipientType !== existing.recipientType) {
      const linked = await this.casesRepo.countByTemplateId(id);
      if (linked > 0) throw new HttpError(409, "TEMPLATE_RECIPIENT_TYPE_LOCKED");
    }

    // Guard: systemControlled questions cannot be removed via PUT
    await this.enforceSystemControlledQuestions(existing, dto.sections);

    await this.templatesRepo.upsertFull(id, dto, editorId);
    return this.templatesRepo.findById(id)!;
  }

  // Activate — with completeness guard
  async activateTemplate(id: string, editorId: string): Promise<void> {
    const tpl = await this.templatesRepo.findWithSections(id);
    if (!tpl) throw new HttpError(404, "TEMPLATE_NOT_FOUND");

    if (tpl.sections.length === 0)
      throw new HttpError(422, "TEMPLATE_ACTIVATION_EMPTY_SECTIONS");

    const totalQuestions = tpl.sections.flatMap(s => s.questions).length;
    if (totalQuestions === 0)
      throw new HttpError(422, "TEMPLATE_ACTIVATION_NO_QUESTIONS");

    const mandatoryCount = tpl.sections.flatMap(s => s.questions).filter(q => q.mandatory).length;
    if (mandatoryCount === 0)
      throw new HttpError(422, "TEMPLATE_ACTIVATION_NO_MANDATORY");

    await this.templatesRepo.setStatus(id, "Active", editorId);
    await this.auditService.log({ eventType: "API Call", description: `Template ${tpl.name} activated`, triggeredByUserId: editorId });
  }

  // Delete — Draft only
  async deleteTemplate(id: string): Promise<void> {
    const tpl = await this.templatesRepo.findById(id);
    if (!tpl) throw new HttpError(404, "TEMPLATE_NOT_FOUND");
    if (tpl.status === "Active")
      throw new HttpError(409, "TEMPLATE_DELETE_ACTIVE");
    await this.templatesRepo.delete(id);
  }

  // Duplicate — clone as new Draft
  async duplicateTemplate(id: string, creatorId: string): Promise<Template> {
    const source = await this.templatesRepo.findWithSections(id);
    if (!source) throw new HttpError(404, "TEMPLATE_NOT_FOUND");
    return this.templatesRepo.clone(source, `${source.name} (Copy)`, creatorId);
  }

  private async enforceSystemControlledQuestions(
    existing: TemplateWithSections,
    incomingSections: SectionDto[]
  ): Promise<void> {
    const existingSystemQs = existing.sections
      .flatMap(s => s.questions)
      .filter(q => q.systemControlled)
      .map(q => q.id);

    const incomingQIds = new Set(
      incomingSections.flatMap(s => s.questions.map(q => q.id)).filter(Boolean)
    );

    for (const sysId of existingSystemQs) {
      if (!incomingQIds.has(sysId))
        throw new HttpError(422, "SYSTEM_QUESTION_CANNOT_BE_DELETED");
    }
  }
}
```

---

### 15.5 Business Rules (Form Builder)

| Rule | Enforcement point | Error code |
|------|-------------------|------------|
| Template name is required | Zod schema, `createTemplateSchema` | `VALIDATION_ERROR` |
| New template always starts as `Draft` | Service layer — `status` field ignored on create | – |
| Cannot activate template with zero sections | `activateTemplate()` guard | `TEMPLATE_ACTIVATION_EMPTY_SECTIONS` |
| Cannot activate template with zero questions total | `activateTemplate()` guard | `TEMPLATE_ACTIVATION_NO_QUESTIONS` |
| Cannot activate with zero mandatory questions (no Tier 1) | `activateTemplate()` guard | `TEMPLATE_ACTIVATION_NO_MANDATORY` |
| Cannot delete an Active template | `deleteTemplate()` guard | `TEMPLATE_DELETE_ACTIVE` |
| Cannot change `recipientType` of an Active template linked to cases | `upsertTemplate()` guard | `TEMPLATE_RECIPIENT_TYPE_LOCKED` |
| `systemControlled` questions cannot be edited or deleted | `enforceSystemControlledQuestions()` + `PATCH` guard | `SYSTEM_QUESTION_CANNOT_BE_DELETED` |
| `systemControlled` question `label` and `fieldType` are immutable | `PATCH` handler ignores those fields when `systemControlled=true` | – |
| Section `order_index` must be contiguous (0, 1, 2…) | `reorder` endpoint normalises automatically | – |
| Question `order_index` must be contiguous within section | `reorder` endpoint normalises automatically | – |
| `table` field type requires at least one column | Zod refinement on `questionSchema` | `VALIDATION_ERROR` |
| `dropdown` / `radio` / `multiselect` require at least one option | Zod refinement | `VALIDATION_ERROR` |
| `condition.fieldId` must reference a question in the same template | Service-layer cross-validation | `CONDITION_FIELD_NOT_FOUND` |
| Deleting a section deletes all its questions (cascade) | `ON DELETE CASCADE` in DB schema | – |
| `last_edited_at` and `updated_by` auto-set on any template/section/question mutation | Repository layer | – |
| Template `version` incremented on each full PUT | Repository `upsertFull()` | – |

---

### 15.6 Tier Counts (Dashboard / Case summary)

The "Save template" response includes computed stats used by the Form Builder footer and by cases when showing completion:

```typescript
// templates.repository.ts
async computeStats(templateId: string): Promise<TemplateStats> {
  const rows = await this.db
    .select({ mandatory: questions.mandatory })
    .from(questions)
    .innerJoin(sections, eq(sections.id, questions.sectionId))
    .where(eq(sections.templateId, templateId));

  return {
    totalQuestions: rows.length,
    requiredCount:  rows.filter(r => r.mandatory).length,   // Tier 1
    optionalCount:  rows.filter(r => !r.mandatory).length,  // Tier 2
  };
}
```

These numbers map exactly to the footer in `BuilderCanvas`:
> **28** questions total · **14** required (Tier 1) · **14** optional (Tier 2)

---

### 15.7 Prefill Concept

Questions with `prefill: true` are auto-populated with company data from CRiS when the questionnaire link is opened by the recipient.

**Prefill mapping** (stored in `platform_config` or hardcoded as a constant in `config/constants.ts`):

```typescript
// config/constants.ts
export const PREFILL_FIELD_MAP: Record<string, keyof CompanyData> = {
  "Full Legal Name":                  "companyName",
  "Commercial Registration Number":   "registrationNumber",
  "Registered Date":                  "incorporationDate",
  "Legal Form":                       "legalStructure",
  "Email":                            "recipientEmails",
  "Telephone Number(s)":              "phone",       // if stored
};
```

On `GET /questionnaire/:token/form`, the API:
1. Fetches the case → `uid` → company data
2. For each question where `prefill = true`, maps `question.label` → company field value
3. Returns questions with an optional `prefillValue` field in the response

```typescript
// questionnaire.service.ts
function applyPrefill(questions: Question[], company: CompanyData): QuestionWithPrefill[] {
  return questions.map(q => ({
    ...q,
    prefillValue: q.prefill ? PREFILL_FIELD_MAP[q.label]
      ? company[PREFILL_FIELD_MAP[q.label]]
      : undefined
    : undefined,
  }));
}
```

---

### 15.8 Template Versioning

Every full `PUT /admin/templates/:id` increments `version` in the `templates` table. Cases store a snapshot of the template version at dispatch time.

Add `template_version` to `cases`:

```sql
ALTER TABLE cases ADD COLUMN template_version INT NOT NULL DEFAULT 1;
```

When creating a case:
```typescript
const tpl = await templatesRepo.findById(dto.templateId);
await casesRepo.create({ ...caseData, templateId: tpl.id, templateVersion: tpl.version });
```

This ensures that if a template is edited after a case is dispatched, the recipient still sees the original version of the questions they were sent. Historical responses remain consistent.

Implement `template_snapshots` table for full historical integrity (optional, for Phase 2):

```sql
CREATE TABLE template_snapshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID NOT NULL REFERENCES templates(id),
  version      INT NOT NULL,
  snapshot     JSONB NOT NULL,   -- full template JSON at this version
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, version)
);
```

---

### 15.9 `GET /admin/templates` Response Shape

Returns list view (no full sections/questions payload for performance):

```typescript
// Response
{
  "success": true,
  "data": [
    {
      "id": "tpl-1",
      "name": "Standard Due Diligence — Supplier",
      "recipientType": "Supplier",
      "status": "Active",
      "totalQuestions": 20,
      "requiredCount": 12,
      "optionalCount": 8,
      "sectionCount": 4,
      "version": 3,
      "lastEditedAt": "2026-05-02T09:00:00Z",
      "lastEditedBy": { "id": "...", "name": "David Chen" }
    }
  ]
}
```

`GET /admin/templates/:id` returns the full nested structure including all sections and questions — used when opening the Form Builder editor.

---

### 15.10 Module File Structure (templates module)

```
src/modules/templates/
├── templates.router.ts
│     POST   /                          → createTemplate
│     GET    /                          → listTemplates
│     GET    /:id                       → getTemplate
│     PUT    /:id                       → upsertTemplate
│     PATCH  /:id                       → patchTemplate (name/status)
│     PATCH  /:id/activate              → activateTemplate
│     PATCH  /:id/draft                 → draftTemplate
│     DELETE /:id                       → deleteTemplate
│     POST   /:id/duplicate             → duplicateTemplate
│
│     POST   /:id/sections              → addSection
│     PATCH  /:id/sections/:sid         → updateSection
│     DELETE /:id/sections/:sid         → removeSection
│     PATCH  /:id/sections/reorder      → reorderSections
│
│     POST   /:id/sections/:sid/questions         → addQuestion
│     PATCH  /:id/sections/:sid/questions/:qid    → updateQuestion
│     DELETE /:id/sections/:sid/questions/:qid    → removeQuestion
│     PATCH  /:id/sections/:sid/questions/reorder → reorderQuestions
│
├── templates.controller.ts      (16 handler methods)
├── templates.service.ts         (business logic + guards)
├── templates.repository.ts      (all Drizzle queries)
├── templates.schema.ts          (Zod: create, upsert, section, question, reorder)
└── templates.types.ts           (TS types: Template, Section, Question, TemplateStats, etc.)
```

---

*Section 15 added: Form Builder deep specification covering 9 missing schema columns, 17 new endpoints (section + question CRUD + reorder), activation guards, system-controlled question protection, prefill mapping, template versioning, and tier count computation.*

---

## 16. Existing Database Integration

> **Database:** `cedarrose_local` on `localhost:5432`  
> **User:** `localdev` / `admin123`  
> The OpsHub backend shares this database with an existing TypeORM-based application. All new tables are additive only — no existing table is dropped or structurally broken.

---

### 16.1 Connection Credentials

**`.env` (actual values):**

```env
# Database
PGHOST=localhost
PGUSER=localdev
PGPORT=5432
PGDATABASE=cedarrose_local
PGPASSWORD=admin123
DATABASE_URL=postgresql://localdev:admin123@localhost:5432/cedarrose_local

# JWT
JWT_SECRET=<generate: openssl rand -hex 64>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
QUESTIONNAIRE_JWT_SECRET=<generate: openssl rand -hex 64>

# App
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173
ALLOWED_EXTERNAL_HOSTS=data-exchange.cedarrose.com

# Mail
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=<mailtrap user>
SMTP_PASS=<mailtrap pass>

LOG_LEVEL=info
```

---

### 16.2 Existing Tables Inventory

Introspected from `cedarrose_local` public schema on 2026-06-24:

| Table | Purpose | Action |
|-------|---------|--------|
| `users` | Auth users (PascalCase columns) | **REUSE + extend with new columns** |
| `companies` | CRiS company registry | **REUSE + extend with new columns** |
| `refresh_tokens` | JWT refresh tokens | **REUSE as-is** |
| `password_reset_tokens` | Password reset flow | **REUSE as-is** |
| `user_invitations` | Invite token management | **REUSE as-is** |
| `migrations` | TypeORM migration tracker | **REUSE — write all new migrations here** |
| `reports` | Existing report module | No touch |
| `report_sessions` | Existing report sessions | No touch |
| `report_versions` | Existing report versioning | No touch |
| `report_version_scores` | Existing scoring | No touch |
| `ai_suggestions` | Existing AI suggestions | No touch |
| `categories` | Existing categories | No touch |
| `session_transitions` | Existing workflow | No touch |

---

### 16.3 Existing `users` Table (PascalCase — exact schema)

```
UserID          uuid  PK  DEFAULT gen_random_uuid()
Email           varchar(100)  UNIQUE NOT NULL
Password        varchar(100)  NOT NULL        ← bcrypt hash stored here
FirstName       varchar(50)   NOT NULL
LastName        varchar(50)   NOT NULL
Role            varchar(20)   NOT NULL        ← 'researcher'|'reviewer'|'analyst'|'admin'
Status          varchar(20)   NOT NULL  DEFAULT 'Active'
ProfilePicture  varchar(255)  NULL
CreatedAt       timestamp     NOT NULL  DEFAULT now()
UpdatedAt       timestamp     NOT NULL  DEFAULT now()
```

**Existing columns map exactly** to `CurrentUser` fields already used in the frontend. The following columns need to be **added** via migration:

```sql
-- Migration: AddOpsHubFieldsToUsers
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "Title"          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "Initials"       VARCHAR(5),
  ADD COLUMN IF NOT EXISTS "TotalReports"   INTEGER,
  ADD COLUMN IF NOT EXISTS "Score"          NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS "LastSubmission" TIMESTAMP;
```

---

### 16.4 Existing `companies` Table (PascalCase — exact schema)

```
CompanyID    uuid  PK  DEFAULT gen_random_uuid()
CompanyName  varchar(100)  NOT NULL
CRISNumber   varchar(50)   NOT NULL     ← this is the CRiS UID (e.g. "UID-44529")
CreatedAt    timestamp     NOT NULL  DEFAULT now()
UpdatedAt    timestamp     NOT NULL  DEFAULT now()
```

**Note:** `CRISNumber` is the frontend's `uid` field. Foreign keys from `cases` will reference `companies."CompanyID"`.

Additional columns needed:

```sql
-- Migration: AddOpsHubFieldsToCompanies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS "Country"            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "RiskRating"         VARCHAR(10)
                              CHECK ("RiskRating" IN ('Low','Medium','High')),
  ADD COLUMN IF NOT EXISTS "IncorporationDate"  DATE,
  ADD COLUMN IF NOT EXISTS "LegalStructure"     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "PrimaryIndustry"    VARCHAR(100);
```

---

### 16.5 Existing `refresh_tokens` Table (mixed case — exact schema)

```
id         uuid  PK  DEFAULT gen_random_uuid()
userId     uuid  NOT NULL  FK → users."UserID"
token      varchar(500)  UNIQUE NOT NULL    ← raw token stored (NOT hashed)
isRevoked  boolean  NOT NULL  DEFAULT false
expiresAt  timestamp  NOT NULL
createdAt  timestamp  NOT NULL  DEFAULT now()
updatedAt  timestamp  NOT NULL  DEFAULT now()
```

> **Important security note for the plan:** The existing table stores the raw refresh token. Our new backend must hash tokens before inserting (`SHA-256`) and update the plan's auth logic to store hash in `token` column instead. Add `token_hash` check in queries using `WHERE token = sha256($rawToken)`. The existing TypeORM application should be aligned on this before going live.

---

### 16.6 Existing `migrations` Table (TypeORM format)

```
id         SERIAL  PK
timestamp  BIGINT  NOT NULL
name       VARCHAR NOT NULL
```

**Existing migrations already run (ids 1–8):**

| id | timestamp | name |
|----|-----------|------|
| 1 | 1763678000000 | InitialSchema1763678000000 |
| 2 | 1763678000001 | SessionBasedVersioning1763678000001 |
| 3 | 1763678000002 | AddVersionCountToReportSessions1763678000002 |
| 4 | 1763678000003 | UpdateReportVersionScoresColumnType1763678000003 |
| 5 | 1763678000004 | UpdateCompanyCountryNullable1763678000004 |
| 6 | 1763678000005 | AddErrorTextToAISuggestions1763678000005 |
| 7 | 1763678000006 | RenameCompanyNumberToCRISNumber1763678000006 |
| 8 | 1763678000007 | AddLastResentAtToUserInvitations1763678000007 |

New OpsHub migrations will start at timestamp `1763679000000` (incremented series) to avoid collisions.

---

### 16.7 Migration Strategy — Shared `migrations` Table

Drizzle ORM uses its own migration tracker (`__drizzle_migrations`). To honour the team's requirement of a **single shared `migrations` table**, we implement a custom migration runner that writes to the TypeORM-compatible `migrations` table.

**`src/db/migrate.ts` — custom runner:**

```typescript
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import { env } from "../config/env";

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

interface MigrationRecord {
  timestamp: number;
  name: string;
}

async function run() {
  const pool = new Pool({ connectionString: env.databaseUrl });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Fetch already-applied migration timestamps
    const { rows } = await client.query<{ timestamp: string }>(
      `SELECT timestamp FROM migrations ORDER BY timestamp`
    );
    const applied = new Set(rows.map(r => Number(r.timestamp)));

    // Discover migration files: e.g. 1763679000001_CreateCases.sql
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) continue;

      const ts   = Number(match[1]);
      const name = `${match[2]}${match[1]}`;   // TypeORM convention: NameTimestamp

      if (applied.has(ts)) {
        console.log(`  ↳ skip  [${ts}] ${name}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      console.log(`  ↳ run   [${ts}] ${name}`);
      await client.query(sql);
      await client.query(
        `INSERT INTO migrations (timestamp, name) VALUES ($1, $2)`,
        [ts, name]
      );
    }

    await client.query("COMMIT");
    console.log("✓ Migrations complete");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("✗ Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
```

**`package.json` script:**

```json
"scripts": {
  "migrate": "tsx src/db/migrate.ts",
  "migrate:status": "PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c 'SELECT id,timestamp,name FROM migrations ORDER BY timestamp;'"
}
```

---

### 16.8 New Migration Files (SQL — in order)

All files go in `src/db/migrations/`. Timestamps start at `1763679000000`.

#### `1763679000000_AddOpsHubFieldsToUsers.sql`
```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "Title"          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "Initials"       VARCHAR(5),
  ADD COLUMN IF NOT EXISTS "TotalReports"   INTEGER,
  ADD COLUMN IF NOT EXISTS "Score"          NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS "LastSubmission" TIMESTAMP;
```

#### `1763679000001_AddOpsHubFieldsToCompanies.sql`
```sql
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS "Country"            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "RiskRating"         VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "IncorporationDate"  DATE,
  ADD COLUMN IF NOT EXISTS "LegalStructure"     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "PrimaryIndustry"    VARCHAR(100),
  ADD CONSTRAINT chk_risk_rating
    CHECK ("RiskRating" IN ('Low','Medium','High'));
```

#### `1763679000002_CreateCompanyRecipientEmails.sql`
```sql
CREATE TABLE IF NOT EXISTS company_recipient_emails (
  "EmailID"    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "CompanyID"  UUID NOT NULL REFERENCES companies("CompanyID") ON DELETE CASCADE,
  "Email"      VARCHAR(255) NOT NULL,
  "IsPrimary"  BOOLEAN NOT NULL DEFAULT FALSE,
  "CreatedAt"  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_emails_company_id
  ON company_recipient_emails("CompanyID");
```

#### `1763679000003_CreateUserPlatforms.sql`
```sql
CREATE TABLE IF NOT EXISTS user_platforms (
  "PlatformID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "UserID"     UUID NOT NULL REFERENCES users("UserID") ON DELETE CASCADE,
  "Platform"   VARCHAR(50) NOT NULL
                  CHECK ("Platform" IN ('automation','questionnaire')),
  "Role"       VARCHAR(20) NOT NULL
                  CHECK ("Role" IN ('researcher','reviewer','analyst','admin')),
  "CreatedAt"  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_platforms_user_id
  ON user_platforms("UserID");
```

#### `1763679000004_CreateTemplates.sql`
```sql
CREATE TABLE IF NOT EXISTS templates (
  "TemplateID"     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "Name"           VARCHAR(255) NOT NULL,
  "Description"    TEXT,
  "Status"         VARCHAR(10)  NOT NULL DEFAULT 'Draft'
                     CHECK ("Status" IN ('Active','Draft')),
  "RecipientType"  VARCHAR(50),
  "Version"        INTEGER NOT NULL DEFAULT 1,
  "CreatedBy"      UUID REFERENCES users("UserID"),
  "UpdatedBy"      UUID REFERENCES users("UserID"),
  "LastEditedAt"   TIMESTAMP NOT NULL DEFAULT now(),
  "CreatedAt"      TIMESTAMP NOT NULL DEFAULT now(),
  "UpdatedAt"      TIMESTAMP NOT NULL DEFAULT now()
);
```

#### `1763679000005_CreateSections.sql`
```sql
CREATE TABLE IF NOT EXISTS sections (
  "SectionID"   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "TemplateID"  UUID NOT NULL REFERENCES templates("TemplateID") ON DELETE CASCADE,
  "Title"       VARCHAR(255) NOT NULL,
  "Description" TEXT,
  "Banner"      TEXT,
  "OrderIndex"  INTEGER NOT NULL DEFAULT 0,
  "CreatedAt"   TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sections_template_id
  ON sections("TemplateID");
```

#### `1763679000006_CreateQuestions.sql`
```sql
CREATE TABLE IF NOT EXISTS questions (
  "QuestionID"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "SectionID"           UUID NOT NULL REFERENCES sections("SectionID") ON DELETE CASCADE,
  "Label"               TEXT NOT NULL,
  "FieldType"           VARCHAR(20) NOT NULL
                          CHECK ("FieldType" IN (
                            'text','longtext','number','date','dropdown','radio',
                            'multiselect','file','table','esign','toggle','url','support_doc'
                          )),
  "Mandatory"           BOOLEAN NOT NULL DEFAULT FALSE,
  "Prefill"             BOOLEAN NOT NULL DEFAULT FALSE,
  "SystemControlled"    BOOLEAN NOT NULL DEFAULT FALSE,
  "Repeater"            BOOLEAN NOT NULL DEFAULT FALSE,
  "AttachUpload"        BOOLEAN NOT NULL DEFAULT FALSE,
  "SameAsToggleLabel"   VARCHAR(200),
  "Note"                TEXT,
  "HelpText"            TEXT,
  "Placeholder"         TEXT,
  "Options"             JSONB,
  "TableColumns"        JSONB,
  "Validation"          JSONB,
  "Condition"           JSONB,
  "OrderIndex"          INTEGER NOT NULL DEFAULT 0,
  "CreatedAt"           TIMESTAMP NOT NULL DEFAULT now(),
  "UpdatedAt"           TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_questions_section_id
  ON questions("SectionID");
```

#### `1763679000007_CreateCases.sql`
```sql
CREATE TABLE IF NOT EXISTS cases (
  "CaseID"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "CaseRef"               VARCHAR(20)  NOT NULL UNIQUE,
  "OrderID"               VARCHAR(100) NOT NULL,
  "CompanyID"             UUID REFERENCES companies("CompanyID"),
  "SubjectName"           VARCHAR(255) NOT NULL,
  "Country"               VARCHAR(100) NOT NULL,
  "RecipientType"         VARCHAR(50)  NOT NULL
                            CHECK ("RecipientType" IN (
                              'Supplier','Customer','Partner','Business Analytics Report'
                            )),
  "Status"                VARCHAR(50)  NOT NULL DEFAULT 'NOT SENT'
                            CHECK ("Status" IN (
                              'SENT','OPENED','IN PROGRESS','COMPLETED',
                              'COMPLETED — MISSING DATA','PENDING CONTACT',
                              'PENDING LINKAGE & CONTACT','EXPIRED','NOT SENT'
                            )),
  "CompletionMandatory"   INTEGER NOT NULL DEFAULT 0,
  "CompletionOptional"    INTEGER NOT NULL DEFAULT 0,
  "DateSubmitted"         TIMESTAMP,
  "DateReceived"          TIMESTAMP NOT NULL DEFAULT now(),
  "LastActivity"          TIMESTAMP,
  "AnalystID"             UUID REFERENCES users("UserID"),
  "AssignedResearcherID"  UUID REFERENCES users("UserID"),
  "ResearcherStatus"      VARCHAR(20)
                            CHECK ("ResearcherStatus" IN (
                              'Not Applicable','Awaiting Review',
                              'Approved','Flagged','Rejected'
                            )),
  "ResearcherNotes"       TEXT,
  "ResearcherReviewedAt"  TIMESTAMP,
  "ApiPushStatus"         VARCHAR(10)  DEFAULT 'Pending'
                            CHECK ("ApiPushStatus" IN ('Pending','Success','Failed')),
  "ApiPushAt"             TIMESTAMP,
  "CurrentStep"           INTEGER NOT NULL DEFAULT 1
                            CHECK ("CurrentStep" BETWEEN 1 AND 16),
  "LinkTokenHash"         TEXT,
  "LinkExpiry"            TIMESTAMP,
  "LinkValidityHours"     INTEGER NOT NULL DEFAULT 48,
  "RemindersSent"         INTEGER NOT NULL DEFAULT 0,
  "ResentCount"           INTEGER NOT NULL DEFAULT 0,
  "TemplateID"            UUID REFERENCES templates("TemplateID"),
  "TemplateVersion"       INTEGER NOT NULL DEFAULT 1,
  "CreatedAt"             TIMESTAMP NOT NULL DEFAULT now(),
  "UpdatedAt"             TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cases_status          ON cases("Status");
CREATE INDEX IF NOT EXISTS idx_cases_analyst_id      ON cases("AnalystID");
CREATE INDEX IF NOT EXISTS idx_cases_researcher_id   ON cases("AssignedResearcherID");
CREATE INDEX IF NOT EXISTS idx_cases_company_id      ON cases("CompanyID");
CREATE INDEX IF NOT EXISTS idx_cases_link_expiry     ON cases("LinkExpiry");
```

#### `1763679000008_CreateQuestionnaireResponses.sql`
```sql
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  "ResponseID"   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "CaseID"       UUID NOT NULL REFERENCES cases("CaseID") ON DELETE CASCADE,
  "QuestionID"   UUID REFERENCES questions("QuestionID"),
  "SectionID"    UUID REFERENCES sections("SectionID"),
  "Question"     TEXT NOT NULL,
  "Answer"       TEXT,
  "Mandatory"    BOOLEAN NOT NULL DEFAULT TRUE,
  "Language"     VARCHAR(10),
  "CreatedAt"    TIMESTAMP NOT NULL DEFAULT now(),
  "UpdatedAt"    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_responses_case_id ON questionnaire_responses("CaseID");
```

#### `1763679000009_CreateAuditEvents.sql`
```sql
CREATE TABLE IF NOT EXISTS audit_events (
  "AuditID"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "CaseID"         UUID REFERENCES cases("CaseID"),
  "CaseSubject"    VARCHAR(255),
  "CaseOrderID"    VARCHAR(100),
  "Step"           INTEGER CHECK ("Step" BETWEEN 1 AND 16),
  "EventType"      VARCHAR(30) NOT NULL
                     CHECK ("EventType" IN (
                       'API Call','Link Event','Authentication',
                       'Form Activity','Researcher Action','API Push'
                     )),
  "Description"    TEXT NOT NULL,
  "TriggeredBy"    VARCHAR(255),
  "TriggeredByUserID" UUID REFERENCES users("UserID"),
  "Status"         VARCHAR(10) NOT NULL DEFAULT 'Success'
                     CHECK ("Status" IN ('Success','Failed','Pending')),
  "Payload"        JSONB,
  "CreatedAt"      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_case_id     ON audit_events("CaseID");
CREATE INDEX IF NOT EXISTS idx_audit_created_at  ON audit_events("CreatedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_type  ON audit_events("EventType");
```

#### `1763679000010_CreateNotifications.sql`
```sql
CREATE TABLE IF NOT EXISTS notifications (
  "NotificationID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "UserID"         UUID REFERENCES users("UserID") ON DELETE CASCADE,
  "Type"           VARCHAR(20) NOT NULL
                     CHECK ("Type" IN (
                       'submission','expired','blocked','reminder','review','api'
                     )),
  "Title"          VARCHAR(255) NOT NULL,
  "Body"           TEXT NOT NULL,
  "Read"           BOOLEAN NOT NULL DEFAULT FALSE,
  "CaseID"         UUID REFERENCES cases("CaseID"),
  "CreatedAt"      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications("UserID");
CREATE INDEX IF NOT EXISTS idx_notifications_read    ON notifications("Read");
```

#### `1763679000011_CreatePlatformConfig.sql`
```sql
CREATE TABLE IF NOT EXISTS platform_config (
  "ConfigID"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  "LinkValidityDays"    INTEGER NOT NULL DEFAULT 10,
  "TokenType"           VARCHAR(15) NOT NULL DEFAULT 'single-use'
                          CHECK ("TokenType" IN ('single-use','time-based')),
  "TokenExpiryValue"    INTEGER NOT NULL DEFAULT 30,
  "TokenExpiryUnit"     VARCHAR(10) NOT NULL DEFAULT 'minutes'
                          CHECK ("TokenExpiryUnit" IN ('hours','minutes')),

  "OtpLength"           INTEGER NOT NULL DEFAULT 6,
  "OtpExpiryMinutes"    INTEGER NOT NULL DEFAULT 10,
  "OtpMaxAttempts"      INTEGER NOT NULL DEFAULT 3,

  "Reminder1Day"        INTEGER NOT NULL DEFAULT 3,
  "Reminder2Day"        INTEGER NOT NULL DEFAULT 5,
  "ReminderFinalDay"    INTEGER NOT NULL DEFAULT 7,
  "ExpiryDay"           INTEGER NOT NULL DEFAULT 10,

  "GamificationEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "Tier1Label"          VARCHAR(100),
  "Tier1Description"    TEXT,
  "Tier2Label"          VARCHAR(100),
  "Tier2Description"    TEXT,

  "AutoProcessA"        BOOLEAN NOT NULL DEFAULT TRUE,
  "ManualProcessB"      BOOLEAN NOT NULL DEFAULT FALSE,
  "AlertCD"             BOOLEAN NOT NULL DEFAULT TRUE,

  "AuditRetentionDays"  INTEGER NOT NULL DEFAULT 365,
  "ExportFormat"        VARCHAR(10) NOT NULL DEFAULT 'csv',
  "StaleHours"          INTEGER NOT NULL DEFAULT 72,

  "UpdatedBy"           UUID REFERENCES users("UserID"),
  "UpdatedAt"           TIMESTAMP NOT NULL DEFAULT now()
);
-- Enforce single-row: prevent a second row from ever being inserted
CREATE UNIQUE INDEX IF NOT EXISTS platform_config_singleton
  ON platform_config ((TRUE));

-- Seed default config row
INSERT INTO platform_config DEFAULT VALUES
  ON CONFLICT DO NOTHING;
```

#### `1763679000012_CreateCountries.sql`
```sql
CREATE TABLE IF NOT EXISTS countries (
  "CountryID"  SERIAL PRIMARY KEY,
  "Name"       VARCHAR(100) NOT NULL UNIQUE,
  "Code"       CHAR(2)
);
INSERT INTO countries ("Name") VALUES
  ('Afghanistan'),('Albania'),('Algeria'),('Angola'),('Argentina'),
  ('Australia'),('Austria'),('Bahrain'),('Bangladesh'),('Belgium'),
  ('Brazil'),('Canada'),('China'),('Egypt'),('France'),
  ('Germany'),('India'),('Indonesia'),('Iran'),('Iraq'),
  ('Italy'),('Japan'),('Jordan'),('Kenya'),('Kuwait'),
  ('Lebanon'),('Libya'),('Malaysia'),('Mexico'),('Morocco'),
  ('Netherlands'),('Nigeria'),('Oman'),('Pakistan'),('Philippines'),
  ('Poland'),('Portugal'),('Qatar'),('Romania'),('Russia'),
  ('Saudi Arabia'),('Singapore'),('South Africa'),('South Korea'),('Spain'),
  ('Sudan'),('Sweden'),('Switzerland'),('Thailand'),('Turkey'),
  ('UAE'),('UK'),('USA'),('Ukraine'),('Vietnam')
ON CONFLICT ("Name") DO NOTHING;
```

#### `1763679000013_CreateTemplateSnapshots.sql`
```sql
CREATE TABLE IF NOT EXISTS template_snapshots (
  "SnapshotID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "TemplateID" UUID NOT NULL REFERENCES templates("TemplateID"),
  "Version"    INTEGER NOT NULL,
  "Snapshot"   JSONB NOT NULL,
  "CreatedAt"  TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE ("TemplateID", "Version")
);
```

---

### 16.9 Drizzle Schema — Mapping to PascalCase Columns

Because existing tables use PascalCase column names, the Drizzle schema must explicitly declare column names. Example for the `users` table:

```typescript
// db/schema/users.ts
import { pgTable, uuid, varchar, integer, numeric, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  // Existing columns — DO NOT RENAME
  userId:         uuid("UserID").primaryKey().defaultRandom(),
  email:          varchar("Email", { length: 100 }).notNull().unique(),
  password:       varchar("Password", { length: 100 }).notNull(),
  firstName:      varchar("FirstName", { length: 50 }).notNull(),
  lastName:       varchar("LastName", { length: 50 }).notNull(),
  role:           varchar("Role", { length: 20 }).notNull(),
  status:         varchar("Status", { length: 20 }).notNull().default("Active"),
  profilePicture: varchar("ProfilePicture", { length: 255 }),
  createdAt:      timestamp("CreatedAt").notNull().defaultNow(),
  updatedAt:      timestamp("UpdatedAt").notNull().defaultNow(),

  // New OpsHub columns (added via migration 1763679000000)
  title:          varchar("Title", { length: 100 }),
  initials:       varchar("Initials", { length: 5 }),
  totalReports:   integer("TotalReports"),
  score:          numeric("Score", { precision: 5, scale: 2 }),
  lastSubmission: timestamp("LastSubmission"),
});
```

```typescript
// db/schema/companies.ts
export const companies = pgTable("companies", {
  // Existing columns
  companyId:    uuid("CompanyID").primaryKey().defaultRandom(),
  companyName:  varchar("CompanyName", { length: 100 }).notNull(),
  crisNumber:   varchar("CRISNumber", { length: 50 }).notNull(),   // ← maps to frontend uid
  createdAt:    timestamp("CreatedAt").notNull().defaultNow(),
  updatedAt:    timestamp("UpdatedAt").notNull().defaultNow(),

  // New OpsHub columns
  country:           varchar("Country", { length: 100 }),
  riskRating:        varchar("RiskRating", { length: 10 }),
  incorporationDate: timestamp("IncorporationDate"),
  legalStructure:    varchar("LegalStructure", { length: 100 }),
  primaryIndustry:   varchar("PrimaryIndustry", { length: 100 }),
});
```

```typescript
// db/schema/refresh-tokens.ts
export const refreshTokens = pgTable("refresh_tokens", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    uuid("userId").notNull().references(() => users.userId, { onDelete: "cascade" }),
  token:     varchar("token", { length: 500 }).notNull().unique(),
  isRevoked: boolean("isRevoked").notNull().default(false),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
```

All **new** tables (cases, audit_events, notifications, etc.) use PascalCase column names to match the existing project convention.

---

### 16.10 Updated `drizzle.config.ts`

Drizzle-kit is used only for **introspection and type generation**. Migrations run via the custom runner in §16.7 (not `drizzle-kit push` or `drizzle-kit migrate`).

```typescript
// drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema:  "./src/db/schema/index.ts",
  out:     "./src/db/drizzle-generated",   // for type/introspect output only
  dialect: "postgresql",
  dbCredentials: {
    host:     process.env.PGHOST     || "localhost",
    user:     process.env.PGUSER     || "localdev",
    password: process.env.PGPASSWORD || "admin123",
    database: process.env.PGDATABASE || "cedarrose_local",
    port:     Number(process.env.PGPORT) || 5432,
    ssl:      false,
  },
  verbose: true,
  strict:  true,
} satisfies Config;
```

---

### 16.11 Updated `config/database.ts`

```typescript
import { drizzle }  from "drizzle-orm/node-postgres";
import { Pool }     from "pg";
import * as schema  from "../db/schema";
import { env }      from "./env";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;

  const pool = new Pool({
    host:     env.pgHost,
    user:     env.pgUser,
    password: env.pgPassword,
    database: env.pgDatabase,
    port:     env.pgPort,
    max:      20,
    ssl:      env.nodeEnv === "production" ? { rejectUnauthorized: true } : false,
  });

  _db = drizzle(pool, {
    schema,
    logger: env.nodeEnv === "development",
  });

  return _db;
}
```

---

### 16.12 Updated `config/env.ts`

```typescript
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV:                 z.enum(["development","test","production"]).default("development"),
  PORT:                     z.coerce.number().default(3000),

  // Database — individual vars (matches existing PG* convention)
  PGHOST:                   z.string().default("localhost"),
  PGUSER:                   z.string().default("localdev"),
  PGPASSWORD:               z.string(),
  PGDATABASE:               z.string().default("cedarrose_local"),
  PGPORT:                   z.coerce.number().default(5432),
  DATABASE_URL:             z.string().url().optional(),

  JWT_SECRET:               z.string().min(32),
  JWT_ACCESS_EXPIRY:        z.string().default("15m"),
  JWT_REFRESH_EXPIRY:       z.string().default("7d"),
  QUESTIONNAIRE_JWT_SECRET: z.string().min(32),

  ALLOWED_ORIGINS:          z.string().transform(v => v.split(",")).default("http://localhost:5173"),
  ALLOWED_EXTERNAL_HOSTS:   z.string().transform(v => v.split(",")).default(""),

  SMTP_HOST:                z.string().default("smtp.mailtrap.io"),
  SMTP_PORT:                z.coerce.number().default(587),
  SMTP_USER:                z.string().default(""),
  SMTP_PASS:                z.string().default(""),

  LOG_LEVEL:                z.enum(["trace","debug","info","warn","error"]).default("info"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables:\n", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  pgHost:     parsed.data.PGHOST,
  pgUser:     parsed.data.PGUSER,
  pgPassword: parsed.data.PGPASSWORD,
  pgDatabase: parsed.data.PGDATABASE,
  pgPort:     parsed.data.PGPORT,
  nodeEnv:    parsed.data.NODE_ENV,
  port:       parsed.data.PORT,
  databaseUrl: parsed.data.DATABASE_URL
    ?? `postgresql://${parsed.data.PGUSER}:${parsed.data.PGPASSWORD}@${parsed.data.PGHOST}:${parsed.data.PGPORT}/${parsed.data.PGDATABASE}`,
  jwtSecret:               parsed.data.JWT_SECRET,
  jwtAccessExpiry:         parsed.data.JWT_ACCESS_EXPIRY,
  jwtRefreshExpiry:        parsed.data.JWT_REFRESH_EXPIRY,
  questionnaireJwtSecret:  parsed.data.QUESTIONNAIRE_JWT_SECRET,
  allowedOrigins:          parsed.data.ALLOWED_ORIGINS,
  allowedExternalHosts:    parsed.data.ALLOWED_EXTERNAL_HOSTS,
  smtpHost:                parsed.data.SMTP_HOST,
  smtpPort:                parsed.data.SMTP_PORT,
  smtpUser:                parsed.data.SMTP_USER,
  smtpPass:                parsed.data.SMTP_PASS,
  logLevel:                parsed.data.LOG_LEVEL,
};
```

---

### 16.13 Auth Service — Aligning with Existing `users` Table

The existing table stores `Password` (likely bcrypt from the TypeORM app). Our new service must:

1. **Login:** verify password using `argon2.verify()` falling back to `bcrypt.compare()` for existing users. Rehash to Argon2id on first successful login.
2. **New users:** hash password with Argon2id from day one.
3. **Column refs:** use `"UserID"` not `"id"` in all queries.

```typescript
// auth.service.ts
async login(email: string, password: string): Promise<TokenPair> {
  const user = await this.usersRepo.findByEmail(email);
  if (!user) throw new HttpError(401, "AUTH_INVALID_CREDENTIALS");

  // Support both bcrypt (existing) and argon2id (new)
  const valid = user.password.startsWith("$argon2")
    ? await argon2.verify(user.password, password)
    : await bcrypt.compare(password, user.password);

  if (!valid) {
    await this.recordFailedAttempt(email);
    throw new HttpError(401, "AUTH_INVALID_CREDENTIALS");
  }

  // Rehash to argon2id if still bcrypt
  if (!user.password.startsWith("$argon2")) {
    const newHash = await argon2.hash(password, { type: argon2.argon2id });
    await this.usersRepo.updatePassword(user.userId, newHash);
  }

  return this.issueTokenPair(user);
}
```

---

### 16.14 FK Reference Summary (existing → new)

| New table | FK column | References |
|-----------|-----------|------------|
| `user_platforms` | `"UserID"` | `users."UserID"` |
| `cases` | `"CompanyID"` | `companies."CompanyID"` |
| `cases` | `"AnalystID"` | `users."UserID"` |
| `cases` | `"AssignedResearcherID"` | `users."UserID"` |
| `cases` | `"TemplateID"` | `templates."TemplateID"` |
| `questionnaire_responses` | `"CaseID"` | `cases."CaseID"` |
| `questionnaire_responses` | `"QuestionID"` | `questions."QuestionID"` |
| `audit_events` | `"CaseID"` | `cases."CaseID"` |
| `audit_events` | `"TriggeredByUserID"` | `users."UserID"` |
| `notifications` | `"UserID"` | `users."UserID"` |
| `notifications` | `"CaseID"` | `cases."CaseID"` |
| `templates` | `"CreatedBy"` | `users."UserID"` |
| `templates` | `"UpdatedBy"` | `users."UserID"` |
| `sections` | `"TemplateID"` | `templates."TemplateID"` |
| `questions` | `"SectionID"` | `sections."SectionID"` |
| `company_recipient_emails` | `"CompanyID"` | `companies."CompanyID"` |
| `platform_config` | `"UpdatedBy"` | `users."UserID"` |
| `template_snapshots` | `"TemplateID"` | `templates."TemplateID"` |

---

### 16.15 Running Migrations for the First Time

```bash
# 1. Copy .env
cp .env.example .env
# (fill JWT_SECRET and QUESTIONNAIRE_JWT_SECRET)

# 2. Install dependencies
npm install

# 3. Run migrations (writes to shared migrations table)
npm run migrate

# 4. Verify
npm run migrate:status
# Expected: 8 existing rows + 14 new rows (ids 1763679000000–1763679000013)

# 5. Start server
npm run dev
```

---

*Section 16 added: full existing-DB integration — 13-table inventory from live DB introspection, PascalCase column mapping for Drizzle, shared TypeORM-format migrations table strategy with custom runner, 14 new SQL migration files (timestamps 1763679000000–1763679000013), FK alignment, bcrypt→Argon2id rehash on login, and updated env/drizzle config with real credentials.*

---

## 17. Auth & User Strategy — cedarqa-backend Alignment

> **This section overrides Section 6 in full.** Every design decision below was extracted directly from `cedarqa-backend` source files. The OpsHub backend must use the **identical** patterns so both apps can share the same `users`, `refresh_tokens`, `password_reset_tokens`, and `user_invitations` tables without conflict.

---

### 17.1 Exact Differences from Section 6 (what changes)

| Topic | Section 6 (old) | Section 17 (correct — cedarqa aligned) |
|-------|----------------|----------------------------------------|
| Password hashing | Argon2id | **bcrypt, salt rounds 10** |
| JWT env var | `JWT_SECRET` | **`JWT_SECRET_KEY`** |
| Access token TTL | 15 minutes | **1 day (`'1d'`)** |
| JWT payload | `{ sub, role, jti }` | **`{ sub: UserID, email: Email, role: Role }`** |
| Refresh token storage | SHA-256 hash in DB | **Raw UUID stored directly** |
| Refresh token TTL | 7 days | **30 days** |
| Refresh token issued | Always on login | **Only when `rememberMe: true`** |
| Refresh token rotation | Yes (forced) | **No — revoked only on explicit refresh** |
| Cookie sameSite | `Strict` | **`lax` (access_token)** |
| User roles | lowercase | **Title-case: `'Researcher'`, `'Reviewer'`, `'Admin'`** |
| User statuses | Active/Inactive | **`'Active'`, `'Inactive'`, `'Pending'`** |
| User creation | Direct admin create | **Invitation flow (Status=Pending → complete-registration)** |
| Password policy | Min 12 + special required | **Min 8, NO special required, common-password blocklist** |
| Password reset allowed for | all users | **ACTIVE users only** |
| Email service | Nodemailer/SMTP | **Azure Communication Services + Handlebars templates** |
| Auth middleware | JWT-only | **JWT Bearer header OR `access_token` cookie** |

---

### 17.2 User Roles & Statuses (exact values from DB)

```typescript
// shared/types/common.ts
export enum UserRole {
  RESEARCHER = 'Researcher',
  REVIEWER   = 'Reviewer',
  ANALYST    = 'Analyst',     // OpsHub addition — not in cedarqa-backend
  ADMIN      = 'Admin',
}

export enum UserStatus {
  ACTIVE   = 'Active',
  INACTIVE = 'Inactive',
  PENDING  = 'Pending',       // Invited but not yet completed registration
}
```

> `'Analyst'` is a new role added for the OpsHub platform only. The existing `cedarqa-backend` did not have it. The DB `Role` column is `varchar(20)` — no enum constraint — so adding `'Analyst'` is safe.

---

### 17.3 Password Hashing — bcrypt (rounds 10)

```typescript
// shared/utils/crypto.ts
import * as bcrypt from 'bcryptjs';

export const BCRYPT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

**DO NOT use Argon2id.** The cedarqa-backend stores bcrypt hashes. If we switch algorithms, existing users can never log in.

---

### 17.4 Email Normalization

Applied before every DB read/write involving email:

```typescript
// shared/utils/email.ts
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}
```

---

### 17.5 Password Policy

```typescript
// middleware/passwordPolicy.middleware.ts
export const PASSWORD_POLICY = {
  MIN_LENGTH:       8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER:    true,
  REQUIRE_SPECIAL:   false,   // NOT required (NIST 800-63B guideline)
  DISALLOW_COMMON:   true,
};

const COMMON_PASSWORDS = [
  'password','qwerty','123456','admin','welcome',
  'letmein','abc123','passw0rd','pa$$word','12345678',
  'password123','admin123','qwerty123',
];

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  // Bypass in development
  if (process.env.NODE_ENV === 'development') return { valid: true };

  if (password.length < PASSWORD_POLICY.MIN_LENGTH)
    return { valid: false, message: `Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters long` };
  if (!/[A-Z]/.test(password))
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  if (!/[a-z]/.test(password))
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  if (!/\d/.test(password))
    return { valid: false, message: 'Password must contain at least one number' };
  if (COMMON_PASSWORDS.includes(password.toLowerCase()))
    return { valid: false, message: 'This password is too common and easy to guess' };

  return { valid: true };
}
```

`passwordPolicyMiddleware` reads `req.body.password` OR `req.body.newPassword` and short-circuits with 400 if policy fails.

---

### 17.6 JWT Token Strategy

```typescript
// auth.service.ts
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  sub:   string;   // UserID (UUID)
  email: string;   // Email (normalized)
  role:  string;   // Role (Title-case)
}

generateAccessToken(user: UserRow): string {
  const payload: JwtPayload = {
    sub:   user.UserID,
    email: user.Email,
    role:  user.Role,
  };
  const secret = env.jwtSecretKey;   // process.env.JWT_SECRET_KEY
  return jwt.sign(payload, secret, { expiresIn: '1d' });
}
```

**Env var must be named `JWT_SECRET_KEY`** (not `JWT_SECRET`). Update `.env`:

```env
JWT_SECRET_KEY=<openssl rand -hex 64>
```

---

### 17.7 Refresh Token Strategy

```typescript
// auth.service.ts
import { v4 as uuidv4 } from 'uuid';

async generateRefreshToken(userId: string): Promise<string> {
  const rawToken = uuidv4();                     // plain UUID — stored as-is
  const expiresAt = addDays(new Date(), 30);

  await db.insert(refreshTokens).values({
    userId,                                        // "userId" column (camelCase)
    token:     rawToken,                           // raw UUID stored directly
    isRevoked: false,
    expiresAt,
  });

  return rawToken;
}

async validateRefreshToken(token: string): Promise<{ userId: string } | null> {
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(and(
      eq(refreshTokens.token, token),            // direct match, no hashing
      eq(refreshTokens.isRevoked, false)
    ))
    .limit(1);

  if (!row) return null;
  if (new Date() > row.expiresAt) {
    await this.revokeRefreshToken(token);
    return null;
  }
  return { userId: row.userId };
}

async revokeRefreshToken(token: string): Promise<void> {
  await db.update(refreshTokens)
    .set({ isRevoked: true })
    .where(eq(refreshTokens.token, token));
}

async revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await db.update(refreshTokens)
    .set({ isRevoked: true })
    .where(eq(refreshTokens.userId, userId));
}
```

---

### 17.8 Cookie Strategy

Two cookies managed via `setSecureCookie` / `clearSecureCookie`:

| Cookie name | Content | TTL | Conditions |
|---|---|---|---|
| `access_token` | JWT access token | 1 day | Always set on login |
| `refresh_token` | Raw UUID refresh token | 30 days | Only when `rememberMe: true` |

```typescript
// middleware/secureCookie.middleware.ts
export function setSecureCookie(
  req: Request, res: Response,
  token: string,
  name = 'access_token',
  expiresIn = 24 * 60 * 60 * 1000,   // 1 day in ms
): void {
  res.cookie(name, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',        // lax (NOT strict) for CORS support
    maxAge:   expiresIn,
    path:     '/',
  });
}

export function clearSecureCookie(res: Response, name = 'access_token'): void {
  res.clearCookie(name, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/',
  });
}

// Bridges cookie → Bearer header so authMiddleware works for both
export function cookieTokenExtractor(req: Request, res: Response, next: NextFunction): void {
  if (!req.headers.authorization && req.cookies?.access_token) {
    req.headers.authorization = `Bearer ${req.cookies.access_token}`;
  }
  next();
}
```

Apply `cookieTokenExtractor` as global middleware **before** `authMiddleware`.

---

### 17.9 Auth Middleware

```typescript
// middleware/authenticate.ts
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'Authentication token missing' });

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET_KEY;
    if (!secret) throw new Error('JWT_SECRET_KEY not set');

    const decoded = jwt.verify(token, secret) as JwtPayload;
    if (!decoded.sub || !decoded.email || !decoded.role)
      return res.status(401).json({ success: false, message: 'Invalid token format' });

    // Always re-fetch user from DB — catches revoked/deleted/role-changed users
    const [user] = await db.select().from(users)
      .where(eq(users.userId, decoded.sub)).limit(1);

    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });

    // Role must still match what's in the token
    if (user.role !== decoded.role)
      return res.status(401).json({ success: false, message: 'User role mismatch' });

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError)
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    return res.status(err.status ?? 500).json({ success: false, message: err.message ?? 'Something went wrong' });
  }
};
```

**`req.user` is typed as the Drizzle row type** (not a DTO). Extend Express `Request`:

```typescript
// shared/types/express.d.ts
declare namespace Express {
  interface Request {
    user?: typeof import('../db/schema/users').users.$inferSelect;
  }
}
```

---

### 17.10 Login Flow (complete)

```typescript
// auth.controller.ts
login = async (req: Request, res: Response): Promise<void> => {
  const { email, password, rememberMe } = req.body;

  // 1. validateUser
  let user: UserRow;
  try {
    user = await authService.validateUser(email, password);
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }
  } catch (err) {
    if (err.status === 403) {
      res.status(403).json({ success: false, message: err.message, errorCode: 'ACCOUNT_DISABLED' });
      return;
    }
    throw err;
  }

  // 2. Access token
  const token = authService.generateAccessToken(user);
  setSecureCookie(req, res, token);   // always set access_token cookie

  // 3. Refresh token — only if rememberMe
  let refreshToken: string | undefined;
  if (rememberMe) {
    refreshToken = await authService.generateRefreshToken(user.userId);
    setSecureCookie(req, res, refreshToken, 'refresh_token', 30 * 24 * 60 * 60 * 1000);
  }

  // 4. Strip password before response
  const { password: _pw, ...safeUser } = user;

  res.status(200).json({
    success: true,
    data: {
      user: safeUser,
      token,
      ...(refreshToken && { refreshToken }),
    },
  });
};
```

**validateUser internals:**

```typescript
async validateUser(email: string, password: string): Promise<UserRow | null> {
  const normalizedEmail = normalizeEmail(email);

  const [user] = await db.select().from(users)
    .where(eq(users.email, normalizedEmail)).limit(1);

  if (!user) return null;

  if (user.status === 'Inactive')
    throw new HttpError(403, 'Your account has been disabled. Please contact an administrator.');

  const valid = await verifyPassword(password, user.password);
  return valid ? user : null;
}
```

---

### 17.11 Refresh Token Flow

```typescript
refreshToken = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refresh_token ?? req.body.refreshToken;

  if (!token) {
    res.status(400).json({ success: false, message: 'Refresh token is required' });
    return;
  }

  const data = await authService.validateRefreshToken(token);
  if (!data) {
    clearSecureCookie(res, 'access_token');
    clearSecureCookie(res, 'refresh_token');
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.userId, data.userId)).limit(1);
  if (!user) {
    clearSecureCookie(res, 'access_token');
    clearSecureCookie(res, 'refresh_token');
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const newToken        = authService.generateAccessToken(user);
  const newRefreshToken = await authService.generateRefreshToken(user.userId);

  // Revoke old token only after new one is issued
  await authService.revokeRefreshToken(token);

  setSecureCookie(req, res, newToken);
  setSecureCookie(req, res, newRefreshToken, 'refresh_token', 30 * 24 * 60 * 60 * 1000);

  const { password: _pw, ...safeUser } = user;
  res.status(200).json({ success: true, data: { user: safeUser, token: newToken, refreshToken: newRefreshToken } });
};
```

---

### 17.12 Logout Flow

```typescript
logout = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refresh_token ?? req.body.refreshToken;
  if (token) await authService.revokeRefreshToken(token);

  clearSecureCookie(res, 'access_token');
  clearSecureCookie(res, 'refresh_token');

  res.status(200).json({ success: true, message: 'Logout successful' });
};
```

---

### 17.13 User Invitation Flow (Pending → Active)

This is the **only** way to create users in the OpsHub platform — there is no direct `/users` POST for admin. An invitation email is sent; the user sets their own password.

**Step 1 — Admin invites user (`POST /admin/users/invite`)**

```typescript
async inviteUser(dto: InviteUserDto, invitedByUserId: string): Promise<void> {
  const queryRunner = ...; // DB transaction
  try {
    await queryRunner.startTransaction();

    const normalizedEmail = normalizeEmail(dto.email);

    // Check duplicate
    const existing = await queryRunner.manager.findUser({ email: normalizedEmail });
    if (existing) throw new HttpError(409, 'A user with this email already exists');

    // Create with Status='Pending', random temp password
    const user = await queryRunner.manager.insertUser({
      FirstName: dto.firstName,
      LastName:  dto.lastName,
      Email:     normalizedEmail,
      Role:      dto.role,
      Status:    'Pending',
      Password:  crypto.randomBytes(10).toString('hex'),  // discarded after invitation
    });

    // Invitation token: 64 hex chars, 24h expiry
    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = addHours(new Date(), 24);

    await queryRunner.manager.insertInvitation({ userId: user.UserID, token, expiresAt });

    // Send email — if this fails, entire transaction rolls back
    await emailService.sendInvitationEmail(user, token);

    await queryRunner.commitTransaction();
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  }
}
```

**Step 2 — Resend invitation (`POST /admin/users/:id/resend-invitation`)**

- Rate limit: 5-minute cooldown checked against `user_invitations.last_resent_at`
- Generate new token + new 24h expiry
- Update `last_resent_at = now()`

**Step 3 — Verify invitation link (`GET /auth/verify-invitation?token=...`)**

Returns user metadata (firstName, lastName, role) — public endpoint, no auth.

**Step 4 — Complete registration (`POST /auth/complete-registration`)**

```typescript
async completeRegistration(token: string, password: string): Promise<void> {
  const invitation = await findActiveInvitation(token);     // used=false, not expired
  if (!invitation) throw new HttpError(400, 'Invalid or expired invitation');

  const hashedPassword = await hashPassword(password);      // bcrypt rounds 10
  await updateUser(invitation.userId, {
    Password: hashedPassword,
    Status:   'Active',
  });
  await markInvitationUsed(token);
}
```

**Invitation routes (public — no auth middleware):**

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/auth/verify-invitation` | Validate token, return user info |
| `POST` | `/auth/complete-registration` | Set password, activate account |

**Invitation routes (admin auth required):**

| Method | Path | Description |
|--------|------|-------------|
| `POST`  | `/admin/users/invite` | Invite new user |
| `POST`  | `/admin/users/:id/resend-invitation` | Resend with 5-min rate limit |
| `DELETE`| `/admin/users/:id/invitations` | Cancel pending invitation |

---

### 17.14 Password Reset Flow (ACTIVE users only)

**Step 1 — Request reset (`POST /auth/forgot-password`)**

```typescript
async generateResetToken(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const user = await findUserByEmail(normalizedEmail);

  if (!user) throw new HttpError(404, 'No account found with this email address');

  // Status guard
  if (user.status === 'Pending')
    throw new HttpError(403, 'Your account is pending activation. Complete registration via invitation email.');
  if (user.status === 'Inactive')
    throw new HttpError(403, 'Your account has been deactivated. Contact the administrator.');

  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = addHours(new Date(), 1);   // 1 hour only

  await insertPasswordResetToken({ userId: user.UserID, token, expiresAt });

  // Send email; if email fails → delete token + throw 500
  try {
    await emailService.sendPasswordResetEmail(user.Email, token);
  } catch {
    await deletePasswordResetToken(token);
    throw new HttpError(500, 'Error sending reset email');
  }
}
```

**Step 2 — Reset password (`POST /auth/reset-password`)**

```typescript
async resetPassword(token: string, newPassword: string): Promise<void> {
  const resetToken = await findPasswordResetToken(token);
  if (!resetToken)         throw new HttpError(400, 'Invalid or expired reset token');
  if (resetToken.used)     throw new HttpError(400, 'This reset token has already been used');
  if (new Date() > resetToken.expiresAt) throw new HttpError(400, 'Reset token has expired');

  // New password cannot match current
  const isSame = await verifyPassword(newPassword, resetToken.user.Password);
  if (isSame) throw new HttpError(400, 'New password cannot be the same as your current password');

  await updateUserPassword(resetToken.userId, await hashPassword(newPassword));
  await markResetTokenUsed(token);
}
```

Password reset routes (public):

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/forgot-password` | Request reset token (email sent) |
| `POST` | `/auth/reset-password` | Set new password via token |

---

### 17.15 Change Password (authenticated)

```typescript
// auth.controller.ts — changePassword
const { currentPassword, newPassword, confirmPassword } = req.body;
const userId = req.user.UserID;

if (!currentPassword || !newPassword || !confirmPassword)
  return sendError(res, 400, 'All fields are required');

if (newPassword !== confirmPassword)
  return sendError(res, 400, 'New password and confirm password do not match');

// Delegate to authService.changePassword which:
//   1. Verifies currentPassword via bcrypt.compare
//   2. Checks new !== current
//   3. bcrypt.hash(newPassword, 10)
//   4. revokeAllUserRefreshTokens(userId)
await authService.changePassword(userId, currentPassword, newPassword);

clearSecureCookie(res, 'access_token');
clearSecureCookie(res, 'refresh_token');
sendSuccess(res, { message: 'Password changed successfully. Please log in again.' });
```

---

### 17.16 Email Service — Azure Communication Services

The cedarqa-backend uses **Azure Email** (`AzureEmailService`) with **Handlebars** (`.hbs`) templates, NOT Nodemailer/SMTP.

```typescript
// lib/azure-email.ts (mirrors cedarqa pattern)
import { EmailClient } from '@azure/communication-email';
import * as handlebars from 'handlebars';
import * as fs from 'fs';

export class AzureEmailService {
  private client: EmailClient;
  private sender: string;

  constructor() {
    this.client = new EmailClient(env.azureEmailConnectionString);
    this.sender = env.azureEmailSender;
  }

  async sendEmail(templatePath: string, to: string, data: Record<string, unknown>): Promise<void> {
    const source   = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(source);
    const html     = template(data);

    await this.client.beginSend({
      senderAddress: this.sender,
      recipients:    { to: [{ address: to }] },
      content: {
        subject: data.subject as string,
        html,
        plainText: (data.plainText ?? '') as string,
      },
    });
  }
}
```

**Required env vars (add to `.env`):**

```env
AZURE_EMAIL_CONNECTION_STRING=endpoint=https://....communication.azure.com/;accesskey=...
AZURE_EMAIL_SENDER=DoNotReply@<domain>.azurecomm.net
FRONTEND_URL=http://localhost:5173
```

**Handlebars template paths** (`src/views/mail-templates/`):
- `invitation.hbs` — variables: `firstName`, `lastName`, `role`, `invitationUrl`, `year`
- `password-reset.hbs` — variables: `email`, `resetLink`, `year`

---

### 17.17 Updated `.env` (complete — all env vars)

```env
# ── Database ──────────────────────────────────────────
PGHOST=localhost
PGUSER=localdev
PGPORT=5432
PGDATABASE=cedarrose_local
PGPASSWORD=admin123
DATABASE_URL=postgresql://localdev:admin123@localhost:5432/cedarrose_local

# ── Auth ──────────────────────────────────────────────
JWT_SECRET_KEY=<openssl rand -hex 64>
QUESTIONNAIRE_JWT_SECRET=<openssl rand -hex 64>

# ── App ───────────────────────────────────────────────
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
ALLOWED_EXTERNAL_HOSTS=data-exchange.cedarrose.com

# ── Azure Email ───────────────────────────────────────
AZURE_EMAIL_CONNECTION_STRING=<from Azure portal>
AZURE_EMAIL_SENDER=DoNotReply@<domain>.azurecomm.net

# ── Logging ───────────────────────────────────────────
LOG_LEVEL=info
```

---

### 17.18 Updated `config/env.ts`

```typescript
const envSchema = z.object({
  NODE_ENV:         z.enum(["development","test","production"]).default("development"),
  PORT:             z.coerce.number().default(3000),

  PGHOST:           z.string().default("localhost"),
  PGUSER:           z.string().default("localdev"),
  PGPASSWORD:       z.string(),
  PGDATABASE:       z.string().default("cedarrose_local"),
  PGPORT:           z.coerce.number().default(5432),

  JWT_SECRET_KEY:               z.string().min(32),   // ← JWT_SECRET_KEY (not JWT_SECRET)
  QUESTIONNAIRE_JWT_SECRET:     z.string().min(32),

  FRONTEND_URL:                 z.string().default("http://localhost:5173"),
  ALLOWED_ORIGINS:              z.string().transform(v => v.split(",")).default("http://localhost:5173"),
  ALLOWED_EXTERNAL_HOSTS:       z.string().transform(v => v.split(",")).default(""),

  AZURE_EMAIL_CONNECTION_STRING: z.string().default(""),
  AZURE_EMAIL_SENDER:            z.string().default(""),

  LOG_LEVEL: z.enum(["trace","debug","info","warn","error"]).default("info"),
});
```

---

### 17.19 Updated Package Dependencies

Add/replace these packages vs the original plan:

```json
{
  "dependencies": {
    "bcryptjs":                       "^2.4.3",
    "@azure/communication-email":     "^1.0.0",
    "handlebars":                     "^4.7.8",
    "cookie-parser":                  "^1.4.6",
    "uuid":                           "^10.0"
  },
  "devDependencies": {
    "@types/bcryptjs":   "^2.4.6",
    "@types/cookie-parser": "^1.4.7",
    "@types/handlebars": "^4.1.0"
  }
}
```

**Remove from plan:** `argon2` (Section 14 Appendix) — replaced by `bcryptjs`.  
**Add:** `cookie-parser` middleware (required for `req.cookies`).

---

### 17.20 Complete Auth Route Map

```typescript
// modules/auth/auth.router.ts
router.post('/login',               validate(loginSchema),               authController.login);
router.post('/refresh',             authController.refreshToken);
router.post('/logout',              authController.logout);
router.get ('/me',                  cookieTokenExtractor, authMiddleware, authController.me);
router.post('/change-password',     cookieTokenExtractor, authMiddleware,
                                    passwordPolicyMiddleware,            authController.changePassword);
router.post('/forgot-password',     validate(forgotPasswordSchema),      authController.forgotPassword);
router.post('/reset-password',      passwordPolicyMiddleware,
                                    validate(resetPasswordSchema),       authController.resetPassword);
router.get ('/verify-invitation',   authController.verifyInvitation);
router.post('/complete-registration',passwordPolicyMiddleware,
                                    validate(completeRegistrationSchema),authController.completeRegistration);
```

---

*Section 17 added: complete cedarqa-backend auth alignment — bcrypt (rounds 10), JWT_SECRET_KEY, 1-day access tokens, raw-UUID refresh tokens (30d, rememberMe-only), lax cookie strategy, dual Bearer+cookie auth middleware, Title-case roles, Pending/Active/Inactive statuses, invitation-based user creation, Azure Email Service with Handlebars templates, 5-min resend rate limit, ACTIVE-only password reset, common-password blocklist, and all 10 auth routes.*
