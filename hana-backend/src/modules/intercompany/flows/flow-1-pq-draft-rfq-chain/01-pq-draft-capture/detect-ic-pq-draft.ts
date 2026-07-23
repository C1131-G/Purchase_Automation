/**
 * Pure guards for Flow 1 capture (no I/O).
 */

import type { IcPqDraftHookInput } from "@/modules/intercompany/flows/shared/flow.types";

import type { Flow1SkipReason } from "../flow-1.types";

export const detectInvalidPqDraftInput = (input: IcPqDraftHookInput): Flow1SkipReason | null => {
  if (!input.dbName?.trim()) {
    return "invalid_input";
  }
  if (!input.cardCode?.trim()) {
    return "invalid_input";
  }
  if (!Number.isFinite(input.docEntry) || input.docEntry <= 0) {
    return "invalid_input";
  }
  return null;
};
