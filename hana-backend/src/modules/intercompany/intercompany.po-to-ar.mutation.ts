// Orchestrates PO → partner AR Invoice Draft after a successful non-draft PO create.

import { logger } from "@/core/logger/pino-logger";
import type { IntercompanyDocumentMap } from "@/db/schemas/intercompany-document-map.schema";

import { resolvePoToArInvoiceMapping } from "./intercompany.company.queries";
import {
  INTERCOMPANY_STATUS_CREATED,
  INTERCOMPANY_STATUS_FAILED,
  SAP_OBJECT_TYPE_PURCHASE_ORDER,
} from "./intercompany.constants";
import { findDocumentMapBySource } from "./intercompany.document-map.queries";
import { transformPoToArInvoiceDraft } from "./intercompany.draft-build";
import {
  formatPreflightErrorMessage,
  preflightTargetArDraft,
} from "./intercompany.draft-preflight";
import { normalizeDraftDocumentLines } from "./intercompany.draft-tax-uom";
import { postTargetArInvoiceDraft, saveFailedMap } from "./intercompany.po-to-ar-post.mutation";
import type { IntercompanySyncResult, PoDocumentInput } from "./intercompany.types";

const LOG_SCOPE = "intercompany.sync";

const mapExistingToResult = (existing: IntercompanyDocumentMap): IntercompanySyncResult => ({
  created: existing.status === INTERCOMPANY_STATUS_CREATED,
  existingMapping: true,
  skipped: true,
  reason:
    existing.status === INTERCOMPANY_STATUS_CREATED
      ? "Intercompany draft already mapped for this source PO"
      : "Intercompany mapping already recorded for this source PO",
  status: existing.status,
  sourceDb: existing.sourceDb,
  sourceDocEntry: existing.sourceDocEntry,
  sourceDocNum: existing.sourceDocNum ?? undefined,
  targetDb: existing.targetDb ?? undefined,
  targetDraftEntry: existing.targetDraftEntry ?? undefined,
  targetDraftNum: existing.targetDraftNum ?? undefined,
  sourceVendorCode: existing.sourceVendorCode ?? undefined,
  targetCustomerCode: existing.targetCustomerCode ?? undefined,
  errorMessage: existing.errorMessage ?? undefined,
});

/**
 * Sync a created (non-draft) Purchase Order to a partner-company A/R Invoice Draft.
 * Never throws: PO creation must remain successful when intercompany fails.
 */
export const syncPurchaseOrderToArInvoiceDraft = async (params: {
  sourceDb: string;
  poDocEntry: number;
  poDocNum?: number;
  poPayload: PoDocumentInput;
}): Promise<IntercompanySyncResult> => {
  const sourceDb = String(params.sourceDb ?? "").trim();
  const poDocEntry = Number(params.poDocEntry);
  const poDocNum = params.poDocNum;
  const sourceVendorCode = String(params.poPayload?.CardCode ?? "").trim();
  const lineCount = Array.isArray(params.poPayload?.DocumentLines)
    ? params.poPayload.DocumentLines.length
    : 0;

  const logCtx = {
    scope: LOG_SCOPE,
    sourceDb,
    sourceDocEntry: poDocEntry,
    sourceDocNum: poDocNum,
    sourceVendorCode,
    lineCount,
  };

  logger.info({
    ...logCtx,
    step: "start",
    msg: "Intercompany sync started (PO → AR Invoice Draft)",
  });

  if (!sourceDb || !Number.isFinite(poDocEntry) || poDocEntry <= 0) {
    return {
      created: false,
      skipped: true,
      reason: "Missing source database or PO DocEntry for intercompany sync",
    };
  }
  if (!sourceVendorCode) {
    return {
      created: false,
      skipped: true,
      reason: "Missing PO CardCode for intercompany sync",
    };
  }

  try {
    const existing = await findDocumentMapBySource({
      sourceDb,
      sourceObjectType: SAP_OBJECT_TYPE_PURCHASE_ORDER,
      sourceDocEntry: poDocEntry,
    });
    if (existing) {
      logger.info({
        ...logCtx,
        step: "idempotency_hit",
        status: existing.status,
        msg: "Intercompany mapping already exists; skipping draft creation",
      });
      return mapExistingToResult(existing);
    }

    const mapping = await resolvePoToArInvoiceMapping({ sourceDb, sourceVendorCode });
    if (!mapping) {
      logger.info({
        ...logCtx,
        step: "mapping_resolve",
        outcome: "skipped",
        msg: "Intercompany sync skipped: source vendor match or target company not resolved",
      });
      return {
        created: false,
        skipped: true,
        reason:
          "PO vendor is not the source intercompany vendor, or no other target company is configured",
        sourceDb,
        sourceDocEntry: poDocEntry,
        sourceDocNum: poDocNum,
        sourceVendorCode,
      };
    }

    logger.info({
      ...logCtx,
      step: "mapping_resolve",
      outcome: "success",
      targetDb: mapping.targetDb,
      targetCustomerCode: mapping.targetCustomerCode,
      msg: "Intercompany mapping resolved",
    });

    const draftPayload = transformPoToArInvoiceDraft({
      poPayload: params.poPayload,
      sourceDb: mapping.sourceDb,
      poDocEntry,
      targetCustomerCode: mapping.targetCustomerCode,
    });

    const rawLines = Array.isArray(draftPayload.DocumentLines)
      ? (draftPayload.DocumentLines as Record<string, unknown>[])
      : [];

    const normalizedLines = await normalizeDraftDocumentLines({
      sourceDb: mapping.sourceDb,
      targetDb: mapping.targetDb,
      lines: rawLines,
    });
    draftPayload.DocumentLines = normalizedLines;

    logger.info({
      ...logCtx,
      step: "normalize_lines",
      outcome: "success",
      targetDb: mapping.targetDb,
      bplIdAssignedToInvoice: draftPayload.BPL_IDAssignedToInvoice,
      lines: normalizedLines.map((line, lineIndex) => ({
        lineIndex,
        ItemCode: line.ItemCode,
        WarehouseCode: line.WarehouseCode,
        VatGroup: line.VatGroup,
        UoMCode: line.UoMCode,
        UoMEntry: line.UoMEntry,
      })),
      msg: "Normalized AR draft lines for target company (tax + UoM)",
    });

    const preflight = await preflightTargetArDraft({
      targetDb: mapping.targetDb,
      customerCode: mapping.targetCustomerCode,
      lines: normalizedLines,
    });

    if (!preflight.passed) {
      const errorMessage = formatPreflightErrorMessage(preflight.missing);
      logger.error({
        ...logCtx,
        step: "preflight",
        outcome: "failure",
        missing: preflight.missing,
        errorMessage,
        msg: "Intercompany preflight failed; skipping /Drafts",
      });
      await saveFailedMap({
        mapping,
        poDocEntry,
        poDocNum,
        errorMessage,
        logCtx,
      });
      return {
        created: false,
        status: INTERCOMPANY_STATUS_FAILED,
        sourceDb: mapping.sourceDb,
        sourceDocEntry: poDocEntry,
        sourceDocNum: poDocNum,
        targetDb: mapping.targetDb,
        sourceVendorCode: mapping.sourceVendorCode,
        targetCustomerCode: mapping.targetCustomerCode,
        errorMessage,
      };
    }

    logger.info({
      ...logCtx,
      step: "preflight",
      outcome: "success",
      targetDb: mapping.targetDb,
      msg: "Intercompany preflight passed; proceeding to target SL login",
    });

    return postTargetArInvoiceDraft({
      mapping,
      poDocEntry,
      poDocNum,
      draftPayload,
      logCtx,
    });
  } catch (err: unknown) {
    const errorMessage = (err instanceof Error ? err.message : String(err)).slice(0, 2000);
    logger.error({
      ...logCtx,
      step: "complete",
      outcome: "failure",
      err: err instanceof Error ? err : new Error(String(err)),
      errorMessage,
      msg: "Intercompany sync unexpected failure; PO remains created",
    });
    return {
      created: false,
      status: INTERCOMPANY_STATUS_FAILED,
      sourceDb,
      sourceDocEntry: poDocEntry,
      sourceDocNum: poDocNum,
      sourceVendorCode,
      errorMessage,
    };
  }
};
