# Flow 1 — Real PQ → RFQ → update PQ + SQ

**Path:** `flows/flow-1-pq-rfq-chain/`  
**Trigger:** `afterPqSaved` (PQ create/update; background by default)  
**Flag:** `ENABLE_FLOW1_RFQ_CHAIN`

| Step | Folder                  | Responsibility                                     |
| ---- | ----------------------- | -------------------------------------------------- |
| 1    | `01-pq-capture/`        | Is this an IC **real PQ**? Flags / already mapped? |
| 2    | `02-create-rfq/`        | Create custom RFQ header + lines from PQ           |
| 3    | `03-notify-seller/`     | Notify partner company about new RFQ               |
| 4    | `04-seller-fill-rfq/`   | Seller fills price/delivery and submits (API)      |
| 5    | `05-convert-pq-and-sq/` | Update buyer PQ from RFQ + create partner SQ       |

Orchestrator auto-runs 01→02→03 on PQ save. 04/05 are user/API-driven (submit may auto-convert).

> Naming note: this is **not** the SAP ODRF draft path. Historical types may still say `IcPqDraftHookInput` / `afterPqDraftSaved` (deprecated alias of `afterPqSaved`).
