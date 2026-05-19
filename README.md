# Vendor Portal Monorepo

Vendor Portal is a pnpm workspace monorepo with one React frontend and two backend services:

- `frontend/` for the customer-facing web app
- `hana-backend/` for SAP HANA-connected APIs and SAP Service Layer integrations
- `sql-backend/` for SQL Server-backed APIs and migration workflows

The repository is organized so each package can be developed independently while the root coordinates common tasks such as build, format, lint, and port cleanup.

## Repository Layout

```text
vendor-portal/
  README.md
  AGENTS.md
  package.json
  pnpm-lock.yaml
  frontend/
  hana-backend/
  sql-backend/
```

## Stack Overview

- **Package manager:** pnpm workspaces
- **Frontend:** React 19, Vite, TanStack Router, React Query, Zustand, Tailwind CSS v4
- **HANA backend:** Express, TypeORM, SAP HANA client, SAP Service Layer, Swagger
- **SQL backend:** Express, TypeORM, SQL Server, migrations, Swagger

## Prerequisites

- Node.js 20+
- pnpm 11+
- Access to the SAP HANA and SQL Server environments required by the backends
- Valid SAP Service Layer credentials for HANA-backed transactional flows

## Quick Start

Install dependencies from the repository root:

```bash
pnpm install
```

Run the frontend and both backends separately as needed:

```bash
pnpm dev:frontend
pnpm dev:hana-backend
pnpm dev:sql-backend
```

## Common Root Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev:frontend` | Start the Vite frontend on port 5173 |
| `pnpm dev:hana-backend` | Start the HANA backend on port 4000 |
| `pnpm dev:sql-backend` | Start the SQL backend on port 4001 |
| `pnpm build` | Clean, lint, format, and build all packages |
| `pnpm test` | Run the HANA backend test suite |
| `pnpm lint` | Run Oxlint |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Run Oxfmt |
| `pnpm format:check` | Check formatting only |
| `pnpm check` | Run lint fix + format |
| `pnpm fix` | Same as `check` |

## Local Development Ports

- Frontend: `http://localhost:5173`
- HANA backend: `http://localhost:4000`
- SQL backend: `http://localhost:4001`

## Production Notes

- Frontend builds to `frontend/dist`
- HANA backend builds to `hana-backend/dist/server.js`
- SQL backend builds to `sql-backend/dist/server.js`
- The frontend preview server uses Vite preview on port 5173 in this repository
- Backend services are started from their compiled `dist/` output in production

## Documentation

- [Frontend README](./frontend/README.md)
- [HANA Backend README](./hana-backend/README.md)
- [SQL Backend README](./sql-backend/README.md)

## Conventions

- Do not edit generated router output such as `frontend/src/routeTree.gen.ts`
- Keep `.gitignore` free of generated outputs, dependency caches, and build artifacts
- Prefer workspace-level scripts for orchestration and package-level scripts for package-specific tasks

