# CedarRose OpsHub — API Reference

Frontend integration guide for the OpsHub backend API.

**Base URL (local):** `http://localhost:3000/api/v1`  
**Swagger UI:** `http://localhost:3000/api/docs`  
**Health check:** `GET http://localhost:3000/health` (no auth)

> **Frontend env:** Set `VITE_API_BASE_URL=http://localhost:3000/api/v1` and `VITE_USE_MOCK=false`.

---

## Table of Contents

1. [Conventions](#1-conventions)
2. [Authentication](#2-authentication)
3. [Frontend ↔ API Field Mapping](#3-frontend--api-field-mapping)
4. [Auth Endpoints](#4-auth-endpoints)
5. [Cases](#5-cases)
6. [Companies](#6-companies)
7. [Audit Log](#7-audit-log)
8. [Notifications](#8-notifications)
9. [Countries](#9-countries)
10. [Admin — Users](#10-admin--users)
11. [Admin — Templates (Form Builder)](#11-admin--templates-form-builder)
12. [Admin — Platform Config](#12-admin--platform-config)
13. [Questionnaire (Public Recipient Flow)](#13-questionnaire-public-recipient-flow)
14. [Enums & Constants](#14-enums--constants)
15. [Error Codes](#15-error-codes)
16. [Frontend Service Wiring Checklist](#16-frontend-service-wiring-checklist)

---

## 1. Conventions

### Response envelope

All JSON endpoints return:

```json
// Success
{
  "success": true,
  "data": { },
  "message": "Optional human-readable message",
  "meta": { "page": 1, "limit": 20, "total": 84 }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "requestId": "uuid"
  }
}
```

- `meta` is present on paginated list endpoints only.
- CSV export endpoints return `text/csv` with `Content-Disposition: attachment` (no JSON envelope).

### Pagination

| Query param | Default | Max | Description |
|-------------|---------|-----|-------------|
| `page` | `1` | — | 1-based page number |
| `limit` | `20` | `100` | Items per page |

### Dates

All timestamps are ISO 8601 strings (`2026-06-24T14:33:25.126Z`).

### IDs

- API uses **UUIDs** for entity primary keys (`userId`, `caseId`, `templateId`, …).
- Cases also expose a human-readable `caseRef` (e.g. `c-001`).

### Roles (API)

API roles use **PascalCase**:

`Researcher` | `Reviewer` | `Analyst` | `Admin`

The web mock uses lowercase (`admin`, `researcher`, …). Map accordingly in the frontend.

---

## 2. Authentication

### Staff login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@cedarrose.local",
  "password": "Password123",
  "rememberMe": false
}
```

**Response `data`:**

```json
{
  "user": { "userId": "...", "email": "...", "firstName": "...", "lastName": "...", "role": "Admin", "status": "Active", ... },
  "token": "<JWT access token>",
  "refreshToken": "<only when rememberMe is true>"
}
```

Also sets httpOnly cookies: `access_token`, and `refresh_token` when `rememberMe` is true.

### Authenticated requests

Send the JWT on every protected route:

```http
Authorization: Bearer <access_token>
```

Cookies are also supported (`access_token` cookie is auto-read).

### Role guards

| Guard | Routes |
|-------|--------|
| Any authenticated user | `/cases`, `/companies/:uid`, `/audit-log`, `/notifications`, `/auth/me` |
| `Admin` only | `/admin/*` |
| `Researcher` or `Admin` | `PATCH /cases/:id/researcher-review` |
| `Admin` or `Analyst` | `GET /cases/export` |

### Demo credentials (after `npm run seed`)

| Email | Password | Role |
|-------|----------|------|
| `admin@cedarrose.local` | `Password123` | Admin |
| `analyst@cedarrose.local` | `Password123` | Analyst |
| `researcher@cedarrose.local` | `Password123` | Researcher |
| `reviewer@cedarrose.local` | `Password123` | Reviewer |

---

## 3. Frontend ↔ API Field Mapping

Use this when replacing mocks in `cedarrose-opshub-web`.

### User / CurrentUser

| Web mock (`types/user.ts`) | API response |
|----------------------------|--------------|
| `id` | `userId` |
| `name` | `` `${firstName} ${lastName}` `` |
| `role` (lowercase) | `role` (PascalCase — map to lowercase in UI) |
| `status` | `status` (+ `"Pending"` for invited users) |
| `title` | `title` |
| `initials` | `initials` |
| `platforms` (string[]) | Not in list response — load via separate call if needed |

**`GET /auth/me`** replaces `authService.getCurrentUser()`.

### Case

| Web mock (`types/case.ts`) | API response |
|----------------------------|--------------|
| `id` | `caseId` (UUID) or display `caseRef` (`c-001`) |
| `uid` | Company `crisNumber` via joined `companyId` |
| `completionMandatory.done/total` | `completionMandatory` / `completionOptional` are **percentages** (0–100 integers) |
| `requestedDate` | `dateReceived` |
| `analyst` (name string) | `analystId` (UUID — resolve name client-side or extend API) |
| `link.expiresAt` | `linkExpiry` |
| `link.resentCount` | `resentCount` |
| `researcherName` | Resolve from `assignedResearcherId` |
| `companyData` | Join company via `companyId` / `GET /companies/:uid` |

### Company

| Web mock | API |
|----------|-----|
| `companyName` | `companyName` |
| `registrationNumber` | `crisNumber` |
| `recipientEmails` | `recipientEmails[]` (on detail response) |
| `additionalFields.incorporationDate` | `incorporationDate` |
| `additionalFields.legalStructure` | `legalStructure` |
| `additionalFields.primaryIndustry` | `primaryIndustry` |

**Lookup:** `GET /companies/:uid` where `:uid` is the CRiS number (e.g. `UID-44529`).

### Notification

| Web mock | API |
|----------|-----|
| `id` | `notificationId` |
| `time` | `createdAt` |
| `read` | `read` |

### Template (Form Builder)

| Web mock | API |
|----------|-----|
| `id` | `templateId` |
| `name` | `name` |
| `recipientType` | `recipientType` |
| `status` | `status` (`Active` \| `Draft`) |
| `lastEdited` | `updatedAt` |
| `editor` | Resolve from `updatedBy` |
| `sections[].questions[].text` | `sections[].questions[].label` |
| `sections[].questions[].type` | `sections[].questions[].fieldType` |
| `sections[].questions[].required` | `sections[].questions[].mandatory` |

### Platform Config

| Web mock (`types/config.ts`) | API (`platform_config`) |
|------------------------------|-------------------------|
| `linkValidity` | `linkValidityDays` |
| `tokenType` | `tokenType` |
| `tokenHours` / `tokenMinutes` | `tokenExpiryValue` + `tokenExpiryUnit` |
| `otpExpiry` | `otpExpiryMinutes` |
| `otpRetry` | `otpMaxAttempts` |
| `r1` / `r2` / `r3` | `reminder1Day` / `reminder2Day` / `reminderFinalDay` |
| `expiry` | `expiryDay` |
| `gamification` | `gamificationEnabled` |
| `tier1Title` / `tier1Desc` | `tier1Label` / `tier1Description` |
| `tier2Title` / `tier2Desc` | `tier2Label` / `tier2Description` |
| `autoA` / `manualB` / `alertCD` | `autoProcessA` / `manualProcessB` / `alertCd` |
| `auditRetention` | `auditRetentionDays` |
| `staleHours` | `staleHours` |

---

## 4. Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/login` | Public | Login with email + password |
| `POST` | `/auth/refresh` | Public | Rotate access token (cookie or body `refreshToken`) |
| `POST` | `/auth/logout` | Public | Revoke refresh token, clear cookies |
| `GET` | `/auth/me` | JWT | Current user profile |
| `POST` | `/auth/change-password` | JWT | Change own password |
| `POST` | `/auth/forgot-password` | Public | Request password reset email |
| `POST` | `/auth/reset-password` | Public | Reset password with token |
| `GET` | `/auth/verify-invitation` | Public | Validate invitation token (read-only) |
| `POST` | `/auth/complete-registration` | Public | Set password + activate invited user |

### `POST /auth/login`

**Body:**

```json
{
  "email": "admin@cedarrose.local",
  "password": "Password123",
  "rememberMe": false
}
```

**Success:** `200` — `{ user, token, refreshToken? }`  
**Errors:** `401 AUTH_INVALID_CREDENTIALS`, `403 ACCOUNT_DISABLED`

---

### `GET /auth/me`

**Success:** `200` — User object (no password).

Maps to web `CurrentUser` after transforming `userId` → `id`, building `name`, lowercasing `role`.

---

### `GET /auth/verify-invitation?token=<hex>`

**Read-only** — does NOT update the database.

**Success:** `200`

```json
{
  "firstName": "Test",
  "lastName": "User",
  "role": "Admin",
  "email": "user@example.com"
}
```

**Errors:** `400` Invalid or expired invitation

---

### `POST /auth/complete-registration`

**Body:**

```json
{
  "token": "<invitation token from email link>",
  "password": "NewSecurePassword123!"
}
```

**Success:** `200` — `"Registration complete"`  
**Side effects:** User `status` → `Active`, password set, invitation `used` → `true`

---

### `POST /auth/forgot-password`

**Body:** `{ "email": "user@example.com" }`  
**Success:** `200` — always returns success message (no email enumeration)

---

### `POST /auth/reset-password`

**Body:**

```json
{
  "token": "<reset token from email>",
  "newPassword": "NewSecurePassword123!"
}
```

---

### `POST /auth/change-password`

**Body:**

```json
{
  "currentPassword": "Password123",
  "newPassword": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```

**Success:** `200` — clears auth cookies; user must log in again.

---

## 5. Cases

All routes require JWT.

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/cases` | Any | List cases (paginated, filterable) |
| `GET` | `/cases/:id` | Any | Case detail + responses |
| `POST` | `/cases` | Any | Create new questionnaire request |
| `PATCH` | `/cases/:id/resend-link` | Any | Regenerate + resend secure link |
| `PATCH` | `/cases/:id/researcher-review` | Researcher, Admin | Submit researcher decision |
| `PATCH` | `/cases/:id/api-push` | Admin | Trigger API push to CedarRose |
| `GET` | `/cases/export` | Admin, Analyst | Export cases CSV |

### `GET /cases` — Query params

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by `CaseStatus` |
| `recipientType` | string | `Supplier`, `Customer`, `Partner`, `Business Analytics Report` |
| `country` | string | Country name |
| `analystId` | UUID | Filter by analyst |
| `search` | string | Search `subjectName` or `orderId` |
| `page` | number | Page (default 1) |
| `limit` | number | Page size (default 20, max 100) |

**Response `data`:** `Case[]` with pagination `meta`.

### Case object (API)

```typescript
{
  caseId: string;           // UUID
  caseRef: string;          // e.g. "c-001"
  orderId: string;
  companyId: string | null;
  subjectName: string;
  country: string;
  recipientType: RecipientType;
  status: CaseStatus;
  completionMandatory: number;   // 0–100 %
  completionOptional: number;    // 0–100 %
  dateSubmitted: string | null;
  dateReceived: string;
  lastActivity: string | null;
  analystId: string | null;
  assignedResearcherId: string | null;
  researcherStatus: string | null;
  researcherNotes: string | null;
  researcherReviewedAt: string | null;
  apiPushStatus: "Pending" | "Success" | "Failed" | null;
  apiPushAt: string | null;
  currentStep: number;           // 1–16
  linkExpiry: string | null;
  linkValidityHours: number;
  remindersSent: number;
  resentCount: number;
  templateId: string | null;
  templateVersion: number;
  createdAt: string;
  updatedAt: string;
}
```

### `POST /cases` — Create (New Request wizard)

**Body:**

```json
{
  "orderId": "ORD-12345",
  "uid": "UID-44529",
  "subjectName": "Acme Trading LLC",
  "country": "United Arab Emirates",
  "recipientType": "Supplier",
  "recipientEmail": "contact@acme.com",
  "linkValidityHours": 48,
  "templateId": "uuid-optional",
  "analystId": "uuid-optional"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `orderId` | Yes | |
| `subjectName` | Yes | |
| `country` | Yes | |
| `recipientType` | Yes | |
| `uid` | No | CRiS company UID |
| `recipientEmail` | No | Absence → `PENDING CONTACT` status |
| `linkValidityHours` | No | 24–72, default 48 |
| `templateId` | No | Auto-assigned by `recipientType` if omitted |
| `analystId` | No | Defaults to requester |

**Success:** `201`  
**Errors:** `400 EMAIL_TYPO_DETECTED` (`.con`, `.cm`, `@gmial.` patterns)

**Status logic:**

| Condition | Initial status |
|-----------|----------------|
| No UID and no email | `PENDING LINKAGE & CONTACT` |
| No email | `PENDING CONTACT` |
| Has email | `SENT` (link generated + emailed) |

---

### `PATCH /cases/:id/resend-link`

**Body:** none  
**Success:** `200` — updated case; resets `remindersSent`, increments `resentCount`, new `linkExpiry`

---

### `PATCH /cases/:id/researcher-review`

**Body:**

```json
{
  "decision": "Approved",
  "notes": "Optional reviewer notes"
}
```

`decision`: `Approved` | `Flagged` | `Rejected`

---

## 6. Companies

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/companies/:uid` | Any | Lookup by CRiS UID |
| `GET` | `/companies` | Admin | List all companies |
| `POST` | `/companies` | Admin | Create company |
| `PATCH` | `/companies/:uid` | Admin | Update company |

### `GET /companies/:uid`

**Success:** `200`

```json
{
  "companyId": "uuid",
  "companyName": "Acme Trading LLC",
  "crisNumber": "UID-44529",
  "country": "United Arab Emirates",
  "riskRating": "Low",
  "legalStructure": "LLC",
  "primaryIndustry": "Trading",
  "incorporationDate": "2010-05-15",
  "recipientEmails": ["contact@acme.com"]
}
```

**Errors:** `404` if UID not found or contains `NOTFOUND`

Maps to web `CompanyData` for the New Request wizard (Step B).

---

## 7. Audit Log

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/audit-log` | Any | List audit events |
| `GET` | `/audit-log/export` | Admin | Export CSV |

### `GET /audit-log` — Query params

| Param | Type | Description |
|-------|------|-------------|
| `caseId` | UUID | Filter by case |
| `type` | string | `API Call`, `Link Event`, `Authentication`, `Form Activity`, `Researcher Action`, `API Push` |
| `status` | string | `Success`, `Failed`, `Pending` |
| `from` | ISO date | Start of range |
| `to` | ISO date | End of range |
| `page`, `limit` | number | Pagination |

### AuditEvent object

```typescript
{
  auditId: string;
  caseId: string | null;
  caseSubject: string | null;
  caseOrderId: string | null;
  step: number | null;          // 1–16 workflow step
  eventType: AuditEventType;
  description: string;
  triggeredBy: string | null;
  triggeredByUserId: string | null;
  status: "Success" | "Failed" | "Pending";
  payload: object | null;
  createdAt: string;
}
```

Web route: `/audit-log?caseId=<uuid>` maps to `caseId` query param.

---

## 8. Notifications

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/notifications` | List notifications for current user |
| `PATCH` | `/notifications/:id/read` | Mark one as read |
| `PATCH` | `/notifications/read-all` | Mark all as read |
| `DELETE` | `/notifications/:id` | Delete notification |

### Notification object

```typescript
{
  notificationId: string;
  userId: string;
  type: "submission" | "expired" | "blocked" | "reminder" | "review" | "api";
  title: string;
  body: string;
  read: boolean;
  caseId: string | null;
  createdAt: string;
}
```

Scoped to the authenticated user — no `userId` filter needed.

---

## 9. Countries

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/countries` | List all countries |

**Success:** `200` — `{ countryId, name, code }[]`

---

## 10. Admin — Users

All routes require JWT + `Admin` role.  
Base path: `/admin/users`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List users |
| `POST` | `/invite` | Invite new user (transactional — rolls back if email fails) |
| `PATCH` | `/:id` | Update user |
| `DELETE` | `/:id` | Deactivate user (soft delete → `Inactive`) |
| `POST` | `/:id/resend-invitation` | Resend invitation email |
| `DELETE` | `/:id/invitations` | Cancel pending invitation |
| `GET` | `/export` | Export users CSV |

### `POST /admin/users/invite`

**Body:**

```json
{
  "firstName": "Jay",
  "lastName": "Prakash",
  "email": "jay@example.com",
  "role": "Researcher",
  "platforms": [
    { "platform": "questionnaire", "role": "Admin" }
  ]
}
```

| Field | Required | Values |
|-------|----------|--------|
| `firstName`, `lastName`, `email`, `role` | Yes | |
| `platforms` | No | `platform`: `automation` \| `questionnaire` |

**Success:** `201` — User created with `status: "Pending"`, invitation email sent  
**Errors:** `409` duplicate email, `502 EMAIL_SEND_FAILED` (no user persisted on email failure)

### Invitation flow (2 steps)

```
1. GET  /auth/verify-invitation?token=...   → read-only, returns user info
2. POST /auth/complete-registration         → sets password, activates account
```

Email link format: `{FRONTEND_URL}/complete-registration?token=<hex>`

---

## 11. Admin — Templates (Form Builder)

All routes require JWT + `Admin` role.  
Base path: `/admin/templates`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List templates (summary) |
| `GET` | `/:id` | Full template with sections + questions |
| `POST` | `/` | Create template |
| `PUT` | `/:id` | Replace full template (sections + questions) |
| `PATCH` | `/:id/status` | Activate or draft |
| `DELETE` | `/:id` | Delete (Draft only) |

### `POST /admin/templates`

**Body:**

```json
{
  "name": "Standard Due Diligence — Supplier",
  "description": "Optional description",
  "recipientType": "Supplier",
  "sections": []
}
```

### `PUT /admin/templates/:id` — Full save (Form Builder "Save template")

**Body:**

```json
{
  "name": "Standard Due Diligence — Supplier",
  "description": "...",
  "recipientType": "Supplier",
  "sections": [
    {
      "title": "General Company Information",
      "description": "Optional",
      "banner": "Optional info banner",
      "orderIndex": 0,
      "questions": [
        {
          "label": "Full Legal Name",
          "fieldType": "text",
          "mandatory": true,
          "prefill": true,
          "helpText": "Max 200 characters",
          "validation": { "maxLength": 200 },
          "orderIndex": 0
        }
      ]
    }
  ]
}
```

### Question `fieldType` values

`text` | `longtext` | `number` | `date` | `dropdown` | `radio` | `multiselect` | `file` | `table` | `esign` | `toggle` | `url` | `support_doc`

### `PATCH /admin/templates/:id/status`

**Body:** `{ "status": "Active" }` or `{ "status": "Draft" }`

Cannot activate template with zero sections or zero mandatory questions.

---

## 12. Admin — Platform Config

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/config` | Get platform config |
| `PUT` | `/admin/config` | Replace full config |

### PlatformConfig object

```typescript
{
  configId: string;
  linkValidityDays: number;
  tokenType: "single-use" | "time-based";
  tokenExpiryValue: number;
  tokenExpiryUnit: "hours" | "minutes";
  otpLength: number;
  otpExpiryMinutes: number;
  otpMaxAttempts: number;
  reminder1Day: number;
  reminder2Day: number;
  reminderFinalDay: number;
  expiryDay: number;
  gamificationEnabled: boolean;
  tier1Label: string | null;
  tier1Description: string | null;
  tier2Label: string | null;
  tier2Description: string | null;
  autoProcessA: boolean;
  manualProcessB: boolean;
  alertCd: boolean;
  auditRetentionDays: number;
  exportFormat: string;
  staleHours: number;
  updatedAt: string;
}
```

Single-row table — always one config record.

---

## 13. Questionnaire (Public Recipient Flow)

No staff JWT required. Base path: `/questionnaire`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/verify-link` | Public | Validate secure link token |
| `POST` | `/authenticate` | Public | Request OTP email |
| `POST` | `/otp-verify` | Public | Verify OTP → questionnaire JWT |
| `GET` | `/:token/form` | Questionnaire JWT | Get form questions |
| `POST` | `/:token/save` | Questionnaire JWT | Auto-save progress |
| `POST` | `/:token/submit` | Questionnaire JWT | Final submission |

### Flow

```
1. POST /verify-link        { "token": "<raw link token>" }
2. POST /authenticate       { "token": "...", "email": "recipient@example.com" }
3. POST /otp-verify         { "token": "...", "otp": "123456" }
   → returns { questionnaireToken }  (use as Bearer for steps 4–6)
4. GET  /:token/form        Authorization: Bearer <questionnaireToken>
5. POST /:token/save        { "responses": [...] }
6. POST /:token/submit
```

### `POST /questionnaire/:token/save`

**Body:**

```json
{
  "responses": [
    {
      "questionId": "uuid-optional",
      "sectionId": "uuid-optional",
      "question": "Full Legal Name",
      "answer": "Acme Trading LLC",
      "mandatory": true
    }
  ]
}
```

### Submission status logic

| Condition | Case status after submit |
|-----------|--------------------------|
| All mandatory fields filled | `COMPLETED` |
| Mandatory missing | `COMPLETED — MISSING DATA` |

### Demo questionnaire token (after seed)

```http
POST /api/v1/questionnaire/verify-link
{ "token": "cedarrose_demo_link_token_c001" }
```

Case ref: `c-seed-001`

---

## 14. Enums & Constants

### CaseStatus

`SENT` | `OPENED` | `IN PROGRESS` | `COMPLETED` | `COMPLETED — MISSING DATA` | `PENDING CONTACT` | `PENDING LINKAGE & CONTACT` | `EXPIRED` | `NOT SENT`

### RecipientType

`Supplier` | `Customer` | `Partner` | `Business Analytics Report`

### ResearcherStatus

`Not Applicable` | `Awaiting Review` | `Approved` | `Flagged` | `Rejected`

### UserRole

`Researcher` | `Reviewer` | `Analyst` | `Admin`

### UserStatus

`Active` | `Inactive` | `Pending`

### AuditEventType

`API Call` | `Link Event` | `Authentication` | `Form Activity` | `Researcher Action` | `API Push`

### NotificationType

`submission` | `expired` | `blocked` | `reminder` | `review` | `api`

### 16-step workflow (`currentStep` 1–16)

1. Order received → 2. Validate order ID → 3. Fetch company data → 4. Apply template → 5. Generate secure link → 6. Send link → 7. Recipient opens link → 8. Authentication (OTP) → 9. Begin questionnaire → 10. Save progress → 11. Mandatory complete → 12. Submit → 13. Submission received → 14. Researcher review → 15. Data mapping → 16. API push

---

## 15. Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Insufficient role |
| `ACCOUNT_DISABLED` | 403 | User is Inactive |
| `VALIDATION_ERROR` | 422 | Zod validation failed |
| `INVALID_JSON` | 400 | Malformed request body |
| `CASE_NOT_FOUND` | 404 | Case UUID not found |
| `EMAIL_TYPO_DETECTED` | 400 | Suspected email typo |
| `EMAIL_SEND_FAILED` | 502 | Azure email could not be sent |
| `DUPLICATE_EMAIL` | 409 | User email already exists |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

---

## 16. Frontend Service Wiring Checklist

Update `cedarrose-opshub-web/src/services/api/client.ts`:

| Mock service | API implementation |
|--------------|-------------------|
| `authService.getCurrentUser()` | `GET /auth/me` + store JWT from login |
| `casesService.list()` | `GET /cases` |
| `casesService.getById(id)` | `GET /cases/:id` |
| `casesService.resendLink(id)` | `PATCH /cases/:id/resend-link` |
| `auditService.list()` | `GET /audit-log` |
| `companiesService.getByUid(uid)` | `GET /companies/:uid` |
| `usersService.list()` | `GET /admin/users` |
| `usersService.save(users)` | Split into `POST /invite`, `PATCH /:id` per user |
| `templatesService.list()` | `GET /admin/templates` |
| `templatesService.save(templates)` | `PUT /admin/templates/:id` per template |
| `configService.get()` | `GET /admin/config` |
| `configService.save(config)` | `PUT /admin/config` |
| `notificationsService.list()` | `GET /notifications` |

### Recommended `apiClient` pattern

```typescript
export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken(); // from login response or cookie
  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...init?.headers,
    },
  });

  const body = await res.json();

  if (!body.success) {
    throw new ApiError(body.error.code, body.error.message, res.status);
  }

  return body.data as T;
}
```

### Pages → endpoints map

| Web page / feature | Primary endpoints |
|--------------------|-------------------|
| Login | `POST /auth/login` |
| Dashboard | `GET /cases` (derive metrics client-side) |
| All Cases | `GET /cases`, `GET /cases/:id`, `PATCH /cases/:id/resend-link` |
| New Request | `GET /companies/:uid`, `POST /cases` |
| Audit Log | `GET /audit-log?caseId=` |
| Notifications bell | `GET /notifications`, `PATCH /notifications/:id/read` |
| Form Builder | `GET/POST/PUT /admin/templates` |
| Configuration | `GET/PUT /admin/config` |
| User Management | `GET/POST /admin/users`, `PATCH /admin/users/:id` |
| Complete Registration | `GET /auth/verify-invitation`, `POST /auth/complete-registration` |

---

*Generated from `cedarrose-opshub-api` — matches live routes in `src/app.ts` and Swagger at `/api/docs`.*
