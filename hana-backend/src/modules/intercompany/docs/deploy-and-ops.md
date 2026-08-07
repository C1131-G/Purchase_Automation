# IC deploy and operations

## Prerequisites

- HANA API process healthy (pool + TypeORM + Service Layer client)
- `COMMON_DB` reachable with `IC_*` tables present
- Per-company Service Layer users in `IC_SAP_CONNECTION`
- BP pairs in `IC_BP_MAPPING` for A↔B (and C if used)

## Seed order (P0 last)

1. `IC_COMPANY` rows for each portal company
2. `IC_SAP_CONNECTION` (SL base URL + credentials)
3. `IC_BP_MAPPING` buyer/seller CardCode pairs
4. Optional tax sanity on seller OVTG (no static IC tax seed required)
5. Company C appendix (optional): [`../ops/seed-company-c-appendix.sql`](../ops/seed-company-c-appendix.sql)

Keep flow flags **off** until seed + SL login are verified.

## Feature flags (`IC_CONFIGURATION`)

| Key                         | Value         | When                              |
| --------------------------- | ------------- | --------------------------------- |
| `ENABLE_FLOW2_DIRECT_PO`    | `1`           | After PO → AR Invoice Draft smoke |
| `ENABLE_FLOW1_RFQ_CHAIN`    | `1`           | After RFQ chain smoke             |
| `MAX_RETRY_COUNT`           | `2` (default) | Retry ceiling                     |
| `DETECT_DRAFT_CRON_MINUTES` | e.g. `5`      | Worker detect cadence             |
| `REMARKS_PREFIX`            | `IC-`         | SAP remarks tags                  |

Recommended production order: **seed → worker up → enable Flow 2 → smoke → enable Flow 1 → smoke**.

## Worker process

```bash
pnpm --filter hana-backend worker:ic
pnpm --filter hana-backend worker:ic:once
```

| Env                     | Meaning                                 |
| ----------------------- | --------------------------------------- |
| `IC_WORKER_ONCE=1`      | Single loop then exit                   |
| `IC_WORKER_INTERVAL_MS` | Loop interval (min 5000, default 60000) |

Jobs:

| Job folder                                | Scheduler name    | Behavior                     |
| ----------------------------------------- | ----------------- | ---------------------------- |
| `background/jobs/01-detect-missed-pq/`    | `DETECT_PQ_DRAFT` | Catch-up Flow 1 (idempotent) |
| `background/jobs/02-process-retry-queue/` | `PROCESS_RETRY`   | Re-run failed actions        |
| `background/jobs/03-session-cleanup/`     | `SESSION_CLEANUP` | Expire `IC_SL_SESSION`       |

## Pilot table cleanup

| Item                     | Action                                                                         |
| ------------------------ | ------------------------------------------------------------------------------ |
| Old TypeORM pilot schema | Removed from code                                                              |
| Runtime map              | `IC_DOCUMENT_MAPPING` only                                                     |
| Optional export          | [`../ops/export-pilot-document-map.sql`](../ops/export-pilot-document-map.sql) |
| DBA drop                 | [`../ops/drop-pilot-document-map.sql`](../ops/drop-pilot-document-map.sql)     |

## Security

- Business `/api/v1/ic/*` routes resolve actor company from **session DB** → `IC_COMPANY`
- RFQ get/update/submit/convert enforce source/target company roles
- Notifications and retries are **company-scoped**
- API logs mask passwords / session cookies
- Flow logs use `corrId`; never log SL passwords
