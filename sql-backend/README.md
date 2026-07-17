# SQL Backend

The SQL backend is the PostgreSQL service for Vendor Portal. It serves API routes, exports, seed data, and Drizzle-powered database workflows.

## Purpose

This package owns:

- PostgreSQL-backed API reads and writes
- Seed data and local database setup
- Export generation for documents
- Session-based backend auth support
- Swagger/OpenAPI documentation

## Entry Points

- HTTP server bootstrap: `src/server.ts`
- Express application: `src/app.ts`

## Stack

- Express
- PostgreSQL
- Drizzle ORM
- Session middleware
- Swagger UI
- Zod + OpenAPI generation
- tsup for production builds

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the backend in watch mode |
| `pnpm build` | Type-check and compile the backend to `dist/` with tsup |
| `pnpm start` | Run the compiled server from `dist/server.js` |
| `pnpm test` | Run the Vitest suite in watch mode |
| `pnpm test:run` | Run the Vitest suite once |
| `pnpm test:unit` | Run unit tests only |
| `pnpm test:integration` | Run integration tests only |
| `pnpm test:smoke` | Run smoke tests only |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm openapi:lint` | Check the OpenAPI contract smoke test |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run the local database migration script |
| `pnpm db:seed` | Seed local database data |

## Environment Variables

The backend validates its environment at startup. The sample values live in `.env.example` and the main runtime values are:

```bash
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
LOG_LEVEL=info
SESSION_SECRET=replace-this-with-a-minimum-32-character-secret-key
TRUST_PROXY_HOPS=1
SHUTDOWN_TIMEOUT=10000
ATTACHMENTS_BASE_PATH=./uploads
DEFAULT_CURRENCY_CODE=INR
```

## Local Setup

From the repository root:

```bash
pnpm install
pnpm dev:sql-backend
```

The server listens on:

```text
http://localhost:4000
```

Swagger is available at:

```text
http://localhost:4000/api-docs
```

## Architecture

The SQL backend follows a layered structure similar to the HANA backend:

- `routes/` - HTTP route registration
- `services/` - shared helpers (export, document-link, dashboard)
- `db/` - Drizzle client, migrations, and seed scripts
- `modules/` - one folder per business feature (auth, purchase-order, …)
- `validation/` - Zod schemas for request and response contracts
- `shared/` - reusable route handlers and helpers
- `core/` - logging, errors, middleware (including tenant context), and observability

### Request path (short)

```text
HTTP → app.ts → routes/ → (session + tenant context) → modules/<feature>
  → controller → service → queries|mutations → repository → Postgres
```

## Folder guide

Use these package-local READMEs to navigate folders and see how they connect. They are written for developers and for anyone learning the project.

| Guide | What it covers |
| --- | --- |
| [src/README.md](./src/README.md) | Full `src/` map and request flow |
| [src/config/README.md](./src/config/README.md) | Env, CORS, session, Swagger setup |
| [src/core/README.md](./src/core/README.md) | Auth, tenant context, errors, logs, metrics |
| [src/db/README.md](./src/db/README.md) | Drizzle schema, migrations, seed, pools |
| [src/modules/README.md](./src/modules/README.md) | Feature modules and file pattern |
| [src/routes/README.md](./src/routes/README.md) | How `/api/v1` mounts modules |
| [src/services/README.md](./src/services/README.md) | Document-link, export, dashboard helpers |
| [src/shared/README.md](./src/shared/README.md) | Shared route handlers |
| [src/types/README.md](./src/types/README.md) | DB, Drizzle, Express, session types |
| [src/validation/README.md](./src/validation/README.md) | Env and API Zod schemas |
| [tests/README.md](./tests/README.md) | Unit, integration, and smoke tests |

**How to navigate**

1. Read this package README for setup, env, scripts, and `db:migrate` / `db:seed`.
2. Open [src/README.md](./src/README.md) for the folder map.
3. Open the folder README for the area you need (for example modules or db).
4. Use purchase-order under `modules/` as the concrete example of a full feature (includes `*.repository.ts`).

## Build And Deploy

- Production output lives in `dist/`
- Start production with `node dist/server.js`
- Ensure PostgreSQL is reachable before booting

## Troubleshooting

- Environment validation failures happen before the server starts and usually indicate a missing or malformed env var
- If database writes fail, confirm the `DATABASE_URL` and local schema state
- If exports fail, check file permissions and the configured attachment path
