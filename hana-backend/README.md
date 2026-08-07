# HANA Backend

SAP-connected Express service for Vendor Portal. It reads SAP HANA via TypeORM and `@sap/hana-client`, writes through SAP Service Layer, authenticates with file-backed sessions, exposes OpenAPI/Swagger, and hosts the **intercompany (IC)** modular feature (partner RFQ / A/R Invoice Draft automation).

## Purpose

This package owns:

- SAP HANA reads for portal data (tenant company DBs + common DB for IC)
- SAP Service Layer write operations (documents, cancel/update paths)
- Session-based authentication against SAP
- OpenAPI / Swagger documentation
- Master data, transactional document modules, dashboard, relationship map
- Intercompany partner automation (`src/modules/intercompany/`)

## Entry Points

| File                                                  | Role                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `src/server.ts`                                       | Bootstrap: env → HANA pool → TypeORM → Service Layer → HTTP listen |
| `src/app.ts`                                          | Express app (middleware, routes, Swagger)                          |
| `src/modules/intercompany/background/worker.entry.ts` | IC worker process                                                  |

Production start loads observability first:

```bash
node --import ./dist/core/observability/register.js dist/server.js
```

## Stack

| Concern              | Technology                                          |
| -------------------- | --------------------------------------------------- |
| HTTP                 | Express 4                                           |
| ORM / HANA           | TypeORM + `@sap/hana-client`                        |
| Writes               | SAP Service Layer (axios + session cache)           |
| Auth                 | express-session + session-file-store                |
| Validation / OpenAPI | Zod + `@asteasolutions/zod-to-openapi` + Swagger UI |
| Logging / telemetry  | Pino, OpenTelemetry (optional exporters)            |
| Build                | TypeScript, tsup (ESM, Node 20), `tsx` for dev      |
| Tests                | Vitest (unit / integration / smoke)                 |

## Scripts

| Command                 | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `pnpm dev`              | Watch mode (`tsx watch` + observability register) |
| `pnpm build`            | `typecheck` then `tsup` → `dist/`                 |
| `pnpm start`            | Run compiled server from `dist/server.js`         |
| `pnpm typecheck`        | `tsc --noEmit`                                    |
| `pnpm test`             | Vitest (interactive / watch by default)           |
| `pnpm test:run`         | Vitest once (CI-friendly)                         |
| `pnpm test:unit`        | Unit tests only                                   |
| `pnpm test:integration` | Integration route tests                           |
| `pnpm test:smoke`       | Smoke (import verification, OpenAPI contract)     |
| `pnpm test:coverage`    | Coverage report                                   |
| `pnpm openapi:lint`     | OpenAPI contract smoke only                       |
| `pnpm worker:ic`        | IC background worker (loop)                       |
| `pnpm worker:ic:once`   | IC worker single pass then exit                   |

From repository root:

```bash
pnpm dev:hana-backend
pnpm --filter hana-backend test:run
pnpm --filter hana-backend build
pnpm --filter hana-backend worker:ic
```

## Environment Variables

Validated at startup via `src/validation/schemas/env.schema.ts`. Typical keys:

```bash
HANA_HOST=
HANA_PORT=
HANA_USER=
HANA_PASSWORD=
COMMON_DB=                 # IC_* tables + shared org data
ORGANIZATION_TABLE=
SESSION_SECRET=
PORT=4000
FRONTEND_URL=http://localhost:5173
SERVICE_LAYER_URL=
SERVICE_LAYER_HTTPS_VERIFY=
HANA_POOLING=
HANA_MAX_POOL_SIZE=
HANA_CONNECTION_LIFE_TIME=
SHUTDOWN_TIMEOUT=
TRUST_PROXY_HOPS=
NODE_ENV=

# IC worker (optional)
IC_WORKER_ONCE=
IC_WORKER_INTERVAL_MS=
```

## Local Setup

```bash
# from repository root
pnpm install
pnpm dev:hana-backend
```

| Endpoint  | URL                                             |
| --------- | ----------------------------------------------- |
| API       | `http://localhost:4000`                         |
| Swagger   | `http://localhost:4000/api-docs`                |
| Health    | `http://localhost:4000/api/v1/...` (see routes) |
| IC health | `GET /api/v1/ic/health`                         |

## Architecture

Modular monolith: features under `src/modules/*`, shared infrastructure under `core/`, `db/`, `services/`, `config/`.

| Area             | Path              | Role                                                   |
| ---------------- | ----------------- | ------------------------------------------------------ |
| HTTP mount       | `src/routes/`     | `/api/v1` assembly, health                             |
| Features         | `src/modules/*`   | controller → service → queries / mutations             |
| SAP HANA schemas | `src/db/`         | TypeORM entity schemas + tenant data sources           |
| Shared SAP I/O   | `src/services/`   | HANA pool, Service Layer client, PDF/Excel/Word export |
| Cross-cutting    | `src/core/`       | auth middleware, errors, logging, observability        |
| Config           | `src/config/`     | env, session, swagger, middleware                      |
| Contracts        | `src/validation/` | env + API Zod schemas                                  |

### Request path

```text
HTTP → app.ts → routes/api.routes.ts → modules/<feature>
  → controller → service
  → queries (read HANA) | mutations (write Service Layer)
  → optional IC hooks after PQ/PO save (non-blocking)
```

### Startup order

1. Load and validate environment
2. Initialize HANA pool
3. Initialize TypeORM data sources (`initializeDatabase()`)
4. Initialize Service Layer client
5. Start HTTP server

Order is enforced in `src/server.ts` — do not reorder casually.

### Feature modules (current)

| Module                          | Notes                                                    |
| ------------------------------- | -------------------------------------------------------- |
| `auth`                          | Login / logout / session                                 |
| `organization`                  | Org/company selection                                    |
| `master-data`                   | Products, vendors, customers, warehouses, series, tax    |
| `purchase-quotation`            | PQ list/detail/create/update/cancel + **IC Flow 1 hook** |
| `purchase-order`                | PO list/detail/create/update/cancel + **IC Flow 2 hook** |
| `grpo`                          | Goods receipt PO                                         |
| `ap-invoice` / `ap-credit-memo` | A/P documents                                            |
| `sales-quotation`               | SQ (+ seller SQ created by IC Flow 1)                    |
| `outgoing-payment`              | OP                                                       |
| `bank-details`                  | Payment bank masters                                     |
| `attachments`                   | Upload / link / SAP attachment helpers                   |
| `dashboard`                     | Overview, statement, AR approval widgets                 |
| `relationship-map`              | Document chain incl. IC map links                        |
| `intercompany`                  | Partner automation — **import public wall only**         |

**How to navigate a document feature**

1. This README for setup and scripts
2. `modules/purchase-order/` as the template document feature
3. `modules/intercompany/` for partner flows (start at its README)

## Intercompany

Partner automation lives **only** in `src/modules/intercompany/`. Other modules must import the public wall:

```ts
import { afterPoCreated, afterPqSaved, icRoutes } from "@/modules/intercompany";
```

| Flow   | Trigger          | Partner outcome                    | Flag                     |
| ------ | ---------------- | ---------------------------------- | ------------------------ |
| Flow 1 | `afterPqSaved`   | RFQ → update buyer PQ + seller SQ  | `ENABLE_FLOW1_RFQ_CHAIN` |
| Flow 2 | `afterPoCreated` | A/R Invoice Draft (`POST /Drafts`) | `ENABLE_FLOW2_DIRECT_PO` |

IC never fails the primary portal document save. Work is scheduled in the background (`accepted`).

| Doc                | Path                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Module README      | [src/modules/intercompany/README.md](./src/modules/intercompany/README.md)                                       |
| Architecture       | [src/modules/intercompany/docs/architecture.md](./src/modules/intercompany/docs/architecture.md)                 |
| Data model & flows | [src/modules/intercompany/docs/data-model-and-flows.md](./src/modules/intercompany/docs/data-model-and-flows.md) |
| Deploy / worker    | [src/modules/intercompany/docs/deploy-and-ops.md](./src/modules/intercompany/docs/deploy-and-ops.md)             |
| Flow 1             | […/flow-1-pq-rfq-chain/README.md](./src/modules/intercompany/flows/flow-1-pq-rfq-chain/README.md)                |
| Flow 2             | […/flow-2-po-to-ar-invoice/README.md](./src/modules/intercompany/flows/flow-2-po-to-ar-invoice/README.md)        |
| Visual guide       | [ic-explained.html](./ic-explained.html)                                                                         |

Worker:

```bash
pnpm worker:ic
pnpm worker:ic:once
```

Jobs: detect missed PQ, process retry queue, SL session cleanup. Details in the IC deploy doc.

## Tests

```text
tests/
  unit/           # modules, services, core (incl. intercompany/*)
  integration/    # authenticated route-level tests for document modules
  smoke/          # import verification, OpenAPI contract
  helpers/        # app bootstrap, auth, Service Layer mocks
```

```bash
pnpm test:run
pnpm test:unit -- tests/unit/modules/intercompany
```

## Build And Deploy

- Production output: `dist/` (ESM via tsup)
- Start: `pnpm start` or `node --import ./dist/core/observability/register.js dist/server.js`
- Ensure HANA and Service Layer are reachable before boot
- For IC production: seed `IC_*` → run worker → enable flags (see IC deploy doc)

## Operational Notes

- Session handling must stay enabled; most routes require authenticated SAP sessions
- Keep Swagger for contract visibility and manual checks
- Path alias `@/*` → `src/*` (tsconfig + vitest vite-tsconfig-paths)
- `tsconfig`: `noImplicitAny: false` is intentional for this package
- Do not hand-edit generated OpenAPI plumbing unless schema sources change
- IC `IC_*` access uses raw SQL (`ic-sql`), not TypeORM runtime entities (entity files are placeholders)

## Troubleshooting

| Symptom                    | Check                                                              |
| -------------------------- | ------------------------------------------------------------------ |
| Fails before listen        | Env schema: missing/malformed vars                                 |
| SAP write errors           | Service Layer URL, company credentials, session cookie             |
| HANA query errors          | Tenant DB name, pool settings, user permissions                    |
| IC silent / no partner doc | Flags, BP map, worker, `IC_RETRY_QUEUE`, logs via `IC_API_LOG`     |
| CORS / cookie issues       | `FRONTEND_URL`, `TRUST_PROXY_HOPS`, secure cookie settings in prod |
