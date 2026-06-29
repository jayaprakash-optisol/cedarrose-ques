# CedarRose OpsHub — Production Web App

Part of the **cedarrose-opshub** monorepo (`apps/web`). See the [root README](../../README.md) for install and `npm run dev` from the monorepo root.

Production-grade React SPA migrated from the Lovable TanStack Start template. UI and behavior match the original OpsHub dashboard; data is served from JSON fixtures until the backend is ready.

## Quick start (from monorepo root)

```bash
npm install
npm run dev:web
```

Or from this directory:

```bash
npm install
npm run dev
```

App runs at http://localhost:5174

## Environment

Copy `.env.example` to `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_USE_MOCK` | `true` | Use JSON fixtures from `src/mocks/data/` |
| `VITE_API_BASE_URL` | `http://localhost:3000/api` | API base URL when mock mode is off |

## Routes

| Path | Page |
|------|------|
| `/` | Overview dashboard |
| `/cases` | All cases |
| `/new-request` | New questionnaire wizard |
| `/audit-log` | Audit log |
| `/settings` | User settings |
| `/admin/form-builder` | Form builder |
| `/admin/configuration` | Platform configuration |
| `/admin/users` | User management |

## Project structure

```
src/
  app/           # Router, providers, auth context
  components/    # Layout, common, shadcn/ui
  config/        # Env and workflow constants
  features/      # Feature pages and components
  mocks/data/    # JSON test fixtures
  services/      # API-ready service layer (mock + API stubs)
  types/         # Shared TypeScript types
```

## API integration (later)

Set `VITE_USE_MOCK=false` and implement the `api/*.service.ts` stubs in `src/services/api/client.ts`. Components use services only — no changes required in UI code.

Suggested endpoints:

- `GET /cases`, `GET /cases/:id`, `POST /cases/:id/resend-link`
- `GET /audit-log`
- `GET /companies/:uid`
- `GET/PUT /admin/users`, `GET/PUT /admin/templates`, `GET/PUT /admin/config`
- `GET /notifications`

## Build

```bash
npm run build
npm run preview
```
