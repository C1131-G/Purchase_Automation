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

    create: async (input) => {
      const existing = await queries.findBySource({
        sourceCompanyId: input.sourceCompanyId,
        sourceDocEntry: input.sourceDocEntry,
        sourceObject: input.sourceObject,
        targetObject: input.targetObject ?? null,
      });

      if (existing && existing.status === IC_DOC_MAP_STATUS.SUCCESS) {
        return existing;
      }

      if (existing && existing.status === (input.status ?? "PENDING")) {
        return existing;
      }

      return mutations.insert({
        ...input,
        status: input.status ?? IC_DOC_MAP_STATUS.PENDING,
      });
    },

    updateStatus: (mappingId, status, patch) => mutations.updateStatus(mappingId, status, patch),
  };
};

export const documentMapService = createDocumentMapService();
