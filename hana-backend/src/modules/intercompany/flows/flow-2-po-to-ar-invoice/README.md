# Flow 2 — PO → seller SQ → A/R Draft or POS Parked Invoice

When the buyer creates a **real Purchase Order** for an intercompany vendor, IC resolves the seller Sales Quotation (SQ), reads the seller `IC_COMPANY.PARK`, and delivers the SQ through one fixed route. `PARK=NO` creates an A/R Invoice Draft. `PARK=YES` inserts the existing POS `ParkedTransactions` row for a cashier to resume. Neither route creates a free-standing invoice from PO lines.

Flow 2 still **triggers** on buyer PO create, but the draft body is **copy-from SQ** (same SAP chain as UI Convert SQ → Invoice Draft).

|                  |                                                                                |
| ---------------- | ------------------------------------------------------------------------------ |
| **Path**         | `flows/flow-2-po-to-ar-invoice/`                                               |
| **Trigger**      | `afterPoCreated` (non-draft PO; background by default)                         |
| **Flag**         | `ENABLE_FLOW2_DIRECT_PO` in `IC_CONFIGURATION`                                 |
| **Orchestrator** | `flow-2.orchestrator.ts`                                                       |
| **Hook**         | `api/hooks/after-po-created.hook.ts`                                           |
| **Delivery**     | `POST /Drafts`, or existing tenant `ParkedTransactions` when seller `PARK=YES` |
| **Prerequisite** | Seller SQ from Flow 1 (RFQ submit → SQ), linked on PO remarks / map            |

## Steps

| Step | Folder                 | Responsibility                                                                     |
| ---- | ---------------------- | ---------------------------------------------------------------------------------- |
| 1    | `01-po-capture/`       | Non-draft PO, IC vendor (BP map), flags, idempotent map check                      |
| 2    | `02-build-ar-invoice/` | Resolve seller SQ, load open QUT lines, build base-convert draft payload + remarks |
| 3a   | `03-post-ar-invoice/`  | `PARK=NO`: partner Service Layer `POST /Drafts` based on SQ                        |
| 3b   | `03-park-transaction/` | `PARK=YES`: build POS invoice JSON and insert/reuse `ParkedTransactions`           |
| 4    | `04-map-and-notify/`   | Map `PO → AR_DRAFT` or `PO → PARKED_TRANSACTION`, then history + notification      |

### Orchestration

```text
PO create (buyer portal)
  → SAP PO saved first
  → afterPoCreated → schedule background
  → resolve seller IC_COMPANY.PARK
      NO  → POST /Drafts (SQ BaseType 23) → map AR_DRAFT
      YES → resolve POS store/counter → park SQ invoice → map PARKED_TRANSACTION
  → HTTP already returned success for PO
```

IC failure never fails PO create. Failures land in `IC_RETRY_QUEUE` + notifications; worker / UI can re-run.

## Idempotency and mapping

- Target object in map is route-specific: `AR_DRAFT` or `PARKED_TRANSACTION`.
- Legacy map rows may still show `AR_INVOICE` from older real-invoice posts — treated as historical / dual-lookup for idempotency.
- Successful map short-circuits re-posts for the same source PO.
- The successful map fixes the route for later retries and edits even if `IC_COMPANY.PARK` changes.
- Park identity is deterministic: `IC-PO-<buyerCompanyId>-<poDocEntry>`; retry uses find-before-insert.
- PO edits update an existing unconsumed parked row. A missing row is treated as consumed and is not recreated.

## SQ convert (not free-standing AR)

- Resolve seller SQ DocEntry from PO IC remarks (`SQ …`) and/or Flow 1 map `RFQ → SQ`.
- `GET /Quotations({DocEntry})` on seller; open lines only.
- Each AR draft line: `{ BaseType: 23, BaseEntry: sqDocEntry, BaseLine, Quantity? }`.
- Item, price, tax, UoM, warehouse come from the base SQ in SAP.
- **Missing SQ** → fail + retry queue (do not invent a new invoice from PO lines).

## Tax and remarks

- Tax on AR draft lines is taken from the **base SQ** (seller tax already set in Flow 1).
- Human-readable lineage is appended into SAP comments / portal remarks via `infrastructure/ic-remarks-chain.ts` (PQ ↔ RFQ ↔ SQ labels when present).

## POS parking rules

- Only trimmed, case-insensitive `YES` enables parking. Any other `PARK` value uses the draft route.
- A single seller store must cover every SQ line warehouse. Multiple matches or no match fail into the dedicated parking retry.
- The lowest-ID counter of that store is used with its existing location, code and assigned user. The PO portal creator is stored as `UserName`.
- Parked JSON keeps `BaseType=23`, `BaseEntry=SQ DocEntry`, and `BaseLine=SQ LineNum`; POS later creates the real invoice through its existing `/Invoices` flow.
- Parking failure never falls back to `/Drafts`.
- The parked JSON is never written to IC logs; logs contain correlation/document/store/counter/transaction identifiers only.

### POS visibility

No POS UI or authorization logic changes. Existing same-store users with `INVOICE / CREATE` permission and a selected counter can see and resume the parked invoice, including cashiers. All item warehouses must belong to that store. Existing salesperson/manager payment checks continue to use the seller SQ salesperson.

## UI

| Surface                    | Role                                                 |
| -------------------------- | ---------------------------------------------------- |
| Intercompany notifications | Draft created, POS transaction parked, or failed     |
| Intercompany retries       | Re-run only the route recorded by the failed mapping |
| Relationship map           | Follow PO → `AR_DRAFT` or `PARKED_TRANSACTION`       |

There is no new IC or POS form. Draft-route users add/post from the SAP draft later; parked-route cashiers resume the row through the existing POS screens.

## Naming notes

- This **is** an A/R Invoice Draft (`POST /Drafts` / ODRF with `DocObjectCode` 13).
- Prefer map target `AR_DRAFT`; dual-lookup keeps older `AR_INVOICE` maps from re-firing.

## Related

- Module overview: [../../README.md](../../README.md)
- Data model detail: [../../docs/data-model-and-flows.md](../../docs/data-model-and-flows.md)
- Architecture: [../../docs/architecture.md](../../docs/architecture.md)
- Deploy / flags: [../../docs/deploy-and-ops.md](../../docs/deploy-and-ops.md)
- Flow 1 (independent RFQ chain): [../flow-1-pq-rfq-chain/README.md](../flow-1-pq-rfq-chain/README.md)
