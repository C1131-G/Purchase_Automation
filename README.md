# Vendor Portal Monorepo

Vendor Portal is a `pnpm` workspace monorepo with three packages:

- `frontend/` for the browser app
- `hana-backend/` for SAP HANA and SAP Service Layer workflows
- `sql-backend/` for PostgreSQL-backed APIs, exports, and local seed data

The root package coordinates common development tasks, cleanup helpers, and repo-wide builds.

## Repository Layout

```text
vendor-portal/
  README.md
  AGENTS.md
  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
  frontend/
  hana-backend/
  sql-backend/
```

## Stack Overview

- **Package manager:** `pnpm`
- **Frontend:** React 19, Vite, TanStack Router, React Query, Zustand, Tailwind CSS v4, Zod v4
- **HANA backend:** Express, TypeORM, SAP HANA client, SAP Service Layer, Swagger
- **SQL backend:** Express, PostgreSQL, Drizzle ORM, Swagger, seed and migration tooling

## Prerequisites

- Node.js 20+
- pnpm 11+
- Access to SAP HANA for the HANA backend
- Access to PostgreSQL for the SQL backend
- Valid SAP Service Layer credentials for HANA-backed transactional flows

## Quick Start

Install dependencies from the repository root:

```bash
pnpm install
```

Start the package you want to work on:

```bash
pnpm dev:frontend
pnpm dev:hana-backend
pnpm dev:sql-backend
```

## Root Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev:frontend` | Stop anything on the frontend port and start the frontend dev server |
| `pnpm dev:hana-backend` | Stop anything on the backend port and start the HANA backend dev server |
| `pnpm dev:sql-backend` | Stop anything on the backend port and start the SQL backend dev server |
| `pnpm check:frontend` | Capture frontend runtime errors |
| `pnpm check:hana` | Capture HANA backend runtime errors |
| `pnpm check:sql` | Capture SQL backend runtime errors |
| `pnpm build` | Run `pnpm fix` and then build all workspace packages |
| `pnpm test` | Run all workspace tests |
| `pnpm fix` | Run Ultracite fix across the repo |
| `pnpm prepare` | Install Lefthook hooks |

## Local Development Ports

- Frontend: `http://localhost:5173`
- HANA backend: `http://localhost:4000`
- SQL backend: `http://localhost:4000` by default, unless you override `PORT`

## Package Docs

- [Frontend README](./frontend/README.md)
- [HANA Backend README](./hana-backend/README.md)
- [SQL Backend README](./sql-backend/README.md)

## Conventions

- Do not edit generated router output such as `frontend/src/routeTree.gen.ts`
- Keep `.gitignore` focused on generated output, dependency caches, and build artifacts
- Prefer workspace-level scripts for orchestration and package-level scripts for package-specific tasks
