import { randomUUID } from "node:crypto";

import AppError from "@/core/errors/app-error";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import type { IcRfqHeader } from "@/modules/intercompany/domain/rfq/rfq.types";
import type { IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";
import {
  FLOW1_FILL_STEPS,
  FLOW1_SCOPE,
  logFlowStep,
  summarizeIcLines,
} from "@/modules/intercompany/infrastructure/flow-step-log";
import { scheduleIcBackground } from "@/modules/intercompany/infrastructure/schedule-ic-background";
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
  submit: (params: {
    rfqId: number;
    actorCompanyId: number;
    /** Optional — save seller fill in the same request (skip separate PUT). */
    lines?: FillRfqLineInput[];
  }) => Promise<IcRfqHeader>;
};

export type SellerFillRfqServiceOptions = {
  rfq?: RfqService;
  notify?: NotifySellerService;
  /** Optional — defaults to real convert (auto PQ+SQ after seller submit). */
  convert?: ConvertPqAndSqService;
  /**
   * When true (default), buyer notify + auto convert run after the submit HTTP
   * response — same split as PQ draft / PO create IC hooks.
   * Set false in unit tests that assert notify/convert outcome on submit.
   */
  runConvertInBackground?: boolean;
};

const logConvertOutcome = (params: {
  corrId: string;
  rfqId: number;
  startedAt: number;
  submitted: IcRfqHeader;
  convertResult: IcHookResult;
}): void => {
  const { corrId, rfqId, startedAt, submitted, convertResult } = params;
  const convertStatus = convertResult.status;
  const convertMappingId = convertResult.status === "success" ? convertResult.mappingId : undefined;
  const convertMessage =
    convertResult.status === "failed"
      ? convertResult.message
      : convertResult.status === "skipped"
        ? convertResult.reason
        : convertResult.status === "queued_retry"
          ? `retryId=${convertResult.retryId}`
          : convertResult.status === "accepted"
            ? convertResult.message
            : undefined;
  const targetDoc = convertResult.status === "success" ? (convertResult.targetDoc ?? null) : null;

  logFlowStep(FLOW1_SCOPE, {
    ...FLOW1_FILL_STEPS.COMPLETE,
    ctx: {
      actorCompanyId: submitted.sourceCompanyId,
      corrId,
      flow: "flow1",
      rfqId,
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
};

const runAutoConvert = async (params: {
  convert: ConvertPqAndSqService;
  corrId: string;
  rfqId: number;
  startedAt: number;
  submitted: IcRfqHeader;
}): Promise<IcHookResult> => {
  const { convert, corrId, rfqId, startedAt, submitted } = params;

  logFlowStep(FLOW1_SCOPE, {
    ...FLOW1_FILL_STEPS.CONVERT_START,
    ctx: {
      actorCompanyId: submitted.sourceCompanyId,
      corrId,
      flow: "flow1",
      rfqId,
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

  try {
    const convertResult = await convert.convert({
      actorCompanyId: submitted.sourceCompanyId,
      rfqId,
    });
    logConvertOutcome({ convertResult, corrId, rfqId, startedAt, submitted });
    return convertResult;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logFlowStep(FLOW1_SCOPE, {
      ...FLOW1_FILL_STEPS.COMPLETE,
      ctx: {
        actorCompanyId: submitted.sourceCompanyId,
        corrId,
        flow: "flow1",
        rfqId,
      },
      detail: {
        convertStatus: "failed",
        durationMs: Date.now() - startedAt,
        error: message.slice(0, 2000),
        note: "RFQ stays SUBMITTED; retry convert via POST /ic/rfqs/:id/convert",
      },
      outcome: "fail",
      title: "Flow 1 complete — convert failed",
    });
    return { message: message.slice(0, 2000), status: "failed" };
  }
};

export const createSellerFillRfqService = (
  deps?: SellerFillRfqServiceOptions,
): SellerFillRfqService => {
  const rfq = deps?.rfq ?? createRfqService();
  const notify = deps?.notify ?? createNotifySellerService();
  const convert = deps?.convert ?? createConvertPqAndSqService();
  const runConvertInBackground = deps?.runConvertInBackground !== false;

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

    submit: async ({ rfqId, actorCompanyId, lines: fillLines }) => {
      const startedAt = Date.now();
      const corrId = randomUUID();
      const logCtx = {
        actorCompanyId,
        corrId,
        flow: "flow1" as const,
        rfqId,
      };

      let header = await rfq.getById(rfqId);
      if (!header) {
        throw new AppError("RFQ not found", 404, "IC_RFQ_NOT_FOUND");
      }
      assertSellerCanAct(header, actorCompanyId);
      assertRfqEditable(header);

      // Optional one-shot fill: save lines then submit (avoids PUT + POST round-trip).
      if (fillLines && fillLines.length > 0) {
        const sanitized = sanitizeFillLines(fillLines);
        const updated = await rfq.updateLines(rfqId, sanitized);
        if (!updated) {
          throw new AppError("RFQ not found after line update", 404, "IC_RFQ_NOT_FOUND");
        }
        header = updated;
      }

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
          linesSavedOnSubmit: Boolean(fillLines && fillLines.length > 0),
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

      // Main path: mark SUBMITTED only. Notify + convert are IC side-effects.
      const submitted = await submitRfqHeader(rfq, rfqId);

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
          convertDeferred: runConvertInBackground,
          notifyDeferred: runConvertInBackground,
          pqDraftDocEntry: submitted.pqDraftDocEntry,
          rfqStatus: submitted.status,
        },
      });

      // Auto convert as buyer — draft → PQ + seller SQ (no separate buyer click).
      // Same split as PQ draft / PO create: main response first, IC work off-request.
      if (runConvertInBackground) {
        scheduleIcBackground(
          {
            docEntry: submitted.pqDraftDocEntry,
            docNum: submitted.pqDraftDocNum,
            flow: "flow1",
            hook: "afterRfqSubmitted",
          },
          async () => {
            try {
              await notify.notifyRfqSubmitted({ rfq: submitted });
            } catch (err: unknown) {
              // Notify failure must not block convert; log via convert path outcome.
              const message = err instanceof Error ? err.message : String(err);
              logFlowStep(FLOW1_SCOPE, {
                ...FLOW1_FILL_STEPS.SUBMIT_OK,
                ctx: logCtx,
                detail: {
                  error: message.slice(0, 500),
                  note: "notifyRfqSubmitted failed in background",
                },
                outcome: "fail",
                title: "Flow 1 — buyer notify failed (background)",
              });
            }
            return runAutoConvert({ convert, corrId, rfqId, startedAt, submitted });
          },
        );
        // Main submit response: RFQ is SUBMITTED; notify + PQ+SQ convert run off-request.
        return submitted;
      }

      await notify.notifyRfqSubmitted({ rfq: submitted });
      await runAutoConvert({ convert, corrId, rfqId, startedAt, submitted });
      return (await rfq.getById(rfqId)) ?? submitted;
    },
  };
};

export const sellerFillRfqService = createSellerFillRfqService();
