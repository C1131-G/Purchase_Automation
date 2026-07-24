# Intercompany (IC) — Detailed Implementation Plan

**Status:** P1–P9 done · **P0 seed deferred last** (before go-live / live smoke)  
**This file is the master build plan.** Execute phases in order (P0 seed may run last before go-live).

| Related doc                                                | Role                                                                        |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| [plan.md](./plan.md)                                       | **This file** — phases, tasks, **process folder map**, tests, exit criteria |
| [IC-ARCHITECTURE-PLAN.md](./IC-ARCHITECTURE-PLAN.md)       | Full MS tree, import rules, debug map (keep in sync with § Folder design)   |
| [IC-DATA-MODEL-AND-FLOWS.md](./IC-DATA-MODEL-AND-FLOWS.md) | Tables, DDL, Flow 1/2 wireframes, object codes                              |

---

## Locked decisions

| Topic                                                | Decision                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| Shape                                                | Modular monolith inside `hana-backend` (MS-shaped folders)           |
| Deploy                                               | API process + separate **background worker** process (same codebase) |
| Pilot                                                | **Clear fully in P1** — no hybrid old/new runtime                    |
| Flows                                                | Flow 1 = PQ Draft → RFQ → Convert → PQ + SQ · Flow 2 = PO → AR Draft |
| Folder rule                                          | **One major process = one folder** (numbered, verb-object name)      |
| File rule                                            | **One major job = one file** (no god services)                       |
| RFQ                                                  | Custom tables only (`IC_RFQ_*`), not SAP object                      |
| Partner login                                        | `IC_SAP_CONNECTION` only (never portal user for partner DB)          |
| Routing                                              | `IC_BP_MAPPING` pairwise full mesh                                   |
| Detect                                               | Hybrid: API hook primary + background safety-net                     |
| Retry                                                | Max 1–2; never fail PO/PQ create when IC fails                       |
| Cancel                                               | No partner cancel cascade                                            |
| UI order                                             | **Notification + RFQ screens last (P8)**                             |
| E2E tests                                            | **Not required** (unit + integration + manual smoke only)            |
| Optional future (admin UI, physical MS extract, C–F) | **Out of scope** for this plan                                       |

---

## Folder design (how to navigate)

### Principle

```text
Open folder name → know the business step
Open one file → know the single job it does
Never dump whole Flow 1 into one steps/ bag of files
```

| Rule                            | Example                                                   |
| ------------------------------- | --------------------------------------------------------- |
| Flow root named by story        | `flows/flow-1-pq-draft-rfq-chain/`                        |
| Each process = numbered folder  | `02-create-rfq/` not only `02-create-rfq.ts`              |
| Folder name = verb + object     | `pq-draft-capture`, `create-rfq`, `post-ar-invoice-draft` |
| Entry file per process          | `*.service.ts` is the only thing orchestrator calls       |
| Helpers stay inside that folder | `build-rfq-from-draft.ts` next to `create-rfq.service.ts` |
| No cross-flow imports           | Share via `domain/*`, `routing/*`, `config/*` only        |
| Background jobs same style      | `background/jobs/01-detect-missed-pq-draft/`              |

### Quick map — where is X?

| Looking for…                   | Open                                        |
| ------------------------------ | ------------------------------------------- |
| PQ Draft → start Flow 1        | `api/hooks/after-pq-draft-saved.hook.ts`    |
| “Is this IC PQ draft?”         | `flows/flow-1-…/01-pq-draft-capture/`       |
| Create custom RFQ              | `flows/flow-1-…/02-create-rfq/`             |
| Seller notification after RFQ  | `flows/flow-1-…/03-notify-seller/`          |
| Vendor fill price + submit     | `flows/flow-1-…/04-seller-fill-rfq/`        |
| Convert → PQ + SQ              | `flows/flow-1-…/05-convert-pq-and-sq/`      |
| PO create → start Flow 2       | `api/hooks/after-po-created.hook.ts`        |
| “Is this IC PO?”               | `flows/flow-2-…/01-po-capture/`             |
| Build AR Invoice Draft payload | `flows/flow-2-…/02-build-ar-invoice-draft/` |
| Post AR Draft to partner SL    | `flows/flow-2-…/03-post-ar-invoice-draft/`  |
| Map PO→AR_DRAFT + notify       | `flows/flow-2-…/04-map-and-notify/`         |
| RFQ table CRUD                 | `domain/rfq/`                               |
| Doc link spine                 | `domain/document-map/`                      |
| Partner company / BP / tax     | `config/*` + `routing/resolve-partner/`     |
| SL login / HTTP                | `infrastructure/service-layer/`             |
| Missed draft / retry / cleanup | `background/jobs/*`                         |
| Pilot junk (delete in P1)      | flat `intercompany.*.ts` until removed      |

---

## Phase map (P0–P9 only)

```text
P1  Clear pilot fully (BE)               ✅ done
P2  Scaffold MS tree (BE)                ✅ done
P3  Backend core + unit/integration tests ✅ done
P4  Frontend shell + unit tests          ✅ done
P5  Flow 2 full backend + tests          ✅ done
P6  Flow 1 full backend APIs + tests     ✅ done
P7  Background worker + tests            ✅ done
P8  Notification UI + RFQ UI (LAST)      ✅ done
P9  Hardening · drop pilot table · docs  ✅ done
P0  Seed real data (DB)                  ← last (before flags on / live smoke)
```

```text
P1 ✅ ── P2 ✅ ── P3 ✅ ── P4 ✅ ── P5 ✅ ── P6 ✅ ── P7 ✅ ── P8 ✅ ── P9 ✅ ── P0 (seed last)
```

| #   | Name                  | Stack            | Outcome                                     |
| --- | --------------------- | ---------------- | ------------------------------------------- |
| P0  | Data ready            | DB               | Real A/B seed; flags off                    |
| P1  | Clear pilot fully     | BE               | Zero pilot runtime                          |
| P2  | Scaffold MS           | BE               | Nested **process** folders + stubs + health |
| P3  | Backend core          | BE               | Config, routing, domain, IC SL              |
| P4  | Frontend shell        | FE               | Client types + placeholder only             |
| P5  | Flow 2 MS             | BE               | Live PO → AR Draft                          |
| P6  | Flow 1 MS APIs        | BE               | Full RFQ chain without UI                   |
| P7  | Background            | BE               | Detect, retry, session cleanup              |
| P8  | Notification + RFQ UI | FE (+ BE polish) | Portal complete                             |
| P9  | Close-out             | All              | Pilot table gone; quality gate              |

---

# P0 — Data ready (run last before go-live)

### Goal

New `IC_*` tables have **real** company/BP/tax/SL data so routing and SL work.  
**Deferred until after P3–P9 code is ready** (or immediately before first P5/P6 sandbox smoke). Code phases do not hardcode seed values.

### Prerequisites

- All `IC_*` tables exist in `SBOCOMMON` (see data-model doc).

### Tasks

| #   | Task                     | Detail                                                                            |
| --- | ------------------------ | --------------------------------------------------------------------------------- |
| 0.1 | Verify tables            | List all `IC_*` in `SBOCOMMON`                                                    |
| 0.2 | Seed `IC_COMPANY`        | At least A + B; real `SAP_DB_NAME`, `DEFAULT_BRANCH_ID`, `IS_ACTIVE=1`            |
| 0.3 | Match portal             | `IC_COMPANY.SAP_DB_NAME` = `VST_COMMON.DB_NAME` for same org                      |
| 0.4 | Seed `IC_SAP_CONNECTION` | Per company: SL URL, DB, IC technical user/password, `IS_DEFAULT=1`               |
| 0.5 | Seed `IC_BP_MAPPING`     | Buyer A + vendor code → company B + `BUYER_CUSTOMER_CODE` (and reverse if needed) |
| 0.6 | Seed `IC_TAX_MAPPING`    | A→B and B→A for taxes used on test docs                                           |
| 0.7 | Seed `IC_CONFIGURATION`  | See keys below — **flows off**                                                    |
| 0.8 | Manual SL login          | Confirm IC users login to A and B Service Layer                                   |
| 0.9 | Write seed cheat-sheet   | One note: company codes, vendor codes, customer codes, DB names                   |

### Config keys (initial)

| Key                         | Initial value | Why              |
| --------------------------- | ------------- | ---------------- |
| `ENABLE_FLOW1_RFQ_CHAIN`    | `0`           | Turn on in P6    |
| `ENABLE_FLOW2_DIRECT_PO`    | `0`           | Turn on in P5    |
| `MAX_RETRY_COUNT`           | `2`           | Grill lock       |
| `DETECT_DRAFT_CRON_MINUTES` | e.g. `5`      | Background P7    |
| `REMARKS_PREFIX`            | `IC-`         | SAP remarks tags |

### Tests (manual / SQL only)

| Check                      | Pass criteria                      |
| -------------------------- | ---------------------------------- |
| Active companies           | ≥ 2 rows                           |
| BP resolve for test vendor | Target company + customer returned |
| SL login A                 | Session OK                         |
| SL login B                 | Session OK                         |

### Exit criteria

- [ ] Seed values documented
- [ ] No plan depends on pilot hardcodes (`V0134`, etc.)
- [ ] Ready for live Flow flags / sandbox smoke

### Out of scope

- Application code (done in P1–P9)
- Frontend
- Enabling flow flags until seed verified

---

# P1 — Clear pilot fully ✅ DONE

### Goal

**Remove all pilot intercompany runtime.** PO create no longer calls old IC. Clean slate.

### Why before scaffold

Avoid double-post, two map tables, and mixed imports while building the MS module.

### Files to change / remove

| Action                 | Path                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Edit**               | `hana-backend/src/modules/purchase-order/purchase-order.create.mutation.ts` — remove IC import + `syncAfterPurchaseOrderCreate` block + response `intercompany` field (or leave typed optional for P5) |
| **Delete**             | All pilot files under `modules/intercompany/*.ts` listed below                                                                                                                                         |
| **Keep docs**          | `plan.md`, `IC-ARCHITECTURE-PLAN.md`, `IC-DATA-MODEL-AND-FLOWS.md`                                                                                                                                     |
| **Rewrite**            | `README.md` → “Pilot removed; see plan.md”                                                                                                                                                             |
| **Archive or rewrite** | `HOW-IT-WORKS.md` → mark obsolete / point to new plan                                                                                                                                                  |
| **Removed in P9**      | `db/schemas/intercompany-document-map.schema.ts` · DB drop via `ops/drop-pilot-document-map.sql`                                                                                                       |

**Pilot TS files to remove:**

```text
intercompany.controller.ts
intercompany.service.ts
intercompany.mutations.ts
intercompany.queries.ts
intercompany.types.ts
intercompany.constants.ts
intercompany.company.queries.ts
intercompany.document-map.queries.ts
intercompany.document-map.mutations.ts
intercompany.draft-build.ts
intercompany.draft-preflight.ts
intercompany.draft-tax-uom.ts
intercompany.po-to-ar.mutation.ts
intercompany.po-to-ar-post.mutation.ts
```

### Tasks

| #   | Task                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.1 | Remove PO create IC wiring                                                                                                                 |
| 1.2 | Delete pilot module TS files                                                                                                               |
| 1.3 | Remove/adjust any pilot unit tests                                                                                                         |
| 1.4 | Grep: `syncAfterPurchaseOrderCreate`, `INTERCOMPANY_DOCUMENT_MAP`, `intercompany.controller`, `intercompany.po-to-ar` → **0 runtime hits** |
| 1.5 | Update README / HOW-IT-WORKS                                                                                                               |
| 1.6 | Typecheck + test backend                                                                                                                   |

### Tests

| Check                        | Type             | Pass                                         |
| ---------------------------- | ---------------- | -------------------------------------------- |
| Backend typecheck            | `pnpm typecheck` | clean                                        |
| Backend unit tests           | `pnpm test`      | green (no pilot tests left)                  |
| Grep pilot symbols in `src/` | manual           | 0 hits (except schema file until P9)         |
| Create non-draft PO          | manual smoke     | succeeds; **no** partner AR Draft from pilot |

### Exit criteria

- [x] Pilot code gone
- [x] PO works without IC
- [x] Team accepts no automation until P5

### Out of scope

- New Flow 2
- Dropping DB table (P9)

---

# P2 — Scaffold microservice tree ✅ DONE

### Goal

Empty nested module: **every major process is its own folder**. No business logic.

### Root

`hana-backend/src/modules/intercompany/`

### Create structure (full)

```text
intercompany/
│
├── plan.md
├── IC-ARCHITECTURE-PLAN.md
├── IC-DATA-MODEL-AND-FLOWS.md
├── README.md
├── index.ts                              # PUBLIC WALL only
│
├── api/                                  # HTTP + portal entry hooks
│   ├── ic.routes.ts
│   ├── ic.controller.ts
│   ├── ic.schema.ts
│   └── hooks/
│       ├── after-pq-draft-saved.hook.ts  # → Flow 1
│       └── after-po-created.hook.ts      # → Flow 2
│
├── config/                               # Masters (one concern per folder)
│   ├── company/
│   │   ├── company.types.ts
│   │   ├── company.queries.ts
│   │   └── company.service.ts
│   ├── sap-connection/
│   │   ├── sap-connection.types.ts
│   │   ├── sap-connection.queries.ts
│   │   └── sap-connection.service.ts
│   ├── bp-mapping/
│   │   ├── bp-mapping.types.ts
│   │   ├── bp-mapping.queries.ts
│   │   └── bp-mapping.service.ts
│   ├── tax-mapping/
│   │   ├── tax-mapping.types.ts
│   │   ├── tax-mapping.queries.ts
│   │   └── tax-mapping.service.ts
│   └── configuration/
│       ├── configuration.types.ts
│       ├── configuration.queries.ts
│       └── configuration.service.ts
│
├── routing/                              # Partner resolution only
│   ├── resolve-partner/
│   │   ├── resolve-partner.types.ts
│   │   └── resolve-partner.service.ts
│   └── resolve-sl-target/
│       ├── resolve-sl-target.types.ts
│       └── resolve-sl-target.service.ts
│
├── flows/
│   ├── shared/
│   │   ├── flow.types.ts                 # FlowContext, step ok|skip|fail
│   │   └── flow-result.ts                # shared result helpers
│   │
│   ├── flow-1-pq-draft-rfq-chain/        # ════ FLOW 1 ════
│   │   ├── README.md                     # storyboard 01→05 (human)
│   │   ├── flow-1.types.ts
│   │   ├── flow-1.orchestrator.ts        # only wires process folders
│   │   │
│   │   ├── 01-pq-draft-capture/          # gate: IC draft? flag? already done?
│   │   │   ├── pq-draft-capture.types.ts
│   │   │   ├── detect-ic-pq-draft.ts
│   │   │   └── pq-draft-capture.service.ts
│   │   │
│   │   ├── 02-create-rfq/                # custom RFQ header + lines
│   │   │   ├── create-rfq.types.ts
│   │   │   ├── build-rfq-from-draft.ts
│   │   │   └── create-rfq.service.ts
│   │   │
│   │   ├── 03-notify-seller/             # alert target company
│   │   │   └── notify-seller.service.ts
│   │   │
│   │   ├── 04-seller-fill-rfq/           # price + delivery + submit
│   │   │   ├── fill-rfq.types.ts
│   │   │   ├── update-rfq-lines.ts
│   │   │   ├── submit-rfq.ts
│   │   │   └── seller-fill-rfq.service.ts
│   │   │
│   │   └── 05-convert-pq-and-sq/         # draft→PQ + seller SQ
│   │       ├── convert.types.ts
│   │       ├── apply-prices-to-draft.ts
│   │       ├── convert-draft-to-pq.ts
│   │       ├── create-seller-sq.ts
│   │       └── convert-pq-and-sq.service.ts
│   │
│   └── flow-2-po-to-ar-draft/            # ════ FLOW 2 ════
│       ├── README.md
│       ├── flow-2.types.ts
│       ├── flow-2.orchestrator.ts
│       │
│       ├── 01-po-capture/                # gate: non-draft PO + IC + flag
│       │   ├── po-capture.types.ts
│       │   ├── detect-ic-po.ts
│       │   └── po-capture.service.ts
│       │
│       ├── 02-build-ar-invoice-draft/    # pure payload transform
│       │   ├── build-ar-draft.types.ts
│       │   ├── build-ar-draft.payload.ts
│       │   └── build-ar-draft.service.ts
│       │
│       ├── 03-post-ar-invoice-draft/     # SL side effect only
│       │   └── post-ar-draft.service.ts
│       │
│       └── 04-map-and-notify/            # map + history + notification
│           ├── map-po-to-ar-draft.ts
│           ├── notify-ar-created.ts
│           └── map-and-notify.service.ts
│
├── domain/                               # process state (tables)
│   ├── rfq/
│   │   ├── rfq.types.ts
│   │   ├── rfq.queries.ts
│   │   ├── rfq.mutations.ts
│   │   └── rfq.service.ts
│   ├── document-map/
│   │   ├── document-map.types.ts
│   │   ├── document-map.queries.ts
│   │   ├── document-map.mutations.ts
│   │   └── document-map.service.ts
│   ├── notification/
│   │   ├── notification.types.ts
│   │   ├── notification.queries.ts
│   │   ├── notification.mutations.ts
│   │   └── notification.service.ts
│   ├── retry/
│   │   ├── retry.types.ts
│   │   ├── retry.queries.ts
│   │   ├── retry.mutations.ts
│   │   └── retry.service.ts
│   └── history/
│       ├── history.types.ts
│       ├── history.mutations.ts
│       └── history.service.ts
│
├── infrastructure/
│   ├── constants.ts
│   ├── object-codes.ts                   # PQ_DRAFT | RFQ | PQ | SQ | PO | AR_DRAFT
│   ├── service-layer/
│   │   ├── ic-sl.types.ts
│   │   ├── ic-sl.client.ts
│   │   ├── ic-sl.session.ts
│   │   └── ic-sl.documents.ts
│   └── api-log/
│       ├── api-log.types.ts
│       ├── api-log.mutations.ts
│       └── api-log.service.ts
│
├── background/                           # ════ BACKGROUND WORKER ════
│   ├── worker.entry.ts                   # process entry (pnpm script)
│   ├── worker.context.ts
│   ├── scheduler/
│   │   ├── scheduler.queries.ts
│   │   └── scheduler.mutations.ts
│   └── jobs/
│       ├── 01-detect-missed-pq-draft/    # safety-net for Flow 1
│       │   └── detect-missed-pq-draft.job.ts
│       ├── 02-process-retry-queue/       # retry failed partner posts
│       │   └── process-retry-queue.job.ts
│       └── 03-session-cleanup/           # expire IC_SL_SESSION
│           └── session-cleanup.job.ts
│
└── db/
    └── entities/                         # one file per IC_* table
        ├── ic-company.entity.ts
        ├── ic-sap-connection.entity.ts
        ├── ic-bp-mapping.entity.ts
        ├── ic-tax-mapping.entity.ts
        ├── ic-rfq-header.entity.ts
        ├── ic-rfq-line.entity.ts
        ├── ic-document-mapping.entity.ts
        ├── ic-notification.entity.ts
        ├── ic-retry-queue.entity.ts
        ├── ic-sync-history.entity.ts
        ├── ic-configuration.entity.ts
        ├── ic-sl-session.entity.ts
        ├── ic-api-log.entity.ts
        └── ic-scheduler-job.entity.ts
```

### Process catalog (one folder = one major job)

#### Flow 1 — `flows/flow-1-pq-draft-rfq-chain/`

| Folder                  | Handles only                                         | Called by                                   |
| ----------------------- | ---------------------------------------------------- | ------------------------------------------- |
| `01-pq-draft-capture/`  | Detect IC PQ draft, flags, already-mapped skip       | Orchestrator · background detect job        |
| `02-create-rfq/`        | Insert RFQ header/lines from draft; map PQ_DRAFT→RFQ | Orchestrator after 01                       |
| `03-notify-seller/`     | Write seller notification for new RFQ                | Orchestrator after 02                       |
| `04-seller-fill-rfq/`   | Update unit price + delivery; submit RFQ             | **HTTP API** (seller) · not auto chain only |
| `05-convert-pq-and-sq/` | Apply prices → real PQ → partner SQ; maps; complete  | **HTTP API** (buyer convert)                |

`flow-1.orchestrator.ts` runs **01 → 02 → 03** on draft save.  
**04** and **05** are user-driven (API); orchestrator may export helpers, but portal/API is primary caller.

#### Flow 2 — `flows/flow-2-po-to-ar-draft/`

| Folder                       | Handles only                                        | Called by    |
| ---------------------------- | --------------------------------------------------- | ------------ |
| `01-po-capture/`             | Non-draft PO, IC vendor, flag, idempotent map check | Orchestrator |
| `02-build-ar-invoice-draft/` | Pure payload (customer, tax, branch, remarks)       | Orchestrator |
| `03-post-ar-invoice-draft/`  | Partner SL create AR Invoice Draft + api-log        | Orchestrator |
| `04-map-and-notify/`         | Map PO→AR_DRAFT, history, notify                    | Orchestrator |

`flow-2.orchestrator.ts` runs **01 → 02 → 03 → 04** on PO create.

#### Background — `background/jobs/`

| Folder                       | Handles only                                                 |
| ---------------------------- | ------------------------------------------------------------ |
| `01-detect-missed-pq-draft/` | Find IC drafts without RFQ; call Flow 1 create path          |
| `02-process-retry-queue/`    | Claim `IC_RETRY_QUEUE`, re-run failed action, DEAD after max |
| `03-session-cleanup/`        | Expire stale `IC_SL_SESSION` rows                            |

### Naming conventions (scaffold)

| Kind           | Pattern                                            | Example                      |
| -------------- | -------------------------------------------------- | ---------------------------- |
| Flow folder    | `flow-{n}-{story-kebab}`                           | `flow-1-pq-draft-rfq-chain`  |
| Process folder | `{nn}-{verb-object}`                               | `02-create-rfq`              |
| Process entry  | `{name}.service.ts`                                | `create-rfq.service.ts`      |
| Pure helper    | `{verb}-{object}.ts`                               | `build-rfq-from-draft.ts`    |
| Types          | `{name}.types.ts`                                  | `create-rfq.types.ts`        |
| Hook           | `after-{event}.hook.ts`                            | `after-po-created.hook.ts`   |
| Background job | `{name}.job.ts`                                    | `process-retry-queue.job.ts` |
| Domain         | `{entity}.{types\|queries\|mutations\|service}.ts` | `rfq.service.ts`             |

### Tasks

| #   | Task                                                                                    |
| --- | --------------------------------------------------------------------------------------- |
| 2.1 | Create all folders/files as stubs (tree above)                                          |
| 2.2 | Add `flows/flow-*/README.md` with 5–10 line storyboard                                  |
| 2.3 | `index.ts` exports hooks that return `{ status: "skipped", reason: "not_implemented" }` |
| 2.4 | `GET /api/ic/health` → `{ ok: true }`                                                   |
| 2.5 | Register router in `routes/api.routes.ts`                                               |
| 2.6 | README points to plan + architecture + data model                                       |
| 2.7 | Typecheck passes with stubs                                                             |

### Stub rule

- Hooks / orchestrators: **return skip**, do not throw into PO/PQ.
- Process services not yet wired: may `throw new Error("Not implemented: …")` if unused.
- Orchestrator only imports `*.service.ts` from each process folder (not deep helpers).

### Tests

| Check         | Pass                      |
| ------------- | ------------------------- |
| Backend boots | no import crash           |
| Health route  | 200 (with auth if global) |
| Typecheck     | clean                     |

### Exit criteria

- [x] Tree matches this plan (process folders, not flat steps)
- [x] Public wall only external entry
- [x] No real IC logic (at scaffold time; P3 fills core)

---

# P3 — Backend core + tests ✅ DONE

### Goal

All shared building blocks. Flow process folders still stubs.

### Work packages (do in order)

#### 3.1 Database entities

| Task                      | Detail                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------- |
| Map all `IC_*` tables     | TypeORM entity or project `db/schemas` style — pick one and stick to it             |
| Register with data source | Discoverable at runtime                                                             |
| Object codes const        | `PQ_DRAFT`, `RFQ`, `PQ`, `SQ`, `PO`, `AR_DRAFT` in `infrastructure/object-codes.ts` |

#### 3.2 Config services (read-mostly)

| Folder                  | Methods (minimum)                                                        |
| ----------------------- | ------------------------------------------------------------------------ |
| `config/company`        | `getBySapDbName`, `getById`, `listActive`                                |
| `config/bp-mapping`     | `findByBuyerAndVendorCode(buyerCompanyId, vendorCode)`                   |
| `config/tax-mapping`    | `mapTax(sourceCompanyId, targetCompanyId, sourceTaxCode)`                |
| `config/sap-connection` | `getDefaultConnection(companyId)`                                        |
| `config/configuration`  | `getFlag(key)`, `getNumber(key)`, `isFlow1Enabled()`, `isFlow2Enabled()` |

#### 3.3 Routing

| Folder / service             | Input                         | Output                                                                                     |
| ---------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| `routing/resolve-partner/`   | session `dbName` + `cardCode` | buyer company, seller company, vendor code, buyer customer on seller — or `null` if not IC |
| `routing/resolve-sl-target/` | target `companyId`            | connection row + session strategy                                                          |

#### 3.4 Infrastructure SL

| Module            | Responsibility                                                                        |
| ----------------- | ------------------------------------------------------------------------------------- |
| `ic-sl.session`   | Login / reuse / invalidate; persist `IC_SL_SESSION`                                   |
| `ic-sl.client`    | Authenticated HTTP to Service Layer                                                   |
| `ic-sl.documents` | Stubs OK until P5/P6: `createArInvoiceDraft`, `createSalesQuotation`, convert helpers |
| `api-log`         | Write masked request/response to `IC_API_LOG`                                         |

#### 3.5 Domain shells

| Domain         | Minimum API                                                         |
| -------------- | ------------------------------------------------------------------- |
| `document-map` | `findBySource`, `create`, `updateStatus` — idempotent on source key |
| `notification` | `create`, `listForCompany`, `countUnreadForCompany`, `markRead`     |
| `retry`        | `enqueue`, `claimDue`, `markSuccess`, `markFailedOrDead`            |
| `history`      | `append`                                                            |
| `rfq`          | `createFromDraft`, `getById`, `updateLines`, `submit`, `complete`   |

### Tests (required — unit / integration only)

| ID    | Case                                                       | Type                   |
| ----- | ---------------------------------------------------------- | ---------------------- |
| T3.1  | Known vendor → correct partner + customer                  | unit or DB integration |
| T3.2  | Unknown vendor → null / skip, no throw                     | unit                   |
| T3.3  | Tax map hit / miss                                         | unit                   |
| T3.4  | Flags default off                                          | unit                   |
| T3.5  | Document map double-insert does not duplicate SUCCESS path | integration            |
| T3.6  | RFQ create header+lines                                    | integration            |
| T3.7  | Notification create + list by company                      | integration            |
| T3.7b | `countUnreadForCompany` matches unread rows                | unit/integration       |

Mock SL for unit tests; optional real SL only if sandbox available (not required).

### Exit criteria

- [x] All T3.* pass (offline unit tests with memory SQL)
- [x] `pnpm test` / typecheck green
- [ ] Flow flags still **0** in DB (verify at P0 seed)

### Out of scope

- Completing Flow 1/2 process folders
- Background loop
- Frontend

---

# P4 — Frontend shell + tests

### Goal

FE ready for P8 without building RFQ/notification screens.

### Tasks

| #   | Task                | Detail                                                                     |
| --- | ------------------- | -------------------------------------------------------------------------- |
| 4.1 | API client module   | e.g. `frontend/src/lib/api/intercompany.ts` (follow existing API patterns) |
| 4.2 | Types               | `IcHookResult`, notification, RFQ DTOs (can mirror backend)                |
| 4.3 | `getIcHealth()`     | Calls `GET /api/ic/health`                                                 |
| 4.4 | Placeholder route   | Optional hidden `/intercompany` “Coming soon” — **or** no menu entry       |
| 4.5 | No PO/PQ UI changes | Document create flows unchanged                                            |
| 4.6 | Unit test           | Client builds correct path; types compile                                  |

### Explicitly do **not** build in P4

- Notification inbox
- RFQ form / convert UI
- Nav badge

### Tests

| Check              | Pass             |
| ------------------ | ---------------- |
| Frontend typecheck | clean            |
| Client unit test   | green            |
| App boots          | no broken routes |

### Exit criteria

- [x] Shell merged (`frontend/src/features/intercompany` + `/intercompany` placeholder)
- [x] Zero RFQ/notification UX (no nav entry, no badge, no inbox)

### Delivered

| Area          | Location                                                       |
| ------------- | -------------------------------------------------------------- |
| Paths         | `frontend/src/features/intercompany/api/intercompany.paths.ts` |
| Client        | `…/intercompany.service.ts` (`getIcHealth`)                    |
| Types/schemas | `…/schemas/intercompany-api.schema.ts`                         |
| Placeholder   | `GET /intercompany` (no sidebar link)                          |
| Unit tests    | `frontend/tests/unit/features/intercompany/*`                  |

---

# P5 — Flow 2 (PO → AR Invoice Draft) full backend + tests

### Goal

First live IC automation on the new engine.

### Enable flag

`ENABLE_FLOW2_DIRECT_PO = 1` in test/dev after code ready.

### Implement (process folders)

| Folder / file                         | Behavior                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| `flow-2-…/01-po-capture/`             | Non-draft PO; flag on; partner resolved; not already mapped                        |
| `flow-2-…/02-build-ar-invoice-draft/` | CardCode = buyer customer on seller; tax map; branch; remarks `IC-PO-{DocNum}`     |
| `flow-2-…/03-post-ar-invoice-draft/`  | IC SL create AR Invoice Draft; api-log                                             |
| `flow-2-…/04-map-and-notify/`         | `PO` → `AR_DRAFT` map; notify seller (buyer optional); history                     |
| `flow-2.orchestrator.ts`              | Run 01→04; on SL fail → enqueue retry + history; return result                     |
| `api/hooks/after-po-created.hook.ts`  | Call orchestrator; never throw                                                     |
| `purchase-order.create.mutation.ts`   | Import `afterPoCreated` from `@/modules/intercompany`; optional result on response |

### Failure policy

- PO SAP create already succeeded → IC failure returns `{ status: "failed" \| "queued_retry" }`
- Never roll back PO

### Tests

| ID   | Case                                           | Type                                                           |
| ---- | ---------------------------------------------- | -------------------------------------------------------------- |
| T5.1 | Draft PO → skip                                | unit                                                           |
| T5.2 | Non-IC vendor → skip                           | unit                                                           |
| T5.3 | Flag off → skip                                | unit                                                           |
| T5.4 | Build payload tax/customer/remarks             | unit                                                           |
| T5.5 | Idempotent: existing SUCCESS map → skip create | unit/integration                                               |
| T5.6 | SL fail → retry enqueued; result failed/queued | unit with mock SL                                              |
| T5.7 | Happy path A→B                                 | **manual smoke** (create PO, check partner AR Draft + map row) |

### Exit criteria

- [ ] T5.1–T5.6 automated pass
- [ ] T5.7 manual smoke signed off once
- [ ] PO create never fails due to IC

### Out of scope

- Notification UI (rows only)
- Background processing retries (enqueue only until P7)

---

# P6 — Flow 1 (RFQ chain) full backend APIs + tests

### Goal

Complete Flow 1 **without** portal RFQ UI. Prove via API clients / Postman / integration tests.

### Enable flag

`ENABLE_FLOW1_RFQ_CHAIN = 1` in test/dev when ready.

### Process folders

| Folder                  | Does                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `01-pq-draft-capture/`  | IC vendor, flag, not already RFQ’d                                                            |
| `02-create-rfq/`        | `IC_RFQ_HEADER` + lines from draft; map `PQ_DRAFT`→`RFQ`                                      |
| `03-notify-seller/`     | Notification to seller company                                                                |
| `04-seller-fill-rfq/`   | Vendor updates unit price + delivery only; submit → `SUBMITTED`                               |
| `05-convert-pq-and-sq/` | Apply prices → convert draft to PQ → create SQ on seller; maps; complete RFQ; fail SQ → retry |

### Orchestrator vs API

| Trigger                         | Runs                                     |
| ------------------------------- | ---------------------------------------- |
| PQ draft save hook              | `flow-1.orchestrator` → **01 → 02 → 03** |
| `PUT /api/ic/rfqs/:id` + submit | **04**                                   |
| `POST /api/ic/rfqs/:id/convert` | **05**                                   |
| Background detect job           | **01 → 02 → 03** (same as hook path)     |

### HTTP API contract

| Method  | Path                                 | Actor               | Purpose                           |
| ------- | ------------------------------------ | ------------------- | --------------------------------- |
| `GET`   | `/api/ic/rfqs`                       | session company     | List (inbox/outbox by role)       |
| `GET`   | `/api/ic/rfqs/:id`                   | owner companies     | Detail + lines                    |
| `PUT`   | `/api/ic/rfqs/:id`                   | **target** (seller) | Update price/delivery lines       |
| `POST`  | `/api/ic/rfqs/:id/submit`            | seller              | Status `SUBMITTED`; notify buyer  |
| `POST`  | `/api/ic/rfqs/:id/convert`           | **source** (buyer)  | Convert + SQ                      |
| `GET`   | `/api/ic/notifications`              | session company     | List (for P8)                     |
| `GET`   | `/api/ic/notifications/unread-count` | session company     | Unread count for **header badge** |
| `PATCH` | `/api/ic/notifications/:id/read`     | owner               | Mark read (count decreases)       |

### Hooks

| Hook                | From                                        |
| ------------------- | ------------------------------------------- |
| `afterPqDraftSaved` | purchase-quotation draft create/update save |

### Security rules

- List/detail filtered by company participation
- Only target company can fill/submit
- Only source company can convert

### Convert status rule (default)

- RFQ → `COMPLETED` only after SQ success
- If PQ converted but SQ fails: map ERROR / retry; RFQ stays `SUBMITTED` (document in types)

### Tests

| ID   | Case                                      | Type                                       |
| ---- | ----------------------------------------- | ------------------------------------------ |
| T6.1 | Detect skip non-IC                        | unit                                       |
| T6.2 | Create RFQ idempotent per draft           | integration                                |
| T6.3 | Fill rejects qty/item change if attempted | unit                                       |
| T6.4 | Submit → status + notification            | integration                                |
| T6.5 | Convert success path with mocked SL       | unit/integration                           |
| T6.6 | SQ fail → retry enqueue                   | unit                                       |
| T6.7 | Authz: wrong company cannot convert       | integration                                |
| T6.8 | Happy path A→B                            | **manual smoke** (API or temporary script) |

### Exit criteria

- [ ] Automated T6.1–T6.7 pass
- [ ] Manual T6.8 once
- [ ] Notification **rows** exist for P8
- [ ] No FE RFQ screens required

---

# P7 — Background worker + tests

### Goal

Background process for detect safety-net, retries, session cleanup.

### Deliverables

| Item                                    | Path / detail                                                              |
| --------------------------------------- | -------------------------------------------------------------------------- |
| Entry                                   | `background/worker.entry.ts`                                               |
| Script                                  | e.g. `pnpm --filter hana-backend worker:ic` (name per package.json)        |
| Job folder `01-detect-missed-pq-draft/` | Per active company: IC-eligible PQ drafts without RFQ → Flow 1 create path |
| Job folder `02-process-retry-queue/`    | Claim due `IC_RETRY_QUEUE`; max retries; SUCCESS / DEAD + notify on dead   |
| Job folder `03-session-cleanup/`        | Expire old `IC_SL_SESSION`                                                 |
| Scheduler                               | `background/scheduler/*` updates `IC_SCHEDULER_JOB`                        |

### Design rules

- Single worker instance first
- Jobs idempotent
- Claim queue with status transition `WAITING` → `PROCESSING`
- Detect job **reuses** Flow 1 `01`/`02`/`03` services (no duplicate create logic)

### Tests

| ID   | Case                            | Type             |
| ---- | ------------------------------- | ---------------- |
| T7.1 | Retry success with mock action  | unit/integration |
| T7.2 | Retry exceeds max → DEAD        | unit             |
| T7.3 | Detect does not duplicate RFQ   | unit/integration |
| T7.4 | Session cleanup removes expired | unit             |
| T7.5 | Worker starts and runs one loop | **manual smoke** |

### Exit criteria

- [x] Worker script documented in README
- [x] T7.1–T7.4 pass
- [x] Manual one-loop smoke (offline unit T7.5 + `worker:ic:once` with live env)

---

# P8 — Notification UI + RFQ UI (LAST) ✅ DONE

### Goal

Portal users complete Flow 1 and see IC activity without Postman.

### Depends on

- P4 shell
- P6 APIs (stable contracts)
- Notification rows from P5/P6/P7

### 8.A Notification UI

| Task                    | Detail                                                               |
| ----------------------- | -------------------------------------------------------------------- |
| Page                    | Intercompany Activity / Notifications                                |
| Data                    | TanStack Query → `GET /api/ic/notifications`                         |
| Mark read               | On open / button → `PATCH .../read`                                  |
| Deep links              | RFQ id → RFQ page; show flow step + priority                         |
| Empty / error / loading | Match portal patterns                                                |
| Nav                     | Menu entry under app shell (sales/purchase-adjacent or dedicated IC) |

### 8.A.1 Header unread count (required)

Always show IC notification status in the **app shell header** (same chrome as logout / brand — not only on the notifications page).

| Piece           | Spec                                                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Where**       | Shell layout header (e.g. next to user/logout area) — bell or “IC” icon                                                                              |
| **Data**        | TanStack Query → `GET /api/ic/notifications/unread-count` → `{ count: number }`                                                                      |
| **Scope**       | Session company only (`IC_NOTIFICATION.COMPANY_ID` = logged-in company)                                                                              |
| **Badge**       | Numeric badge when `count > 0`; hide badge (or show nothing) when `count === 0`                                                                      |
| **Cap display** | Optional UI cap e.g. `9+` / `99+` if count large; raw count still returned by API                                                                    |
| **Click**       | Navigate to IC Notifications page                                                                                                                    |
| **Refresh**     | Refetch on window focus + interval (e.g. 30–60s) while session active; invalidate after mark-read / after successful IC actions that may create rows |
| **Loading**     | No error flash on first load; treat errors as count 0 or keep last good count                                                                        |
| **a11y**        | `aria-label` e.g. “Intercompany notifications, N unread”                                                                                             |

**Backend (needed for badge — implement with notification domain, expose in P6 if FE shell ready in P8):**

| API                                      | Response                                     | Notes                                                                |
| ---------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| `GET /api/ic/notifications/unread-count` | `{ success: true, data: { count: number } }` | `COUNT(*)` where company = session and `IS_READ = 0` (or equivalent) |
| After `PATCH .../read`                   | FE invalidates unread-count + list queries   |                                                                      |

**FE layout (proposal):**

```text
frontend/src/features/layout/…          # header slot for IcUnreadBadge
frontend/src/features/intercompany/     # (P8) notifications page + api client
  api/ic-notifications.queries.ts       # list + unreadCount query keys
  components/ic-unread-badge.tsx        # header control
  components/ic-notifications-page.tsx
```

Zustand is **not** used for the count (server data → TanStack Query only).

### 8.B RFQ UI

| Task          | Detail                                                                  |
| ------------- | ----------------------------------------------------------------------- |
| Seller inbox  | List RFQs targeting session company                                     |
| Seller detail | Edit **unit price + delivery date** only; Submit → API → process **04** |
| Buyer view    | Read-only lines when submitted; **Convert** → process **05**            |
| After convert | Show PQ / SQ numbers from API response                                  |
| Guards        | Hide actions user cannot perform                                        |

### 8.C Polish

| Task        | Detail                                                  |
| ----------- | ------------------------------------------------------- |
| Toasts      | Success / fail using existing toast system              |
| PO create   | Optional small IC result message if API returns summary |
| Consistency | Tables, buttons, a11y labels                            |

### Tests (no E2E suite)

| ID    | Case                                               | Type                               |
| ----- | -------------------------------------------------- | ---------------------------------- |
| T8.1  | Notification list renders empty state              | FE unit/component                  |
| T8.1b | Header unread badge shows count / hides at 0       | FE unit/component                  |
| T8.1c | Mark read → unread-count query invalidates / drops | FE unit or manual                  |
| T8.2  | RFQ form validation (price required)               | FE unit                            |
| T8.3  | Convert button only when status allows             | FE unit                            |
| T8.4  | Typecheck frontend                                 | `tsc` / `pnpm typecheck`           |
| T8.5  | Full Flow 1 in portal A→B                          | **manual smoke checklist** (below) |

### Manual smoke checklist (P8 — replace E2E)

```text
[ ] Login company A
[ ] Create PQ Draft with IC vendor for B
[ ] Confirm RFQ created (API or DB) + B has notification
[ ] Login company B — open notification — open RFQ
[ ] Fill price + delivery — Submit
[ ] Login A — notification submitted — Convert
[ ] Confirm real PQ on A + real SQ on B + maps SUCCESS
[ ] Login A — create non-draft PO IC vendor — AR Draft on B
[ ] Header shows unread count for B after RFQ / AR draft (not zero)
[ ] Open notification list from header control
[ ] Mark read → header count decreases (or clears)
[ ] Login other company → badge shows only that company’s unread
```

### Exit criteria

- [ ] T8.1–T8.4 pass (including header badge)
- [ ] Manual checklist completed once
- [ ] Flow 1 + Flow 2 usable from portal
- [ ] Unread count visible in shell header for every authenticated layout

---

---

# P9 — Hardening and close-out ✅ DONE

### Goal

Production-ready cleanup. **No E2E test project.**

### Tasks

| #    | Task                      | Detail                                                         | State     |
| ---- | ------------------------- | -------------------------------------------------------------- | --------- |
| 9.1  | Grep pilot                | No runtime references to old map / pilot module                | ✅        |
| 9.2  | Export old map (optional) | `ops/export-pilot-document-map.sql`                            | ✅        |
| 9.3  | Drop pilot table          | `ops/drop-pilot-document-map.sql` (DBA-run)                    | ✅ script |
| 9.4  | Delete schema file        | `intercompany-document-map.schema.ts` removed from data-source | ✅        |
| 9.5  | Flags for deploy          | README deploy order Flow 2 then Flow 1                         | ✅        |
| 9.6  | Security pass             | Session company on all IC routes; markRead company-scoped      | ✅        |
| 9.7  | Log hygiene               | `maskSecrets` on API log; `corrId` on Flow 1/2                 | ✅        |
| 9.8  | Quality gate              | IC unit tests + typecheck                                      | ✅        |
| 9.9  | Docs freeze               | README + HOW-IT-WORKS + plan status                            | ✅        |
| 9.10 | Seed guide for company C  | `ops/seed-company-c-appendix.sql`                              | ✅        |

### Tests

| Check                                              | Pass  |
| -------------------------------------------------- | ----- |
| Full automated unit/integration suite              | green |
| Typecheck BE + FE                                  | clean |
| Lint/format if project requires                    | clean |
| Manual smoke (P8 checklist) re-run once after drop | OK    |
| Grep pilot table name in src                       | 0     |

### Exit criteria

- [x] Pilot schema gone; DBA drop script provided
- [x] Automated tests green
- [x] Ops notes for flags + worker
- [x] v1 application considered implemented (P0 seed still required for live)

### Out of scope (not in this plan)

- Automated browser E2E
- Admin config UI
- Physical separate microservice repo
- Email notifications
- Companies C–F mesh (manual seed only if needed)

---

## Cross-phase rules

| Rule                  | Detail                                                          |
| --------------------- | --------------------------------------------------------------- |
| Order                 | Do not start Pn+1 until Pn exit checked                         |
| Import wall           | Outside code imports only `@/modules/intercompany` (`index.ts`) |
| Process folders       | Orchestrator imports only each process `*.service.ts`           |
| Never fail doc create | IC errors → result object / retry / history                     |
| Idempotency           | RFQ per draft; map per source doc + target type                 |
| Config not code       | Companies, BP, tax in DB                                        |
| UI last               | No RFQ/notification pages before P8                             |
| Tests                 | Unit + integration + **manual smoke** only — **no E2E suite**   |

---

## Test strategy (whole project)

| Layer                         | When                   | Tools                                 |
| ----------------------------- | ---------------------- | ------------------------------------- |
| Unit                          | P3–P8                  | Vitest (backend/frontend as existing) |
| Integration                   | P3, P5–P7              | DB + mocked SL preferred              |
| Manual smoke                  | P1, P5, P6, P7, P8, P9 | Checklist in phase                    |
| E2E (Playwright/Cypress/etc.) | **Not used**           | —                                     |

---

## Public API wall (`index.ts`) target exports

```ts
// Hooks
export { afterPqDraftSaved } from "./api/hooks/after-pq-draft-saved.hook";
export { afterPoCreated } from "./api/hooks/after-po-created.hook";

// Router mount helper
export { createIcRouter } from "./api/ic.routes";
```

No deep exports of process folders, SL client, or raw queries.

---

## Hook result shape (stable)

```ts
type IcHookResult =
  | { status: "skipped"; reason: string }
  | {
      status: "success";
      mappingId?: number;
      targetDoc?: { type: string; entry: number; num?: number };
    }
  | { status: "queued_retry"; retryId: number }
  | { status: "failed"; message: string; historyId?: number };
```

---

## Tracking checklist

```text
[ ] P0 Data ready (last)
[x] P1 Clear pilot fully
[x] P2 Scaffold MS tree (process folders)
[x] P3 Backend core + tests
[x] P4 Frontend shell + tests
[x] P5 Flow 2 + tests
[x] P6 Flow 1 APIs + tests
[x] P7 Background worker + tests
[x] P8 Notification UI + RFQ UI
[x] P9 Hardening + drop pilot table
```

---

## Immediate next step

| State                        | Start                                                                    |
| ---------------------------- | ------------------------------------------------------------------------ |
| Application complete (P1–P9) | **P0** seed real A/B (and optional C)                                    |
| Seed done                    | Enable Flow 2 → smoke → enable Flow 1 → smoke                            |
| Pilot table still in DB      | Run `ops/export-*.sql` if needed, then `ops/drop-pilot-document-map.sql` |

Say **start P0** to execute the seed / go-live data phase.
