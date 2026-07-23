/**
 * Pure guards for Flow 2 capture (no I/O).
 */

import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";

import type { Flow2SkipReason } from "../flow-2.types";

export const detectDraftPo = (input: IcPoHookInput): boolean => input.isDraft === true;

export const detectInvalidPoInput = (input: IcPoHookInput): Flow2SkipReason | null => {
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
