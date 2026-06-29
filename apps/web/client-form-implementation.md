# Client Questionnaire Form — Implementation Plan

> **Status:** Implemented  
> **Feature:** End-to-end questionnaire form — secure link dispatch → OTP auth → multi-section form → live step tracking

---

## 1. What Was Built

### Recipient-facing public pages (no auth required)

| Route | Page | Description |
|---|---|---|
| `/q/:token` | `QuestionnaireLandingPage` | Verifies link, shows "Send verification code" |
| `/q/:token/otp` | `QuestionnaireOtpPage` | 6-digit OTP entry with countdown timer |
| `/q/:token/form` | `QuestionnaireFormPage` | Multi-section form with auto-save and draft restore |
| `/q/:token/expired` | `QuestionnaireExpiredPage` | Shown when link is invalid/expired |

### Admin side improvements

- `CaseDetailPanel` workflow timeline now shows **per-step timestamps** (not the same `lastActivity` for all)
- `AuditLogPage` expanded timeline now uses **dynamic `buildTimeline()`** derived from `caseRecord.stepTimestamps` instead of hardcoded map

### API improvements

- `POST /questionnaire/verify-link` now returns `maskedEmail` (e.g. `s***@company.com`)
- `GET /api/v1/cases/:id` now includes `stepTimestamps: Record<number, string>` from `audit_events`

---

## 2. New Files

```
apps/web/src/
├── types/
│   └── questionnaire.ts                  — LinkVerifyResult, QSessionState, FormResponse, QuestionnaireFormData
├── services/
│   ├── mock/questionnaire.mock.ts         — Mock OTP flow + form (uses in-memory Maps)
│   └── api/questionnaire.ts              — Real API calls to /api/v1/questionnaire/*
└── features/questionnaire/
    ├── components/
    │   ├── QuestionnaireShell.tsx         — Dark navy header layout (not AppShell)
    │   ├── OtpInputGroup.tsx              — 6 individual digit input boxes
    │   ├── SectionNavigator.tsx           — Numbered circles with done/current/todo states
    │   ├── QuestionField.tsx              — Renders any FieldType from template.ts
    │   └── SaveIndicator.tsx              — "● All changes saved" / "Saving..." indicator
    └── pages/
        ├── QuestionnaireLandingPage.tsx   — OTP landing (Image 2)
        ├── QuestionnaireOtpPage.tsx       — OTP verification (Image 3)
        ├── QuestionnaireFormPage.tsx      — Multi-section form (Image 4)
        └── QuestionnaireExpiredPage.tsx   — Expired link screen
```

---

## 3. Modified Files

| File | Change |
|---|---|
| `apps/web/src/app/router.tsx` | Added 4 public `/q/:token/*` routes before `AuthGuard` |
| `apps/web/src/services/index.ts` | Added `questionnaireService` export |
| `apps/web/src/types/index.ts` | Re-exports `questionnaire.ts` |
| `apps/web/src/types/case.ts` | Added `stepTimestamps?: Record<number, string>` to `CaseRecord` |
| `apps/web/src/services/api/mappers.ts` | Added `stepTimestamps` to `ApiCase` interface and `mapCase()` |
| `apps/web/src/features/cases/components/CaseDetailPanel.tsx` | Uses `stepTimestamp(c, num)` per step |
| `apps/web/src/features/audit-log/pages/AuditLogPage.tsx` | Replaced hardcoded `CASE_TIMELINES` with `buildTimeline()` |
| `apps/web/src/mocks/data/cases.json` | Added `stepTimestamps` to all 10 cases |
| `apps/api/src/modules/questionnaire/questionnaire.service.ts` | Added `maskEmail()`, returns `maskedEmail` in `verifyLink` |
| `apps/api/src/modules/cases/cases.repository.ts` | `findById()` now also fetches step timestamps from `audit_events` |

---

## 4. Secure Token Flow

```
Admin creates case → generateSecureToken(48) → rawToken in email URL
                                             → SHA-256 hash in cases.LinkTokenHash

/q/:rawToken → POST /questionnaire/verify-link
  → hashToken(rawToken) matches DB → checks linkExpiry > now()
  → returns { caseId, subjectName, recipientType, maskedEmail }

→ POST /questionnaire/authenticate { token, email }
  → generates 6-digit OTP → SHA-256 stored in questionnaire_otps
  → OTP emailed to recipient

→ POST /questionnaire/otp-verify { token, otp }
  → hash match + expiry (10 min) + attempt limit (max 3)
  → returns { sessionToken: JWT(15min, QUESTIONNAIRE_JWT_SECRET), caseId }

→ GET /questionnaire/:token/form  Authorization: Bearer <sessionToken>
  → returns { case, template: { sections[{ questions[] }] } }

→ POST /questionnaire/:token/save  { responses[] }
  → upserts questionnaire_responses, updates lastActivity, logs step 10

→ POST /questionnaire/:token/submit
  → computes completion %, sets status COMPLETED or COMPLETED—MISSING DATA, logs step 12
```

---

## 5. sessionStorage Keys

The public questionnaire pages use `sessionStorage` (not `localStorage`) for the JWT:

| Key | Value |
|---|---|
| `q_session_<rawToken>` | `QSessionState` JSON: `{ caseId, subjectName, recipientType, maskedEmail, sessionToken?, savedAt? }` |

`sessionToken` is written after successful OTP verification. All pages check for this and redirect as needed.

---

## 6. Mock Mode Development

When `VITE_USE_MOCK=true`:

1. Navigate to `/q/any-token`
2. Click "Send verification code"
3. **Check browser console** for: `[mock OTP] Token: any-token | Email: ... | Code: XXXXXX`
4. Enter the 6-digit code on `/q/any-token/otp`
5. Complete the form at `/q/any-token/form`

The mock questionnaire service serves the first template from `templates.json` (Supplier template, 875-line full structure with all sections and questions).

---

## 7. Form Auto-save Behaviour

- **Debounced 2 seconds** after any field change → `POST /questionnaire/:token/save`
- **Manual save** via "Save progress" button → immediate `persistSave()`
- On save success → `savedAt` updated in component state + sessionStorage
- On reload → `savedResponses` from `getForm()` response restores state, shows "Welcome back" banner

---

## 8. Workflow Step Tracking

Steps 1–16 per case, derived from `audit_events.Step` column:

| Step | Event |
|---|---|
| 1 | Order received |
| 2 | Validate order ID |
| 3 | Fetch company data |
| 4 | Apply questionnaire template |
| 5 | Generate secure link |
| 6 | Send link to recipient |
| 7 | Recipient opens link |
| 8 | Authentication (OTP) |
| 9 | Recipient begins questionnaire |
| 10 | Recipient saves progress |
| 11 | Mandatory fields complete |
| 12 | Recipient submits |
| 13 | Submission received |
| 14 | Researcher review |
| 15 | Data mapping |
| 16 | API push to CedarRose Data Exchange |

`CaseRecord.currentStep` determines which steps appear as done/current/todo in both `CaseDetailPanel` and `AuditLogPage` expanded timelines.

---

## 9. Security Notes

- `sessionToken` (JWT) stored only in `sessionStorage` — clears on tab close
- Raw link token in URL is never stored in DB — only SHA-256 hash
- OTP is SHA-256 hashed in `questionnaire_otps` — plaintext only in email
- Max 3 OTP attempts enforced server-side; after 3 failures link is effectively locked
- All access attempts logged in `audit_events` (step 7 = link opened, step 8 = authenticated)
- Link expiry enforced at DB level: `linkExpiry > now()` in `findByLinkHash()`
