import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { IcDocumentMap } from "@/modules/intercompany/domain/document-map/document-map.types";
import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { ResolvePartnerResult } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.types";

export type MapPoToArDraftParams = {
  partner: ResolvePartnerResult;
  sourceDocEntry: string;
  sourceDocNum: string | null;
  remarksTag: string;
  targetDocEntry: string;
  targetDocNum: string | null;
};

export const createMapPoToArDraft = (
  documentMap: DocumentMapService = createDocumentMapService(),
) => {
  return async (params: MapPoToArDraftParams): Promise<IcDocumentMap> => {
    const existing =
      (await documentMap.findBySource({
        sourceCompanyId: params.partner.buyerCompany.companyId,
        sourceDocEntry: params.sourceDocEntry,
        sourceObject: IC_OBJECT.PO,
        targetObject: IC_OBJECT.AR_INVOICE,
      })) ??
      (await documentMap.findBySource({
        sourceCompanyId: params.partner.buyerCompany.companyId,
        sourceDocEntry: params.sourceDocEntry,
        sourceObject: IC_OBJECT.PO,
        targetObject: IC_OBJECT.AR_DRAFT,
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
          targetObject: IC_OBJECT.AR_INVOICE,
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
      targetObject: IC_OBJECT.AR_INVOICE,
    });
  };
};
