# `db/` — PostgreSQL schema, pools, seed

Plain language: this folder is **how the app talks to Postgres** — table definitions, migrations, seed data, and connection pools.

## When you open it

You need a new column/table, to run migrations, to seed demo data, or to understand multi-tenant pools.

## Main pieces

| Name | Simple role |
| --- | --- |
| `client.ts` | Registry pool + per-tenant pools + `getDb()` helpers |
| `schema/*.ts` | Drizzle table definitions (orders, users, lines, …) |
| `schema/index.ts` | Barrel export of schema |
| `migrations/` | SQL migration history (Drizzle Kit) |
| `migrate.ts` | Runs migrations |
| `seed.ts` + `seed/` | Demo / local seed data |
| Package root `drizzle.config.ts` | Drizzle Kit configuration (next to package README) |

## How it connects

- **Called by:** module [repositories](../modules/README.md) and tenant middleware in [core/](../core/README.md)
- **Calls:** PostgreSQL
- **Multi-tenant:** registry holds users/orgs/access; tenant pools hold company data

## Example

Purchase order list: module query → `purchase-order.repository.ts` → `getDb()` → Drizzle SELECT on `purchase_orders` tables.

## How to navigate

1. Connection / pools → `client.ts`
2. Table shape → `schema/purchase-orders.ts` (+ lines file)
3. Change history → `migrations/`
4. Local demo data → `seed/` and `pnpm db:seed` from the package README

## Parent

[← src README](../README.md) · [Package README](../../README.md)
