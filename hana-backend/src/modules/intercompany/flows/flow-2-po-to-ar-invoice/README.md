# Flow 2 — PO → real A/R Invoice

When the buyer creates a **real Purchase Order** for an intercompany vendor, IC posts a **real A/R Invoice** on the partner company via Service Layer. No RFQ is required; Flow 2 is independent of Flow 1.

|                  |                                                         |
| ---------------- | ------------------------------------------------------- |
| **Path**         | `flows/flow-2-po-to-ar-invoice/`                        |
| **Trigger**      | `afterPoCreated` (non-draft PO; background by default)  |
| **Flag**         | `ENABLE_FLOW2_DIRECT_PO` in `IC_CONFIGURATION`          |
| **Orchestrator** | `flow-2.orchestrator.ts`                                |
| **Hook**         | `api/hooks/after-po-created.hook.ts`                    |
| **SL call**      | `POST /Invoices` (real A/R Invoice — **not** `/Drafts`) |

## Steps

| Step | Folder                 | Responsibility                                                       |
| ---- | ---------------------- | -------------------------------------------------------------------- |
| 1    | `01-po-capture/`       | Non-draft PO, IC vendor (BP map), flags, idempotent map check        |
| 2    | `02-build-ar-invoice/` | Pure payload: customer, tax (OVTG rate match), branch, remarks chain |
| 3    | `03-post-ar-invoice/`  | Partner Service Layer **`POST /Invoices`**                           |
| 4    | `04-map-and-notify/`   | Map `PO → AR_INVOICE`, sync history, notify companies                |

### Orchestration

```text
PO create (buyer portal)
  → SAP PO saved first
  → afterPoCreated → schedule background
  → orchestrator: 01 → 02 → 03 → 04
  → HTTP already returned success for PO
```

IC failure never fails PO create. Failures land in `IC_RETRY_QUEUE` + notifications; worker / UI can re-run.

## Idempotency and mapping

- Target object in map: `AR_INVOICE` (`IC_OBJECT.AR_INVOICE`).
- Legacy map rows may still show `AR_DRAFT` from older pilots — treat as historical only.
- Successful map short-circuits re-posts for the same source PO.

## Tax and remarks

- Seller tax codes resolved by matching buyer line tax **rate** against seller OVTG (no static IC tax table).
- Human-readable lineage is appended into SAP comments / portal remarks via `infrastructure/ic-remarks-chain.ts` (PQ ↔ RFQ ↔ SQ ↔ PO ↔ AR Invoice labels when present).

## UI

| Surface                    | Role                                         |
| -------------------------- | -------------------------------------------- |
| Intercompany notifications | AR Invoice created / failed                  |
| Intercompany retries       | Re-run failed post/map steps                 |
| Relationship map           | Follow `IC_DOCUMENT_MAPPING` PO → AR Invoice |

There is no separate “create AR for IC” form on the partner: posting is automatic after buyer PO create when the flag and config are valid.

## Naming notes

- This is **not** an A/R Invoice Draft (`POST /Drafts` / ODRF).
- Prefer map target `AR_INVOICE`; do not introduce new draft-only partners paths without an explicit product decision.

## Related

- Module overview: [../../README.md](../../README.md)
- Data model detail: [../../docs/data-model-and-flows.md](../../docs/data-model-and-flows.md)
- Architecture: [../../docs/architecture.md](../../docs/architecture.md)
- Deploy / flags: [../../docs/deploy-and-ops.md](../../docs/deploy-and-ops.md)
- Flow 1 (independent RFQ chain): [../flow-1-pq-rfq-chain/README.md](../flow-1-pq-rfq-chain/README.md)
