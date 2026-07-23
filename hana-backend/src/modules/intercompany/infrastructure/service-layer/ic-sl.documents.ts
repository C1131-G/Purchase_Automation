/**
 * Partner SAP document helpers via IC Service Layer.
 */

import type { ApiLogService } from "@/modules/intercompany/infrastructure/api-log/api-log.service";
import { createApiLogService } from "@/modules/intercompany/infrastructure/api-log/api-log.service";
import type { ResolveSlTargetService } from "@/modules/intercompany/routing/resolve-sl-target/resolve-sl-target.service";
import { createResolveSlTargetService } from "@/modules/intercompany/routing/resolve-sl-target/resolve-sl-target.service";

import { createIcSlClient, type IcSlClient } from "./ic-sl.client";
import { createIcSlSessionService, type IcSlSessionService } from "./ic-sl.session";

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
  convertDraftToDocument: (params: {
    companyId: number;
    draftEntry: number;
  }) => Promise<IcSlDocumentResult>;
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
      throw new Error(`No active IC_SAP_CONNECTION for companyId=${companyId}`);
    }
    const slSession = await session.getOrLogin(target.connection);
    return { connection: target.connection, session: slSession };
  };

  return {
    applyPricesToDraft: async (input) => {
      const { connection, session: slSession } = await withCompanySession(input.companyId);
      const endpoint = `/Drafts(${input.draftEntry})`;
      const body = { DocumentLines: input.documentLines };

      try {
        const response = await client.request({
          body,
          connection,
          endpoint,
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
        const message = err instanceof Error ? err.message : String(err);
        try {
          await apiLog.write({
            companyId: input.companyId,
            endpoint,
            method: "PATCH",
            requestJson: safeJson(body),
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

        return parseDocResult(response.data);
      } catch (err: unknown) {
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
      const body = {
        CardCode: input.cardCode,
        Comments: input.remarks,
        DocumentLines: input.lines,
        NumAtCard: input.remarks,
      };

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

        return parseDocResult(response.data);
      } catch (err: unknown) {
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
