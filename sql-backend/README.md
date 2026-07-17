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
- `services/` - business logic and orchestration
- `db/` - Drizzle client, migrations, and seed scripts
- `validation/` - Zod schemas for request and response contracts
- `shared/` - reusable route handlers and helpers
- `core/` - logging, errors, middleware, and observability

## Build And Deploy

- Production output lives in `dist/`
- Start production with `node dist/server.js`
- Ensure PostgreSQL is reachable before booting

## Troubleshooting

- Environment validation failures happen before the server starts and usually indicate a missing or malformed env var
- If database writes fail, confirm the `DATABASE_URL` and local schema state
- If exports fail, check file permissions and the configured attachment path
