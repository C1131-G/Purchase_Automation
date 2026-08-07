# IC data model and flows

## Common database

IC tables live in the **common** HANA database (`COMMON_DB` / SBOCOMMON-style), not per-company company DBs. Entity name placeholders are under `db/entities/`.

| Table                           | Role                                                     |
| ------------------------------- | -------------------------------------------------------- |
| `IC_COMPANY`                    | Portal company ↔ SAP company DB name                     |
| `IC_SAP_CONNECTION`             | Per-company Service Layer credentials                    |
| `IC_BP_MAPPING`                 | Buyer CardCode ↔ seller CardCode pairs                   |
| `IC_CONFIGURATION`              | Feature flags and worker knobs                           |
| `IC_DOCUMENT_MAPPING`           | Source↔target doc links (idempotency + relationship map) |
| `IC_RFQ_HEADER` / `IC_RFQ_LINE` | Custom RFQ (Flow 1 commercial document)                  |
| `IC_NOTIFICATION`               | In-app IC notifications (company-scoped)                 |
| `IC_RETRY_QUEUE`                | Failed partner posts / steps                             |
| `IC_SYNC_HISTORY`               | Audit of flow outcomes                                   |
| `IC_API_LOG`                    | Masked SL/API log rows                                   |
| `IC_SL_SESSION`                 | Cached partner SL sessions                               |
| `IC_SCHEDULER_JOB`              | Worker job heartbeats / last run                         |

Tax: **no static tax code table**. Seller tax is resolved from **OVTG rate matching** (buyer line tax rate → seller sales tax code). Warehouse for multi-branch seller SQ uses partner warehouse masters.

## Flow 1 — PQ → RFQ → update PQ + SQ

**Folder:** `flows/flow-1-pq-rfq-chain/`

| Step | Folder                  | What                                           |
| ---- | ----------------------- | ---------------------------------------------- |
| 01   | `01-pq-capture/`        | Validate real PQ, flags, partner, idempotency  |
| 02   | `02-create-rfq/`        | Insert `IC_RFQ_*` from PQ lines                |
| 03   | `03-notify-seller/`     | Notify seller company                          |
| 04   | `04-seller-fill-rfq/`   | API: seller prices / submit                    |
| 05   | `05-convert-pq-and-sq/` | Update buyer PQ commercials + create seller SQ |

Trigger: `afterPqSaved` on PQ create/update (background by default).  
Orchestrator auto-runs 01→02→03. Steps 04/05 are user/API driven (submit may auto-convert).

## Flow 2 — PO → A/R Invoice Draft

**Folder:** `flows/flow-2-po-to-ar-invoice/`

| Step | Folder                 | What                                                  |
| ---- | ---------------------- | ----------------------------------------------------- |
| 01   | `01-po-capture/`       | Non-draft PO, IC vendor, flags, map check             |
| 02   | `02-build-ar-invoice/` | SQ-based draft payload (customer, branch, remarks)    |
| 03   | `03-post-ar-invoice/`  | Partner SL `POST /Drafts` (A/R Invoice Draft, Obj 13) |
| 04   | `04-map-and-notify/`   | Map `PO → AR_DRAFT`, history, notify                  |

Trigger: `afterPoCreated` after portal PO create (background by default).  
Does **not** require a prior RFQ. Independent of Flow 1.

Object codes: `IC_OBJECT.PO`, `IC_OBJECT.AR_DRAFT` (legacy map rows may still reference `AR_INVOICE`).

## Idempotency

Both flows check `IC_DOCUMENT_MAPPING` before creating partner docs. Successful maps short-circuit re-runs. Failures enqueue `IC_RETRY_QUEUE` with action handlers in the worker.

## Remarks chain

Human-readable IC lineage is appended into SAP `Comments` / portal remarks via `infrastructure/ic-remarks-chain.ts` (PQ ↔ RFQ ↔ SQ ↔ PO ↔ AR Invoice Draft labels).
