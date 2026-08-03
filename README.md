# Vendor Portal Monorepo

**VEDHA ERP / Vendor Portal** is a `pnpm` workspace monorepo for SAP Business One (HANA + Service Layer) purchase and sales workflows, including **intercompany (IC)** partner automation.

| Package         | Role                                                                |
| --------------- | ------------------------------------------------------------------- |
| `frontend/`     | React 19 browser app (tables, create forms, IC notifications / RFQ) |
| `hana-backend/` | Express API: HANA reads, Service Layer writes, sessions, IC module  |

Root coordinates install, lint/format, builds, and tests. Product voice and UX principles live in [`PRODUCT.md`](./PRODUCT.md). Agent/developer conventions live in [`AGENTS.md`](./AGENTS.md).

## Repository Layout

```text
vendor-portal/
  README.md                 # this file
  AGENTS.md                 # conventions for humans and agents
  PRODUCT.md                # product purpose and design principles
  package.json              # workspace scripts
  pnpm-workspace.yaml
  pnpm-lock.yaml
  oxlint.config.ts / oxfmt.config.ts
  lefthook.yml              # git hooks
  frontend/                 # browser app
  hana-backend/             # SAP-connected API
```

## Stack Overview

| Layer           | Technologies                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| Package manager | `pnpm` 11+ (lockfile enforced)                                                                            |
| Frontend        | React 19, Vite 8, TanStack Router / Query / Table / Virtual, Zustand, Zod v4, Tailwind v4, React Compiler |
| Backend         | Express, TypeORM, `@sap/hana-client`, Service Layer, file sessions, Swagger, tsup, Vitest                 |
| Quality         | Oxlint + Oxfmt via Ultracite, Lefthook + lint-staged                                                      |

## Prerequisites

- **Node.js 20+**
- **pnpm 11+** (`packageManager` is pinned in root `package.json`)
- SAP HANA access for the backend (tenant DBs + common DB for IC)
- Valid SAP Service Layer credentials for transactional writes
- For IC: seeded `IC_*` tables in `COMMON_DB` and partner SL connections

## Quick Start

```bash
pnpm install

# one package at a time
pnpm dev:frontend          # http://localhost:5173
pnpm dev:hana-backend      # http://localhost:4000  (Swagger: /api-docs)

# IC background worker (missed PQ, retries, SL session cleanup)
pnpm --filter hana-backend worker:ic
```

Frontend expects `VITE_API_URL=http://localhost:4000` (see `frontend/.env`).

## Root Commands

| Command                 | Purpose                                             |
| ----------------------- | --------------------------------------------------- |
| `pnpm dev:frontend`     | Free the frontend port and start Vite               |
| `pnpm dev:hana-backend` | Free the backend port and start the API (tsx watch) |
| `pnpm check:frontend`   | Capture frontend runtime errors via helper script   |
| `pnpm check:hana`       | Capture HANA backend runtime errors                 |
| `pnpm build`            | `pnpm fix` then build all workspace packages        |
| `pnpm test`             | Run tests in all packages                           |
| `pnpm fix`              | Ultracite fix (Oxlint + Oxfmt) across the repo      |
| `pnpm prepare`          | Install Lefthook hooks                              |

Per-package commands (from package directory or `pnpm --filter <name>`):

| Package      | Dev        | Typecheck        | Build        | Test                     |
| ------------ | ---------- | ---------------- | ------------ | ------------------------ |
| Root         | —          | —                | `pnpm build` | `pnpm test`              |
| HANA Backend | `pnpm dev` | `pnpm typecheck` | `pnpm build` | `pnpm test` / `test:run` |
| Frontend     | `pnpm dev` | `pnpm typecheck` | `pnpm build` | `pnpm test` (vitest run) |

## Local Ports

| Service      | URL                              |
| ------------ | -------------------------------- |
| Frontend     | `http://localhost:5173`          |
| HANA backend | `http://localhost:4000`          |
| Swagger      | `http://localhost:4000/api-docs` |

## Intercompany (IC) — short

IC automates partner-company documents **without failing** the buyer’s primary PQ/PO save:

| Flow       | Trigger               | Partner result                                   | Flag                     |
| ---------- | --------------------- | ------------------------------------------------ | ------------------------ |
| **Flow 1** | Real PQ create/update | Custom RFQ → seller fill → update PQ + create SQ | `ENABLE_FLOW1_RFQ_CHAIN` |
| **Flow 2** | Real PO create        | Real A/R Invoice (`POST /Invoices`)              | `ENABLE_FLOW2_DIRECT_PO` |

Hooks return `{ status: "accepted" }` and run orchestrators in the background. Config, maps, RFQs, notifications, and retries live in common-DB `IC_*` tables. Frontend surfaces: IC notifications/retries + Sales → Request For Quotation.

Full docs: [IC module README](./hana-backend/src/modules/intercompany/README.md).

## Package & Module Docs

| Doc                      | Path                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Frontend                 | [frontend/README.md](./frontend/README.md)                                                                                   |
| Zustand stores           | [frontend/src/store/README.md](./frontend/src/store/README.md)                                                               |
| HANA backend             | [hana-backend/README.md](./hana-backend/README.md)                                                                           |
| Intercompany module      | [hana-backend/src/modules/intercompany/README.md](./hana-backend/src/modules/intercompany/README.md)                         |
| IC architecture          | […/intercompany/docs/architecture.md](./hana-backend/src/modules/intercompany/docs/architecture.md)                          |
| IC data model & flows    | […/intercompany/docs/data-model-and-flows.md](./hana-backend/src/modules/intercompany/docs/data-model-and-flows.md)          |
| IC deploy / worker       | […/intercompany/docs/deploy-and-ops.md](./hana-backend/src/modules/intercompany/docs/deploy-and-ops.md)                      |
| Flow 1 (PQ → RFQ)        | […/flows/flow-1-pq-rfq-chain/README.md](./hana-backend/src/modules/intercompany/flows/flow-1-pq-rfq-chain/README.md)         |
| Flow 2 (PO → AR Invoice) | […/flows/flow-2-po-to-ar-invoice/README.md](./hana-backend/src/modules/intercompany/flows/flow-2-po-to-ar-invoice/README.md) |
| Visual IC guide          | [hana-backend/ic-explained.html](./hana-backend/ic-explained.html)                                                           |
| Product                  | [PRODUCT.md](./PRODUCT.md)                                                                                                   |
| Conventions              | [AGENTS.md](./AGENTS.md)                                                                                                     |

## Conventions

- **Never edit** `frontend/src/routeTree.gen.ts` — TanStack Router generates it on dev/build.
- HANA backend alias `@/*` → `src/*`; frontend `@/` → `/src`.
- **Zustand** = client UI/session/drafts only; **TanStack Query** = server data.
- IC code lives only under `hana-backend/src/modules/intercompany/`; other modules import the **public wall** (`index.ts`) only.
- Prefer workspace scripts for orchestration; package scripts for package-local work.
- Run `pnpm fix` (or Ultracite) before committing; Lefthook enforces quality on staged files.

## Troubleshooting

| Symptom                      | What to check                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| Frontend cannot call API     | `VITE_API_URL`, backend up on `:4000`, CORS/`FRONTEND_URL`                               |
| Backend fails at boot        | Env schema in `hana-backend` (`HANA_*`, `SESSION_SECRET`, `SERVICE_LAYER_URL`, …)        |
| IC not creating partner docs | Flags in `IC_CONFIGURATION`, BP map, worker process, `IC_DOCUMENT_MAPPING` / retry queue |
| Route changes missing        | Restart Vite so the router plugin regenerates the tree                                   |
| Stale build                  | Delete package `dist/` and re-run `pnpm build`                                           |
