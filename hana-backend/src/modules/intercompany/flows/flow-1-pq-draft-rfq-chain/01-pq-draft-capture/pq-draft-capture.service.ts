import type { ConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { logFlowStep, summarizePartner } from "@/modules/intercompany/infrastructure/flow-step-log";
import { IC_LOG_SCOPE } from "@/modules/intercompany/infrastructure/ic-logger";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { ResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import { createResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import type { IcPqDraftHookInput } from "@/modules/intercompany/flows/shared/flow.types";

import { compactPqDraftTag } from "@/modules/intercompany/infrastructure/ic-remarks-chain";

import { detectInvalidPqDraftInput } from "./detect-ic-pq-draft";
import type { Flow1CaptureResult } from "../flow-1.types";

const SCOPE = IC_LOG_SCOPE.FLOW1;

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
        logFlowStep(SCOPE, {
          step: 3,
          total: 18,
          title: "Flow 1 gate — invalid input",
          check: "invalid_input",
          ctx: base,
          detail: { detail: "missing dbName, cardCode, or docEntry", reason: invalid },
          outcome: "skip",
        });
        return { kind: "skip", reason: invalid, detail: "missing dbName, cardCode, or docEntry" };
      }

      const flow1On = await configuration.isFlow1Enabled();
      logFlowStep(SCOPE, {
        step: 3,
        total: 18,
        title: flow1On ? "Flow 1 gate — FLOW1_ENABLED = on" : "Flow 1 gate — FLOW1_ENABLED = off",
        check: "flow1_flag",
        ctx: base,
        detail: { flow1Enabled: flow1On },
        outcome: flow1On ? "pass" : "skip",
      });
      if (!flow1On) {
        return { kind: "skip", reason: "flow1_disabled" };
      }

      logFlowStep(SCOPE, {
        step: 3,
        total: 18,
        title: "Flow 1 gate — resolve partner (IC_COMPANY + IC_BP_MAPPING)",
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
          total: 18,
          title: "Flow 1 gate — partner resolve failed (non-IC vendor)",
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
        total: 18,
        title: "Flow 1 gate — partner resolve OK",
        check: "resolve_partner_ok",
        ctx: base,
        detail: partnerSnap,
      });

      const sourceDocEntry = String(input.docEntry);

      const existingRfq = await rfq.findBySourceDraft(
        partner.buyerCompany.companyId,
        input.docEntry,
      );
      if (existingRfq) {
        logFlowStep(SCOPE, {
          step: 3,
          total: 18,
          title: "Flow 1 gate — RFQ already exists for this PQ",
          check: "already_rfq_exists",
          ctx: base,
          detail: {
            reason: "already_rfq_exists",
            rfqId: existingRfq.rfqId,
            rfqNumber: existingRfq.rfqNumber,
            rfqStatus: existingRfq.status,
          },
          outcome: "skip",
        });
        return {
          check: "already_rfq_exists",
          detail: `rfqId=${existingRfq.rfqId}`,
          kind: "skip",
          reason: "already_rfq_exists",
        };
      }

      const existingMap =
        (await documentMap.findBySource({
          sourceCompanyId: partner.buyerCompany.companyId,
          sourceDocEntry,
          sourceObject: IC_OBJECT.PQ,
          targetObject: IC_OBJECT.RFQ,
        })) ??
        (await documentMap.findBySource({
          sourceCompanyId: partner.buyerCompany.companyId,
          sourceDocEntry,
          sourceObject: IC_OBJECT.PQ_DRAFT,
          targetObject: IC_OBJECT.RFQ,
        }));

      if (existingMap && existingMap.status === IC_DOC_MAP_STATUS.SUCCESS) {
        logFlowStep(SCOPE, {
          step: 3,
          total: 18,
          title: "Flow 1 gate — document map already SUCCESS",
          check: "already_mapped_success",
          ctx: base,
          detail: {
            mappingId: existingMap.mappingId,
            reason: "already_mapped_success",
            status: existingMap.status,
          },
          outcome: "skip",
        });
        return {
          check: "already_mapped_success",
          detail: `mappingId=${existingMap.mappingId}`,
          kind: "skip",
          reason: "already_mapped_success",
        };
      }

      const remarksTag = compactPqDraftTag(input.docNum, input.docEntry);
      logFlowStep(SCOPE, {
        step: 3,
        total: 18,
        title: "Flow 1 capture proceed — all gates passed",
        check: "capture_proceed",
        ctx: base,
        detail: {
          ...partnerSnap,
          existingMapId: existingMap?.mappingId ?? null,
          existingMapStatus: existingMap?.status ?? null,
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

export const pqDraftCaptureService = createPqDraftCaptureService();
