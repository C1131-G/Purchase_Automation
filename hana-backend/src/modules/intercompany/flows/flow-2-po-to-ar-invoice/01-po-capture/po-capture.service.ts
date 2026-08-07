import type { ConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { logFlowStep, summarizePartner } from "@/modules/intercompany/infrastructure/flow-step-log";
import { compactPoTag } from "@/modules/intercompany/infrastructure/ic-remarks-chain";
import { IC_LOG_SCOPE } from "@/modules/intercompany/infrastructure/ic-logger";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { ResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import { createResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";

import { detectDraftPo, detectInvalidPoInput } from "./detect-ic-po";
import type { Flow2CaptureResult } from "../flow-2.types";

const SCOPE = IC_LOG_SCOPE.FLOW2;

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
        logFlowStep(SCOPE, {
          step: 3,
          total: 9,
          title: "Flow 2 gate — draft PO (not eligible)",
          check: "draft_po",
          ctx: base,
          detail: { isDraft: true, reason: "draft_po" },
          outcome: "skip",
        });
        return { kind: "skip", reason: "draft_po" };
      }

      const invalid = detectInvalidPoInput(input);
      if (invalid) {
        logFlowStep(SCOPE, {
          step: 3,
          total: 9,
          title: "Flow 2 gate — invalid input",
          check: "invalid_input",
          ctx: base,
          detail: { detail: "missing dbName, cardCode, or docEntry", reason: invalid },
          outcome: "skip",
        });
        return { kind: "skip", reason: invalid, detail: "missing dbName, cardCode, or docEntry" };
      }

      const flow2On = await configuration.isFlow2Enabled();
      logFlowStep(SCOPE, {
        step: 3,
        total: 9,
        title: flow2On ? "Flow 2 gate — FLOW2_ENABLED = on" : "Flow 2 gate — FLOW2_ENABLED = off",
        check: "flow2_flag",
        ctx: base,
        detail: { flow2Enabled: flow2On },
        outcome: flow2On ? "pass" : "skip",
      });
      if (!flow2On) {
        return { kind: "skip", reason: "flow2_disabled" };
      }

      logFlowStep(SCOPE, {
        step: 3,
        total: 9,
        title: "Flow 2 gate — resolve partner (IC_COMPANY + IC_BP_MAPPING)",
        check: "resolve_partner_start",
        ctx: base,
        detail: { cardCode: input.cardCode.trim(), dbName: input.dbName.trim() },
      });

      const partnerOutcome = await resolvePartner.resolveOutcome({
        cardCode: input.cardCode.trim(),
        dbName: input.dbName.trim(),
      });
      if (!partnerOutcome.success) {
        logFlowStep(SCOPE, {
          step: 3,
          total: 9,
          title: "Flow 2 gate — partner resolve failed (non-IC vendor)",
          check: partnerOutcome.check,
          ctx: base,
          detail: {
            detail: partnerOutcome.detail,
            reason: "non_ic_vendor",
          },
          outcome: "skip",
        });
        return {
          check: partnerOutcome.check,
          detail: partnerOutcome.detail,
          kind: "skip",
          reason: "non_ic_vendor",
        };
      }

      const partner = partnerOutcome.partner;
      const partnerSnap = summarizePartner(partner);
      logFlowStep(SCOPE, {
        step: 3,
        total: 9,
        title: "Flow 2 gate — partner resolve OK",
        check: "resolve_partner_ok",
        ctx: base,
        detail: partnerSnap,
      });

      const sourceDocEntry = String(input.docEntry);
      const existing =
        (await documentMap.findBySource({
          sourceCompanyId: partner.buyerCompany.companyId,
          sourceDocEntry,
          sourceObject: IC_OBJECT.PO,
          targetObject: IC_OBJECT.AR_DRAFT,
        })) ??
        (await documentMap.findBySource({
          sourceCompanyId: partner.buyerCompany.companyId,
          sourceDocEntry,
          sourceObject: IC_OBJECT.PO,
          targetObject: IC_OBJECT.AR_INVOICE,
        }));

      if (existing && existing.status === IC_DOC_MAP_STATUS.SUCCESS) {
        logFlowStep(SCOPE, {
          step: 3,
          total: 9,
          title: "Flow 2 gate — AR invoice draft already mapped SUCCESS",
          check: "already_mapped_success",
          ctx: base,
          detail: {
            mappingId: existing.mappingId,
            reason: "already_mapped_success",
            status: existing.status,
            targetDocEntry: existing.targetDocEntry,
          },
          outcome: "skip",
        });
        return {
          detail: `mappingId=${existing.mappingId}`,
          kind: "skip",
          reason: "already_mapped_success",
          check: "already_mapped_success",
        };
      }

      const remarksTag = compactPoTag(input.docNum, input.docEntry);
      logFlowStep(SCOPE, {
        step: 3,
        total: 9,
        title: "Flow 2 capture proceed — all gates passed",
        check: "capture_proceed",
        ctx: base,
        detail: {
          ...partnerSnap,
          existingMapId: existing?.mappingId ?? null,
          existingMapStatus: existing?.status ?? null,
          remarksTag,
          sourceDocEntry,
        },
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
