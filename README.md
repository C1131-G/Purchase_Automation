# Vendor Portal Monorepo

Vendor Portal is a `pnpm` workspace monorepo with two packages:

- `frontend/` for the browser app
- `hana-backend/` for SAP HANA and SAP Service Layer workflows

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
```

## Stack Overview

- **Package manager:** `pnpm`
- **Frontend:** React 19, Vite, TanStack Router, React Query, Zustand, Tailwind CSS v4, Zod v4
- **HANA backend:** Express, TypeORM, SAP HANA client, SAP Service Layer, Swagger

## Prerequisites

- Node.js 20+
- pnpm 11+
- Access to SAP HANA for the HANA backend
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
```

## Root Commands

| Command                 | Purpose                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| `pnpm dev:frontend`     | Stop anything on the frontend port and start the frontend dev server    |
| `pnpm dev:hana-backend` | Stop anything on the backend port and start the HANA backend dev server |
| `pnpm check:frontend`   | Capture frontend runtime errors                                         |
| `pnpm check:hana`       | Capture HANA backend runtime errors                                     |
| `pnpm build`            | Run `pnpm fix` and then build all workspace packages                    |
| `pnpm test`             | Run all workspace tests                                                 |
| `pnpm fix`              | Run Ultracite fix across the repo                                       |
| `pnpm prepare`          | Install Lefthook hooks                                                  |

## Local Development Ports

- Frontend: `http://localhost:5173`
- HANA backend: `http://localhost:4000`

## Package Docs

- [Frontend README](./frontend/README.md)
- [HANA Backend README](./hana-backend/README.md)
- [Intercompany (IC) module](./hana-backend/src/modules/intercompany/README.md) — architecture, Flow 1 (PQ→RFQ), Flow 2 (PO→AR Invoice)
- [IC architecture](./hana-backend/src/modules/intercompany/docs/architecture.md)
- [AGENTS.md](./AGENTS.md) — agent/developer conventions

## Conventions

- Do not edit generated router output such as `frontend/src/routeTree.gen.ts`
- Keep `.gitignore` focused on generated output, dependency caches, and build artifacts
- Prefer workspace-level scripts for orchestration and package-level scripts for package-specific tasks
