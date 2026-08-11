/**
 * Partner SAP document helpers via IC Service Layer.
 */

import type { ApiLogService } from "@/modules/intercompany/infrastructure/api-log/api-log.service";
import { createApiLogService } from "@/modules/intercompany/infrastructure/api-log/api-log.service";
import { SAP_OBJECT_TYPE_AR_INVOICE } from "@/modules/intercompany/infrastructure/constants";
import {
  clampSapDocumentComments,
  mergeUserAndIcRemarks,
} from "@/modules/intercompany/infrastructure/ic-remarks-chain";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import type { ResolveSlTargetService } from "@/modules/intercompany/routing/resolve-sl-target/resolve-sl-target.service";
import { createResolveSlTargetService } from "@/modules/intercompany/routing/resolve-sl-target/resolve-sl-target.service";

import { createIcSlClient, type IcSlClient } from "./ic-sl.client";
import { createIcSlSessionService, type IcSlSessionService } from "./ic-sl.session";

const SCOPE = IC_LOG_SCOPE.SL;

export type CreateArInvoiceDraftInput = {
  companyId: number;
  /**
   * Full Service Layer A/R Invoice Draft body (CardCode, lines, …).
   * Posted to `/Drafts` with DocObjectCode 13 (A/R Invoice Draft). Not a real OINV post.
   */
  draftPayload: Record<string, unknown>;
};

export type CreateSalesQuotationInput = {
  companyId: number;
  cardCode: string;
  lines: unknown[];
  remarks?: string;
  /**
   * Buyer PQ / PO vendor reference (NumAtCard). Prefer this over IC chain text.
   * SAP field is short (≤100).
   */
  numAtCard?: string | null;
  /**
   * Seller multi-branch companies require BPL_IDAssignedToInvoice (OQUT.BPLId).
   * From IC_COMPANY.DEFAULT_BRANCH_ID (same as Flow 2 AR invoice draft).
   */
  defaultBranchId?: number | null;
  /**
   * NNM1.Series for Sales Quotation (Obj 23). When set, SAP assigns DocNum from that series' NextNumber.
   */
  series?: number | null;
};

export type ApplyPricesToDraftInput = {
  companyId: number;
  /** Buyer PurchaseQuotations DocEntry (column name kept for RFQ header compatibility). */
  draftEntry: number;
  documentLines: Record<string, unknown>[];
  /** Optional Comments patch (appended IC chain — does not wipe lines if caller merged). */
  comments?: string | null;
};

/** @deprecated Flow 1 no longer converts drafts; kept for tests / legacy callers. */
export type ConvertDraftToDocumentInput = {
  companyId: number;
  draftEntry: number;
  comments?: string | null;
  lineOverrides?: Record<string, unknown>[];
};

export type IcSlDocumentResult = {
  docEntry: number;
  docNum?: number;
};

const safeJson = (value: unknown): string | null => {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

/** Overlay commercial fields from RFQ onto draft DocumentLines by LineNum (fallback by index). */
export const mergeDocumentLinesByLineNum = (
  existing: Record<string, unknown>[],
  overrides: Record<string, unknown>[],
): Record<string, unknown>[] => {
  if (overrides.length === 0) {
    return existing;
  }

  const byLineNum = new Map<number, Record<string, unknown>>();
  for (const line of existing) {
    const lineNum = Number(line.LineNum);
    if (Number.isFinite(lineNum)) {
      byLineNum.set(lineNum, { ...line });
    }
  }

  // Buyer PQ PATCH: only commercial overlays. Never ItemCode / ItemDescription /
  // VatGroup / WH / UoM — those stay from the existing SAP line (GET base).
  const commercialKeys = [
    "Quantity",
    "UnitPrice",
    "DiscountPercent",
    "ShipDate",
    "ReqDate",
  ] as const;

  const merged: Record<string, unknown>[] = [];
  for (let i = 0; i < overrides.length; i++) {
    const override = overrides[i] ?? {};
    const lineNumRaw = override.LineNum;
    const lineNum =
      lineNumRaw !== undefined && lineNumRaw !== null && Number.isFinite(Number(lineNumRaw))
        ? Number(lineNumRaw)
        : i;
    const base = byLineNum.get(lineNum) ?? existing[i] ?? {};
    const next: Record<string, unknown> = { ...base, LineNum: lineNum };
    for (const key of commercialKeys) {
      if (override[key] !== undefined && override[key] !== null && override[key] !== "") {
        next[key] = override[key];
      }
    }
    // Always apply numeric commercial fields even when 0 (valid zero discount / free goods).
    if (override.Quantity !== undefined) {
      next.Quantity = override.Quantity;
    }
    if (override.RequiredQuantity !== undefined) {
      next.RequiredQuantity = override.RequiredQuantity;
    }
    if (override.UnitPrice !== undefined) {
      next.UnitPrice = override.UnitPrice;
    }
    if (override.DiscountPercent !== undefined) {
      next.DiscountPercent = override.DiscountPercent;
    }
    merged.push(next);
  }

  // Keep any draft lines not present in RFQ overrides (should not happen in Flow 1).
  for (const line of existing) {
    const lineNum = Number(line.LineNum);
    if (!Number.isFinite(lineNum)) {
      continue;
    }
    if (!merged.some((row) => Number(row.LineNum) === lineNum)) {
      merged.push(line);
    }
  }

  return merged;
};

const parseDocResult = (
  data: { DocEntry?: number; DocNum?: number } | undefined,
): IcSlDocumentResult => {
  const docEntry = Number(data?.DocEntry);
  if (!Number.isFinite(docEntry) || docEntry <= 0) {
    throw new Error("IC SL document response missing DocEntry");
  }
  const docNumRaw = data?.DocNum;
  const docNum = docNumRaw === undefined || docNumRaw === null ? undefined : Number(docNumRaw);
  return {
    docEntry,
    docNum: Number.isFinite(docNum) ? docNum : undefined,
  };
};

export type GetDraftCommentsInput = {
  companyId: number;
  /** Buyer PurchaseQuotations DocEntry. */
  draftEntry: number;
};

export type DraftHeaderFields = {
  /** Parent typed Comments (user text + any prior IC lines). */
  comments: string | null;
  /** Buyer vendor ref no (NumAtCard) — must carry to seller SQ. */
  numAtCard: string | null;
  /** Buyer vendor CardName from PQ (for IC remarks — never CardCode). */
  cardName?: string | null;
};

/** Seller SQ line snapshot for Flow 2 base conversion (POST /Drafts from OQUT). */
export type IcSalesQuotationLine = {
  LineNum: number;
  ItemCode?: string | null;
  Quantity?: number | null;
  /** SAP SL: bost_Open | bost_Close (omit → treat as open). */
  LineStatus?: string | null;
  RemainingOpenQuantity?: number | null;
};

export type IcSalesQuotationSnapshot = {
  docEntry: number;
  docNum?: number;
  cardCode?: string | null;
  documentLines: IcSalesQuotationLine[];
};

export type GetSalesQuotationInput = {
  companyId: number;
  /** Seller OQUT DocEntry (BaseEntry for AR convert). */
  docEntry: number;
};

export type FindSalesQuotationByDocNumInput = {
  companyId: number;
  docNum: number;
};

export type FindSalesQuotationByIcChainInput = {
  companyId: number;
  /** Seller-side customer (buyer BP on seller company). */
  cardCode: string;
  /**
   * Tokens expected in SQ Comments (e.g. PQ DocNum, RFQ number, "Based on PQ 5001106").
   * First match wins (newest DocEntry first).
   */
  remarkTokens: string[];
};

export type IcSlDocuments = {
  /** Create A/R Invoice Draft on seller (`POST /Drafts`, DocObjectCode 13). */
  createArInvoiceDraft: (input: CreateArInvoiceDraftInput) => Promise<IcSlDocumentResult>;
  createSalesQuotation: (input: CreateSalesQuotationInput) => Promise<IcSlDocumentResult>;
  /**
   * GET seller Sales Quotation for Flow 2 convert (BaseType 23).
   * Used so AR Invoice Draft is copy-from SQ, not a free-standing invoice.
   */
  getSalesQuotation: (input: GetSalesQuotationInput) => Promise<IcSalesQuotationSnapshot>;
  /** Resolve seller SQ DocEntry when remarks only carry DocNum. */
  findSalesQuotationByDocNum: (
    input: FindSalesQuotationByDocNumInput,
  ) => Promise<IcSalesQuotationSnapshot | null>;
  /**
   * Best-effort Flow 2 recovery: find seller SQ by customer + IC remarks chain tokens
   * when IC_DOCUMENT_MAPPING RFQ→SQ is missing or ERROR without target.
   */
  findSalesQuotationByIcChain: (
    input: FindSalesQuotationByIcChainInput,
  ) => Promise<IcSalesQuotationSnapshot | null>;
  /** @deprecated Not used by Flow 1 convert (PQ already exists). */
  convertDraftToDocument: (params: ConvertDraftToDocumentInput) => Promise<IcSlDocumentResult>;
  /** PATCH buyer PurchaseQuotations with RFQ commercial lines. */
  applyPricesToPq: (input: ApplyPricesToDraftInput) => Promise<void>;
  /**
   * One GET for convert: parent Comments + NumAtCard from real PQ.
   * Parent remarks stay via applyPrices PATCH merge; this feeds SQ remarks + vendor ref.
   */
  getDraftHeaderFields: (input: GetDraftCommentsInput) => Promise<DraftHeaderFields>;
  /** @deprecated Prefer getDraftHeaderFields — kept for older call sites / tests. */
  getDraftComments: (input: GetDraftCommentsInput) => Promise<string | null>;
};

/** SAP BoObjectTypes: Sales Quotation (OQUT). Used as BaseType on AR Invoice Draft lines. */
export const SAP_OBJ_SALES_QUOTATION = 23;

export const createIcSlDocuments = (deps?: {
  resolveSlTarget?: ResolveSlTargetService;
  session?: IcSlSessionService;
  client?: IcSlClient;
  apiLog?: ApiLogService;
}): IcSlDocuments => {
  const resolveSlTarget = deps?.resolveSlTarget ?? createResolveSlTargetService();
  const session = deps?.session ?? createIcSlSessionService();
  const client = deps?.client ?? createIcSlClient();
  const apiLog = deps?.apiLog ?? createApiLogService();

  const withCompanySession = async (companyId: number) => {
    const target = await resolveSlTarget.resolve(companyId);
    if (!target) {
      icLog.error(SCOPE, "IC SL session aborted — no connection", {
        check: "sl_connection",
        companyId,
        outcome: "fail",
      });
      throw new Error(`No active IC_SAP_CONNECTION for companyId=${companyId}`);
    }
    const slSession = await session.getOrLogin(target.connection);
    icLog.debug(SCOPE, "IC SL session ready", {
      check: "sl_session",
      companyId,
      connectionId: target.connection.connectionId,
      databaseName: target.connection.databaseName,
      outcome: "pass",
    });
    return { connection: target.connection, session: slSession };
  };

  const logSlRequest = (params: {
    companyId: number;
    method: string;
    endpoint: string;
    lineCount?: number;
  }) => {
    icLog.info(SCOPE, "IC SL request", {
      check: "sl_request",
      companyId: params.companyId,
      endpoint: params.endpoint,
      lineCount: params.lineCount,
      method: params.method,
      outcome: "pass",
    });
  };

  const logSlFailure = (params: {
    companyId: number;
    method: string;
    endpoint: string;
    err: unknown;
  }) => {
    const message = params.err instanceof Error ? params.err.message : String(params.err);
    icLog.error(SCOPE, "IC SL request failed", {
      check: "sl_request",
      companyId: params.companyId,
      endpoint: params.endpoint,
      err: params.err instanceof Error ? params.err : new Error(message),
      method: params.method,
      outcome: "fail",
    });
  };

  const getDraftHeaderFields = async (input: GetDraftCommentsInput): Promise<DraftHeaderFields> => {
    const { connection, session: slSession } = await withCompanySession(input.companyId);
    // Real PQ (Flow 1 source) — not Drafts.
    const endpoint = `/PurchaseQuotations(${input.draftEntry})?$select=Comments,NumAtCard,CardName`;
    logSlRequest({
      companyId: input.companyId,
      endpoint,
      method: "GET",
    });
    try {
      const response = await client.request<Record<string, unknown>>({
        connection,
        endpoint,
        method: "GET",
        session: slSession,
      });
      const commentsRaw = response.data?.Comments;
      const numAtCardRaw = response.data?.NumAtCard;
      const cardNameRaw = response.data?.CardName;
      const comments =
        commentsRaw === null || commentsRaw === undefined
          ? null
          : String(commentsRaw).trim() || null;
      const numAtCard =
        numAtCardRaw === null || numAtCardRaw === undefined
          ? null
          : String(numAtCardRaw).trim() || null;
      const cardName =
        cardNameRaw === null || cardNameRaw === undefined
          ? null
          : String(cardNameRaw).trim() || null;
      return { cardName, comments, numAtCard };
    } catch (err: unknown) {
      logSlFailure({
        companyId: input.companyId,
        endpoint,
        err,
        method: "GET",
      });
      // Best-effort: convert can still proceed with RFQ remarks only.
      return { cardName: null, comments: null, numAtCard: null };
    }
  };

  return {
    getDraftHeaderFields,
    getDraftComments: async (input) => {
      const fields = await getDraftHeaderFields(input);
      return fields.comments;
    },

    applyPricesToPq: async (input) => {
      const { connection, session: slSession } = await withCompanySession(input.companyId);
      // Update real buyer PQ from RFQ commercial lines (not Drafts).
      const endpoint = `/PurchaseQuotations(${input.draftEntry})`;
      logSlRequest({
        companyId: input.companyId,
        endpoint,
        lineCount: input.documentLines.length,
        method: "GET+PATCH",
      });

      try {
        // GET existing PQ lines so replace-PATCH keeps tax/warehouse when RFQ omits them.
        const draftResponse = await client.request<Record<string, unknown>>({
          connection,
          endpoint,
          method: "GET",
          session: slSession,
        });
        const draft = draftResponse.data ?? {};
        const existingLines = Array.isArray(draft.DocumentLines)
          ? (draft.DocumentLines as Record<string, unknown>[])
          : [];
        const mergedLines = mergeDocumentLinesByLineNum(existingLines, input.documentLines);

        const body: Record<string, unknown> = {
          DocumentLines: mergedLines,
        };
        // Never wipe original PQ Comments — merge user text + IC chain.
        if (input.comments != null && String(input.comments).trim()) {
          const existingComments =
            draft.Comments === null || draft.Comments === undefined ? null : String(draft.Comments);
          body.Comments = clampSapDocumentComments(
            mergeUserAndIcRemarks(existingComments, String(input.comments).trim()),
          );
        }

        icLog.info(SCOPE, "IC SL apply prices to PQ lines", {
          check: "sl_apply_prices_lines",
          companyId: input.companyId,
          draftEntry: input.draftEntry,
          lines: mergedLines.map((line, index) => ({
            discountPercent: line.DiscountPercent ?? null,
            itemCode: line.ItemCode ?? null,
            lineNum: line.LineNum ?? index,
            quantity: line.Quantity ?? null,
            unitPrice: line.UnitPrice ?? null,
            vatGroup: line.VatGroup ?? null,
          })),
          outcome: "pass",
        });

        const response = await client.request({
          body,
          connection,
          endpoint,
          // Full merged lines — replace collection so qty/price/disc/tax stick.
          headers: { "B1S-ReplaceCollectionsOnPatch": "true" },
          method: "PATCH",
          session: slSession,
        });

        await apiLog.write({
          companyId: input.companyId,
          endpoint,
          method: "PATCH",
          requestJson: safeJson(body),
          responseJson: safeJson(response.data),
          statusCode: response.status,
        });
      } catch (err: unknown) {
        logSlFailure({
          companyId: input.companyId,
          endpoint,
          err,
          method: "PATCH",
        });
        const message = err instanceof Error ? err.message : String(err);
        try {
          await apiLog.write({
            companyId: input.companyId,
            endpoint,
            method: "PATCH",
            requestJson: safeJson({
              DocumentLines: input.documentLines,
              comments: input.comments ?? null,
              draftEntry: input.draftEntry,
            }),
            responseJson: safeJson({ error: message }),
            statusCode: null,
          });
        } catch {
          // api-log failure must not mask the SL error
        }
        throw err instanceof Error ? err : new Error(message);
      }
    },

    convertDraftToDocument: async (params) => {
      const { connection, session: slSession } = await withCompanySession(params.companyId);
      const getEndpoint = `/Drafts(${params.draftEntry})`;
      logSlRequest({
        companyId: params.companyId,
        endpoint: getEndpoint,
        method: "GET+POST",
      });

      try {
        const draftResponse = await client.request<Record<string, unknown>>({
          connection,
          endpoint: getEndpoint,
          method: "GET",
          session: slSession,
        });

        const draft = draftResponse.data ?? {};
        const {
          DocEntry: _docEntry,
          DocNum: _docNum,
          DocObjectCode: _docObjectCode,
          AbsoluteEntry: _absoluteEntry,
          DocumentStatus: _documentStatus,
          Cancelled: _cancelled,
          ...rest
        } = draft;

        // Preserve draft Comments; merge caller IC chain (never replace user text).
        if (params.comments != null && String(params.comments).trim()) {
          const existingComments =
            rest.Comments === null || rest.Comments === undefined ? null : String(rest.Comments);
          (rest as Record<string, unknown>).Comments = clampSapDocumentComments(
            mergeUserAndIcRemarks(existingComments, String(params.comments).trim()),
          );
        }

        // Merge RFQ commercial fields onto draft lines so posted PQ is never total 0
        // when draft still had zero prices / missing tax after a weak PATCH.
        if (params.lineOverrides && params.lineOverrides.length > 0) {
          (rest as Record<string, unknown>).DocumentLines = mergeDocumentLinesByLineNum(
            Array.isArray(rest.DocumentLines)
              ? (rest.DocumentLines as Record<string, unknown>[])
              : [],
            params.lineOverrides,
          );
          icLog.info(SCOPE, "IC SL legacy Drafts convert — merged RFQ commercial lines", {
            check: "sl_convert_merge_lines",
            companyId: params.companyId,
            draftEntry: params.draftEntry,
            lines: (params.lineOverrides ?? []).map((line, index) => ({
              discountPercent: line.DiscountPercent ?? null,
              itemCode: line.ItemCode ?? null,
              lineNum: line.LineNum ?? index,
              quantity: line.Quantity ?? null,
              unitPrice: line.UnitPrice ?? null,
              vatGroup: line.VatGroup ?? null,
            })),
            outcome: "pass",
          });
        }

        const postEndpoint = "/PurchaseQuotations";
        const response = await client.request<{ DocEntry?: number; DocNum?: number }>({
          body: rest as Record<string, unknown>,
          connection,
          endpoint: postEndpoint,
          method: "POST",
          session: slSession,
        });

        await apiLog.write({
          companyId: params.companyId,
          endpoint: postEndpoint,
          method: "POST",
          requestJson: safeJson({ fromDraft: params.draftEntry }),
          responseJson: safeJson(response.data),
          statusCode: response.status,
        });

        return parseDocResult(response.data);
      } catch (err: unknown) {
        logSlFailure({
          companyId: params.companyId,
          endpoint: getEndpoint,
          err,
          method: "POST",
        });
        const message = err instanceof Error ? err.message : String(err);
        try {
          await apiLog.write({
            companyId: params.companyId,
            endpoint: getEndpoint,
            method: "POST",
            requestJson: safeJson({ draftEntry: params.draftEntry }),
            responseJson: safeJson({ error: message }),
            statusCode: null,
          });
        } catch {
          // ignore
        }
        throw err instanceof Error ? err : new Error(message);
      }
    },

    getSalesQuotation: async (input) => {
      const { connection, session: slSession } = await withCompanySession(input.companyId);
      const docEntry = Math.trunc(Number(input.docEntry));
      if (!Number.isFinite(docEntry) || docEntry <= 0) {
        throw new Error("IC getSalesQuotation requires a positive DocEntry");
      }
      const endpoint = `/Quotations(${docEntry})`;
      logSlRequest({
        companyId: input.companyId,
        endpoint,
        method: "GET",
      });
      try {
        const response = await client.request<Record<string, unknown>>({
          connection,
          endpoint,
          method: "GET",
          session: slSession,
        });
        const data = response.data ?? {};
        const entry = Number(data.DocEntry ?? docEntry);
        const docNumRaw = data.DocNum;
        const docNum =
          docNumRaw === undefined || docNumRaw === null ? undefined : Number(docNumRaw);
        const cardCodeRaw = data.CardCode;
        const cardCode =
          cardCodeRaw === null || cardCodeRaw === undefined
            ? null
            : String(cardCodeRaw).trim() || null;
        const rawLines = Array.isArray(data.DocumentLines)
          ? (data.DocumentLines as Record<string, unknown>[])
          : [];
        const documentLines: IcSalesQuotationLine[] = rawLines.map((line, index) => {
          const lineNum = Number(line.LineNum);
          return {
            ItemCode: line.ItemCode == null ? null : String(line.ItemCode).trim() || null,
            LineNum: Number.isFinite(lineNum) ? Math.trunc(lineNum) : index,
            LineStatus: line.LineStatus == null ? null : String(line.LineStatus).trim() || null,
            Quantity:
              line.Quantity == null || !Number.isFinite(Number(line.Quantity))
                ? null
                : Number(line.Quantity),
            RemainingOpenQuantity:
              line.RemainingOpenQuantity == null ||
              !Number.isFinite(Number(line.RemainingOpenQuantity))
                ? null
                : Number(line.RemainingOpenQuantity),
          };
        });
        icLog.info(SCOPE, "IC SL sales quotation loaded for AR convert", {
          check: "sl_get_sales_quotation",
          companyId: input.companyId,
          databaseName: connection.databaseName,
          docEntry: entry,
          docNum: Number.isFinite(docNum) ? docNum : undefined,
          lineCount: documentLines.length,
          outcome: "pass",
        });
        return {
          cardCode,
          docEntry: Number.isFinite(entry) && entry > 0 ? Math.trunc(entry) : docEntry,
          docNum: Number.isFinite(docNum) ? docNum : undefined,
          documentLines,
        };
      } catch (err: unknown) {
        logSlFailure({
          companyId: input.companyId,
          endpoint,
          err,
          method: "GET",
        });
        throw err instanceof Error ? err : new Error(String(err));
      }
    },

    findSalesQuotationByDocNum: async (input) => {
      const { connection, session: slSession } = await withCompanySession(input.companyId);
      const docNum = Math.trunc(Number(input.docNum));
      if (!Number.isFinite(docNum) || docNum <= 0) {
        return null;
      }
      // Prefer exact DocNum match; top 1 (DocNum unique per series, may collide across series).
      const endpoint = `/Quotations?$filter=DocNum eq ${docNum}&$select=DocEntry,DocNum,CardCode&$top=1`;
      logSlRequest({
        companyId: input.companyId,
        endpoint,
        method: "GET",
      });
      try {
        const response = await client.request<{
          value?: Array<Record<string, unknown>>;
        }>({
          connection,
          endpoint,
          method: "GET",
          session: slSession,
        });
        const rows = Array.isArray(response.data?.value) ? response.data.value : [];
        const first = rows[0];
        const entry = Number(first?.DocEntry);
        if (!Number.isFinite(entry) || entry <= 0) {
          return null;
        }
        // Reuse full GET for DocumentLines (filter select is header-only).
        const full = await (async () => {
          const fullEndpoint = `/Quotations(${Math.trunc(entry)})`;
          const fullResponse = await client.request<Record<string, unknown>>({
            connection,
            endpoint: fullEndpoint,
            method: "GET",
            session: slSession,
          });
          return fullResponse.data ?? {};
        })();
        const rawLines = Array.isArray(full.DocumentLines)
          ? (full.DocumentLines as Record<string, unknown>[])
          : [];
        const documentLines: IcSalesQuotationLine[] = rawLines.map((line, index) => {
          const lineNum = Number(line.LineNum);
          return {
            ItemCode: line.ItemCode == null ? null : String(line.ItemCode).trim() || null,
            LineNum: Number.isFinite(lineNum) ? Math.trunc(lineNum) : index,
            LineStatus: line.LineStatus == null ? null : String(line.LineStatus).trim() || null,
            Quantity:
              line.Quantity == null || !Number.isFinite(Number(line.Quantity))
                ? null
                : Number(line.Quantity),
            RemainingOpenQuantity:
              line.RemainingOpenQuantity == null ||
              !Number.isFinite(Number(line.RemainingOpenQuantity))
                ? null
                : Number(line.RemainingOpenQuantity),
          };
        });
        const cardCodeRaw = full.CardCode ?? first?.CardCode;
        return {
          cardCode: cardCodeRaw == null ? null : String(cardCodeRaw).trim() || null,
          docEntry: Math.trunc(entry),
          docNum,
          documentLines,
        };
      } catch (err: unknown) {
        logSlFailure({
          companyId: input.companyId,
          endpoint,
          err,
          method: "GET",
        });
        return null;
      }
    },

    findSalesQuotationByIcChain: async (input) => {
      const cardCode = String(input.cardCode ?? "").trim();
      const tokens = (input.remarkTokens ?? [])
        .map((token) => String(token ?? "").trim())
        .filter((token) => token.length > 0);
      if (!cardCode || tokens.length === 0) {
        return null;
      }

      const escapeODataString = (value: string): string => value.replace(/'/g, "''");
      const cardEsc = escapeODataString(cardCode);
      const { connection, session: slSession } = await withCompanySession(input.companyId);

      const loadByEntry = async (docEntry: number): Promise<IcSalesQuotationSnapshot | null> => {
        try {
          const fullEndpoint = `/Quotations(${Math.trunc(docEntry)})`;
          const fullResponse = await client.request<Record<string, unknown>>({
            connection,
            endpoint: fullEndpoint,
            method: "GET",
            session: slSession,
          });
          const full = fullResponse.data ?? {};
          const entry = Number(full.DocEntry ?? docEntry);
          if (!Number.isFinite(entry) || entry <= 0) {
            return null;
          }
          const docNumRaw = full.DocNum;
          const docNum =
            docNumRaw === undefined || docNumRaw === null ? undefined : Number(docNumRaw);
          const rawLines = Array.isArray(full.DocumentLines)
            ? (full.DocumentLines as Record<string, unknown>[])
            : [];
          const documentLines: IcSalesQuotationLine[] = rawLines.map((line, index) => {
            const lineNum = Number(line.LineNum);
            return {
              ItemCode: line.ItemCode == null ? null : String(line.ItemCode).trim() || null,
              LineNum: Number.isFinite(lineNum) ? Math.trunc(lineNum) : index,
              LineStatus: line.LineStatus == null ? null : String(line.LineStatus).trim() || null,
              Quantity:
                line.Quantity == null || !Number.isFinite(Number(line.Quantity))
                  ? null
                  : Number(line.Quantity),
              RemainingOpenQuantity:
                line.RemainingOpenQuantity == null ||
                !Number.isFinite(Number(line.RemainingOpenQuantity))
                  ? null
                  : Number(line.RemainingOpenQuantity),
            };
          });
          const cardCodeRaw = full.CardCode;
          return {
            cardCode: cardCodeRaw == null ? null : String(cardCodeRaw).trim() || null,
            docEntry: Math.trunc(entry),
            docNum: Number.isFinite(docNum) ? docNum : undefined,
            documentLines,
          };
        } catch {
          return null;
        }
      };

      // Prefer contains (newer SL); fall back to substringof (older B1 OData).
      for (const token of tokens) {
        const tokenEsc = escapeODataString(token);
        const filterVariants = [
          `CardCode eq '${cardEsc}' and contains(Comments,'${tokenEsc}')`,
          `CardCode eq '${cardEsc}' and substringof('${tokenEsc}',Comments)`,
        ];
        for (const filter of filterVariants) {
          const endpoint = `/Quotations?$filter=${filter}&$select=DocEntry,DocNum,CardCode,Comments&$orderby=DocEntry desc&$top=10`;
          logSlRequest({
            companyId: input.companyId,
            endpoint,
            method: "GET",
          });
          try {
            const response = await client.request<{
              value?: Array<Record<string, unknown>>;
            }>({
              connection,
              endpoint,
              method: "GET",
              session: slSession,
            });
            const rows = Array.isArray(response.data?.value) ? response.data.value : [];
            const tokenLower = token.toLowerCase();
            for (const row of rows) {
              const comments = String(row.Comments ?? "").toLowerCase();
              if (comments && !comments.includes(tokenLower)) {
                continue;
              }
              const entry = Number(row.DocEntry);
              if (!Number.isFinite(entry) || entry <= 0) {
                continue;
              }
              const loaded = await loadByEntry(entry);
              if (loaded) {
                icLog.info(SCOPE, "IC SL sales quotation resolved via remarks chain", {
                  check: "sl_find_sq_by_ic_chain",
                  companyId: input.companyId,
                  docEntry: loaded.docEntry,
                  docNum: loaded.docNum ?? null,
                  outcome: "pass",
                  token,
                });
                return loaded;
              }
            }
          } catch (err: unknown) {
            // Variant may be unsupported on this SL version — try the next.
            logSlFailure({
              companyId: input.companyId,
              endpoint,
              err,
              method: "GET",
            });
          }
        }
      }

      return null;
    },

    createArInvoiceDraft: async (input) => {
      const { connection, session: slSession } = await withCompanySession(input.companyId);
      // A/R Invoice Draft (ODRF) — preferably based on seller SQ (BaseType 23).
      // Not a real posted invoice: human posts from draft in SAP / portal later.
      const endpoint = "/Drafts";
      const invoiceBody: Record<string, unknown> = {
        ...input.draftPayload,
        // SAP draft object type for A/R Invoice Draft (ODRF ObjType 13 / oInvoices).
        DocObjectCode: SAP_OBJECT_TYPE_AR_INVOICE,
      };
      // Do not stamp U_Origin on IC auto-created docs.
      delete invoiceBody.U_Origin;
      // SAP ODOC.Comments max 254 — clamp even if caller/retry payload is older/longer.
      if (invoiceBody.Comments != null) {
        invoiceBody.Comments = clampSapDocumentComments(String(invoiceBody.Comments));
      }
      const lines = Array.isArray(invoiceBody.DocumentLines)
        ? (invoiceBody.DocumentLines as Record<string, unknown>[])
        : [];
      const items = lines.map((line, index) => {
        const itemDescription = String(line.ItemDescription ?? line.Dscription ?? "").trim();
        const row: Record<string, unknown> = {
          baseEntry: line.BaseEntry,
          baseLine: line.BaseLine,
          baseType: line.BaseType,
          itemCode: String(line.ItemCode ?? "").trim(),
          lineNum: line.LineNum ?? index,
          quantity: line.Quantity,
          unitPrice: line.UnitPrice,
        };
        if (itemDescription) {
          row.itemDescription = itemDescription;
        }
        if (line.VatGroup != null && String(line.VatGroup).trim()) {
          row.vatGroup = line.VatGroup;
        }
        if (line.WarehouseCode != null && String(line.WarehouseCode).trim()) {
          row.warehouseCode = line.WarehouseCode;
        }
        return row;
      });
      logSlRequest({
        companyId: input.companyId,
        endpoint,
        lineCount: lines.length,
        method: "POST",
      });
      // Full body only (no parallel items dump — DocumentLines already in payload).
      icLog.info(SCOPE, "IC SL AR invoice draft request body", {
        check: "sl_create_ar_invoice_draft_request",
        companyId: input.companyId,
        databaseName: connection.databaseName,
        arInvoiceDraftPayload: invoiceBody,
        docObjectCode: invoiceBody.DocObjectCode ?? null,
        method: "POST",
        outcome: "pass",
      });

      try {
        const response = await client.request<{ DocEntry?: number; DocNum?: number }>({
          body: invoiceBody,
          connection,
          endpoint,
          method: "POST",
          session: slSession,
        });

        await apiLog.write({
          companyId: input.companyId,
          endpoint,
          method: "POST",
          requestJson: safeJson(invoiceBody),
          responseJson: safeJson(response.data),
          statusCode: response.status,
        });

        icLog.info(SCOPE, "IC SL AR invoice draft created", {
          check: "sl_create_ar_invoice_draft",
          companyId: input.companyId,
          databaseName: connection.databaseName,
          docEntry: response.data?.DocEntry,
          docNum: response.data?.DocNum,
          items,
          outcome: "pass",
        });

        return parseDocResult(response.data);
      } catch (err: unknown) {
        logSlFailure({
          companyId: input.companyId,
          endpoint,
          err,
          method: "POST",
        });
        const message = err instanceof Error ? err.message : String(err);
        try {
          await apiLog.write({
            companyId: input.companyId,
            endpoint,
            method: "POST",
            requestJson: safeJson(input.draftPayload),
            responseJson: safeJson({ error: message }),
            statusCode: null,
          });
        } catch {
          // api-log failure must not mask the SL error
        }
        throw err instanceof Error ? err : new Error(message);
      }
    },

    createSalesQuotation: async (input) => {
      const { connection, session: slSession } = await withCompanySession(input.companyId);
      const endpoint = "/Quotations";
      const remarksFull = clampSapDocumentComments(input.remarks?.trim() || "");
      // Prefer buyer vendor ref (parent NumAtCard). Never stuff full IC remarks into NumAtCard.
      const vendorRef = input.numAtCard != null ? String(input.numAtCard).trim() : "";
      const numAtCard = (vendorRef || "").slice(0, 100);
      const body: Record<string, unknown> = {
        CardCode: input.cardCode,
        Comments: remarksFull,
        DocumentLines: input.lines,
      };
      if (numAtCard) {
        body.NumAtCard = numAtCard;
      }
      // Multi-branch seller DBs: SAP requires active BPLId on OQUT (same field as AR/Invoice).
      const branchId = input.defaultBranchId;
      if (branchId != null && Number.isFinite(branchId) && branchId > 0) {
        body.BPL_IDAssignedToInvoice = Math.trunc(branchId);
      }
      // Align DocNum with SAP NNM1.NextNumber for the chosen series (branch-specific when set).
      const series = input.series != null ? Math.trunc(Number(input.series)) : null;
      if (series != null && Number.isFinite(series) && series > 0) {
        body.Series = series;
      }
      const lineSnap = Array.isArray(input.lines)
        ? input.lines.map((line, index) => {
            const row = line as Record<string, unknown>;
            return {
              itemCode: row.ItemCode ?? null,
              lineNum: index,
              quantity: row.Quantity ?? null,
              unitPrice: row.UnitPrice ?? null,
              uomCode: row.UoMCode ?? row.UomCode ?? null,
              uomEntry: row.UoMEntry ?? row.UomEntry ?? null,
              vatGroup: row.VatGroup ?? null,
              warehouseCode: row.WarehouseCode ?? null,
            };
          })
        : [];
      logSlRequest({
        companyId: input.companyId,
        endpoint,
        lineCount: lineSnap.length,
        method: "POST",
      });
      icLog.info(SCOPE, "IC SL sales quotation request body", {
        check: "sl_create_sq_request",
        companyId: input.companyId,
        databaseName: connection.databaseName,
        bplId: body.BPL_IDAssignedToInvoice ?? null,
        cardCode: input.cardCode,
        lines: lineSnap,
        numAtCard: body.NumAtCard ?? null,
        outcome: "pass",
        remarks: input.remarks,
        series: body.Series ?? null,
      });

      try {
        const response = await client.request<{ DocEntry?: number; DocNum?: number }>({
          body,
          connection,
          endpoint,
          method: "POST",
          session: slSession,
        });

        await apiLog.write({
          companyId: input.companyId,
          endpoint,
          method: "POST",
          requestJson: safeJson(body),
          responseJson: safeJson(response.data),
          statusCode: response.status,
        });

        icLog.info(SCOPE, "IC SL sales quotation created", {
          check: "sl_create_sq",
          companyId: input.companyId,
          docEntry: response.data?.DocEntry,
          docNum: response.data?.DocNum,
          outcome: "pass",
        });

        return parseDocResult(response.data);
      } catch (err: unknown) {
        logSlFailure({
          companyId: input.companyId,
          endpoint,
          err,
          method: "POST",
        });
        const message = err instanceof Error ? err.message : String(err);
        try {
          await apiLog.write({
            companyId: input.companyId,
            endpoint,
            method: "POST",
            requestJson: safeJson(body),
            responseJson: safeJson({ error: message }),
            statusCode: null,
          });
        } catch {
          // ignore
        }
        throw err instanceof Error ? err : new Error(message);
      }
    },
  };
};

export const icSlDocuments = createIcSlDocuments();
