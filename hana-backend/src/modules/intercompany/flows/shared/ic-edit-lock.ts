import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { IC_DOC_MAP_STATUS, IC_RFQ_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";

export type IcEditLock = { locked: boolean; reason?: string };

export const createIcEditLocks = (deps?: {
  documentMap?: DocumentMapService;
  rfq?: RfqService;
}) => {
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const rfq = deps?.rfq ?? createRfqService();

  return {
    checkPqEditLock: async (buyerCompanyId: number, pqDocEntry: number): Promise<IcEditLock> => {
      const poMap = await documentMap.findBySource({
        sourceCompanyId: buyerCompanyId,
        sourceDocEntry: String(pqDocEntry),
        sourceObject: IC_OBJECT.PQ,
        targetObject: IC_OBJECT.PO,
      });
      if (poMap?.status === IC_DOC_MAP_STATUS.SUCCESS) {
        return { locked: true, reason: "PQ already copied to PO" };
      }
      const existingRfq = await rfq.findBySourceDraft(buyerCompanyId, pqDocEntry);
      if (
        existingRfq?.status === IC_RFQ_STATUS.SUBMITTED ||
        existingRfq?.status === IC_RFQ_STATUS.COMPLETED
      ) {
        return { locked: true, reason: `RFQ is ${existingRfq.status}` };
      }
      return { locked: false };
    },
    checkPoEditLock: async (buyerCompanyId: number, poDocEntry: number): Promise<IcEditLock> => {
      const map = await documentMap.findBySource({
        sourceCompanyId: buyerCompanyId,
        sourceDocEntry: String(poDocEntry),
        sourceObject: IC_OBJECT.PO,
        targetObject: IC_OBJECT.AR_INVOICE,
      });
      return map?.status === IC_DOC_MAP_STATUS.SUCCESS
        ? { locked: true, reason: "A/R invoice has been posted" }
        : { locked: false };
    },
  };
};

export const icEditLocks = createIcEditLocks();
