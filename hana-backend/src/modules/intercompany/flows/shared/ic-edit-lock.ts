import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import type { IcRfqHeader } from "@/modules/intercompany/domain/rfq/rfq.types";
import { IC_DOC_MAP_STATUS, IC_RFQ_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";

export type IcEditLock = { locked: boolean; reason?: string };

export const createIcEditLocks = (deps?: {
  documentMap?: DocumentMapService;
  rfq?: RfqService;
}) => {
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const rfq = deps?.rfq ?? createRfqService();

  const isPqCopiedToPo = async (buyerCompanyId: number, pqDocEntry: number): Promise<boolean> => {
    const poMap = await documentMap.findBySource({
      sourceCompanyId: buyerCompanyId,
      sourceDocEntry: String(pqDocEntry),
      sourceObject: IC_OBJECT.PQ,
      targetObject: IC_OBJECT.PO,
    });
    return poMap?.status === IC_DOC_MAP_STATUS.SUCCESS;
  };

  return {
    isPqCopiedToPo,
    checkPqEditLock: async (buyerCompanyId: number, pqDocEntry: number): Promise<IcEditLock> => {
      if (await isPqCopiedToPo(buyerCompanyId, pqDocEntry)) {
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
    /**
     * Seller RFQ line edit: DRAFT always; COMPLETED until PQ→PO; never SUBMITTED
     * (convert in flight) or CANCELLED.
     */
    checkRfqEditLock: async (header: IcRfqHeader): Promise<IcEditLock> => {
      if (header.status === IC_RFQ_STATUS.DRAFT) {
        return { locked: false };
      }
      if (header.status === IC_RFQ_STATUS.SUBMITTED) {
        return { locked: true, reason: "RFQ cannot be edited while convert is in progress" };
      }
      if (header.status !== IC_RFQ_STATUS.COMPLETED) {
        return { locked: true, reason: `RFQ status ${header.status} is not editable` };
      }
      if (await isPqCopiedToPo(header.sourceCompanyId, header.pqDraftDocEntry)) {
        return { locked: true, reason: "PQ already copied to PO" };
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
