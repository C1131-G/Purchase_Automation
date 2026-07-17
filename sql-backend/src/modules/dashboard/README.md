# `dashboard/` — KPIs and analytics (SQL)

Plain language: APIs that power the home dashboard — purchase, sales, and inventory summaries, trends, funnels, top partners, and exceptions. Data is **read from PostgreSQL**; shared math lives under `services/dashboard/`.

## When you open it

Charts or KPI cards are wrong, a new dashboard tile needs an endpoint, or you need the SQL-only compact stats endpoints.

## Main files

| File | Simple role |
| --- | --- |
| `dashboard.routes.ts` | All dashboard URLs (requires login) |
| `dashboard.controller.ts` | Segment + compatibility + SQL compact handlers |
| `dashboard-analytics.controller.ts` | Extra analytics controller surface |
| `dashboard.service.ts` | Orchestration; uses `services/dashboard/*` and DB access |
| `dashboard.schema.ts` | Zod / OpenAPI for query contracts |

Unlike document modules, this folder is **lighter on files**: heavy SQL and formulas are often in [services/dashboard](../../services/README.md), not many local `*.queries.ts` files.

## How it connects

```text
routes/api.routes.ts
  → dashboard.routes.ts  (validateSession + tenant context from parent router)
  → dashboard.controller
  → dashboard.service
  → services/dashboard/*  (purchase / sales / inventory math)
  → Postgres (tenant pool via getDb / service data helpers)
```

- **Called by:** frontend dashboard screens
- **Calls:** Postgres + shared dashboard utilities
- **Does not** use SAP Service Layer

## Endpoint groups (from routes)

| Group | Examples |
| --- | --- |
| Compatibility | `/purchase-summary`, `/sales-summary`, `/stats` |
| Purchase | `/purchase/kpi-summary`, `module-cards`, `trend`, `funnel`, `top-partners`, `exceptions` |
| Sales | same under `/sales/…` |
| Inventory | same under `/inventory/…` |
| SQL compact | `/summary`, `/purchase`, `/sales`, `/inventory` |

## How to navigate

1. Find the URL in `dashboard.routes.ts`.
2. Jump to `dashboard.controller.ts` → `dashboard.service.ts`.
3. Follow into `src/services/dashboard/` for calculations and data loading.

## Parent

[← modules README](../README.md) · [src README](../../README.md) · [Package README](../../../README.md)
