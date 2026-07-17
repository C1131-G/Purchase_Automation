# HANA Backend

The HANA backend is the SAP-connected Express service for Vendor Portal. It uses TypeORM against SAP HANA, manages local session auth, exposes Swagger docs, and coordinates outbound calls to SAP Service Layer.

## Purpose

This package owns:

- SAP HANA reads for portal data
- SAP Service Layer write operations
- Session-based authentication against SAP
- OpenAPI/Swagger documentation
- HANA-specific master data, transactional flows, and lookups

## Entry Points

- HTTP server bootstrap: `src/server.ts`
- Express application: `src/app.ts`

## Stack

- Express
- TypeORM
- SAP HANA client (`@sap/hana-client`)
- Express session + file session store
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

## Environment Variables

The backend validates its environment at startup. Required keys are defined in `src/validation/schemas/env.schema.ts`. The main runtime values are:

```bash
HANA_HOST=
HANA_PORT=
HANA_USER=
HANA_PASSWORD=
COMMON_DB=
ORGANIZATION_TABLE=
SESSION_SECRET=
PORT=4000
FRONTEND_URL=http://localhost:5173
SERVICE_LAYER_URL=
SERVICE_LAYER_HTTPS_VERIFY=
HANA_POOLING=
HANA_MAX_POOL_SIZE=
HANA_CONNECTION_LIFE_TIME=
SHUTDOWN_TIMEOUT=
TRUST_PROXY_HOPS=
NODE_ENV=
```

## Local Setup

From the repository root:

```bash
pnpm install
pnpm dev:hana-backend
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

The HANA backend follows a simple layered structure:

- `routes/` - HTTP route registration
- `services/` - business logic and orchestration
- `db/` - TypeORM schema definitions and data source bootstrapping
- `modules/` - one folder per business feature (auth, purchase-order, …)
- `validation/` - Zod schemas for request and response contracts
- `core/` - logging, errors, middleware, and shared utilities

### Request path (short)

```text
HTTP → app.ts → routes/ → modules/<feature> → controller → service
  → queries (read HANA) | mutations (write Service Layer)
```

## Folder guide

Use these package-local READMEs to navigate folders and see how they connect. They are written for developers and for anyone learning the project.

| Guide | What it covers |
| --- | --- |
| [src/README.md](./src/README.md) | Full `src/` map and request flow |
| [src/config/README.md](./src/config/README.md) | Env, session, Swagger setup |
| [src/core/README.md](./src/core/README.md) | Auth gate, errors, logs, metrics |
| [src/db/README.md](./src/db/README.md) | TypeORM schemas and tenant DB access |
| [src/modules/README.md](./src/modules/README.md) | Feature modules and file pattern |
| [src/routes/README.md](./src/routes/README.md) | How `/api/v1` mounts modules |
| [src/services/README.md](./src/services/README.md) | HANA pool, Service Layer, exports |
| [src/shared/README.md](./src/shared/README.md) | Shared route handlers |
| [src/types/README.md](./src/types/README.md) | Express and session types |
| [src/validation/README.md](./src/validation/README.md) | Env and API Zod schemas |
| [tests/README.md](./tests/README.md) | Unit, integration, and smoke tests |

**How to navigate**

1. Read this package README for setup, env, and scripts.
2. Open [src/README.md](./src/README.md) for the folder map.
3. Open the folder README for the area you need (for example modules or db).
4. Use purchase-order under `modules/` as the concrete example of a full feature.

## Runtime Flow

Startup order matters:

1. Load environment variables
2. Initialize the HANA pool
3. Initialize TypeORM data sources
4. Initialize the SAP Service Layer client
5. Start the HTTP server

## Build And Deploy

- Production output lives in `dist/`
- Start production with `node dist/server.js`
- Ensure the backend can reach HANA and SAP Service Layer before booting

## Operational Notes

- Keep session handling enabled because routes rely on authenticated SAP sessions
- Keep Swagger enabled for contract visibility and manual verification
- Keep generated frontend files such as `routeTree.gen.ts` out of this package
- Avoid changing generated OpenAPI plumbing by hand unless the schema source changes

## Troubleshooting

- Environment validation failures happen before the server starts and usually indicate a missing or malformed env var
- If SAP requests fail, verify the Service Layer session and credentials first
- If HANA queries fail, confirm the tenant database and connection pool settings
