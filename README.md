# CedarRose OpsHub Monorepo

npm workspaces monorepo for the CedarRose OpsHub platform. Application code lives in `apps/` — no business logic or UI changes from the standalone layout.

## Structure

```
cedarrose-opshub/
├── apps/
│   ├── web/          # React + Vite SPA (cedarrose-opshub-web)
│   └── api/          # Express + Drizzle API (cedarrose-opshub-api)
├── package.json      # Workspace root scripts
└── README.md
```

## Prerequisites

- Node.js 20+
- PostgreSQL (`cedarrose_local` database)

## Quick start

```bash
# From monorepo root
npm install

# Configure API (once)
cp apps/api/.env.example apps/api/.env
# Edit JWT secrets (min 32 chars) and database credentials

# Configure web (once)
cp apps/web/.env.example apps/web/.env

# Database setup (API)
npm run migrate

# Run both apps
npm run dev
```

| App | URL |
|-----|-----|
| Web | http://localhost:5174 |
| API | http://localhost:3000 |
| Swagger (dev) | http://localhost:3000/api/docs |

The web dev server proxies `/api` → `localhost:3000`, so cookies and relative API paths work unchanged.

## Root scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start web + API concurrently |
| `npm run dev:web` | Web only |
| `npm run dev:api` | API only |
| `npm run build` | Build API then web |
| `npm run migrate` | Run API database migrations |
| `npm run type-check` | Type-check both packages |
| `npm run lint` | Lint all workspaces |

## Per-app docs

- [apps/web/README.md](apps/web/README.md) — frontend routes, env vars, UI structure
- [apps/api/README.md](apps/api/README.md) — API routes, database, Swagger

## Cursor / IDE

Open the **`cedarrose-opshub`** folder as your workspace root (not `apps/web` or `apps/api` individually) so both packages are available.
