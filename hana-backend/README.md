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

| Command                 | Purpose                                                 |
| ----------------------- | ------------------------------------------------------- |
| `pnpm dev`              | Start the backend in watch mode                         |
| `pnpm build`            | Type-check and compile the backend to `dist/` with tsup |
| `pnpm start`            | Run the compiled server from `dist/server.js`           |
| `pnpm test`             | Run the Vitest suite in watch mode                      |
| `pnpm test:run`         | Run the Vitest suite once                               |
| `pnpm test:unit`        | Run unit tests only                                     |
| `pnpm test:integration` | Run integration tests only                              |
| `pnpm test:smoke`       | Run smoke tests only                                    |
| `pnpm test:coverage`    | Run tests with coverage                                 |
| `pnpm openapi:lint`     | Check the OpenAPI contract smoke test                   |

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

The HANA backend is a **modular monolith**:

| Area             | Path              | Role                                                   |
| ---------------- | ----------------- | ------------------------------------------------------ |
| HTTP mount       | `src/routes/`     | `/api/v1` assembly                                     |
| Features         | `src/modules/*`   | controller → service → queries / mutations             |
| SAP HANA schemas | `src/db/`         | TypeORM entity schemas + tenant data sources           |
| Shared SAP I/O   | `src/services/`   | HANA pool, Service Layer client, PDF/Excel/Word export |
| Cross-cutting    | `src/core/`       | auth middleware, errors, logging, observability        |
| Config           | `src/config/`     | env, session, swagger, middleware                      |
| Contracts        | `src/validation/` | env + API Zod schemas                                  |

### Request path (short)

```text
HTTP → app.ts → routes/api.routes.ts → modules/<feature>
  → controller → service
  → queries (read HANA) | mutations (write Service Layer)
```

### Intercompany

Partner automation lives only in `src/modules/intercompany/` (import public wall only).

| Doc                | Path                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Module README      | [src/modules/intercompany/README.md](./src/modules/intercompany/README.md)                                       |
| Architecture       | [src/modules/intercompany/docs/architecture.md](./src/modules/intercompany/docs/architecture.md)                 |
| Data model & flows | [src/modules/intercompany/docs/data-model-and-flows.md](./src/modules/intercompany/docs/data-model-and-flows.md) |
| Deploy / worker    | [src/modules/intercompany/docs/deploy-and-ops.md](./src/modules/intercompany/docs/deploy-and-ops.md)             |
| Visual guide       | [ic-explained.html](./ic-explained.html)                                                                         |

**Canonical flow folders**

- Flow 1: `modules/intercompany/flows/flow-1-pq-rfq-chain/` (real PQ → RFQ → PQ + SQ)
- Flow 2: `modules/intercompany/flows/flow-2-po-to-ar-invoice/` (PO → real A/R Invoice)

### Feature modules (current)

`auth`, `organization`, `master-data`, `purchase-quotation`, `purchase-order`, `grpo`, `ap-invoice`, `ap-credit-memo`, `sales-quotation`, `outgoing-payment`, `bank-details`, `attachments`, `dashboard`, `relationship-map`, `intercompany`.

**How to navigate**

1. This package README for setup, env, and scripts.
2. `modules/purchase-order/` as the template document feature.
3. `modules/intercompany/` for partner flows (see its README first).

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
