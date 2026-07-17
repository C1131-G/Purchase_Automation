# `types/` — TypeScript shapes for DB, HTTP, and sessions

Plain language: type definitions so TypeScript knows database row shapes, Express request/session fields, and Drizzle helpers. Not runtime business logic.

## When you open it

You need stronger typing on sessions, Express, or database-related types used across modules.

## Main files

| File | Simple role |
| --- | --- |
| `db.types.ts` | Database-related shared types |
| `drizzle.types.ts` | Drizzle helper types |
| `express.d.ts` | Express type augmentations |
| `session.d.ts` | What fields login stores on the session |

## How it connects

- **Used by:** controllers, middleware, repositories, services
- **Filled at runtime by:** auth login (session) and Postgres results
- **Does not** run queries by itself

## How to navigate

1. Session fields after login → `session.d.ts`
2. Express request typing → `express.d.ts`
3. DB/Drizzle shared types → `db.types.ts` / `drizzle.types.ts`

## Parent

[← src README](../README.md) · [Package README](../../README.md)
