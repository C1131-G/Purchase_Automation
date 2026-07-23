import type { UpdateRfqLineInput } from "@/modules/intercompany/domain/rfq/rfq.types";
import type { IcRfqHeader } from "@/modules/intercompany/domain/rfq/rfq.types";

export type FillRfqLineInput = UpdateRfqLineInput & {
  itemCode?: unknown;
  quantity?: unknown;
};

export type FillRfqResult = IcRfqHeader;
