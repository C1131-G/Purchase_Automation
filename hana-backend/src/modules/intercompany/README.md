# Intercompany (IC)

> **P1–P9 complete** (application).  
> **P0 seed** remains last before go-live / live smoke (real A/B data + flags).

## Start here

| Doc                                                            | Purpose                                         |
| -------------------------------------------------------------- | ----------------------------------------------- |
| **[plan.md](./plan.md)**                                       | Master plan P0–P9                               |
| **[IC-ARCHITECTURE-PLAN.md](./IC-ARCHITECTURE-PLAN.md)**       | Architecture, maps                              |
| **[IC-DATA-MODEL-AND-FLOWS.md](./IC-DATA-MODEL-AND-FLOWS.md)** | Tables, DDL, flows                              |
| **[ops/](./ops/)**                                             | Pilot export/drop SQL · company C seed appendix |

## Status

| Phase                      | State                                             |
| -------------------------- | ------------------------------------------------- |
| P1 Clear pilot runtime     | **Done**                                          |
| P2 Scaffold                | **Done**                                          |
| P3 Backend core            | **Done**                                          |
| P4 FE shell                | **Done**                                          |
| P5 Flow 2 PO→AR            | **Done** (`ENABLE_FLOW2_DIRECT_PO`)               |
| P6 Flow 1 RFQ APIs         | **Done** (`ENABLE_FLOW1_RFQ_CHAIN`)               |
| P7 Background worker       | **Done**                                          |
| P8 Notification + RFQ UI   | **Done**                                          |
| P9 Hardening / pilot table | **Done** (schema gone; DBA drop script in `ops/`) |
| P0 Seed `IC_*`             | **Deferred last**                                 |

## Public wall

```ts
import { afterPoCreated, afterPqDraftSaved, icRoutes } from "@/modules/intercompany";
```

- `GET /api/v1/ic/health` → `{ success, data: { ok: true, module, phase: "P9" } }`
- `afterPoCreated` → Flow 2 orchestrator (never throws into PO create)
- `afterPqDraftSaved` → Flow 1 orchestrator 01→03 (never throws into PQ draft)
- RFQ APIs: `GET/PUT /rfqs`, `POST /rfqs/:id/submit`, `POST /rfqs/:id/convert`
- Notification APIs: `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `POST /notifications/mark-all-read`
- Retry APIs: `GET /retries`, `POST /retries/:id/run`

## Frontend surfaces (P8)

| Area                       | Route / chrome                  |
| -------------------------- | ------------------------------- |
| IC notifications           | Sidebar + header unread badge   |
| Request For Quotation list | Sales → Request For Quotation   |
| RFQ fill / convert form    | Double-click Doc Number on list |

## Run API + background worker

Same env as the HANA API process (HANA pool, Service Layer, session store).

```bash
# API (repo root or package)
pnpm --filter hana-backend dev

# Continuous IC worker (default interval 60s)
pnpm --filter hana-backend worker:ic

# One loop then exit (ops / smoke)
pnpm --filter hana-backend worker:ic:once
# or
pnpm --filter hana-backend worker:ic -- --once
```

| Job                    | Name (`IC_SCHEDULER_JOB`) | Behavior                                   |
| ---------------------- | ------------------------- | ------------------------------------------ |
| Detect missed PQ draft | `DETECT_PQ_DRAFT`         | Per active company → Flow 1 (idempotent)   |
| Process retry queue    | `PROCESS_RETRY`           | Claim due rows → re-run / requeue / `DEAD` |
| Session cleanup        | `SESSION_CLEANUP`         | Delete expired `IC_SL_SESSION`             |

| Variable                | Meaning                                 |
| ----------------------- | --------------------------------------- |
| `IC_WORKER_ONCE=1`      | Single loop then exit                   |
| `IC_WORKER_INTERVAL_MS` | Loop interval (min 5000, default 60000) |

## Deploy flags (after P0 seed)

Keep both **off** until seed + SL login verified.

| Order | Key                         | Value    | When                                 |
| ----- | --------------------------- | -------- | ------------------------------------ |
| 1     | Seed complete               | —        | `IC_COMPANY`, connections, BP, tax   |
| 2     | `ENABLE_FLOW2_DIRECT_PO`    | `1`      | After PO→AR Draft smoke on A↔B       |
| 3     | `ENABLE_FLOW1_RFQ_CHAIN`    | `1`      | After RFQ chain smoke on A↔B         |
| —     | `MAX_RETRY_COUNT`           | `2`      | Default                              |
| —     | `DETECT_DRAFT_CRON_MINUTES` | e.g. `5` | Worker detect cadence (config table) |
| —     | `REMARKS_PREFIX`            | `IC-`    | SAP remarks tags                     |

Recommended production order: **seed → worker process up → enable Flow 2 → smoke → enable Flow 1 → smoke**.

## Security notes (P9)

- All `/api/v1/ic/*` business routes resolve actor company from **session DB** → `IC_COMPANY`.
- RFQ get/update/submit/convert enforce source/target company roles in services.
- Notifications and retries are **company-scoped** (including `markRead` SQL filter).
- API log persistence masks `password` / session cookie keys (`maskSecrets`).
- Flow 1 / Flow 2 logs include a per-run `corrId` (UUID); never log SL passwords.

## Pilot table (P9)

| Item                                                 | Action                                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| TypeORM schema `intercompany-document-map.schema.ts` | **Removed**                                                                |
| Runtime writes                                       | None (engine uses `IC_DOCUMENT_MAPPING`)                                   |
| Optional export                                      | [`ops/export-pilot-document-map.sql`](./ops/export-pilot-document-map.sql) |
| DBA drop                                             | [`ops/drop-pilot-document-map.sql`](./ops/drop-pilot-document-map.sql)     |

## Seed company C (appendix)

See [`ops/seed-company-c-appendix.sql`](./ops/seed-company-c-appendix.sql) — company row, SL connection, BP pairs, tax pairs. Full A/B seed checklist remains **plan.md P0**.

## Tree

```text
intercompany/
  index.ts                 # public wall
  api/                     # routes + hooks
  config/                  # company, bp, tax, sap-connection, configuration
  routing/                 # resolve-partner, resolve-sl-target
  domain/                  # document-map, notification, retry, history, rfq
  infrastructure/          # object-codes, ic-sql, SL client, api-log
  flows/                   # Flow 1 + Flow 2
  background/              # worker entry + jobs
  ops/                     # DBA / seed SQL (P9)
  testing/memory-sql.ts    # offline unit-test DB
  db/entities/             # table name placeholders
```

## Tests

```bash
pnpm --filter hana-backend test:unit -- tests/unit/modules/intercompany
pnpm --filter frontend test -- tests/unit/features/intercompany tests/unit/features/create-pages/request-for-quotation tests/unit/features/table-pages/rfqs
```
