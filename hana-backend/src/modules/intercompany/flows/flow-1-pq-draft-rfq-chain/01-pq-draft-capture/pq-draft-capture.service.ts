import type { ConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { ResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import { createResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import type { IcPqDraftHookInput } from "@/modules/intercompany/flows/shared/flow.types";

import { detectInvalidPqDraftInput } from "./detect-ic-pq-draft";
import type { Flow1CaptureResult } from "../flow-1.types";

const SCOPE = IC_LOG_SCOPE.FLOW1;

const buildRemarksTag = (docNum: number | null | undefined, docEntry: number): string => {
  if (docNum != null && Number.isFinite(docNum) && docNum > 0) {
    return `IC-PQD-${docNum}`;
  }
  return `IC-PQD-E${docEntry}`;
};

export type PqDraftCaptureService = {
  capture: (input: IcPqDraftHookInput) => Promise<Flow1CaptureResult>;
};

export const createPqDraftCaptureService = (deps?: {
  configuration?: ConfigurationService;
  resolvePartner?: ResolvePartnerService;
  documentMap?: DocumentMapService;
  rfq?: RfqService;
}): PqDraftCaptureService => {
  const configuration = deps?.configuration ?? createConfigurationService();
  const resolvePartner = deps?.resolvePartner ?? createResolvePartnerService();
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const rfq = deps?.rfq ?? createRfqService();

  return {
    capture: async (input) => {
      const base = {
        cardCode: input.cardCode,
        dbName: input.dbName,
        docEntry: input.docEntry,
        docNum: input.docNum,
      };

      const invalid = detectInvalidPqDraftInput(input);
      if (invalid) {
        icLog.info(SCOPE, "Flow 1 capture check", {
          ...base,
          check: "invalid_input",
          detail: "missing dbName, cardCode, or docEntry",
          outcome: "skip",
          reason: invalid,
        });
        return { kind: "skip", reason: invalid, detail: "missing dbName, cardCode, or docEntry" };
      }

      const flow1On = await configuration.isFlow1Enabled();
      if (!flow1On) {
        icLog.info(SCOPE, "Flow 1 capture check", {
          ...base,
          check: "flow1_flag",
          outcome: "skip",
          reason: "flow1_disabled",
        });
        return { kind: "skip", reason: "flow1_disabled" };
      }

      icLog.debug(SCOPE, "Flow 1 capture check", {
        ...base,
        check: "flow1_flag",
        outcome: "pass",
      });

      const partnerOutcome = await resolvePartner.resolveOutcome({
        cardCode: input.cardCode.trim(),
        dbName: input.dbName.trim(),
      });
      if (!partnerOutcome.success) {
        return {
          check: partnerOutcome.check,
          detail: partnerOutcome.detail,
          kind: "skip",
          reason: "non_ic_vendor",
        };
      }

      const partner = partnerOutcome.partner;
      const sourceDocEntry = String(input.docEntry);

      const existingRfq = await rfq.findBySourceDraft(
        partner.buyerCompany.companyId,
        input.docEntry,
      );
      if (existingRfq) {
        icLog.info(SCOPE, "Flow 1 capture check", {
          ...base,
          check: "already_rfq_exists",
          outcome: "skip",
          reason: "already_rfq_exists",
          rfqId: existingRfq.rfqId,
        });
        return {
          check: "already_rfq_exists",
          detail: `rfqId=${existingRfq.rfqId}`,
          kind: "skip",
          reason: "already_rfq_exists",
        };
      }

      const existingMap = await documentMap.findBySource({
        sourceCompanyId: partner.buyerCompany.companyId,
        sourceDocEntry,
        sourceObject: IC_OBJECT.PQ_DRAFT,
        targetObject: IC_OBJECT.RFQ,
      });

      if (existingMap && existingMap.status === IC_DOC_MAP_STATUS.SUCCESS) {
        icLog.info(SCOPE, "Flow 1 capture check", {
          ...base,
          check: "already_mapped_success",
          mappingId: existingMap.mappingId,
          outcome: "skip",
          reason: "already_mapped_success",
        });
        return {
          check: "already_mapped_success",
          detail: `mappingId=${existingMap.mappingId}`,
          kind: "skip",
          reason: "already_mapped_success",
        };
      }

      const remarksTag = buildRemarksTag(input.docNum, input.docEntry);
      icLog.info(SCOPE, "Flow 1 capture check", {
        ...base,
        buyerCompanyId: partner.buyerCompany.companyId,
        check: "capture_proceed",
        outcome: "pass",
        remarksTag,
        sellerCompanyId: partner.sellerCompany.companyId,
      });

      return {
        input,
        kind: "proceed",
        partner,
        remarksTag,
        sourceDocEntry,
        sourceDocNum:
          input.docNum != null && Number.isFinite(input.docNum) ? String(input.docNum) : null,
      };
    },
  };
};

export const pqDraftCaptureService = createPqDraftCaptureService();
