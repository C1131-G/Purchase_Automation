/**
 * IC edit sync — portal PQ update → existing DRAFT RFQ.
 * Never creates an RFQ and never uses Flow 1 (1–18) create logs.
 */

import { randomUUID } from "node:crypto";

import type { CompanyService } from "@/modules/intercompany/config/company/company.service";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import type { ConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { skipResult, type IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";
import type { IcPqDraftHookInput } from "@/modules/intercompany/flows/shared/flow.types";
import {
  logIcEditSync,
  summarizeIcLines,
} from "@/modules/intercompany/infrastructure/flow-step-log";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";

import {
  createUpdateRfqFromPqService,
  type UpdateRfqFromPqService,
} from "./update-rfq-from-pq.service";

export type PqEditSyncService = {
  sync: (input: IcPqDraftHookInput) => Promise<IcHookResult>;
};

export const createPqEditSyncService = (deps?: {
  company?: CompanyService;
  configuration?: ConfigurationService;
  rfq?: RfqService;
  updateRfq?: UpdateRfqFromPqService;
}): PqEditSyncService => {
  const company = deps?.company ?? createCompanyService();
  const configuration = deps?.configuration ?? createConfigurationService();
  const rfq = deps?.rfq ?? createRfqService();
  const updateRfq = deps?.updateRfq ?? createUpdateRfqFromPqService({ rfq });

  return {
    sync: async (input) => {
      const startedAt = Date.now();
      const corrId = randomUUID();
      const logCtx = {
        cardCode: input.cardCode,
        corrId,
        dbName: input.dbName,
        docEntry: input.docEntry,
        docNum: input.docNum,
        flow: "edit" as const,
      };
      const lineSnap = summarizeIcLines(input.lines as unknown[] | undefined);

      logIcEditSync({
        ctx: logCtx,
        detail: {
          hook: "afterPqUpdated",
          sourceObject: IC_OBJECT.PQ,
          targetObject: IC_OBJECT.RFQ,
        },
        phase: "start",
      });

      logIcEditSync({
        ctx: logCtx,
        detail: {
          comments: input.comments ?? null,
          itemCodes: lineSnap.itemCodes,
          lineCount: lineSnap.lineCount,
          lines: lineSnap.lines,
        },
        phase: "input",
      });

      const finish = (result: IcHookResult, extra?: Record<string, unknown>): IcHookResult => {
        const skipped = result.status === "skipped";
        logIcEditSync({
          check: skipped ? `ic_edit_sync.${result.reason}` : "ic_edit_sync",
          ctx: logCtx,
          detail: {
            durationMs: Date.now() - startedAt,
            reason: skipped ? result.reason : undefined,
            status: result.status,
            ...extra,
          },
          outcome: result.status === "failed" ? "fail" : skipped ? "skip" : "pass",
          phase: skipped
            ? `skipped (${result.reason})`
            : result.status === "failed"
              ? "failed"
              : "done",
        });
        return result;
      };

      if (!input.dbName?.trim() || !Number.isFinite(input.docEntry) || input.docEntry <= 0) {
        logIcEditSync({
          check: "ic_edit_sync.invalid_input",
          ctx: logCtx,
          detail: { reason: "invalid_input" },
          outcome: "skip",
          phase: "invalid input",
        });
        return finish(skipResult("invalid_input"));
      }

      const flow1On = await configuration.isFlow1Enabled();
      if (!flow1On) {
        logIcEditSync({
          check: "ic_edit_sync.flow1_disabled",
          ctx: logCtx,
          detail: { flow1Enabled: false },
          outcome: "skip",
          phase: "Flow 1 flag off",
        });
        return finish(skipResult("flow1_disabled"));
      }

      const icCompany = await company.getBySapDbName(input.dbName.trim());
      if (!icCompany) {
        logIcEditSync({
          check: "ic_edit_sync.not_ic_company",
          ctx: logCtx,
          detail: { reason: "not_ic_company" },
          outcome: "skip",
          phase: "not an IC company",
        });
        return finish(skipResult("not_ic_company"));
      }

      const existingRfq = await rfq.findBySourceDraft(icCompany.companyId, input.docEntry);
      if (!existingRfq) {
        logIcEditSync({
          check: "ic_edit_sync.no_rfq",
          ctx: logCtx,
          detail: { buyerCompanyId: icCompany.companyId, reason: "no_rfq" },
          outcome: "skip",
          phase: "no RFQ (create is Flow 1 only)",
        });
        return finish(skipResult("no_rfq"));
      }

      if (existingRfq.status !== "DRAFT") {
        logIcEditSync({
          check: "ic_edit_sync.rfq_not_editable",
          ctx: logCtx,
          detail: {
            reason: "rfq_not_editable",
            rfqId: existingRfq.rfqId,
            rfqStatus: existingRfq.status,
          },
          outcome: "skip",
          phase: "RFQ not DRAFT",
        });
        return finish(skipResult("rfq_not_editable"));
      }

      logIcEditSync({
        ctx: logCtx,
        detail: {
          buyerCompanyId: icCompany.companyId,
          rfqId: existingRfq.rfqId,
          rfqNumber: existingRfq.rfqNumber,
          rfqStatus: existingRfq.status,
        },
        phase: "resolve RFQ",
      });

      logIcEditSync({
        ctx: logCtx,
        detail: {
          lineCount: lineSnap.lineCount,
          rfqId: existingRfq.rfqId,
        },
        phase: "apply buyer fields",
      });

      await updateRfq.update({ purchaseQuotation: input, rfqId: existingRfq.rfqId });

      return finish(
        {
          status: "success",
          targetDoc: { entry: existingRfq.rfqId, type: IC_OBJECT.RFQ },
        },
        { rfqId: existingRfq.rfqId, rfqNumber: existingRfq.rfqNumber },
      );
    },
  };
};

export const pqEditSyncService = createPqEditSyncService();
