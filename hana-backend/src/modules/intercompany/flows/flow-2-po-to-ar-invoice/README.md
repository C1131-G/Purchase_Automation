# Flow 2 — PO → real A/R Invoice

**Path:** `flows/flow-2-po-to-ar-invoice/`  
**Trigger:** `afterPoCreated` (non-draft PO; background by default)  
**Flag:** `ENABLE_FLOW2_DIRECT_PO`

| Step | Folder                 | Responsibility                                                |
| ---- | ---------------------- | ------------------------------------------------------------- |
| 1    | `01-po-capture/`       | Non-draft PO, IC vendor, flags, idempotent map check          |
| 2    | `02-build-ar-invoice/` | Pure payload (customer, tax, branch, remarks)                 |
| 3    | `03-post-ar-invoice/`  | Partner Service Layer **`POST /Invoices`** (real A/R Invoice) |
| 4    | `04-map-and-notify/`   | Map `PO → AR_INVOICE`, history, notify                        |

Orchestrator runs 01→02→03→04 after portal PO create. IC failure never fails PO.

> Naming note: this is **not** an A/R Invoice Draft (`/Drafts`). Document map target object is `AR_INVOICE` (legacy rows may still show `AR_DRAFT`).
