import AppError from "@/core/errors/app-error";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import type { IcRfqHeader } from "@/modules/intercompany/domain/rfq/rfq.types";

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
}): SellerFillRfqService => {
  const rfq = deps?.rfq ?? createRfqService();
  const notify = deps?.notify ?? createNotifySellerService();

  return {
    updateLines: async ({ rfqId, actorCompanyId, lines }) => {
      const header = await rfq.getById(rfqId);
      if (!header) {
        throw new AppError("RFQ not found", 404, "IC_RFQ_NOT_FOUND");
      }
      assertSellerCanAct(header, actorCompanyId);
      assertRfqEditable(header);

      const sanitized = sanitizeFillLines(lines);
      const updated = await rfq.updateLines(rfqId, sanitized);
      if (!updated) {
        throw new AppError("RFQ not found after update", 404, "IC_RFQ_NOT_FOUND");
      }
      return updated;
    },

    submit: async ({ rfqId, actorCompanyId }) => {
      const header = await rfq.getById(rfqId);
      if (!header) {
        throw new AppError("RFQ not found", 404, "IC_RFQ_NOT_FOUND");
      }
      assertSellerCanAct(header, actorCompanyId);
      assertRfqEditable(header);

      const lines = header.lines ?? [];
      const missingPrice = lines.some(
        (line) => line.unitPrice === null || line.unitPrice === undefined,
      );
      if (missingPrice) {
        throw new AppError(
          "All RFQ lines must have a unit price before submit",
          400,
          "IC_RFQ_MISSING_PRICE",
        );
      }

      const submitted = await submitRfqHeader(rfq, rfqId);
      await notify.notifyRfqSubmitted({ rfq: submitted });
      return submitted;
    },
  };
};

export const sellerFillRfqService = createSellerFillRfqService();
