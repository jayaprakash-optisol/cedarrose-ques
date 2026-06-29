# Seed Data

Demo data for the full CedarRose OpsHub flow. Seeds populate all core tables so you can exercise auth, case management, questionnaires, audit, and notifications without manual setup.

## Quick start

```bash
npm run migrate   # apply schema first (if not already done)
npm run seed      # insert demo data (idempotent)
```

Source: `src/db/seeds/`  
Entry point: `src/db/seeds/index.ts`

All inserts run inside a single database transaction. Re-running `npm run seed` is safe — fixed UUIDs and upsert logic prevent duplicates.

## Demo credentials

| Email | Role | Password |
|-------|------|----------|
| `admin@cedarrose.local` | Admin | `Password123` |
| `analyst@cedarrose.local` | Analyst | `Password123` |
| `researcher@cedarrose.local` | Researcher | `Password123` |
| `reviewer@cedarrose.local` | Reviewer | `Password123` |

Login:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "analyst@cedarrose.local",
  "password": "Password123"
}
```

## Questionnaire demo link

Case **`c-seed-001`** has an active secure link:

| Field | Value |
|-------|-------|
| Case ref | `c-seed-001` |
| Token | `cedarrose_demo_link_token_c001` |
| Status | `SENT` |

```http
POST /api/v1/questionnaire/verify-link
Content-Type: application/json

{
  "token": "cedarrose_demo_link_token_c001"
}
```

## File layout

```
src/db/seeds/
├── ids.ts                 # Fixed UUIDs and shared constants
├── users.seed.ts          # users, user_platforms
├── companies.seed.ts      # companies, company_recipient_emails
├── templates.seed.ts      # templates, sections, questions
├── cases.seed.ts          # cases (all statuses)
├── responses.seed.ts      # questionnaire_responses
├── audit.seed.ts          # audit_events
├── notifications.seed.ts  # notifications
└── index.ts               # Transaction orchestrator
```

## Seed order

Seeds run in dependency order inside one transaction:

1. Users (+ platform assignments)
2. Companies (+ recipient emails)
3. Templates (+ sections + questions)
4. Cases
5. Questionnaire responses
6. Audit events
7. Notifications

## What is seeded

### Users (`users`, `user_platforms`)

| Name | Email | Role | Notes |
|------|-------|------|-------|
| Alex Admin | `admin@cedarrose.local` | Admin | Platform Administrator |
| Sarah Analyst | `analyst@cedarrose.local` | Analyst | Senior Analyst, score 87.50 |
| Ravi Researcher | `researcher@cedarrose.local` | Researcher | 128 total reports, score 91.25 |
| Nina Reviewer | `reviewer@cedarrose.local` | Reviewer | QA Reviewer |

Platform assignments (`questionnaire` platform): Admin, Analyst, Researcher.

### Companies (`companies`, `company_recipient_emails`)

| Company | CRIS / UID | Country | Risk |
|---------|------------|---------|------|
| Acme Trading LLC | `UID-44529` | UAE | Low |
| Gulf Supplies WLL | `UID-88210` | Bahrain | Medium |

Recipient emails:

| Company | Email | Primary |
|---------|-------|---------|
| Acme Trading LLC | `supplier.contact@acmetrading.example` | Yes |
| Acme Trading LLC | `compliance@acmetrading.example` | No |
| Gulf Supplies WLL | `info@gulfsupplies.example` | Yes |

### Templates (`templates`, `sections`, `questions`)

**Active — Supplier Due Diligence Questionnaire** (v1, Supplier)

| Section | Questions |
|---------|-----------|
| Company Information | Legal company name (text, mandatory, prefill) |
| | Commercial registration number (text, mandatory) |
| | Countries of operation (multiselect, mandatory) |
| Compliance & AML | Do you have a written AML policy? (radio, mandatory) |
| | Sanctions screening process description (longtext, optional) |

**Draft — Customer KYC Questionnaire** (v1, Customer, no sections/questions)

### Cases (`cases`)

Seven cases cover every major workflow status:

| Case ref | Order ID | Subject | Status | Company | Notes |
|----------|----------|---------|--------|---------|-------|
| `c-seed-001` | `ORD-2026-0001` | Acme Trading LLC | `SENT` | Acme | Active demo link token |
| `c-seed-002` | `ORD-2026-0002` | Acme Trading LLC — Follow-up | `IN PROGRESS` | Acme | 60% mandatory complete |
| `c-seed-003` | `ORD-2026-0003` | Gulf Supplies WLL | `COMPLETED` | Gulf | Awaiting researcher review |
| `c-seed-004` | `ORD-2026-0004` | Gulf Supplies WLL — Partial | `COMPLETED — MISSING DATA` | Gulf | 75% mandatory complete |
| `c-seed-005` | `ORD-2026-0005` | Acme Trading LLC — Expired Link | `EXPIRED` | Acme | 3 reminders sent |
| `c-seed-006` | `ORD-2026-0006` | Acme Trading — No Email | `PENDING CONTACT` | Acme | No link sent |
| `c-seed-007` | `ORD-2026-0007` | Unknown Entity Ltd | `PENDING LINKAGE & CONTACT` | — | Unlinked company |

Analyst on all cases: Sarah Analyst. Researcher assigned on completed cases: Ravi Researcher.

### Questionnaire responses (`questionnaire_responses`)

| Case | Answers |
|------|---------|
| `c-seed-002` (in progress) | Legal name: Acme Trading LLC; CR number: CR-1234567 |
| `c-seed-003` (completed) | Legal name, CR number, AML policy: Yes |
| `c-seed-004` (missing data) | Legal name only |

### Audit events (`audit_events`)

Lifecycle trail across cases:

| Step | Event | Case | Description |
|------|-------|------|-------------|
| 1 | API Call | `c-seed-001` | Case created (seed) |
| 5 | Link Event | `c-seed-001` | Secure link sent to recipient |
| 9 | Form Activity | `c-seed-002` | Recipient opened questionnaire form |
| 12 | Form Activity | `c-seed-003` | Questionnaire submitted |
| 14 | Researcher Action | `c-seed-003` | Awaiting researcher review (Pending) |

### Notifications (`notifications`)

| Type | Recipient | Case | Read |
|------|-----------|------|------|
| `submission` | Analyst | `c-seed-003` | No |
| `review` | Researcher | `c-seed-003` | No |
| `expired` | Analyst | `c-seed-005` | Yes |
| `reminder` | Analyst | `c-seed-002` | No |

## Not seeded by this script

The following are populated by **SQL migrations**, not the seed runner:

- `countries` — reference country list
- `platform_config` — platform-wide settings

## Fixed UUIDs

All seed entities use stable IDs defined in `src/db/seeds/ids.ts` (prefix pattern `a0000001`–`a0000009`). This keeps foreign keys consistent across re-runs and makes it easy to reference entities in tests or API calls.

Key constants:

```ts
DEMO_LINK_TOKEN = "cedarrose_demo_link_token_c001"
SEED_PASSWORD   = "Password123"
```

## Suggested test flows

### 1. Analyst dashboard

1. Login as `analyst@cedarrose.local`
2. `GET /api/v1/cases` — list all 7 seeded cases
3. `GET /api/v1/cases/c-seed-001` — view sent case with link
4. `GET /api/v1/notifications` — unread submission and stale alerts

### 2. Questionnaire (public)

1. `POST /api/v1/questionnaire/verify-link` with demo token
2. Complete remaining questions for `c-seed-001`
3. Submit and verify case status changes

### 3. Researcher review

1. Login as `researcher@cedarrose.local`
2. `GET /api/v1/cases/c-seed-003` — completed case awaiting review
3. Submit researcher review decision

### 4. Company lookup

1. Login as any user
2. `GET /api/v1/companies/UID-44529` — Acme Trading profile + emails

### 5. Audit trail

1. Login as analyst or admin
2. `GET /api/v1/audit-log?caseId=<uuid>` — filter by seeded case ID from `ids.ts`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `relation does not exist` | Run `npm run migrate` first |
| Login fails | Re-run `npm run seed` to refresh password hashes |
| Duplicate key errors | Check migrations applied; seeds use upsert — report as bug if persists |
| Empty questionnaire | Verify `c-seed-001` exists and token matches `DEMO_LINK_TOKEN` |
