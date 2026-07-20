import type { Repository } from "typeorm";

import { logger } from "@/core/logger/pino-logger";
import { AppDataSource } from "@/db/config/data-source";
import {
  IntercompanyDocumentMapSchema,
  type IntercompanyDocumentMap,
} from "@/db/schemas/intercompany-document-map.schema";

import { SAP_OBJECT_TYPE_PURCHASE_ORDER } from "./intercompany.constants";

const LOG_SCOPE = "intercompany.sync";

let documentMapRepository: Repository<IntercompanyDocumentMap> | null = null;

export const getDocumentMapRepository = (): Repository<IntercompanyDocumentMap> => {
  if (!documentMapRepository) {
    documentMapRepository = AppDataSource.getRepository(IntercompanyDocumentMapSchema);
  }
  return documentMapRepository;
};

/** Test-only: clear lazy repository cache. */
export const __resetDocumentMapRepositoryForTests = (): void => {
  documentMapRepository = null;
};

export const findDocumentMapBySource = async (params: {
  sourceDb: string;
  sourceObjectType?: string;
  sourceDocEntry: number;
}): Promise<IntercompanyDocumentMap | null> => {
  const sourceObjectType = params.sourceObjectType ?? SAP_OBJECT_TYPE_PURCHASE_ORDER;
  const repository = getDocumentMapRepository();

  logger.info({
    scope: LOG_SCOPE,
    step: "map_lookup",
    sourceDb: params.sourceDb,
    sourceObjectType,
    sourceDocEntry: params.sourceDocEntry,
    msg: "Looking up INTERCOMPANY_DOCUMENT_MAP by source key",
  });

  const row = await repository.findOne({
    where: {
      sourceDb: params.sourceDb,
      sourceObjectType,
      sourceDocEntry: params.sourceDocEntry,
    },
  });

  logger.info({
    scope: LOG_SCOPE,
    step: "map_lookup",
    outcome: row ? "found" : "not_found",
    sourceDb: params.sourceDb,
    sourceDocEntry: params.sourceDocEntry,
    status: row?.status,
    targetDraftEntry: row?.targetDraftEntry,
    msg: row
      ? "Found existing INTERCOMPANY_DOCUMENT_MAP row"
      : "No INTERCOMPANY_DOCUMENT_MAP row for source key",
  });

  return row;
};
