# Backend structure

Two separate apps. Same API shape. Different storage.

## Structure docs

| Doc | Backend |
|-----|---------|
| **[backend-structure-hana.md](./backend-structure-hana.md)** | `hana-backend/` — HANA reads + Service Layer writes |
| **[backend-structure-sql.md](./backend-structure-sql.md)** | `sql-backend/` — Postgres only |

Each structure doc covers: folders · module files · boot · **login E2E** · **PO E2E**.

## Related docs

| Doc | Topic |
|-----|-------|
| **[login-architecture.md](./login-architecture.md)** | Org list + login flow (HANA vs SQL) |
| **[observability.md](./observability.md)** | Metrics, tracing, request logs |
| **[identifier-naming.md](./identifier-naming.md)** | Oxlint id-length · short name map |
| **[tables.md](./tables.md)** | Database / table reference |
| **[attachment.md](./attachment.md)** | Attachments |
| **[tax-details.md](./tax-details.md)** | Tax details |

## Repo layout

```text
Vendor-Portal/
├── hana-backend/     port 4000 · SAP path
├── sql-backend/      port 4001 · Postgres path
├── frontend/
└── Docs/
    ├── backend-structure.md        ← this index
    ├── backend-structure-hana.md
    ├── backend-structure-sql.md
    ├── login-architecture.md
    ├── observability.md
    ├── identifier-naming.md
    ├── tables.md
    ├── attachment.md
    └── tax-details.md
```

## HANA vs SQL (quick)

| | **HANA** | **SQL** |
|--|----------|---------|
| Read | HANA SQL | Postgres |
| Write | Service Layer | Postgres |
| Login users | OUSR + SL | users + user_db_access |
| Org list | all companies | after username |
