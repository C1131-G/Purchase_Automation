// Connect → POST AR draft on target → save map → disconnect.

import { logger } from "@/core/logger/pino-logger";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SAPDocumentResponse } from "@/services/types/sap.types";

import {
  INTERCOMPANY_STATUS_CREATED,
  INTERCOMPANY_STATUS_FAILED,
  SAP_OBJECT_TYPE_AR_INVOICE,
  SAP_OBJECT_TYPE_PURCHASE_ORDER,
} from "./intercompany.constants";
import { upsertDocumentMap } from "./intercompany.document-map.mutations";
import type { IntercompanyMappingResolution, IntercompanySyncResult } from "./intercompany.types";

const logoutTargetSession = async (
  targetSessionId: string,
  targetDb: string,
  logCtx: Record<string, unknown>,
): Promise<void> => {
  logger.info({
    ...logCtx,
    step: "target_sl_logout",
    targetDb,
    targetSessionId,
    msg: "Logging out temporary target Service Layer session",
  });
  try {
    await serviceLayerClient.logout(targetSessionId);
    logger.info({
      ...logCtx,
      step: "target_sl_logout",
      outcome: "success",
      targetDb,
      msg: "Target Service Layer session logged out",
    });
  } catch (logoutErr: unknown) {
    logger.warn({
      ...logCtx,
      step: "target_sl_logout",
      outcome: "failure",
      err: logoutErr instanceof Error ? logoutErr : new Error(String(logoutErr)),
      targetDb,
      msg: "Logout failed; destroying local session",
    });
    serviceLayerClient.destroyLocalSession(targetSessionId, "Intercompany target session cleanup");
  }
};

const saveFailedMap = async (params: {
  mapping: IntercompanyMappingResolution;
  poDocEntry: number;
  poDocNum?: number;
  errorMessage: string;
  logCtx: Record<string, unknown>;
}): Promise<void> => {
  try {
    await upsertDocumentMap({
      sourceDb: params.mapping.sourceDb,
      sourceObjectType: SAP_OBJECT_TYPE_PURCHASE_ORDER,
      sourceDocEntry: params.poDocEntry,
      sourceDocNum: params.poDocNum ?? null,
      targetDb: params.mapping.targetDb,
      targetObjectType: SAP_OBJECT_TYPE_AR_INVOICE,
      targetDraftEntry: null,
      targetDraftNum: null,
      sourceVendorCode: params.mapping.sourceVendorCode,
      targetCustomerCode: params.mapping.targetCustomerCode,
      status: INTERCOMPANY_STATUS_FAILED,
      errorMessage: params.errorMessage,
    });
    logger.info({
      ...params.logCtx,
      step: "save_document_map",
      outcome: "success",
      status: INTERCOMPANY_STATUS_FAILED,
      msg: "FAILED intercompany document map row saved",
    });
  } catch (mapErr: unknown) {
    logger.error({
      ...params.logCtx,
      step: "save_document_map",
      outcome: "failure",
      err: mapErr instanceof Error ? mapErr : new Error(String(mapErr)),
      msg: "Failed to persist FAILED intercompany document map row",
    });
  }
};

/** Login to target, POST /Drafts, save CREATED/FAILED map, always logout. */
export const postTargetArInvoiceDraft = async (params: {
  mapping: IntercompanyMappingResolution;
  poDocEntry: number;
  poDocNum?: number;
  draftPayload: Record<string, unknown>;
  logCtx: Record<string, unknown>;
}): Promise<IntercompanySyncResult> => {
  const { mapping, poDocEntry, poDocNum, draftPayload, logCtx } = params;
  let targetSessionId: string | null = null;

  try {
    logger.info({
      ...logCtx,
      step: "target_sl_login",
      targetDb: mapping.targetDb,
      targetSlUsername: mapping.targetServiceLayerUsername,
      msg: "Logging in to target company Service Layer",
    });

    const login = await serviceLayerClient.login(
      mapping.targetDb,
      mapping.targetServiceLayerUsername,
      mapping.targetServiceLayerPassword,
    );
    targetSessionId = login.sessionId;

    logger.info({
      ...logCtx,
      step: "target_sl_login",
      outcome: "success",
      targetDb: mapping.targetDb,
      targetSessionId,
      msg: "Target company Service Layer login successful",
    });

    logger.info({
      ...logCtx,
      step: "post_ar_draft",
      targetDb: mapping.targetDb,
      endpoint: "/Drafts",
      cardCode: draftPayload.CardCode,
      bplId: draftPayload.BPL_IDAssignedToInvoice,
      msg: "Posting AR Invoice Draft to target company",
    });

    const draftResult = (await serviceLayerClient.request(
      targetSessionId,
      "POST",
      "/Drafts",
      draftPayload,
    )) as SAPDocumentResponse;

    logger.info({
      ...logCtx,
      step: "post_ar_draft",
      outcome: "success",
      targetDb: mapping.targetDb,
      targetDraftEntry: draftResult.DocEntry,
      targetDraftNum: draftResult.DocNum,
      msg: "AR Invoice Draft created in target company",
    });

    const saved = await upsertDocumentMap({
      sourceDb: mapping.sourceDb,
      sourceObjectType: SAP_OBJECT_TYPE_PURCHASE_ORDER,
      sourceDocEntry: poDocEntry,
      sourceDocNum: poDocNum ?? null,
      targetDb: mapping.targetDb,
      targetObjectType: SAP_OBJECT_TYPE_AR_INVOICE,
      targetDraftEntry: draftResult.DocEntry,
      targetDraftNum: draftResult.DocNum,
      sourceVendorCode: mapping.sourceVendorCode,
      targetCustomerCode: mapping.targetCustomerCode,
      status: INTERCOMPANY_STATUS_CREATED,
      errorMessage: null,
    });

    logger.info({
      ...logCtx,
      step: "complete",
      outcome: "success",
      status: INTERCOMPANY_STATUS_CREATED,
      targetDb: saved.targetDb,
      targetDraftEntry: saved.targetDraftEntry,
      msg: "Intercompany sync completed successfully",
    });

    return {
      created: true,
      status: INTERCOMPANY_STATUS_CREATED,
      sourceDb: saved.sourceDb,
      sourceDocEntry: saved.sourceDocEntry,
      sourceDocNum: saved.sourceDocNum ?? undefined,
      targetDb: saved.targetDb ?? undefined,
      targetDraftEntry: saved.targetDraftEntry ?? undefined,
      targetDraftNum: saved.targetDraftNum ?? undefined,
      sourceVendorCode: saved.sourceVendorCode ?? undefined,
      targetCustomerCode: saved.targetCustomerCode ?? undefined,
    };
  } catch (err: unknown) {
    const errorMessage = (err instanceof Error ? err.message : String(err)).slice(0, 2000);
    logger.error({
      ...logCtx,
      step: "target_draft_or_map",
      outcome: "failure",
      err: err instanceof Error ? err : new Error(String(err)),
      errorMessage,
      targetDb: mapping.targetDb,
      msg: "Intercompany AR invoice draft creation failed",
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
  } finally {
    if (targetSessionId) {
      await logoutTargetSession(targetSessionId, mapping.targetDb, logCtx);
    }
  }
};

export { saveFailedMap };
