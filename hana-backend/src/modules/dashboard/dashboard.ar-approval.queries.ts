// A/R Invoice Drafts (ODRF ObjType 13) for Overview open-work KPI + virtualized list.
// IC Flow 2 posts POST /Drafts — not open OINV rows.

import { logger } from "@/core/logger/pino-logger";
import { executeTenantQuery } from "@/db/tenant-query";
import { getIcPartnerCodes } from "@/modules/intercompany/api/ic-partner-scope";

/** One A/R Invoice Draft row for the Overview panel. */
export type OverviewArApprovalItem = {
  docEntry: number;
  docNum: number | null;
  isDraft: boolean;
  cardCode: string;
  cardName: string;
  docTotal: number;
  docDate: string | null;
  /** Stable list key (DocEntry for ODRF). */
  wddCode: number;
  /** Display status (e.g. Draft). */
  status: string;
  ageDays: number;
  requester: string | null;
};

export type OverviewArApprovalResult = {
  items: OverviewArApprovalItem[];
  count: number;
  openValue: number;
};

export type OverviewArDraftsPageResult = {
  items: OverviewArApprovalItem[];
  offset: number;
  limit: number;
  hasMore: boolean;
  nextOffset: number | null;
  count: number;
  openValue: number;
};

/** AR Invoice object type in ODRF / OWDD. */
const AR_INVOICE_OBJ_TYPE = "13";

/** Default page size for infinite-scroll AR draft list (not a hard total cap). */
export const AR_DRAFT_PAGE_DEFAULT = 40;
/** Max page size accepted by the paginated drafts endpoint. */
export const AR_DRAFT_PAGE_MAX = 100;

/** First page embedded on overview payload (list continues via paginated API). */
const AR_OVERVIEW_EMBED_LIMIT = AR_DRAFT_PAGE_DEFAULT;

export function clampArDraftPageParams(input: { offset?: number; limit?: number }): {
  offset: number;
  limit: number;
} {
  const offsetRaw = Number(input.offset ?? 0);
  const limitRaw = Number(input.limit ?? AR_DRAFT_PAGE_DEFAULT);
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.trunc(offsetRaw)) : 0;
  const limitUncapped = Number.isFinite(limitRaw) ? Math.trunc(limitRaw) : AR_DRAFT_PAGE_DEFAULT;
  const limit = Math.min(AR_DRAFT_PAGE_MAX, Math.max(1, limitUncapped));
  return { offset, limit };
}

/** SAP OWDD.Status values treated as still awaiting action (OWDD legacy path). */
const PENDING_OWDD_STATUSES = new Set(["W"]);

const toCount = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
};

const toMoney = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};

/** Case-insensitive field pick from raw HANA row. */
export function pickRowField(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }
  const lowerMap = new Map(Object.keys(row).map((key) => [key.toLowerCase(), key]));
  for (const key of keys) {
    const actual = lowerMap.get(key.toLowerCase());
    if (actual !== undefined && row[actual] !== undefined && row[actual] !== null) {
      return row[actual];
    }
  }
  return undefined;
}

export function isPendingOwddStatus(status: unknown): boolean {
  const code = String(status ?? "")
    .trim()
    .toUpperCase();
  return PENDING_OWDD_STATUSES.has(code);
}

export function mapOwddStatusLabel(status: unknown): string {
  const code = String(status ?? "")
    .trim()
    .toUpperCase();
  switch (code) {
    case "W":
      return "Pending";
    case "Y":
      return "Approved";
    case "N":
      return "Rejected";
    case "P":
      return "Generated";
    case "A":
      return "Authorized";
    case "C":
      return "Canceled";
    default:
      return code || "Unknown";
  }
}

function toIsoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  if (!raw) return null;
  // HANA may return "YYYY-MM-DD HH:mm:ss.SSS" or ISO.
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function computeAgeDays(docDateIso: string | null, createDateIso: string | null): number {
  const basis = docDateIso ?? createDateIso;
  if (!basis) return 0;
  const start = new Date(`${basis}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return 0;
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startUtc = start.getTime();
  const diffMs = todayUtc - startUtc;
  const days = Math.floor(diffMs / 86_400_000);
  return days < 0 ? 0 : days;
}

/**
 * Map a raw ODRF AR invoice draft row into the overview item shape.
 */
export function mapArInvoiceDraftRow(row: Record<string, unknown>): OverviewArApprovalItem | null {
  const docEntry = toCount(pickRowField(row, "DocEntry", "docEntry"));
  if (docEntry <= 0) {
    return null;
  }

  const docNumRaw = pickRowField(row, "DocNum", "docNum");
  const docNumParsed =
    docNumRaw === null || docNumRaw === undefined || docNumRaw === "" ? null : toCount(docNumRaw);
  const docNum = docNumParsed !== null && docNumParsed > 0 ? docNumParsed : null;

  const cardCode = String(pickRowField(row, "CardCode", "cardCode") ?? "").trim();
  const cardName = String(pickRowField(row, "CardName", "cardName") ?? "").trim();
  const docTotal = toMoney(pickRowField(row, "DocTotal", "docTotal"));
  const docDate = toIsoDate(pickRowField(row, "DocDate", "docDate"));
  const createDate = toIsoDate(pickRowField(row, "CreateDate", "createDate"));
  const ageFromSql = pickRowField(row, "AgeDays", "ageDays");
  const ageDays =
    ageFromSql !== undefined && ageFromSql !== null && Number.isFinite(Number(ageFromSql))
      ? Math.max(0, Math.trunc(Number(ageFromSql)))
      : computeAgeDays(docDate, createDate);

  const requesterRaw = pickRowField(row, "OwnerID", "ownerId", "UserSign", "userSign");
  const requester =
    requesterRaw === null || requesterRaw === undefined || String(requesterRaw).trim() === ""
      ? null
      : String(requesterRaw).trim();

  return {
    docEntry,
    docNum,
    isDraft: true,
    cardCode,
    cardName: cardName || cardCode || "—",
    docTotal,
    docDate,
    wddCode: docEntry,
    status: "Draft",
    ageDays,
    requester,
  };
}

/**
 * Map a raw OWDD (+ ODRF/OINV) row into the overview approval item shape.
 * Exported for unit tests (OWDD version drift / column alias variance).
 */
export function mapArApprovalRow(row: Record<string, unknown>): OverviewArApprovalItem | null {
  const wddCode = toCount(pickRowField(row, "WddCode", "wddCode"));
  if (wddCode <= 0) {
    return null;
  }

  const isDraftRaw = String(pickRowField(row, "IsDraft", "isDraft") ?? "N")
    .trim()
    .toUpperCase();
  const isDraft = isDraftRaw === "Y" || isDraftRaw === "T" || isDraftRaw === "TRUE";

  const draftEntry = toCount(pickRowField(row, "DraftEntry", "draftEntry"));
  const owddDocEntry = toCount(pickRowField(row, "DocEntry", "docEntry"));
  const joinedDocEntry = toCount(pickRowField(row, "JoinedDocEntry", "joinedDocEntry"));
  const docEntry =
    joinedDocEntry > 0 ? joinedDocEntry : isDraft && draftEntry > 0 ? draftEntry : owddDocEntry;

  const docNumRaw = pickRowField(row, "DocNum", "docNum");
  const docNumParsed =
    docNumRaw === null || docNumRaw === undefined || docNumRaw === "" ? null : toCount(docNumRaw);
  const docNum = docNumParsed !== null && docNumParsed > 0 ? docNumParsed : null;

  const cardCode = String(pickRowField(row, "CardCode", "cardCode") ?? "").trim();
  const cardName = String(pickRowField(row, "CardName", "cardName") ?? "").trim();
  const docTotal = toMoney(pickRowField(row, "DocTotal", "docTotal"));
  const docDate = toIsoDate(pickRowField(row, "DocDate", "docDate"));
  const createDate = toIsoDate(pickRowField(row, "CreateDate", "createDate"));
  const ageFromSql = pickRowField(row, "AgeDays", "ageDays");
  const ageDays =
    ageFromSql !== undefined && ageFromSql !== null && Number.isFinite(Number(ageFromSql))
      ? Math.max(0, Math.trunc(Number(ageFromSql)))
      : computeAgeDays(docDate, createDate);

  const statusCode = pickRowField(row, "Status", "status");
  const requesterRaw = pickRowField(row, "OwnerID", "ownerId", "Requester", "requester");
  const requester =
    requesterRaw === null || requesterRaw === undefined || String(requesterRaw).trim() === ""
      ? null
      : String(requesterRaw).trim();

  return {
    docEntry: docEntry > 0 ? docEntry : wddCode,
    docNum,
    isDraft,
    cardCode,
    cardName: cardName || cardCode || "—",
    docTotal,
    docDate,
    wddCode,
    status: mapOwddStatusLabel(statusCode),
    ageDays,
    requester,
  };
}

/**
 * Map a raw open OINV row into the overview list shape.
 */
export function mapArOpenInvoiceRow(row: Record<string, unknown>): OverviewArApprovalItem | null {
  const docEntry = toCount(pickRowField(row, "DocEntry", "docEntry"));
  if (docEntry <= 0) {
    return null;
  }

  const docNumRaw = pickRowField(row, "DocNum", "docNum");
  const docNumParsed =
    docNumRaw === null || docNumRaw === undefined || docNumRaw === "" ? null : toCount(docNumRaw);
  const docNum = docNumParsed !== null && docNumParsed > 0 ? docNumParsed : null;

  const cardCode = String(pickRowField(row, "CardCode", "cardCode") ?? "").trim();
  const cardName = String(pickRowField(row, "CardName", "cardName") ?? "").trim();
  const docTotal = toMoney(pickRowField(row, "DocTotal", "docTotal"));
  const docDate = toIsoDate(pickRowField(row, "DocDate", "docDate"));
  const ageFromSql = pickRowField(row, "AgeDays", "ageDays");
  const ageDays =
    ageFromSql !== undefined && ageFromSql !== null && Number.isFinite(Number(ageFromSql))
      ? Math.max(0, Math.trunc(Number(ageFromSql)))
      : computeAgeDays(docDate, null);

  return {
    docEntry,
    docNum,
    isDraft: false,
    cardCode,
    cardName: cardName || cardCode || "—",
    docTotal,
    docDate,
    wddCode: docEntry,
    status: "Open",
    ageDays,
    requester: null,
  };
}

const AR_DRAFT_WHERE = `
  CAST(d."ObjType" AS NVARCHAR) = '${AR_INVOICE_OBJ_TYPE}'
  AND UPPER(IFNULL(d."CANCELED", 'N')) <> 'Y'
`;

async function loadArInvoiceDraftStats(
  dbName: string,
  allowedCardCodes: string[],
): Promise<{ count: number; openValue: number }> {
  try {
    const statsRaw = (await executeTenantQuery(
      dbName,
      `
        SELECT COUNT(*) AS "OpenCount",
               SUM(d."DocTotal") AS "OpenValue"
          FROM "ODRF" d
         WHERE ${AR_DRAFT_WHERE}
           AND ${allowedCardCodes.length > 0 ? `d."CardCode" IN (${allowedCardCodes.map(() => "?").join(", ")})` : "1=0"}
      `,
      allowedCardCodes,
    )) as unknown;
    const statsRows = Array.isArray(statsRaw) ? (statsRaw as Record<string, unknown>[]) : [];
    const stats = statsRows[0];
    if (!stats) {
      return { count: 0, openValue: 0 };
    }
    return {
      count: toCount(pickRowField(stats, "OpenCount", "openCount")),
      openValue: toMoney(pickRowField(stats, "OpenValue", "openValue")),
    };
  } catch {
    return { count: 0, openValue: 0 };
  }
}

function mapArDraftRows(raw: unknown): OverviewArApprovalItem[] {
  const rows = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  const items: OverviewArApprovalItem[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const mapped = mapArInvoiceDraftRow(row as Record<string, unknown>);
    if (!mapped) continue;
    items.push(mapped);
  }
  return items;
}

/**
 * Paginated A/R Invoice Drafts (ODRF ObjType 13). No total-row hard cap — use offset pages.
 * Soft-fails to empty when schema differs. Listed on the dashboard (virtual infinite scroll).
 */
export async function loadArInvoiceDraftsPage(
  dbName: string,
  params: { offset?: number; limit?: number } = {},
): Promise<OverviewArDraftsPageResult> {
  const { offset, limit } = clampArDraftPageParams(params);
  const allowedCardCodes = await getIcPartnerCodes(dbName, "sales");
  try {
    const sql = `
      SELECT
        d."DocEntry" AS "DocEntry",
        d."DocNum" AS "DocNum",
        d."CardCode" AS "CardCode",
        d."CardName" AS "CardName",
        d."DocTotal" AS "DocTotal",
        d."DocDate" AS "DocDate",
        d."CreateDate" AS "CreateDate",
        d."UserSign" AS "UserSign",
        DAYS_BETWEEN(COALESCE(d."DocDate", d."CreateDate"), CURRENT_DATE) AS "AgeDays"
      FROM "ODRF" d
      WHERE ${AR_DRAFT_WHERE}
        AND ${allowedCardCodes.length > 0 ? `d."CardCode" IN (${allowedCardCodes.map(() => "?").join(", ")})` : "1=0"}
      ORDER BY d."DocDate" DESC, d."DocEntry" DESC
      LIMIT ? OFFSET ?
    `;

    const raw = (await executeTenantQuery(dbName, sql, [
      ...allowedCardCodes,
      limit,
      offset,
    ])) as unknown;
    const items = mapArDraftRows(raw);
    const stats = await loadArInvoiceDraftStats(dbName, allowedCardCodes);
    const nextOffset = offset + items.length;
    const hasMore =
      items.length === limit && (stats.count > 0 ? nextOffset < stats.count : items.length > 0);

    return {
      items,
      offset,
      limit,
      hasMore,
      nextOffset: hasMore ? nextOffset : null,
      count: stats.count > 0 ? stats.count : offset + items.length,
      openValue: stats.openValue,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.warn({
      db: dbName,
      err: caughtError,
      msg: "Overview: AR invoice drafts (ODRF) page load failed; returning empty list",
    });
    return {
      items: [],
      offset,
      limit,
      hasMore: false,
      nextOffset: null,
      count: 0,
      openValue: 0,
    };
  }
}

/**
 * Overview KPI + first embed page of A/R Invoice Drafts (ODRF).
 * Full list continues via loadArInvoiceDraftsPage (infinite scroll) — no hard 50 cap.
 */
export async function loadArApprovalPending(dbName: string): Promise<OverviewArApprovalResult> {
  try {
    const page = await loadArInvoiceDraftsPage(dbName, {
      limit: AR_OVERVIEW_EMBED_LIMIT,
      offset: 0,
    });
    return {
      items: page.items,
      count: page.count,
      openValue: page.openValue,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.warn({
      db: dbName,
      err: caughtError,
      msg: "Overview: AR invoice drafts (ODRF) load failed; returning empty list",
    });
    return { items: [], count: 0, openValue: 0 };
  }
}

/** @deprecated OWDD path retained for tests only — overview uses ODRF drafts via loadArApprovalPending. */
export async function loadArApprovalPendingFromOwdd(
  dbName: string,
): Promise<OverviewArApprovalResult> {
  try {
    // Prefer draft (ODRF) when IsDraft=Y; otherwise posted invoice (OINV).
    // DAYS_BETWEEN is HANA-native; falls back in mapper if missing.
    const sql = `
      SELECT
        w."WddCode" AS "WddCode",
        w."Status" AS "Status",
        w."ObjType" AS "ObjType",
        w."DocEntry" AS "DocEntry",
        w."DraftEntry" AS "DraftEntry",
        w."IsDraft" AS "IsDraft",
        w."CreateDate" AS "CreateDate",
        w."OwnerID" AS "OwnerID",
        COALESCE(d."DocEntry", i."DocEntry") AS "JoinedDocEntry",
        COALESCE(d."DocNum", i."DocNum") AS "DocNum",
        COALESCE(d."CardCode", i."CardCode") AS "CardCode",
        COALESCE(d."CardName", i."CardName") AS "CardName",
        COALESCE(d."DocTotal", i."DocTotal", 0) AS "DocTotal",
        COALESCE(d."DocDate", i."DocDate", w."CreateDate") AS "DocDate",
        DAYS_BETWEEN(COALESCE(d."DocDate", i."DocDate", w."CreateDate"), CURRENT_DATE) AS "AgeDays"
      FROM "OWDD" w
      LEFT JOIN "ODRF" d
        ON UPPER(IFNULL(w."IsDraft", 'N')) = 'Y'
        AND d."ObjType" = '${AR_INVOICE_OBJ_TYPE}'
        AND d."DocEntry" = COALESCE(NULLIF(w."DraftEntry", 0), w."DocEntry")
      LEFT JOIN "OINV" i
        ON UPPER(IFNULL(w."IsDraft", 'N')) <> 'Y'
        AND i."DocEntry" = w."DocEntry"
      WHERE CAST(w."ObjType" AS NVARCHAR) = '${AR_INVOICE_OBJ_TYPE}'
        AND UPPER(TRIM(CAST(w."Status" AS NVARCHAR))) = 'W'
      ORDER BY w."CreateDate" ASC, w."WddCode" ASC
      LIMIT ${AR_DRAFT_PAGE_DEFAULT}
    `;

    const raw = (await executeTenantQuery(dbName, sql, [])) as unknown;
    const rows = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];

    const items: OverviewArApprovalItem[] = [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const mapped = mapArApprovalRow(row as Record<string, unknown>);
      if (!mapped) continue;
      if (
        !isPendingOwddStatus(
          pickRowField(row as Record<string, unknown>, "Status", "status") ?? "W",
        )
      ) {
        continue;
      }
      items.push(mapped);
    }

    const openValue = toMoney(items.reduce((sum, item) => sum + item.docTotal, 0));

    return {
      items,
      count: items.length,
      openValue,
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.warn({
      db: dbName,
      err: caughtError,
      msg: "Overview: AR approval pending (OWDD) load failed; returning empty list",
    });
    return { items: [], count: 0, openValue: 0 };
  }
}
