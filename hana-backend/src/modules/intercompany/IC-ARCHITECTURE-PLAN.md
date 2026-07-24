# Intercompany (IC) — Full Architecture Plan

**Companion docs**

| Doc                                                        | Purpose                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| [plan.md](./plan.md)                                       | **Master build plan** — P0–P9, tasks, tests (no E2E), exit criteria |
| [IC-DATA-MODEL-AND-FLOWS.md](./IC-DATA-MODEL-AND-FLOWS.md) | Tables, DDL, Flow 1/2 wireframes, object codes                      |
| [IC-ARCHITECTURE-PLAN.md](./IC-ARCHITECTURE-PLAN.md)       | **This file** — module shape, folders, files, how/why/what          |
| [README.md](./README.md)                                   | Pilot Phase 1 (legacy) until P1 cutover                             |
| [HOW-IT-WORKS.md](./HOW-IT-WORKS.md)                       | Non-technical pilot guide                                           |

**Status:** Tables exist in `SBOCOMMON`. Code is still pilot-flat. This plan is the rebuild blueprint.

**Last locked product decisions:** Grill session (full mesh A–F, custom RFQ, Flow 1 convert → PQ+SQ, Flow 2 → AR Draft only, hybrid detect, separate worker, max 1–2 retries, no partner cancel cascade, both flows via config).

---

## Navigation

| §   | Section                                                                                   |
| --- | ----------------------------------------------------------------------------------------- |
| 1   | [What this system is](#1-what-this-system-is)                                             |
| 2   | [Microservice vs modular monolith](#2-microservice-vs-modular-monolith)                   |
| 3   | [Big architecture diagram](#3-big-architecture-diagram)                                   |
| 4   | [Layer model (how a request moves)](#4-layer-model-how-a-request-moves)                   |
| 5   | [Responsibility matrix](#5-responsibility-matrix)                                         |
| 6   | [Target folder tree (full)](#6-target-folder-tree-full)                                   |
| 7   | [File catalog — what / why / how / who calls](#7-file-catalog--what--why--how--who-calls) |
| 8   | [Public API wall (`index.ts`)](#8-public-api-wall-indexts)                                |
| 9   | [Import rules (hard)](#9-import-rules-hard)                                               |
| 10  | [Table → folder map](#10-table--folder-map)                                               |
| 11  | [Flow → file map](#11-flow--file-map)                                                     |
| 12  | [Debug playbook (bug → open this)](#12-debug-playbook-bug--open-this)                     |
| 13  | [Cross-module integration](#13-cross-module-integration)                                  |
| 14  | [Frontend surface (later)](#14-frontend-surface-later)                                    |
| 15  | [Worker process design](#15-worker-process-design)                                        |
| 16  | [Naming conventions](#16-naming-conventions)                                              |
| 17  | [Error / retry / idempotency patterns](#17-error--retry--idempotency-patterns)            |
| 18  | [Logging & observability](#18-logging--observability)                                     |
| 19  | [Config & feature flags](#19-config--feature-flags)                                       |
| 20  | [Security](#20-security)                                                                  |
| 21  | [Testing strategy](#21-testing-strategy)                                                  |
| 22  | [Migration from pilot](#22-migration-from-pilot)                                          |
| 23  | [Build phases (ordered)](#23-build-phases-ordered)                                        |
| 24  | [Definition of done per phase](#24-definition-of-done-per-phase)                          |
| 25  | [Anti-patterns (do not)](#25-anti-patterns-do-not)                                        |
| 26  | [Scaffold checklist](#26-scaffold-checklist)                                              |
| 27  | [Glossary](#27-glossary)                                                                  |

---

## 1. What this system is

### 1.1 Product in one paragraph

Intercompany procurement lets companies **A–F** (and more later) trade with each other through the Vendor Portal. When a buyer creates documents against a **mapped internal vendor**, the IC engine creates partner-side process objects (custom **RFQ**, real **SQ**, **AR Invoice Draft**) using config-driven BP/tax maps and a **dedicated multi-company Service Layer login** — never the portal user’s password for partner DBs.

### 1.2 Two commercial flows

| Flow                   | Trigger                                 | Outcome                                                            |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| **Flow 1 — RFQ chain** | PQ **Draft** saved with IC vendor       | Custom RFQ → vendor fills → convert → buyer **PQ** + seller **SQ** |
| **Flow 2 — Direct PO** | Non-draft **PO** created with IC vendor | Seller **AR Invoice Draft** (user posts invoice manually)          |

Both can be **on** at once (`IC_CONFIGURATION`). Prior Flow 1 is **not** required for Flow 2.

### 1.3 What IC owns vs does not own

| Owns (system of record)                               | Does not own                               |
| ----------------------------------------------------- | ------------------------------------------ |
| `IC_*` tables in `SBOCOMMON`                          | Portal login (`VST_COMMON`)                |
| Partner routing (BP + SL connection)                  | Normal SAP document CRUD for non-IC docs   |
| Custom RFQ lifecycle                                  | Final AR Invoice post (user in SAP/portal) |
| Document link spine (`IC_DOCUMENT_MAPPING`)           | Partner cancel cascade (none by design)    |
| Retry queue, notifications, SL session cache, API log | Hardcoded company list in code             |

### 1.4 Why not keep the pilot flat module?

Pilot is a **single path**: hardcoded-ish PO → AR Draft into one flat folder. Full product needs:

- Config for N companies (mesh)
- Two flows with many steps
- Custom RFQ domain
- Worker + retry + notifications
- Easy debug (“which step failed?”)

Flat `intercompany.po-to-ar.*` cannot scale without becoming a ball of mud.

---

## 2. Microservice vs modular monolith

### 2.1 Answer (locked for this project)

| Question                                       | Decision                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| Is IC a **logical** microservice?              | **Yes** — bounded context, own data, own orchestration, own worker  |
| Is IC a **separate deployable** service day 1? | **No** — lives under `hana-backend/src/modules/intercompany/`       |
| Can it become a real MS later?                 | **Yes** — folder + `index.ts` wall already match extract boundaries |
| Worker separate process?                       | **Yes** (same codebase, second entry: `background/worker.entry.ts`) |

### 2.2 Why modular monolith first

| Pro                                                         | Con avoided                                              |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| One repo, one TypeScript build, shared Express/HANA helpers | Network hops, dual deploy, dual auth for every PO create |
| Fast iteration on Flow 1/2                                  | Premature split of shared SL utilities                   |
| Clear folders still force MS discipline                     | “Big ball of mud” only if import rules are ignored       |

### 2.3 Extraction path (future, not now)

```text
Today:
  hana-backend process ── imports ──► modules/intercompany (in-process)

Later (if scale needs it):
  hana-backend ── HTTP/queue ──► ic-service (same folder moved to package)
  worker process ──────────────► same ic-service code
```

Do **not** extract until load or org boundaries force it.

---

## 3. Big architecture diagram

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                         React Vendor Portal                               │
│  Login (one company) · Docs · IC Notifications · RFQ fill · Convert      │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ HTTPS (session cookie)
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     hana-backend (Express API)                            │
│                                                                          │
│  purchase-quotation / purchase-order / …                                 │
│            │ thin hook only                                              │
│            ▼                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │              modules/intercompany  (IC bounded context)             │  │
│  │                                                                    │  │
│  │  api/hooks  →  flows/*/orchestrator  →  steps/*                     │  │
│  │       │              │                     │                       │  │
│  │       │              ▼                     ▼                       │  │
│  │       │         routing/              domain/*                     │  │
│  │       │         config/*              infrastructure/*             │  │
│  │       └──────────────┴─────────────────────┘                       │  │
│  │                         index.ts (public wall)                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└───────────┬─────────────────────────────┬────────────────────────────────┘
            │                             │
            ▼                             ▼
┌───────────────────────┐     ┌───────────────────────────┐
│ SBOCOMMON             │     │ SAP Service Layer (A–F)   │
│ VST_COMMON (login)    │     │ via IC_SAP_CONNECTION     │
│ IC_* (process + cfg)  │     │ PQ Draft/PQ/SQ/PO/AR Draft│
└───────────────────────┘     └───────────────────────────┘
            ▲
            │
┌───────────┴───────────────────────────────────────────────┐
│  IC Worker process (same codebase, separate entry)         │
│  DETECT_PQ_DRAFT · PROCESS_RETRY · SESSION_CLEANUP         │
└────────────────────────────────────────────────────────────┘
```

### 3.1 Hybrid detect (primary + safety-net)

```text
PQ Draft save / PO create
        │
        ├─► [Primary] API event hook  (same request, non-blocking failure policy)
        │
        └─► [Safety-net] Worker DETECT_PQ_DRAFT cron
                 · finds IC-eligible drafts without RFQ/map
                 · creates missing RFQ chain
```

PO path is primarily **hook on create**; worker retry covers partner SL failures.

---

## 4. Layer model (how a request moves)

Layers are **vertical slices inside the module**, not separate npm packages.

```text
┌─────────────────────────────────────────────────────────────┐
│ L1  API / Hooks     routes, controllers, Zod, after-* hooks │
├─────────────────────────────────────────────────────────────┤
│ L2  Flows           orchestrators + ordered steps           │
├─────────────────────────────────────────────────────────────┤
│ L3  Routing         VendorCode → partner company + SL target│
├─────────────────────────────────────────────────────────────┤
│ L4  Domain          RFQ, map, notify, retry, history        │
├─────────────────────────────────────────────────────────────┤
│ L5  Config          company, BP, tax, SL credentials (read) │
├─────────────────────────────────────────────────────────────┤
│ L6  Infrastructure  IC SL client, session, API log          │
├─────────────────────────────────────────────────────────────┤
│ L7  DB              entities / raw HANA access for IC_*     │
└─────────────────────────────────────────────────────────────┘
```

### 4.1 Allowed call direction

```text
L1 → L2 → L3/L4/L5/L6
L2 → L3, L4, L5, L6
L3 → L5, L6 (session)
L4 → L7 (own tables), may call L5 for enrichment
L5 → L7 (config tables only)
L6 → L7 (session/log tables) + external SL HTTP
L7 → nothing upward
```

**Never:** L5 calling L2. **Never:** `purchase-order` importing L4/L6 directly.

### 4.2 Orchestrator purity rule

`*.orchestrator.ts` files:

| May                        | Must not                              |
| -------------------------- | ------------------------------------- |
| Call steps in order        | Embed raw SQL                         |
| Pass typed context object  | Call Service Layer HTTP directly      |
| Map step results to status | Hardcode company codes / CardCodes    |
| Enqueue retry on failure   | Catch-and-swallow without history/log |

Steps may call domain + infrastructure. Orchestrator reads like a storyboard.

---

## 5. Responsibility matrix

| Concern                    | Owner folder                                              | Primary tables                                                  |
| -------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| Portal login company       | Outside IC (`auth`, `VST_COMMON`)                         | `VST_COMMON`                                                    |
| IC company registry        | `config/company`                                          | `IC_COMPANY`                                                    |
| Partner SL credentials     | `config/sap-connection`                                   | `IC_SAP_CONNECTION`                                             |
| Pairwise BP map            | `config/bp-mapping`                                       | `IC_BP_MAPPING`                                                 |
| Tax remap buyer→seller     | `config/tax-mapping`                                      | `IC_TAX_MAPPING`                                                |
| Feature flags / cron knobs | `config/configuration`                                    | `IC_CONFIGURATION`                                              |
| Resolve partner + customer | `routing/`                                                | reads config tables                                             |
| Flow 1 storyboard          | `flows/flow-1-pq-draft-rfq-chain/` (+ process subfolders) | multi                                                           |
| Flow 2 storyboard          | `flows/flow-2-po-to-ar-draft/` (+ process subfolders)     | multi                                                           |
| Custom RFQ                 | `domain/rfq/`                                             | `IC_RFQ_HEADER`, `IC_RFQ_LINE`                                  |
| Doc link spine             | `domain/document-map/`                                    | `IC_DOCUMENT_MAPPING`                                           |
| In-app alerts              | `domain/notification/`                                    | `IC_NOTIFICATION`                                               |
| Failed partner create      | `domain/retry/`                                           | `IC_RETRY_QUEUE`                                                |
| Ops audit trail            | `domain/history/`                                         | `IC_SYNC_HISTORY`                                               |
| SL HTTP + session          | `infrastructure/service-layer/`                           | `IC_SL_SESSION`                                                 |
| SL payload dump            | `infrastructure/api-log/`                                 | `IC_API_LOG`                                                    |
| Cron jobs                  | `background/`                                             | `IC_SCHEDULER_JOB`                                              |
| Pilot PO→AR                | delete in P1 (flat pilot files)                           | `INTERCOMPANY_DOCUMENT_MAP` schema removed P9; DBA drop via ops |

---

## 6. Target folder tree (full)

> Root: `hana-backend/src/modules/intercompany/`  
> Paths below are relative to that root.  
> **Rule:** one major process = one numbered folder; orchestrator only imports each process `*.service.ts`.  
> Master scaffold text lives in [plan.md](./plan.md) § P2 — keep trees identical.

```text
intercompany/
│
├── plan.md                          ← master build plan (process tree + phases)
├── IC-ARCHITECTURE-PLAN.md          ← this file
├── IC-DATA-MODEL-AND-FLOWS.md
├── README.md
│
├── index.ts                         ← PUBLIC API WALL
│
├── api/
│   ├── ic.routes.ts
│   ├── ic.controller.ts
│   ├── ic.schema.ts
│   └── hooks/
│       ├── after-pq-draft-saved.hook.ts   → Flow 1
│       └── after-po-created.hook.ts       → Flow 2
│
├── config/                          # one master per folder (types/queries/service)
│   ├── company/
│   ├── sap-connection/
│   ├── bp-mapping/
│   ├── tax-mapping/
│   └── configuration/
│
├── routing/
│   ├── resolve-partner/
│   │   ├── resolve-partner.types.ts
│   │   └── resolve-partner.service.ts
│   └── resolve-sl-target/
│       ├── resolve-sl-target.types.ts
│       └── resolve-sl-target.service.ts
│
├── flows/
│   ├── shared/
│   │   ├── flow.types.ts
│   │   └── flow-result.ts
│   │
│   ├── flow-1-pq-draft-rfq-chain/        # ════ FLOW 1 ════
│   │   ├── README.md
│   │   ├── flow-1.types.ts
│   │   ├── flow-1.orchestrator.ts        # wires 01→03 on draft save
│   │   ├── 01-pq-draft-capture/          # detect IC draft + flags
│   │   ├── 02-create-rfq/                # RFQ header + lines
│   │   ├── 03-notify-seller/             # notify target company
│   │   ├── 04-seller-fill-rfq/           # price/delivery + submit (HTTP)
│   │   └── 05-convert-pq-and-sq/         # PQ + SQ (HTTP convert)
│   │
│   └── flow-2-po-to-ar-draft/            # ════ FLOW 2 ════
│       ├── README.md
│       ├── flow-2.types.ts
│       ├── flow-2.orchestrator.ts        # wires 01→04 on PO create
│       ├── 01-po-capture/
│       ├── 02-build-ar-invoice-draft/
│       ├── 03-post-ar-invoice-draft/
│       └── 04-map-and-notify/
│
├── domain/                          # RFQ, map, notification, retry, history
│   ├── rfq/
│   ├── document-map/
│   ├── notification/
│   ├── retry/
│   └── history/
│
├── infrastructure/
│   ├── constants.ts
│   ├── object-codes.ts
│   ├── service-layer/
│   └── api-log/
│
├── background/                      # ════ WORKER PROCESS ════
│   ├── worker.entry.ts
│   ├── worker.context.ts
│   ├── scheduler/
│   └── jobs/
│       ├── 01-detect-missed-pq-draft/
│       ├── 02-process-retry-queue/
│       └── 03-session-cleanup/
│
└── db/
    └── entities/                    # one file per IC_* table
```

**Inside each process folder (example `02-create-rfq/`):**

```text
02-create-rfq/
  create-rfq.types.ts
  build-rfq-from-draft.ts      ← helper (only this process)
  create-rfq.service.ts        ← ONLY entry orchestrator/API imports
```

### 6.1 File count expectation

| Area              | Approx files | Role                              |
| ----------------- | ------------ | --------------------------------- |
| Docs              | 4            | human navigation                  |
| `api/`            | 5            | surface                           |
| `config/`         | 15           | masters                           |
| `routing/`        | 4            | brain                             |
| `flows/`          | ~30          | storyboards + **process folders** |
| `domain/`         | ~19          | process state                     |
| `infrastructure/` | ~9           | SL + log                          |
| `background/`     | ~8           | worker + jobs                     |
| `db/entities/`    | 14           | table mapping                     |

Rough total **~100 small files** after full scaffold. Intentional: **folder name = business step**, **file = one job**.

---

## 7. File catalog — what / why / how / who calls

### 7.0 Root

| File                         | What                             | Why                                     | How                           | Who calls                                                   |
| ---------------------------- | -------------------------------- | --------------------------------------- | ----------------------------- | ----------------------------------------------------------- |
| `index.ts`                   | Re-exports only public functions | Prevent deep imports; future MS extract | `export { … } from './api/…'` | `purchase-order`, `purchase-quotation`, `app` routes, tests |
| `IC-ARCHITECTURE-PLAN.md`    | This architecture                | Single nav map for humans               | Markdown                      | Engineers                                                   |
| `IC-DATA-MODEL-AND-FLOWS.md` | Tables + DDL + wireframes        | DB truth                                | Markdown                      | DB + backend                                                |
| `README.md`                  | 1-page “start here”              | Fast onboarding                         | Points to both docs + tree    | Everyone                                                    |

---

### 7.1 `api/` — HTTP + hooks

| File                                 | What                       | Why                                                 | How                                                               | Who calls                        |
| ------------------------------------ | -------------------------- | --------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------- |
| `ic.routes.ts`                       | Express router `/api/ic/*` | Portal needs RFQ list, fill, convert, notifications | Mount in `routes/api.routes.ts`                                   | Express app                      |
| `ic.controller.ts`                   | HTTP handlers              | Thin: validate → service/orchestrator → JSON        | No SQL                                                            | Routes                           |
| `ic.schema.ts`                       | Zod bodies/queries         | Same validation style as other modules              | `zod` schemas                                                     | Middleware + controller          |
| `hooks/after-pq-draft-saved.hook.ts` | Flow 1 primary trigger     | Hybrid detect primary path                          | Flags → Flow 1 orchestrator (01→03); never throw out of PQ save   | `purchase-quotation` draft save  |
| `hooks/after-po-created.hook.ts`     | Flow 2 primary trigger     | Replace pilot controller call                       | Flags → Flow 2 orchestrator (01→04); PO stays success if IC fails | `purchase-order.create.mutation` |

**Hook failure policy (locked):** IC errors must **not** roll back successful SAP PO/PQ document create. Record `IC_SYNC_HISTORY` + optional `IC_RETRY_QUEUE` + notification instead.

---

### 7.2 `config/` — master data (mostly read)

#### `config/company/`

| File                 | What                                        | Why                             | How                                           |
| -------------------- | ------------------------------------------- | ------------------------------- | --------------------------------------------- |
| `company.types.ts`   | `IcCompany` type                            | Shared shape                    | TS interfaces                                 |
| `company.queries.ts` | Load by code / SAP DB / active list         | Match session DB → `COMPANY_ID` | HANA SQL / TypeORM on `IC_COMPANY`            |
| `company.service.ts` | `getBySapDbName`, `getByCode`, `listActive` | Cache-friendly façade           | Calls queries; optional short TTL cache later |

#### `config/sap-connection/`

| File               | What                                  | Why                                                          | How                                                             |
| ------------------ | ------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| `sap-connection.*` | Default active connection per company | Partner SL login credentials live here, **not** `VST_COMMON` | Read `IC_SAP_CONNECTION` where `IS_DEFAULT=1` and `IS_ACTIVE=1` |

#### `config/bp-mapping/`

| File           | What                         | Why                                            | How                                         |
| -------------- | ---------------------------- | ---------------------------------------------- | ------------------------------------------- |
| `bp-mapping.*` | Pairwise vendor/customer map | Full mesh: A’s vendor for B ≠ A’s vendor for C | Query by `BUYER_COMPANY_ID` + `VENDOR_CODE` |

#### `config/tax-mapping/`

| File            | What                    | Why                                 | How                          |
| --------------- | ----------------------- | ----------------------------------- | ---------------------------- |
| `tax-mapping.*` | Source tax → target tax | Buyer input tax ≠ seller output tax | Query pair + source tax code |

#### `config/configuration/`

| File              | What                    | Why                           | How                                                     |
| ----------------- | ----------------------- | ----------------------------- | ------------------------------------------------------- |
| `configuration.*` | Key/value feature flags | Toggle flows without redeploy | Read `IC_CONFIGURATION`; env may override if documented |

**Config services are read-heavy.** Admin write UI is optional later; seed SQL is enough for pilot companies A/B.

---

### 7.3 `routing/` — the brain

| Folder / file                                    | What                                              | Why                                | Who calls                       |
| ------------------------------------------------ | ------------------------------------------------- | ---------------------------------- | ------------------------------- |
| `resolve-partner/resolve-partner.service.ts`     | Session DB + `CardCode` → buyer, seller, customer | **Every** IC create starts here    | Flow process folders            |
| `resolve-sl-target/resolve-sl-target.service.ts` | Target company → connection + session strategy    | Separate “who” from “how to login” | Process folders that post to SL |

**Routing has no SAP document create logic** — only resolution.

---

### 7.4 `flows/` — business storyboards (process folders)

**Design:** not a flat `steps/*.ts` bag. Each major process is a **folder** named `{nn}-{verb-object}` with one `*.service.ts` entry.

#### Shared — `flows/shared/`

| File             | What                                     |
| ---------------- | ---------------------------------------- |
| `flow.types.ts`  | `FlowContext`, step `ok \| skip \| fail` |
| `flow-result.ts` | helpers to normalize results             |

#### Flow 1 — `flows/flow-1-pq-draft-rfq-chain/`

| Process folder          | What only                                     | Primary caller                   |
| ----------------------- | --------------------------------------------- | -------------------------------- |
| `01-pq-draft-capture/`  | IC? flags? already RFQ/mapped?                | Orchestrator · background detect |
| `02-create-rfq/`        | RFQ header+lines from draft; map PQ_DRAFT→RFQ | Orchestrator                     |
| `03-notify-seller/`     | Notify seller company                         | Orchestrator                     |
| `04-seller-fill-rfq/`   | Unit price + delivery only; submit            | **HTTP API**                     |
| `05-convert-pq-and-sq/` | Prices → PQ + partner SQ; maps; complete      | **HTTP API** convert             |

Draft-save orchestrator runs **01 → 02 → 03**. User actions drive **04** and **05**.

#### Flow 2 — `flows/flow-2-po-to-ar-draft/`

| Process folder               | What only                            | Primary caller |
| ---------------------------- | ------------------------------------ | -------------- |
| `01-po-capture/`             | Non-draft PO + IC + flag + map check | Orchestrator   |
| `02-build-ar-invoice-draft/` | Pure AR Draft payload                | Orchestrator   |
| `03-post-ar-invoice-draft/`  | Partner SL create + api-log          | Orchestrator   |
| `04-map-and-notify/`         | Map PO→AR_DRAFT + history + notify   | Orchestrator   |

Orchestrator runs **01 → 02 → 03 → 04**.

---

### 7.5 `domain/` — process state

| Subfolder       | Tables                         | Service responsibilities                                             |
| --------------- | ------------------------------ | -------------------------------------------------------------------- |
| `rfq/`          | `IC_RFQ_HEADER`, `IC_RFQ_LINE` | create from draft, get by id, update lines, submit, complete, cancel |
| `document-map/` | `IC_DOCUMENT_MAPPING`          | find by source, create link, set status/error, list by company       |
| `notification/` | `IC_NOTIFICATION`              | create, list, **countUnreadForCompany** (header badge), mark read    |
| `retry/`        | `IC_RETRY_QUEUE`               | enqueue, claim due rows, bump count, mark dead                       |
| `history/`      | `IC_SYNC_HISTORY`              | append-only write, optional list for support UI                      |

**Pattern per domain folder:**

```text
*.types.ts      → shapes + status unions
*.queries.ts    → SELECT only
*.mutations.ts  → INSERT/UPDATE only
*.service.ts    → business methods combining queries/mutations
```

Matches existing hana-backend habits (`*.queries` / `*.mutations`) while nesting by aggregate.

---

### 7.6 `infrastructure/` — side effects

| File                               | What                                                      | Why                                       | How                                      |
| ---------------------------------- | --------------------------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| `constants.ts`                     | Non-DB constants (timeouts, remarks prefix defaults)      | Avoid magic strings                       | `as const`                               |
| `object-codes.ts`                  | `PQ_DRAFT`, `RFQ`, `PQ`, `SQ`, `PO`, `AR_DRAFT`           | Single source for map/notify/retry        | string const object                      |
| `service-layer/ic-sl.client.ts`    | Low-level HTTP to Service Layer                           | Dedicated IC client (not user session SL) | Login cookie/headers from session module |
| `service-layer/ic-sl.session.ts`   | Get/reuse/invalidate B1SESSION                            | Avoid login storm; `IC_SL_SESSION`        | Cache row per company/connection         |
| `service-layer/ic-sl.documents.ts` | Create SQ, create AR Draft, update draft, convert helpers | Document verbs only                       | Uses client + api-log                    |
| `api-log/*`                        | Persist request/response (masked)                         | Support when SL fails                     | Write `IC_API_LOG`                       |

**Password handling:** never log raw passwords; mask in `IC_API_LOG`.

---

### 7.7 `background/` — worker process

| Path                              | What                              | Why                                    |
| --------------------------------- | --------------------------------- | -------------------------------------- |
| `worker.entry.ts`                 | Process main (separate from HTTP) | Load env, loop/cron, graceful shutdown |
| `worker.context.ts`               | Shared deps (logger, pool)        | Constructed once for jobs              |
| `scheduler/*`                     | Job heartbeat                     | `IC_SCHEDULER_JOB`                     |
| `jobs/01-detect-missed-pq-draft/` | Safety-net Flow 1                 | Reuses Flow 1 `01`/`02`/`03` services  |
| `jobs/02-process-retry-queue/`    | Retry partner creates (max 1–2)   | Claim queue → re-run                   |
| `jobs/03-session-cleanup/`        | Expire SL sessions                | Hygiene on `IC_SL_SESSION`             |

---

### 7.8 `db/`

| Path                   | What                      | Why                                  |
| ---------------------- | ------------------------- | ------------------------------------ |
| `entities/*.entity.ts` | One file per `IC_*` table | Typed access; co-located with module |

**Note:** Pilot map schema removed in P9. Prefer **co-located entities under module** + register from data-source for any future TypeORM IC entities.

---

### 7.9 Pilot (P1 delete — not a long-lived `legacy/` tree)

Per **plan.md P1**: delete flat pilot `intercompany.*.ts` files and unhook PO create. Do **not** keep a permanent `legacy/` package unless you briefly quarantine during a single PR.

---

## 8. Public API wall (`index.ts`)

### 8.1 Intended exports (stable)

```ts
// Hooks (called by other modules)
export { afterPqDraftSaved } from "./api/hooks/after-pq-draft.hook";
export { afterPoCreated } from "./api/hooks/after-po-create.hook";

// Optional: mount helper
export { createIcRouter } from "./api/ic.routes";

// Explicit domain reads for UI (prefer going through controller in prod)
// export { listNotificationsForCompany } from "./domain/notification/notification.service";
```

### 8.2 Must not export

- Internal step functions
- Raw query functions
- SL client
- Entity classes (unless shared types package later)

### 8.3 Consumer example (PO create)

```ts
// purchase-order.create.mutation.ts
import { afterPoCreated } from "@/modules/intercompany";

// after successful non-draft PO create:
const intercompany = await afterPoCreated({
  companyDbName: session.dbName,
  poDocEntry,
  poDocNum,
  cardCode,
  // …minimal snapshot needed for AR draft build
});
// attach intercompany summary to response if useful
```

---

## 9. Import rules (hard)

| Rule                                                                  | Reason                   |
| --------------------------------------------------------------------- | ------------------------ |
| Outside modules import **only** `@/modules/intercompany` (`index.ts`) | Extractable boundary     |
| No `flows/*` import from `config/*` upward reverse                    | Layering                 |
| No `config/*` import of `flows/*`                                     | Config stays dumb        |
| No cross-flow imports (`flow-1` ↛ `flow-2`)                           | Share via domain/routing |
| Domain services may not import orchestrators                          | Avoid cycles             |
| `legacy/*` imported only from temporary shim in `index.ts`            | Quarantine               |
| Frontend talks only to `/api/ic/*`                                    | No bypass                |

**Lint idea (optional later):** dependency-cruiser or eslint-plugin-boundaries for `intercompany/**`.

---

## 10. Table → folder map

| Table                       | Folder                         | Access style                 |
| --------------------------- | ------------------------------ | ---------------------------- |
| `IC_COMPANY`                | `config/company`               | R (W via seed/admin later)   |
| `IC_SAP_CONNECTION`         | `config/sap-connection`        | R                            |
| `IC_BP_MAPPING`             | `config/bp-mapping`            | R                            |
| `IC_TAX_MAPPING`            | `config/tax-mapping`           | R                            |
| `IC_CONFIGURATION`          | `config/configuration`         | R                            |
| `IC_RFQ_HEADER`             | `domain/rfq`                   | R/W                          |
| `IC_RFQ_LINE`               | `domain/rfq`                   | R/W                          |
| `IC_DOCUMENT_MAPPING`       | `domain/document-map`          | R/W                          |
| `IC_NOTIFICATION`           | `domain/notification`          | R/W                          |
| `IC_RETRY_QUEUE`            | `domain/retry`                 | R/W                          |
| `IC_SYNC_HISTORY`           | `domain/history`               | W (append), R support        |
| `IC_SL_SESSION`             | `infrastructure/service-layer` | R/W                          |
| `IC_API_LOG`                | `infrastructure/api-log`       | W (R support)                |
| `IC_SCHEDULER_JOB`          | `background/scheduler/`        | R/W                          |
| `VST_COMMON`                | **outside** IC (auth/org)      | soft match via `SAP_DB_NAME` |
| `INTERCOMPANY_DOCUMENT_MAP` | `legacy/` only                 | pilot                        |

---

## 11. Flow → file map

### 11.1 Flow 1 timeline → process folders

| User/system step     | Open folder / file                                         |
| -------------------- | ---------------------------------------------------------- |
| Buyer saves PQ Draft | `api/hooks/after-pq-draft-saved.hook.ts`                   |
| Detect IC + flags    | `flows/flow-1-pq-draft-rfq-chain/01-pq-draft-capture/`     |
| Create RFQ           | `…/02-create-rfq/` + `domain/rfq/*`                        |
| Notify seller        | `…/03-notify-seller/` + `domain/notification/*`            |
| Seller opens RFQ     | `api/ic.controller.ts` → `domain/rfq`                      |
| Seller fills/submits | `…/04-seller-fill-rfq/`                                    |
| Buyer convert        | `…/05-convert-pq-and-sq/`                                  |
| Partner SQ via SL    | `infrastructure/service-layer/ic-sl.documents.ts`          |
| Map + history        | `domain/document-map`, `domain/history`                    |
| Fail SQ              | `domain/retry` + `background/jobs/02-process-retry-queue/` |
| Missed draft         | `background/jobs/01-detect-missed-pq-draft/`               |

### 11.2 Flow 2 timeline → process folders

| User/system step    | Open folder / file                                         |
| ------------------- | ---------------------------------------------------------- |
| Buyer creates PO    | `purchase-order.create.mutation` → `after-po-created.hook` |
| Detect              | `flows/flow-2-po-to-ar-draft/01-po-capture/`               |
| Build payload       | `…/02-build-ar-invoice-draft/`                             |
| Post AR Draft       | `…/03-post-ar-invoice-draft/` → SL                         |
| Map + notify        | `…/04-map-and-notify/`                                     |
| Manual invoice post | Outside IC (user)                                          |

---

## 12. Debug playbook (bug → open this)

| Symptom                 | First files                                      | Tables to inspect                    |
| ----------------------- | ------------------------------------------------ | ------------------------------------ |
| “IC didn’t run”         | hook + `01-*-capture/` + `configuration.service` | `IC_CONFIGURATION`, map existence    |
| Wrong partner company   | `routing/resolve-partner/`                       | `IC_BP_MAPPING`, `IC_COMPANY`        |
| Wrong customer on SQ/AR | same + build payload folder                      | `IC_BP_MAPPING.BUYER_CUSTOMER_CODE`  |
| SL login fails          | `ic-sl.session`, `sap-connection`                | `IC_SAP_CONNECTION`, `IC_SL_SESSION` |
| SL create fails         | `ic-sl.documents`, `api-log`                     | `IC_API_LOG`, `IC_SYNC_HISTORY`      |
| Tax wrong               | `tax-mapping` + `02-build-ar-invoice-draft/`     | `IC_TAX_MAPPING`                     |
| RFQ missing lines       | `02-create-rfq/`, `domain/rfq`                   | `IC_RFQ_*`                           |
| Convert half-done       | `05-convert-pq-and-sq/`                          | `IC_DOCUMENT_MAPPING` statuses       |
| Double RFQ / double AR  | capture folders + `document-map`                 | unique source keys                   |
| Retry stuck             | `domain/retry`, `02-process-retry-queue/`        | `IC_RETRY_QUEUE`                     |
| Notification missing    | `domain/notification` + notify folders           | `IC_NOTIFICATION`                    |
| Worker not scanning     | `background/worker.entry.ts`, scheduler          | `IC_SCHEDULER_JOB`                   |
| Pilot still firing      | flat pilot files, PO create imports              | old map table                        |

### 12.1 Correlation fields (always set)

Every run should produce a correlation id (UUID) stored on:

- `IC_SYNC_HISTORY`
- `IC_API_LOG` (if present)
- log lines (`flowId`, `step`, `companyId`, `sourceDoc`)

Makes grepping one convert trivial.

---

## 13. Cross-module integration

### 13.1 Call graph (target)

```text
purchase-quotation (draft save)
  └── afterPqDraftSaved()  → Flow1 orchestrator

purchase-order (create non-draft)
  └── afterPoCreated()     → Flow2 orchestrator

api.routes
  └── /api/ic/*            → ic.controller

(worker process)
  └── jobs/*               → same orchestrators / domain services
```

### 13.2 What document modules pass in

**Minimal snapshots** (not full SAP graphs if avoidable):

| Hook           | Inputs                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------- |
| After PQ Draft | `dbName`, `docEntry`, `docNum`, `cardCode`, lines (item, qty, tax, whs, price), branch if any |
| After PO       | `dbName`, `docEntry`, `docNum`, `cardCode`, lines, totals, currency, remarks                  |

IC may re-fetch from SAP if snapshot incomplete — prefer snapshot for reliability.

### 13.3 Response shape back to document modules

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

Never throws to abort PO/PQ success (see failure policy).

---

## 14. Frontend surface (later — P8)

Not implemented until **plan.md P8**. Planned portal surface:

| UI                                  | Method / path (proposal)                   | Backend                                   |
| ----------------------------------- | ------------------------------------------ | ----------------------------------------- |
| IC notification list                | `GET /api/ic/notifications`                | `domain/notification`                     |
| **Header unread badge** (app shell) | `GET /api/ic/notifications/unread-count`   | `countUnreadForCompany` (session company) |
| Mark read                           | `PATCH /api/ic/notifications/:id/read`     | same (+ FE invalidates unread-count)      |
| RFQ inbox (seller)                  | `GET /api/ic/rfqs`                         | `domain/rfq`                              |
| RFQ detail                          | `GET /api/ic/rfqs/:id`                     | same                                      |
| Fill / submit RFQ                   | `PUT /api/ic/rfqs/:id` / `POST .../submit` | step 04                                   |
| Convert (buyer)                     | `POST /api/ic/rfqs/:id/convert`            | step 05                                   |
| Document chain view                 | `GET /api/ic/mappings?source=…`            | `domain/document-map`                     |

### 14.1 Header unread count (required shell chrome)

See **plan.md § 8.A.1** for full UI contract. Summary:

| Piece     | Spec                                                                    |
| --------- | ----------------------------------------------------------------------- |
| Placement | Authenticated layout header (bell / IC icon next to user area)          |
| Data      | TanStack Query → `GET /api/ic/notifications/unread-count` → `{ count }` |
| Scope     | Session company only                                                    |
| Badge     | Show number when `count > 0`; hide when `0`                             |
| Click     | Navigate to IC notifications page                                       |
| Refresh   | Focus + short poll; invalidate after mark-read                          |
| Store     | **Not** Zustand — server count via Query only                           |

Proposed FE paths: `features/layout` (slot) + `features/intercompany/components/ic-unread-badge.tsx`.

Frontend store rule (project AGENTS.md): **TanStack Query** for server data; Zustand only for UI chrome.

---

## 15. Worker process design

### 15.1 Process model

```text
pnpm --filter hana-backend dev          → API (Express)
pnpm --filter hana-backend worker:ic    → worker.entry.ts (new script)
```

Same `dist/` code, different entry. Shared env for HANA + secrets.

### 15.2 Job table

| Job code          | Interval source                | Action                 |
| ----------------- | ------------------------------ | ---------------------- |
| `DETECT_PQ_DRAFT` | `IC_CONFIGURATION` / scheduler | Safety-net RFQ create  |
| `PROCESS_RETRY`   | same                           | Drain `IC_RETRY_QUEUE` |
| `SESSION_CLEANUP` | same                           | Expire sessions        |

### 15.3 Concurrency

- Single worker instance first (simplest).
- Jobs must be **idempotent** (detect + map unique keys).
- Retry claim: update status `WAITING` → `PROCESSING` with optimistic check.

---

## 16. Naming conventions

| Kind            | Pattern                  | Example                                      |
| --------------- | ------------------------ | -------------------------------------------- |
| Folders         | kebab-case               | `flow-1-pq-draft-rfq-chain`, `02-create-rfq` |
| Process folders | `{nn}-{verb-object}`     | `01-pq-draft-capture`                        |
| Process entry   | `{name}.service.ts`      | `create-rfq.service.ts`                      |
| Files           | kebab-case + role suffix | `resolve-partner.service.ts`                 |
| Steps           | zero-padded order        | `01-detect-pq-draft.ts`                      |
| Types           | PascalCase               | `ResolvedPartner`                            |
| Object codes    | SCREAMING                | `AR_DRAFT`                                   |
| DB tables       | already `IC_*`           | `IC_BP_MAPPING`                              |
| Log step names  | match file stem          | `flow1.02-create-rfq`                        |
| Feature keys    | SCREAMING in config      | `ENABLE_FLOW1_RFQ_CHAIN`                     |

---

## 17. Error / retry / idempotency patterns

### 17.1 Idempotency keys

| Action            | Unique business key                                  |
| ----------------- | ---------------------------------------------------- |
| Create RFQ        | `(SOURCE_COMPANY_ID, PQ_DRAFT_DOC_ENTRY)`            |
| Map PQ_DRAFT→RFQ  | source company + object + entry + target object type |
| Map PO→AR_DRAFT   | same pattern for PO                                  |
| Create SQ from PQ | map row PQ→SQ must not duplicate SUCCESS             |

Detect steps always **find-or-skip** before create.

### 17.2 Retry

| Rule            | Value                                                       |
| --------------- | ----------------------------------------------------------- |
| Max attempts    | 1–2 (`IC_CONFIGURATION.MAX_RETRY_COUNT`, default 2)         |
| What is retried | Partner SL creates (SQ, AR Draft), not RFQ local writes     |
| Payload         | `PAYLOAD_JSON` on `IC_RETRY_QUEUE` enough to rebuild action |
| Dead letter     | Status `DEAD` + HIGH notification to buyer ops              |

### 17.3 Partial failure on convert (Flow 1 step 05)

Recommended order with status checkpoints:

1. Update draft lines from RFQ
2. Convert draft → PQ (buyer SAP)
3. Write map PQ status
4. Create SQ (seller SAP)
5. Map PQ→SQ SUCCESS

If 4 fails: PQ exists; enqueue `CREATE_SQ`; RFQ not `COMPLETED` until SQ success (or explicit business rule — **default: COMPLETED only after SQ success**, else `SUBMITTED`/`CONVERTING` intermediate status if column allows; otherwise keep map ERROR and RFQ `SUBMITTED` until fixed).

Document the chosen intermediate status in types when implementing step 05.

### 17.4 Cancel policy

**No partner cancel cascade** (grill lock). Cancel on buyer does not auto-cancel seller SQ/AR Draft. UI may show warning only.

---

## 18. Logging & observability

| Channel                  | Use                                                             |
| ------------------------ | --------------------------------------------------------------- |
| Pino logger (existing)   | Structured logs: `ic.flow`, `ic.step`, `ic.company`, `ic.corr`  |
| `IC_SYNC_HISTORY`        | Business audit row per major action                             |
| `IC_API_LOG`             | Full SL I/O (masked)                                            |
| Metrics (optional later) | counters: rfq_created, sq_created, ar_draft_created, retry_dead |

Never log: SL passwords, full session cookies in plain text.

---

## 19. Config & feature flags

### 19.1 Keys (`IC_CONFIGURATION`)

| Key                         | Meaning                         |
| --------------------------- | ------------------------------- |
| `ENABLE_FLOW1_RFQ_CHAIN`    | PQ Draft → RFQ path             |
| `ENABLE_FLOW2_DIRECT_PO`    | PO → AR Draft path              |
| `MAX_RETRY_COUNT`           | default `2`                     |
| `DETECT_DRAFT_CRON_MINUTES` | worker interval                 |
| `REMARKS_PREFIX`            | e.g. `IC-` for SAP remarks tags |

### 19.2 Env overrides (optional)

Document in `.env.example` if used, e.g. `IC_ENABLE_FLOW1=true`. Prefer DB config for runtime toggles without redeploy.

---

## 20. Security

| Topic               | Rule                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| Partner SL user     | Technical user in `IC_SAP_CONNECTION` only                                                             |
| Portal user         | Never used to login to partner company                                                                 |
| Password storage    | Same standard as rest of platform (encrypt at rest if available); never commit seeds with real secrets |
| API auth            | All `/api/ic/*` behind existing session auth                                                           |
| Company isolation   | Notifications/RFQs filtered by session company ↔ `IC_COMPANY`                                          |
| Admin config writes | Restrict to admin role when write APIs exist                                                           |

---

## 21. Testing strategy

| Level       | Location                                | What                                                      |
| ----------- | --------------------------------------- | --------------------------------------------------------- |
| Unit        | `hana-backend/tests/unit/intercompany/` | routing resolve, tax map, payload build, idempotency keys |
| Integration | `tests/integration/intercompany/`       | RFQ create against HANA test schema (if available)        |
| Flow unit   | orchestrator with mocked steps          | step order + skip/fail handling                           |
| Smoke       | optional                                | hook does not throw on PO create                          |

**Do not** require live multi-company SL for unit tests — mock `ic-sl.documents`.

Pilot tests (if any) move under `legacy` or delete.

---

## 22. Migration from pilot

### 22.1 Phases of code migration

```text
Phase A  Scaffold empty tree + index wall + docs (this plan)
Phase B  Move pilot files → legacy/; temporary re-export for PO create
Phase C  Implement config + routing + SL session (no flow yet)
Phase D  Flow 1 step-by-step
Phase E  Flow 2 → switch PO hook from legacy to afterPoCreated
Phase F  Worker jobs
Phase G  Delete legacy/ + INTERCOMPANY_DOCUMENT_MAP (after data export if needed)
```

### 22.2 Data migration

| From                           | To                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| Pilot map rows                 | Optional one-time export into `IC_DOCUMENT_MAPPING` with object codes `PO` / `AR_DRAFT` |
| Hardcoded tax/branch constants | `IC_TAX_MAPPING` / `IC_COMPANY.DEFAULT_BRANCH_ID`                                       |

---

## 23. Build phases (ordered)

| Phase  | Deliverable                                          | Depends on              |
| ------ | ---------------------------------------------------- | ----------------------- |
| **0**  | Tables created + seed A/B real values                | DBA / you               |
| **1**  | Architecture doc (this) + README pointer             | —                       |
| **2**  | Scaffold folders + empty stubs + `index.ts`          | Phase 1                 |
| **3**  | Move pilot → `legacy/` + keep PO working             | Phase 2                 |
| **4**  | `db/entities` + config queries/services              | Phase 0 seed            |
| **5**  | `routing/*` unit tested                              | Phase 4                 |
| **6**  | `infrastructure/service-layer` session + client      | Phase 4                 |
| **7**  | `domain/*` shells (map, notify, retry, history, rfq) | Phase 4                 |
| **8**  | Flow 1 steps 01–03 (detect, create RFQ, notify)      | Phase 5–7               |
| **9**  | Flow 1 step 04 (fill/submit API)                     | Phase 8                 |
| **10** | Flow 1 step 05 (convert + SQ)                        | Phase 6–9               |
| **11** | Flow 2 full + cut PO hook from legacy                | Phase 5–7               |
| **12** | Worker three jobs                                    | Phase 7–11              |
| **13** | Frontend IC pages                                    | Phase 8–11 APIs         |
| **14** | Delete legacy + old map table                        | Phase 11 stable in prod |

---

## 24. Definition of done per phase

### Phase 2–3 (scaffold + quarantine)

- [ ] Tree exists as in §6
- [ ] `index.ts` exports only public surface
- [ ] Pilot runs from `legacy` without behavior change
- [ ] No new code added inside `legacy/`

### Phase 4–5 (config + routing)

- [ ] Resolve real A/B from seeded `IC_*`
- [ ] Unit test: known vendor → correct target company + customer
- [ ] Unknown vendor → skip (not throw)

### Phase 8–10 (Flow 1)

- [ ] PQ Draft with IC vendor creates RFQ + map + notification
- [ ] Idempotent second save does not duplicate RFQ
- [ ] Vendor can submit price/delivery
- [ ] Convert produces PQ + SQ + maps
- [ ] SQ failure enqueues retry ≤ max

### Phase 11 (Flow 2)

- [ ] Non-draft PO creates AR Draft on partner
- [ ] Draft PO does not
- [ ] Failure does not fail PO API
- [ ] Pilot path disabled

### Phase 12 (worker)

- [ ] Detect creates RFQ for orphan IC draft
- [ ] Retry drains queue
- [ ] Session cleanup runs without error
- [ ] `IC_SCHEDULER_JOB` updated

---

## 25. Anti-patterns (do not)

| Don’t                                           | Do instead                       |
| ----------------------------------------------- | -------------------------------- |
| Hardcode company codes / CardCodes in steps     | `IC_BP_MAPPING` + routing        |
| Call partner SL with portal user session        | `IC_SAP_CONNECTION` + IC session |
| Write new links to `INTERCOMPANY_DOCUMENT_MAP`  | `IC_DOCUMENT_MAPPING`            |
| Put SQL in orchestrators                        | domain/config queries            |
| Import deep paths from purchase-order           | `index.ts` hooks                 |
| Throw from hook and fail PO create              | skip/fail result + history/retry |
| Cascade cancel to partner                       | notify only / manual             |
| One mega `intercompany.service.ts`              | nested folders                   |
| Email for MVP notifications                     | `IC_NOTIFICATION` page           |
| Share mutable global SL cookie across companies | per-company `IC_SL_SESSION`      |

---

## 26. Scaffold checklist

When implementing Phase 2, create (see **plan.md P2** for full tree):

```text
[ ] index.ts
[ ] api/ (routes + controller + schema + 2 hooks)
[ ] config/*/ (5 masters × types/queries/service)
[ ] routing/resolve-partner/ + resolve-sl-target/
[ ] flows/shared/
[ ] flows/flow-1-pq-draft-rfq-chain/ (orchestrator + README + 5 process folders)
[ ] flows/flow-2-po-to-ar-draft/ (orchestrator + README + 4 process folders)
[ ] domain/*/ (5 aggregates)
[ ] infrastructure/ (constants, object-codes, SL, api-log)
[ ] background/ (entry + scheduler + 3 job folders)
[ ] db/entities/ (14 entities)
[ ] Delete pilot flat TS in P1 (not legacy quarantine unless preferred)
[ ] Update README.md → plan.md
[ ] Register IC routes in api.routes (health OK)
```

Each stub should:

```ts
/** TODO Phase N: … */
export async function …(): Promise<never> {
  throw new Error("Not implemented: …");
}
```

Or return `{ status: "skipped", reason: "not_implemented" }` for hooks so PO/PQ stay green.

---

## 27. Glossary

| Term                                 | Meaning                                              |
| ------------------------------------ | ---------------------------------------------------- |
| **IC**                               | Intercompany bounded context                         |
| **Buyer / Source**                   | Company that creates PQ/PO                           |
| **Seller / Target / Vendor company** | Partner company receiving RFQ/SQ/AR Draft            |
| **VendorCode / CardCode**            | BP code on buyer document (maps via `IC_BP_MAPPING`) |
| **BUYER_CUSTOMER_CODE**              | How buyer appears as customer on seller DB           |
| **RFQ**                              | Custom quote object in `IC_RFQ_*` (not SAP)          |
| **Object code**                      | Stable string enum for map/notify (`PQ_DRAFT`, …)    |
| **Hook**                             | Thin after-save integration from document modules    |
| **Orchestrator**                     | Ordered step runner for one flow                     |
| **Step**                             | Single file action inside a flow                     |
| **Worker**                           | Separate process for detect/retry/cleanup            |
| **Pilot / Legacy**                   | Old Phase 1 PO→AR flat module                        |
| **Modular monolith**                 | One deploy, MS-shaped folders + import wall          |
| **Idempotency**                      | Safe re-run without duplicate partner docs           |

---

## Appendix A — Mental model (one slide)

```text
          ┌──────── config (who/how mapped) ────────┐
          │ company · bp · tax · sap-connection · flags │
          └──────────────────┬──────────────────────┘
                             │
  hooks/API ──► routing ─────┤
                             ▼
                      flows (story)
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
           domain         infra SL       worker
        (RFQ,map,         (session,      (detect,
         notify,retry)     post,log)      retry)
              │              │
              └────── IC_* + SAP DBs ─────┘
```

---

## Appendix B — Related paths outside module

| Path                                                                        | Relation                                              |
| --------------------------------------------------------------------------- | ----------------------------------------------------- |
| `hana-backend/src/modules/purchase-order/purchase-order.create.mutation.ts` | Calls IC after PO create                              |
| `hana-backend/src/modules/purchase-quotation/*`                             | Will call after draft save                            |
| `hana-backend/src/modules/intercompany/ops/drop-pilot-document-map.sql`     | P9 DBA drop for pilot map                             |
| `hana-backend/src/services/service-layer.service.ts`                        | User/session SL — **not** IC partner client           |
| `hana-backend/src/routes/api.routes.ts`                                     | Mount `/api/ic`                                       |
| `frontend/src/...`                                                          | P8: IC notifications, RFQ UI, **header unread badge** |

---

## Appendix C — Decision log (architecture)

| Decision            | Choice                           | Why                                  |
| ------------------- | -------------------------------- | ------------------------------------ |
| Deploy shape        | Modular monolith in hana-backend | Speed + shared infra                 |
| Folder shape        | Nested by domain/flow/infra      | Navigate = debug                     |
| Public surface      | `index.ts` only                  | Prevent coupling; extract later      |
| Orchestrator style  | Steps as files                   | Readable Flow 1/2                    |
| Partner auth        | `IC_SAP_CONNECTION`              | Separate from portal login           |
| Pilot code          | `legacy/` quarantine             | Don’t rewrite while PO still depends |
| Worker              | Separate entry                   | Isolation + grill lock               |
| Notifications       | DB + portal page                 | MVP no email                         |
| Fail PO on IC error | No                               | Commercial doc already created       |

---

**Next concrete action:** Phase 0 seed real A/B if not done → Phase 2 **scaffold folder tree + stubs** when you say go.

**Do not start Flow code until** config seed is real (routing tests need real `IC_COMPANY` / `IC_BP_MAPPING` rows).
