import AppError from "@/core/errors/app-error";
import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { IcRfqHeader, IcRfqLine } from "@/modules/intercompany/domain/rfq/rfq.types";
import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createIcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

import { applyPricesToPq, buildRfqCommercialSqDocumentLines } from "./apply-prices-to-pq";

export type ReapplyRfqCommercialService = {
  reapply: (params: { header: IcRfqHeader; lines: IcRfqLine[] }) => Promise<void>;
};

export const createReapplyRfqCommercialService = (deps?: {
  documentMap?: DocumentMapService;
  documents?: IcSlDocuments;
}): ReapplyRfqCommercialService => {
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const documents = deps?.documents ?? createIcSlDocuments();

  return {
    reapply: async ({ header, lines }) => {
      try {
        await applyPricesToPq({
          buyerCompanyId: header.sourceCompanyId,
          documents,
          draftEntry: header.pqDraftDocEntry,
          lines,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new AppError(
          `Could not update purchase quotation from RFQ: ${message.slice(0, 500)}`,
          502,
          "IC_RFQ_REAPPLY_FAILED",
        );
      }

      const sqMap = await documentMap.findBySource({
        sourceCompanyId: header.sourceCompanyId,
        sourceDocEntry: String(header.rfqId),
        sourceObject: IC_OBJECT.RFQ,
        targetObject: IC_OBJECT.SQ,
      });
      if (sqMap?.status !== IC_DOC_MAP_STATUS.SUCCESS) {
        throw new AppError(
          "RFQ convert is missing a seller sales quotation — cannot re-apply commercials",
          409,
          "IC_RFQ_SQ_MAP_MISSING",
        );
      }
      const sqDocEntry = Number(sqMap.targetDocEntry);
      if (!Number.isFinite(sqDocEntry) || sqDocEntry <= 0) {
        throw new AppError(
          "Seller sales quotation mapping has no DocEntry",
          409,
          "IC_RFQ_SQ_MAP_MISSING",
        );
      }

      try {
        await documents.applyPricesToSq({
          companyId: header.targetCompanyId,
          docEntry: sqDocEntry,
          documentLines: buildRfqCommercialSqDocumentLines(lines),
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new AppError(
          `Could not update sales quotation from RFQ: ${message.slice(0, 500)}`,
          502,
          "IC_RFQ_REAPPLY_FAILED",
        );
      }
    },
  };
};
