# Intercompany (IC)

Modular monolith feature for **partner-company automation** on SAP Business One (HANA + Service Layer).

IC runs after the portal has already saved the buyer document. It **never fails** the primary PQ/PO path. Hooks schedule work in the background and return `{ status: "accepted" }` immediately. Failures become notifications + `IC_RETRY_QUEUE` rows, not create errors.

## What IC solves

Two companies trade as buyer/seller. Operators work only in the portal; IC posts partner-side SAP documents and keeps a cross-company map for relationship map, retries, and audit.

| Flow          | Buyer action                                   | Partner result                                                                                                               |
| ------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Flow 1**    | Create **real Purchase Quotation**             | Custom **RFQ** in common DB → seller fills prices → **update buyer PQ** + **create seller Sales Quotation**                  |
| **Edit sync** | Update **PQ** (DRAFT RFQ) / **PO** (A/R draft) | Mirror buyer fields onto the existing partner DRAFT. Logs use `scope: ic.edit` / `check: ic_edit_sync` — not Flow 1/2 create |
| **Flow 2**    | Create **real Purchase Order** (non-draft)     | Partner **A/R Invoice Draft** via Service Layer `POST /Drafts` (`DocObjectCode` 13, based on seller SQ)                      |

Flows are **independent**: Flow 2 does not require a prior RFQ. Feature flags live in `IC_CONFIGURATION`.

| Flag                        | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| `ENABLE_FLOW1_RFQ_CHAIN`    | Turn on Flow 1                                            |
| `ENABLE_FLOW2_DIRECT_PO`    | Turn on Flow 2                                            |
| `MAX_RETRY_COUNT`           | Retry ceiling (default `2`)                               |
| `DETECT_DRAFT_CRON_MINUTES` | Worker detect cadence (legacy name; job is missed **PQ**) |
| `REMARKS_PREFIX`            | SAP remarks tag prefix (e.g. `IC-`)                       |

## Docs map

| Doc                                                                                      | Purpose                                         |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **[docs/architecture.md](./docs/architecture.md)**                                       | Layers, public wall, request vs background      |
| **[docs/data-model-and-flows.md](./docs/data-model-and-flows.md)**                       | `IC_*` tables, step-by-step Flow 1 / Flow 2     |
| **[docs/deploy-and-ops.md](./docs/deploy-and-ops.md)**                                   | Seed order, worker env, flags, pilot SQL        |
| **[flows/flow-1-pq-rfq-chain/README.md](./flows/flow-1-pq-rfq-chain/README.md)**         | Flow 1 steps                                    |
| **[flows/flow-2-po-to-ar-invoice/README.md](./flows/flow-2-po-to-ar-invoice/README.md)** | Flow 2 steps                                    |
| **[ops/](./ops/)**                                                                       | Pilot export/drop SQL · company C seed appendix |

## Public wall

**Only** export/import surface for other modules:

```ts
import {
  afterPoCreated,
  afterPoUpdated,
  afterPqSaved,
  afterPqUpdated,
  icRoutes,
} from "@/modules/intercompany";
```

| Export           | Role                                                                            |
| ---------------- | ------------------------------------------------------------------------------- |
| `afterPqSaved`   | Flow 1 **create** entry (real PQ). Alias: `afterPqDraftSaved` (deprecated name) |
| `afterPqUpdated` | IC **edit sync** (PQ update → DRAFT RFQ). Logs: `ic.edit` / `ic_edit_sync`      |
| `afterPoCreated` | Flow 2 **create** entry (non-draft PO)                                          |
| `afterPoUpdated` | IC **edit sync** (PO update → A/R draft). Logs: `ic.edit` / `ic_edit_sync`      |
| `icRoutes`       | Mounted at `/api/v1/ic/*`                                                       |

Do **not** deep-import flow internals, `ic-sql`, or domain services from purchase-order / purchase-quotation modules.

### HTTP API (`/api/v1/ic/*`)

| Area          | Endpoints (summary)                                                                 |
| ------------- | ----------------------------------------------------------------------------------- |
| Health        | `GET /health` → `{ ok, module, phase: "P9" }`                                       |
| RFQ           | `GET/PUT /rfqs`, `GET /rfqs/:id`, `POST /rfqs/:id/submit`, `POST /rfqs/:id/convert` |
| Notifications | `GET /notifications`, unread-count, mark read / mark-all-read                       |
| Retries       | `GET /retries`, `POST /retries/:id/run`                                             |

Frontend path constants: `frontend/src/features/intercompany/api/intercompany.paths.ts`.

## End-to-end request path

```text
Portal create PQ or PO
  → document module mutation writes SAP first
  → afterPqSaved / afterPoCreated
      → scheduleIcBackground(...)     # default
      → return { status: "accepted" }
  → HTTP response (buyer doc already saved)

Background task
  → Flow 1 or Flow 2 orchestrator
  → resolve partner + SL target
  → partner SAP / IC_RFQ_* writes
  → IC_DOCUMENT_MAPPING + history + notification
  → on failure: IC_RETRY_QUEUE (never rolls back buyer doc)
```

Unit tests may pass `{ runInBackground: false }` to run the orchestrator synchronously.

### Flow 1 (auto vs user)

| Steps                                         | Who                                   |
| --------------------------------------------- | ------------------------------------- |
| 01 capture → 02 create RFQ → 03 notify seller | Orchestrator after PQ save            |
| 04 seller fill / submit                       | Seller user + API                     |
| 05 update buyer PQ + create seller SQ         | Convert API (submit may auto-convert) |

### Flow 2 (fully automated)

01 capture → 02 build payload → 03 `POST /Drafts` (AR invoice draft) → 04 map + notify.

## Data model (common DB)

All `IC_*` tables live in **`COMMON_DB`** (shared), not per-company company DBs. Runtime access is **raw SQL** via `infrastructure/ic-sql` (entity files under `db/entities/` are placeholders / docs, not TypeORM runtime).

| Table                           | Role                                                 |
| ------------------------------- | ---------------------------------------------------- |
| `IC_COMPANY`                    | Portal company ↔ SAP company DB                      |
| `IC_SAP_CONNECTION`             | Per-company Service Layer credentials                |
| `IC_BP_MAPPING`                 | Buyer CardCode ↔ seller CardCode                     |
| `IC_CONFIGURATION`              | Flags and worker knobs                               |
| `IC_DOCUMENT_MAPPING`           | Source↔target links (idempotency + relationship map) |
| `IC_RFQ_HEADER` / `IC_RFQ_LINE` | Custom RFQ (Flow 1 commercial doc)                   |
| `IC_NOTIFICATION`               | In-app notifications (company-scoped)                |
| `IC_RETRY_QUEUE`                | Failed steps for worker / manual retry               |
| `IC_SYNC_HISTORY`               | Flow outcome audit                                   |
| `IC_API_LOG`                    | Masked SL/API log                                    |
| `IC_SL_SESSION`                 | Cached partner SL sessions                           |
| `IC_SCHEDULER_JOB`              | Worker job heartbeats                                |

**Tax:** no static IC tax seed table. Seller tax codes resolve by **OVTG rate match** (buyer line rate → seller sales tax). Multi-branch seller SQ warehouse uses partner warehouse masters.

**Idempotency:** both flows check `IC_DOCUMENT_MAPPING` before creating partner documents. Successful maps short-circuit re-runs.

## Tree (folder names = architecture)

```text
intercompany/
  index.ts                      # public wall
  api/                          # routes, schemas, hooks
    hooks/
      after-pq-saved.hook.ts    # Flow 1
      after-po-created.hook.ts  # Flow 2
  config/                       # company, bp, tax, sap-connection, configuration, warehouse
  routing/                      # resolve-partner, resolve-sl-target
  domain/                       # document-map, notification, retry, history, rfq
  infrastructure/               # object-codes, ic-sql, SL client, api-log, remarks
  flows/
    flow-1-pq-rfq-chain/        # PQ → RFQ → update PQ + SQ
    flow-2-po-to-ar-invoice/    # PO → AR Invoice Draft
    shared/
  background/
    jobs/
      01-detect-missed-pq/
      02-process-retry-queue/
      03-session-cleanup/
    worker.entry.ts
  ops/                          # DBA / seed SQL (not loaded at runtime)
  docs/
  db/entities/                  # IC_* placeholders
  testing/memory-sql.ts
```

## Frontend surfaces

| Area                       | Route / chrome                                              |
| -------------------------- | ----------------------------------------------------------- |
| IC notifications           | `/intercompany/notifications` + sidebar/header unread badge |
| IC retries                 | `/intercompany/retries`                                     |
| Request For Quotation list | Sales → `/sales/request-for-quotations`                     |
| RFQ fill / convert         | `/sales/request-for-quotations/$rfqId`                      |

Client code: `frontend/src/features/intercompany/` (TanStack Query for server data; Zustand only for table chrome).

## Run API + worker

```bash
pnpm --filter hana-backend dev
pnpm --filter hana-backend worker:ic
pnpm --filter hana-backend worker:ic:once
```

| Job                 | Scheduler name (`IC_SCHEDULER_JOB`) | Behavior                                          |
| ------------------- | ----------------------------------- | ------------------------------------------------- |
| Detect missed PQ    | `DETECT_PQ_DRAFT`                   | Per active company → Flow 1 (idempotent catch-up) |
| Process retry queue | `PROCESS_RETRY`                     | Claim due rows → re-run / requeue / `DEAD`        |
| Session cleanup     | `SESSION_CLEANUP`                   | Delete expired `IC_SL_SESSION`                    |

Worker env: `IC_WORKER_ONCE`, `IC_WORKER_INTERVAL_MS` (see [deploy-and-ops.md](./docs/deploy-and-ops.md)).

## Deploy (summary)

1. Seed `IC_*` (companies, SL connections, BP map) — flow flags **off** until verified
2. Start API + worker
3. Enable `ENABLE_FLOW2_DIRECT_PO` → smoke PO → AR Invoice Draft
4. Enable `ENABLE_FLOW1_RFQ_CHAIN` → smoke PQ → RFQ → convert

Details: [docs/deploy-and-ops.md](./docs/deploy-and-ops.md).

## Non-goals

- IC does not build the buyer’s primary PO/PQ SAP payload (document modules own that)
- IC does not use TypeORM for live `IC_*` queries (raw SQL + entity placeholders only)
- Pilot `intercompany-document-map` schema was removed; production map is `IC_DOCUMENT_MAPPING`
- Flow 1 is **not** the SAP ODRF draft path; Flow 2 posts **A/R Invoice Draft** only (`POST /Drafts`), not a real posted OINV

## Tests

```bash
# backend IC unit suite
pnpm --filter hana-backend test:unit -- tests/unit/modules/intercompany

# frontend IC + RFQ surfaces
pnpm --filter frontend test -- tests/unit/features/intercompany tests/unit/features/create-pages/request-for-quotation tests/unit/features/table-pages/rfqs
```

Backend coverage includes hooks, Flow 1/2 orchestrators, tax/partner resolve, RFQ/notifications, document map, background jobs, remarks chain.

## Related package docs

- [HANA backend README](../../../README.md)
- [Frontend README](../../../../frontend/README.md)
- [Monorepo README](../../../../README.md)
