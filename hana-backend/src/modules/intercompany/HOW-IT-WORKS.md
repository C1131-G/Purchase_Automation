# Intercompany — How It Works

> Live module guide (P1–P9). Pilot AJAX PO→AR runtime was removed in **P1**.

## Where to go

| Need                     | Doc                                                            |
| ------------------------ | -------------------------------------------------------------- |
| Run API / worker / flags | **[README.md](./README.md)**                                   |
| Phases & checklists      | **[plan.md](./plan.md)**                                       |
| Architecture             | **[IC-ARCHITECTURE-PLAN.md](./IC-ARCHITECTURE-PLAN.md)**       |
| Tables & DDL             | **[IC-DATA-MODEL-AND-FLOWS.md](./IC-DATA-MODEL-AND-FLOWS.md)** |
| Ops SQL                  | **[ops/](./ops/)**                                             |

## User-facing behavior (when flags on + seed done)

| Action                                 | Result                                              |
| -------------------------------------- | --------------------------------------------------- |
| Save **PQ Draft** with IC vendor       | Flow 1: custom RFQ + seller notification            |
| Seller opens **Request For Quotation** | Fill price / discount / delivery → Submit           |
| Buyer **Convert** submitted RFQ        | Real PQ (buyer) + SQ (seller) + maps                |
| Create **PO** with IC vendor           | Flow 2: partner **AR Invoice Draft** + notification |
| Header IC badge                        | Unread count for session company only               |

When flags are **0** (default until P0 go-live): hooks skip; UI still loads empty RFQ/notification lists.

## Document spine

- New links: `IC_DOCUMENT_MAPPING` only
- Pilot `INTERCOMPANY_DOCUMENT_MAP`: application schema removed in P9; DBA drop via `ops/drop-pilot-document-map.sql`
