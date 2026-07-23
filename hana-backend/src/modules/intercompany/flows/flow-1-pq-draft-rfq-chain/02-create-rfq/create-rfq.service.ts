import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";

import { buildRfqNumber, mapDraftLinesToRfqLines } from "./build-rfq-from-draft";
import type { CreateRfqFromCaptureInput, CreateRfqFromCaptureResult } from "./create-rfq.types";

export type CreateRfqService = {
  create: (input: CreateRfqFromCaptureInput) => Promise<CreateRfqFromCaptureResult>;
};

export const createCreateRfqService = (deps?: {
  rfq?: RfqService;
  documentMap?: DocumentMapService;
}): CreateRfqService => {
  const rfq = deps?.rfq ?? createRfqService();
  const documentMap = deps?.documentMap ?? createDocumentMapService();

  return {
    create: async (input) => {
      const existing = await rfq.findBySourceDraft(
        input.partner.buyerCompany.companyId,
        Number(input.sourceDocEntry),
      );

      if (existing) {
        const withLines = (await rfq.getById(existing.rfqId)) ?? existing;
        const map = await documentMap.findBySource({
          sourceCompanyId: input.partner.buyerCompany.companyId,
          sourceDocEntry: input.sourceDocEntry,
          sourceObject: IC_OBJECT.PQ_DRAFT,
          targetObject: IC_OBJECT.RFQ,
        });
        return {
          created: false,
          mappingId: map?.mappingId ?? 0,
          rfq: withLines,
        };
      }

      const lines = mapDraftLinesToRfqLines(input.lines);
      const header = await rfq.createFromDraft({
        createdBy: input.createdBy ?? null,
        lines,
        pqDraftDocEntry: Number(input.sourceDocEntry),
        pqDraftDocNum: input.sourceDocNum ? Number(input.sourceDocNum) : null,
        remarks: input.remarksTag,
        rfqNumber: buildRfqNumber(Number(input.sourceDocEntry), input.sourceDocNum),
        sourceCompanyId: input.partner.buyerCompany.companyId,
        targetCompanyId: input.partner.sellerCompany.companyId,
        vendorCode: input.partner.vendorCode,
      });

      const mapping = await documentMap.create({
        sourceCompanyId: input.partner.buyerCompany.companyId,
        sourceDocEntry: input.sourceDocEntry,
        sourceDocNum: input.sourceDocNum,
        sourceObject: IC_OBJECT.PQ_DRAFT,
        sourceRemarksTag: input.remarksTag,
        status: IC_DOC_MAP_STATUS.SUCCESS,
        targetCompanyId: input.partner.sellerCompany.companyId,
        targetDocEntry: String(header.rfqId),
        targetDocNum: header.rfqNumber,
        targetObject: IC_OBJECT.RFQ,
      });

      return {
        created: true,
        mappingId: mapping.mappingId,
        rfq: header,
      };
    },
  };
};

export const createRfqServiceProcess = createCreateRfqService();
