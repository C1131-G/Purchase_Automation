# SQL Backend — `src/`

This folder is the application source for the PostgreSQL backend. Everything that runs in production (except build tooling) starts here.

## When you open it

You want to know **where code lives**, **how a request moves**, or **which folder to edit** for a feature.

## Top-level map

| Name | Simple role |
| --- | --- |
| `server.ts` | Starts the Postgres registry pool, then listens on the port |
| `app.ts` | Builds the Express HTTP stack (middleware, routes, errors) |
| [config/](./config/README.md) | Environment, CORS, session cookies, Swagger docs |
| [core/](./core/README.md) | Auth, **tenant context**, errors, logging, metrics |
| [db/](./db/README.md) | Drizzle schema, migrations, seed, connection pools |
| [modules/](./modules/README.md) | Business features (login, PO, invoices, …) |
| [routes/](./routes/README.md) | Mounts all APIs under `/api/v1` |
| [services/](./services/README.md) | Shared helpers: document-link, export, dashboard |
| [shared/](./shared/README.md) | Small reusable HTTP handlers |
| [types/](./types/README.md) | TypeScript types for DB, Express, and sessions |
| [validation/](./validation/README.md) | Zod schemas for env and contracts |

## How a request connects the folders

```text
Browser / frontend
  → app.ts                    (security, session, logging)
  → routes/                   (pick the feature URL)
  → core tenant middleware    (choose company Postgres pool)
  → modules/*                 (routes → controller → service)
  → queries / mutations
  → repository                (Drizzle SQL)
  → Postgres
  → JSON response or core/errors
```

**Rule of thumb:** all reads and writes go through **repository → Postgres**. There is no SAP Service Layer in this package.

## How to navigate (start here)

1. Boot and HTTP shell: `server.ts` → `app.ts`
2. URL tree: [routes/](./routes/README.md)
3. Feature work: [modules/](./modules/README.md) (start with `purchase-order/`)
4. Tables and migrations: [db/](./db/README.md)
5. Shared document helpers: [services/](./services/README.md)

## Parent

[← Package README](../README.md)
