# Intercompany Procurement System

## Data Model · SQL · Relationships · Flow Wireframes

**Database:** `SBOCOMMON` (SAP HANA)  
**Main portal login table (existing):** `VST_COMMON` — **do not recreate**  
**Pilot map table:** `INTERCOMPANY_DOCUMENT_MAP` — **P9 retired** (app schema removed; DBA drop via `ops/drop-pilot-document-map.sql`)  
**New IC tables:** `IC_*` — system of record for the rebuild

---

## Navigation

| Section                                                            | Content                                         |
| ------------------------------------------------------------------ | ----------------------------------------------- |
| [1. Big picture](#1-big-picture)                                   | Architecture + layer diagram                    |
| [2. Existing vs new](#2-existing-vs-new-objects)                   | What stays / what is new                        |
| [3. Table catalog](#3-table-catalog)                               | Why each table · use · connections              |
| [4. Relationship map](#4-relationship-map-how-tables-interconnect) | FK-style links + join paths                     |
| [5. Object codes](#5-object-codes-source--target)                  | `PQ_DRAFT`, `RFQ`, `PQ`, `SQ`, `PO`, `AR_DRAFT` |
| [6. Flow 1 wireframe](#6-flow-1-wireframe--table-touchpoints)      | PQ Draft → RFQ → Convert → PQ + SQ              |
| [7. Flow 2 wireframe](#7-flow-2-wireframe--table-touchpoints)      | PO → AR Invoice Draft                           |
| [8. Dynamic routing wireframe](#8-dynamic-routing-wireframe)       | Vendor → map → SL → create                      |
| [9. Worker wireframe](#9-worker-wireframe)                         | Detect · retry · session                        |
| [10. HANA DDL + placeholders](#10-hana-ddl--placeholder-seed)      | Create + dummy rows                             |
| [11. Placeholder cheat-sheet](#11-placeholder-cheat-sheet)         | What to fill                                    |
| [12. Create / drop order](#12-create--drop-order)                  | Safe sequence                                   |
| [13. Decisions (grill lock)](#13-decisions-grill-lock)             | Product rules that drove the model              |

**Code architecture (folders, files):** → **[IC-ARCHITECTURE-PLAN.md](./IC-ARCHITECTURE-PLAN.md)**  
**Build plan (P0–P9):** → **[plan.md](./plan.md)**

---

## 1. Big picture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Web Portal (React)                        │
│  One login = one company (VST_COMMON / session)             │
│  IC Notification page · RFQ fill · Convert · PO create      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Node.js API  +  Worker (separate)               │
│  Business logic · event on save · cron safety-net · retry   │
└───────┬─────────────────────┬─────────────────────┬─────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌──────────────────┐
│  SBOCOMMON    │   │ SAP Service     │   │ Background jobs  │
│  VST_COMMON   │   │ Layer (A–F)     │   │ DETECT_PQ_DRAFT  │
│  IC_* tables  │   │ via IC_SAP_     │   │ PROCESS_RETRY    │
│  (RFQ, maps)  │   │ CONNECTION      │   │ SESSION_CLEANUP  │
└───────────────┘   └─────────────────┘   └──────────────────┘
```

### Responsibility split

| Store                           | Responsibility                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| **`VST_COMMON`**                | Portal login / which SAP company DB the user belongs to                            |
| **`IC_*` tables**               | Intercompany process state, RFQ, mappings, retry, notifications, IC SL credentials |
| **Company SAP DB**              | Real commercial documents (PQ Draft, PQ, SQ, PO, AR Draft)                         |
| **`INTERCOMPANY_DOCUMENT_MAP`** | **Legacy pilot** — P9: no app writes; drop via ops SQL when DBA ready              |

---

## 2. Existing vs new objects

| Object                            | Type     | Status                          | Role                             |
| --------------------------------- | -------- | ------------------------------- | -------------------------------- |
| `SBOCOMMON`                       | Database | **Exists**                      | Common DB for all companies      |
| `VST_COMMON`                      | Table    | **Exists — keep**               | Main portal login / org registry |
| `INTERCOMPANY_DOCUMENT_MAP`       | Table    | **P9 drop scheduled (ops SQL)** | Pilot PO→AR links only           |
| `IC_COMPANY` … `IC_SCHEDULER_JOB` | Tables   | **Create**                      | Full scalable IC model           |

---

## 3. Table catalog

### 3.0 `VST_COMMON` (existing — reference only)

|                    |                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Why**            | Portal must know company list, SAP DB name, and **user** Service Layer credentials for the logged-in company. |
| **Use**            | Login, session company context, listing organizations. **Not** used for partner-company IC create login.      |
| **Connects to**    | `IC_COMPANY.SAP_DB_NAME` **should match** `VST_COMMON.DB_NAME` for the same company.                          |
| **Does not store** | Pairwise BP map, RFQ, document chain, IC technical SL user (those are `IC_*`).                                |

---

### 3.0b `INTERCOMPANY_DOCUMENT_MAP` (pilot — P9 retire)

|                 |                                                                          |
| --------------- | ------------------------------------------------------------------------ |
| **Why**         | Historical pilot: PO → AR Invoice Draft link.                            |
| **Use**         | Read-only / legacy until new Flow 2 is live.                             |
| **Connects to** | Nothing in the new model. **Do not** FK new tables here.                 |
| **Later**       | Export if needed → drop table → all links live in `IC_DOCUMENT_MAPPING`. |

---

### 3.1 `IC_COMPANY`

|                 |                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------- |
| **Why**         | Config-driven list of IC participants (A–F…) without hardcoding companies in code.             |
| **Use**         | Resolve company code ↔ SAP DB; default branch for auto-created partner docs; active flag.      |
| **Key columns** | `COMPANY_ID`, `COMPANY_CODE`, `COMPANY_NAME`, `SAP_DB_NAME`, `DEFAULT_BRANCH_ID`, `IS_ACTIVE`  |
| **Connects to** | Parent of almost every IC table via `COMPANY_ID`. Soft-link to `VST_COMMON` via `SAP_DB_NAME`. |

```text
IC_COMPANY
  ├── IC_SAP_CONNECTION.COMPANY_ID
  ├── IC_BP_MAPPING.BUYER_COMPANY_ID / VENDOR_COMPANY_ID
  ├── IC_TAX_MAPPING.SOURCE_COMPANY_ID / TARGET_COMPANY_ID
  ├── IC_RFQ_HEADER.SOURCE_COMPANY_ID / TARGET_COMPANY_ID
  ├── IC_DOCUMENT_MAPPING.SOURCE_COMPANY_ID / TARGET_COMPANY_ID
  ├── IC_NOTIFICATION.COMPANY_ID
  ├── IC_RETRY_QUEUE.COMPANY_ID
  ├── IC_SYNC_HISTORY.COMPANY_ID
  ├── IC_SL_SESSION.COMPANY_ID
  ├── IC_API_LOG.COMPANY_ID
  └── IC_SCHEDULER_JOB.COMPANY_ID (optional per-company jobs)
```

---

### 3.2 `IC_SAP_CONNECTION`

|                 |                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Why**         | IC engine must log into **partner** SAP companies. Separate from portal login (`VST_COMMON`).                          |
| **Use**         | Service Layer URL, DB, IC technical username/password; session bootstrap.                                              |
| **Key columns** | `CONNECTION_ID`, `COMPANY_ID`, `SERVICE_LAYER_URL`, `DATABASE_NAME`, `USERNAME`, `PASSWORD`, `IS_DEFAULT`, `IS_ACTIVE` |
| **Connects to** | `IC_COMPANY`; used by `IC_SL_SESSION`, `IC_API_LOG` (runtime).                                                         |

```text
IC_COMPANY 1──* IC_SAP_CONNECTION 1──* IC_SL_SESSION
                      │
                      └──► Service Layer Login → Create SQ / AR Draft / etc.
```

---

### 3.3 `IC_BP_MAPPING`

|                 |                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------- |
| **Why**         | Full mesh: A’s vendor code for B ≠ A’s vendor code for C. Pair table is required.            |
| **Use**         | Given buyer company + `VendorCode` on PQ/PO → find target company + customer code on seller. |
| **Key columns** | `BUYER_COMPANY_ID`, `VENDOR_COMPANY_ID`, `VENDOR_CODE`, `BUYER_CUSTOMER_CODE`, `IS_ACTIVE`   |
| **Connects to** | `IC_COMPANY` (buyer + vendor). Consumed by routing for RFQ, SQ, AR Draft.                    |

```text
PQ/PO.CardCode = VENDOR_CODE
       │
       ▼
IC_BP_MAPPING (BUYER = session company)
       │
       ├──► VENDOR_COMPANY_ID → IC_COMPANY → IC_SAP_CONNECTION
       └──► BUYER_CUSTOMER_CODE → CardCode on partner SQ / AR Draft
```

---

### 3.4 Tax resolution (no `IC_TAX_MAPPING`)

**Removed:** `IC_TAX_MAPPING` is **not used**. Do not seed purchase↔sales pairs.  
Optional cleanup SQL (after this release):

```sql
DROP TABLE "SBOCOMMON"."IC_TAX_MAPPING";
```

#### Tax ownership by document (company + doc type)

Tax is always **company-local**. Purchase tax ≠ sales tax; each is taken from the company where the document is posted.

| Document           | Company | Tax family    | How obtained                                                    |
| ------------------ | ------- | ------------- | --------------------------------------------------------------- |
| PQ Draft           | Buyer   | Purchase      | UI / AJAX / SAP buyer defaults                                  |
| RFQ line           | —       | Snapshot only | Buyer draft `VatGroup` for re-apply to PQ only (not seller tax) |
| PQ (after convert) | Buyer   | Purchase      | RFQ snapshot = buyer tax                                        |
| SQ (seller)        | Seller  | Sales         | Dynamic: item `VatGourpSa` → BP `ECVatGroup` → omit             |
| PO                 | Buyer   | Purchase      | Normal buyer PO posting                                         |
| AR Invoice Draft   | Seller  | Sales         | Same dynamic resolver as SQ                                     |
| GRPO / AP (future) | Buyer   | Purchase      | Buyer base doc / SAP                                            |
| AR final (manual)  | Seller  | Sales         | User posts in B1 from draft                                     |

```text
resolvePartnerTax (SQ, AR draft, retry) — docSide = sales:
  1. OITM.VatGourpSa on document company DB   (item sales tax)
  2. OCRD.ECVatGroup on document company DB   (customer default)
  3. omit VatGroup → SAP tax determination on POST
  NEVER copy buyer purchase tax onto seller sales lines

docSide = purchase (future): OITM.VatGroupPu → BP → omit
```

Implementation: `config/tax-mapping/resolve-partner-tax.service.ts`  
Masters: `config/tax-mapping/partner-tax.masters.ts` (HANA tenant query).

**Ops:** Set seller item sales tax + IC customer BP tax in SAP once. No SBOCOMMON tax matrix.

---

### 3.5 `IC_RFQ_HEADER`

|                 |                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| **Why**         | RFQ is **custom-only** (not a SAP object). Vendor fills quote without writing buyer SAP until Convert.          |
| **Use**         | One RFQ per PQ Draft; status lifecycle; link to buyer draft DocEntry.                                           |
| **Statuses**    | `DRAFT` → `SUBMITTED` (vendor can re-edit until convert) → `COMPLETED` (after convert) / `CANCELLED`            |
| **Key columns** | `RFQ_ID`, `RFQ_NUMBER`, `SOURCE_COMPANY_ID`, `TARGET_COMPANY_ID`, `PQ_DRAFT_DOC_ENTRY`, `VENDOR_CODE`, `STATUS` |
| **Connects to** | `IC_COMPANY`; **1──*** `IC_RFQ_LINE`; linked in `IC_DOCUMENT_MAPPING` as target of `PQ_DRAFT`.                  |

---

### 3.6 `IC_RFQ_LINE`

|                 |                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| **Why**         | Line-level quote data. Vendor may edit **price + delivery** only; qty/item stay buyer-owned.          |
| **Use**         | Store vendor unit price, discount, delivery date; source for Convert → SAP PQ lines.                  |
| **Key columns** | `RFQ_ID`, `LINE_NUM`, `ITEM_CODE`, `QUANTITY`, `UNIT_PRICE`, `DELIVERY_DATE`, `TAX_CODE`, `WAREHOUSE` |
| **Connects to** | `IC_RFQ_HEADER.RFQ_ID`                                                                                |

---

### 3.7 `IC_DOCUMENT_MAPPING`

|                 |                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------- |
| **Why**         | Single audit/idempotency spine for **all** IC document pairs (replaces pilot map for new work).    |
| **Use**         | Prevent double create; notification deep-links; retry correlation; flow tracking UI.               |
| **Key columns** | Source/target company, object type, doc entry/num, `STATUS`, `ERROR_MESSAGE`, `SOURCE_REMARKS_TAG` |
| **Connects to** | `IC_COMPANY`; optionally `IC_RETRY_QUEUE.DOC_MAPPING_ID`; mirrored in notifications by type/id.    |

**Typical rows**

| Source object | Target object                   |
| ------------- | ------------------------------- |
| `PQ_DRAFT`    | `RFQ`                           |
| `RFQ`         | `PQ` (after convert, if needed) |
| `PQ`          | `SQ`                            |
| `PO`          | `AR_DRAFT`                      |

---

### 3.8 `IC_NOTIFICATION`

|                 |                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| **Why**         | In-app IC notification page (no email in MVP).                                                                  |
| **Use**         | Alert partner company of new RFQ, submitted RFQ, convert success, AR draft created, retry failure.              |
| **Key columns** | `COMPANY_ID` (receiver), `DOCUMENT_TYPE`, `DOCUMENT_ID`, `TITLE`, `MESSAGE`, `PRIORITY`, `IS_READ`, `FLOW_STEP` |
| **Connects to** | `IC_COMPANY`; logically points at RFQ / mapping / SAP docs via type + id.                                       |

---

### 3.9 `IC_RETRY_QUEUE`

|                 |                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| **Why**         | Partner SL create can fail; user request must not loop forever. Max **1–2** retries.                      |
| **Use**         | Worker picks `WAITING` rows when `NEXT_RETRY_AT` due; updates status.                                     |
| **Key columns** | `ACTION_CODE`, `SOURCE_DOCUMENT`, `TARGET_DOCUMENT`, `RETRY_COUNT`, `MAX_RETRY`, `STATUS`, `PAYLOAD_JSON` |
| **Connects to** | `IC_COMPANY`; optional `DOC_MAPPING_ID` → `IC_DOCUMENT_MAPPING`.                                          |

---

### 3.10 `IC_SYNC_HISTORY`

|                 |                                                                    |
| --------------- | ------------------------------------------------------------------ |
| **Why**         | Ops/support audit: what ran, success/fail, duration, raw response. |
| **Use**         | Debugging; compliance trail; not the live process state.           |
| **Connects to** | `IC_COMPANY` (soft). Append-only.                                  |

---

### 3.11 `IC_CONFIGURATION`

|                  |                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| **Why**          | Feature flags without redeploy: enable Flow 1 / Flow 2, cron minutes, max retry, remarks prefix.   |
| **Use**          | Worker + API read keys at runtime (env can override if you choose).                                |
| **Example keys** | `ENABLE_FLOW1_RFQ_CHAIN`, `ENABLE_FLOW2_DIRECT_PO`, `MAX_RETRY_COUNT`, `DETECT_DRAFT_CRON_MINUTES` |
| **Connects to**  | None (global key/value).                                                                           |

---

### 3.12 `IC_SL_SESSION`

|                 |                                                          |
| --------------- | -------------------------------------------------------- |
| **Why**         | Avoid login storm; reuse B1SESSION/ROUTEID until expiry. |
| **Use**         | Cache IC connection sessions per company.                |
| **Connects to** | `IC_COMPANY`, optionally `IC_SAP_CONNECTION`.            |

---

### 3.13 `IC_API_LOG`

|                 |                                                      |
| --------------- | ---------------------------------------------------- |
| **Why**         | Full SL request/response for support (mask secrets). |
| **Use**         | Post-mortem when SQ/AR Draft create fails.           |
| **Connects to** | `IC_COMPANY` (soft).                                 |

---

### 3.14 `IC_SCHEDULER_JOB`

|                 |                                                                               |
| --------------- | ----------------------------------------------------------------------------- |
| **Why**         | Worker process tracks job health (not in-API cron only).                      |
| **Use**         | `DETECT_PQ_DRAFT`, `PROCESS_RETRY`, `SESSION_CLEANUP` last/next run + status. |
| **Connects to** | Optional `COMPANY_ID`; mostly global jobs (`COMPANY_ID` NULL).                |

---

## 4. Relationship map (how tables interconnect)

### 4.1 Entity relationship (logical)

```text
                    VST_COMMON (login)
                         │
                         │ SAP_DB_NAME match
                         ▼
                    IC_COMPANY
                    /    |    \
                   /     |     \
                  /      |      \
                 ▼       ▼       ▼
    IC_SAP_CONNECTION  IC_BP_MAPPING  IC_TAX_MAPPING
            │           (pair)        (pair)
            ▼
      IC_SL_SESSION
            │
            │  (runtime SL calls)
            ▼
      IC_API_LOG · IC_SYNC_HISTORY


    IC_RFQ_HEADER 1──* IC_RFQ_LINE
         │
         │  mapped by
         ▼
    IC_DOCUMENT_MAPPING ◄──── IC_RETRY_QUEUE
         │
         │  user-facing
         ▼
    IC_NOTIFICATION


    IC_CONFIGURATION     (global flags)
    IC_SCHEDULER_JOB     (worker heartbeat)
```

### 4.2 Core join paths (for implementers)

**A. Route vendor to partner company**

```text
Session company DB
  → IC_COMPANY (SAP_DB_NAME = session DB) AS BUYER
  → IC_BP_MAPPING ON BUYER_COMPANY_ID = BUYER.COMPANY_ID
                 AND VENDOR_CODE = document.CardCode
  → IC_COMPANY AS VENDOR ON VENDOR.COMPANY_ID = BP.VENDOR_COMPANY_ID
  → IC_SAP_CONNECTION ON COMPANY_ID = VENDOR.COMPANY_ID AND IS_DEFAULT = 1
```

**B. RFQ for a PQ Draft**

```text
IC_RFQ_HEADER
  WHERE SOURCE_COMPANY_ID = buyer
    AND PQ_DRAFT_DOC_ENTRY = draft.DocEntry
  → IC_RFQ_LINE ON RFQ_ID
  → IC_DOCUMENT_MAPPING
       SOURCE_OBJECT = 'PQ_DRAFT'
       TARGET_OBJECT = 'RFQ'
```

**C. Retry a failed partner create**

```text
IC_RETRY_QUEUE (STATUS = WAITING, NEXT_RETRY_AT <= now)
  → optional IC_DOCUMENT_MAPPING via DOC_MAPPING_ID
  → IC_SAP_CONNECTION for target company
  → on success: update mapping + notification + sync history
```

---

## 5. Object codes (source / target)

Use these strings consistently in `IC_DOCUMENT_MAPPING`, notifications, retry actions.

| Code       | System of record | Meaning                      |
| ---------- | ---------------- | ---------------------------- |
| `PQ_DRAFT` | Buyer SAP        | Purchase Quotation **Draft** |
| `RFQ`      | `IC_RFQ_HEADER`  | Custom RFQ                   |
| `PQ`       | Buyer SAP        | Real Purchase Quotation      |
| `SQ`       | Seller SAP       | Real Sales Quotation         |
| `PO`       | Buyer SAP        | Purchase Order               |
| `AR_DRAFT` | Seller SAP       | A/R Invoice **Draft**        |

---

## 6. Flow 1 wireframe + table touchpoints

### 6.1 End-to-end storyboard

```text
 COMPANY A (buyer)                         CUSTOM DB (SBOCOMMON)              COMPANY B (seller)
 ─────────────────                         ────────────────────               ─────────────────

 [1] Create PQ Draft
     Vendor = V1001 (maps to B)
 [2] Save Draft ──────────────────────────► Event (API) + Cron safety-net
                                            │
                                            ├─ IC_BP_MAPPING (A + V1001 → B)
                                            ├─ IC_RFQ_HEADER + IC_RFQ_LINE
                                            ├─ IC_DOCUMENT_MAPPING
                                            │    PQ_DRAFT → RFQ  SUCCESS
                                            ├─ IC_NOTIFICATION → company B
                                            └─ IC_SYNC_HISTORY
                                                                   │
 [3]  ◄──────────────── notification ──────┴──────────────────────┤
                                                                   ▼
                                                          [4] Open RFQ portal
                                                          [5] Fill price + delivery
                                                          [6] Submit
                                            │
                                            ├─ IC_RFQ_* STATUS=SUBMITTED
                                            ├─ IC_NOTIFICATION → company A
                                            └─ IC_SYNC_HISTORY
 [7] See submitted RFQ
 [8] Convert
     · Load RFQ lines
     · Update SAP PQ Draft prices
     · Convert draft → real PQ
     · Remarks tag e.g. IC-RFQ-…
                                            │
                                            ├─ IC_DOCUMENT_MAPPING PQ / RFQ
                                            └─ (orchestrate partner)
                                            │
                                            ├─ IC_SAP_CONNECTION (B)
                                            ├─ IC_TAX_MAPPING A→B
                                            ├─ IC_COMPANY.DEFAULT_BRANCH_ID (B)
                                            ├─ SL: Create real SQ
                                            │    Customer = BUYER_CUSTOMER_CODE
                                            │    Remarks include A PQ number
                                            ├─ IC_DOCUMENT_MAPPING PQ → SQ
                                            ├─ IC_NOTIFICATION → A and/or B
                                            ├─ IC_RFQ STATUS=COMPLETED
                                            └─ on fail: IC_RETRY_QUEUE
                                                                   │
                                                                   ▼
                                                          [9] Real SQ exists
 [10] Notification: Flow 1 complete

 END FLOW 1
```

### 6.2 Step × table matrix (Flow 1)

| Step | Action             | Tables read                                                                             | Tables write                                                                                                   |
| ---- | ------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1–2  | Save PQ Draft      | `IC_COMPANY`, `IC_BP_MAPPING`, `IC_CONFIGURATION`                                       | `IC_RFQ_HEADER`, `IC_RFQ_LINE`, `IC_DOCUMENT_MAPPING`, `IC_NOTIFICATION`, `IC_SYNC_HISTORY`                    |
| 4–6  | Vendor fill/submit | `IC_RFQ_*`                                                                              | `IC_RFQ_*`, `IC_NOTIFICATION`, `IC_SYNC_HISTORY`                                                               |
| 8    | Convert + SQ       | `IC_RFQ_*`, `IC_BP_MAPPING`, `IC_SAP_CONNECTION`, `IC_COMPANY` (+ seller OITM/OCRD tax) | SAP PQ/SQ; `IC_DOCUMENT_MAPPING`; `IC_NOTIFICATION`; `IC_RFQ` completed; fail → `IC_RETRY_QUEUE`, `IC_API_LOG` |

### 6.3 UI wireframe (notification page — both companies)

```text
┌──────────────────────────────────────────────────────────────┐
│  Intercompany Activity                              [Filter] │
├──────────────────────────────────────────────────────────────┤
│  ● HIGH  New RFQ from Company A          RFQ-10021   Unread  │
│          Flow1 · PQ Draft 5001 → RFQ                          │
│          [Open RFQ]                                           │
├──────────────────────────────────────────────────────────────┤
│  ● MED   RFQ submitted by Company B      RFQ-10021   Read    │
│          Waiting convert                                      │
├──────────────────────────────────────────────────────────────┤
│  ● HIGH  SQ created in Company B         SQ 8002     Unread  │
│          Linked PQ 6003 · Remarks IC-PQ-6003                  │
├──────────────────────────────────────────────────────────────┤
│  ● HIGH  Retry 1/2 CREATE_SQ failed      …           Unread  │
│          Next retry in 5 min                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Flow 2 wireframe + table touchpoints

### 7.1 End-to-end storyboard

```text
 COMPANY A                                              SBOCOMMON                         COMPANY B
 ─────────                                              ─────────                         ─────────

 [1] Purchase Quotation exists (optional prior Flow 1)
 [2] Create Purchase Order
     Vendor = IC vendor
 [3] Save / Post PO ──── if ENABLE_FLOW2_DIRECT_PO ───►
                                            IC_BP_MAPPING
                                            IC_SAP_CONNECTION (B)
                                            IC_TAX_MAPPING
                                            IC_COMPANY default branch B
                                            SL: Create AR Invoice Draft
                                               Customer = A’s customer on B
                                               Remarks = IC-PO-{A.DocNum}
                                            IC_DOCUMENT_MAPPING  PO → AR_DRAFT
                                            IC_NOTIFICATION → B (and A)
                                            IC_SYNC_HISTORY
                                            fail → IC_RETRY_QUEUE (max 2)
                                                                   │
                                                                   ▼
                                                          [4] AR Invoice Draft
                                                          User posts invoice manually
 END FLOW 2
```

### 7.2 Step × table matrix (Flow 2)

| Step | Action         | Tables read                                                                                     | Tables write                                                                                       |
| ---- | -------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 2–3  | PO create      | `IC_CONFIGURATION`, `IC_COMPANY`, `IC_BP_MAPPING`, `IC_SAP_CONNECTION` (+ seller OITM/OCRD tax) | `IC_DOCUMENT_MAPPING`, `IC_NOTIFICATION`, `IC_SYNC_HISTORY`, `IC_API_LOG`; fail → `IC_RETRY_QUEUE` |
| 4    | Manual post AR | (none IC)                                                                                       | SAP only                                                                                           |

### 7.3 Env / config flags

| Key                      | Effect                                           |
| ------------------------ | ------------------------------------------------ |
| `ENABLE_FLOW1_RFQ_CHAIN` | PQ Draft path creates RFQ                        |
| `ENABLE_FLOW2_DIRECT_PO` | PO creates AR Draft even without prior RFQ chain |

Both can be `true` (grill lock).

---

## 8. Dynamic routing wireframe

```text
                    ┌──────────────────┐
                    │ Document Vendor  │
                    │ Code (CardCode)  │
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ IC_BP_MAPPING    │
                    │ buyer + vendor   │
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ IC_COMPANY       │
                    │ (target)         │
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ IC_SAP_CONNECTION│
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ IC_SL_SESSION    │
                    │ (cache or login) │
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ Service Layer    │
                    │ Create Document  │
                    └────────┬─────────┘
                             ▼
              ┌──────────────┴──────────────┐
              ▼                             ▼
     IC_DOCUMENT_MAPPING            IC_NOTIFICATION
     IC_SYNC_HISTORY                (+ IC_API_LOG)
              │
              fail
              ▼
        IC_RETRY_QUEUE
```

---

## 9. Worker wireframe

```text
┌─────────────────────────────────────────┐
│  Worker process (separate from API)     │
│                                         │
│  loop / cron:                           │
│   1. DETECT_PQ_DRAFT                    │
│      · for each active IC_COMPANY       │
│      · IC login via IC_SAP_CONNECTION   │
│      · find new PQ drafts w/ IC vendor  │
│      · if no IC_RFQ for draft → create  │
│      · update IC_SCHEDULER_JOB          │
│                                         │
│   2. PROCESS_RETRY                      │
│      · IC_RETRY_QUEUE WAITING due       │
│      · retry count < MAX_RETRY (2)      │
│      · SUCCESS / FAILED / DEAD          │
│                                         │
│   3. SESSION_CLEANUP                    │
│      · expire IC_SL_SESSION rows        │
└─────────────────────────────────────────┘
```

**Hybrid detect (grill):** API event on save is primary; worker is safety-net.

---

## 10. HANA DDL + placeholder seed

> Run in **SBOCOMMON**.  
> Replace all `<<FILL_...>>`.  
> Delete dummy `0` / `DUMMY` rows before production.

```sql
-- =============================================================================
-- 1) IC_COMPANY
-- =============================================================================
CREATE COLUMN TABLE "SBOCOMMON"."IC_COMPANY" (
  "COMPANY_ID"          INTEGER GENERATED BY DEFAULT AS IDENTITY,
  "COMPANY_CODE"        NVARCHAR(10)  NOT NULL,
  "COMPANY_NAME"        NVARCHAR(100) NOT NULL,
  "SAP_DB_NAME"         NVARCHAR(100) NOT NULL,
  "DEFAULT_BRANCH_ID"   INTEGER,
  "IS_ACTIVE"           TINYINT DEFAULT 1 NOT NULL,
  "CREATED_AT"          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "UPDATED_AT"          TIMESTAMP,
  PRIMARY KEY ("COMPANY_ID"),
  UNIQUE ("COMPANY_CODE"),
  UNIQUE ("SAP_DB_NAME")
);

INSERT INTO "SBOCOMMON"."IC_COMPANY"
  ("COMPANY_CODE","COMPANY_NAME","SAP_DB_NAME","DEFAULT_BRANCH_ID","IS_ACTIVE")
VALUES
  ('A', '<<FILL_COMPANY_A_NAME>>', '<<FILL_SAP_DB_A>>', 1, 1),
  ('B', '<<FILL_COMPANY_B_NAME>>', '<<FILL_SAP_DB_B>>', 1, 1),
  ('C', '<<FILL_COMPANY_C_NAME>>', '<<FILL_SAP_DB_C>>', 1, 1),
  ('D', '<<FILL_COMPANY_D_NAME>>', '<<FILL_SAP_DB_D>>', 1, 1),
  ('E', '<<FILL_COMPANY_E_NAME>>', '<<FILL_SAP_DB_E>>', 1, 1),
  ('F', '<<FILL_COMPANY_F_NAME>>', '<<FILL_SAP_DB_F>>', 1, 1);

-- =============================================================================
-- 2) IC_SAP_CONNECTION  (IC technical login — NOT VST_COMMON portal login)
-- =============================================================================
CREATE COLUMN TABLE "SBOCOMMON"."IC_SAP_CONNECTION" (
  "CONNECTION_ID"       INTEGER GENERATED BY DEFAULT AS IDENTITY,
  "COMPANY_ID"          INTEGER NOT NULL,
  "SERVER"              NVARCHAR(255),
  "SERVICE_LAYER_URL"   NVARCHAR(500) NOT NULL,
  "DATABASE_NAME"       NVARCHAR(100) NOT NULL,
  "LICENSE_SERVER"      NVARCHAR(255),
  "USERNAME"            NVARCHAR(100) NOT NULL,
  "PASSWORD"            NVARCHAR(500) NOT NULL,
  "IS_DEFAULT"          TINYINT DEFAULT 1 NOT NULL,
  "IS_ACTIVE"           TINYINT DEFAULT 1 NOT NULL,
  "CREATED_AT"          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "UPDATED_AT"          TIMESTAMP,
  PRIMARY KEY ("CONNECTION_ID")
);

INSERT INTO "SBOCOMMON"."IC_SAP_CONNECTION"
  ("COMPANY_ID","SERVER","SERVICE_LAYER_URL","DATABASE_NAME","LICENSE_SERVER",
   "USERNAME","PASSWORD","IS_DEFAULT","IS_ACTIVE")
VALUES
  (1, '<<FILL_SL_HOST_A>>', '<<FILL_SL_URL_A>>', '<<FILL_SAP_DB_A>>', '<<FILL_LICENSE_A>>',
   '<<FILL_IC_USER_A>>', '<<FILL_IC_PASS_A>>', 1, 1),
  (2, '<<FILL_SL_HOST_B>>', '<<FILL_SL_URL_B>>', '<<FILL_SAP_DB_B>>', '<<FILL_LICENSE_B>>',
   '<<FILL_IC_USER_B>>', '<<FILL_IC_PASS_B>>', 1, 1);

-- =============================================================================
-- 3) IC_BP_MAPPING
-- =============================================================================
CREATE COLUMN TABLE "SBOCOMMON"."IC_BP_MAPPING" (
  "MAPPING_ID"            INTEGER GENERATED BY DEFAULT AS IDENTITY,
  "BUYER_COMPANY_ID"      INTEGER NOT NULL,
  "VENDOR_COMPANY_ID"     INTEGER NOT NULL,
  "VENDOR_CODE"           NVARCHAR(50) NOT NULL,
  "BUYER_CUSTOMER_CODE"   NVARCHAR(50) NOT NULL,
  "IS_ACTIVE"             TINYINT DEFAULT 1 NOT NULL,
  "REMARKS"               NVARCHAR(255),
  "CREATED_AT"            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "UPDATED_AT"            TIMESTAMP,
  PRIMARY KEY ("MAPPING_ID"),
  UNIQUE ("BUYER_COMPANY_ID","VENDOR_CODE")
);

INSERT INTO "SBOCOMMON"."IC_BP_MAPPING"
  ("BUYER_COMPANY_ID","VENDOR_COMPANY_ID","VENDOR_CODE","BUYER_CUSTOMER_CODE","IS_ACTIVE","REMARKS")
VALUES
  (1, 2, '<<FILL_VENDOR_CODE_A_SEES_B>>', '<<FILL_CUSTOMER_CODE_B_SEES_A>>', 1, 'A→B'),
  (1, 3, '<<FILL_VENDOR_CODE_A_SEES_C>>', '<<FILL_CUSTOMER_CODE_C_SEES_A>>', 1, 'A→C'),
  (2, 1, '<<FILL_VENDOR_CODE_B_SEES_A>>', '<<FILL_CUSTOMER_CODE_A_SEES_B>>', 1, 'B→A');

-- =============================================================================
-- 4) IC_TAX_MAPPING — REMOVED (dynamic tax via OITM/OCRD per company + doc type)
-- Optional cleanup after deploy:
--   DROP TABLE "SBOCOMMON"."IC_TAX_MAPPING";
-- =============================================================================

-- =============================================================================
-- 5) IC_RFQ_HEADER
-- =============================================================================
CREATE COLUMN TABLE "SBOCOMMON"."IC_RFQ_HEADER" (
  "RFQ_ID"              BIGINT GENERATED BY DEFAULT AS IDENTITY,
  "RFQ_NUMBER"          NVARCHAR(50) NOT NULL,
  "SOURCE_COMPANY_ID"   INTEGER NOT NULL,
  "TARGET_COMPANY_ID"   INTEGER NOT NULL,
  "PQ_DRAFT_DOC_ENTRY"  INTEGER NOT NULL,
  "PQ_DRAFT_DOC_NUM"    INTEGER,
  "VENDOR_CODE"         NVARCHAR(50) NOT NULL,
  "STATUS"              NVARCHAR(20) NOT NULL,
  "REMARKS"             NVARCHAR(500),
  "CREATED_BY"          NVARCHAR(100),
  "CREATED_AT"          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "UPDATED_AT"          TIMESTAMP,
  "SUBMITTED_AT"        TIMESTAMP,
  "COMPLETED_AT"        TIMESTAMP,
  PRIMARY KEY ("RFQ_ID"),
  UNIQUE ("SOURCE_COMPANY_ID","PQ_DRAFT_DOC_ENTRY")
);

INSERT INTO "SBOCOMMON"."IC_RFQ_HEADER"
  ("RFQ_NUMBER","SOURCE_COMPANY_ID","TARGET_COMPANY_ID","PQ_DRAFT_DOC_ENTRY","PQ_DRAFT_DOC_NUM",
   "VENDOR_CODE","STATUS","REMARKS","CREATED_BY")
VALUES
  ('RFQ-DUMMY-0001', 1, 2, 0, 0, '<<FILL_VENDOR_CODE>>', 'DRAFT',
   '<<PLACEHOLDER_DELETE_BEFORE_PROD>>', '<<FILL_USER>>');

-- =============================================================================
-- 6) IC_RFQ_LINE
-- =============================================================================
CREATE COLUMN TABLE "SBOCOMMON"."IC_RFQ_LINE" (
  "RFQ_LINE_ID"         BIGINT GENERATED BY DEFAULT AS IDENTITY,
  "RFQ_ID"              BIGINT NOT NULL,
  "LINE_NUM"            INTEGER NOT NULL,
  "ITEM_CODE"           NVARCHAR(50) NOT NULL,
  "DESCRIPTION"         NVARCHAR(200),
  "QUANTITY"            DECIMAL(19,6) NOT NULL,
  "UNIT_PRICE"          DECIMAL(19,6),
  "DISCOUNT"            DECIMAL(19,6) DEFAULT 0,
  "TAX_CODE"            NVARCHAR(50),
  "DELIVERY_DATE"       TIMESTAMP,
  "WAREHOUSE"           NVARCHAR(50),
  "UOM_CODE"            NVARCHAR(20),
  "REMARKS"             NVARCHAR(255),
  "CREATED_AT"          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "UPDATED_AT"          TIMESTAMP,
  PRIMARY KEY ("RFQ_LINE_ID"),
  UNIQUE ("RFQ_ID","LINE_NUM")
);

INSERT INTO "SBOCOMMON"."IC_RFQ_LINE"
  ("RFQ_ID","LINE_NUM","ITEM_CODE","DESCRIPTION","QUANTITY","UNIT_PRICE","DISCOUNT",
   "TAX_CODE","DELIVERY_DATE","WAREHOUSE","UOM_CODE","REMARKS")
VALUES
  (1, 0, '<<FILL_ITEM_CODE>>', '<<FILL_ITEM_NAME>>', 1.000000, NULL, 0,
   '<<FILL_TAX>>', NULL, '<<FILL_WHS>>', 'EACH', 'vendor fills price+delivery');

-- =============================================================================
-- 7) IC_DOCUMENT_MAPPING  (new spine — pilot INTERCOMPANY_DOCUMENT_MAP kept separate)
-- =============================================================================
CREATE COLUMN TABLE "SBOCOMMON"."IC_DOCUMENT_MAPPING" (
  "MAPPING_ID"            BIGINT GENERATED BY DEFAULT AS IDENTITY,
  "SOURCE_COMPANY_ID"     INTEGER NOT NULL,
  "TARGET_COMPANY_ID"     INTEGER,
  "SOURCE_OBJECT"         NVARCHAR(40) NOT NULL,
  "SOURCE_DOC_ENTRY"      NVARCHAR(50) NOT NULL,
  "SOURCE_DOC_NUM"        NVARCHAR(50),
  "TARGET_OBJECT"         NVARCHAR(40),
  "TARGET_DOC_ENTRY"      NVARCHAR(50),
  "TARGET_DOC_NUM"        NVARCHAR(50),
  "STATUS"                NVARCHAR(20) NOT NULL,
  "ERROR_MESSAGE"         NVARCHAR(2000),
  "SOURCE_REMARKS_TAG"    NVARCHAR(200),
  "CREATED_AT"            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "UPDATED_AT"            TIMESTAMP,
  PRIMARY KEY ("MAPPING_ID")
);

CREATE UNIQUE INDEX "IX_IC_DOC_MAP_SRC"
  ON "SBOCOMMON"."IC_DOCUMENT_MAPPING"
  ("SOURCE_COMPANY_ID","SOURCE_OBJECT","SOURCE_DOC_ENTRY","TARGET_OBJECT");

INSERT INTO "SBOCOMMON"."IC_DOCUMENT_MAPPING"
  ("SOURCE_COMPANY_ID","TARGET_COMPANY_ID","SOURCE_OBJECT","SOURCE_DOC_ENTRY","SOURCE_DOC_NUM",
   "TARGET_OBJECT","TARGET_DOC_ENTRY","TARGET_DOC_NUM","STATUS","ERROR_MESSAGE","SOURCE_REMARKS_TAG")
VALUES
  (1, 2, 'PQ_DRAFT', '0', '0', 'RFQ', '1', 'RFQ-DUMMY-0001', 'SUCCESS', NULL, 'IC-PQDRAFT-0'),
  (1, 2, 'PO', '0', '0', 'AR_DRAFT', NULL, NULL, 'PENDING', '<<PLACEHOLDER>>', 'IC-PO-0');

-- =============================================================================
-- 8) IC_NOTIFICATION
-- =============================================================================
CREATE COLUMN TABLE "SBOCOMMON"."IC_NOTIFICATION" (
  "NOTIFICATION_ID"     BIGINT GENERATED BY DEFAULT AS IDENTITY,
  "COMPANY_ID"          INTEGER NOT NULL,
  "DOCUMENT_TYPE"       NVARCHAR(40) NOT NULL,
  "DOCUMENT_ID"         NVARCHAR(50),
  "TITLE"               NVARCHAR(200) NOT NULL,
  "MESSAGE"             NVARCHAR(2000),
  "PRIORITY"            NVARCHAR(10) DEFAULT 'MEDIUM',
  "IS_READ"             TINYINT DEFAULT 0 NOT NULL,
  "FLOW_STEP"           NVARCHAR(80),
  "CREATED_AT"          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("NOTIFICATION_ID")
);

INSERT INTO "SBOCOMMON"."IC_NOTIFICATION"
  ("COMPANY_ID","DOCUMENT_TYPE","DOCUMENT_ID","TITLE","MESSAGE","PRIORITY","IS_READ","FLOW_STEP")
VALUES
  (2, 'RFQ', '1', 'New RFQ from Company A',
   '<<FILL_MESSAGE>>', 'HIGH', 0, 'FLOW1_RFQ_CREATED');

-- =============================================================================
-- 9) IC_RETRY_QUEUE
-- =============================================================================
CREATE COLUMN TABLE "SBOCOMMON"."IC_RETRY_QUEUE" (
  "RETRY_ID"            BIGINT GENERATED BY DEFAULT AS IDENTITY,
  "COMPANY_ID"          INTEGER NOT NULL,
  "DOC_MAPPING_ID"      BIGINT,
  "SOURCE_DOCUMENT"     NVARCHAR(100) NOT NULL,
  "TARGET_DOCUMENT"     NVARCHAR(100),
  "ACTION_CODE"         NVARCHAR(80) NOT NULL,
  "PAYLOAD_JSON"        NCLOB,
  "ERROR_MESSAGE"       NVARCHAR(2000),
  "RETRY_COUNT"         INTEGER DEFAULT 0 NOT NULL,
  "MAX_RETRY"           INTEGER DEFAULT 2 NOT NULL,
  "NEXT_RETRY_AT"       TIMESTAMP,
  "STATUS"              NVARCHAR(20) NOT NULL,
  "CREATED_AT"          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "UPDATED_AT"          TIMESTAMP,
  PRIMARY KEY ("RETRY_ID")
);

INSERT INTO "SBOCOMMON"."IC_RETRY_QUEUE"
  ("COMPANY_ID","DOC_MAPPING_ID","SOURCE_DOCUMENT","TARGET_DOCUMENT","ACTION_CODE",
   "PAYLOAD_JSON","ERROR_MESSAGE","RETRY_COUNT","MAX_RETRY","NEXT_RETRY_AT","STATUS")
VALUES
  (1, NULL, 'PO:0', 'AR_DRAFT', 'CREATE_AR_DRAFT',
   '{"note":"<<FILL_OR_NULL>>"}', '<<PLACEHOLDER_ERROR>>', 0, 2, CURRENT_TIMESTAMP, 'WAITING');

-- =============================================================================
-- 10) IC_SYNC_HISTORY
-- =============================================================================
CREATE COLUMN TABLE "SBOCOMMON"."IC_SYNC_HISTORY" (
  "SYNC_ID"             BIGINT GENERATED BY DEFAULT AS IDENTITY,
  "COMPANY_ID"          INTEGER NOT NULL,
  "ACTION"              NVARCHAR(80) NOT NULL,
  "DOCUMENT_TYPE"       NVARCHAR(40),
  "DOCUMENT_ENTRY"      NVARCHAR(50),
  "STATUS"              NVARCHAR(20) NOT NULL,
  "DURATION_MS"         INTEGER,
  "RESPONSE_JSON"       NCLOB,
  "CREATED_AT"          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("SYNC_ID")
);

INSERT INTO "SBOCOMMON"."IC_SYNC_HISTORY"
  ("COMPANY_ID","ACTION","DOCUMENT_TYPE","DOCUMENT_ENTRY","STATUS","DURATION_MS","RESPONSE_JSON")
VALUES
  (1, 'CREATE_RFQ', 'PQ_DRAFT', '0', 'SUCCESS', 0, '{"dummy":true}');

-- =============================================================================
-- 11) IC_CONFIGURATION
-- =============================================================================
CREATE COLUMN TABLE "SBOCOMMON"."IC_CONFIGURATION" (
  "CONFIG_ID"           INTEGER GENERATED BY DEFAULT AS IDENTITY,
  "CONFIG_KEY"          NVARCHAR(100) NOT NULL,
  "CONFIG_VALUE"        NVARCHAR(500) NOT NULL,
  "DESCRIPTION"         NVARCHAR(255),
  PRIMARY KEY ("CONFIG_ID"),
  UNIQUE ("CONFIG_KEY")
);

INSERT INTO "SBOCOMMON"."IC_CONFIGURATION" ("CONFIG_KEY","CONFIG_VALUE","DESCRIPTION")
VALUES
  ('ENABLE_FLOW1_RFQ_CHAIN',     'true',  'PQ Draft → RFQ → Convert → PQ+SQ'),
  ('ENABLE_FLOW2_DIRECT_PO',     'true',  'PO → AR Invoice Draft'),
  ('DETECT_DRAFT_CRON_MINUTES',  '5',     'Worker safety-net interval'),
  ('MAX_RETRY_COUNT',            '2',     'Retry 1–2 times'),
  ('RETRY_DELAY_MINUTES',        '5',     'Wait between retries'),
  ('SL_SESSION_TIMEOUT_MINUTES', '30',    'IC session cache TTL'),
  ('REMARKS_PREFIX',             'IC-',   'SAP Remarks tracking prefix');

-- =============================================================================
-- 12) IC_SL_SESSION
-- =============================================================================
CREATE COLUMN TABLE "SBOCOMMON"."IC_SL_SESSION" (
  "SESSION_ID"          INTEGER GENERATED BY DEFAULT AS IDENTITY,
  "COMPANY_ID"          INTEGER NOT NULL,
  "CONNECTION_ID"       INTEGER,
  "SESSION_TOKEN"       NVARCHAR(500) NOT NULL,
  "ROUTE_ID"            NVARCHAR(200),
  "LOGIN_TIME"          TIMESTAMP NOT NULL,
  "EXPIRY_TIME"         TIMESTAMP NOT NULL,
  PRIMARY KEY ("SESSION_ID")
);

INSERT INTO "SBOCOMMON"."IC_SL_SESSION"
  ("COMPANY_ID","CONNECTION_ID","SESSION_TOKEN","ROUTE_ID","LOGIN_TIME","EXPIRY_TIME")
VALUES
  (2, 2, '<<FILL_B1SESSION_DUMMY>>', '<<FILL_ROUTEID_DUMMY>>',
   CURRENT_TIMESTAMP, ADD_SECONDS(CURRENT_TIMESTAMP, 1800));

-- =============================================================================
-- 13) IC_API_LOG
-- =============================================================================
CREATE COLUMN TABLE "SBOCOMMON"."IC_API_LOG" (
  "LOG_ID"              BIGINT GENERATED BY DEFAULT AS IDENTITY,
  "COMPANY_ID"          INTEGER,
  "METHOD"              NVARCHAR(10) NOT NULL,
  "ENDPOINT"            NVARCHAR(500) NOT NULL,
  "REQUEST_JSON"        NCLOB,
  "RESPONSE_JSON"       NCLOB,
  "STATUS_CODE"         INTEGER,
  "CREATED_AT"          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("LOG_ID")
);

INSERT INTO "SBOCOMMON"."IC_API_LOG"
  ("COMPANY_ID","METHOD","ENDPOINT","REQUEST_JSON","RESPONSE_JSON","STATUS_CODE")
VALUES
  (2, 'POST', '<<FILL_SL_URL>>/Login', '{"UserName":"<<MASKED>>"}', '{"SessionId":"<<DUMMY>>"}', 200);

-- =============================================================================
-- 14) IC_SCHEDULER_JOB
-- =============================================================================
CREATE COLUMN TABLE "SBOCOMMON"."IC_SCHEDULER_JOB" (
  "JOB_ID"              INTEGER GENERATED BY DEFAULT AS IDENTITY,
  "JOB_NAME"            NVARCHAR(80) NOT NULL,
  "COMPANY_ID"          INTEGER,
  "LAST_RUN"            TIMESTAMP,
  "NEXT_RUN"            TIMESTAMP,
  "STATUS"              NVARCHAR(20) DEFAULT 'IDLE',
  "LAST_ERROR"          NVARCHAR(2000),
  PRIMARY KEY ("JOB_ID")
);

INSERT INTO "SBOCOMMON"."IC_SCHEDULER_JOB" ("JOB_NAME","COMPANY_ID","STATUS")
VALUES
  ('DETECT_PQ_DRAFT', NULL, 'IDLE'),
  ('PROCESS_RETRY',   NULL, 'IDLE'),
  ('SESSION_CLEANUP', NULL, 'IDLE');
```

### Verify tables

```sql
SELECT TABLE_NAME
FROM TABLES
WHERE SCHEMA_NAME = 'SBOCOMMON'
  AND TABLE_NAME LIKE 'IC_%'
ORDER BY TABLE_NAME;
```

---

## 11. Placeholder cheat-sheet

| Placeholder                       | Table.column                          | Meaning                                          |
| --------------------------------- | ------------------------------------- | ------------------------------------------------ |
| `<<FILL_SAP_DB_A>>`…`F`           | `IC_COMPANY.SAP_DB_NAME`              | Must equal `VST_COMMON.DB_NAME` for that company |
| `<<FILL_COMPANY_*_NAME>>`         | `IC_COMPANY.COMPANY_NAME`             | Display name                                     |
| `DEFAULT_BRANCH_ID`               | `IC_COMPANY`                          | Branch on auto SQ / AR Draft                     |
| `<<FILL_SL_URL_*>>`               | `IC_SAP_CONNECTION.SERVICE_LAYER_URL` | e.g. `https://host:50000/b1s/v1`                 |
| `<<FILL_IC_USER_*>>` / `PASS`     | `IC_SAP_CONNECTION`                   | **IC technical** user (not portal user)          |
| `<<FILL_VENDOR_CODE_A_SEES_B>>`   | `IC_BP_MAPPING.VENDOR_CODE`           | Vendor card **in A’s SAP** meaning company B     |
| `<<FILL_CUSTOMER_CODE_B_SEES_A>>` | `IC_BP_MAPPING.BUYER_CUSTOMER_CODE`   | Customer card **in B’s SAP** meaning company A   |
| `<<FILL_SOURCE_TAX>>` / `TARGET`  | `IC_TAX_MAPPING`                      | e.g. `IN-12.5` → `GSTO`                          |
| Rows with DocEntry `0` / `DUMMY`  | RFQ, DOC_MAP, etc.                    | **Structure samples — delete before prod**       |

---

## 12. Create / drop order

### Create (safe)

```text
1  IC_COMPANY
2  IC_SAP_CONNECTION
3  IC_BP_MAPPING
4  IC_TAX_MAPPING
5  IC_CONFIGURATION
6  IC_RFQ_HEADER
7  IC_RFQ_LINE
8  IC_DOCUMENT_MAPPING
9  IC_NOTIFICATION
10 IC_RETRY_QUEUE
11 IC_SYNC_HISTORY
12 IC_SL_SESSION
13 IC_API_LOG
14 IC_SCHEDULER_JOB
```

**Do not drop:** `VST_COMMON`

### Pilot drop (P9)

```text
-- Export optional history first: ops/export-pilot-document-map.sql
-- Then DBA:
-- See ops/drop-pilot-document-map.sql
-- DROP TABLE "SBOCOMMON"."INTERCOMPANY_DOCUMENT_MAP";
```

---

## 13. Decisions (grill lock)

| Topic               | Decision                                               |
| ------------------- | ------------------------------------------------------ |
| Companies           | A–F peers, full mesh                                   |
| Login               | One user ↔ one company                                 |
| Portal login        | `VST_COMMON`                                           |
| IC SL login         | `IC_SAP_CONNECTION`                                    |
| RFQ                 | Custom tables only                                     |
| Vendor RFQ edits    | Price + delivery                                       |
| SAP prices from RFQ | At Convert only                                        |
| Convert             | Update PQ Draft → real PQ + real SQ on partner         |
| Flow 2 end          | AR Invoice Draft only (no auto post)                   |
| Paths               | Flow 1 + Flow 2 via config flags                       |
| Detect draft        | Event + cron safety-net                                |
| Retry               | 1–2 times, worker process                              |
| Cancel partner      | No auto cascade                                        |
| Master data         | Same codes; UDF if needed                              |
| Pilot               | Remove from code; table keep now / delete later        |
| Build order         | Foundation tables first → Flow 1 / Flow 2 step by step |

---

## 14. One-page interconnect summary

```text
LOGIN PATH
  User → VST_COMMON → own company SAP session

IC CREATE PATH
  VendorCode
    → IC_BP_MAPPING
    → IC_COMPANY (target)
    → IC_SAP_CONNECTION (+ IC_SL_SESSION)
    → Service Layer document
    → IC_DOCUMENT_MAPPING
    → IC_NOTIFICATION
    → IC_SYNC_HISTORY / IC_API_LOG
    → fail: IC_RETRY_QUEUE → Worker

RFQ PATH
  PQ_DRAFT (SAP)
    → IC_RFQ_HEADER / LINE
    → Convert uses RFQ → SAP PQ + SAP SQ

CONFIG PATH
  IC_CONFIGURATION + IC_TAX_MAPPING + IC_COMPANY.DEFAULT_BRANCH_ID
```

---

_Document version: foundation model after grill lock.  
Location: `hana-backend/src/modules/intercompany/IC-DATA-MODEL-AND-FLOWS.md`_  
_Update this file when tables or flow steps change._
