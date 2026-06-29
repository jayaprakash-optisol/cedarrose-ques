# CedarRose OpsHub API

Part of the **cedarrose-opshub** monorepo (`apps/api`). See the [root README](../../README.md) for install and `npm run dev` from the monorepo root.

Express + TypeScript + Drizzle ORM backend for CedarRose OpsHub.

## Stack

- **Express** — HTTP API
- **Drizzle ORM** — PostgreSQL access (PascalCase column mapping for shared DB)
- **Zod** — Request/env validation
- **bcryptjs** — Password hashing (cedarqa-backend aligned)
- **JWT** — Access tokens + questionnaire sessions
- **Azure Communication Services** — Email (optional in dev)

## Quick start

```bash
# From monorepo root (recommended)
cp apps/api/.env.example apps/api/.env
npm install
npm run migrate
npm run dev:api

# Or from this directory
cp .env.example .env
npm install
npm run migrate
npm run dev
```

## API base URL

`/api/v1`

| Area | Routes |
|------|--------|
| Auth | `/auth/login`, `/auth/refresh`, `/auth/me`, invitation & password reset |
| Cases | `/cases`, `/cases/:id`, resend-link, researcher-review, api-push |
| Companies | `/companies/:uid` |
| Audit | `/audit-log` |
| Notifications | `/notifications` |
| Questionnaire (public) | `/questionnaire/*` |
| Admin | `/admin/users`, `/admin/templates`, `/admin/config` |
| Health | `/health` |

## Database

Shares `cedarrose_local` with the existing TypeORM app. Migrations use the shared `migrations` table (timestamps `1763679000000`–`1763679000013`).

```bash
npm run migrate:status
npm run migrate   # first time
npm run seed      # demo data for full OpsHub flow (idempotent)
```

### Seed data (`npm run seed`)

Populates the full OpsHub demo flow (users, companies, templates, cases, responses, audit, notifications). See **[docs/SEED_DATA.md](docs/SEED_DATA.md)** for credentials, case refs, questionnaire token, test flows, and table-by-table reference.

## API documentation (Swagger)

Interactive docs are served when the server is running:

| URL | Description |
|-----|-------------|
| [http://localhost:3000/api/docs](http://localhost:3000/api/docs) | Swagger UI |
| [http://localhost:3000/api/docs/openapi.json](http://localhost:3000/api/docs/openapi.json) | OpenAPI 3.0 JSON spec |

Spec source lives in `src/swagger/` (paths, schemas, and setup are modular).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run migrate` | Run pending SQL migrations |
| `npm run type-check` | TypeScript validation |
