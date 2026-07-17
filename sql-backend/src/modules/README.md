# `modules/` — business features

Plain language: **one folder per product feature**. This is where most day-to-day work happens (login, purchase orders, invoices, dashboard, …).

## When you open it

You are changing an API for a screen, fixing a document flow, or adding a new feature that mirrors an existing one.

## Feature folders

| Folder | Simple role |
| --- | --- |
| `auth/` | Login / logout / session |
| `organization/` | Company / org list |
| `purchase-order/` | Purchase orders (good full example) |
| `purchase-quotation/` | Purchase quotations |
| `grpo/` | Goods receipt PO |
| `goods-receipt/`, `goods-issue/` | Inventory receipts / issues |
| `transfer/`, `transfer-request/` | Stock transfers |
| `ap-invoice/`, `ap-credit-memo/` | AP billing |
| `ar-invoice/`, `ar-credit-memo/` | AR billing |
| `incoming-payment/`, `outgoing-payment/` | Payments |
| `sales-order/`, `sales-quotation/` | Sales documents |
| `item-master/`, `master-data/`, `bank-details/` | Lookups and masters |
| [`attachments/`](./attachments/README.md) | File attachments (Postgres + disk) — **deep guide** |
| [`dashboard/`](./dashboard/README.md) | KPIs and analytics — **deep guide** |
| `relationship-map/` | Document relationship graphs |

Deeper READMEs exist only for unusually large modules (`dashboard/`, `attachments/`). Other features follow the purchase-order pattern below.

## File pattern (example: purchase-order)

SQL modules usually include a **repository** file for all SQL.

| File pattern | Simple role |
| --- | --- |
| `*.routes.ts` | URLs + middleware |
| `*.controller.ts` | HTTP in/out (often shapes fields for the UI) |
| `*.service.ts` | Facade / orchestration entry |
| `*.schema.ts` | Zod validation + OpenAPI |
| `*.queries.ts` | **Read** orchestration |
| `*.mutations.ts` / `*.mutations.create.ts` / `*.mutations.update.ts` | **Write** orchestration |
| `*.repository.ts` | **All Drizzle SQL** against Postgres |

## How it connects

```text
routes/api.routes.ts
  → modules/<feature>/<feature>.routes.ts
  → controller → service
  → queries | mutations
  → repository → db/client getDb() → Postgres
```

- **Called by:** [routes/](../routes/README.md) (after session + tenant middleware on protected routes)
- **Calls:** [db/](../db/README.md) via repositories; [services/](../services/README.md) for shared helpers
- **Auth module** uses repository against registry users / access tables

## How to navigate

1. Find the feature folder by name (screen name usually matches).
2. Open `*.routes.ts` to see URLs.
3. Follow controller → service → queries/mutations → **repository**.
4. Copy `purchase-order/` when adding a similar document module.

## Parent

[← src README](../README.md) · [Package README](../../README.md)
