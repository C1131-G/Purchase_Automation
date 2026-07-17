# `tests/` — SQL backend tests

Plain language: automated checks that the backend still works after changes.

## When you open it

You are adding a test, debugging a failing CI run, or learning how a route is expected to behave.

## Layout

| Folder | Simple role |
| --- | --- |
| `unit/` | Fast tests of pure logic (modules, core utils, services) |
| `integration/` | HTTP route tests with the app helper |
| `smoke/` | Quick import and OpenAPI contract checks |
| `helpers/` | Shared test app, auth helpers, DB helpers |
| `setup.ts` | Vitest global setup |

## How it connects

- Tests import application code from `src/`
- Integration/helpers may use test database helpers in `helpers/db.ts`
- They validate the SQL path (repositories + Postgres patterns), not SAP Service Layer

## How to run

From `sql-backend/`:

```bash
pnpm test:run
pnpm test:unit
pnpm test:integration
pnpm test:smoke
```

## How to navigate

1. Route behavior for a document → `integration/<feature>.routes.test.ts`
2. Isolated logic → `unit/modules/` or `unit/core/`
3. OpenAPI drift → `smoke/openapi-contract.test.ts`

## Parent

[← Package README](../README.md)
