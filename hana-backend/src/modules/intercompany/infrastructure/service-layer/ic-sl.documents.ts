/**
 * Partner SAP document helpers via IC Service Layer.
 */

import type { ApiLogService } from "@/modules/intercompany/infrastructure/api-log/api-log.service";
import { createApiLogService } from "@/modules/intercompany/infrastructure/api-log/api-log.service";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import type { ResolveSlTargetService } from "@/modules/intercompany/routing/resolve-sl-target/resolve-sl-target.service";
import { createResolveSlTargetService } from "@/modules/intercompany/routing/resolve-sl-target/resolve-sl-target.service";

import { createIcSlClient, type IcSlClient } from "./ic-sl.client";
import { createIcSlSessionService, type IcSlSessionService } from "./ic-sl.session";

const SCOPE = IC_LOG_SCOPE.SL;

export type CreateArInvoiceDraftInput = {
  companyId: number;
  /** Full Service Layer Drafts body (DocObjectCode 13, CardCode, lines, …). */
  draftPayload: Record<string, unknown>;
};

export type CreateSalesQuotationInput = {
  companyId: number;
  cardCode: string;
  lines: unknown[];
  remarks?: string;
};

export type ApplyPricesToDraftInput = {
  companyId: number;
  draftEntry: number;
  documentLines: Record<string, unknown>[];
  /** Optional Comments patch (appended IC chain — does not wipe lines if caller merged). */
  comments?: string | null;
};

export type ConvertDraftToDocumentInput = {
  companyId: number;
  draftEntry: number;
  /** Optional full Comments to set on posted PQ (caller should merge existing + IC links). */
  comments?: string | null;
  /**
   * RFQ commercial line fields merged onto draft DocumentLines by LineNum before POST.
   * Ensures posted PQ keeps quoted qty / price / disc% / tax even if draft PATCH was partial.
   */
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

  const commercialKeys = [
    "Quantity",
    "RequiredQuantity",
    "UnitPrice",
    "DiscountPercent",
    "VatGroup",
    "ShipDate",
    "ReqDate",
    "ItemDescription",
    "WarehouseCode",
    "UoMCode",
    "UseBaseUnit",
    "ItemCode",
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

export type IcSlDocuments = {
  createArInvoiceDraft: (input: CreateArInvoiceDraftInput) => Promise<IcSlDocumentResult>;
  createSalesQuotation: (input: CreateSalesQuotationInput) => Promise<IcSlDocumentResult>;
  convertDraftToDocument: (params: ConvertDraftToDocumentInput) => Promise<IcSlDocumentResult>;
  applyPricesToDraft: (input: ApplyPricesToDraftInput) => Promise<void>;
};

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

  return {
    applyPricesToDraft: async (input) => {
      const { connection, session: slSession } = await withCompanySession(input.companyId);
      const endpoint = `/Drafts(${input.draftEntry})`;
      logSlRequest({
        companyId: input.companyId,
        endpoint,
        lineCount: input.documentLines.length,
        method: "GET+PATCH",
      });

      try {
        // GET existing draft lines so replace-PATCH keeps tax/warehouse when RFQ omits them.
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

        const body: Record<string, unknown> = { DocumentLines: mergedLines };
        if (input.comments != null && String(input.comments).trim()) {
          body.Comments = String(input.comments).trim();
        }

        icLog.info(SCOPE, "IC SL apply prices to draft lines", {
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

        // Preserve draft Comments unless caller provided merged IC chain.
        if (params.comments != null && String(params.comments).trim()) {
          (rest as Record<string, unknown>).Comments = String(params.comments).trim();
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
          icLog.info(SCOPE, "IC SL convert draft — merged RFQ commercial lines", {
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
          body: rest,
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

        try {
          await client.request({
            connection,
            endpoint: getEndpoint,
            method: "DELETE",
            session: slSession,
          });
        } catch {
          // draft cleanup is best-effort
        }

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

    createArInvoiceDraft: async (input) => {
      const { connection, session: slSession } = await withCompanySession(input.companyId);
      const endpoint = "/Drafts";
      const lines = Array.isArray(input.draftPayload.DocumentLines)
        ? (input.draftPayload.DocumentLines as Record<string, unknown>[])
        : [];
      const items = lines.map((line, index) => ({
        itemCode: String(line.ItemCode ?? "").trim(),
        itemDescription: String(line.ItemDescription ?? line.Dscription ?? "").trim() || null,
        lineNum: line.LineNum ?? index,
        quantity: line.Quantity ?? null,
        unitPrice: line.UnitPrice ?? null,
        vatGroup: line.VatGroup ?? null,
        warehouseCode: line.WarehouseCode ?? null,
      }));
      logSlRequest({
        companyId: input.companyId,
        endpoint,
        lineCount: lines.length,
        method: "POST",
      });
      icLog.info(SCOPE, "IC SL AR draft request body", {
        check: "sl_create_ar_draft_request",
        companyId: input.companyId,
        databaseName: connection.databaseName,
        draftPayload: input.draftPayload,
        items,
        method: "POST",
        outcome: "pass",
      });

      try {
        const response = await client.request<{ DocEntry?: number; DocNum?: number }>({
          body: input.draftPayload,
          connection,
          endpoint,
          method: "POST",
          session: slSession,
        });

        await apiLog.write({
          companyId: input.companyId,
          endpoint,
          method: "POST",
          requestJson: safeJson(input.draftPayload),
          responseJson: safeJson(response.data),
          statusCode: response.status,
        });

        icLog.info(SCOPE, "IC SL AR draft created", {
          check: "sl_create_ar_draft",
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
      const remarksFull = input.remarks?.trim() || "";
      // NumAtCard is short (often ≤100); keep compact first IC line or full if short.
      const numAtCard =
        remarksFull
          .split("\n")
          .map((line) => line.trim())
          .find((line) => line.startsWith("IC |"))
          ?.slice(0, 100) || remarksFull.slice(0, 100);
      const body = {
        CardCode: input.cardCode,
        Comments: remarksFull,
        DocumentLines: input.lines,
        NumAtCard: numAtCard || undefined,
      };
      const lineSnap = Array.isArray(input.lines)
        ? input.lines.map((line, index) => {
            const row = line as Record<string, unknown>;
            return {
              itemCode: row.ItemCode ?? null,
              lineNum: index,
              quantity: row.Quantity ?? null,
              unitPrice: row.UnitPrice ?? null,
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
        cardCode: input.cardCode,
        lines: lineSnap,
        outcome: "pass",
        remarks: input.remarks,
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
