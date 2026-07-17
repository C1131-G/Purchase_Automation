# `core/` — cross-cutting engine pieces

Plain language: pieces that **every request** may touch — security, tenant database choice, errors, logs, and metrics.

## When you open it

Login is rejected, the wrong company database is used, errors look wrong, or logs/metrics need a change.

## Subfolders

| Subfolder | Simple role |
| --- | --- |
| `middleware/` | Auth, **tenant context**, rate limits, request logging, validation, request transformers |
| `errors/` | `AppError` types and the global error handler |
| `logger/` | Pino logger (structured logs) |
| `observability/` | Metrics, Prometheus, OpenTelemetry tracing |
| `utils/` | Formatting helpers, series, SAP field maps, query helpers |

## Tenant middleware (important)

After login, the session remembers which company database to use. `middleware/tenant.middleware.ts` picks the right Postgres pool for the rest of that request.

## How it connects

- **Called by:** `app.ts` and [routes/](../routes/README.md) (session + tenant on protected APIs)
- **Calls:** [db/](../db/README.md) pool helpers (`getDb` / tenant pools)
- **Data:** does not own tables; routes traffic to the correct tenant DB

## How to navigate

1. “Is the user logged in?” → `middleware/auth.middleware.ts`
2. “Which company DB?” → `middleware/tenant.middleware.ts`
3. Error shape / HTTP status → `errors/`
4. Field name transforms for the UI → `utils/` transformers / field maps

## Parent

[← src README](../README.md) · [Package README](../../README.md)
