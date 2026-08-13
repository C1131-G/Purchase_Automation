import AppError from "@/core/errors/app-error";
import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createIcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

export type PromoteArDraftService = {
  promote: (input: {
    sellerCompanyId: number;
    poDocEntry: number;
    arInvoiceDocEntry: number;
  }) => Promise<{ mappingId: number; arInvoiceDocEntry: string; arInvoiceDocNum: string | null }>;
};

export const createPromoteArDraftService = (deps?: {
  documentMap?: DocumentMapService;
  documents?: Pick<IcSlDocuments, "getPostedArInvoice">;
}): PromoteArDraftService => {
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const documents = deps?.documents ?? createIcSlDocuments();

  return {
    promote: async ({ sellerCompanyId, poDocEntry, arInvoiceDocEntry }) => {
      const map = await documentMap.findBySourceForTargetCompany({
        sourceDocEntry: String(poDocEntry),
        sourceObject: IC_OBJECT.PO,
        targetCompanyId: sellerCompanyId,
      });
      if (!map) {
        throw new AppError("A/R mapping not found", 404, "IC_AR_MAPPING_NOT_FOUND");
      }
      if (map.targetObject === IC_OBJECT.AR_INVOICE && map.status === IC_DOC_MAP_STATUS.SUCCESS) {
        return {
          arInvoiceDocEntry: map.targetDocEntry ?? String(arInvoiceDocEntry),
          arInvoiceDocNum: map.targetDocNum,
          mappingId: map.mappingId,
        };
      }
      if (map.targetObject !== IC_OBJECT.AR_DRAFT) {
        throw new AppError("A/R mapping not found", 404, "IC_AR_MAPPING_NOT_FOUND");
      }
      const posted = await documents.getPostedArInvoice({
        companyId: sellerCompanyId,
        docEntry: arInvoiceDocEntry,
      });
      const promoted = await documentMap.updateStatus(map.mappingId, IC_DOC_MAP_STATUS.SUCCESS, {
        errorMessage: null,
        targetDocEntry: String(posted.docEntry),
        targetDocNum: posted.docNum == null ? null : String(posted.docNum),
        targetObject: IC_OBJECT.AR_INVOICE,
      });
      if (!promoted) {
        throw new Error(`IC A/R map ${map.mappingId} could not be promoted`);
      }
      return {
        arInvoiceDocEntry: promoted.targetDocEntry ?? String(posted.docEntry),
        arInvoiceDocNum: promoted.targetDocNum,
        mappingId: promoted.mappingId,
      };
    },
  };
};
