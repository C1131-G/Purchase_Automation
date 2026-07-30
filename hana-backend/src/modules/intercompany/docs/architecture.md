# IC architecture

## Placement

```text
hana-backend/src/modules/intercompany/   ← only IC code
frontend/src/features/intercompany/      ← notifications, RFQ UI shell, client API
```

Other document modules (`purchase-order`, `purchase-quotation`, …) call IC **only** through the public wall:

```ts
import { afterPoCreated, afterPqSaved } from "@/modules/intercompany";
```

## Layer map

| Layer          | Path              | Responsibility                                   |
| -------------- | ----------------- | ------------------------------------------------ |
| API            | `api/`            | Express routes, Zod schemas, document hooks      |
| Config         | `config/`         | Company, BP map, tax, SL connection, flags       |
| Routing        | `routing/`        | Resolve IC partner + SL target company           |
| Domain         | `domain/`         | RFQ, document map, notifications, retry, history |
| Flows          | `flows/`          | Flow 1 / Flow 2 orchestrators + step folders     |
| Infrastructure | `infrastructure/` | HANA SQL, SL session/docs, logs, remarks chain   |
| Background     | `background/`     | Worker entry, scheduler, jobs                    |
| Ops            | `ops/`            | Optional DBA SQL (not loaded at runtime)         |

## Request path vs background

```text
Portal create PQ/PO
  → module mutation (SAP write first)
  → afterPqSaved / afterPoCreated
      → scheduleIcBackground(...)   # default
      → return { status: "accepted" }
  → HTTP response (document already saved)

Background task
  → Flow1/Flow2 orchestrator
  → domain + SL + map + notify
  → on failure: retry queue + notification (never rolls back portal doc)
```

Unit tests can pass `{ runInBackground: false }` to run the orchestrator synchronously.

## Flow folder naming (canonical)

| Folder                                 | Meaning                                      |
| -------------------------------------- | -------------------------------------------- |
| `flows/flow-1-pq-rfq-chain/`           | Real **PQ** → RFQ chain (not SAP draft)      |
| `flows/flow-2-po-to-ar-invoice/`       | **PO** → real **A/R Invoice** (not AR draft) |
| `api/hooks/after-pq-saved.hook.ts`     | Flow 1 trigger                               |
| `api/hooks/after-po-created.hook.ts`   | Flow 2 trigger                               |
| `background/jobs/01-detect-missed-pq/` | Worker catch-up for missed Flow 1            |

Legacy names (`*-draft*`, `afterPqDraftSaved`) may appear in historical map rows / deprecated exports; prefer the table above.

## Frontend architecture

- TanStack Query for notifications, RFQs, retries, unread count
- Zustand only for table chrome (filters/sort), not server lists
- Paths under `frontend/src/features/intercompany/`
- Routes under `frontend/src/routes/_layout/` (notifications, RFQ table, RFQ form)

## Non-goals

- IC does not own portal PO/PQ SAP payload building for the primary create path
- IC does not use TypeORM for `IC_*` tables (raw SQL via `ic-sql` + entity placeholders)
- Pilot `intercompany-document-map` schema was removed; production map is `IC_DOCUMENT_MAPPING`
