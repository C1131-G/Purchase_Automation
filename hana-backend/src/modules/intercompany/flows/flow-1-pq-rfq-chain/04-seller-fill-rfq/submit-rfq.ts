import AppError from "@/core/errors/app-error";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { IC_RFQ_STATUS } from "@/modules/intercompany/infrastructure/constants";
import type { IcRfqHeader } from "@/modules/intercompany/domain/rfq/rfq.types";
import type { IcEditLock } from "@/modules/intercompany/flows/shared/ic-edit-lock";

export const assertSellerCanAct = (rfq: IcRfqHeader, actorCompanyId: number): void => {
  if (rfq.targetCompanyId !== actorCompanyId) {
    throw new AppError(
      "Only the target (seller) company can fill or submit this RFQ",
      403,
      "IC_RFQ_FORBIDDEN",
    );
  }
};

export const assertRfqSubmittable = (rfq: IcRfqHeader): void => {
  if (rfq.status !== IC_RFQ_STATUS.DRAFT) {
    throw new AppError(
      `RFQ status ${rfq.status} is not submittable (expected DRAFT)`,
      409,
      "IC_RFQ_NOT_EDITABLE",
    );
  }
};

/** Sync DRAFT-only guard — submit path. Prefer assertRfqSubmittable. */
export const assertRfqEditable = (rfq: IcRfqHeader): void => {
  assertRfqSubmittable(rfq);
};

export const throwIfRfqLocked = (lock: IcEditLock): void => {
  if (!lock.locked) {
    return;
  }
  const code =
    lock.reason === "PQ already copied to PO" ? "IC_RFQ_PQ_CONVERTED_TO_PO" : "IC_RFQ_NOT_EDITABLE";
  throw new AppError(lock.reason ?? "RFQ is not editable", 409, code);
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
