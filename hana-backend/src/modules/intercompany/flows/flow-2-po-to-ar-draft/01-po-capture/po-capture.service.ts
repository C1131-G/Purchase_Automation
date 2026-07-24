import type { ConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { ResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import { createResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";

import { detectDraftPo, detectInvalidPoInput } from "./detect-ic-po";
import type { Flow2CaptureResult } from "../flow-2.types";

const SCOPE = IC_LOG_SCOPE.FLOW2;

const buildRemarksTag = (docNum: number | null | undefined, docEntry: number): string => {
  if (docNum != null && Number.isFinite(docNum) && docNum > 0) {
    return `IC-PO-${docNum}`;
  }
  return `IC-PO-E${docEntry}`;
};

export type PoCaptureService = {
  capture: (input: IcPoHookInput) => Promise<Flow2CaptureResult>;
};

export const createPoCaptureService = (deps?: {
  configuration?: ConfigurationService;
  resolvePartner?: ResolvePartnerService;
  documentMap?: DocumentMapService;
}): PoCaptureService => {
  const configuration = deps?.configuration ?? createConfigurationService();
  const resolvePartner = deps?.resolvePartner ?? createResolvePartnerService();
  const documentMap = deps?.documentMap ?? createDocumentMapService();

  return {
    capture: async (input) => {
      const base = {
        cardCode: input.cardCode,
        dbName: input.dbName,
        docEntry: input.docEntry,
        docNum: input.docNum,
      };

      if (detectDraftPo(input)) {
        icLog.info(SCOPE, "Flow 2 capture check", {
          ...base,
          check: "draft_po",
          outcome: "skip",
          reason: "draft_po",
        });
        return { kind: "skip", reason: "draft_po" };
      }

      const invalid = detectInvalidPoInput(input);
      if (invalid) {
        icLog.info(SCOPE, "Flow 2 capture check", {
          ...base,
          check: "invalid_input",
          detail: "missing dbName, cardCode, or docEntry",
          outcome: "skip",
          reason: invalid,
        });
        return { kind: "skip", reason: invalid, detail: "missing dbName, cardCode, or docEntry" };
      }

      const flow2On = await configuration.isFlow2Enabled();
      if (!flow2On) {
        icLog.info(SCOPE, "Flow 2 capture check", {
          ...base,
          check: "flow2_flag",
          outcome: "skip",
          reason: "flow2_disabled",
        });
        return { kind: "skip", reason: "flow2_disabled" };
      }

      icLog.debug(SCOPE, "Flow 2 capture check", {
        ...base,
        check: "flow2_flag",
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
      const existing = await documentMap.findBySource({
        sourceCompanyId: partner.buyerCompany.companyId,
        sourceDocEntry,
        sourceObject: IC_OBJECT.PO,
        targetObject: IC_OBJECT.AR_DRAFT,
      });

      if (existing && existing.status === IC_DOC_MAP_STATUS.SUCCESS) {
        icLog.info(SCOPE, "Flow 2 capture check", {
          ...base,
          check: "already_mapped_success",
          mappingId: existing.mappingId,
          outcome: "skip",
          reason: "already_mapped_success",
        });
        return {
          detail: `mappingId=${existing.mappingId}`,
          kind: "skip",
          reason: "already_mapped_success",
          check: "already_mapped_success",
        };
      }

      const remarksTag = buildRemarksTag(input.docNum, input.docEntry);
      icLog.info(SCOPE, "Flow 2 capture check", {
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

export const poCaptureService = createPoCaptureService();
