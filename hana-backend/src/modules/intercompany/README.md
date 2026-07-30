# Intercompany (IC)

Modular monolith module for partner-company automation on SAP B1 (HANA + Service Layer).

IC **never fails** the primary portal document path. Hooks schedule work in the background and return `{ status: "accepted" }` immediately.

## Current architecture (post rebuild)

| Flow       | Trigger                                    | Result on partner                                                         |
| ---------- | ------------------------------------------ | ------------------------------------------------------------------------- |
| **Flow 1** | Real **PQ create/update** (`afterPqSaved`) | Custom **RFQ** → seller fill → **update buyer PQ** + **create seller SQ** |
| **Flow 2** | Real **PO create** (`afterPoCreated`)      | Partner **A/R Invoice** (`POST /Invoices`, not ODRF draft)                |

Flags (in `IC_CONFIGURATION`): `ENABLE_FLOW1_RFQ_CHAIN`, `ENABLE_FLOW2_DIRECT_PO`.

## Docs

| Doc                                                                                      | Purpose                                           |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **[docs/architecture.md](./docs/architecture.md)**                                       | Module layout, public wall, request vs background |
| **[docs/data-model-and-flows.md](./docs/data-model-and-flows.md)**                       | `IC_*` tables, Flow 1 / Flow 2 steps              |
| **[docs/deploy-and-ops.md](./docs/deploy-and-ops.md)**                                   | Seed order, worker, flags, SQL ops                |
| **[flows/flow-1-pq-rfq-chain/README.md](./flows/flow-1-pq-rfq-chain/README.md)**         | Flow 1 steps                                      |
| **[flows/flow-2-po-to-ar-invoice/README.md](./flows/flow-2-po-to-ar-invoice/README.md)** | Flow 2 steps                                      |
| **[ops/](./ops/)**                                                                       | Pilot export/drop SQL · company C seed appendix   |
| **[ic-explained.html](../../../../ic-explained.html)**                                   | Visual explainer (open in browser)                |

## Public wall

```ts
import { afterPoCreated, afterPqSaved, icRoutes } from "@/modules/intercompany";
```

| Export           | Role                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| `afterPqSaved`   | Flow 1 entry (real PQ). Alias: `afterPqDraftSaved` (deprecated name) |
| `afterPoCreated` | Flow 2 entry (non-draft PO)                                          |
| `icRoutes`       | Mounted at `/api/v1/ic/*`                                            |

- `GET /api/v1/ic/health` → `{ success, data: { ok: true, module, phase: "P9" } }`
- RFQ: `GET/PUT /rfqs`, `POST /rfqs/:id/submit`, `POST /rfqs/:id/convert`
- Notifications: `GET /notifications`, unread-count, mark read
- Retries: `GET /retries`, `POST /retries/:id/run`

## Frontend surfaces

| Area                       | Route / chrome                  |
| -------------------------- | ------------------------------- |
| IC notifications           | Sidebar + header unread badge   |
| Request For Quotation list | Sales → Request For Quotation   |
| RFQ fill / convert form    | Double-click Doc Number on list |

## Tree (folder names = architecture)

```text
intercompany/
  index.ts                    # public wall
  api/                        # routes, schemas, hooks
    hooks/
      after-pq-saved.hook.ts  # Flow 1
      after-po-created.hook.ts
  config/                     # company, bp, tax, sap-connection, configuration, warehouse
  routing/                    # resolve-partner, resolve-sl-target
  domain/                     # document-map, notification, retry, history, rfq
  infrastructure/             # object-codes, ic-sql, SL client, api-log, remarks
  flows/
    flow-1-pq-rfq-chain/      # PQ → RFQ → update PQ + SQ
    flow-2-po-to-ar-invoice/  # PO → real AR Invoice
    shared/
  background/
    jobs/
      01-detect-missed-pq/
      02-process-retry-queue/
      03-session-cleanup/
    worker.entry.ts
  ops/                        # DBA / seed SQL
  docs/                       # architecture docs
  db/entities/                # IC_* table placeholders
  testing/memory-sql.ts
```

## Run API + worker

```bash
pnpm --filter hana-backend dev
pnpm --filter hana-backend worker:ic
pnpm --filter hana-backend worker:ic:once
```

| Job                 | Name (`IC_SCHEDULER_JOB`) | Behavior                                   |
| ------------------- | ------------------------- | ------------------------------------------ |
| Detect missed PQ    | `DETECT_PQ_DRAFT`         | Per active company → Flow 1 (idempotent)   |
| Process retry queue | `PROCESS_RETRY`           | Claim due rows → re-run / requeue / `DEAD` |
| Session cleanup     | `SESSION_CLEANUP`         | Delete expired `IC_SL_SESSION`             |

## Deploy (summary)

1. Seed `IC_*` (companies, SL connections, BP map, tax) — **P0 last**
2. Start worker
3. Enable `ENABLE_FLOW2_DIRECT_PO` → smoke PO→AR Invoice
4. Enable `ENABLE_FLOW1_RFQ_CHAIN` → smoke PQ→RFQ→convert

Details: [docs/deploy-and-ops.md](./docs/deploy-and-ops.md).

## Tests

```bash
pnpm --filter hana-backend test:unit -- tests/unit/modules/intercompany
pnpm --filter frontend test -- tests/unit/features/intercompany tests/unit/features/create-pages/request-for-quotation tests/unit/features/table-pages/rfqs
```
