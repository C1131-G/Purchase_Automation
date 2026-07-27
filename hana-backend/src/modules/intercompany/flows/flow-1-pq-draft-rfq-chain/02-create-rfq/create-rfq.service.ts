import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { logFlowStep } from "@/modules/intercompany/infrastructure/flow-step-log";
import { buildFlow1RfqRemarks } from "@/modules/intercompany/infrastructure/ic-remarks-chain";
import { IC_LOG_SCOPE } from "@/modules/intercompany/infrastructure/ic-logger";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";

import { buildRfqNumber, mapDraftLinesToRfqLines } from "./build-rfq-from-draft";
import type { CreateRfqFromCaptureInput, CreateRfqFromCaptureResult } from "./create-rfq.types";

const SCOPE = IC_LOG_SCOPE.FLOW1;

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
        logFlowStep(SCOPE, {
          step: 5,
          total: 18,
          title: "Flow 1 create RFQ — idempotent hit (existing)",
          check: "create_rfq_existing",
          detail: {
            created: false,
            mappingId: map?.mappingId ?? 0,
            rfqId: withLines.rfqId,
            rfqNumber: withLines.rfqNumber,
            sourceDocEntry: input.sourceDocEntry,
          },
        });
        return {
          created: false,
          mappingId: map?.mappingId ?? 0,
          rfq: withLines,
        };
      }

      const lines = mapDraftLinesToRfqLines(input.lines);
      const rfqNumber = buildRfqNumber(Number(input.sourceDocEntry), input.sourceDocNum);
      logFlowStep(SCOPE, {
        step: 5,
        total: 18,
        title: "Flow 1 create RFQ — inserting IC_RFQ_HEADER/LINE",
        check: "create_rfq_insert",
        detail: {
          lineCount: lines.length,
          lines: lines.map((line) => ({
            description: line.description,
            itemCode: line.itemCode,
            lineNum: line.lineNum,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            warehouse: line.warehouse,
          })),
          remarksTag: input.remarksTag,
          rfqNumber,
          sourceCompanyId: input.partner.buyerCompany.companyId,
          sourceDocEntry: input.sourceDocEntry,
          targetCompanyId: input.partner.sellerCompany.companyId,
          vendorCode: input.partner.vendorCode,
        },
      });

      const pqDraftDocEntry = Number(input.sourceDocEntry);
      const pqDraftDocNum = input.sourceDocNum ? Number(input.sourceDocNum) : null;
      // Line-by-line IC chain; keep any existing user remarks from PQ draft (append only).
      const chainRemarks = buildFlow1RfqRemarks({
        existing: input.existingRemarks ?? null,
        pqDraftDocEntry,
        pqDraftDocNum,
        rfqNumber,
      });

      const header = await rfq.createFromDraft({
        createdBy: input.createdBy ?? null,
        lines,
        pqDraftDocEntry,
        pqDraftDocNum,
        remarks: chainRemarks,
        rfqNumber,
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

      logFlowStep(SCOPE, {
        step: 5,
        total: 18,
        title: "Flow 1 create RFQ — insert + map OK",
        check: "create_rfq_ok",
        detail: {
          created: true,
          mappingId: mapping.mappingId,
          remarks: chainRemarks,
          rfqId: header.rfqId,
          rfqLineCount: header.lines?.length ?? lines.length,
          rfqNumber: header.rfqNumber,
          status: header.status,
        },
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
