# SQL Backend

The SQL backend is the SQL Server-backed service for Vendor Portal. It uses Express, TypeORM, and SQL migrations to support the SQL-side APIs and lookup flows.

## Purpose

This package owns:

- SQL Server reads and writes
- Tenant-aware data access patterns
- TypeORM entities and migrations
- Session-based auth and protected routes
- Swagger documentation for the SQL-side API

## Entry Points

- HTTP server bootstrap: `src/server.ts`
- Express application factory: `src/app.ts`

## Stack

- Express
- TypeORM
- SQL Server (`mssql`)
- Express session + file session store
- Swagger UI
- Zod + OpenAPI generation
- tsup for production builds
- SQL migration tooling

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the backend in watch mode |
| `pnpm build` | Compile the backend to `dist/` with tsup |
| `pnpm start` | Run the compiled server from `dist/server.js` |
| `pnpm test` | Run the Vitest suite |
| `pnpm clean` | Free port 4001 and restart dev mode |
| `pnpm migration:generate` | Generate a new SQL migration |
| `pnpm migration:run` | Apply pending migrations |
| `pnpm migration:revert` | Revert the last migration |
| `pnpm migration:show` | Show migration status |

## Environment Variables

The backend validates environment variables at startup. The key runtime values are:

```bash
SQL_COMMON_DB=PortalCommon
SQL_HOST=localhost
SQL_PORT=1433
SQL_USER=sa
SQL_PASSWORD=
PORT=4001
SESSION_SECRET=
FRONTEND_URL=http://localhost:5173
NODE_ENV=
```

## Local Setup

From the repository root:

```bash
pnpm install
pnpm dev:sql-backend
```

The server listens on:

```text
http://localhost:4001
```

Swagger is available at:

```text
http://localhost:4001/api-docs
```

## Architecture

The SQL backend follows the same layered pattern as the HANA backend:

- `routes/` - HTTP route registration
- `services/` - business logic and orchestration
- `dal/` - SQL data access
- `db/` - TypeORM entity schemas, configuration, and migrations
- `validation/` - Zod schemas for request and response contracts
- `core/` - logging, errors, middleware, and shared utilities

## Migrations

Migration support is part of the package design.

Recommended workflow:

1. Change or add an entity/schema
2. Generate a migration
3. Review the SQL
4. Run the migration locally
5. Commit the entity and migration together

## Build And Deploy

- Production output lives in `dist/`
- Start production with `node dist/server.js`
- Run migrations before or during deployment as required by your environment

## Operational Notes

- Keep SQL migration files under version control
- Do not hand-edit generated migration output unless you understand the downstream schema impact
- Keep the SQL backend isolated from the HANA backend so schema and runtime concerns do not bleed across packages

## Troubleshooting

- If the server fails at startup, check environment validation first
- If connections fail, verify SQL Server host, port, and credentials
- If schema drift appears, inspect the migration history and entity definitions together

