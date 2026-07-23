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

export type IcSlDocuments = {
  createArInvoiceDraft: (input: CreateArInvoiceDraftInput) => Promise<IcSlDocumentResult>;
  createSalesQuotation: (input: CreateSalesQuotationInput) => Promise<IcSlDocumentResult>;
  convertDraftToDocument: (params: {
    companyId: number;
    draftEntry: number;
  }) => Promise<IcSlDocumentResult>;
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

  return {
    createArInvoiceDraft: async (input) => {
      const target = await resolveSlTarget.resolve(input.companyId);
      if (!target) {
        throw new Error(`No active IC_SAP_CONNECTION for companyId=${input.companyId}`);
      }

      const slSession = await session.getOrLogin(target.connection);
      const endpoint = "/Drafts";

      try {
        const response = await client.request<{ DocEntry?: number; DocNum?: number }>({
          body: input.draftPayload,
          connection: target.connection,
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

        const docEntry = Number(response.data?.DocEntry);
        if (!Number.isFinite(docEntry) || docEntry <= 0) {
          throw new Error("IC SL createArInvoiceDraft: missing DocEntry in response");
        }

        const docNumRaw = response.data?.DocNum;
        const docNum =
          docNumRaw === undefined || docNumRaw === null ? undefined : Number(docNumRaw);

        return {
          docEntry,
          docNum: Number.isFinite(docNum) ? docNum : undefined,
        };
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

    createSalesQuotation: async (_input) => {
      throw new Error("Not implemented: createSalesQuotation (P6)");
    },

    convertDraftToDocument: async (_params) => {
      throw new Error("Not implemented: convertDraftToDocument (P6)");
    },
  };
};

export const icSlDocuments = createIcSlDocuments();
