import AppError from "@/core/errors/app-error";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { IC_RFQ_STATUS } from "@/modules/intercompany/infrastructure/constants";
import type { IcRfqHeader } from "@/modules/intercompany/domain/rfq/rfq.types";

export const assertSellerCanAct = (rfq: IcRfqHeader, actorCompanyId: number): void => {
  if (rfq.targetCompanyId !== actorCompanyId) {
    throw new AppError(
      "Only the target (seller) company can fill or submit this RFQ",
      403,
      "IC_RFQ_FORBIDDEN",
    );
  }
};

export const assertRfqEditable = (rfq: IcRfqHeader): void => {
  if (rfq.status !== IC_RFQ_STATUS.DRAFT) {
    throw new AppError(
      `RFQ status ${rfq.status} is not editable (expected DRAFT)`,
      409,
      "IC_RFQ_NOT_EDITABLE",
    );
  }
};

export const submitRfqHeader = async (
  rfqService: RfqService,
  rfqId: number,
): Promise<IcRfqHeader> => {
  const updated = await rfqService.submit(rfqId);
  if (!updated) {
    throw new AppError("RFQ not found after submit", 404, "IC_RFQ_NOT_FOUND");
  }
  return updated;
};
