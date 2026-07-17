# `routes/` — URL tree

Plain language: this folder is the **table of contents for HTTP APIs**. It does not implement business rules; it mounts feature routers and global gates.

## When you open it

You need the path of an endpoint, or you are wiring a new module into `/api/v1`.

## Main files

| File | Simple role |
| --- | --- |
| `api.routes.ts` | Public routes (auth, organizations) then protected mounts under session + tenant context |
| `health.routes.ts` | Health check endpoints |

## How it connects

- **Called by:** `app.ts` (`app.use("/api/v1", …)`)
- **Calls:** each feature’s `*.routes.ts` under [modules/](../modules/README.md)
- **Uses:** [core/](../core/README.md) middleware (`validateSession`, `initTenantContext`, rate limit, transformers) on protected groups
- **Does not** run SQL itself

## How to navigate

1. Open `api.routes.ts` and search for the feature name (for example `purchase-order` or `auth`).
2. Note whether the route is public or behind session/tenant middleware.
3. Jump to that module’s `*.routes.ts` for method, path, and validation.

## Parent

[← src README](../README.md) · [Package README](../../README.md)
