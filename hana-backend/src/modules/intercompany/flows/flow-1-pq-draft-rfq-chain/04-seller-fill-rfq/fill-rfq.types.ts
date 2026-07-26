import type { UpdateRfqLineInput } from "@/modules/intercompany/domain/rfq/rfq.types";
import type { IcRfqHeader } from "@/modules/intercompany/domain/rfq/rfq.types";

/** Seller fill payload. `itemCode` is rejected if present; quantity is allowed. */
export type FillRfqLineInput = UpdateRfqLineInput & {
  itemCode?: unknown;
};

export type FillRfqResult = IcRfqHeader;
