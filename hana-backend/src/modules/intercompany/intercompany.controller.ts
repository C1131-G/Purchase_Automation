// Intercompany controller: entry used by document create flows (not HTTP routes in Phase 1).

import { logger } from "@/core/logger/pino-logger";

import { intercompanyService } from "./intercompany.service";
import type { IntercompanySyncResult, PoDocumentInput } from "./intercompany.types";

/**
 * After a real (non-draft) Purchase Order is created, run PO → AR Invoice Draft sync.
 * Safe to call from PO create: never throws for intercompany failures.
 */
export const syncAfterPurchaseOrderCreate = async (params: {
  sourceDb: string;
  poDocEntry: number;
  poDocNum?: number;
  poPayload: PoDocumentInput;
}): Promise<IntercompanySyncResult> => {
  logger.info({
    scope: "intercompany.sync",
    step: "controller_sync_after_po",
    sourceDb: params.sourceDb,
    sourceDocEntry: params.poDocEntry,
    sourceDocNum: params.poDocNum,
    sourceVendorCode: params.poPayload?.CardCode,
    msg: "Controller starting intercompany sync after PO create",
  });

  const result = await intercompanyService.syncPurchaseOrderToArInvoiceDraft(params);

  logger.info({
    scope: "intercompany.sync",
    step: "controller_sync_after_po_result",
    sourceDb: params.sourceDb,
    sourceDocEntry: params.poDocEntry,
    intercompanyCreated: result.created,
    intercompanySkipped: result.skipped,
    intercompanyStatus: result.status,
    targetDb: result.targetDb,
    targetDraftEntry: result.targetDraftEntry,
    errorMessage: result.errorMessage,
    msg: result.created
      ? "Controller intercompany sync finished (success)"
      : result.status === "FAILED"
        ? "Controller intercompany sync finished (failure; PO kept)"
        : "Controller intercompany sync finished (skipped)",
  });

  return result;
};

export const intercompanyController = {
  syncAfterPurchaseOrderCreate,
};
