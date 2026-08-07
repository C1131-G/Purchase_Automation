# Flow 2 — PO → convert seller SQ → A/R Invoice Draft

When the buyer creates a **real Purchase Order** for an intercompany vendor, IC **converts the seller Sales Quotation (SQ)** into an **A/R Invoice Draft** on the partner company via Service Layer (`BaseType` 23). It does **not** post a real invoice and does **not** create a free-standing AR from PO lines.

Flow 2 still **triggers** on buyer PO create, but the draft body is **copy-from SQ** (same SAP chain as UI Convert SQ → Invoice Draft).

|                  |                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------- |
| **Path**         | `flows/flow-2-po-to-ar-invoice/`                                                       |
| **Trigger**      | `afterPoCreated` (non-draft PO; background by default)                                 |
| **Flag**         | `ENABLE_FLOW2_DIRECT_PO` in `IC_CONFIGURATION`                                         |
| **Orchestrator** | `flow-2.orchestrator.ts`                                                               |
| **Hook**         | `api/hooks/after-po-created.hook.ts`                                                   |
| **SL call**      | `POST /Drafts` with `DocObjectCode=13`, line `BaseType=23`, `BaseEntry=SQ`, `BaseLine` |
| **Prerequisite** | Seller SQ from Flow 1 (RFQ submit → SQ), linked on PO remarks / map                    |

## Steps

| Step | Folder                 | Responsibility                                                                     |
| ---- | ---------------------- | ---------------------------------------------------------------------------------- |
| 1    | `01-po-capture/`       | Non-draft PO, IC vendor (BP map), flags, idempotent map check                      |
| 2    | `02-build-ar-invoice/` | Resolve seller SQ, load open QUT lines, build base-convert draft payload + remarks |
| 3    | `03-post-ar-invoice/`  | Partner Service Layer **`POST /Drafts`** (A/R Invoice draft based on SQ)           |
| 4    | `04-map-and-notify/`   | Map `PO → AR_DRAFT`, sync history, notify companies                                |

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

- Target object in map: `AR_DRAFT` (`IC_OBJECT.AR_DRAFT`).
- Legacy map rows may still show `AR_INVOICE` from older real-invoice posts — treated as historical / dual-lookup for idempotency.
- Successful map short-circuits re-posts for the same source PO.

## SQ convert (not free-standing AR)

- Resolve seller SQ DocEntry from PO IC remarks (`SQ …`) and/or Flow 1 map `RFQ → SQ`.
- `GET /Quotations({DocEntry})` on seller; open lines only.
- Each AR draft line: `{ BaseType: 23, BaseEntry: sqDocEntry, BaseLine, Quantity? }`.
- Item, price, tax, UoM, warehouse come from the base SQ in SAP.
- **Missing SQ** → fail + retry queue (do not invent a new invoice from PO lines).

## Tax and remarks

- Tax on AR draft lines is taken from the **base SQ** (seller tax already set in Flow 1).
- Human-readable lineage is appended into SAP comments / portal remarks via `infrastructure/ic-remarks-chain.ts` (PQ ↔ RFQ ↔ SQ labels when present).

## UI

| Surface                    | Role                                       |
| -------------------------- | ------------------------------------------ |
| Intercompany notifications | AR Invoice Draft created / failed          |
| Intercompany retries       | Re-run failed post/map steps               |
| Relationship map           | Follow `IC_DOCUMENT_MAPPING` PO → AR Draft |

There is no separate “create AR for IC” form on the partner: draft posting is automatic after buyer PO create when the flag and config are valid. Users add/post the real invoice from the draft in SAP (or portal) later.

## Naming notes

- This **is** an A/R Invoice Draft (`POST /Drafts` / ODRF with `DocObjectCode` 13).
- Prefer map target `AR_DRAFT`; dual-lookup keeps older `AR_INVOICE` maps from re-firing.

## Related

- Module overview: [../../README.md](../../README.md)
- Data model detail: [../../docs/data-model-and-flows.md](../../docs/data-model-and-flows.md)
- Architecture: [../../docs/architecture.md](../../docs/architecture.md)
- Deploy / flags: [../../docs/deploy-and-ops.md](../../docs/deploy-and-ops.md)
- Flow 1 (independent RFQ chain): [../flow-1-pq-rfq-chain/README.md](../flow-1-pq-rfq-chain/README.md)
