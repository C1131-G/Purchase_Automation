# `config/` — setup for the server

Plain language: this folder holds **settings**, not business features. It tells the app how to start, how sessions and CORS work, and how API docs are shown.

## When you open it

You need to change ports, cookies, allowed frontend origins, Swagger docs, or environment loading.

## Main files

| File | Simple role |
| --- | --- |
| `env.ts` | Loads and exposes validated environment variables |
| `cors.ts` | Which browser origins may call the API |
| `session.ts` | Login cookie / file session store setup |
| `swagger.ts` | Swagger UI registration |
| `swagger-registry.ts` | Collects OpenAPI pieces |
| `swagger-paths.ts` | API path docs |
| `swagger-paths-documents.ts` | Document-related OpenAPI paths |
| `swagger-document-path-register.ts` | Registers document paths into Swagger |
| `zod.ts` | Shared Zod helpers used with OpenAPI |

## How it connects

- **Called by:** `server.ts` / `app.ts` at startup
- **Calls:** [validation/](../validation/README.md) for env rules; session store on disk under `sessions/`
- **Does not** run SQL itself

## How to navigate

1. Runtime settings → `env.ts` and package env list in the [package README](../../README.md)
2. Browser access issues → `cors.ts` + `FRONTEND_URL`
3. Login cookies → `session.ts`
4. API docs in the browser → `swagger.ts` and related files

## Parent

[← src README](../README.md) · [Package README](../../README.md)
