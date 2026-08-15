# Flow 1 — Real PQ → RFQ → update PQ + SQ

Commercial RFQ chain between partner companies. The buyer posts a **real Purchase Quotation** in the portal; IC creates a custom RFQ for the seller, then on convert updates the buyer PQ and creates the seller **Sales Quotation**.

|                  |                                                                    |
| ---------------- | ------------------------------------------------------------------ |
| **Path**         | `flows/flow-1-pq-rfq-chain/`                                       |
| **Trigger**      | `afterPqSaved` (PQ **create** only; background by default)         |
| **Edit sync**    | `afterPqUpdated` — DRAFT RFQ only; logs `ic.edit` / `ic_edit_sync` |
| **Flag**         | `ENABLE_FLOW1_RFQ_CHAIN` in `IC_CONFIGURATION`                     |
| **Orchestrator** | `flow-1.orchestrator.ts`                                           |
| **Hook**         | `api/hooks/after-pq-saved.hook.ts`                                 |

## Steps

| Step | Folder                  | Responsibility                                                                       |
| ---- | ----------------------- | ------------------------------------------------------------------------------------ |
| 1    | `01-pq-capture/`        | Is this an IC **real PQ**? Flags on? Partner BP mapped? Already mapped (idempotent)? |
| 2    | `02-create-rfq/`        | Insert custom RFQ header + lines (`IC_RFQ_*`) from PQ commercials                    |
| 3    | `03-notify-seller/`     | Company-scoped notification for the seller about the new RFQ                         |
| 4    | `04-seller-fill-rfq/`   | Seller fills price/delivery and submits (HTTP API)                                   |
| 5    | `05-convert-pq-and-sq/` | Update **buyer PQ** from RFQ lines + create **partner SQ** via Service Layer         |

### Who runs what

```text
PQ create (buyer portal)
  → afterPqSaved → schedule background
  → orchestrator: 01 → 02 → 03 automatically

PQ update (buyer portal)
  → afterPqUpdated → IC edit sync (existing DRAFT RFQ)
  → does not log Flow 1 [1/18] PQ created

Seller UI / API
  → 04 fill + submit  (submit may auto-run convert)

Convert (API)
  → 05 update buyer PQ + create seller SQ
  → IC_DOCUMENT_MAPPING + history + notifications
```

On failure after the buyer PQ is already saved: enqueue `IC_RETRY_QUEUE` and notify — **never** fail the original PQ HTTP response.

## UI

| Role   | Surface                                                  |
| ------ | -------------------------------------------------------- |
| Seller | Sales → Request For Quotation list + `$rfqId` form       |
| Either | Intercompany → notifications (new RFQ, convert outcomes) |

## Idempotency and mapping

- Document map links buyer PQ ↔ RFQ ↔ seller SQ (object codes under `infrastructure/object-codes.ts`).
- Re-running capture/create after a successful map is a no-op.
- Worker job `01-detect-missed-pq` re-drives Flow 1 for PQs that were missed (idempotent).

## Naming notes

- This is **not** the SAP ODRF draft path. Flow 1 works on **real** PQ documents.
- Historical types/exports may still say `IcPqDraftHookInput` / `afterPqDraftSaved` (deprecated alias of `afterPqSaved`).
- Scheduler job name `DETECT_PQ_DRAFT` is legacy naming for the missed-PQ catch-up job.

## Related

- Module overview: [../../README.md](../../README.md)
- Data model detail: [../../docs/data-model-and-flows.md](../../docs/data-model-and-flows.md)
- Architecture: [../../docs/architecture.md](../../docs/architecture.md)
- Flow 2 (independent): [../flow-2-po-to-ar-invoice/README.md](../flow-2-po-to-ar-invoice/README.md)
