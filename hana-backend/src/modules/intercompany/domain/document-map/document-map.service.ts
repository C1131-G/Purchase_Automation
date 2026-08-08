import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";

import { createDocumentMapMutations, type DocumentMapMutations } from "./document-map.mutations";
import { createDocumentMapQueries, type DocumentMapQueries } from "./document-map.queries";
import type { CreateDocumentMapInput, IcDocumentMap } from "./document-map.types";

export type DocumentMapService = {
  findBySource: (params: {
    sourceCompanyId: number;
    sourceObject: string;
    sourceDocEntry: string;
    targetObject?: string | null;
  }) => Promise<IcDocumentMap | null>;
  findByTarget: (params: {
    targetCompanyId: number;
    targetObject: string;
    targetDocEntry: string;
    sourceObject?: string | null;
  }) => Promise<IcDocumentMap | null>;
  create: (input: CreateDocumentMapInput) => Promise<IcDocumentMap>;
  updateStatus: (
    mappingId: number,
    status: string,
    patch?: {
      errorMessage?: string | null;
      targetDocEntry?: string | null;
      targetDocNum?: string | null;
      targetObject?: string | null;
    },
  ) => Promise<IcDocumentMap | null>;
};

/**
 * Idempotent create: if SUCCESS map already exists for source key, return it
 * without inserting a second SUCCESS row.
 */
export const createDocumentMapService = (deps?: {
  queries?: DocumentMapQueries;
  mutations?: DocumentMapMutations;
}): DocumentMapService => {
  const queries = deps?.queries ?? createDocumentMapQueries();
  const mutations = deps?.mutations ?? createDocumentMapMutations();

  return {
    findBySource: (params) => queries.findBySource(params),
    findByTarget: (params) => queries.findByTarget(params),

    create: async (input) => {
      const status = input.status ?? IC_DOC_MAP_STATUS.PENDING;
      const existing = await queries.findBySource({
        sourceCompanyId: input.sourceCompanyId,
        sourceDocEntry: input.sourceDocEntry,
        sourceObject: input.sourceObject,
        targetObject: input.targetObject ?? null,
      });

      if (existing && existing.status === IC_DOC_MAP_STATUS.SUCCESS) {
        return existing;
      }

      // Repair ERROR/PENDING → SUCCESS (or fill target) instead of a second shadow row.
      if (
        existing &&
        status === IC_DOC_MAP_STATUS.SUCCESS &&
        (existing.status === IC_DOC_MAP_STATUS.ERROR ||
          existing.status === IC_DOC_MAP_STATUS.PENDING)
      ) {
        const repaired = await mutations.updateStatus(existing.mappingId, status, {
          errorMessage: input.errorMessage ?? null,
          targetDocEntry: input.targetDocEntry ?? null,
          targetDocNum: input.targetDocNum ?? null,
          targetObject: input.targetObject ?? null,
        });
        if (repaired) {
          return repaired;
        }
      }

      if (existing && existing.status === status) {
        return existing;
      }

      return mutations.insert({
        ...input,
        status,
      });
    },

    updateStatus: (mappingId, status, patch) => mutations.updateStatus(mappingId, status, patch),
  };
};

export const documentMapService = createDocumentMapService();
