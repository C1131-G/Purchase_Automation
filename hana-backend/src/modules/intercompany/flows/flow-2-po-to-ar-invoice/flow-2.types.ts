import type { ResolvePartnerResult } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.types";
import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";
import type { IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";

export type Flow2SkipReason =
  | "draft_po"
  | "flow2_disabled"
  | "invalid_input"
  | "non_ic_vendor"
  | "already_mapped_success"
  | "missing_sl_connection";

export type Flow2CaptureResult =
  | { kind: "skip"; reason: Flow2SkipReason; detail?: string; check?: string }
  | {
      kind: "proceed";
      input: IcPoHookInput;
      partner: ResolvePartnerResult;
      sourceDocEntry: string;
      sourceDocNum: string | null;
      remarksTag: string;
    };

export type Flow2ArInvoicePayload = {
  /** Required for `POST /Drafts` — SAP object type 13 = A/R Invoice Draft. */
  DocObjectCode: string;
  CardCode: string;
  DocDate?: string;
  DocDueDate?: string;
  Comments: string;
  U_CreatedBy?: string;
  NumAtCard?: string;
  BPL_IDAssignedToInvoice?: number;
  DocumentLines: Record<string, unknown>[];
};

export type Flow2RunResult = IcHookResult;
