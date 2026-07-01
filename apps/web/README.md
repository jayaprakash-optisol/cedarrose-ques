# CedarRose OpsHub — Production Web App

Part of the **cedarrose-opshub** monorepo (`apps/web`). See the [root README](../../README.md) for install and `npm run dev` from the monorepo root.

Production-grade React SPA for the CedarRose OpsHub dashboard. All data is loaded from the Express API via the service layer in `src/services/`.

## Quick start (from monorepo root)

```bash
npm install
npm run dev
```

Or web only (requires API at http://localhost:3000):

```bash
npm run dev:web
```

App runs at http://localhost:5174

## Environment

Copy `.env.example` to `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `/api/v1` | API base URL (relative in dev so Vite proxies to the API) |
| `VITE_QA_AUTOMATION_URL` | _(empty)_ | Optional external QA automation app URL |

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
  config/        # Env, workflow constants, static lists
  features/      # Feature pages and components
  services/      # API client and service facades
  types/         # Shared TypeScript types
```

## Build

```bash
npm run build
npm run preview
```
