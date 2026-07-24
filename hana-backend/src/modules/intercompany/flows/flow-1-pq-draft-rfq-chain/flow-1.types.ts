import type { ResolvePartnerResult } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.types";
import type { IcPqDraftHookInput } from "@/modules/intercompany/flows/shared/flow.types";
import type { IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";
import type { IcRfqHeader, UpdateRfqLineInput } from "@/modules/intercompany/domain/rfq/rfq.types";

export type Flow1SkipReason =
  | "flow1_disabled"
  | "invalid_input"
  | "non_ic_vendor"
  | "already_rfq_exists"
  | "already_mapped_success";

export type Flow1CaptureResult =
  | { kind: "skip"; reason: Flow1SkipReason; detail?: string; check?: string }
  | {
      kind: "proceed";
      input: IcPqDraftHookInput;
      partner: ResolvePartnerResult;
      sourceDocEntry: string;
      sourceDocNum: string | null;
      remarksTag: string;
    };

export type Flow1CreateRfqResult = {
  rfq: IcRfqHeader;
  mappingId: number;
  created: boolean;
};

export type Flow1FillLinesInput = UpdateRfqLineInput & {
  /** Rejected if present (qty/item immutable). */
  itemCode?: unknown;
  quantity?: unknown;
};

export type Flow1ConvertResult = IcHookResult;

export type Flow1RunResult = IcHookResult;
