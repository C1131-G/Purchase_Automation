# `validation/` — contracts and env rules

Plain language: **rules for good data** — environment variables and Zod schemas for requests/responses. Many schemas live here so SQL APIs stay consistent; modules also import them from their `*.schema.ts` wrappers.

## When you open it

The server refuses to start (bad env), or you need the shared Zod contract for a document or master-data payload.

## Main pieces

| Name | Simple role |
| --- | --- |
| `schemas/` | Zod schemas for env, documents, masters, and shared API shapes |

## How it connects

- **Called by:** boot (env), [config/](../config/README.md), and module `*.schema.ts` / middleware validation
- **Works with:** [core/](../core/README.md) `validation.middleware` and OpenAPI generation
- **Module layer:** feature `*.schema.ts` often re-exports or composes these rules for routes

## How to navigate

1. Startup env failures → env schema under `schemas/` + [package README](../../README.md) env list
2. Feature request body → start at `modules/<name>/<name>.schema.ts`, then follow imports into `validation/schemas/`

## Parent

[← src README](../README.md) · [Package README](../../README.md)
