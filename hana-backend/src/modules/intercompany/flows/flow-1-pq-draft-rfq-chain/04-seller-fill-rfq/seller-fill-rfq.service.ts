import { randomUUID } from "node:crypto";

import AppError from "@/core/errors/app-error";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import type { IcRfqHeader } from "@/modules/intercompany/domain/rfq/rfq.types";
import {
  FLOW1_FILL_STEPS,
  FLOW1_SCOPE,
  logFlowStep,
  summarizeIcLines,
} from "@/modules/intercompany/infrastructure/flow-step-log";
import type { ConvertPqAndSqService } from "../05-convert-pq-and-sq/convert-pq-and-sq.service";
import { createConvertPqAndSqService } from "../05-convert-pq-and-sq/convert-pq-and-sq.service";
import type { NotifySellerService } from "../03-notify-seller/notify-seller.service";
import { createNotifySellerService } from "../03-notify-seller/notify-seller.service";
import type { FillRfqLineInput } from "./fill-rfq.types";
import { assertRfqEditable, assertSellerCanAct, submitRfqHeader } from "./submit-rfq";
import { sanitizeFillLines } from "./update-rfq-lines";

export type SellerFillRfqService = {
  updateLines: (params: {
    rfqId: number;
    actorCompanyId: number;
    lines: FillRfqLineInput[];
  }) => Promise<IcRfqHeader>;
  submit: (params: { rfqId: number; actorCompanyId: number }) => Promise<IcRfqHeader>;
};

export const createSellerFillRfqService = (deps?: {
  rfq?: RfqService;
  notify?: NotifySellerService;
  /** Optional — defaults to real convert (auto PQ+SQ after seller submit). */
  convert?: ConvertPqAndSqService;
}): SellerFillRfqService => {
  const rfq = deps?.rfq ?? createRfqService();
  const notify = deps?.notify ?? createNotifySellerService();
  const convert = deps?.convert ?? createConvertPqAndSqService();

  return {
    updateLines: async ({ rfqId, actorCompanyId, lines }) => {
      const startedAt = Date.now();
      const corrId = randomUUID();
      const logCtx = {
        actorCompanyId,
        corrId,
        flow: "flow1" as const,
        rfqId,
      };

      const header = await rfq.getById(rfqId);
      if (!header) {
        throw new AppError("RFQ not found", 404, "IC_RFQ_NOT_FOUND");
      }
      assertSellerCanAct(header, actorCompanyId);
      assertRfqEditable(header);

      const lineSnap = summarizeIcLines(lines as unknown[]);
      logFlowStep(FLOW1_SCOPE, {
        ...FLOW1_FILL_STEPS.UPDATE_START,
        ctx: {
          ...logCtx,
          rfqNumber: header.rfqNumber,
          sourceCompanyId: header.sourceCompanyId,
          targetCompanyId: header.targetCompanyId,
          vendorCode: header.vendorCode,
        },
        detail: {
          lineCount: lineSnap.lineCount,
          lines: lineSnap.lines,
          pqDraftDocEntry: header.pqDraftDocEntry,
          status: header.status,
        },
      });

      const sanitized = sanitizeFillLines(lines);
      const updated = await rfq.updateLines(rfqId, sanitized);
      if (!updated) {
        throw new AppError("RFQ not found after update", 404, "IC_RFQ_NOT_FOUND");
      }

      logFlowStep(FLOW1_SCOPE, {
        ...FLOW1_FILL_STEPS.UPDATE_OK,
        ctx: {
          ...logCtx,
          rfqNumber: updated.rfqNumber,
        },
        detail: {
          durationMs: Date.now() - startedAt,
          lineCount: updated.lines?.length ?? 0,
          note: "Line save only — convert runs on Submit",
          rfqStatus: updated.status,
        },
      });

      return updated;
    },

    submit: async ({ rfqId, actorCompanyId }) => {
      const startedAt = Date.now();
      const corrId = randomUUID();
      const logCtx = {
        actorCompanyId,
        corrId,
        flow: "flow1" as const,
        rfqId,
      };

      const header = await rfq.getById(rfqId);
      if (!header) {
        throw new AppError("RFQ not found", 404, "IC_RFQ_NOT_FOUND");
      }
      assertSellerCanAct(header, actorCompanyId);
      assertRfqEditable(header);

      logFlowStep(FLOW1_SCOPE, {
        ...FLOW1_FILL_STEPS.SUBMIT_START,
        ctx: {
          ...logCtx,
          rfqNumber: header.rfqNumber,
          sourceCompanyId: header.sourceCompanyId,
          targetCompanyId: header.targetCompanyId,
          vendorCode: header.vendorCode,
        },
        detail: {
          lineCount: header.lines?.length ?? 0,
          pqDraftDocEntry: header.pqDraftDocEntry,
          status: header.status,
        },
      });

      const lines = header.lines ?? [];
      const missingPrice = lines.some(
        (line) => line.unitPrice === null || line.unitPrice === undefined,
      );
      if (missingPrice) {
        logFlowStep(FLOW1_SCOPE, {
          ...FLOW1_FILL_STEPS.SUBMIT_START,
          check: "rfq_missing_price",
          ctx: logCtx,
          detail: { reason: "IC_RFQ_MISSING_PRICE" },
          outcome: "fail",
          title: "Flow 1 — seller submit blocked (missing price)",
        });
        throw new AppError(
          "All RFQ lines must have a unit price before submit",
          400,
          "IC_RFQ_MISSING_PRICE",
        );
      }

      const submitted = await submitRfqHeader(rfq, rfqId);
      await notify.notifyRfqSubmitted({ rfq: submitted });

      logFlowStep(FLOW1_SCOPE, {
        ...FLOW1_FILL_STEPS.SUBMIT_OK,
        ctx: {
          ...logCtx,
          rfqNumber: submitted.rfqNumber,
          sourceCompanyId: submitted.sourceCompanyId,
          targetCompanyId: submitted.targetCompanyId,
        },
        detail: {
          buyerCompanyId: submitted.sourceCompanyId,
          notifyBuyer: true,
          pqDraftDocEntry: submitted.pqDraftDocEntry,
          rfqStatus: submitted.status,
        },
      });

      // Auto convert as buyer — draft → PQ + seller SQ (no separate buyer click).
      logFlowStep(FLOW1_SCOPE, {
        ...FLOW1_FILL_STEPS.CONVERT_START,
        ctx: {
          ...logCtx,
          rfqNumber: submitted.rfqNumber,
          sourceCompanyId: submitted.sourceCompanyId,
          targetCompanyId: submitted.targetCompanyId,
        },
        detail: {
          actorCompanyId: submitted.sourceCompanyId,
          convertAs: "buyer_source",
          pqDraftDocEntry: submitted.pqDraftDocEntry,
        },
      });

      let convertStatus: string = "not_run";
      let convertMappingId: number | undefined;
      let convertMessage: string | undefined;
      try {
        const convertResult = await convert.convert({
          actorCompanyId: submitted.sourceCompanyId,
          rfqId,
        });
        convertStatus = convertResult.status;
        convertMappingId = convertResult.status === "success" ? convertResult.mappingId : undefined;
        convertMessage =
          convertResult.status === "failed"
            ? convertResult.message
            : convertResult.status === "skipped"
              ? convertResult.reason
              : convertResult.status === "queued_retry"
                ? `retryId=${convertResult.retryId}`
                : undefined;
        const targetDoc =
          convertResult.status === "success" ? (convertResult.targetDoc ?? null) : null;
        logFlowStep(FLOW1_SCOPE, {
          ...FLOW1_FILL_STEPS.COMPLETE,
          ctx: {
            ...logCtx,
            rfqNumber: submitted.rfqNumber,
          },
          detail: {
            convertMappingId: convertMappingId ?? null,
            convertMessage: convertMessage ?? null,
            convertStatus,
            durationMs: Date.now() - startedAt,
            pqDraftDocEntry: submitted.pqDraftDocEntry,
            targetDoc,
          },
          outcome: convertStatus === "failed" ? "fail" : "pass",
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        convertStatus = "failed";
        convertMessage = message;
        logFlowStep(FLOW1_SCOPE, {
          ...FLOW1_FILL_STEPS.COMPLETE,
          ctx: logCtx,
          detail: {
            convertStatus,
            durationMs: Date.now() - startedAt,
            error: message.slice(0, 2000),
            note: "RFQ stays SUBMITTED; retry convert via POST /ic/rfqs/:id/convert",
          },
          outcome: "fail",
          title: "Flow 1 complete — convert failed",
        });
      }

      const finalHeader = (await rfq.getById(rfqId)) ?? submitted;
      return finalHeader;
    },
  };
};

export const sellerFillRfqService = createSellerFillRfqService();
