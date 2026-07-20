import { logger } from "@/core/logger/pino-logger";
import type {
  IntercompanyDocumentMap,
  IntercompanyMapStatus,
} from "@/db/schemas/intercompany-document-map.schema";

import {
  SAP_OBJECT_TYPE_AR_INVOICE,
  SAP_OBJECT_TYPE_PURCHASE_ORDER,
} from "./intercompany.constants";
import { getDocumentMapRepository } from "./intercompany.document-map.queries";

const LOG_SCOPE = "intercompany.sync";

export interface UpsertDocumentMapInput {
  sourceDb: string;
  sourceObjectType?: string;
  sourceDocEntry: number;
  sourceDocNum?: number | null;
  targetDb?: string | null;
  targetObjectType?: string | null;
  targetDraftEntry?: number | null;
  targetDraftNum?: number | null;
  sourceVendorCode?: string | null;
  targetCustomerCode?: string | null;
  status: IntercompanyMapStatus;
  errorMessage?: string | null;
}

export const upsertDocumentMap = async (
  input: UpsertDocumentMapInput,
): Promise<IntercompanyDocumentMap> => {
  const repository = getDocumentMapRepository();
  const row: IntercompanyDocumentMap = {
    sourceDb: input.sourceDb,
    sourceObjectType: input.sourceObjectType ?? SAP_OBJECT_TYPE_PURCHASE_ORDER,
    sourceDocEntry: input.sourceDocEntry,
    sourceDocNum: input.sourceDocNum ?? null,
    targetDb: input.targetDb ?? null,
    targetObjectType: input.targetObjectType ?? SAP_OBJECT_TYPE_AR_INVOICE,
    targetDraftEntry: input.targetDraftEntry ?? null,
    targetDraftNum: input.targetDraftNum ?? null,
    sourceVendorCode: input.sourceVendorCode ?? null,
    targetCustomerCode: input.targetCustomerCode ?? null,
    status: input.status,
    errorMessage: input.errorMessage ?? null,
  };

  logger.info({
    scope: LOG_SCOPE,
    step: "map_upsert",
    sourceDb: row.sourceDb,
    sourceDocEntry: row.sourceDocEntry,
    targetDb: row.targetDb,
    status: row.status,
    targetDraftEntry: row.targetDraftEntry,
    errorMessage: row.errorMessage,
    msg: "Upserting INTERCOMPANY_DOCUMENT_MAP row",
  });

  try {
    await repository.save(row);
    logger.info({
      scope: LOG_SCOPE,
      step: "map_upsert",
      outcome: "success",
      sourceDb: row.sourceDb,
      sourceDocEntry: row.sourceDocEntry,
      status: row.status,
      msg: "INTERCOMPANY_DOCUMENT_MAP row saved",
    });
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      scope: LOG_SCOPE,
      step: "map_upsert",
      outcome: "failure",
      err: caughtError,
      sourceDb: row.sourceDb,
      sourceDocEntry: row.sourceDocEntry,
      status: row.status,
      msg: "Failed to save INTERCOMPANY_DOCUMENT_MAP row",
    });
    throw caughtError;
  }

  return row;
};
