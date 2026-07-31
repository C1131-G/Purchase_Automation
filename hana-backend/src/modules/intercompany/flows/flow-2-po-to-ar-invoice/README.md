# Flow 2 — PO → convert seller SQ → real A/R Invoice

When the buyer creates a **real Purchase Order** for an intercompany vendor, IC **converts the seller Sales Quotation (SQ)** into a **real A/R Invoice** on the partner company via Service Layer (`BaseType` 23). It does **not** create a free-standing AR from PO lines.

Flow 2 still **triggers** on buyer PO create, but the AR document body is **copy-from SQ** (same SAP chain as UI Convert SQ → Invoice).

|                  |                                                                      |
| ---------------- | -------------------------------------------------------------------- |
| **Path**         | `flows/flow-2-po-to-ar-invoice/`                                     |
| **Trigger**      | `afterPoCreated` (non-draft PO; background by default)               |
| **Flag**         | `ENABLE_FLOW2_DIRECT_PO` in `IC_CONFIGURATION`                       |
| **Orchestrator** | `flow-2.orchestrator.ts`                                             |
| **Hook**         | `api/hooks/after-po-created.hook.ts`                                 |
| **SL call**      | `POST /Invoices` with line `BaseType=23`, `BaseEntry=SQ`, `BaseLine` |
| **Prerequisite** | Seller SQ from Flow 1 (RFQ submit → SQ), linked on PO remarks / map  |

## Steps

| Step | Folder                 | Responsibility                                                               |
| ---- | ---------------------- | ---------------------------------------------------------------------------- |
| 1    | `01-po-capture/`       | Non-draft PO, IC vendor (BP map), flags, idempotent map check                |
| 2    | `02-build-ar-invoice/` | Resolve seller SQ, load open QUT lines, build base-convert payload + remarks |
| 3    | `03-post-ar-invoice/`  | Partner Service Layer **`POST /Invoices`** (based on SQ)                     |
| 4    | `04-map-and-notify/`   | Map `PO → AR_INVOICE`, sync history, notify companies                        |

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

## SQ convert (not free-standing AR)

- Resolve seller SQ DocEntry from PO IC remarks (`SQ …`) and/or Flow 1 map `RFQ → SQ`.
- `GET /Quotations({DocEntry})` on seller; open lines only.
- Each AR line: `{ BaseType: 23, BaseEntry: sqDocEntry, BaseLine, Quantity? }`.
- Item, price, tax, UoM, warehouse come from the base SQ in SAP (fixes Manual UoM on standalone posts).
- **Missing SQ** → fail + retry queue (do not invent a new invoice from PO lines).

## Tax and remarks

- Tax on AR lines is taken from the **base SQ** (seller tax already set in Flow 1).
- Human-readable lineage is appended into SAP comments / portal remarks via `infrastructure/ic-remarks-chain.ts` (PQ ↔ RFQ ↔ SQ labels when present).

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
