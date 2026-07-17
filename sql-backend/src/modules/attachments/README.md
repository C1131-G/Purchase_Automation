# `attachments/` — file upload and download (SQL)

Plain language: handles **files stored with the SQL backend** — upload, list, download, and delete. Metadata lives in **Postgres**; file bytes live on disk (see `ATTACHMENTS_BASE_PATH` in the package README).

## When you open it

Upload fails, list is empty, download 404s, delete does not clean disk/DB, or attachment schema/path rules need a change.

## Main files

| File | Simple role |
| --- | --- |
| `attachments.routes.ts` | Upload, list, download, delete (session required) |
| `attachments.controller.ts` | HTTP entry points |
| `attachments.service.ts` | Business rules and orchestration |
| `attachments.repository.ts` | **All Drizzle SQL** for attachment rows |
| `attachments.schema.ts` | Zod validation + OpenAPI |

## How it connects

```text
routes/api.routes.ts
  → attachments.routes.ts  (validateSession + tenant context)
  → controller → service
  → repository → Postgres (attachment metadata)
  → filesystem under ATTACHMENTS_BASE_PATH (file bytes)
```

- **Called by:** frontend create screens and document UIs that attach files
- **Calls:** [db/](../../db/README.md) via repository; local disk for content
- **No SAP Service Layer** in this package

## Public routes in this module

| Method | Path | Role |
| --- | --- | --- |
| `POST` | `/upload` | Upload file(s) |
| `GET` | `/` | List attachments |
| `GET` | `/:id/download` | Download by id |
| `DELETE` | `/:id` | Remove attachment |

Exact mount prefix is set in `routes/api.routes.ts` (under `/api/v1`).

## How to navigate

1. Start at `attachments.routes.ts`.
2. Metadata / list bugs → `repository.ts` + `db/schema/attachments.ts`.
3. Missing files on disk → service + `ATTACHMENTS_BASE_PATH` env.
4. Validation / OpenAPI → `attachments.schema.ts`.

## Parent

[← modules README](../README.md) · [src README](../../README.md) · [Package README](../../../README.md)
