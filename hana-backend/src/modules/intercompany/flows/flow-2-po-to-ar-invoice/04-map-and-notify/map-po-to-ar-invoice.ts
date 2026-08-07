import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { IcDocumentMap } from "@/modules/intercompany/domain/document-map/document-map.types";
import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { ResolvePartnerResult } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.types";

export type MapPoToArInvoiceParams = {
  partner: ResolvePartnerResult;
  sourceDocEntry: string;
  sourceDocNum: string | null;
  remarksTag: string;
  targetDocEntry: string;
  targetDocNum: string | null;
};

export const createMapPoToArInvoice = (
  documentMap: DocumentMapService = createDocumentMapService(),
) => {
  return async (params: MapPoToArInvoiceParams): Promise<IcDocumentMap> => {
    // Prefer AR_DRAFT (current Flow 2); also find legacy AR_INVOICE map rows.
    const existing =
      (await documentMap.findBySource({
        sourceCompanyId: params.partner.buyerCompany.companyId,
        sourceDocEntry: params.sourceDocEntry,
        sourceObject: IC_OBJECT.PO,
        targetObject: IC_OBJECT.AR_DRAFT,
      })) ??
      (await documentMap.findBySource({
        sourceCompanyId: params.partner.buyerCompany.companyId,
        sourceDocEntry: params.sourceDocEntry,
        sourceObject: IC_OBJECT.PO,
        targetObject: IC_OBJECT.AR_INVOICE,
      }));

    if (existing && existing.status === IC_DOC_MAP_STATUS.SUCCESS) {
      return existing;
    }

    if (existing) {
      const updated = await documentMap.updateStatus(
        existing.mappingId,
        IC_DOC_MAP_STATUS.SUCCESS,
        {
          errorMessage: null,
          targetDocEntry: params.targetDocEntry,
          targetDocNum: params.targetDocNum,
          targetObject: IC_OBJECT.AR_DRAFT,
        },
      );
      if (updated) {
        return updated;
      }
    }

    return documentMap.create({
      sourceCompanyId: params.partner.buyerCompany.companyId,
      sourceDocEntry: params.sourceDocEntry,
      sourceDocNum: params.sourceDocNum,
      sourceObject: IC_OBJECT.PO,
      sourceRemarksTag: params.remarksTag,
      status: IC_DOC_MAP_STATUS.SUCCESS,
      targetCompanyId: params.partner.sellerCompany.companyId,
      targetDocEntry: params.targetDocEntry,
      targetDocNum: params.targetDocNum,
      targetObject: IC_OBJECT.AR_DRAFT,
    });
  };
};
